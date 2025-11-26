import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { DrizzleClient } from '../database/database.module';
import {
  User,
  users as usersSchema,
  follows as followsSchema,
  posts as postsSchema,
} from '@/database/schema';
import * as bcrypt from 'bcrypt';
import { AwsService } from '@/aws/aws.service';
import { eq, and, isNull, sql, or, ilike } from 'drizzle-orm';
import {
  CreateUserDto,
  UpdateUserWithFileDto,
} from './dto';

export interface CreateUserWithFileDto extends CreateUserDto {
  profileImage?: Express.Multer.File | null;
}

export interface UserWithStats {
  user: User;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject('DATABASE') private readonly db: DrizzleClient,
    private readonly awsService: AwsService,
  ) {}

  private generateUserCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async generateUniqueUserCode(maxRetries = 5): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const code = this.generateUserCode();
      const existing = await this.db
        .select()
        .from(usersSchema)
        .where(eq(usersSchema.userCode, code))
        .limit(1);
      if (existing.length === 0) {
        return code;
      }
    }
    throw new BadRequestException('유저 코드 생성에 실패했습니다. 다시 시도해주세요.');
  }

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
    const userCode = await this.generateUniqueUserCode();
    const [user] = await this.db
      .insert(usersSchema)
      .values({
        email,
        name,
        provider,
        userCode,
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

  async findByUserCode(userCode: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(usersSchema)
      .where(eq(usersSchema.userCode, userCode))
      .limit(1);
    return user || null;
  }

  async findByUserCodeOrFail(userCode: string): Promise<User> {
    const user = await this.findByUserCode(userCode);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }

  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserWithFileDto,
  ): Promise<User> {
    const user = await this.findByIdOrFail(id);

    let profileImageUrl = user.profileImageUrl;

    // profileImage 파일이 있으면 S3 업로드
    if (updateUserDto.profileImage) {
      profileImageUrl = await this.awsService.uploadFile(
        updateUserDto.profileImage,
        `users/profile`,
      );
    } else if (updateUserDto.profileImageUrl !== undefined) {
      // profileImageUrl이 명시적으로 전달되면 그 값 사용 (빈 문자열이면 기본 이미지)
      profileImageUrl = updateUserDto.profileImageUrl;
    }

    // 비밀번호 변경 시 현재 비밀번호 확인
    let hashedPassword = user.password;
    if (updateUserDto.password) {
      if (!updateUserDto.currentPassword) {
        throw new BadRequestException('현재 비밀번호를 입력해주세요.');
      }
      const isPasswordValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.password || '',
      );
      if (!isPasswordValid) {
        throw new BadRequestException('현재 비밀번호가 올바르지 않습니다.');
      }
      hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
    }

    const [updatedUser] = await this.db
      .update(usersSchema)
      .set({
        name: updateUserDto.name ?? user.name,
        phoneNumber: updateUserDto.phoneNumber ?? user.phoneNumber,
        bio: updateUserDto.bio ?? user.bio,
        profileImageUrl,
        password: hashedPassword,
      })
      .where(eq(usersSchema.id, id))
      .returning();

    return updatedUser;
  }

  async softDeleteUser(id: number): Promise<void> {
    const user = await this.findByIdOrFail(id);

    // 이미 삭제된 계정인지 확인
    if (user.deletedAt) {
      throw new BadRequestException('이미 삭제된 계정입니다.');
    }

    await this.db
      .update(usersSchema)
      .set({ deletedAt: new Date() })
      .where(eq(usersSchema.id, id));
  }

  async findByIdNotDeleted(id: number): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(usersSchema)
      .where(and(eq(usersSchema.id, id), isNull(usersSchema.deletedAt)))
      .limit(1);
    return user || null;
  }

  /**
   * userCode로 사용자와 통계(팔로워/팔로잉/포스트 수)를 함께 조회
   * N+1 문제를 피하기 위해 서브쿼리 사용
   */
  async findByUserCodeWithStats(userCode: string): Promise<UserWithStats> {
    const user = await this.findByUserCodeOrFail(userCode);

    // 팔로워 수 (나를 팔로우하는 사람 수)
    const followersCountQuery = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(followsSchema)
      .where(eq(followsSchema.followingId, user.id));

    // 팔로잉 수 (내가 팔로우하는 사람 수)
    const followingCountQuery = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(followsSchema)
      .where(eq(followsSchema.followerId, user.id));

    // 포스트 수
    const postsCountQuery = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(postsSchema)
      .where(eq(postsSchema.authorId, user.id));

    // 병렬로 실행
    const [followersResult, followingResult, postsResult] = await Promise.all([
      followersCountQuery,
      followingCountQuery,
      postsCountQuery,
    ]);

    return {
      user,
      followersCount: followersResult[0]?.count ?? 0,
      followingCount: followingResult[0]?.count ?? 0,
      postsCount: postsResult[0]?.count ?? 0,
    };
  }

  /**
   * 사용자 검색 (이름 또는 userCode로 검색)
   * 삭제된 사용자는 제외, 최대 20개 결과 반환
   */
  async searchUsers(query: string): Promise<User[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const searchPattern = `%${trimmedQuery}%`;

    const users = await this.db
      .select()
      .from(usersSchema)
      .where(
        and(
          isNull(usersSchema.deletedAt),
          or(
            ilike(usersSchema.name, searchPattern),
            ilike(usersSchema.userCode, searchPattern),
          ),
        ),
      )
      .limit(20);

    return users;
  }
}
