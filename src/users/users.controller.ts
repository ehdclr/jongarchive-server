import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto, UserResponse, toUserResponse } from './dto';
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
}
