import { Module } from '@nestjs/common';
import { MainGateway } from './gateways/main.gateway';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatService } from './services/chat.service';
import { RedisModule } from 'src/common/modules/redis/redis.module';
import { ConnectionService } from './services/connection.service';

@Module({
  imports: [RedisModule],
  providers: [MainGateway, ChatGateway, ConnectionService, ChatService],
})
export class WsModule {}
