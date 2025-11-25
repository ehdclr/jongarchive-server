/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from '@/categories/categories.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockCategory } from '@test/fixtures/category.fixture';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockDb: any;

  const mockCategory = createMockCategory({
    id: 1,
    name: '기술',
    slug: 'tech',
    description: '기술 관련 글',
    color: '#3b82f6',
  });

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockCategory]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([mockCategory]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([mockCategory]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: 'DATABASE',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('새 카테고리 생성', async () => {
      const createCategoryDto = {
        name: '기술',
        slug: 'tech',
        description: '기술 관련 글',
        color: '#3b82f6',
      };

      mockDb.limit = jest.fn().mockResolvedValue([]); // 중복 없음

      const result = await service.create(createCategoryDto);

      expect(result).toEqual(mockCategory);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('중복된 slug로 생성 시 BadRequestException 발생', async () => {
      const createCategoryDto = {
        name: '기술',
        slug: 'tech',
      };

      mockDb.limit = jest.fn().mockResolvedValue([mockCategory]); // 중복 존재

      await expect(service.create(createCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('모든 카테고리 목록 반환', async () => {
      const categories = [mockCategory, createMockCategory({ id: 2, name: '일상', slug: 'life' })];
      mockDb.orderBy = jest.fn().mockResolvedValue(categories);

      const result = await service.findAll();

      expect(result).toEqual(categories);
      expect(result.length).toBe(2);
    });
  });

  describe('findById', () => {
    it('ID로 카테고리 조회', async () => {
      const result = await service.findById(1);

      expect(result).toEqual(mockCategory);
    });

    it('카테고리가 없으면 null 반환', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('ID로 카테고리 조회', async () => {
      const result = await service.findByIdOrFail(1);

      expect(result).toEqual(mockCategory);
    });

    it('카테고리가 없으면 NotFoundException 발생', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      await expect(service.findByIdOrFail(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('slug로 카테고리 조회', async () => {
      const result = await service.findBySlug('tech');

      expect(result).toEqual(mockCategory);
    });

    it('카테고리가 없으면 null 반환', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      const result = await service.findBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('카테고리 수정', async () => {
      const updatedCategory = createMockCategory({
        ...mockCategory,
        name: '개발',
        description: '개발 관련 글',
      });
      mockDb.returning = jest.fn().mockResolvedValue([updatedCategory]);

      const result = await service.update(1, {
        name: '개발',
        description: '개발 관련 글',
      });

      expect(result.name).toBe('개발');
    });

    it('카테고리가 없으면 NotFoundException 발생', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([]);

      await expect(
        service.update(999, { name: '개발' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('카테고리 삭제', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([mockCategory]);

      const result = await service.delete(1);

      expect(result).toEqual(mockCategory);
    });

    it('카테고리가 없으면 NotFoundException 발생', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([]);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
