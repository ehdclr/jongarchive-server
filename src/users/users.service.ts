import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { DrizzleClient } from '../database/database.module';
import { User, users as usersSchema } from '@/database/schema';
import * as bcrypt from 'bcrypt';
import { AwsService } from '@/aws/aws.service';
import { eq, and } from 'drizzle-orm';
import { CreateUserDto } from './dto';

export interface CreateUserWithFileDto extends CreateUserDto {
  profileImage?: Express.Multer.File | null;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject('DATABASE') private readonly db: DrizzleClient,
    private readonly awsService: AwsService,
  ) {}

  async createUser(createUserDto: CreateUserWithFileDto): Promise<User> {
    const { email, name, provider, socialId, phoneNumber, bio, password } =
      createUserDto;

    let profileImageUrl = '';
    const isEmailExists = await this.db
      .select()
      .from(usersSchema)
      .where(eq(usersSchema.email, email));

    if (isEmailExists.length > 0) {
      throw new BadRequestException('이미 존재하는 이메일입니다.');
    }

    if (createUserDto.profileImage) {
      profileImageUrl = await this.awsService.uploadFile(
        createUserDto.profileImage,
        `users/profile`,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await this.db
      .insert(usersSchema)
      .values({
        email,
        name,
        provider,
        socialId: socialId || '',
        phoneNumber: phoneNumber || '',
        bio: bio || '',
        profileImageUrl,
        password: hashedPassword,
      })
      .returning();

    return user;
  }

  async findByEmailAndProvider(
    email: string,
    provider: string,
  ): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(usersSchema)
      .where(
        and(eq(usersSchema.email, email), eq(usersSchema.provider, provider)),
      )
      .limit(1);

    return user || null;
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(usersSchema)
      .where(eq(usersSchema.id, id))
      .limit(1);
    return user || null;
  }

  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }
}
