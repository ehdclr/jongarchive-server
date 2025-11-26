import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

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

  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsOptional()
  profileImageUrl?: string;
}

export interface UpdateUserWithFileDto extends UpdateUserDto {
  profileImage?: Express.Multer.File | null;
}
