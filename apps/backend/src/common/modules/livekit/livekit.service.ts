import { Injectable, Logger } from '@nestjs/common';
import type { RoomServiceClient } from 'livekit-server-sdk';
import { RoomMetadata } from './interfaces/roomMetadata.interface';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);

  constructor(private readonly client: RoomServiceClient) {}

  async createRoom(
    roomName: string,
    startAt: Date,
    durationMinutes: number | null,
  ) {
    const metadata: RoomMetadata = {
      startAt: startAt,
      durationMinutes: durationMinutes,
    };

    await this.client.createRoom({
      name: roomName,
      metadata: JSON.stringify(metadata),
    });
  }

  async removeParticipant(roomName: string, identity: string): Promise<void> {
    try {
      await this.client.removeParticipant(roomName, identity);
      this.logger.log(`Participant ${identity} removed from room ${roomName}`);
    } catch (error) {
      this.logger.error(
        `Error removing participant ${identity} from ${roomName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
