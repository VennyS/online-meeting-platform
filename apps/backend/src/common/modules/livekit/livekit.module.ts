import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LivekitService } from './livekit.service';

@Module({
  providers: [
    {
      provide: LivekitService,
      useFactory: (config: ConfigService) => {
        const { RoomServiceClient } = require('livekit-server-sdk');
        return new LivekitService(
          new RoomServiceClient(
            config.getOrThrow<string>('LIVEKIT_URL'),
            config.getOrThrow<string>('LIVEKIT_API_KEY'),
            config.getOrThrow<string>('LIVEKIT_API_SECRET'),
          ),
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [LivekitService],
})
export class LivekitModule {}
