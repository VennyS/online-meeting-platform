import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileManagementService } from './file-management.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { User } from 'src/common/decorators/user.decorator';
import { RoomByShortIdPipe } from 'src/common/pipes/room.pipe';
import type { Room } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ApiBody, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ListFilesQueryDto } from './dto/listFilesQueryDto';

@Controller('file')
export class FileController {
  constructor(private fileService: FileManagementService) {}

  @Get(':shortId')
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    example: 0,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of records to take',
  })
  @UseGuards(AuthGuard({ required: true }))
  async listFiles(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @User('id') userId: number,
    @Query() query: ListFilesQueryDto,
  ) {
    try {
      const files = await this.fileService.listFiles(
        room.id,
        userId,
        query.skip,
        query.take,
        query.type,
      );
      return files;
    } catch (error) {
      if (error.message.includes('Access denied')) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'shortId',
    description: 'Short ID of the room to upload the file to',
    type: String,
    example: 'abc123',
  })
  @ApiBody({
    description: 'File to upload (video, audio, text, or PDF)',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post(':shortId/batch')
  @UseInterceptors(FilesInterceptor('files', 10))
  @UseGuards(AuthGuard({ required: true }))
  async loadFiles(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @User('id') userId: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    try {
      const urls = await this.fileService.uploadFiles(room.id, userId, files);
      return { message: 'Files uploaded successfully', urls };
    } catch (error) {
      if (
        error.message.includes('Only PDF files are allowed') ||
        error.message.includes('User ID is required')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
