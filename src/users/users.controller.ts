import {
  Controller,
  Post,
  Put,
  Body,
  UploadedFile,
  UseInterceptors,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserResponse, toUserResponse } from './dto';
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
  async me(@Req() req: any): Promise<UserResponse> {
    const user = await this.usersService.findByIdOrFail(req.user.id);
    return toUserResponse(user);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateMe(
    @Req() req: any,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() profileImage: Express.Multer.File | null,
  ): Promise<UserResponse> {
    const user = await this.usersService.updateUser(req.user.id, {
      ...updateUserDto,
      profileImage,
    });
    return toUserResponse(user);
  }
}
