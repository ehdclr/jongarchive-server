import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          if(!request?.cookies?.['accessToken']) {
            throw new UnauthorizedException({
              message: '인증이 만료되었습니다. 재로그인 해주세요.',
              error: {
                type: 'access_token_expired',
                status: 401,
              },
            });
          }
          return request.cookies['accessToken'];
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  /** 
   * 액세스 토큰 검증 및 페이로드 반환 (복호화 후)
   * @param payload 
   * @returns 
   */
  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }
}