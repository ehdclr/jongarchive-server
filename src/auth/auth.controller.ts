import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Get, Post, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
    const { accessToken, refreshToken, user } =
      await this.authService.validateOauthLogin(googleProfile);

    // 프론트엔드로 리다이렉트 (자체 JWT 전달)
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    res.cookie('accessToken', accessToken, {
      httpOnly: true, // JavaScript에서 접근 불가 (XSS 방지)
      secure: isProduction, // HTTPS에서만 전송
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // JavaScript에서 접근 불가 (XSS 방지)
      secure: isProduction, // HTTPS에서만 전송
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    res.redirect(`${frontendUrl}`);
  }

  @Post('refresh')
  async refreshToken(@Req() req: any, @Res() res: Response) {
    const userRefreshToken = req.cookies['refreshToken'];

    const { accessToken, refreshToken } = await this.authService.refreshToken(userRefreshToken as string);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: '토큰 리프레시 성공',
      data: { accessToken, refreshToken },
    });
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: this.getCookieDomain(),
      maxAge: 0,
    });

    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: this.getCookieDomain(),
      maxAge: 0,
    });

    return res
      .status(200)
      .json({ success: true, message: '로그아웃 되었습니다.' });
  }

  private getCookieDomain(): string | undefined {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    if (isProduction) {
      return this.configService.get<string>('COOKIE_DOMAIN');
    }
    return undefined;
  }
}
