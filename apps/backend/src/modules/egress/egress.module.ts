import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { RecordingService } from './recording.service';
import { LivekitWebhookController } from './livekit.webhook.controller';

@Module({
  imports: [FileModule],
  providers: [RecordingService],
  controllers: [LivekitWebhookController],
  exports: [RecordingService],
})
export class EgressModule {}
