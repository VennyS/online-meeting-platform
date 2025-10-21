import { v4 as uuidv4 } from 'uuid';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { WaitingRoomService } from './waiting-room.service';
import { IPresentation } from './interfaces/presentation.interface';
import { Message } from '../room/interfaces/message.interface';

@WebSocketGateway({ path: '/waiting-room' })
export class WaitingRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WaitingRoomGateway.name);

  private connections = new Map<
    string,
    Map<
      string,
      {
        ws: WebSocket;
        isHost: boolean;
        ip: string;
        username: string;
        showHistoryToNewbies: boolean;
      }
    >
  >();

  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  sendToUser(roomShortId: string, userId: string, type: string, payload: any) {
    const roomConnections = this.connections.get(roomShortId);
    const user = roomConnections?.get(userId);
    user?.ws.send(JSON.stringify({ type, payload }));
  }

  async handleConnection(ws: WebSocket, req: any) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const roomId = url.searchParams.get('roomId');
      const userId = url.searchParams.get('userId');
      const username = url.searchParams.get('username');

      if (!roomId || !userId || !username) {
        ws.close(1008, 'Need roomId, username and userId');
        return;
      }

      const { isHost, showHistoryToNewbies } =
        await this.waitingRoomService.roomInfo(roomId, userId);
      const ip = ws._socket.remoteAddress || 'unknown';

      if (!this.connections.has(roomId)) {
        this.connections.set(roomId, new Map());
      }
      const roomConnections = this.connections.get(roomId)!;
      roomConnections.set(userId, {
        ws,
        isHost,
        ip,
        username,
        showHistoryToNewbies,
      });

      (ws as any)._roomData = { roomId, userId, username, ip, isHost };

      ws.send(JSON.stringify({ event: 'ready', data: {} }));
    } catch (error) {
      ws.close(1011, 'Server error');
    }
  }

  async handleDisconnect(ws: WebSocket) {
    for (const [roomId, users] of this.connections.entries()) {
      for (const [userId, conn] of users.entries()) {
        if (conn.ws === ws) {
          users.delete(userId);
          this.logger.log(`❌ ${userId} left room ${roomId}`);

          await this.waitingRoomService.leaveAnalytics(roomId, userId);

          await this.waitingRoomService.removeGuestFromWaitingIfPresent(
            roomId,
            userId,
          );

          await this.waitingRoomService.broadcastPresentationFinishedByUserId(
            roomId,
            userId,
            this.connections.get(roomId)!,
          );

          if (users.size === 0) {
            await this.waitingRoomService.saveAndClearAnalytics(roomId);
            this.connections.delete(roomId);
          }

          break;
        }
      }
    }
  }

  @SubscribeMessage('ready')
  async onClientReady(@ConnectedSocket() ws: WebSocket) {
    try {
      const data = (ws as any)._roomData;
      if (!data) return;

      const { roomId, userId, username, ip, isHost } = data;
      const roomConnections = this.connections.get(roomId)!;

      await this.waitingRoomService.handleJoin(
        roomId,
        ws,
        userId,
        username,
        ip,
        isHost,
        roomConnections,
      );
    } catch (error) {
      ws.close(1011, 'Server error on ready');
    }
  }

  private findUserBySocket(
    ws: WebSocket,
  ): { roomId: string; userId: string; isHost: boolean } | null {
    for (const [roomId, users] of this.connections.entries()) {
      for (const [userId, conn] of users.entries()) {
        if (conn.ws === ws) {
          return { roomId, userId, isHost: conn.isHost };
        }
      }
    }
    return null;
  }

  @SubscribeMessage('recording_started')
  async startRecording(@ConnectedSocket() ws: WebSocket) {
    const info = this.findUserBySocket(ws);
    if (!info) return;

    const { roomId, userId } = info;

    this.waitingRoomService.startRecording(
      roomId,
      userId,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('recording_finished')
  async finishRecording(
    @ConnectedSocket() ws: WebSocket,
    @MessageBody() data: { egressId: string },
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) return;

    const { roomId } = info;

    this.waitingRoomService.stopRecording(
      data.egressId,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('guest_join_request')
  async guestJoin(
    @MessageBody() data: { name: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) return;

    const { roomId, userId } = info;
    await this.waitingRoomService.handleGuestJoinRequest(
      roomId,
      userId,
      data.name,
    );
    await this.waitingRoomService.updateWaitingQueueForAllHosts(
      roomId,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('host_approval')
  async hostApproval(
    @MessageBody()
    data: { guestId: string; approved: boolean },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) return;

    const { roomId } = info;
    await this.waitingRoomService.handleHostApproval(
      roomId,
      data,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('update_permission')
  async updatePermission(
    @MessageBody() data: { targetRole: string; permission: string; value: any },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) return;

    const { roomId, userId } = info;
    if (!(await this.waitingRoomService.isOwnerOrAdmin(roomId, userId))) return;

    await this.waitingRoomService.handlePermissionUpdate(
      roomId,
      data,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('update_role')
  async updateRole(
    @MessageBody() data: { targetUserId: string; newRole: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) return;

    const { roomId, userId } = info;
    if (!(await this.waitingRoomService.isOwnerOrAdmin(roomId, userId))) return;

    await this.waitingRoomService.handleRoleUpdate(
      roomId,
      data,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('presentation_started')
  async startPresentation(
    @MessageBody()
    data: {
      fileId: string;
      url: string;
      mode?: 'presentationWithCamera' | 'presentationOnly';
    },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Presentation start from unknown socket');
      return;
    }

    const { roomId, userId } = info;

    const presentation: IPresentation = {
      fileId: data.fileId,
      presentationId: uuidv4(),
      url: data.url,
      authorId: userId,
      currentPage: 1,
      zoom: 1,
      scroll: { x: 0, y: 0 },
      mode: data.mode || 'presentationWithCamera',
    };

    await this.waitingRoomService.broadcastStartingPresentation(
      roomId,
      presentation,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('presentation_page_changed')
  async changePage(
    @MessageBody() data: { presentationId: string; page: number },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Page change from unknown socket');
      return;
    }

    const { roomId, userId } = info;
    if (!(await this.waitingRoomService.isOwnerOrAdmin(roomId, userId))) {
      this.logger.warn(
        `User ${userId} not authorized to change page in room ${roomId}`,
      );
      return;
    }

    await this.waitingRoomService.broadcastPresentationPageChanged(
      roomId,
      data.presentationId,
      data.page,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('presentation_zoom_changed')
  async changeZoom(
    @MessageBody() data: { presentationId: string; zoom: number },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Zoom change from unknown socket');
      return;
    }

    const { roomId, userId } = info;
    if (!(await this.waitingRoomService.isOwnerOrAdmin(roomId, userId))) {
      this.logger.warn(
        `User ${userId} not authorized to change zoom in room ${roomId}`,
      );
      return;
    }

    await this.waitingRoomService.broadcastPresentationZoomChanged(
      roomId,
      data.presentationId,
      data.zoom,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('presentation_scroll_changed')
  async changeScroll(
    @MessageBody() data: { presentationId: string; x: number; y: number },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Scroll change from unknown socket');
      return;
    }

    const { roomId, userId } = info;
    if (!(await this.waitingRoomService.isOwnerOrAdmin(roomId, userId))) {
      this.logger.warn(
        `User ${userId} not authorized to change scroll in room ${roomId}`,
      );
      return;
    }

    await this.waitingRoomService.broadcastPresentationScrollChanged(
      roomId,
      data.presentationId,
      data.x,
      data.y,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('presentation_mode_changed')
  async changePresentationMode(
    @MessageBody()
    data: {
      presentationId: string;
      mode: 'presentationWithCamera' | 'presentationOnly';
    },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Presentation mode change from unknown socket');
      return;
    }

    const { roomId, userId } = info;
    if (!(await this.waitingRoomService.isOwnerOrAdmin(roomId, userId))) {
      this.logger.warn(
        `User ${userId} not authorized to change presentation mode in room ${roomId}`,
      );
      return;
    }

    await this.waitingRoomService.broadcastPresentationModeChanged(
      roomId,
      data.presentationId,
      data.mode,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('presentation_finished')
  async finishPresentation(
    @MessageBody() data: { presentationId: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Presentation finish from unknown socket');
      return;
    }

    const { roomId, userId } = info;
    if (!(await this.waitingRoomService.isOwnerOrAdmin(roomId, userId))) {
      this.logger.warn(
        `User ${userId} not authorized to finish presentation in room ${roomId}`,
      );
      return;
    }

    await this.waitingRoomService.broadcastPresentationFinished(
      roomId,
      data.presentationId,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('add_to_blacklist')
  async addToBlackList(
    @MessageBody() data: { userId: string; name: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Add to blacklist attempt from unknown socket');
      return;
    }

    const { roomId, userId: requestUserId, isHost } = info;
    if (!isHost) {
      this.logger.warn(
        `User ${requestUserId} not authorized to add to blacklist in room ${roomId}`,
      );
      return;
    }

    let targetIp;
    if (data.userId) {
      const targetUser = this.connections.get(roomId)?.get(data.userId);
      if (targetUser) {
        targetIp = targetUser.ws._socket.remoteAddress || targetIp;
      } else {
        this.logger.warn(
          `User ${data.userId} not found in room ${roomId} for blacklisting`,
        );
        return;
      }
    }

    if (!targetIp || targetIp === 'unknown') {
      this.logger.warn('No valid IP address provided for blacklisting');
      return;
    }

    await this.waitingRoomService.addToBlacklist(
      roomId,
      targetIp,
      data.userId,
      data.name,
      ws,
    );
    this.logger.log(
      `User ${data.userId} added IP ${targetIp}${
        data.userId ? ` with userId ${data.userId}` : ''
      } to blacklist for room ${roomId}`,
    );
  }

  @SubscribeMessage('remove_from_blacklist')
  async removeFromBlacklist(
    @MessageBody() data: { ip: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Add to blacklist attempt from unknown socket');
      return;
    }

    const { roomId, userId: requestUserId, isHost } = info;
    if (!isHost) {
      this.logger.warn(
        `User ${requestUserId} not authorized to add to blacklist in room ${roomId}`,
      );
      return;
    }

    await this.waitingRoomService.removeFromBlacklist(roomId, data.ip, ws);
  }

  @SubscribeMessage('new_message')
  async newMessage(
    @MessageBody()
    data: { message: Omit<Message, 'id' | 'createdAt'> },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) {
      this.logger.warn('Add to blacklist attempt from unknown socket');
      return;
    }

    const { roomId } = info;

    await this.waitingRoomService.newMessage(roomId, data.message);
  }
}
