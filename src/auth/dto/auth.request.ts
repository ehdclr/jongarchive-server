import { IsEmail, IsString, Length } from 'class-validator';

export class SigninRequestDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @IsString()
  @Length(8, 20, { message: '비밀번호는 8자 이상 20자 이하여야 합니다.' })
  password: string;
}
