import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PostMessageResponseDto } from '../../../modules/room/dto/postMessageResponseDto';
import { Message } from '../../../modules/room/interfaces/message.interface';

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

  async getWaitingGuests(roomId: string) {
    const key = `room:${roomId}:waiting`;
    const list = await this.client.lrange(key, 0, -1);
    return list.map((item) => JSON.parse(item));
  }

  async removeGuestFromWaiting(roomId: string, guestId: string) {
    const waitingList = await this.getWaitingGuests(roomId);
    const updated = waitingList.filter((g) => g.guestId !== guestId);
    await this.client.del(`room:${roomId}:waiting`);
    for (const guest of updated) {
      await this.client.rpush(`room:${roomId}:waiting`, JSON.stringify(guest));
    }
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
}
