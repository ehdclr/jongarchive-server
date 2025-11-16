import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import { User } from '@/database/schema';

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
  ) {}

  async validateOauthLogin(profile: any) : Promise<OauthLoginResponse> {
    let user = await this.usersService.findByEmailAndProvider(profile.email, profile.provider);

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

    const payload = { sub: user.id, email: user.email, provider: user.provider };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken, user };
  }

  //TODO: Local 로그인 로직
}
