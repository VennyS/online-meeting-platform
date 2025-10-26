import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { TypedSocket } from '../interfaces/socket-data.interface';
import { Server } from 'socket.io';
import {
  RecordingService,
  RecordingStartError,
} from '../services/recording.service';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class RecordingGateway {
  private readonly logger = new Logger(RecordingGateway.name);

  constructor(private readonly recordingService: RecordingService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('recording_started')
  async startRecording(@ConnectedSocket() socket: TypedSocket) {
    const { roomShortId, userId, isHost } = socket.data;

    if (!isHost) return;

    let egressId: string;
    try {
      egressId = await this.recordingService.startRecording(
        roomShortId,
        userId,
      );
    } catch (e) {
      this.logger.error(
        `Room ${roomShortId} recording by userId: ${userId} failed`,
        e,
      );
      if (e instanceof RecordingStartError) {
        socket.emit('recording_error');
      }
      return;
    }

    this.server.sockets.emit('recording_started', egressId);
  }

  @SubscribeMessage('recording_finished')
  async finishRecording(
    @ConnectedSocket() socket: TypedSocket,
    @MessageBody() data: { egressId: string },
  ) {
    const { isHost } = socket.data;
    if (!isHost) return;

    try {
      await this.recordingService.stopRecording(data.egressId);
    } catch (e) {
      this.logger.error(
        `Error on stop recording with egressId: ${data.egressId}`,
        e,
      );
      return;
    }

    this.server.sockets.emit('recording_finished', { egressId: data.egressId });
  }
}
