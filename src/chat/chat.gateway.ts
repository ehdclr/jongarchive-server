import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService, ChatMessageData } from './chat.service';
import {
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DATABASE } from '@/database/database.module';
import type { DrizzleClient } from '@/database/database.module';
import { users } from '@/database/schema';
import { eq } from 'drizzle-orm';

interface JoinRoomPayload {
  roomId: number;
}

interface LeaveRoomPayload {
  roomId: number;
}

interface MessagePayload {
  roomId: number;
  content: string;
}

/**
 * ChatGateway
 *
 * WebSocket 기반 실시간 채팅 게이트웨이
 *
 * CORS 설정: main.ts에서 전역 설정 사용
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    @Inject(DATABASE) private readonly db: DrizzleClient,
  ) {}

  /**
   * 클라이언트 연결 처리
   * JWT 토큰으로 인증 후 사용자 정보를 소켓에 저장
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      console.log(token);

      if (!token) {
        throw new UnauthorizedException('인증 토큰이 필요합니다');
      }

      // JWT 검증
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_ACCESS_TOKEN_SECRET });
      console.log(payload);

      // DB에서 사용자 정보 조회
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다');
      }

      // 소켓에 사용자 정보 저장
      client.data.userId = user.id;
      client.data.userCode = user.userCode;
      client.data.nickname = user.name;

      this.logger.log(`Client connected: ${client.id} (User: ${user.name})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   * 모든 참여 중인 채팅방에서 퇴장
   */
  async handleDisconnect(client: Socket) {
    const rooms = await this.chatService.leaveRoom(
      client.id,
      client.data.userId,
    );

    // 각 방에 퇴장 알림
    for (const roomKey of rooms) {
      const activeUsers = await this.chatService.getActiveUsers(roomKey);
      this.server.to(roomKey).emit('userLeft', {
        userId: client.data.userId,
        nickname: client.data.nickname,
        activeUsers,
      });
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * 채팅방 입장
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { roomId } = payload;

    // 채팅방 유효성 검증
    const isValid = await this.chatService.validateRoom(roomId);
    if (!isValid) {
      throw new BadRequestException(
        '채팅방을 찾을 수 없거나 비활성화되었습니다',
      );
    }

    const roomKey = `room:${roomId}`;

    // Socket.IO 방 입장
    await client.join(roomKey);

    // 서비스에 사용자 등록
    const result = await this.chatService.joinRoom(
      roomKey,
      client.id,
      client.data.userId,
      client.data.userCode,
      client.data.nickname,
    );

    // 다른 사용자들에게 입장 알림
    client.to(roomKey).emit('userJoined', {
      userId: client.data.userId,
      nickname: client.data.nickname,
      activeUsers: result.activeUsers,
    });

    return {
      success: true,
      roomId: result.roomId,
      activeUsers: result.activeUsers,
    };
  }

  /**
   * 채팅방 퇴장
   */
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveRoomPayload,
  ) {
    const { roomId } = payload;
    const roomKey = `room:${roomId}`;

    // Socket.IO 방 퇴장
    await client.leave(roomKey);

    // 서비스에서 사용자 제거
    await this.chatService.leaveRoom(client.id, client.data.userId, roomKey);

    // 다른 사용자들에게 퇴장 알림
    const activeUsers = await this.chatService.getActiveUsers(roomKey);
    this.server.to(roomKey).emit('userLeft', {
      userId: client.data.userId,
      nickname: client.data.nickname,
      activeUsers,
    });

    return { success: true };
  }

  /**
   * 메시지 전송
   */
  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessagePayload,
  ) {
    const { roomId, content } = payload;

    // 메시지 유효성 검증
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('메시지 내용을 입력해주세요');
    }

    if (content.length > 1000) {
      throw new BadRequestException('메시지는 1000자를 초과할 수 없습니다');
    }

    const roomKey = `room:${roomId}`;

    // 메시지 저장
    const message = await this.chatService.sendMessage(
      roomKey,
      client.data.userId,
      client.data.userCode,
      client.data.nickname,
      content.trim(),
    );

    // 방의 모든 사용자에게 메시지 전송 (본인 포함)
    this.server.to(roomKey).emit('message', message);

    return { success: true };
  }

  /**
   * 채팅방 메시지 히스토리 조회
   */
  @SubscribeMessage('getMessages')
  async handleGetMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: number; limit?: number },
  ): Promise<{ success: boolean; messages: ChatMessageData[] }> {
    const { roomId, limit = 50 } = payload;
    const roomKey = `room:${roomId}`;

    const messages = await this.chatService.getMessages(roomKey, limit);

    return {
      success: true,
      messages,
    };
  }
}
