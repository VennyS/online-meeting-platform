import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RoomRepository } from 'src/repositories/room.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AppJwtModule } from 'src/common/modules/jwt/jwt.module';

@Module({
  imports: [PrismaModule, AppJwtModule],
  providers: [AuthService, RoomRepository],
  controllers: [AuthController],
})
export class AuthModule {}
