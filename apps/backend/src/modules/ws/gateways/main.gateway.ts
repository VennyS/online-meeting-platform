import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ConnectionService } from '../services/connection.service';
import {
  Connection,
  RoomMetadata,
} from '../interfaces/room-metadata.interface';
import { Logger } from '@nestjs/common';
import { Mainservice } from '../services/main.service';
import { RoomInfo } from '../interfaces/room.interface';
import { TypedSocket } from '../interfaces/socket-data.interface';
import { getClientIP } from 'src/common/utils/socket.utils';
import { AnalyticsService } from '../services/analytics.service';
import { LivekitService } from 'src/common/modules/livekit/livekit.service';
import { InitService } from '../services/init.service';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class MainGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MainGateway.name);

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly mainService: Mainservice,
    private readonly analyticsService: AnalyticsService,
    private readonly livekitService: LivekitService,
    private readonly init: InitService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(socket: TypedSocket) {
    this.init.markNotReady();

    const { roomShortId, userId, username } = socket.handshake.auth;

    if (!roomShortId || !userId || !username) {
      this.logger.debug('Missed any of connection params');
      socket.disconnect(true);
      return;
    }

    let roomInfo: RoomInfo | null;

    try {
      roomInfo = await this.mainService.getRoomInfo(roomShortId, userId);
    } catch (e) {
      this.logger.error('Error happened while fetching room info', e);
      socket.emit('connection_error', {
        message: 'Failed to fetch room information',
      });
      socket.disconnect(true);
      return;
    }

    if (!roomInfo) {
      this.logger.error(
        `No room with room shortId: ${roomShortId} fetched from mainService`,
      );
      socket.emit('connection_error', {
        message: 'Room not found',
      });
      socket.disconnect(true);
      return;
    }

    const ip = getClientIP(socket);

    socket.data.roomShortId = roomShortId;
    socket.data.userId = userId;
    socket.data.username = username;
    socket.data.isHost = roomInfo.isHost;
    socket.data.ip = ip;

    const roomMeta: RoomMetadata = {
      roomshortId: roomShortId,
      name: roomInfo.name,
      startedAt: new Date(),
      showHistoryToNewbies: roomInfo.showHistoryToNewbies,
    };

    const userConnection: Connection = {
      socket: socket,
    };

    this.connectionService.addRoom(roomMeta);
    this.connectionService.addConnection(userId, ip, userConnection);

    if (roomInfo.isHost) {
      socket.join(`hosts-${roomShortId}`);
    }

    socket.join(`room-${roomShortId}`);

    socket.emit('connection_success', {
      roomName: roomInfo.name,
      message: 'Successfully connected to room',
    });

    this.init.markReady();

    this.analyticsService.join(roomShortId, String(userId), username, ip);

    this.logger.log(`${username} ${userId} connected to room ${roomShortId}`);
  }

  async handleDisconnect(socket: TypedSocket) {
    const { roomShortId, userId } = socket.data;

    this.analyticsService.leave(roomShortId, String(userId));

    const isEmpty = await this.livekitService.isEmpty(roomShortId);

    if (isEmpty) {
      this.analyticsService.saveAndClear(roomShortId);
    }

    this.logger.log(`User ${userId} left the room ${roomShortId}`);
  }
}
