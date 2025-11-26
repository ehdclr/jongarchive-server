import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule } from './config/config.module';
import { AwsModule } from './aws/aws.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { CategoriesModule } from './categories/categories.module';
import { FollowsModule } from './follows/follows.module';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    AwsModule,
    AuthModule,
    PostsModule,
    CategoriesModule,
    FollowsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
