import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule } from './config/config.module';
import { AwsModule } from './aws/aws.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [UsersModule, ConfigModule, AwsModule, AuthModule, PostsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
