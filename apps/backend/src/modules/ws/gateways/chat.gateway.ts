import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ChatService } from '../services/chat.service';
import { ConnectionService } from '../services/connection.service';
import { Logger } from '@nestjs/common';
import { Message } from '../interfaces/message.interface';
import type { TypedSocket } from '../interfaces/socket-data.interface';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly connectionService: ConnectionService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(socket: TypedSocket) {
    const { roomShortId } = socket.handshake.auth;

    const roomMetadata = this.connectionService.getMetadata(roomShortId!);
    if (!roomMetadata || !roomMetadata.showHistoryToNewbies) return;

    try {
      const messages = await this.chatService.getMessages(roomShortId!);
      socket.emit('init_chat', messages);
    } catch (error) {
      this.logger.error('Error fetching messages', error);
    }
  }

  @SubscribeMessage('new_message')
  newMessage(
    @MessageBody()
    data: {
      message: Omit<Message, 'id' | 'createdAt'>;
    },
    @ConnectedSocket() socket: TypedSocket,
  ) {
    this.logger.debug('New message received', data);

    this.chatService.newMessage(socket.data.roomShortId, data.message);
  }
}
