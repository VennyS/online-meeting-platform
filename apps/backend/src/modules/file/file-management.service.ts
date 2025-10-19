import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { FileType } from '@prisma/client';
import type { IFileService } from './interfaces/file.service.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { slugify } from 'transliteration';
import * as path from 'path';
import { PatchFileDto } from './dto/patchFileDto';

@Injectable()
export class FileManagementService {
  constructor(
    private prisma: PrismaService,
    @Inject('IFileService') private fileService: IFileService,
  ) {}

  async createFileRecord(data: {
    roomId: number;
    userId: number;
    fileKey: string;
    fileType: FileType;
    fileName: string;
    fileSize: number;
    mimeType?: string;
  }) {
    await this.prisma.file.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        fileKey: data.fileKey,
        fileType: data.fileType,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });
  }

  async uploadFile(
    roomId: number,
    userId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { allowedParticipants: true },
    });

    if (
      !room ||
      (!room.isPublic &&
        room.ownerId !== userId &&
        !room.allowedParticipants.some((p) => p.userId === userId))
    ) {
      throw new ForbiddenException('Access denied');
    }

    let fileType: FileType;
    switch (file.mimetype) {
      case 'video/mp4':
      case 'video/webm':
        fileType = FileType.VIDEO;
        break;
      case 'audio/mpeg':
      case 'audio/wav':
        fileType = FileType.AUDIO;
        break;
      case 'text/plain':
        fileType = FileType.TEXT;
        break;
      case 'application/pdf':
        fileType = FileType.PDF;
        break;
      default:
        throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    const originalFileName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );

    const ext = path.extname(originalFileName);
    const baseName = path.basename(originalFileName, ext);
    const normalizedForKey = `${slugify(baseName)}${ext}`;

    const key = `rooms/${roomId}/user/${userId}/${Date.now()}_${normalizedForKey}`;
    const url = await this.fileService.upload(file, key);

    await this.prisma.file.create({
      data: {
        roomId,
        userId,
        fileKey: key,
        fileType,
        fileName: originalFileName,
        fileSize: Math.round(file.size / 1024),
        mimeType: file.mimetype,
      },
    });

    return url;
  }

  async uploadFiles(
    roomId: number,
    userId: number,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await this.uploadFile(roomId, userId, file);
      urls.push(url);
    }
    return urls;
  }

  async getFile(
    roomId: number,
    fileId: number,
    userId: number,
  ): Promise<string> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { room: { include: { allowedParticipants: true } } },
    });
    if (!file || file.roomId !== roomId) {
      throw new NotFoundException('File not found');
    }
    if (
      !file.room.isPublic &&
      file.room.ownerId !== userId &&
      !file.room.allowedParticipants.some((p) => p.userId === userId)
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.fileService.getPresignedUrl(file.fileKey);
  }

  async deleteFile(
    fileId: number,
    userId: number,
    roleId: number,
  ): Promise<void> {
    const isAdmin = roleId === 4;

    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        OR: [
          { userId },
          { room: { ownerId: userId } },
          ...(isAdmin ? [{}] : []),
        ],
      },
      include: { room: true },
    });

    if (!file) {
      throw new ForbiddenException('Access denied or file not found');
    }

    await this.fileService.delete(file.fileKey);

    await this.prisma.file.delete({ where: { id: file.id } });
  }

  async updateFile(
    fileId: number,
    userId: number,
    roleId: number,
    dto: PatchFileDto,
  ) {
    const isAdmin = roleId === 4;

    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        OR: [
          { userId },
          { room: { ownerId: userId } },
          ...(isAdmin ? [{}] : []),
        ],
      },
      include: { room: true },
    });

    if (!file) {
      throw new ForbiddenException('Access denied or file not found');
    }

    return this.prisma.file.update({
      where: { id: file.id },
      data: {
        fileName: dto.name,
      },
    });
  }

  async listFiles(
    roomId: number,
    userId: number,
    skip = 0,
    take = 10,
    types: FileType[] = [],
  ) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { allowedParticipants: true },
    });

    if (
      !room ||
      (!room.isPublic &&
        room.ownerId !== userId &&
        !room.allowedParticipants.some((p) => p.userId === userId))
    ) {
      throw new ForbiddenException('Access denied');
    }

    const files = await this.prisma.file.findMany({
      where: {
        roomId,
        ...(types.length > 0 ? { fileType: { in: types } } : {}),
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        fileKey: true,
      },
      skip,
      take,
    });

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await this.fileService.getPresignedUrl(file.fileKey);
        return {
          id: file.id,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          url,
        };
      }),
    );

    return filesWithUrls;
  }

  async getTotalFileSizeByUser(
    userId: number,
    fileTypes?: FileType[],
  ): Promise<number> {
    const where = {
      userId,
      ...(fileTypes && fileTypes.length > 0
        ? { fileType: { in: fileTypes } }
        : {}),
    };

    const result = await this.prisma.file.aggregate({
      where,
      _sum: { fileSize: true },
    });

    return result._sum.fileSize ?? 0;
  }
}
