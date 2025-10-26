import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { Message } from '../interfaces/message.interface';

@Injectable()
export class ChatService {
  constructor(private readonly redis: RedisService) {}

  async getMessages(roomShortId: string): Promise<Message[]> {
    const messages = await this.redis.getRoomMessages(roomShortId);

    return messages;
  }

  async newMessage(
    roomShortId: string,
    message: Omit<Message, 'id' | 'createdAt'>,
  ) {
    const newMessage = {
      id: Math.random().toString(36).slice(2, 10),
      createdAt: new Date(),
      ...message,
    };

    await this.redis.postRoomMessage(roomShortId, newMessage);
  }
}
