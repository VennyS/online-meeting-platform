import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { WaitingRoomService } from '../waiting-room.service';

@WebSocketGateway({ path: '/waiting-room' })
export class WaitingRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WaitingRoomGateway.name);

  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  async handleConnection(ws: WebSocket, req: any) {
    try {
      await this.waitingRoomService.handleJoin(ws, req);
    } catch (error) {
      this.logger.error('Connection error', error);
      ws.close(1011, 'Server error');
    }
  }

  async handleDisconnect(ws: WebSocket) {
    try {
      await this.waitingRoomService.handleDisconnect(ws);
    } catch (error) {
      this.logger.error('Disconnect error', error);
    }
  }

  @SubscribeMessage('ready')
  async onClientReady(@ConnectedSocket() ws: WebSocket) {
    try {
      await this.waitingRoomService.handleClientReady(ws);
    } catch (error) {
      this.logger.error('Ready event error', error);
      ws.close(1011, 'Server error on ready');
    }
  }
}
