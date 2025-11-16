import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { DatabaseModule } from '../database/database.module';
import { AwsModule } from '@/aws/aws.module';

import { UsersController } from './users.controller';

import { UsersService } from './users.service';
import { memoryStorage } from 'multer';


@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    AwsModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 1024 * 1024 * 100, // 100MB
      },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
