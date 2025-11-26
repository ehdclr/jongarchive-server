import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponse,
  toUserResponse,
  toPublicUserWithStatsResponse,
  PublicUserWithStatsResponse,
} from './dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('profileImage'))
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() profileImage: Express.Multer.File | null,
  ): Promise<UserResponse> {
    const user = await this.usersService.createUser({
      ...createUserDto,
      profileImage,
    });
    return toUserResponse(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    const user = await this.usersService.findByIdOrFail(req.user.id);
    return { success: true, payload: toUserResponse(user) };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateMe(
    @Req() req: any,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() profileImage: Express.Multer.File | null,
  ) {
    const user = await this.usersService.updateUser(req.user.id, {
      ...updateUserDto,
      profileImage,
    });
    return { success: true, payload: toUserResponse(user) };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Query('q') query: string) {
    const users = await this.usersService.searchUsers(query || '');
    return {
      success: true,
      payload: users.map((user) => toUserResponse(user)),
    };
  }

  @Get(':userCode')
  @UseGuards(JwtAuthGuard)
  async getUserByCode(
    @Param('userCode') userCode: string,
  ): Promise<PublicUserWithStatsResponse> {
    const { user, followersCount, followingCount, postsCount } =
      await this.usersService.findByUserCodeWithStats(userCode);
    return toPublicUserWithStatsResponse(user, {
      followersCount,
      followingCount,
      postsCount,
    });
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteMe(@Req() req: any) {
    await this.usersService.softDeleteUser(req.user.id);
    return { success: true, message: '계정이 삭제되었습니다.' };
  }
}
