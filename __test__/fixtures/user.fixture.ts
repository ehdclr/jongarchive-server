import { faker } from '@faker-js/faker';
import { NewUser, User } from '@/database/schema';

/**
 * 새 사용자 생성 데이터 Factory
 */
export const createUserFixture = (overrides?: Partial<NewUser>): NewUser => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  provider: 'local',
  socialId: faker.string.uuid(),
  phoneNumber: faker.phone.number(),
  bio: faker.lorem.sentence(),
  profileImageUrl: faker.image.url(),
  password: faker.internet.password(),
  ...overrides, // 덮어쓰기 가능
});

/**
 * 완전한 사용자 객체 Factory (DB에서 조회된 것처럼)
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.number.int({ min: 1, max: 1000000 }), // 안전한 범위의 ID
  email: faker.internet.email(),
  name: faker.person.fullName(),
  provider: 'local',
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
 * 여러 사용자 생성
 */
export const createUserFixtures = (count: number): NewUser[] => {
  return Array.from({ length: count }, () => createUserFixture());
};

/**
 * 특정 케이스용 Fixture
 */
export const createLocalUserFixture = (): NewUser => 
  createUserFixture({ provider: 'local' });

export const createGoogleUserFixture = (): NewUser => 
  createUserFixture({ 
    provider: 'google',
    password: null, // OAuth 사용자는 비밀번호 없음
  });