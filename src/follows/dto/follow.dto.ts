import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class FollowByCodeDto {
  @IsString()
  @IsNotEmpty({ message: '사용자 코드를 입력해주세요.' })
  userCode: string;
}

export class UnfollowDto {
  @IsNumber()
  @IsNotEmpty({ message: '사용자 ID를 입력해주세요.' })
  userId: number;
}
