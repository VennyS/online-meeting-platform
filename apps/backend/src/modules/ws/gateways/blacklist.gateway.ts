import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { TypedSocket } from '../interfaces/socket-data.interface';
import { BlacklistService } from '../services/blacklist.service';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { BlacklistEntry } from '../interfaces/blacklist-entry.interface';
import { ConnectionService } from '../services/connection.service';
import { Server } from 'socket.io';
import { InitService } from '../services/init.service';
import { AddToBlacklistDto } from '../dto/blacklist.dto';
import { extractIp } from 'src/common/utils/socket.utils';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
@UsePipes(new ValidationPipe({ transform: true }))
export class BlacklistGateway implements OnGatewayConnection {
  private readonly logger = new Logger(BlacklistGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly blacklistService: BlacklistService,
    private readonly init: InitService,
  ) {}

  async handleConnection(socket: TypedSocket) {
    await this.init.waitForReady();

    const { isHost } = socket.data;

    if (!isHost) return;

    let blacklistedUsers: BlacklistEntry[];

    try {
      blacklistedUsers = await this.blacklistService.getBlacklistedUsers(
        socket.data.roomShortId,
      );
    } catch (e) {
      this.logger.error('Error fetching blacklisted users', e);
      return;
    }

    if (blacklistedUsers.length === 0) {
      this.logger.debug('No blacklisted users found for this room');
      return;
    }

    socket.emit('blacklist_init', blacklistedUsers);
  }

  @SubscribeMessage('add_to_blacklist')
  async addToBlackList(
    @MessageBody() data: AddToBlacklistDto,
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, userId, isHost } = socket.data;
    if (!isHost) {
      this.logger.debug(
        `User ${userId} not host attempt to add to blacklist in room ${roomShortId}`,
      );
      return;
    }

    const excludedUser = this.connectionService.getConnection({
      userId: data.userId,
    });
    if (!excludedUser) {
      this.logger.debug(
        `No connection found for userId: ${data.userId} to blacklist`,
      );
      return;
    }

    const blacklistEntry: BlacklistEntry = {
      userId: data.userId,
      name: data.name,
      ip: extractIp(excludedUser.socket),
    };

    try {
      await this.blacklistService.addToBlacklist(
        excludedUser.socket.data.roomShortId,
        blacklistEntry,
      );
    } catch (e) {
      this.logger.error('Error adding user to blacklist', e);
      return;
    }

    await this.notifyAboutUpdatedBlacklist(
      excludedUser.socket.data.roomShortId,
    );
  }

  @SubscribeMessage('remove_from_blacklist')
  async removeFromBlacklist(
    @MessageBody() data: Pick<BlacklistEntry, 'ip'>,
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { isHost, userId, roomShortId } = socket.data;

    if (!isHost) {
      this.logger.debug(
        `User ${userId} not host attempt to remove from blacklist in room ${roomShortId}`,
      );
      return;
    }

    await this.blacklistService.removeFromBlacklist(roomShortId, data.ip);

    this.notifyAboutUpdatedBlacklist(roomShortId);
  }

  private async notifyAboutUpdatedBlacklist(roomShortId: string) {
    const blacklist =
      await this.blacklistService.getBlacklistedUsers(roomShortId);

    this.server
      .of('/')
      .to(`hosts-${roomShortId}`)
      .emit('blacklist_updated', blacklist);
  }
}
