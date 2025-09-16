import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Module({
  providers: [
    {
      provide: RedisService,
      useFactory: (config: ConfigService) => {
        const { Redis } = require('ioredis');
        return new RedisService(
          new Redis(config.getOrThrow<string>('REDIS_URL')),
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
