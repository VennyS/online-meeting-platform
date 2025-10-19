import { forwardRef, Module } from '@nestjs/common';
import { WaitingRoomGateway } from './waiting-room.gateway';
import { WaitingRoomService } from './waiting-room.service';
import { RedisModule } from '../../common/modules/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { LivekitModule } from '../../common/modules/livekit/livekit.module';
import { RoomRepository } from 'src/repositories/room.repository';
import { FileModule } from '../file/file.module';
import { EgressModule } from '../egress/egress.module';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    LivekitModule,
    FileModule,
    forwardRef(() => EgressModule),
  ],
  providers: [WaitingRoomGateway, WaitingRoomService, RoomRepository],
  exports: [WaitingRoomGateway],
})
export class WaitingRoomModule {}
