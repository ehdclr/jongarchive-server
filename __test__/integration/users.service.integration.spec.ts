import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '@/users/users.service';
import { AwsService } from '@/aws/aws.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanupTestDatabase,
  getTestDatabase,
} from '../setup/test-database';
import { createUserFixture } from '@test/fixtures/user.fixture';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService (Integration)', () => {
  let service: UsersService;
  let module: TestingModule;

  beforeAll(async () => {
    await setupTestDatabase();

    module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'DATABASE',
          useFactory: () => getTestDatabase(),
        },
        {
          provide: AwsService,
          useValue: {
            uploadFile: jest
              .fn()
              .mockResolvedValue('https://test-bucket/profile/test.jpg'),
            deleteFile: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module?.close();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('createUser', () => {
    it('새로운 로컬 사용자를 생성해야 함', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      };

      const result = await service.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.provider).toBe('local');
      // 비밀번호는 해시화되어 저장됨
      expect(result.password).not.toBe('password123');
    });

    it('이미 존재하는 이메일로 가입 시 BadRequestException 발생', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'First User',
        password: 'password123',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      };

      // 첫 번째 사용자 생성
      await service.createUser(userData);

      // 동일한 이메일로 두 번째 생성 시도
      await expect(
        service.createUser({ ...userData, name: 'Second User' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByEmailAndProvider', () => {
    it('이메일과 provider로 사용자를 찾을 수 있어야 함', async () => {
      // 사용자 생성
      await service.createUser({
        email: 'find@example.com',
        name: 'Find User',
        password: 'password123',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      });

      const result = await service.findByEmailAndProvider(
        'find@example.com',
        'local',
      );

      expect(result).toBeDefined();
      expect(result?.email).toBe('find@example.com');
      expect(result?.provider).toBe('local');
    });

    it('존재하지 않는 사용자는 null 반환', async () => {
      const result = await service.findByEmailAndProvider(
        'notfound@example.com',
        'local',
      );

      expect(result).toBeNull();
    });

    it('같은 이메일이라도 다른 provider면 찾지 못함', async () => {
      await service.createUser({
        email: 'provider@example.com',
        name: 'Provider User',
        password: 'password123',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      });

      const result = await service.findByEmailAndProvider(
        'provider@example.com',
        'google',
      );

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('ID로 사용자를 찾을 수 있어야 함', async () => {
      const created = await service.createUser({
        email: 'findbyid@example.com',
        name: 'FindById User',
        password: 'password123',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      });

      const result = await service.findById(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.email).toBe('findbyid@example.com');
    });

    it('존재하지 않는 ID는 null 반환', async () => {
      const result = await service.findById(999999);

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('ID로 사용자를 찾을 수 있어야 함', async () => {
      const created = await service.createUser({
        email: 'findorfail@example.com',
        name: 'FindOrFail User',
        password: 'password123',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      });

      const result = await service.findByIdOrFail(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('존재하지 않는 ID는 NotFoundException 발생', async () => {
      await expect(service.findByIdOrFail(999999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
