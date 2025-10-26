import {
  OnGatewayConnection,
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

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class MainGateway implements OnGatewayConnection {
  private readonly logger = new Logger(MainGateway.name);

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly mainService: Mainservice,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(socket: TypedSocket) {
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
      host: roomInfo.isHost ? socket : undefined,
    };

    const userConnection: Connection = {
      socketId: socket.id,
    };

    this.connectionService.addRoom(roomMeta);
    this.connectionService.addConnection(userId, ip, userConnection);

    socket.emit('connection_success', {
      roomName: roomInfo.name,
      message: 'Successfully connected to room',
    });

    this.logger.log(`${username} connected to room ${roomShortId}`);
  }
}
