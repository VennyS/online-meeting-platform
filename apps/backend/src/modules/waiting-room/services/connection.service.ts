import { Injectable } from '@nestjs/common';
import { ConnectionManager } from '../connections/connection-manager.service';
import { IncomingMessage } from 'http';

import { WebSocket } from 'ws';
import { RoomRepository } from 'src/repositories/room.repository';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly roomRepository: RoomRepository,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async handleJoin(ws: WebSocket, req: IncomingMessage) {
    try {
      if (!req.url) {
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);
      const roomId = url.searchParams.get('roomId');
      const userId = url.searchParams.get('userId');
      const username = url.searchParams.get('username');

      if (!roomId || !userId || !username) {
        ws.close(1008, 'Need roomId, username and userId');
        return;
      }

      const { isHost, showHistoryToNewbies } = await this.getRoomInfo(
        roomId,
        userId,
      );

      const ip = ws._socket.remoteAddress || 'unknown';
      this.connectionManager.addConnection(
        roomId,
        userId,
        { ws, isHost, ip, username },
        { showHistoryToNewbies },
      );

      this.connectionManager.sendEvent(ws, 'ready', {});
    } catch (error) {
      ws.close(1011, 'Server error');
    }
  }

  async handleDisconnect(ws: WebSocket) {
    const result = this.connectionManager.removeConnection(ws);
    if (!result) return;

    await this.analyticsService.logLeave(result.roomId, result.userId);
    if (result.usersLeftRoom) {
      await this.analyticsService.saveAndClear(result.roomId);
    }

    // removeFromWaitingQueue
    // finish presentation if present
    // if no one in room, save and clear analytics
  }
  async handleClientReady() {}

  private async getRoomInfo(
    roomId: string,
    userId: string,
  ): Promise<{ isHost: boolean; showHistoryToNewbies: boolean }> {
    const room = await this.roomRepository.findByShortId(roomId);
    return {
      isHost: room?.ownerId.toString() === userId,
      showHistoryToNewbies: room ? room.showHistoryToNewbies : false,
    };
  }
}
