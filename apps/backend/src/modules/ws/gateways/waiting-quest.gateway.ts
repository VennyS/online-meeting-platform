import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { TypedSocket } from '../interfaces/socket-data.interface';
import { Server } from 'socket.io';
import { ConnectionService } from '../services/connection.service';
import { WaitingService } from '../services/waiting.service';
import { Logger } from '@nestjs/common';
import { Guest } from 'src/common/modules/redis/redis.service';
import { plainToClass } from 'class-transformer';
import { ConnectionAuthGuestDto } from '../dto/connection-auth.dto';
import { validate } from 'class-validator';

@WebSocketGateway({ path: '/ws', namespace: '/waiting-room', cors: true })
export class WaitingGuestGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WaitingGuestGateway.name);

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly waitingService: WaitingService,
  ) {}
  @WebSocketServer()
  server: Server;

  async handleConnection(socket: TypedSocket) {
    if (!socket.handshake.auth) {
      this.logger.debug('Auth object is missing in handshake');
      socket.disconnect(true);
      return;
    }

    const connectionData = plainToClass(
      ConnectionAuthGuestDto,
      socket.handshake.auth,
    );
    const errors = await validate(connectionData);

    if (errors.length > 0) {
      this.logger.debug('Invalid connection params', { errors });
      socket.emit('connection_error', {
        message: 'Invalid connection parameters',
      });
      socket.disconnect(true);
      return;
    }

    const { roomShortId, username } = connectionData;

    const guestId = Math.floor(Math.random() * 1_000_000);

    socket.data.roomShortId = roomShortId;
    socket.data.userId = guestId;

    this.connectionService.addGuest(guestId, { socket: socket });
    let guests: Guest[] = [];

    try {
      await this.waitingService.addGuest(roomShortId, username, guestId);
      guests = await this.waitingService.getGuests(roomShortId);
    } catch (e) {
      this.logger.error('Error while adding guest and fetching', e);
      socket.disconnect(true);
      return;
    }

    if (!guests || guests.length <= 0) return;

    (this.server as any as { server: Server }).server
      .of('/')
      .to(`hosts-${roomShortId}`)
      .emit('waiting_queue_updated', { guests });

    this.logger.log(`Guest ${username} joining pending to room ${roomShortId}`);
  }

  handleDisconnect(socket: TypedSocket) {
    const { userId, roomShortId } = socket.data;

    this.connectionService.removeGuest(userId);
    this.waitingService.removeGuest(roomShortId, userId);
  }
}
