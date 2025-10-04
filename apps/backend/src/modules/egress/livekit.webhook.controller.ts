import { Controller, Logger, Post } from '@nestjs/common';
import { RecordingService } from './recording.service';
import { LivekitWebhook } from 'src/common/decorators/livekitwebhook.decorator';
import { EgressStatus, WebhookEvent } from 'livekit-server-sdk';
@Controller('livekit-webhook')
export class LivekitWebhookController {
  private readonly logger = new Logger(LivekitWebhookController.name);

  constructor(private readonly recordingService: RecordingService) {}

  @Post()
  async handleEvent(@LivekitWebhook() event: WebhookEvent) {
    this.logger.debug(`Webhook validated: ${event.event}`);

    if (event.event === 'egress_ended') {
      const egress = event.egressInfo;
      if (!egress) return { ok: false, reason: 'no egress info' };

      const file = egress.fileResults?.[0];
      if (!file) return { ok: false, reason: 'no file info' };

      if (egress.status != EgressStatus.EGRESS_COMPLETE) {
        this.logger.log('failed:', egress.status);
        return { ok: false, reason: `${egress.status}` };
      }

      await this.recordingService.handleEgressFinished({
        roomShortId: egress.roomName,
        fileName: file.filename,
        size: file.size ? Number(file.size) : undefined,
        mimeType: 'video/mp4',
        egressId: egress.egressId,
        startTime: egress.startedAt,
        endTime: egress.endedAt,
      });

      this.logger.log(`Egress handled for room ${egress.roomName}`);
    }

    return { ok: true };
  }
}
