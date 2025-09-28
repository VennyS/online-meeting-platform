import { Injectable, Logger } from '@nestjs/common';
import {
  RoomCompositeOptions,
  EncodedFileOutput,
  EgressClient,
  EncodedFileType,
} from 'livekit-server-sdk';
import { FileType } from '@prisma/client';
import { FileManagementService } from 'src/modules/file/file-management.service';
import { mkdirSync } from 'fs';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private egressClient: EgressClient;

  constructor(private readonly fileManagementService: FileManagementService) {
    const API_KEY = process.env.LIVEKIT_API_KEY!;
    const API_SECRET = process.env.LIVEKIT_API_SECRET!;
    const LIVEKIT_URL = process.env.LIVEKIT_URL!;
    this.egressClient = new EgressClient(LIVEKIT_URL, API_KEY, API_SECRET);
  }

  async startRecording(roomName: string) {
    const dir = `/output/${roomName}`;
    mkdirSync(dir, { recursive: true });

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `${dir}/${Date.now()}.mp4`,
      disableManifest: false,
    });

    this.logger.log(`Room name: ${roomName}, Filepath: ${fileOutput.filepath}`);

    try {
      const result = await this.egressClient.startRoomCompositeEgress(
        roomName,
        fileOutput,
        {
          layout: 'grid',
        } as RoomCompositeOptions,
      );

      this.logger.log(`Egress started, jobId: ${result.egressId}`);
      return result;
    } catch (error) {
      this.logger.error(`Egress error: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async stopRecording(egressId: string) {
    if (!this.egressClient) {
      this.logger.error('EgressClient не инициализирован');
      return;
    }

    try {
      const result = await this.egressClient.stopEgress(egressId);
      this.logger.log(`Egress stopped, jobId: ${result.egressId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to stop egress: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  async handleEgressFinished(event: {
    roomShortId: string;
    filePath: string;
    size?: number;
    mimeType?: string;
    userId: number;
  }) {
    const { roomShortId, filePath, size, mimeType, userId } = event;

    await this.fileManagementService.createFileRecord({
      roomShortId,
      userId,
      fileKey: filePath,
      fileType: FileType.VIDEO,
      fileName: filePath.split('/').pop()!,
      fileSize: size,
      mimeType,
    });

    this.logger.log(`Recording saved to DB: ${filePath}`);
  }
}
