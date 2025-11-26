import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { DrizzleClient } from '../database/database.module';
import { follows, users } from '@/database/schema';
import { eq, and, count } from 'drizzle-orm';

export interface FollowUserInfo {
  id: number;
  name: string;
  userCode: string;
  profileImageUrl: string | null;
  bio: string | null;
}

@Injectable()
export class FollowsService {
  constructor(@Inject('DATABASE') private readonly db: DrizzleClient) {}

  async follow(followerId: number, followingUserCode: string): Promise<void> {
    // userCode로 대상 사용자 찾기
    const [targetUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.userCode, followingUserCode))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (targetUser.id === followerId) {
      throw new BadRequestException('자기 자신을 팔로우할 수 없습니다.');
    }

    // 이미 팔로우 중인지 확인
    const [existing] = await this.db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, targetUser.id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException('이미 팔로우 중입니다.');
    }

    await this.db.insert(follows).values({
      followerId,
      followingId: targetUser.id,
    });
  }

  async unfollow(followerId: number, followingId: number): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('팔로우 관계가 존재하지 않습니다.');
    }

    await this.db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      );
  }

  async getFollowing(userId: number): Promise<FollowUserInfo[]> {
    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        userCode: users.userCode,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));

    return result;
  }

  async getFollowers(userId: number): Promise<FollowUserInfo[]> {
    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        userCode: users.userCode,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));

    return result;
  }

  async getFollowingCount(userId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followerId, userId));

    return result?.count ?? 0;
  }

  async getFollowersCount(userId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));

    return result?.count ?? 0;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [result] = await this.db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      )
      .limit(1);

    return !!result;
  }
}
