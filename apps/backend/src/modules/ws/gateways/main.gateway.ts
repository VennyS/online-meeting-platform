import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ConnectionService } from '../services/connection.service';
import { RoomMetadata } from '../interfaces/room-metadata.interface';
import { Logger } from '@nestjs/common';
import { Mainservice } from '../services/main.service';
import { RoomInfo } from '../interfaces/room.interface';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class MainGateway implements OnGatewayConnection {
  private readonly logger = new Logger(MainGateway.name);

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly mainService: Mainservice,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(socket: Socket) {
    const { roomShortId, userId, username } = socket.handshake.auth as {
      roomShortId?: string;
      userId?: string;
      username?: string;
    };

    if (!roomShortId || !userId || !username) {
      this.logger.debug('Missed any of connection params');
      socket.disconnect(true);
      return;
    }

    let roomInfo: RoomInfo | null;

    try {
      roomInfo = await this.mainService.getRoomInfo(userId, roomShortId);
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

    socket.data.roomShortId = roomShortId;
    socket.data.userId = userId;
    socket.data.username = username;
    socket.data.isHost = roomInfo.isHost;

    const roomMeta: RoomMetadata = {
      roomshortId: roomShortId,
      name: roomInfo.name,
      startedAt: new Date(),
      showHistoryToNewbies: roomInfo.showHistoryToNewbies,
    };

    this.connectionService.addRoom(roomMeta);

    socket.emit('connection_success', {
      roomName: roomInfo.name,
      message: 'Successfully connected to room',
    });

    this.logger.log(`${username} connected to room ${roomShortId}`);
  }
}
