import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { RoomRepository } from 'src/repositories/room.repository';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly redis: RedisService,
    private readonly roomRepository: RoomRepository,
  ) {}

  async logJoin(roomId: string, userId: string, username: string, ip: string) {
    await this.redis.logJoin(roomId, userId, username, ip);
    await this.redis.setActiveParticipant(roomId, userId, Date.now());
  }

  async logLeave(roomId: string, userId: string) {
    await this.redis.logLeave(roomId, userId);
    await this.redis.removeActiveParticipant(roomId, userId);
  }

  async saveAndClear(roomId: string) {
    const analytics = await this.redis.getMeetingAnalytics(roomId);
    const room = await this.roomRepository.findByShortId(roomId);
    if (room) {
      await this.roomRepository.bulkSaveMeetingAnalytics(room.id, analytics);
    }
    await this.redis.clearAnalytics(roomId);
  }
}
