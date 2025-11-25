/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { UsersService } from '@/users/users.service';
import { createMockUser } from '@test/fixtures/user.fixture';
import { ERROR_MESSAGES } from '@/common/const/error';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmailAndProvider: jest.fn(),
            findById: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // 기본 Config Mock 설정
    configService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_TOKEN_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_TOKEN_SECRET') return 'refresh-secret';
      return '';
    });
    configService.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_TOKEN_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_TOKEN_EXPIRES_IN') return '7d';
      if (key === 'JWT_REFRESH_TOKEN_SECRET') return 'refresh-secret';
      return '';
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('validateLocalLogin', () => {
    it('유효한 이메일과 비밀번호로 로그인 성공', async () => {
      const mockUser = createMockUser({
        email: 'test@test.com',
        password: 'hashed_password',
        provider: 'local',
      });
      const signinDto = { email: 'test@test.com', password: 'password123' };

      usersService.findByEmailAndProvider.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await authService.validateLocalLogin(signinDto);

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(usersService.findByEmailAndProvider).toHaveBeenCalledWith(
        'test@test.com',
        'local',
      );
    });

    it('존재하지 않는 이메일로 로그인 시 BadRequestException 발생', async () => {
      const signinDto = { email: 'notfound@test.com', password: 'password123' };

      usersService.findByEmailAndProvider.mockResolvedValue(null);

      await expect(authService.validateLocalLogin(signinDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('잘못된 비밀번호로 로그인 시 BadRequestException 발생', async () => {
      const mockUser = createMockUser({
        email: 'test@test.com',
        password: 'hashed_password',
        provider: 'local',
      });
      const signinDto = { email: 'test@test.com', password: 'wrong_password' };

      usersService.findByEmailAndProvider.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.validateLocalLogin(signinDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('비밀번호가 없는 OAuth 사용자로 로그인 시 BadRequestException 발생', async () => {
      const mockUser = createMockUser({
        email: 'oauth@test.com',
        password: null,
        provider: 'local',
      });
      const signinDto = { email: 'oauth@test.com', password: 'password123' };

      usersService.findByEmailAndProvider.mockResolvedValue(mockUser);

      await expect(authService.validateLocalLogin(signinDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateOauthLogin', () => {
    it('기존 사용자로 OAuth 로그인 성공', async () => {
      const mockUser = createMockUser({
        email: 'google@test.com',
        provider: 'google',
      });
      const profile = {
        email: 'google@test.com',
        name: 'Google User',
        provider: 'google',
        socialId: 'google-123',
      };

      usersService.findByEmailAndProvider.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await authService.validateOauthLogin(profile);

      expect(result.user.email).toBe('google@test.com');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('신규 사용자로 OAuth 로그인 시 사용자 생성', async () => {
      const mockUser = createMockUser({
        email: 'newuser@test.com',
        provider: 'google',
      });
      const profile = {
        email: 'newuser@test.com',
        name: 'New User',
        provider: 'google',
        socialId: 'google-456',
      };

      usersService.findByEmailAndProvider.mockResolvedValue(null);
      usersService.createUser.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await authService.validateOauthLogin(profile);

      expect(result.user.email).toBe('newuser@test.com');
      expect(usersService.createUser).toHaveBeenCalledWith({
        email: 'newuser@test.com',
        name: 'New User',
        provider: 'google',
        socialId: 'google-456',
        phoneNumber: '',
        bio: '',
        password: '',
        profileImage: null,
      });
    });
  });

  describe('generateToken', () => {
    it('액세스 토큰과 리프레시 토큰을 생성해야 함', async () => {
      const mockUser = createMockUser();

      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await authService.generateToken(mockUser);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateAccesstoken', () => {
    it('액세스 토큰을 생성해야 함', async () => {
      const mockUser = createMockUser({ id: 1, email: 'test@test.com' });

      jwtService.signAsync.mockResolvedValue('access-token');

      const result = await authService.generateAccesstoken(mockUser);

      expect(result).toBe('access-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
        }),
        expect.objectContaining({
          secret: 'access-secret',
          expiresIn: '15m',
        }),
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('리프레시 토큰을 생성해야 함', async () => {
      const mockUser = createMockUser({ id: 1, email: 'test@test.com' });

      jwtService.signAsync.mockResolvedValue('refresh-token');

      const result = await authService.generateRefreshToken(mockUser);

      expect(result).toBe('refresh-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
        }),
        expect.objectContaining({
          secret: 'refresh-secret',
          expiresIn: '7d',
        }),
      );
    });
  });

  describe('refreshToken', () => {
    it('유효한 리프레시 토큰으로 새 토큰 발급', async () => {
      const mockUser = createMockUser({ id: 1 });
      const payload = { id: 1, email: 'test@test.com' };

      jwtService.verifyAsync.mockResolvedValue(payload);
      usersService.findById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValueOnce('new-access-token');
      jwtService.signAsync.mockResolvedValueOnce('new-refresh-token');

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('만료된 리프레시 토큰으로 요청 시 UnauthorizedException 발생', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      await expect(
        authService.refreshToken('expired-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('존재하지 않는 사용자의 리프레시 토큰으로 요청 시 UnauthorizedException 발생', async () => {
      const payload = { id: 999, email: 'deleted@test.com' };

      jwtService.verifyAsync.mockResolvedValue(payload);
      usersService.findById.mockResolvedValue(null);

      await expect(
        authService.refreshToken('valid-but-user-deleted'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
