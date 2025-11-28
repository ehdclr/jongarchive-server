import { Injectable, Inject } from '@nestjs/common';
import { DATABASE } from '@/database/database.module';
import type { DrizzleClient } from '@/database/database.module';
import { chatRooms } from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface RoomUser {
  socketId: string;
  userId: number;
  userCode: string;
  nickname: string;
}

export interface ChatMessageData {
  id: string;
  roomId: number;
  userId: number;
  userCode: string;
  nickname: string;
  content: string;
  timestamp: string;
}

/**
 * ChatService
 *
 * 메모리 기반 채팅 서비스 (향후 Redis 전환 가능)
 *
 * Redis 전환 시 고려사항:
 * 1. roomUsers: Redis Set으로 관리 (SADD, SREM, SMEMBERS)
 * 2. messages: Redis List로 관리 (LPUSH, LRANGE)
 * 3. TTL 설정으로 자동 만료 처리
 * 4. Pub/Sub으로 여러 서버 간 메시지 동기화
 */
@Injectable()
export class ChatService {
  // 메모리 저장소 (향후 Redis로 대체)
  private roomUsers: Map<string, Set<RoomUser>> = new Map();
  private userRooms: Map<string, Set<string>> = new Map(); // socketId -> roomIds
  private messages: Map<string, ChatMessageData[]> = new Map();

  constructor(@Inject(DATABASE) private readonly db: DrizzleClient) {}

  /**
   * 채팅방 유효성 검증
   * DB에서 채팅방이 활성화 상태인지 확인
   */
  async validateRoom(roomId: number): Promise<boolean> {
    const rooms = await this.db
      .select()
      .from(chatRooms)
      .where(and(eq(chatRooms.id, roomId), eq(chatRooms.isActive, true)));

    return rooms.length > 0 && rooms[0].isActive;
  }

  /**
   * 채팅방 입장
   *
   * Redis 전환 시:
   * await redis.sadd(`room:${roomId}:users`, JSON.stringify(user));
   * await redis.sadd(`user:${socketId}:rooms`, roomKey);
   */
  async joinRoom(
    roomKey: string,
    socketId: string,
    userId: number,
    userCode: string,
    nickname: string,
  ): Promise<{ roomId: number; activeUsers: number }> {
    const roomId = Number.parseInt(roomKey.split(':')[1]);

    // 방에 사용자 추가
    if (!this.roomUsers.has(roomKey)) {
      this.roomUsers.set(roomKey, new Set());
    }

    const users = this.roomUsers.get(roomKey)!;
    const existingUser = Array.from(users).find((u) => u.userId === userId);

    if (!existingUser) {
      users.add({ socketId, userId, userCode, nickname });
    }

    // 사용자가 참여한 방 추적
    if (!this.userRooms.has(socketId)) {
      this.userRooms.set(socketId, new Set());
    }
    this.userRooms.get(socketId)!.add(roomKey);

    return {
      roomId,
      activeUsers: users.size,
    };
  }

  /**
   * 채팅방 퇴장
   *
   * Redis 전환 시:
   * await redis.srem(`room:${roomId}:users`, JSON.stringify(user));
   * await redis.srem(`user:${socketId}:rooms`, roomKey);
   */
  async leaveRoom(
    socketId: string,
    userId: number,
    roomKey?: string,
  ): Promise<string[]> {
    const rooms: string[] = [];

    if (roomKey) {
      // 특정 방에서 퇴장
      const users = this.roomUsers.get(roomKey);
      if (users) {
        const user = Array.from(users).find((u) => u.socketId === socketId);
        if (user) {
          users.delete(user);
        }
      }

      const userRoomSet = this.userRooms.get(socketId);
      if (userRoomSet) {
        userRoomSet.delete(roomKey);
      }

      rooms.push(roomKey);
    } else {
      // 모든 방에서 퇴장 (연결 해제 시)
      const userRoomSet = this.userRooms.get(socketId);
      if (userRoomSet) {
        for (const room of userRoomSet) {
          const users = this.roomUsers.get(room);
          if (users) {
            const user = Array.from(users).find((u) => u.socketId === socketId);
            if (user) {
              users.delete(user);
            }
          }
          rooms.push(room);
        }
        this.userRooms.delete(socketId);
      }
    }

    return rooms;
  }

  /**
   * 메시지 전송
   *
   * Redis 전환 시:
   * await redis.lpush(`room:${roomId}:messages`, JSON.stringify(message));
   * await redis.ltrim(`room:${roomId}:messages`, 0, 99); // 최근 100개만 유지
   * await redis.expire(`room:${roomId}:messages`, 86400); // 24시간 TTL
   */
  async sendMessage(
    roomKey: string,
    userId: number,
    userCode: string,
    nickname: string,
    content: string,
  ): Promise<ChatMessageData> {
    const roomId = Number.parseInt(roomKey.split(':')[1]);

    const message: ChatMessageData = {
      id: uuidv4(),
      roomId,
      userId,
      userCode,
      nickname,
      content,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    // 메시지 저장
    if (!this.messages.has(roomKey)) {
      this.messages.set(roomKey, []);
    }
    this.messages.get(roomKey)!.push(message);

    // 최근 100개 메시지만 유지 (메모리 관리)
    const roomMessages = this.messages.get(roomKey)!;
    if (roomMessages.length > 100) {
      roomMessages.shift();
    }

    return message;
  }

  /**
   * 활성 사용자 수 조회
   *
   * Redis 전환 시:
   * return await redis.scard(`room:${roomKey}:users`);
   */
  async getActiveUsers(roomKey: string): Promise<number> {
    const users = this.roomUsers.get(roomKey);
    return users ? users.size : 0;
  }

  /**
   * 채팅방 메시지 조회
   *
   * Redis 전환 시:
   * const messages = await redis.lrange(`room:${roomKey}:messages`, 0, limit - 1);
   * return messages.map(msg => JSON.parse(msg));
   */
  async getMessages(roomKey: string, limit = 50): Promise<ChatMessageData[]> {
    const roomMessages = this.messages.get(roomKey) || [];
    return roomMessages.slice(-limit);
  }
}
