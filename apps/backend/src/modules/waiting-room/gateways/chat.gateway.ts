import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { Message } from 'src/modules/room/interfaces/message.interface';

@WebSocketGateway({ path: '/chat' })
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('new_message')
  async handleNewMessage(
    @MessageBody() data: { message: Omit<Message, 'id' | 'createdAt'> },
    @ConnectedSocket() ws: WebSocket,
  ) {
    try {
      await this.chatService.handleNewMessage(ws, data.message);
    } catch (error) {
      this.logger.error('Failed to handle new message', error);
    }
  }
}
