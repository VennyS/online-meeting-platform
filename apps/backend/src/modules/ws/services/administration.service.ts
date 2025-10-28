import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { RoomRepository } from 'src/repositories/room.repository';
import {
  RoomRole,
  Permissions,
  UpdatePermissionData,
  UpdateRoleData,
} from '../interfaces/administation.interface';

@Injectable()
export class AdministrationService {
  private readonly logger = new Logger(AdministrationService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly roomRepository: RoomRepository,
  ) {}

  async getPermissions(
    roomShortId: string,
  ): Promise<Record<RoomRole, Permissions>> {
    try {
      let permissions = await this.redis.getPermissions(roomShortId);

      if (!permissions || Object.keys(permissions).length === 0) {
        const room = await this.roomRepository.findByShortId(roomShortId);

        if (!room) {
          const e = Error(`Room not found ${roomShortId}`);
          this.logger.error(e);
          throw e;
        }

        const roles = ['owner', 'admin', 'participant'] as const;
        permissions = Object.fromEntries(
          roles.map((role) => [
            role,
            {
              canShareScreen:
                room.canShareScreen === 'ALL' ||
                (room.canShareScreen === 'ADMIN' && role !== 'participant') ||
                (room.canShareScreen === 'OWNER' && role === 'owner'),
              canStartPresentation:
                room.canStartPresentation === 'ALL' ||
                (room.canStartPresentation === 'ADMIN' &&
                  role !== 'participant') ||
                (room.canStartPresentation === 'OWNER' && role === 'owner'),
            },
          ]),
        ) as Record<RoomRole, Permissions>;

        await this.redis.setPermissions(roomShortId, permissions);
      }

      this.logger.debug(
        `Permissions initialized for room ${roomShortId}:`,
        permissions,
      );
      return permissions;
    } catch (e) {
      this.logger.error('initPermissions failed:', e);
      throw e;
    }
  }

  async setPermission(
    roomShortId: string,
    { targetRole, permission, value }: UpdatePermissionData,
  ) {
    return await this.redis.setPermission(
      roomShortId,
      targetRole,
      permission,
      value,
    );
  }

  async getRoles(roomShortId: string) {
    return await this.redis.getRoles(roomShortId);
  }

  async setRole(
    roomShortId: string,
    { targetUserId, newRole }: UpdateRoleData,
  ) {
    await this.redis.setRole(roomShortId, targetUserId, newRole);
  }

  async setDefaultRole(roomShortId: string, userId: string, isHost: boolean) {
    const existing = await this.redis.getRole(roomShortId, userId);
    if (!existing) {
      const defaultRole = isHost ? 'owner' : 'participant';
      await this.redis.setRole(roomShortId, userId, defaultRole);
    }
  }
}
