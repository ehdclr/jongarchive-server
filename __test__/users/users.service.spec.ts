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
    stream: null,
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

      const result = await service.createUser(userData, null);

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

      await service.createUser(userData, null);

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

      await expect(service.createUser(userData, null)).rejects.toThrow(
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
});
