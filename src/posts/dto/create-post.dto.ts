import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  @MaxLength(255, { message: '제목은 255자 이하로 입력해주세요.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '카테고리 ID는 정수여야 합니다.' })
  categoryId?: number;
}

export interface CreatePostWithFileDto extends CreatePostDto {
  thumbnail?: Express.Multer.File | null;
}
