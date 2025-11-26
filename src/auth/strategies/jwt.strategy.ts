import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Bearer 토큰을 Authorization 헤더에서 추출
      // accessToken은 클라이언트가 localStorage에 저장하고 요청 시 헤더로 전송
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  /**
   * 액세스 토큰 검증 및 페이로드 반환 (복호화 후)
   * @param payload - JWT 페이로드 (sub, email, provider)
   * @returns 사용자 정보
   */
  async validate(payload: { sub: number; email: string; provider: string }) {
    return {
      id: payload.sub,
      email: payload.email,
      provider: payload.provider,
    };
  }
}
