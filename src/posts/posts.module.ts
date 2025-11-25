import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AwsModule } from '../aws/aws.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [DatabaseModule, AwsModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
