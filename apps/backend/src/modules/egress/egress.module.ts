import { forwardRef, Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { LivekitWebhookController } from './livekit.webhook.controller';
import { RedisModule } from 'src/common/modules/redis/redis.module';
import { RoomRepository } from 'src/repositories/room.repository';
import { WsModule } from '../ws/ws.module';
import { RecordingEgressService } from './recording-egress.service';

@Module({
  imports: [FileModule, RedisModule, forwardRef(() => WsModule)],
  providers: [RecordingEgressService, RoomRepository],
  controllers: [LivekitWebhookController],
  exports: [RecordingEgressService],
})
export class EgressModule {}
