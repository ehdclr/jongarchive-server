import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { UsersService } from '@/users/users.service';
import { AwsService } from '@/aws/aws.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanupTestDatabase,
  getTestDatabase,
} from '../setup/test-database';

describe('AuthService (Integration)', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let module: TestingModule;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_TOKEN_SECRET: 'test-access-secret',
        JWT_REFRESH_TOKEN_SECRET: 'test-refresh-secret',
        JWT_ACCESS_TOKEN_EXPIRES_IN: '15m',
        JWT_REFRESH_TOKEN_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_TOKEN_SECRET: 'test-access-secret',
        JWT_REFRESH_TOKEN_SECRET: 'test-refresh-secret',
      };
      return config[key];
    }),
  };

  beforeAll(async () => {
    await setupTestDatabase();

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService,
        JwtService,
        {
          provide: 'DATABASE',
          useFactory: () => getTestDatabase(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AwsService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue('https://test/profile.jpg'),
            deleteFile: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await module?.close();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('validateLocalLogin', () => {
    it('유효한 이메일과 비밀번호로 로그인 성공', async () => {
      // 사용자 생성
      await usersService.createUser({
        email: 'login@example.com',
        name: 'Login User',
        password: 'password123',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      });

      const result = await authService.validateLocalLogin({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe('login@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('존재하지 않는 이메일로 로그인 시 BadRequestException 발생', async () => {
      await expect(
        authService.validateLocalLogin({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('잘못된 비밀번호로 로그인 시 BadRequestException 발생', async () => {
      await usersService.createUser({
        email: 'wrongpw@example.com',
        name: 'Wrong PW User',
        password: 'correctpassword',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      });

      await expect(
        authService.validateLocalLogin({
          email: 'wrongpw@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateOauthLogin', () => {
    it('신규 OAuth 사용자 생성 및 로그인', async () => {
      const profile = {
        email: 'oauth@example.com',
        name: 'OAuth User',
        provider: 'google',
        socialId: 'google-123',
        profileImage: null,
      };

      const result = await authService.validateOauthLogin(profile);

      expect(result).toBeDefined();
      expect(result.user.email).toBe('oauth@example.com');
      expect(result.user.provider).toBe('google');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('기존 OAuth 사용자로 로그인', async () => {
      // 먼저 OAuth 사용자 생성
      await usersService.createUser({
        email: 'existing-oauth@example.com',
        name: 'Existing OAuth',
        password: '',
        provider: 'google',
        socialId: 'google-456',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      });

      const profile = {
        email: 'existing-oauth@example.com',
        name: 'Existing OAuth',
        provider: 'google',
        socialId: 'google-456',
      };

      const result = await authService.validateOauthLogin(profile);

      expect(result).toBeDefined();
      expect(result.user.email).toBe('existing-oauth@example.com');
    });
  });

  describe('generateToken & refreshToken', () => {
    it('토큰 생성 및 리프레시 성공', async () => {
      const user = await usersService.createUser({
        email: 'token@example.com',
        name: 'Token User',
        password: 'password123',
        provider: 'local',
        socialId: '',
        phoneNumber: '',
        bio: '',
        profileImage: null,
      });

      const tokens = await authService.generateToken(user);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      // 리프레시 토큰으로 새 토큰 발급
      const newTokens = await authService.refreshToken(tokens.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
    });

    it('잘못된 리프레시 토큰으로 요청 시 UnauthorizedException 발생', async () => {
      await expect(
        authService.refreshToken('invalid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
