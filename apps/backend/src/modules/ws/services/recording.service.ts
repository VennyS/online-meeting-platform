import { Injectable, Logger } from '@nestjs/common';
import { EgressInfo } from 'livekit-server-sdk';
import { RecordingService as recording } from 'src/modules/egress/recording.service';

export class RecordingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'RecordingError';
  }
}

export class RecordingStartError extends RecordingError {
  constructor(originalError?: Error) {
    super('Failed to start recording', 'RECORDING_START_FAILED', originalError);
  }
}

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  constructor(private readonly recording: recording) {}

  async startRecording(roomShortId: string, userId: number): Promise<string> {
    let egressInfo: EgressInfo | undefined;

    try {
      egressInfo = await this.recording.startRecording(
        roomShortId,
        String(userId),
      );
    } catch (e) {
      throw new RecordingStartError(
        e instanceof Error ? e : new Error(String(e)),
      );
    }

    if (!egressInfo?.egressId) {
      this.logger.error('No egress id', egressInfo);
      throw new RecordingStartError(new Error('no egress id'));
    }

    return egressInfo.egressId;
  }

  async stopRecording(egressId: string) {
    await this.recording.stopRecording(egressId);
  }
}
