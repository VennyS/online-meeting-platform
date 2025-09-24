// waiting-room.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  BlacklistEntry,
  RedisService,
} from '../../common/modules/redis/redis.service';
import { WebSocket } from 'ws';
import { RoomRepository } from 'src/repositories/room.repository';
import { createLivekitToken } from 'src/common/utils/auth.utils';
import { IPresentation } from './interfaces/presentation.interface';
import { LivekitService } from 'src/common/modules/livekit/livekit.service';

@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly roomRepository: RoomRepository,
    private readonly livekit: LivekitService,
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

  async initPermissions(roomId: string, ws: WebSocket) {
    // Получаем пермишены из Redis
    let permissions: Record<string, any> | null =
      await this.redis.getPermissions(roomId);

    // Если в Redis нет данных или объект пустой, подтягиваем из Prisma
    if (!permissions || Object.keys(permissions).length === 0) {
      const requestedRoom = await this.roomRepository.findByShortId(roomId);

      if (!requestedRoom) {
        ws.send(
          JSON.stringify({
            event: 'permissions_error',
            data: { message: `Room ${roomId} not found` },
          }),
        );
        return;
      }

      // Формируем объект permissions из данных комнаты
      permissions = {
        canShareScreen: requestedRoom.canShareScreen,
        canStartPresentation: requestedRoom.canStartPresentation,
      };
    }

    // Определяем роли и их права
    const roles = ['owner', 'admin', 'participant'] as const;
    const rolePermissions = roles.map((role) => {
      const perms: Record<string, boolean> = {
        canShareScreen: false,
        canStartPresentation: false,
      };

      // Логика для canShareScreen
      if (permissions!.canShareScreen === 'ALL') {
        perms.canShareScreen = true;
      } else if (
        permissions!.canShareScreen === 'ADMIN' &&
        (role === 'owner' || role === 'admin')
      ) {
        perms.canShareScreen = true;
      } else if (permissions!.canShareScreen === 'OWNER' && role === 'owner') {
        perms.canShareScreen = true;
      }

      // Логика для canStartPresentation
      if (permissions!.canStartPresentation === 'ALL') {
        perms.canStartPresentation = true;
      } else if (
        permissions!.canStartPresentation === 'ADMIN' &&
        (role === 'owner' || role === 'admin')
      ) {
        perms.canStartPresentation = true;
      } else if (
        permissions!.canStartPresentation === 'OWNER' &&
        role === 'owner'
      ) {
        perms.canStartPresentation = true;
      }

      return { role, permissions: perms };
    });

    // Отправляем права через WebSocket
    ws.send(
      JSON.stringify({
        event: 'permissions_init',
        data: rolePermissions,
      }),
    );
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
    { guestId, approved }: any,
    roomConnections: Map<string, any>,
  ) {
    const guestConn = roomConnections.get(guestId);
    if (!guestConn) return;

    const quest = await this.redis.getWaitingGuest(roomId, guestId);

    if (approved) {
      const token = await createLivekitToken(
        roomId,
        guestId,
        quest!.name,
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
  async sendPresentationsStateToClient(
    roomId: string,
    ws: WebSocket,
  ): Promise<void> {
    const presentations = await this.redis.getPresentations(roomId);

    const msg = JSON.stringify({
      event: 'presentations_state',
      data: {
        presentations: presentations.map((p) => ({
          presentationId: p.presentationId,
          url: p.url,
          authorId: p.authorId,
          currentPage: p.currentPage,
          zoom: p.zoom,
          scroll: p.scroll,
        })),
      },
    });

    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
      this.logger.log(`Sent presentations state for room ${roomId} to client`);
    } else {
      this.logger.warn(
        `Failed to send presentations state for room ${roomId}: WebSocket is not open`,
      );
    }
  }

  async broadcastStartingPresentation(
    roomId: string,
    presentation: IPresentation,
    roomConnections: Map<string, any>,
  ): Promise<void> {
    await this.broadcastPresentationFinishedByUserId(
      roomId,
      presentation.authorId,
      roomConnections,
    );

    await this.redis.setPresentation(roomId, presentation);

    // Формируем сообщение для клиентов
    const msg = JSON.stringify({
      event: 'presentation_started',
      data: {
        presentationId: presentation.presentationId,
        url: presentation.url,
        authorId: presentation.authorId,
        currentPage: presentation.currentPage,
        zoom: presentation.zoom,
        scroll: presentation.scroll,
      },
    });

    // Рассылаем сообщение всем активным соединениям
    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(msg);
      }
    }
    this.logger.log(
      `Broadcasted presentation start for ${presentation.presentationId} in room ${roomId}`,
    );
  }

  async broadcastPresentationPageChanged(
    roomId: string,
    presentationId: string,
    newPage: number,
    roomConnections: Map<string, any>,
  ): Promise<void> {
    // Обновляем только currentPage в Redis
    const presentation = await this.redis.getPresentation(
      roomId,
      presentationId,
    );
    if (!presentation) {
      this.logger.warn(
        `Presentation ${presentationId} not found in room ${roomId}`,
      );
      return;
    }
    presentation.currentPage = newPage;
    await this.redis.setPresentation(roomId, presentation);

    // Формируем сообщение
    const msg = JSON.stringify({
      event: 'presentation_page_changed',
      data: {
        presentationId,
        page: newPage,
      },
    });

    // Рассылаем сообщение
    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(msg);
      }
    }
    this.logger.log(
      `Broadcasted page change to ${newPage} for presentation ${presentationId} in room ${roomId}`,
    );
  }

  async broadcastPresentationZoomChanged(
    roomId: string,
    presentationId: string,
    newZoom: number,
    roomConnections: Map<string, any>,
  ): Promise<void> {
    // Обновляем только zoom в Redis
    const presentation = await this.redis.getPresentation(
      roomId,
      presentationId,
    );
    if (!presentation) {
      this.logger.warn(
        `Presentation ${presentationId} not found in room ${roomId}`,
      );
      return;
    }
    presentation.zoom = newZoom;
    await this.redis.setPresentation(roomId, presentation);

    // Формируем сообщение
    const msg = JSON.stringify({
      event: 'presentation_zoom_changed',
      data: {
        presentationId,
        zoom: newZoom,
      },
    });

    // Рассылаем сообщение
    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(msg);
      }
    }
    this.logger.log(
      `Broadcasted zoom change to ${newZoom} for presentation ${presentationId} in room ${roomId}`,
    );
  }

  async broadcastPresentationModeChanged(
    roomId: string,
    presentationId: string,
    mode: 'presentationWithCamera' | 'presentationOnly',
    roomConnections: Map<string, any>,
  ): Promise<void> {
    // Обновляем режим в Redis
    const presentation = await this.redis.getPresentation(
      roomId,
      presentationId,
    );
    if (presentation) {
      await this.redis.setPresentation(roomId, { ...presentation, mode });
    }

    // Формируем сообщение для клиентов
    const msg = JSON.stringify({
      event: 'presentation_mode_changed',
      data: {
        presentationId,
        mode,
      },
    });

    // Рассылаем сообщение всем активным соединениям
    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(msg);
      }
    }
    this.logger.log(
      `Broadcasted presentation mode change to ${mode} for ${presentationId} in room ${roomId}`,
    );
  }

  async broadcastPresentationScrollChanged(
    roomId: string,
    presentationId: string,
    x: number,
    y: number,
    roomConnections: Map<string, any>,
  ): Promise<void> {
    // Получаем презентацию из Redis
    const presentation = await this.redis.getPresentation(
      roomId,
      presentationId,
    );
    if (!presentation) {
      this.logger.warn(
        `Presentation ${presentationId} not found in room ${roomId}`,
      );
      return;
    }

    const updatedPresentation = { ...presentation, scroll: { x, y } };

    await this.redis.setPresentation(roomId, updatedPresentation);

    const msg = JSON.stringify({
      event: 'presentation_scroll_changed',
      data: {
        presentationId,
        x,
        y,
      },
    });

    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(msg);
      }
    }
    this.logger.log(
      `Broadcasted scroll change to (${x}, ${y}) for presentation ${presentationId} in room ${roomId}`,
    );
  }

  async broadcastPresentationFinished(
    roomId: string,
    presentationId: string,
    roomConnections: Map<string, any>,
  ): Promise<void> {
    // Удаляем презентацию из Redis
    await this.redis.deletePresentation(roomId, presentationId);

    // Формируем сообщение
    const msg = JSON.stringify({
      event: 'presentation_finished',
      data: {
        presentationId,
      },
    });

    // Рассылаем сообщение
    for (const conn of roomConnections.values()) {
      if (conn.ws.readyState === conn.ws.OPEN) {
        conn.ws.send(msg);
      }
    }
    this.logger.log(
      `Broadcasted presentation finish for ${presentationId} in room ${roomId}`,
    );
  }

  async broadcastPresentationFinishedByUserId(
    roomId: string,
    userId: string,
    roomConnections: Map<string, any>,
  ) {
    const presentations = await this.redis.getPresentations(roomId);
    const presentationId = presentations.find(
      (p) => p.authorId === userId,
    )?.presentationId;

    if (!presentationId) return;

    await this.broadcastPresentationFinished(
      roomId,
      presentationId,
      roomConnections,
    );
  }

  async addToBlacklist(
    roomId: string,
    ip: string,
    userId: string,
    name: string,
  ) {
    await this.redis.addToBlacklist(roomId, ip, name, userId);

    await this.livekit.removeParticipant(roomId, userId);
  }
}
