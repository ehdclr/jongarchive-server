import { Controller, Get, Post, Body, Query, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { GoogleClient } from './clients/google.client';
import type { Request, Response } from 'express';
import { SigninRequestDto } from './dto';
import { toUserResponse } from '@/users/dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly googleClient: GoogleClient,
  ) {}

  @Get('google')
  async googleAuth(@Req() req: Request, @Res() res: Response) {
    // referer에서 origin 추출
    const referer = req.headers.referer || req.headers.origin;
    let origin = this.configService.getOrThrow<string>('FRONTEND_URL');

    if (referer) {
      try {
        const url = new URL(referer);
        origin = url.origin;
      } catch {
        // invalid URL, use default
      }
    }

    // state에 origin 인코딩
    const state = Buffer.from(JSON.stringify({ origin })).toString('base64');
    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const callbackUrl = this.configService.getOrThrow<string>(
      'GOOGLE_CALLBACK_URL',
    );

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'email profile');
    googleAuthUrl.searchParams.set('state', state);

    res.redirect(googleAuthUrl.toString());
  }

  @Get('google/callback')
  async googleAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    // Google에서 토큰 교환 및 유저 정보 조회
    const googleAccessToken = await this.googleClient.getToken(code);
    const googleProfile = await this.googleClient.getUserInfo(googleAccessToken);

    // JWT 토큰 생성
    const { accessToken, refreshToken } =
      await this.authService.validateOauthLogin(googleProfile);

    // state에서 origin 추출
    let frontendOrigin = this.configService.getOrThrow<string>('FRONTEND_URL');

    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        if (decoded.origin) {
          frontendOrigin = decoded.origin;
        }
      } catch {
        // invalid state, use default
      }
    }

    res.redirect(
      `${frontendOrigin}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    );
  }

  @Post('set-cookies')
  async setCookies(
    @Body() body: { accessToken: string; refreshToken: string },
    @Res() res: Response,
  ) {
    this.setAuthCookies(res, body.accessToken, body.refreshToken);
    return res.status(200).json({
      success: true,
      message: '쿠키 설정 완료',
    });
  }

  @Post('refresh')
  async refreshToken(@Req() req: any, @Res() res: Response) {
    const userRefreshToken = req.cookies['refreshToken'];
    const { accessToken, refreshToken } = await this.authService.refreshToken(
      userRefreshToken as string,
    );

    this.setAuthCookies(res, accessToken, refreshToken);
    return res.status(200).json({
      success: true,
      message: '토큰 리프레시 성공',
    });
  }

  @Post('signin')
  async signin(@Body() signinDto: SigninRequestDto, @Res() res: Response) {
    const { accessToken, refreshToken, user } =
      await this.authService.validateLocalLogin(signinDto);

    this.setAuthCookies(res, accessToken, refreshToken);
    return res.status(200).json({
      success: true,
      message: '로그인 성공',
      payload: toUserResponse(user),
    });
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    this.clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      message: '로그아웃 되었습니다.',
    });
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

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
  }

  private clearAuthCookies(res: Response): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const cookieDomain = this.getCookieDomain();

    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: cookieDomain,
      maxAge: 0,
    });
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      domain: cookieDomain,
      maxAge: 0,
    });
  }

  private getCookieDomain(): string | undefined {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      return this.configService.get<string>('COOKIE_DOMAIN');
    }
    return undefined;
  }
}
