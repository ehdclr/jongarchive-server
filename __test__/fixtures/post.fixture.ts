import { faker } from '@faker-js/faker';
import { Post, NewPost } from '@/database/schema';

export interface AuthorInfo {
  id: number;
  name: string;
  profileImageUrl: string | null;
}

export interface PostWithAuthor {
  post: Post;
  author: AuthorInfo;
}

/**
 * 새 게시물 생성 데이터 Factory
 */
export const createPostFixture = (overrides?: Partial<NewPost>): NewPost => ({
  title: faker.lorem.sentence(),
  content: faker.lorem.paragraphs(3),
  thumbnailUrl: faker.image.url(),
  authorId: faker.number.int({ min: 1, max: 1000 }),
  isPublished: false,
  ...overrides,
});

/**
 * 완전한 게시물 객체 Factory (DB에서 조회된 것처럼)
 */
export const createMockPost = (overrides?: Partial<Post>): Post => ({
  id: faker.number.int({ min: 1, max: 1000000 }),
  title: faker.lorem.sentence(),
  content: faker.lorem.paragraphs(3),
  thumbnailUrl: faker.image.url(),
  authorId: faker.number.int({ min: 1, max: 1000 }),
  isPublished: false,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

/**
 * 작성자 정보 Factory
 */
export const createMockAuthor = (overrides?: Partial<AuthorInfo>): AuthorInfo => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: faker.person.fullName(),
  profileImageUrl: faker.image.avatar(),
  ...overrides,
});

/**
 * 게시물 + 작성자 Factory
 */
export const createMockPostWithAuthor = (overrides?: {
  post?: Partial<Post>;
  author?: Partial<AuthorInfo>;
}): PostWithAuthor => {
  const authorId = overrides?.author?.id ?? faker.number.int({ min: 1, max: 1000 });
  return {
    post: createMockPost({ ...overrides?.post, authorId }),
    author: createMockAuthor({ ...overrides?.author, id: authorId }),
  };
};

/**
 * 여러 게시물 생성
 */
export const createPostFixtures = (count: number): NewPost[] => {
  return Array.from({ length: count }, () => createPostFixture());
};

/**
 * 여러 게시물 + 작성자 생성
 */
export const createMockPostsWithAuthor = (
  count: number,
  authorOverride?: Partial<AuthorInfo>,
): PostWithAuthor[] => {
  const author = createMockAuthor(authorOverride);
  return Array.from({ length: count }, () =>
    createMockPostWithAuthor({ author, post: { authorId: author.id } }),
  );
};

/**
 * Mock 파일 생성 (썸네일 테스트용)
 */
export const createMockFile = (
  overrides?: Partial<Express.Multer.File>,
): Express.Multer.File => ({
  fieldname: 'thumbnail',
  originalname: 'test-thumbnail.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024000,
  buffer: Buffer.from('fake-image-data'),
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
  ...overrides,
});
