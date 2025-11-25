import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { SigninRequestDto } from './dto';
import { toUserResponse } from '@/users/dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Google OAuth 로그인 페이지로 리다이렉트
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const googleProfile = req.user as any;
    const { accessToken, refreshToken } =
      await this.authService.validateOauthLogin(googleProfile);

    this.setAuthCookies(res, accessToken, refreshToken);
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}`);
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
