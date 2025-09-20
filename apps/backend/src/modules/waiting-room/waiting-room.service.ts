// waiting-room.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../common/modules/redis/redis.service';
import { WebSocket } from 'ws';
import { RoomRepository } from 'src/repositories/room.repository';
import { createLivekitToken } from 'src/common/utils/auth.utils';

@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly roomRepository: RoomRepository,
  ) {}

  // --- Проверка роли хоста ---
  async isHost(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepository.findByShortId(roomId);
    return room?.ownerId.toString() === userId;
  }

  async isOwnerOrAdmin(roomId: string, userId: string): Promise<boolean> {
    const role = await this.redis.getRole(roomId, userId);
    return role === 'owner' || role === 'admin';
  }

  // --- Инициализация хоста ---
  async sendInitToHost(roomId: string, ws: WebSocket) {
    const guests = await this.getWaitingGuests(roomId);
    const permissions = await this.redis.getPermissions(roomId);

    ws.send(
      JSON.stringify({
        event: 'init_host',
        data: { guests, permissions },
      }),
    );
  }

  // --- Роли ---
  async setDefaultRole(roomId: string, userId: string, role: string) {
    const existing = await this.redis.getRole(roomId, userId);
    if (!existing) {
      await this.redis.setRole(roomId, userId, role);
    }
  }

  async broadcastRoles(roomId: string, roomConnections: Map<string, any>) {
    const roles = await this.redis.getRoles(roomId);
    const msg = JSON.stringify({
      event: 'roles_updated',
      data: { roles },
    });
    for (const { ws } of roomConnections.values()) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  async handleRoleUpdate(
    roomId: string,
    { targetUserId, newRole }: any,
    roomConnections: Map<string, any>,
  ) {
    await this.redis.setRole(roomId, targetUserId, newRole);
    const msg = JSON.stringify({
      event: 'role_updated',
      data: { userId: targetUserId, role: newRole },
    });
    for (const { ws } of roomConnections.values()) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  // --- Права ---
  async handlePermissionUpdate(
    roomId: string,
    { targetRole, permission, value }: any,
    roomConnections: Map<string, any>,
  ) {
    const perms = await this.redis.setPermission(
      roomId,
      targetRole,
      permission,
      value,
    );
    const msg = JSON.stringify({
      event: 'permissions_updated',
      data: { role: targetRole, permissions: perms },
    });
    for (const { ws } of roomConnections.values()) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  // --- Очередь гостей ---
  async getWaitingGuests(roomId: string) {
    return await this.redis.getWaitingGuests(roomId);
  }

  async removeGuestFromWaiting(roomId: string, guestId: string) {
    await this.redis.removeGuestFromWaiting(roomId, guestId);
  }

  async removeGuestFromWaitingIfPresent(roomId: string, guestId: string) {
    const waitingList = await this.getWaitingGuests(roomId);
    const isGuestInQueue = waitingList.some((g) => g.guestId === guestId);
    if (isGuestInQueue) {
      await this.removeGuestFromWaiting(roomId, guestId);
      this.logger.log(
        `🗑️ Guest ${guestId} removed from waiting queue in room ${roomId}`,
      );
    }
  }

  async handleGuestJoinRequest(roomId: string, guestId: string, name: string) {
    await this.redis.pushWaitingGuest(roomId, {
      guestId,
      name,
      requestedAt: new Date().toISOString(),
    });
  }

  async handleHostApproval(
    roomId: string,
    { guestId, approved, guestName }: any,
    roomConnections: Map<string, any>,
  ) {
    const guestConn = roomConnections.get(guestId);
    if (!guestConn) return;

    if (approved) {
      const token = await createLivekitToken(
        roomId,
        guestId,
        guestName,
        true,
        'guest',
      );
      guestConn.ws.send(
        JSON.stringify({
          event: 'guest_approved',
          data: { token, roomId },
        }),
      );
    } else {
      guestConn.ws.send(
        JSON.stringify({
          event: 'guest_rejected',
          data: { reason: 'Host rejected your request' },
        }),
      );
    }

    // Удаляем гостя из очереди через кастомный метод
    await this.removeGuestFromWaitingIfPresent(roomId, guestId);
  }

  async updateWaitingQueueForAllHosts(
    roomId: string,
    roomConnections: Map<string, any>,
  ) {
    const waitingList = await this.getWaitingGuests(roomId);
    const msg = JSON.stringify({
      event: 'waiting_queue_updated',
      data: { guests: waitingList },
    });

    for (const conn of roomConnections.values()) {
      if (conn.isHost && conn.ws.readyState === conn.ws.OPEN) conn.ws.send(msg);
    }
  }

  // --- Презентация ---
  async broadcastStartingPresentation(
    url: string,
    authorId: string,
    roomConnections: Map<string, any>,
  ) {
    const msg = JSON.stringify({
      event: 'presentation_started',
      data: {
        url: url,
        authorId: authorId,
      },
    });

    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) conn.ws.send(msg);
    }
  }

  async broadcastPresentationPageChanged(
    newPage: string,
    roomConnections: Map<string, any>,
  ) {
    const msg = JSON.stringify({
      event: 'presentation_page_changed',
      data: {
        page: newPage,
      },
    });

    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) conn.ws.send(msg);
    }
  }

  async broadcastPresentationZoomChanged(
    newZoom: string,
    roomConnections: Map<string, any>,
  ) {
    const msg = JSON.stringify({
      event: 'presentation_zoom_changed',
      data: {
        zoom: newZoom,
      },
    });

    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) conn.ws.send(msg);
    }
  }

  async broadcastPresentationScrollChanged(
    x: string,
    y: string,
    roomConnections: Map<string, any>,
  ) {
    const msg = JSON.stringify({
      event: 'presentation_scroll_changed',
      data: {
        x: x,
        y: y,
      },
    });

    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) conn.ws.send(msg);
    }
  }

  async broadcastPresentationFinished(roomConnections: Map<string, any>) {
    const msg = JSON.stringify({
      event: 'presentation_finished',
    });

    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) conn.ws.send(msg);
    }
  }
}
