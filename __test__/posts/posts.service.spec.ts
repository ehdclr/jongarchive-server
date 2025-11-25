import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from '@/posts/posts.service';
import { NotFoundException } from '@nestjs/common';

describe('PostsService', () => {
  let service: PostsService;
  let mockDb: any;

  const mockUser = {
    id: 1,
    email: 'test@test.com',
    name: 'Test User',
  };

  const mockPost = {
    id: 1,
    title: 'Test Post',
    content: '# Hello World\nThis is markdown content',
    authorId: 1,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockPost]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([mockPost]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: 'DATABASE',
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new post', async () => {
      const createPostDto = {
        title: 'Test Post',
        content: '# Hello World\nThis is markdown content',
      };
      const authorId = 1;

      const result = await service.create(createPostDto, authorId);

      expect(result).toEqual(mockPost);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('findAllWithAuthor', () => {
    const mockPostWithAuthor = {
      post: mockPost,
      author: {
        id: 1,
        name: 'Test User',
        profileImageUrl: 'https://example.com/image.jpg',
      },
    };

    it('should return posts with author info and pagination', async () => {
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue([mockPostWithAuthor]);

      const result = await service.findAllWithAuthor({ page: 1, limit: 10 });

      expect(result.data).toEqual([mockPostWithAuthor]);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue([mockPostWithAuthor]);

      const result = await service.findAllWithAuthor({});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should calculate correct offset for page 2', async () => {
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue([]);

      await service.findAllWithAuthor({ page: 2, limit: 10 });

      expect(mockDb.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('findByIdWithAuthor', () => {
    const mockPostWithAuthor = {
      post: mockPost,
      author: {
        id: 1,
        name: 'Test User',
        profileImageUrl: 'https://example.com/image.jpg',
      },
    };

    it('should return a post with author info', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([mockPostWithAuthor]);

      const result = await service.findByIdWithAuthor(1);

      expect(result).toEqual(mockPostWithAuthor);
    });

    it('should throw NotFoundException if post not found', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      await expect(service.findByIdWithAuthor(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAuthorIdWithPagination', () => {
    const mockPostWithAuthor = {
      post: mockPost,
      author: {
        id: 1,
        name: 'Test User',
        profileImageUrl: 'https://example.com/image.jpg',
      },
    };

    it('should return posts by author with pagination', async () => {
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue([mockPostWithAuthor]);

      const result = await service.findByAuthorIdWithPagination(1, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([mockPostWithAuthor]);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return a post by id', async () => {
      const result = await service.findById(1);

      expect(result).toEqual(mockPost);
    });

    it('should return null if post not found', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('should return a post by id', async () => {
      const result = await service.findByIdOrFail(1);

      expect(result).toEqual(mockPost);
    });

    it('should throw NotFoundException if post not found', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      await expect(service.findByIdOrFail(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAuthorId', () => {
    it('should return posts by author id', async () => {
      mockDb.where = jest.fn().mockResolvedValue([mockPost]);

      const result = await service.findByAuthorId(1);

      expect(result).toEqual([mockPost]);
    });
  });

  describe('update', () => {
    it('should update a post', async () => {
      const updatedPost = { ...mockPost, title: 'Updated Title' };
      mockDb.returning = jest.fn().mockResolvedValue([updatedPost]);

      const result = await service.update(1, { title: 'Updated Title' }, 1);

      expect(result).toEqual(updatedPost);
    });

    it('should throw NotFoundException if post not found', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([]);

      await expect(
        service.update(999, { title: 'Updated Title' }, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a post', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([mockPost]);

      const result = await service.delete(1, 1);

      expect(result).toEqual(mockPost);
    });

    it('should throw NotFoundException if post not found', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([]);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should publish a post', async () => {
      const publishedPost = { ...mockPost, isPublished: true };
      mockDb.returning = jest.fn().mockResolvedValue([publishedPost]);

      const result = await service.publish(1, 1);

      expect(result.isPublished).toBe(true);
    });
  });

  describe('unpublish', () => {
    it('should unpublish a post', async () => {
      const unpublishedPost = { ...mockPost, isPublished: false };
      mockDb.returning = jest.fn().mockResolvedValue([unpublishedPost]);

      const result = await service.unpublish(1, 1);

      expect(result.isPublished).toBe(false);
    });
  });
});
