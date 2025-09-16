import { Module } from '@nestjs/common';
import { RoomRepository } from 'src/repositories/room.repository';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { AppJwtModule } from 'src/common/modules/jwt/jwt.module';
import { LivekitModule } from '../../common/modules/livekit/livekit.module';
import { RedisModule } from '../../common/modules/redis/redis.module';

@Module({
  imports: [AppJwtModule, LivekitModule, RedisModule],
  providers: [RoomService, RoomRepository],
  controllers: [RoomController],
})
export class RoomModule {}
