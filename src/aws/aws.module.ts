import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsService } from './aws.service';

@Module({
  imports: [ConfigModule],
  providers: [
    AwsService,
    {
      provide: Logger,
      useValue: new Logger('AWS Service'),
    },
  ],
  exports: [AwsService],
})
export class AwsModule {}
