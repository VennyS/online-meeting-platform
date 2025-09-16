import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Room } from '@prisma/client';
import { LivekitTokenQueryDto } from './dto/LivekitTokenQueryDto';
import { LivekitTokenResponseDto } from './dto/LivekitTokenResponseDto';
import { createLivekitToken } from 'src/common/utils/auth.utils';
import bcrypt from 'bcrypt';
import { RoomRepository } from 'src/repositories/room.repository';

@Injectable()
export class AuthService {
  constructor(private readonly roomRepo: RoomRepository) {}

  async generateToken(
    query: LivekitTokenQueryDto,
    room: Room,
    userId: number,
    haveToken: boolean,
  ): Promise<LivekitTokenResponseDto> {
    if (!room.isPublic && !haveToken) {
      throw new UnauthorizedException(`Auth token required to join`);
    }

    const isOwner = userId === room.ownerId;

    if (isOwner) {
      const livekitToken = await createLivekitToken(
        room.shortId,
        String(userId),
        query.name,
        false,
        'owner',
      );

      return {
        token: livekitToken,
        metadata: {
          isOwner: true,
          isGuest: false,
          role: 'owner',
          name: room.name,
        },
      };
    }

    if (room.passwordHash) {
      if (!query.password) {
        throw new UnauthorizedException('Password required');
      }

      const isPasswordValid = await bcrypt.compare(
        query.password,
        room.passwordHash,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    if (!room.isPublic) {
      const allowed = await this.roomRepo.findAllowedParticipant(
        room.id,
        userId,
      );
      if (!allowed) {
        throw new ForbiddenException('Not allowed in this room');
      }
    }

    const role = isOwner ? 'owner' : 'member';
    const isGuest = !haveToken && room.isPublic;

    const livekitToken = await createLivekitToken(
      room.shortId,
      String(userId),
      query.name,
      isGuest,
      role,
    );

    return {
      token: livekitToken,
      metadata: {
        isOwner,
        isGuest,
        role,
        name: room.name,
      },
    };
  }
}
