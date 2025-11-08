import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  private readonly logger = new Logger(S3FileService.name);

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
      this.logger.log(`Bucket ${this.bucket} already exists`);
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Bucket ${this.bucket} not found, creating new bucket`);
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket ${this.bucket} created successfully`);
      } else {
        this.logger.error(
          `Error checking bucket existence: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    this.logger.log(
      `Attempting to upload file: ${file.originalname}, size: ${file.size}, key: ${key}`,
    );

    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    this.logger.debug('Upload params:', {
      Bucket: params.Bucket,
      Key: params.Key,
      ContentType: params.ContentType,
      size: file.size,
    });

    try {
      await this.s3.send(new PutObjectCommand(params));
      this.logger.log(`File uploaded successfully: ${key}`);

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3, getObjectCommand, {
        expiresIn: 3600,
      });
      this.logger.debug(`Generated presigned URL: ${url}`);

      return url;
    } catch (error) {
      this.logger.error(
        `Upload error for key ${key}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async download(key: string): Promise<Buffer> {
    this.logger.log(`Attempting to download file: ${key}`);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const data = await this.s3.send(command);

      if (!data.Body) {
        this.logger.warn(`File not found for key: ${key}`);
        throw new NotFoundException('File not found');
      }

      this.logger.log(`File downloaded successfully: ${key}`);
      return Buffer.from(await data.Body.transformToByteArray());
    } catch (error) {
      this.logger.error(
        `Download error for key ${key}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    this.logger.log(`Attempting to delete file: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(
        `Delete error for key ${key}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    this.logger.log(
      `Generating presigned URL for key: ${key}, expiresIn: ${expiresIn}`,
    );

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3, command, { expiresIn });
      const publicBase = this.configService.get<string>('MINIO_PUBLIC_URL');
      const finalUrl = url.replace(
        this.configService.get<string>('MINIO_ENDPOINT')!,
        publicBase!,
      );

      this.logger.debug(`Generated presigned URL: ${finalUrl}`);
      return finalUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for key ${key}: ${error.message}`,
        error.stack,
      );
      throw new NotFoundException('Failed to generate presigned URL');
    }
  }
}
