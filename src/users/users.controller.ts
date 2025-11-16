import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { User } from '../database/schema/user';

interface CreateUserRequest {
  email: string;
  name: string;
  provider: string;
  socialId: string;
  phoneNumber: string;
  bio: string;
  password: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('profileImage'))
  async createUser(
    @Body() userData: CreateUserRequest,
    @UploadedFile() profileImage: Express.Multer.File | null,
  ): Promise<ApiResponse<Omit<User, 'password'>>> {
    const user = await this.usersService.createUser({
      email: userData.email,
      name: userData.name,
      provider: userData.provider,
      socialId: userData.socialId,
      phoneNumber: userData.phoneNumber,
      bio: userData.bio,
      password: userData.password,
      profileImage: profileImage,
    });

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        socialId: user.socialId,
        phoneNumber: user.phoneNumber,
        profileImageUrl: user.profileImageUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}
