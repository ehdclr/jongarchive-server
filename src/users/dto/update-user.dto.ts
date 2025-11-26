import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;
}

export interface UpdateUserWithFileDto extends UpdateUserDto {
  profileImage?: Express.Multer.File | null;
}
