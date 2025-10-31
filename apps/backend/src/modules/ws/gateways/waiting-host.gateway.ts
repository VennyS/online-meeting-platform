import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConnectionService } from '../services/connection.service';
import { WaitingService } from '../services/waiting.service';
import { Server } from 'socket.io';
import type { TypedSocket } from '../interfaces/socket-data.interface';
import { Guest } from 'src/common/modules/redis/redis.service';
import { createLivekitToken } from 'src/common/utils/auth.utils';
import { InitService } from '../services/init.service';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class WaitingHostGateway implements OnGatewayConnection {
  private readonly logger = new Logger(WaitingHostGateway.name);

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly waitingService: WaitingService,
    private readonly init: InitService,
  ) {}
  @WebSocketServer()
  server: Server;

  async handleConnection(socket: TypedSocket) {
    await this.init.waitForReady();

    const { roomShortId, isHost } = socket.data;

    if (!isHost) return;

    let guests: Guest[] = [];

    try {
      guests = await this.waitingService.getGuests(roomShortId);
    } catch (e) {
      this.logger.error('Error while fetching guests', e);
      return;
    }

    if (guests.length <= 0) return;

    this.server
      .of('/')
      .to(`hosts-${roomShortId}`)
      .emit('waiting_queue_updated', { guests });
  }

  @SubscribeMessage('host_approval')
  async approveGuest(
    data: { guestId: number; approved: boolean },
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, userId, isHost } = socket.data;

    if (!isHost) {
      this.logger.warn(`Attemp approval from no host ${userId}`);
      return;
    }

    const guestConnection = this.connectionService.getGuest(data.guestId);
    if (!guestConnection) {
      this.logger.debug(`Guest were not found ${data.guestId}`);
      return;
    }

    const guestSocket: TypedSocket | undefined =
      this.server.sockets.sockets.get(guestConnection.socketId);

    if (!guestSocket) {
      this.logger.debug(`Guest socket were not found ${data.guestId}`);
      return;
    }

    await this.waitingService.removeGuest(roomShortId, data.guestId);
    this.connectionService.removeGuest(data.guestId);
    const quest = await this.waitingService.getGuest(roomShortId, data.guestId);
    if (!quest) {
      this.logger.warn(`Guest were not found in cache ${data.guestId}`);
    }

    const token = await createLivekitToken(
      roomShortId,
      String(data.guestId),
      quest!.name,
      true,
      'guest',
    );

    if (data.approved) {
      guestSocket.emit('guest_approved', { token });
    } else {
      guestSocket.emit('guest_rejected');
    }
  }
}
