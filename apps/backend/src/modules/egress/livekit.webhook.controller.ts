import { Controller, Logger, Post } from '@nestjs/common';
import { LivekitWebhook } from 'src/common/decorators/livekitwebhook.decorator';
import { EgressStatus, WebhookEvent } from 'livekit-server-sdk';
import { RoomRepository } from 'src/repositories/room.repository';
import { RoomMetadata } from 'src/common/modules/livekit/interfaces/roomMetadata.interface';
import { RecordingEgressService } from './recording-egress.service';
@Controller('livekit-webhook')
export class LivekitWebhookController {
  private readonly logger = new Logger(LivekitWebhookController.name);

  constructor(
    private readonly recordingService: RecordingEgressService,
    private readonly roomRepo: RoomRepository,
  ) {}

  @Post()
  async handleEvent(@LivekitWebhook() event: WebhookEvent) {
    this.logger.debug(`Webhook validated: ${event.event}`);

    if (event.event === 'room_finished') {
      if (!event.room) {
        this.logger.warn('room_finished webhook received without room');
        return { ok: false, reason: 'no room provided' };
      }

      const raw = event.room.metadata;

      let metadata: RoomMetadata | null = null;

      if (raw) {
        try {
          const parsed = JSON.parse(raw);

          metadata = {
            startAt: new Date(parsed.startAt),
            durationMinutes: parsed.durationMinutes ?? null,
          };
          this.logger.debug(
            `Parsed metadata for room ${event.room.name}:`,
            metadata,
          );
        } catch (e) {
          this.logger.error(`Invalid metadata for room ${event.room.name}:`, e);
          return { ok: false, reason: 'invalid metadata' };
        }
      }

      if (!metadata) {
        this.logger.warn(`No metadata provided for room ${event.room.name}`);
        return { ok: false, reason: 'no metadata provided' };
      }

      const now = new Date();
      this.logger.debug(`Current time: ${now.toISOString()}`);

      const startAt = metadata.startAt;
      const durationMinutes = metadata.durationMinutes;
      const expectedEnd = durationMinutes
        ? new Date(startAt.getTime() + durationMinutes * 60_000)
        : null;

      this.logger.debug(
        `Room ${event.room.name} startAt: ${startAt.toISOString()}, durationMinutes: ${durationMinutes}, expectedEnd: ${expectedEnd?.toISOString() ?? 'N/A'}`,
      );

      const shouldFinish =
        startAt <= now && (durationMinutes === null || now >= expectedEnd!);

      if (!shouldFinish) {
        this.logger.debug(
          `Room ${event.room.name} not yet finished by schedule`,
        );
        return { ok: true, skipped: true };
      }

      this.logger.log(`Marking room ${event.room.name} as finished`);
      await this.roomRepo.markAsFinished(event.room.name);

      return { ok: true, updated: true };
    }

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
