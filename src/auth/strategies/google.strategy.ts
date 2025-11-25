import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

interface GoogleProfile {
  id: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, name, emails, photos } = profile;

    const email = emails?.[0]?.value;
    if (!email) {
      return done(
        new Error('Google 계정에서 이메일을 가져올 수 없습니다.'),
        undefined,
      );
    }

    const user = {
      provider: 'google',
      socialId: id,
      email,
      name: name
        ? `${name.givenName ?? ''} ${name.familyName ?? ''}`.trim()
        : 'Unknown',
      profileImageUrl: photos?.[0]?.value ?? '',
    };

    done(null, user);
  }
}
