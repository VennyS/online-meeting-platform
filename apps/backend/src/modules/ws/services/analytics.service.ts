import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { RoomRepository } from 'src/repositories/room.repository';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly redis: RedisService,
    private readonly roomRepository: RoomRepository,
  ) {}

  join(roomShortId: string, userId: string, username: string, ip: string) {
    this.redis.logJoin(roomShortId, userId, username, ip);
  }

  leave(roomShortId: string, userId: string) {
    this.redis.logLeave(roomShortId, userId);
  }

  async saveAndClear(roomShortId: string) {
    const analytics = await this.redis.getMeetingAnalytics(roomShortId);
    const room = await this.roomRepository.findByShortId(roomShortId);
    if (room) {
      await this.roomRepository.bulkSaveMeetingAnalytics(room.id, analytics);
    }
    await this.redis.clearAnalytics(roomShortId);
  }
}
