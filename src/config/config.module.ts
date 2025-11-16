import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { z } from 'zod';


const envSchema = z.object({
  NODE_ENV: z
    .enum(['local', 'development', 'production', 'test'])
    .default('local'),
  PORT: z.string().default('8000'),

  //DATABASE 관련
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.string().default('5432'),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_MAX_CONNECTIONS: z.string().default('100'),
  POSTGRES_IDLE_TIMEOUT: z.string().default('30000'),

  //REDIS 관련
  // REDIS_HOST: z.string(),
  // REDIS_PORT: z.string().default('6379'),

  //ADMIN 나중에 따로 조정 ORIGIN 추가 예정

  //GOOGLE관련

  //KAKAO관련

  //JWT
  // JWT_SECRET: z.string(),
  // JWT_ADMIN_ACCESS_TOKEN_SECRET: z.string(),
  // JWT_ADMIN_REFRESH_TOKEN_SECRET: z.string(),

  //! AWS 관련
  AWS_REGION: z.string().default('ap-northeast-2'),
  AWS_S3_BUCKET_NAME: z.string(),
  AWS_S3_BUCKET_URL: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),

  FRONTEND_URL: z.string(),

  //! GOOGLE 관련
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),

  //! JWT 관련
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),

});

@Global() // 전역 모듈로 사용해야함
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true, // 환경변수 캐시 사용
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'local'}`,  // .env.local, .env.development 등
      ],
      validate: (config: Record<string, unknown>) => {
        try {
          return envSchema.parse(config);
        } catch (error) {
          console.error(`환경변수 검증 실패: `, error);
          throw error;
        }
      },
    }),
  ],
})
export class ConfigModule {}
