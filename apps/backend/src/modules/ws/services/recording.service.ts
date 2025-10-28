import { Injectable, Logger } from '@nestjs/common';
import { EgressInfo } from 'livekit-server-sdk';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { RecordingService as recording } from 'src/modules/egress/recording.service';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  constructor(
    private readonly redis: RedisService,
    private readonly recording: recording,
  ) {}

  async startRecording(roomShortId: string, userId: number): Promise<string> {
    let egressInfo: EgressInfo | undefined;

    try {
      egressInfo = await this.recording.startRecording(
        roomShortId,
        String(userId),
      );
    } catch (e) {
      throw e;
    }

    if (!egressInfo?.egressId) {
      this.logger.error('No egress id', egressInfo);
      throw new Error('no egress id');
    }

    return egressInfo.egressId;
  }

  async stopRecording(egressId: string): Promise<void>;
  async stopRecording(userId: number): Promise<void>;

  async stopRecording(id: string | number): Promise<void> {
    if (typeof id === 'string') {
      // egressId
      await this.recording.stopRecording(id);
    } else {
      // userId
      const egress = await this.redis.getEgressDataByUserId(id);
      if (!egress) return;
      await this.recording.stopRecording(egress.egressId);
    }
  }
}
