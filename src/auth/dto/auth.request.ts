import { IsEmail, IsString, Length, IsEnum, IsOptional } from "class-validator";

enum Provider {
  LOCAL = 'local',
  GOOGLE = 'google',
  KAKAO = 'kakao',
}


export class SigninRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 20, { message: '비밀번호는 8자 이상 20자 이하여야 합니다.' })
  password: string;
}