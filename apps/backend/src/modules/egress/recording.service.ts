import { Injectable, Logger } from '@nestjs/common';
import {
  RoomCompositeOptions,
  EgressClient,
  S3Upload,
  EncodedFileOutput,
  EncodedFileType,
} from 'livekit-server-sdk';
import { FileType } from '@prisma/client';
import { FileManagementService } from 'src/modules/file/file-management.service';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { RoomRepository } from 'src/repositories/room.repository';
import { format } from 'date-fns';
import { createEgressLivekitToken } from 'src/common/utils/auth.utils';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private egressClient: EgressClient;

  constructor(
    private readonly fileManagementService: FileManagementService,
    private readonly redis: RedisService,
    private readonly roomRepo: RoomRepository,
  ) {
    const API_KEY = process.env.LIVEKIT_API_KEY!;
    const API_SECRET = process.env.LIVEKIT_API_SECRET!;
    const LIVEKIT_URL = process.env.LIVEKIT_URL!;
    this.egressClient = new EgressClient(LIVEKIT_URL, API_KEY, API_SECRET);
  }

  async startRecording(roomName: string, userId: string) {
    const s3Config = new S3Upload({
      accessKey: process.env.MINIO_ROOT_USER!,
      secret: process.env.MINIO_ROOT_PASSWORD!,
      bucket: process.env.MINIO_BUCKET!,
      endpoint: 'http://minio:9000',
      forcePathStyle: true,
    });

    const room = await this.roomRepo.findByShortId(roomName);
    if (!room) return;

    const fileKey = `rooms/${room.id}/user/${userId}/${Date.now()}.mp4`;

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: fileKey,
      output: {
        case: 's3',
        value: s3Config,
      },
      disableManifest: true,
    });

    const token = await createEgressLivekitToken(room.shortId);

    this.logger.log(
      `Room name: ${roomName}, S3 Filepath: ${fileOutput.filepath}`,
    );

    const customBaseUrl = `${process.env.RECORDING_ROUTE}/${room.shortId}/recording?livekitToken=${token}`;

    try {
      const result = await this.egressClient.startRoomCompositeEgress(
        roomName,
        fileOutput,
        {
          customBaseUrl: customBaseUrl,
        } as RoomCompositeOptions,
      );

      await this.redis.setEgressUser(result.egressId, Number(userId));

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
    fileName: string;
    size?: number;
    mimeType?: string;
    egressId: string;
    startTime: bigint;
    endTime: bigint;
  }) {
    const { roomShortId, fileName, size, mimeType } = event;

    const userId = await this.redis.getEgressUser(event.egressId);

    const room = await this.roomRepo.findByShortId(roomShortId);
    if (!room) return;

    const fileKey = `rooms/${room.id}/user/${userId}/${Date.now()}.mp4`;

    await this.fileManagementService.createFileRecord({
      roomId: room.id,
      userId: userId ?? 0,
      fileKey: fileKey,
      fileType: FileType.VIDEO,
      fileName: fileName,
      fileSize: size,
      mimeType,
    });

    const startDate = new Date(Number(event.startTime / 1_000_000n));
    const endDate = new Date(Number(event.endTime / 1_000_000n));
    // вытаскиваем сообщения за время записи
    const messages = await this.redis.getRoomMessages(roomShortId);
    const filteredMessages = messages.filter((msg) => {
      const msgDate = new Date(msg.createdAt);
      return msgDate >= startDate && msgDate <= endDate;
    });

    const txtContent = filteredMessages
      .map((msg) => {
        const time = format(new Date(msg.createdAt), 'HH:mm:ss');
        return `[${time}] ${msg.user.firstName}: ${msg.text}`;
      })
      .join('\n');

    const txtFileName = fileName.replace('.mp4', '.txt');

    const txtFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: txtFileName,
      encoding: '7bit',
      mimetype: 'text/plain',
      buffer: Buffer.from(txtContent, 'utf-8'),
      size: Buffer.byteLength(txtContent, 'utf-8'),
      destination: '',
      filename: txtFileName,
      path: '',
      stream: undefined as any,
    };

    await this.fileManagementService.uploadFile(room.id, userId ?? 0, txtFile);

    await this.redis.deleteEgressUser(event.egressId);

    this.logger.log(`Recording saved to DB: ${fileKey}`);
  }
}
