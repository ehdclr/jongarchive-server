import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');

  // 요청 크기 제한 설정
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  //class validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 요청 바디에 정의되지 않은 프로퍼티 제거
      transform: true, // 요청 바디의 타입을 자동으로 변환 (예: string을 number로 변환)
      forbidNonWhitelisted: true, // 요청 바디에 정의되지 않은 프로퍼티가 있으면 에러 발생 (예: 요청 바디에 정의되지 않은 프로퍼티가 있으면 에러 발생)
    }),
  );

  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Cookie', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(cookieParser());

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 8000;
  //prefix api
  app.setGlobalPrefix('api');
  await app.listen(port);
  
  Logger.log(`🚀 Application is running on: http://localhost:${port}`, 'Bootstrap');
}

bootstrap()

//Production 모드에서는 에러 로깅을 파일에 저장
// bootstrap().catch((error) => {
//   console.error('Application bootstrap failed', error);
//   process.exit(1);
// });