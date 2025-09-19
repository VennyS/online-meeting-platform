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

@WebSocketGateway({ path: '/waiting-room' })
export class WaitingRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WaitingRoomGateway.name);

  // roomId -> Map<userId, { ws, isHost }>
  private connections = new Map<
    string,
    Map<string, { ws: WebSocket; isHost: boolean }>
  >();

  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  async handleConnection(ws: WebSocket, req: any) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const roomId = url.searchParams.get('roomId');
      const userId = url.searchParams.get('userId');

      if (!roomId || !userId) {
        ws.close(1008, 'Need roomId and userId');
        return;
      }

      const isHost = await this.waitingRoomService.isHost(roomId, userId);

      if (!this.connections.has(roomId)) {
        this.connections.set(roomId, new Map());
      }
      this.connections.get(roomId)!.set(userId, { ws, isHost });

      ws.send(
        JSON.stringify({
          event: 'init',
          data: { role: isHost ? 'owner' : 'participant' },
        }),
      );

      if (isHost) {
        await this.waitingRoomService.sendInitToHost(roomId, ws);
      }

      await this.waitingRoomService.setDefaultRole(
        roomId,
        userId,
        isHost ? 'owner' : 'participant',
      );
      await this.waitingRoomService.broadcastRoles(
        roomId,
        this.connections.get(roomId)!,
      );

      this.logger.log(`✅ ${userId} joined room ${roomId}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      ws.close(1011, 'Server error');
    }
  }

  async handleDisconnect(ws: WebSocket) {
    for (const [roomId, users] of this.connections.entries()) {
      for (const [userId, conn] of users.entries()) {
        if (conn.ws === ws) {
          users.delete(userId);
          this.logger.log(`❌ ${userId} left room ${roomId}`);

          await this.waitingRoomService.removeGuestFromWaitingIfPresent(
            roomId,
            userId,
          );

          break;
        }
      }
    }
  }

  private findUserBySocket(
    ws: WebSocket,
  ): { roomId: string; userId: string } | null {
    for (const [roomId, users] of this.connections.entries()) {
      for (const [userId, conn] of users.entries()) {
        if (conn.ws === ws) {
          return { roomId, userId };
        }
      }
    }
    return null;
  }

  @SubscribeMessage('guest_join_request')
  async guestJoin(
    @MessageBody() data: { name: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    this.logger.log(data);

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
    data: { guestId: string; approved: boolean; guestName: string },
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
    @MessageBody() data: { url: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) return;

    const { roomId, userId } = info;

    await this.waitingRoomService.broadcastStartingPresentation(
      data.url,
      userId,
      this.connections.get(roomId)!,
    );
  }

  @SubscribeMessage('presentation_page_changed')
  async changePage(
    @MessageBody() data: { page: string },
    @ConnectedSocket() ws: WebSocket,
  ) {
    const info = this.findUserBySocket(ws);
    if (!info) return;

    const { roomId } = info;

    await this.waitingRoomService.broadcastPresentationPageChanged(
      data.page,
      this.connections.get(roomId)!,
    );
  }
}
