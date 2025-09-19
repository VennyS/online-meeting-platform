import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { IFileService } from './interfaces/file.service.interface';

@Injectable()
export class S3FileService implements IFileService {
  private s3: S3;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.s3 = new S3({
      endpoint: this.configService.get<string>('MINIO_ENDPOINT'),
      accessKeyId: this.configService.get<string>('MINIO_ROOT_USER'),
      secretAccessKey: this.configService.get<string>('MINIO_ROOT_PASSWORD'),
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
    this.bucket = this.configService.get<string>('MINIO_BUCKET')!;
    this.createBucketIfNotExists();
  }

  private async createBucketIfNotExists() {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
    } catch (error) {
      if (error.statusCode === 404) {
        await this.s3.createBucket({ Bucket: this.bucket }).promise();
      } else {
        throw error;
      }
    }
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await this.s3.putObject(params).promise();
    return `${this.configService.get<string>('MINIO_ENDPOINT')}/${this.bucket}/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    const params = { Bucket: this.bucket, Key: key };
    const data = await this.s3.getObject(params).promise();
    if (!data.Body) throw new NotFoundException('File not found');
    return data.Body as Buffer;
  }

  async delete(key: string): Promise<void> {
    const params = { Bucket: this.bucket, Key: key };
    await this.s3.deleteObject(params).promise();
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      return await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn,
      });
    } catch (error) {
      throw new NotFoundException('Failed to generate presigned URL');
    }
  }
}
