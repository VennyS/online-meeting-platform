import { Module } from '@nestjs/common';
import { WaitingRoomGateway } from './waiting-room.gateway';
import { WaitingRoomService } from './waiting-room.service';
import { RedisModule } from '../../common/modules/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { LivekitModule } from '../../common/modules/livekit/livekit.module';
import { RoomRepository } from 'src/repositories/room.repository';
import { RecordingService } from 'src/modules/egress/recording.service';
import { FileModule } from '../file/file.module';

@Module({
  imports: [RedisModule, PrismaModule, LivekitModule, FileModule],
  providers: [
    WaitingRoomGateway,
    WaitingRoomService,
    RoomRepository,
    RecordingService,
  ],
})
export class WaitingRoomModule {}
