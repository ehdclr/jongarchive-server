/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * AWS S3 Service Test (단위 테스트)
 * - S3는 외부 의존성이므로 Mock 사용
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AwsService } from '@/aws/aws.service';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

const s3Mock = mockClient(S3Client);

describe('AwsService', () => {
  let service: AwsService;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 100, // 100KB
    buffer: Buffer.from('fake-image-data'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  const mockConfig: Record<string, string> = {
    AWS_REGION: 'ap-northeast-2',
    AWS_ACCESS_KEY_ID: 'test-access-key-id',
    AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
    AWS_S3_BUCKET_NAME: 'test-bucket',
    AWS_S3_BUCKET_URL: 'https://test-bucket.s3.amazonaws.com',
  };

  beforeEach(async () => {
    s3Mock.reset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
            getOrThrow: jest.fn((key: string) => {
              if (!mockConfig[key]) throw new Error(`Unknown key: ${key}`);
              return mockConfig[key];
            }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AwsService>(AwsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('파일 업로드 성공 시 URL 반환', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const result = await service.uploadFile(mockFile, 'users/profile');

      expect(result).toContain('https://test-bucket.s3.amazonaws.com/');
      expect(result).toContain('users/profile/');
      expect(result).toContain('.jpg');
    });

    it('S3 업로드 실패 시 에러 throw', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 Upload Failed'));

      await expect(
        service.uploadFile(mockFile, 'users/profile'),
      ).rejects.toThrow('S3 Upload Failed');
    });
  });

  describe('deleteFile', () => {
    it('파일 삭제 성공', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({});

      await expect(
        service.deleteFile(
          'https://test-bucket.s3.amazonaws.com/users/profile/test.jpg',
        ),
      ).resolves.not.toThrow();
    });

    it('S3 삭제 실패 시 에러 throw', async () => {
      s3Mock.on(DeleteObjectCommand).rejects(new Error('S3 Delete Failed'));

      await expect(
        service.deleteFile(
          'https://test-bucket.s3.amazonaws.com/users/profile/test.jpg',
        ),
      ).rejects.toThrow('S3 Delete Failed');
    });
  });
});