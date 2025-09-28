import { Body, Controller, Logger, Post, Req } from '@nestjs/common';
import { Headers as NestHeaders } from '@nestjs/common';
import { RecordingService } from './recording.service';
import type { Request } from 'express';
import { LivekitWebhook } from 'src/common/decorators/livekitwebhook.decorator';
import { WebhookEvent } from 'livekit-server-sdk';
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

      await this.recordingService.handleEgressFinished({
        roomShortId: egress.roomName,
        filePath: file.filename,
        size: file.size ? Number(file.size) : undefined,
        mimeType: undefined,
        userId: 0,
      });

      this.logger.log(`Egress handled for room ${egress.roomName}`);
    }

    return { ok: true };
  }
}
