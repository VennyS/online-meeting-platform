import { Injectable, Logger } from '@nestjs/common';
import type { RoomServiceClient } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);

  constructor(private readonly client: RoomServiceClient) {}

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
}
