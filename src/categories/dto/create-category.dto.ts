import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: '카테고리 이름을 입력해주세요.' })
  @MaxLength(100, { message: '카테고리 이름은 100자 이하로 입력해주세요.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'slug를 입력해주세요.' })
  @MaxLength(100, { message: 'slug는 100자 이하로 입력해주세요.' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug는 소문자, 숫자, 하이픈만 사용할 수 있습니다.',
  })
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: '올바른 HEX 색상 코드를 입력해주세요. (예: #3b82f6)',
  })
  color?: string;
}
