import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  @MaxLength(255, { message: '제목은 255자 이하로 입력해주세요.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content: string;
}

export interface CreatePostWithFileDto extends CreatePostDto {
  thumbnail?: Express.Multer.File | null;
}
