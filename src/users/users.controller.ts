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
  error?: string;
  payload?: T;
  message?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 사용자 생성
   * @param userData - 사용자 생성 요청 정보
   * @param profileImage - 사용자 프로필 이미지
   * @returns {Promise<ApiResponse<Omit<User, 'password'>>>} - 사용자 생성 응답 정보
   */
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
      payload: {
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
