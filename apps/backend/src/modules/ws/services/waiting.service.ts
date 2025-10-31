import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/modules/redis/redis.service';

@Injectable()
export class WaitingService {
  constructor(private readonly redis: RedisService) {}

  async addGuest(roomShortId: string, name: string, guestId: number) {
    await this.redis.pushWaitingGuest(roomShortId, {
      guestId: String(guestId),
      name,
      requestedAt: new Date().toISOString(),
    });
  }

  async getGuests(roomShortId: string) {
    return await this.redis.getWaitingGuests(roomShortId);
  }

  async getGuest(roomShortId: string, guestId: number) {
    return await this.redis.getWaitingGuest(roomShortId, String(guestId));
  }

  async removeGuest(roomShortId: string, guestId: number) {
    return await this.redis.removeGuestFromWaiting(
      roomShortId,
      String(guestId),
    );
  }
}
