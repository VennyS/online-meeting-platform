import { Injectable } from '@nestjs/common';
import { BlacklistEntry } from '../interfaces/blacklist-entry.interface';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { LivekitService } from 'src/common/modules/livekit/livekit.service';

@Injectable()
export class BlacklistService {
  constructor(
    private readonly redis: RedisService,
    private readonly livekit: LivekitService,
  ) {}

  async getBlacklistedUsers(roomShortId: string): Promise<BlacklistEntry[]> {
    return await this.redis.getBlacklist(roomShortId);
  }

  async addToBlacklist(roomShortId: string, blacklistEntry: BlacklistEntry) {
    await this.redis.addToBlacklist(
      roomShortId,
      blacklistEntry.ip,
      blacklistEntry.name,
      blacklistEntry.userId,
    );
    await this.livekit.removeParticipant(
      roomShortId,
      String(blacklistEntry.userId),
    );
  }

  async removeFromBlacklist(roomShortId: string, ip: string) {
    await this.redis.removeFromBlacklist(roomShortId, ip);
  }
}
