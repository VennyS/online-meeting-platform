import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { S3FileService } from './file-s3.service';
import { FileManagementService } from './file-management.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileController } from './file.controller';
import { AppJwtModule } from 'src/common/modules/jwt/jwt.module';
import { RoomRepository } from 'src/repositories/room.repository';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    }),
    AppJwtModule,
  ],
  controllers: [FileController],
  providers: [
    PrismaService,
    FileManagementService,
    {
      provide: 'IFileService',
      useClass: S3FileService,
    },
    RoomRepository,
  ],
  exports: ['IFileService', FileManagementService],
})
export class FileModule {}
