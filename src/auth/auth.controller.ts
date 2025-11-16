import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    //Google OAuth 로그인 페이지로 리다이렉트
    // AuthGuard가 요청을 가로채서 Google로 리다이렉트
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    // Google OAuth 로그인 후 콜백 처리
    const googleProfile = req.user as any;

    // AuthService에서 자체 JWT 발급

    //TODO: 새로 자체 JWT 발급 로직 추가 - service 호출 
    const { accessToken, refreshToken, user } =  await this.authService.validateOauthLogin(googleProfile);

    // 프론트엔드로 리다이렉트 (자체 JWT 전달)
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    res.cookie('accessToken', accessToken, {
      httpOnly: true,     // JavaScript에서 접근 불가 (XSS 방지)
      secure: this.configService.getOrThrow<string>('NODE_ENV') === 'production',  // HTTPS에서만 전송
      sameSite: 'lax',    
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7일
      path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,     // JavaScript에서 접근 불가 (XSS 방지)
      secure: this.configService.getOrThrow<string>('NODE_ENV') === 'production',  // HTTPS에서만 전송
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7일
      path: '/',
    });
    res.redirect(`${frontendUrl}`);
  }
}
