/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from '@/posts/posts.service';
import { AwsService } from '@/aws/aws.service';
import { NotFoundException } from '@nestjs/common';
import {
  createMockPost,
  createMockPostWithAuthor,
  createMockFile,
} from '@test/fixtures/post.fixture';

describe('PostsService', () => {
  let service: PostsService;
  let awsService: AwsService;
  let mockDb: any;

  const mockPost = createMockPost({
    id: 1,
    title: 'Test Post',
    content: '# Hello World\nThis is markdown content',
    thumbnailUrl: '',
    authorId: 1,
    isPublished: false,
  });

  const mockPostWithAuthor = createMockPostWithAuthor({
    post: mockPost,
    author: {
      id: 1,
      name: 'Test User',
      profileImageUrl: 'https://example.com/image.jpg',
    },
  });

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
        {
          provide: AwsService,
          useValue: {
            uploadFile: jest
              .fn()
              .mockResolvedValue('https://cdn.example.com/posts/thumbnails/test.jpg'),
            deleteFile: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    awsService = module.get<AwsService>(AwsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('썸네일 없이 게시물 생성', async () => {
      const createPostDto = {
        title: 'Test Post',
        content: '# Hello World\nThis is markdown content',
      };
      const authorId = 1;

      const result = await service.create(createPostDto, authorId);

      expect(result).toEqual(mockPost);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(awsService.uploadFile).not.toHaveBeenCalled();
    });

    it('썸네일과 함께 게시물 생성', async () => {
      const mockFile = createMockFile();
      const createPostDto = {
        title: 'Test Post',
        content: '# Hello World',
        thumbnail: mockFile,
      };
      const authorId = 1;

      const postWithThumbnail = createMockPost({
        ...mockPost,
        thumbnailUrl: 'https://cdn.example.com/posts/thumbnails/test.jpg',
      });
      mockDb.returning = jest.fn().mockResolvedValue([postWithThumbnail]);

      const result = await service.create(createPostDto, authorId);

      expect(result.thumbnailUrl).toBe('https://cdn.example.com/posts/thumbnails/test.jpg');
      expect(awsService.uploadFile).toHaveBeenCalledWith(mockFile, 'posts/thumbnails');
    });
  });

  describe('findAllWithAuthor', () => {
    const currentUserId = 1;

    it('게시물 목록과 작성자 정보, 페이지네이션 반환', async () => {
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue([mockPostWithAuthor]);

      const result = await service.findAllWithAuthor({ page: 1, limit: 10 }, currentUserId);

      expect(result.data).toEqual([mockPostWithAuthor]);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('기본 페이지네이션 값 사용', async () => {
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue([mockPostWithAuthor]);

      const result = await service.findAllWithAuthor({}, currentUserId);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('페이지 2에서 올바른 offset 계산', async () => {
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue([]);

      await service.findAllWithAuthor({ page: 2, limit: 10 }, currentUserId);

      expect(mockDb.offset).toHaveBeenCalledWith(10);
    });

    it('hasMore가 true일 때 (다음 페이지 존재)', async () => {
      const posts = Array.from({ length: 11 }, () => mockPostWithAuthor);
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue(posts);

      const result = await service.findAllWithAuthor({ page: 1, limit: 10 }, currentUserId);

      expect(result.data.length).toBe(10);
      expect(result.meta.hasMore).toBe(true);
    });

    it('hasMore가 false일 때 (마지막 페이지)', async () => {
      const posts = Array.from({ length: 5 }, () => mockPostWithAuthor);
      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue(posts);

      const result = await service.findAllWithAuthor({ page: 1, limit: 10 }, currentUserId);

      expect(result.data.length).toBe(5);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('findByIdWithAuthor', () => {
    it('게시물과 작성자 정보 반환', async () => {
      // 공개 게시물로 테스트
      const publicPostWithAuthor = createMockPostWithAuthor({
        post: { ...mockPost, isPublished: true },
        author: { id: 1, name: 'Test User', profileImageUrl: 'https://example.com/image.jpg' },
      });
      mockDb.limit = jest.fn().mockResolvedValue([publicPostWithAuthor]);

      const result = await service.findByIdWithAuthor(1, 999); // 다른 사용자가 조회해도 됨

      expect(result).toEqual(publicPostWithAuthor);
    });

    it('게시물이 없으면 NotFoundException 발생', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      await expect(service.findByIdWithAuthor(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAuthorIdWithPagination', () => {
    it('작성자별 게시물 목록과 페이지네이션 반환', async () => {
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
    it('ID로 게시물 조회', async () => {
      const result = await service.findById(1);

      expect(result).toEqual(mockPost);
    });

    it('게시물이 없으면 null 반환', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('ID로 게시물 조회', async () => {
      const result = await service.findByIdOrFail(1);

      expect(result).toEqual(mockPost);
    });

    it('게시물이 없으면 NotFoundException 발생', async () => {
      mockDb.limit = jest.fn().mockResolvedValue([]);

      await expect(service.findByIdOrFail(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAuthorId', () => {
    it('작성자 ID로 게시물 목록 조회', async () => {
      mockDb.where = jest.fn().mockResolvedValue([mockPost]);

      const result = await service.findByAuthorId(1);

      expect(result).toEqual([mockPost]);
    });
  });

  describe('update', () => {
    it('게시물 수정', async () => {
      const updatedPost = createMockPost({ ...mockPost, title: 'Updated Title' });
      mockDb.returning = jest.fn().mockResolvedValue([updatedPost]);

      const result = await service.update(1, { title: 'Updated Title' }, 1);

      expect(result.title).toBe('Updated Title');
    });

    it('썸네일과 함께 게시물 수정', async () => {
      const mockFile = createMockFile();
      const updatedPost = createMockPost({
        ...mockPost,
        thumbnailUrl: 'https://cdn.example.com/posts/thumbnails/test.jpg',
      });
      mockDb.returning = jest.fn().mockResolvedValue([updatedPost]);

      const result = await service.update(
        1,
        { title: 'Updated Title', thumbnail: mockFile },
        1,
      );

      expect(awsService.uploadFile).toHaveBeenCalledWith(mockFile, 'posts/thumbnails');
      expect(result.thumbnailUrl).toBe('https://cdn.example.com/posts/thumbnails/test.jpg');
    });

    it('게시물이 없으면 NotFoundException 발생', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([]);

      await expect(
        service.update(999, { title: 'Updated Title' }, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('게시물 삭제', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([mockPost]);

      const result = await service.delete(1, 1);

      expect(result).toEqual(mockPost);
    });

    it('게시물이 없으면 NotFoundException 발생', async () => {
      mockDb.returning = jest.fn().mockResolvedValue([]);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('게시물 공개', async () => {
      const publishedPost = createMockPost({ ...mockPost, isPublished: true });
      mockDb.returning = jest.fn().mockResolvedValue([publishedPost]);

      const result = await service.publish(1, 1);

      expect(result.isPublished).toBe(true);
    });
  });

  describe('unpublish', () => {
    it('게시물 비공개', async () => {
      const unpublishedPost = createMockPost({ ...mockPost, isPublished: false });
      mockDb.returning = jest.fn().mockResolvedValue([unpublishedPost]);

      const result = await service.unpublish(1, 1);

      expect(result.isPublished).toBe(false);
    });
  });

  describe('findAllWithAuthor (공개/비공개 필터링)', () => {
    it('공개된 게시물과 본인의 비공개 게시물만 반환', async () => {
      const currentUserId = 1;
      const otherUserId = 2;

      // 공개 게시물 (다른 사용자)
      const publicPost = createMockPostWithAuthor({
        post: { id: 1, isPublished: true, authorId: otherUserId },
        author: { id: otherUserId },
      });

      // 비공개 게시물 (본인)
      const myPrivatePost = createMockPostWithAuthor({
        post: { id: 2, isPublished: false, authorId: currentUserId },
        author: { id: currentUserId },
      });

      mockDb.offset = jest.fn().mockReturnThis();
      // DB에서 필터링된 결과 반환
      mockDb.limit = jest.fn().mockResolvedValue([publicPost, myPrivatePost]);

      const result = await service.findAllWithAuthor({ page: 1, limit: 10 }, currentUserId);

      expect(result.data).toHaveLength(2);
      expect(result.data).toContainEqual(publicPost);
      expect(result.data).toContainEqual(myPrivatePost);
    });
  });

  describe('findByIdWithAuthor (비공개 접근 제한)', () => {
    it('공개 게시물은 누구나 조회 가능', async () => {
      const publicPost = createMockPostWithAuthor({
        post: { id: 1, isPublished: true, authorId: 2 },
        author: { id: 2 },
      });
      mockDb.limit = jest.fn().mockResolvedValue([publicPost]);

      const result = await service.findByIdWithAuthor(1, 999); // 다른 사용자가 조회

      expect(result).toEqual(publicPost);
    });

    it('비공개 게시물은 작성자만 조회 가능', async () => {
      const privatePost = createMockPostWithAuthor({
        post: { id: 1, isPublished: false, authorId: 1 },
        author: { id: 1 },
      });
      mockDb.limit = jest.fn().mockResolvedValue([privatePost]);

      const result = await service.findByIdWithAuthor(1, 1); // 본인이 조회

      expect(result).toEqual(privatePost);
    });

    it('비공개 게시물을 다른 사용자가 조회하면 NotFoundException', async () => {
      const privatePost = createMockPostWithAuthor({
        post: { id: 1, isPublished: false, authorId: 1 },
        author: { id: 1 },
      });
      mockDb.limit = jest.fn().mockResolvedValue([privatePost]);

      await expect(service.findByIdWithAuthor(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMyPrivatePosts (내 비공개 글만 조회)', () => {
    it('현재 사용자의 비공개 게시물만 반환', async () => {
      const currentUserId = 1;

      const myPrivatePost1 = createMockPostWithAuthor({
        post: { id: 1, isPublished: false, authorId: currentUserId },
        author: { id: currentUserId },
      });
      const myPrivatePost2 = createMockPostWithAuthor({
        post: { id: 2, isPublished: false, authorId: currentUserId },
        author: { id: currentUserId },
      });

      mockDb.offset = jest.fn().mockReturnThis();
      mockDb.limit = jest.fn().mockResolvedValue([myPrivatePost1, myPrivatePost2]);

      const result = await service.findMyPrivatePosts(currentUserId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      result.data.forEach((item) => {
        expect(item.post.isPublished).toBe(false);
        expect(item.post.authorId).toBe(currentUserId);
      });
    });
  });
});
