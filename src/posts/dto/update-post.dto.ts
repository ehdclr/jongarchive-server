import { IsString, IsOptional, MaxLength, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: '제목은 255자 이하로 입력해주세요.' })
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '카테고리 ID는 정수여야 합니다.' })
  categoryId?: number | null; // null로 카테고리 해제 가능
}

export interface UpdatePostWithFileDto extends UpdatePostDto {
  thumbnail?: Express.Multer.File | null;
}
