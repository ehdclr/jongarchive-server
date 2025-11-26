import { User } from '@/database/schema';

export type UserResponse = Omit<User, 'password'>;

export function toUserResponse(user: User): UserResponse {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// 타인 프로필 조회 시 공개 정보만 반환
export interface PublicUserResponse {
  id: number;
  userCode: string;
  name: string;
  profileImageUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: Date | null;
}

export function toPublicUserResponse(user: User): PublicUserResponse {
  return {
    id: user.id,
    userCode: user.userCode,
    name: user.name,
    profileImageUrl: user.profileImageUrl,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// 타인 프로필 조회 시 통계 포함
export interface PublicUserWithStatsResponse extends PublicUserResponse {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export function toPublicUserWithStatsResponse(
  user: User,
  stats: { followersCount: number; followingCount: number; postsCount: number },
): PublicUserWithStatsResponse {
  return {
    ...toPublicUserResponse(user),
    followersCount: stats.followersCount,
    followingCount: stats.followingCount,
    postsCount: stats.postsCount,
  };
}
