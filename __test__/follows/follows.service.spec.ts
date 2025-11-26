/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { FollowsService } from '@/follows/follows.service';
import { createMockUser } from '@test/fixtures/user.fixture';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('FollowsService', () => {
  let service: FollowsService;
  let mockDB: any;

  const mockUser1 = createMockUser({ id: 1, userCode: 'USER0001' });
  const mockUser2 = createMockUser({ id: 2, userCode: 'USER0002' });

  beforeEach(async () => {
    mockDB = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        {
          provide: 'DATABASE',
          useValue: mockDB,
        },
      ],
    }).compile();

    service = module.get<FollowsService>(FollowsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('follow', () => {
    it('userCode로 사용자를 팔로우할 수 있어야 함', async () => {
      // 대상 사용자 찾기
      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser2]);
      // 이미 팔로우 중인지 확인 (팔로우 안 함)
      mockDB.limit = jest.fn()
        .mockResolvedValueOnce([mockUser2]) // 사용자 찾기
        .mockResolvedValueOnce([]); // 팔로우 관계 없음

      await expect(
        service.follow(mockUser1.id, mockUser2.userCode),
      ).resolves.not.toThrow();

      expect(mockDB.insert).toHaveBeenCalled();
    });

    it('존재하지 않는 userCode로 팔로우 시 NotFoundException 발생', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      await expect(
        service.follow(mockUser1.id, 'INVALID1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('자기 자신을 팔로우 시 BadRequestException 발생', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([mockUser1]);

      await expect(
        service.follow(mockUser1.id, mockUser1.userCode),
      ).rejects.toThrow(BadRequestException);
    });

    it('이미 팔로우 중인 사용자를 다시 팔로우 시 BadRequestException 발생', async () => {
      const existingFollow = { followerId: mockUser1.id, followingId: mockUser2.id };
      mockDB.limit = jest.fn()
        .mockResolvedValueOnce([mockUser2]) // 사용자 찾기
        .mockResolvedValueOnce([existingFollow]); // 이미 팔로우 중

      await expect(
        service.follow(mockUser1.id, mockUser2.userCode),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unfollow', () => {
    it('팔로우 관계를 삭제할 수 있어야 함', async () => {
      const existingFollow = { followerId: mockUser1.id, followingId: mockUser2.id };
      mockDB.limit = jest.fn().mockResolvedValueOnce([existingFollow]);

      await expect(
        service.unfollow(mockUser1.id, mockUser2.id),
      ).resolves.not.toThrow();

      expect(mockDB.delete).toHaveBeenCalled();
    });

    it('존재하지 않는 팔로우 관계 삭제 시 NotFoundException 발생', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      await expect(
        service.unfollow(mockUser1.id, mockUser2.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFollowing', () => {
    it('팔로잉 목록을 조회할 수 있어야 함', async () => {
      const followingList = [
        { id: mockUser2.id, name: mockUser2.name, userCode: mockUser2.userCode, profileImageUrl: '', bio: '' },
      ];
      mockDB.where = jest.fn().mockResolvedValueOnce(followingList);

      const result = await service.getFollowing(mockUser1.id);

      expect(result).toEqual(followingList);
    });
  });

  describe('getFollowers', () => {
    it('팔로워 목록을 조회할 수 있어야 함', async () => {
      const followersList = [
        { id: mockUser1.id, name: mockUser1.name, userCode: mockUser1.userCode, profileImageUrl: '', bio: '' },
      ];
      mockDB.where = jest.fn().mockResolvedValueOnce(followersList);

      const result = await service.getFollowers(mockUser2.id);

      expect(result).toEqual(followersList);
    });
  });

  describe('isFollowing', () => {
    it('팔로우 중이면 true를 반환해야 함', async () => {
      const existingFollow = { followerId: mockUser1.id, followingId: mockUser2.id };
      mockDB.limit = jest.fn().mockResolvedValueOnce([existingFollow]);

      const result = await service.isFollowing(mockUser1.id, mockUser2.id);

      expect(result).toBe(true);
    });

    it('팔로우 중이 아니면 false를 반환해야 함', async () => {
      mockDB.limit = jest.fn().mockResolvedValueOnce([]);

      const result = await service.isFollowing(mockUser1.id, mockUser2.id);

      expect(result).toBe(false);
    });
  });
});
