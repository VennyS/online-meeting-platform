import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { BlacklistService } from '../services/blacklist.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ path: '/blacklist' })
export class BlacklistGateway {
  private readonly logger = new Logger(BlacklistGateway.name);

  constructor(private readonly blacklistService: BlacklistService) {}

  @SubscribeMessage('add_to_blacklist')
  async addToBlacklist(
    @MessageBody() data: { userId?: string; name?: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    try {
      await this.blacklistService.addToBlacklist(ws, data);
    } catch (error) {
      this.logger.error('Failed to add to blacklist', error);
    }
  }

  @SubscribeMessage('remove_from_blacklist')
  async removeFromBlacklist(
    @MessageBody() data: { ip: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    try {
      await this.blacklistService.removeFromBlacklist(ws, data);
    } catch (error) {
      this.logger.error('Failed to remove from blacklist', error);
    }
  }
}
