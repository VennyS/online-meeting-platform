import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { IFileService } from './interfaces/file.service.interface';

@Injectable()
export class S3FileService implements IFileService {
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      endpoint: this.configService.get<string>('MINIO_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ROOT_USER')!,
        secretAccessKey: this.configService.get<string>('MINIO_ROOT_PASSWORD')!,
      },
      forcePathStyle: true,
      region: 'us-east-1',
    });
    this.bucket = this.configService.get<string>('MINIO_BUCKET')!;
    this.createBucketIfNotExists();
  }

  private async createBucketIfNotExists() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } else {
        throw error;
      }
    }
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    console.log(
      `Attempting to upload file: ${file.originalname}, size: ${file.size}, key: ${key}`,
    );
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    console.log('Upload params:', {
      Bucket: params.Bucket,
      Key: params.Key,
      ContentType: params.ContentType,
      size: file.size,
    });
    try {
      await this.s3.send(new PutObjectCommand(params));
      console.log(`File uploaded successfully: ${key}`);

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const url = await getSignedUrl(this.s3, getObjectCommand, {
        expiresIn: 3600,
      });

      console.log(`Generated presigned URL: ${url}`);
      return url;
    } catch (error) {
      console.error(`Upload error for key ${key}:`, error);
      throw error;
    }
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const data = await this.s3.send(command);
    if (!data.Body) throw new NotFoundException('File not found');

    return Buffer.from(await data.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3.send(command);
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const url = await getSignedUrl(this.s3, command, { expiresIn });

      const publicBase = this.configService.get<string>('MINIO_PUBLIC_URL');
      return url.replace(
        this.configService.get<string>('MINIO_ENDPOINT')!,
        publicBase!,
      );
    } catch (error) {
      throw new NotFoundException('Failed to generate presigned URL');
    }
  }
}
