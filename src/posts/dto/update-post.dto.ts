import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

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
}

export interface UpdatePostWithFileDto extends UpdatePostDto {
  thumbnail?: Express.Multer.File | null;
}
