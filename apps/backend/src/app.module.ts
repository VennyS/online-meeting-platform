import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomModule } from './modules/room/room.module';
import { WaitingRoomModule } from './modules/waiting-room/waiting-room.module';
import { FileModule } from './modules/file/file.module';
import { EgressModule } from './modules/egress/egress.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WsModule } from './modules/ws/ws.module';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    RoomModule,
    WaitingRoomModule,
    FileModule,
    EgressModule,
    ScheduleModule.forRoot(),
    WsModule,
  ],
})
export class AppModule {}
