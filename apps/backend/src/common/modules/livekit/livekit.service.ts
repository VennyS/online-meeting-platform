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

  async listParticipants(roomName: string) {
    try {
      return await this.client.listParticipants(roomName);
    } catch (error) {
      this.logger.error(
        `Error listing participants for ${roomName}: ${error.message}`,
        error.stack,
      );
      return [];
    }
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

  async isEmpty(roomName: string): Promise<boolean> {
    try {
      const participants = await this.listParticipants(roomName);
      return participants.length === 0;
    } catch (error) {
      this.logger.error(
        `Error checking if room ${roomName} is empty: ${error.message}`,
        error.stack,
      );
      return true;
    }
  }
}
