import { User } from '@/database/schema';

export type UserResponse = Omit<User, 'password'>;

export function toUserResponse(user: User): UserResponse {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
