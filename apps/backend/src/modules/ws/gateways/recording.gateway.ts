import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { TypedSocket } from '../interfaces/socket-data.interface';
import { Server } from 'socket.io';
import { RecordingService } from '../services/recording.service';
import { ConnectionService } from '../services/connection.service';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class RecordingGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(RecordingGateway.name);

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly recordingService: RecordingService,
  ) {}

  @WebSocketServer()
  server: Server;

  sendToUser(userId: string, type: string, payload: any) {
    const conn = this.connectionService.getConnection({
      userId: Number(userId),
    });

    if (!conn) return;

    conn?.socket?.emit(type, payload);
  }

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
      socket.emit('recording_error');
      return;
    }

    this.server.sockets
      .to(`room-${roomShortId}`)
      .emit('recording_started', egressId);
  }

  @SubscribeMessage('recording_finished')
  async finishRecording(
    @ConnectedSocket() socket: TypedSocket,
    @MessageBody() data: { egressId: string },
  ) {
    const { isHost, roomShortId } = socket.data;
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

    this.server.sockets
      .to(roomShortId)
      .emit('recording_finished', { egressId: data.egressId });
  }

  handleDisconnect(socket: TypedSocket) {
    const { roomShortId, userId } = socket.data;

    this.logger.debug(
      `Stopping egress started by ${userId} in ${roomShortId} due disconnect`,
    );

    try {
      this.recordingService.stopRecording(userId);
    } catch (e) {
      this.logger.error('Stop recording error', e);
    }
  }
}
