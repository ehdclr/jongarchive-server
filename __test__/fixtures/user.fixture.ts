import { faker } from '@faker-js/faker';
import { NewUser, User } from '@/database/schema';
import { CreateUserWithFileDto } from '@/users/users.service';

/**
 * CreateUserWithFileDto용 Fixture (테스트에서 사용)
 */
export const createUserFixture = (
  overrides?: Partial<CreateUserWithFileDto>,
): CreateUserWithFileDto => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  provider: 'local',
  socialId: faker.string.uuid(),
  phoneNumber: faker.phone.number(),
  bio: faker.lorem.sentence(),
  password: faker.internet.password(),
  ...overrides,
});

/**
 * 새 사용자 생성 데이터 Factory (DB insert용)
 */
export const createNewUserFixture = (overrides?: Partial<NewUser>): NewUser => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  userCode: faker.string.alphanumeric(8).toUpperCase(),
  provider: 'local',
  socialId: faker.string.uuid(),
  phoneNumber: faker.phone.number(),
  bio: faker.lorem.sentence(),
  profileImageUrl: faker.image.url(),
  password: faker.internet.password(),
  ...overrides,
});

/**
 * 완전한 사용자 객체 Factory (DB에서 조회된 것처럼)
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.number.int({ min: 1, max: 1000000 }), // 안전한 범위의 ID
  email: faker.internet.email(),
  name: faker.person.fullName(),
  userCode: faker.string.alphanumeric(8).toUpperCase(),
  provider: 'local',
  role: 'user',
  socialId: faker.string.uuid(), // 소셜 로그인 시 사용
  phoneNumber: faker.phone.number(),
  bio: faker.lorem.sentence(),
  profileImageUrl: faker.image.url(),
  password: faker.internet.password(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * 여러 사용자 생성 (DB insert용)
 */
export const createUserFixtures = (count: number): NewUser[] => {
  return Array.from({ length: count }, () => createNewUserFixture());
};

/**
 * 특정 케이스용 Fixture
 */
export const createLocalUserFixture = (): CreateUserWithFileDto =>
  createUserFixture({ provider: 'local' });

export const createGoogleUserFixture = (): CreateUserWithFileDto =>
  createUserFixture({
    provider: 'google',
    password: '', // OAuth 사용자는 비밀번호 불필요
  });