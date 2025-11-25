import { faker } from '@faker-js/faker';
import { Category, NewCategory } from '@/database/schema';

/**
 * 새 카테고리 생성 데이터 Factory
 */
export const createCategoryFixture = (
  overrides?: Partial<NewCategory>,
): NewCategory => {
  const name = overrides?.name ?? faker.word.noun();
  return {
    name,
    slug: overrides?.slug ?? name.toLowerCase().replace(/\s+/g, '-'),
    description: faker.lorem.sentence(),
    color: faker.color.rgb({ format: 'hex' }),
    ...overrides,
  };
};

/**
 * 완전한 카테고리 객체 Factory (DB에서 조회된 것처럼)
 */
export const createMockCategory = (overrides?: Partial<Category>): Category => {
  const name = overrides?.name ?? faker.word.noun();
  return {
    id: faker.number.int({ min: 1, max: 1000000 }),
    name,
    slug: overrides?.slug ?? name.toLowerCase().replace(/\s+/g, '-'),
    description: faker.lorem.sentence(),
    color: faker.color.rgb({ format: 'hex' }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

/**
 * 여러 카테고리 생성
 */
export const createCategoryFixtures = (count: number): NewCategory[] => {
  return Array.from({ length: count }, () => createCategoryFixture());
};

/**
 * 기본 카테고리 목록 (시드 데이터용)
 */
export const defaultCategories: NewCategory[] = [
  { name: '기술', slug: 'tech', description: '기술 관련 글', color: '#3b82f6' },
  { name: '일상', slug: 'life', description: '일상 기록', color: '#22c55e' },
  { name: '업무', slug: 'work', description: '업무 관련 메모', color: '#f59e0b' },
  { name: '학습', slug: 'study', description: '공부 내용 정리', color: '#8b5cf6' },
  { name: '아이디어', slug: 'idea', description: '아이디어 메모', color: '#ec4899' },
];
