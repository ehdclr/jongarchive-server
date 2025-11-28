import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '@/chat/chat.gateway';
import { ChatService } from '@/chat/chat.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, Logger } from '@nestjs/common';

describe('ChatGateway (TDD)', () => {
  let gateway: ChatGateway;

  const mockChatService = {
    validateRoom: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    sendMessage: jest.fn(),
    getActiveUsers: jest.fn(),
  };

  const mockJwtService = {
    verify: jest.fn(),
    sign: jest.fn(),
  };

  const mockSocket = {
    id: 'socket-123',
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    to: jest.fn().mockReturnThis(),
    handshake: {
      auth: {
        token: 'valid-token',
      },
    },
    data: {
      userId: 1,
      userCode: 'USER001',
      nickname: '테스트유저',
    },
  } as any;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as any;

  beforeEach(async () => {
    // Logger 출력 비활성화
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = mockServer;

    // Reset mocks
    jest.clearAllMocks();

    // JWT 기본 모킹
    mockJwtService.verify.mockReturnValue({
      userId: 1,
      userCode: 'USER001',
      name: '테스트유저',
    });
  });

  describe('handleConnection', () => {
    it('인증된 사용자는 연결에 성공해야 함', async () => {
      await gateway.handleConnection(mockSocket);

      expect(mockSocket.data.userId).toBe(1);
    });

    it('인증되지 않은 사용자는 연결이 거부되어야 함', async () => {
      const invalidSocket = {
        ...mockSocket,
        handshake: { auth: { token: null } },
      };

      await expect(gateway.handleConnection(invalidSocket)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('handleDisconnect', () => {
    it('사용자 연결 해제 시 참여 중인 모든 방에서 나가야 함', async () => {
      const roomIds = ['1', '2'];
      mockChatService.leaveRoom.mockResolvedValue(roomIds);

      await gateway.handleDisconnect(mockSocket);

      expect(mockChatService.leaveRoom).toHaveBeenCalledWith(
        mockSocket.id,
        mockSocket.data.userId,
      );
    });
  });

  describe('handleJoinRoom', () => {
    it('유효한 채팅방에 입장할 수 있어야 함', async () => {
      const payload = { roomId: 1 };
      mockChatService.validateRoom.mockResolvedValue(true);
      mockChatService.joinRoom.mockResolvedValue({
        roomId: 1,
        activeUsers: 5,
      });

      const result = await gateway.handleJoinRoom(mockSocket, payload);

      expect(mockChatService.validateRoom).toHaveBeenCalledWith(1);
      expect(mockSocket.join).toHaveBeenCalledWith('room:1');
      expect(mockChatService.joinRoom).toHaveBeenCalledWith(
        'room:1',
        mockSocket.id,
        mockSocket.data.userId,
        mockSocket.data.userCode,
        mockSocket.data.nickname,
      );
      expect(result).toEqual({
        success: true,
        roomId: 1,
        activeUsers: 5,
      });
    });

    it('비활성화된 채팅방에는 입장할 수 없어야 함', async () => {
      const payload = { roomId: 999 };
      mockChatService.validateRoom.mockResolvedValue(false);

      await expect(
        gateway.handleJoinRoom(mockSocket, payload),
      ).rejects.toThrow('채팅방을 찾을 수 없거나 비활성화되었습니다');
    });
  });

  describe('handleLeaveRoom', () => {
    it('채팅방에서 퇴장할 수 있어야 함', async () => {
      const payload = { roomId: 1 };

      await gateway.handleLeaveRoom(mockSocket, payload);

      expect(mockSocket.leave).toHaveBeenCalledWith('room:1');
      expect(mockChatService.leaveRoom).toHaveBeenCalledWith(
        mockSocket.id,
        mockSocket.data.userId,
        'room:1',
      );
    });
  });

  describe('handleMessage', () => {
    it('채팅방에 메시지를 전송할 수 있어야 함', async () => {
      const payload = {
        roomId: 1,
        content: '안녕하세요!',
      };

      const savedMessage = {
        id: 'msg-123',
        roomId: 1,
        userId: 1,
        userCode: 'USER001',
        nickname: '테스트유저',
        content: '안녕하세요!',
        timestamp: new Date().toISOString(),
      };

      mockChatService.sendMessage.mockResolvedValue(savedMessage);

      await gateway.handleMessage(mockSocket, payload);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        'room:1',
        mockSocket.data.userId,
        mockSocket.data.userCode,
        mockSocket.data.nickname,
        payload.content,
      );

      expect(mockServer.to).toHaveBeenCalledWith('room:1');
      expect(mockServer.emit).toHaveBeenCalledWith('message', savedMessage);
    });

    it('빈 메시지는 전송할 수 없어야 함', async () => {
      const payload = {
        roomId: 1,
        content: '',
      };

      await expect(gateway.handleMessage(mockSocket, payload)).rejects.toThrow(
        '메시지 내용을 입력해주세요',
      );
    });

    it('메시지는 1000자를 초과할 수 없어야 함', async () => {
      const payload = {
        roomId: 1,
        content: 'a'.repeat(1001),
      };

      await expect(gateway.handleMessage(mockSocket, payload)).rejects.toThrow(
        '메시지는 1000자를 초과할 수 없습니다',
      );
    });
  });
});
