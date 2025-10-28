import { Module } from '@nestjs/common';
import { MainGateway } from './gateways/main.gateway';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatService } from './services/chat.service';
import { RedisModule } from 'src/common/modules/redis/redis.module';
import { ConnectionService } from './services/connection.service';
import { Mainservice } from './services/main.service';
import { BlacklistGateway } from './gateways/blacklist.gateway';
import { BlacklistService } from './services/blacklist.service';
import { RecordingGateway } from './gateways/recording.gateway';
import { RoomRepository } from 'src/repositories/room.repository';
import { RecordingService } from './services/recording.service';
import { LivekitModule } from 'src/common/modules/livekit/livekit.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EgressModule } from '../egress/egress.module';
import { AdministrationGateway } from './gateways/administration.gateway';
import { AdministrationService } from './services/administration.service';
import { PresentationGateway } from './gateways/presentation.gateway';
import { PresentationService } from './services/presentation.service';
import { WaitingGuestGateway } from './gateways/waiting-quest.gateway';
import { WaitingHostGateway } from './gateways/waiting-host.gateway';
import { WaitingService } from './services/waiting.service';

@Module({
  imports: [RedisModule, PrismaModule, LivekitModule, EgressModule],
  providers: [
    MainGateway,
    Mainservice,
    ChatGateway,
    ChatService,
    BlacklistGateway,
    BlacklistService,
    RecordingGateway,
    RecordingService,
    AdministrationGateway,
    AdministrationService,
    PresentationGateway,
    PresentationService,
    WaitingGuestGateway,
    WaitingHostGateway,
    WaitingService,
    ConnectionService,
    RoomRepository,
  ],
})
export class WsModule {}
