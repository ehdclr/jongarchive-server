import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { User } from '@/database/schema';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/common/const/error';
import * as bcrypt from 'bcrypt';
import { SigninRequestDto } from './dto/auth.request';
import Provider from '@/common/const/provider';

interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * OAuth 로그인 검증
   * @param profile - OAuth 프로필 정보
   * @returns {Promise<AuthLoginResponse>} - OAuth 로그인 응답 정보
   */
  async validateOauthLogin(profile: any): Promise<AuthLoginResponse> {
    let user = await this.usersService.findByEmailAndProvider(
      profile.email,
      profile.provider,
    );

    // 없으면 새로 생성
    if (!user) {
      user = await this.usersService.createUser({
        email: profile.email,
        name: profile.name,
        provider: profile.provider,
        socialId: profile.socialId,
        phoneNumber: '',
        bio: '',
        password: '', // OAuth는 비밀번호 불필요
        profileImage: profile.profileImage || null,
      });
    }

    const { accessToken, refreshToken } = await this.generateToken(user);
    return { accessToken, refreshToken, user };
  }

  /**
   * local 로그인 검증
   * @param signinDto - 로그인 요청 정보
   * @returns {Promise<{accessToken: string, refreshToken: string, user: User}>} - 액세스 토큰, 리프레시 토큰, 사용자 정보
   */
  async validateLocalLogin(
    signinDto: SigninRequestDto,
  ): Promise<AuthLoginResponse> {
    const user = await this.usersService.findByEmailAndProvider(
      signinDto.email,
      Provider.LOCAL,
    );
    if (!user || user.password === null || user.password === undefined) {
      throw new BadRequestException(
        ERROR_MESSAGES.BAD_REQUEST.INVALID_CREDENTIALS,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      signinDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException(
        ERROR_MESSAGES.BAD_REQUEST.INVALID_CREDENTIALS,
      );
    }

    const { accessToken, refreshToken } = await this.generateToken(user);
    return { accessToken, refreshToken, user };
  }

  /**
   * 토큰 생성
   * @param user - 사용자 정보
   * @returns {Promise<{ accessToken: string, refreshToken: string }>} - 액세스 토큰, 리프레시 토큰
   */
  async generateToken(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccesstoken(user),
      this.generateRefreshToken(user),
    ]);
    return { accessToken, refreshToken };
  }

  /**
   * 액세스 토큰 생성
   * @param user - 사용자 정보
   * @returns {Promise<string>} - 액세스 토큰
   */
  async generateAccesstoken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>(
        'JWT_ACCESS_TOKEN_EXPIRES_IN',
      ) || '15m') as any, // ⬅️ as any 추가
    });
  }

  /**
   * 리프레시 토큰 생성
   * @param user - 사용자 정보
   * @returns {Promise<string>} - 리프레시 토큰
   */
  async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>(
        'JWT_REFRESH_TOKEN_EXPIRES_IN',
      ) || '7d') as any, // ⬅️ as any 추가
    });
  }

  /**
   * 토큰 리프레시
   * @param refreshToken - 리프레시 토큰
   * @returns {Promise<{ accessToken: string, refreshToken: string }>} - 액세스 토큰, 리프레시 토큰
   */
  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new BadRequestException(
          ERROR_MESSAGES.BAD_REQUEST.USER_NOT_FOUND,
        );
      }
      const [accessToken, newRefreshToken] = await Promise.all([
        this.generateAccesstoken(user),
        this.generateRefreshToken(user),
      ]);
      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException(
        ERROR_MESSAGES.UNAUTHORIZED.REFRESH_TOKEN_EXPIRED,
      );
    }
  }
}
