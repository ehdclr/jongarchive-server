import { IsString, IsOptional, MaxLength, IsBoolean, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: '제목은 255자 이하로 입력해주세요.' })
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return value;
  })
  @IsBoolean()
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
