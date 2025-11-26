import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { AwsModule } from '@/aws/aws.module';

@Module({
  imports: [AwsModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
