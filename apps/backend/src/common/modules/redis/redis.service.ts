import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PostMessageResponseDto } from '../../../modules/room/dto/postMessageResponseDto';
import { Message } from '../../../modules/room/interfaces/message.interface';
import { IPresentation } from 'src/modules/waiting-room/interfaces/presentation.interface';

export type Guest = {
  guestId: string;
  name: string;
  requestedAt: string;
};

export type BlacklistEntry = {
  userId?: string;
  ip: string;
  name: string;
};

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly client: Redis) {}

  // --- Сообщения комнаты ---
  async getRoomMessages(shortId: string): Promise<Message[]> {
    const key = `room:${shortId}:messages`;
    const rawMessages = await this.client.lrange(key, 0, -1);
    return rawMessages.map((m) => JSON.parse(m));
  }

  async postRoomMessage(shortId: string, msg: PostMessageResponseDto) {
    const key = `room:${shortId}:messages`;
    await this.client.rpush(key, JSON.stringify(msg));
    await this.client.expire(key, 60 * 60 * 24); // 1 день
  }

  // --- Очередь гостей ---
  async pushWaitingGuest(roomId: string, guestInfo: any) {
    const key = `room:${roomId}:waiting`;
    await this.client.rpush(key, JSON.stringify(guestInfo));
  }

  async getWaitingGuest(
    roomId: string,
    guestId: string,
  ): Promise<Guest | undefined> {
    const waitingList = await this.getWaitingGuests(roomId);
    return waitingList.find((g) => g.guestId === guestId);
  }

  async getWaitingGuests(roomId: string): Promise<Guest[]> {
    const key = `room:${roomId}:waiting`;
    const list = await this.client.lrange(key, 0, -1);
    return list.map((item) => JSON.parse(item));
  }

  async removeGuestFromWaiting(
    roomId: string,
    guestId: string,
  ): Promise<Guest[]> {
    const waitingList = await this.getWaitingGuests(roomId);
    const updated = waitingList.filter((g) => g.guestId !== guestId);

    await this.client.del(`room:${roomId}:waiting`);
    for (const guest of updated) {
      await this.client.rpush(`room:${roomId}:waiting`, JSON.stringify(guest));
    }

    return updated;
  }

  // --- Роли ---
  async getRoles(roomId: string) {
    return this.client.hgetall(`room:${roomId}:roles`);
  }

  async setRole(roomId: string, userId: string, role: string) {
    await this.client.hset(`room:${roomId}:roles`, userId, role);
  }

  async getRole(roomId: string, userId: string) {
    return this.client.hget(`room:${roomId}:roles`, userId);
  }

  // --- Права ---
  async getPermissions(roomId: string) {
    const raw = await this.client.hgetall(`room:${roomId}:permissions`);
    const parsed: Record<string, any> = {};
    for (const [role, perms] of Object.entries(raw)) {
      try {
        parsed[role] = JSON.parse(perms as string);
      } catch {
        parsed[role] = {};
      }
    }
    return parsed;
  }

  async setPermission(
    roomId: string,
    targetRole: string,
    permission: string,
    value: any,
  ) {
    const key = `room:${roomId}:permissions`;
    const stored = await this.client.hget(key, targetRole);
    let rolePermissions = {};
    if (stored) {
      try {
        rolePermissions = JSON.parse(stored);
      } catch {}
    }
    rolePermissions[permission] = value;
    await this.client.hset(key, targetRole, JSON.stringify(rolePermissions));
    return rolePermissions;
  }

  // --- Презентация ---

  async setPresentation(
    roomId: string,
    presentation: IPresentation & { presentationId: string },
  ) {
    const key = `room:${roomId}:presentations`;
    // Проверяем, есть ли уже презентация с таким ID
    const existingPresentations = await this.getPresentations(roomId);
    const updatedPresentations = existingPresentations.filter(
      (p) => p.presentationId !== presentation.presentationId,
    );
    updatedPresentations.push(presentation);

    // Очищаем и перезаписываем список
    await this.client.del(key);
    for (const pres of updatedPresentations) {
      await this.client.rpush(key, JSON.stringify(pres));
    }
    await this.client.expire(key, 60 * 60 * 24); // 1 day TTL
    this.logger.log(
      `Set presentation ${presentation.presentationId} for room ${roomId}`,
    );
  }

  async getPresentations(roomId: string): Promise<IPresentation[]> {
    const key = `room:${roomId}:presentations`;
    const raw = await this.client.lrange(key, 0, -1);
    if (!raw || raw.length === 0) {
      this.logger.debug(`No presentations found for room ${roomId}`);
      return [];
    }
    try {
      return raw.map((item) => JSON.parse(item) as IPresentation);
    } catch (error) {
      this.logger.error(
        `Failed to parse presentations for room ${roomId}: ${error.message}`,
      );
      return [];
    }
  }

  async getPresentation(
    roomId: string,
    presentationId: string,
  ): Promise<IPresentation | null> {
    const presentations = await this.getPresentations(roomId);
    const presentation = presentations.find(
      (p) => p.presentationId === presentationId,
    );
    if (!presentation) {
      this.logger.debug(
        `Presentation ${presentationId} not found in room ${roomId}`,
      );
      return null;
    }
    return presentation;
  }

  async deletePresentation(
    roomId: string,
    presentationId: string,
  ): Promise<void> {
    const key = `room:${roomId}:presentations`;
    const presentations = await this.getPresentations(roomId);
    const updated = presentations.filter(
      (p) => p.presentationId !== presentationId,
    );

    await this.client.del(key);
    for (const pres of updated) {
      await this.client.rpush(key, JSON.stringify(pres));
    }
    this.logger.log(
      `Deleted presentation ${presentationId} from room ${roomId}`,
    );
  }

  // --- Черный список ---
  async addToBlacklist(
    roomId: string,
    ip: string,
    name: string,
    userId?: string,
  ): Promise<void> {
    const key = `room:${roomId}:blacklist`;
    const blacklist = await this.getBlacklist(roomId);
    if (blacklist.some((entry) => entry.ip === ip)) {
      this.logger.debug(`IP ${ip} already in blacklist for room ${roomId}`);
      return;
    }
    const entry: BlacklistEntry = { ip, userId, name };
    await this.client.rpush(key, JSON.stringify(entry));
    this.logger.log(
      `Added IP ${ip}${userId ? ` with userId ${userId}` : ''} to blacklist for room ${roomId}`,
    );
  }

  async removeFromBlacklist(roomId: string, ip: string): Promise<void> {
    const key = `room:${roomId}:blacklist`;
    const blacklist = await this.getBlacklist(roomId);
    const updated = blacklist.filter((entry) => entry.ip !== ip);
    await this.client.del(key);
    for (const entry of updated) {
      await this.client.rpush(key, JSON.stringify(entry));
    }
    this.logger.log(`Removed IP ${ip} from blacklist for room ${roomId}`);
  }

  async isInBlacklist(roomId: string, ip: string): Promise<boolean> {
    const blacklist = await this.getBlacklist(roomId);
    const exists = blacklist.some((entry) => entry.ip === ip);
    return exists;
  }

  async getBlacklist(roomId: string): Promise<BlacklistEntry[]> {
    const key = `room:${roomId}:blacklist`;
    const raw = await this.client.lrange(key, 0, -1);
    if (!raw || raw.length === 0) {
      this.logger.debug(`No blacklist entries found for room ${roomId}`);
      return [];
    }
    try {
      return raw.map((item) => JSON.parse(item) as BlacklistEntry);
    } catch (error) {
      this.logger.error(
        `Failed to parse blacklist for room ${roomId}: ${error.message}`,
      );
      return [];
    }
  }
}
