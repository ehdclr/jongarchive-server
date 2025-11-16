import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

import { Logger } from '@nestjs/common';

@Injectable()
export class AwsService {
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly bucketUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    const accessKeyId =
      this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestHandler: {
        requestTimeout: 30000,
        connectionTimeout: 30000,
      },
    });

    this.bucketName =
      this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME');
    this.bucketUrl = this.configService.getOrThrow<string>('AWS_S3_BUCKET_URL');
  }

  async uploadFile(
    file: Express.Multer.File,
    directory: string,
  ): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${directory}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
    });

    try {
      await this.s3.send(command);
      return `${this.bucketUrl}/${fileName}`;
    } catch (error) {
      this.logger.error('Failed to upload file:', error);
      throw error;
    }
  }

  async deleteFile(url: string) : Promise<void> {
    const key = url.replace(this.bucketUrl + '/', '');

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    try {
      await this.s3.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error('Failed to delete file:', error);
      throw error;
    }
  }


  //TODO: getSignedUrl 추가 서명 만료 시간 추가 필요
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3, command, { expiresIn });
    } catch (error) {
      this.logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }
}
