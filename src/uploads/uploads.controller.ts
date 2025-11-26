import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AwsService } from '@/aws/aws.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly awsService: AwsService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; url: string }> {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    // 이미지 파일인지 확인
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('지원하지 않는 이미지 형식입니다.');
    }

    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('파일 크기는 5MB 이하여야 합니다.');
    }

    const url = await this.awsService.uploadFile(file, 'posts/images');

    return { success: true, url };
  }
}
