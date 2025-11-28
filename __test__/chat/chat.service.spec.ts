import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '@/chat/chat.service';

describe('ChatService (TDD)', () => {
  let service: ChatService;

  const mockDatabase = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: 'DATABASE',
          useValue: mockDatabase,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('validateRoom', () => {
    it('활성화된 채팅방은 유효해야 함', async () => {
      const mockRoom = { id: 1, isActive: true };
      mockDatabase.select.mockReturnThis();
      mockDatabase.from.mockReturnThis();
      mockDatabase.where.mockResolvedValue([mockRoom]);

      const result = await service.validateRoom(1);

      expect(result).toBe(true);
    });

    it('비활성화된 채팅방은 유효하지 않아야 함', async () => {
      const mockRoom = { id: 1, isActive: false };
      mockDatabase.select.mockReturnThis();
      mockDatabase.from.mockReturnThis();
      mockDatabase.where.mockResolvedValue([mockRoom]);

      const result = await service.validateRoom(1);

      expect(result).toBe(false);
    });

    it('존재하지 않는 채팅방은 유효하지 않아야 함', async () => {
      mockDatabase.select.mockReturnThis();
      mockDatabase.from.mockReturnThis();
      mockDatabase.where.mockResolvedValue([]);

      const result = await service.validateRoom(999);

      expect(result).toBe(false);
    });
  });

  describe('joinRoom', () => {
    it('사용자가 채팅방에 입장할 수 있어야 함', async () => {
      const result = await service.joinRoom(
        'room:1',
        'socket-123',
        1,
        'USER001',
        '테스트유저',
      );

      expect(result).toHaveProperty('roomId', 1);
      expect(result).toHaveProperty('activeUsers');
    });

    it('동일한 사용자가 중복 입장 시 활성 사용자 수가 증가하지 않아야 함', async () => {
      await service.joinRoom('room:1', 'socket-123', 1, 'USER001', '테스트유저');
      const result = await service.joinRoom(
        'room:1',
        'socket-123',
        1,
        'USER001',
        '테스트유저',
      );

      expect(result.activeUsers).toBe(1);
    });
  });

  describe('leaveRoom', () => {
    it('사용자가 채팅방에서 퇴장할 수 있어야 함', async () => {
      await service.joinRoom('room:1', 'socket-123', 1, 'USER001', '테스트유저');
      await service.leaveRoom('socket-123', 1, 'room:1');

      const result = await service.getActiveUsers('room:1');
      expect(result).toBe(0);
    });

    it('연결 해제 시 모든 방에서 퇴장해야 함', async () => {
      await service.joinRoom('room:1', 'socket-123', 1, 'USER001', '테스트유저');
      await service.joinRoom('room:2', 'socket-123', 1, 'USER001', '테스트유저');

      const rooms = await service.leaveRoom('socket-123', 1);

      expect(rooms).toEqual(['room:1', 'room:2']);
    });
  });

  describe('sendMessage', () => {
    it('메시지를 저장하고 반환해야 함', async () => {
      const result = await service.sendMessage(
        'room:1',
        1,
        'USER001',
        '테스트유저',
        '안녕하세요!',
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('roomId', 1);
      expect(result).toHaveProperty('userId', 1);
      expect(result).toHaveProperty('content', '안녕하세요!');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getActiveUsers', () => {
    it('채팅방의 활성 사용자 수를 반환해야 함', async () => {
      await service.joinRoom('room:1', 'socket-123', 1, 'USER001', '유저1');
      await service.joinRoom('room:1', 'socket-456', 2, 'USER002', '유저2');

      const result = await service.getActiveUsers('room:1');

      expect(result).toBe(2);
    });
  });
});
