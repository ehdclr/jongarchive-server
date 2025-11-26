/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '@/users/users.service';
import { AwsService } from '@/aws/aws.service';
import { createUserFixture, createMockUser } from '@test/fixtures/user.fixture';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('uuid');

describe('UsersService', () => {
  let service: UsersService;
  let awsService: AwsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDB: any;

  const mockFile: Express.Multer.File = {
    fieldname: 'profileImage',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024000, // 1MB
    buffer: Buffer.from('fake-image-data'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  beforeEach(async () => {
    mockDB = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([createMockUser()]),
    };

    const module: TestingModule = await Test.createTestingModule({
      // imports: [DatabaseModule, ConfigModule],
      providers: [
        UsersService,
        {
          provide: 'DATABASE',
          useValue: mockDB,
        },
        {
          provide: AwsService,
          useValue: {
            uploadFile: jest
              .fn()
              .mockResolvedValue(
                'https://test-bucket-url/users/profile/test-image.jpg',
              ),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            getSignedUrl: jest.fn(),
          },
        },
      ],
      exports: [UsersService],
    }).compile();
    // mockDB = module.get<typeof DrizzleClient>('DATABASE');
    awsService = module.get<AwsService>(AwsService);
    service = module.get<UsersService>(UsersService);

    //Mock 설정
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password_123');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('새로운 로컬 사용자를 생성', async () => {
      const userData = createUserFixture();

      // Mock이 반환할 사용자 (DB가 생성한 것처럼)
      const mockCreatedUser = createMockUser({
        email: userData.email,
        name: userData.name,
        provider: 'local',
        profileImageUrl: '',
      });

      mockDB.returning.mockResolvedValueOnce([mockCreatedUser]);

      const result = await service.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.profileImageUrl).toBe('');
      expect(mockDB.insert).toHaveBeenCalled();
    });

    it('이미지 파일과 함께 사용자를 생성할 수 있어야 함', async () => {
      const userData = createUserFixture();
      const mockCreatedUser = createMockUser();

      mockDB.returning.mockResolvedValueOnce([mockCreatedUser]);

      const result = await service.createUser({
        ...userData,
        profileImage: mockFile,
      });

      expect(result).toBeDefined();
      expect(result.email).toBe(mockCreatedUser.email);
      expect(awsService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'users/profile',
      );
      expect(result.profileImageUrl).toBe(mockCreatedUser.profileImageUrl);
    });

    it('비밀번호가 해시화 되어서 DB에 저장되어야 함', async () => {
      const userData = createUserFixture({ password: 'plain_password' }); // fakerjs에 평문 주입해서 사용
      const mockCreatedUser = createMockUser(); //DB에서 조회된 것처럼 생성

      mockDB.returning.mockResolvedValueOnce([mockCreatedUser]);

      await service.createUser(userData);

      //호출 확인
      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);

      expect(mockDB.values).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed_password_123',
        }),
      );
    });

    it('이미 존재하는 이메일로 가입 시 BadRequestException 발생', async () => {
      const userData = createUserFixture();
      const existingUser = createMockUser({ email: userData.email });

      // 이메일 중복 체크에서 기존 사용자 반환
      mockDB.where = jest.fn().mockResolvedValueOnce([existingUser]);

      await expect(service.createUser(userData)).rejects.toThrow(
        '이미 존재하는 이메일입니다.',
      );
    });
  });

  describe('findByEmailAndProvider', () => {
    it('이메일과 provider로 사용자를 찾을 수 있어야 함', async () => {
      const mockUser = createMockUser({
        email: 'test@test.com',
        provider: 'local',
      });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);

      const result = await service.findByEmailAndProvider(
        'test@test.com',
        'local',
      );

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@test.com');
      expect(result?.provider).toBe('local');
    });

    it('사용자가 없으면 null을 반환해야 함', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      const result = await service.findByEmailAndProvider(
        'notfound@test.com',
        'local',
      );

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('ID로 사용자를 찾을 수 있어야 함', async () => {
      const mockUser = createMockUser({ id: 1 });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);

      const result = await service.findById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('사용자가 없으면 null을 반환해야 함', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('ID로 사용자를 찾을 수 있어야 함', async () => {
      const mockUser = createMockUser({ id: 1 });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);

      const result = await service.findByIdOrFail(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('사용자가 없으면 NotFoundException 발생', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      await expect(service.findByIdOrFail(999)).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
    });
  });

  describe('findByUserCode', () => {
    it('userCode로 사용자를 찾을 수 있어야 함', async () => {
      const mockUser = createMockUser({ userCode: 'ABCD1234' });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);

      const result = await service.findByUserCode('ABCD1234');

      expect(result).toBeDefined();
      expect(result?.userCode).toBe('ABCD1234');
    });

    it('사용자가 없으면 null을 반환해야 함', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      const result = await service.findByUserCode('NOTFOUND');

      expect(result).toBeNull();
    });
  });

  describe('findByUserCodeOrFail', () => {
    it('userCode로 사용자를 찾을 수 있어야 함', async () => {
      const mockUser = createMockUser({ userCode: 'ABCD1234' });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);

      const result = await service.findByUserCodeOrFail('ABCD1234');

      expect(result).toBeDefined();
      expect(result.userCode).toBe('ABCD1234');
    });

    it('사용자가 없으면 NotFoundException 발생', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      await expect(service.findByUserCodeOrFail('NOTFOUND')).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
    });
  });

  describe('updateUser', () => {
    it('사용자 정보를 업데이트 할 수 있어야 함', async () => {
      const mockUser = createMockUser({ id: 1, name: 'Old Name' });
      const updatedUser = { ...mockUser, name: 'New Name' };

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);
      mockDB.update = jest.fn().mockReturnThis();
      mockDB.set = jest.fn().mockReturnThis();
      mockDB.returning = jest.fn().mockResolvedValueOnce([updatedUser]);

      const result = await service.updateUser(1, { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('비밀번호 변경 시 현재 비밀번호가 필요함', async () => {
      const mockUser = createMockUser({ id: 1, password: 'hashed_password' });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);

      await expect(
        service.updateUser(1, { password: 'new_password' }),
      ).rejects.toThrow('현재 비밀번호를 입력해주세요.');
    });

    it('현재 비밀번호가 틀리면 BadRequestException 발생', async () => {
      const mockUser = createMockUser({ id: 1, password: 'hashed_password' });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.updateUser(1, {
          currentPassword: 'wrong_password',
          password: 'new_password',
        }),
      ).rejects.toThrow('현재 비밀번호가 올바르지 않습니다.');
    });

    it('현재 비밀번호가 맞으면 비밀번호를 변경할 수 있어야 함', async () => {
      const mockUser = createMockUser({ id: 1, password: 'hashed_password' });
      const updatedUser = { ...mockUser, password: 'new_hashed_password' };

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);
      mockDB.update = jest.fn().mockReturnThis();
      mockDB.set = jest.fn().mockReturnThis();
      mockDB.returning = jest.fn().mockResolvedValueOnce([updatedUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('new_hashed_password');

      const result = await service.updateUser(1, {
        currentPassword: 'correct_password',
        password: 'new_password',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('new_password', 10);
      expect(result).toBeDefined();
    });

    it('프로필 이미지 업데이트 시 S3에 업로드', async () => {
      const mockUser = createMockUser({ id: 1 });
      const updatedUser = {
        ...mockUser,
        profileImageUrl: 'https://test-bucket-url/users/profile/test-image.jpg',
      };

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);
      mockDB.update = jest.fn().mockReturnThis();
      mockDB.set = jest.fn().mockReturnThis();
      mockDB.returning = jest.fn().mockResolvedValueOnce([updatedUser]);

      const result = await service.updateUser(1, {
        profileImage: mockFile,
      });

      expect(awsService.uploadFile).toHaveBeenCalled();
      expect(result.profileImageUrl).toBe(
        'https://test-bucket-url/users/profile/test-image.jpg',
      );
    });
  });

  describe('softDeleteUser', () => {
    it('사용자를 소프트 삭제할 수 있어야 함', async () => {
      const mockUser = createMockUser({ id: 1, deletedAt: null });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);
      mockDB.update = jest.fn().mockReturnThis();
      mockDB.set = jest.fn().mockReturnThis();

      await service.softDeleteUser(1);

      expect(mockDB.update).toHaveBeenCalled();
      expect(mockDB.set).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      );
    });

    it('이미 삭제된 사용자는 BadRequestException 발생', async () => {
      const mockUser = createMockUser({ id: 1, deletedAt: new Date() });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);

      await expect(service.softDeleteUser(1)).rejects.toThrow(
        '이미 삭제된 계정입니다.',
      );
    });

    it('사용자가 없으면 NotFoundException 발생', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      await expect(service.softDeleteUser(999)).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
    });
  });

  describe('findByIdNotDeleted', () => {
    it('삭제되지 않은 사용자를 찾을 수 있어야 함', async () => {
      const mockUser = createMockUser({ id: 1, deletedAt: null });

      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser]);

      const result = await service.findByIdNotDeleted(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.deletedAt).toBeNull();
    });

    it('삭제된 사용자는 null 반환', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      const result = await service.findByIdNotDeleted(1);

      expect(result).toBeNull();
    });
  });

  describe('findByUserCodeWithStats', () => {
    it('userCode로 사용자와 통계를 함께 조회할 수 있어야 함', async () => {
      const mockUser = createMockUser({ id: 1, userCode: 'ABCD1234' });

      // findByUserCode는 limit()을 호출하고, count 쿼리들은 where()에서 끝남
      let whereCallCount = 0;

      mockDB.limit = jest.fn().mockImplementation(() => {
        return Promise.resolve([mockUser]);
      });

      // where가 Promise를 반환하도록 설정 (count 쿼리용)
      mockDB.where = jest.fn().mockImplementation(() => {
        whereCallCount++;
        // 첫 번째는 findByUserCode의 where (limit이 체이닝됨)
        // 그 이후는 count 쿼리들 (where에서 끝남)
        if (whereCallCount === 1) {
          return { limit: mockDB.limit };
        }
        // count 쿼리는 where에서 바로 결과 반환
        return Promise.resolve([{ count: 5 }]);
      });

      const result = await service.findByUserCodeWithStats('ABCD1234');

      expect(result).toBeDefined();
      expect(result.user.userCode).toBe('ABCD1234');
      expect(result.followersCount).toBe(5);
      expect(result.followingCount).toBe(5);
      expect(result.postsCount).toBe(5);
    });

    it('사용자가 없으면 NotFoundException 발생', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      await expect(
        service.findByUserCodeWithStats('NOTFOUND'),
      ).rejects.toThrow('사용자를 찾을 수 없습니다.');
    });
  });
});
