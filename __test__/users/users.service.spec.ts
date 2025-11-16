import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from "@/users/users.service";
import { AwsService } from '@/aws/aws.service';
import { DrizzleClient } from '@/database/database.module';
import { createUserFixture, createMockUser } from '@test/fixtures/user.fixture';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('uuid');

describe('UsersService', () => {
  let service: UsersService;
  let awsService: AwsService;
  let mockDB: typeof DrizzleClient;

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
          uploadFile: jest.fn().mockResolvedValue('https://test-bucket-url/users/profile/test-image.jpg'),
          deleteFile: jest.fn().mockResolvedValue(undefined),
          getSignedUrl: jest.fn(),
        },
      }
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
    it('새로운 로컬 사용자를 생성', async()=>{
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
      
    })

    it('이미지 파일과 함께 사용자를 생성할 수 있어야 함', async () => {
      const userData = createUserFixture();
      const mockCreatedUser = createMockUser();

      mockDB.returning.mockResolvedValueOnce([mockCreatedUser]);

      const result = await service.createUser({...userData, profileImage: mockFile});
    
      expect(result).toBeDefined();
      expect(result.email).toBe(mockCreatedUser.email);
      expect(awsService.uploadFile).toHaveBeenCalledWith(mockFile, 'users/profile');
      expect(result.profileImageUrl).toBe(mockCreatedUser.profileImageUrl);
    });

    it('비밀번호가 해시화 되어서 DB에 저장되어야 함', async () => {
      const userData = createUserFixture({ password: 'plain_password' }); // fakerjs에 평문 주입해서 사용
      const mockCreatedUser = createMockUser(); //DB에서 조회된 것처럼 생성

      mockDB.returning.mockResolvedValueOnce([mockCreatedUser]);

      await service.createUser(userData, null);

      //호출 확인
      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);

      expect(mockDB.values).toHaveBeenCalledWith((
        expect.objectContaining({
          password: 'hashed_password_123',
        })
      ))

    })
  })


});