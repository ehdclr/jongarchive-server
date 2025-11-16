/**
 * AWS S3 Service Test
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '@/aws/aws.service';
import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

const s3Mock = mockClient(S3Client) as jest.Mocked<S3Client>;

describe('AwsService', () => {
  let service: AwsService;
  let configService: ConfigService;

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
    stream: null,
  };

  beforeEach(async () => {
    s3Mock.reset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                AWS_REGION: 'ap-northeast-2',
                AWS_ACCESS_KEY_ID: 'test-access-key-id',
                AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
                AWS_S3_BUCKET_NAME: 'test-bucket-name',
                AWS_S3_BUCKET_URL: 'test-bucket-url',
              };
              return config[key];
            }),
            getOrThrow: jest.fn((key: string) => {
              const config = {
                AWS_REGION: 'ap-northeast-2',
                AWS_ACCESS_KEY_ID: 'test-access-key-id',
                AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
                AWS_S3_BUCKET_NAME: 'test-bucket-name',
                AWS_S3_BUCKET_URL: 'test-bucket-url',
              };
              if (!config[key]) {
                throw new Error(`Unknown key: ${key}`);
              }
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AwsService>(AwsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

})