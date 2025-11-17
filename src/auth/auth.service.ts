import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import { ConfigService } from '@nestjs/config';
import { User } from '@/database/schema';
import { UnauthorizedException } from '@nestjs/common';

interface OauthLoginResponse {
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

  async validateOauthLogin(profile: any): Promise<OauthLoginResponse> {
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

  async generateToken(user: any) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccesstoken(user),
      this.generateRefreshToken(user),
    ]);
    return { accessToken, refreshToken };
  }

  async generateAccesstoken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') || '15m') as any,  // ⬅️ as any 추가
    });
  }
  
  async generateRefreshToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') || '7d') as any,  // ⬅️ as any 추가
    });
  }

  /**
   * 토큰 리프레시
   *
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });

      const user = await this.usersService.findById(payload.id);
      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }
      const [accessToken, newRefreshToken] = await Promise.all([
        this.generateAccesstoken(user),
        this.generateRefreshToken(user),
      ]);
      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('리프레시 토큰이 만료되었습니다.');
    }
  }
}
