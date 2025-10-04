import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { RecordingService } from './recording.service';
import { LivekitWebhookController } from './livekit.webhook.controller';
import { RedisModule } from 'src/common/modules/redis/redis.module';
import { RoomRepository } from 'src/repositories/room.repository';

@Module({
  imports: [FileModule, RedisModule],
  providers: [RecordingService, RoomRepository],
  controllers: [LivekitWebhookController],
  exports: [RecordingService],
})
export class EgressModule {}
