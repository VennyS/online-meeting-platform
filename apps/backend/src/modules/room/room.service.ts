import { ForbiddenException, Injectable } from '@nestjs/common';
import { Room } from '@prisma/client';
import { RoomRepository } from 'src/repositories/room.repository';
import { CreateRoomDto } from './dto/createRoomDto';
import bcrypt from 'bcrypt';
import { LivekitService } from '../../common/modules/livekit/livekit.service';
import { isMeetingFinished } from 'src/common/utils/room.utils';
import { Prequisites } from './interfaces/prequisites.interface';
import { RedisService } from '../../common/modules/redis/redis.service';
import { AddParticipantsDto } from './dto/addParticipantsDto';
import { AddParticipantResponseDto } from './dto/addParticipantsResponseDto';
import { PatchRoomDto } from './dto/patchRoomDto';
import { GetMeetingReportsDto } from './dto/getMeetingReportDto';
import { GetDto } from './dto/getDto';

@Injectable()
export class RoomService {
  constructor(
    private readonly roomRepo: RoomRepository,
    private readonly livekit: LivekitService,
    private readonly redis: RedisService,
  ) {}

  async getAllByUserId(userId: number): Promise<GetDto[]> {
    return await this.roomRepo.getAllByUserId(userId);
  }

  async create(createRoomDto: CreateRoomDto): Promise<GetDto> {
    let shortId: string;
    while (true) {
      shortId = Math.random().toString(36).slice(2, 10);
      const exists = await this.roomRepo.exists(shortId);
      if (!exists) break;
    }

    const passwordHash = createRoomDto.password
      ? await bcrypt.hash(createRoomDto.password, 10)
      : null;

    return await this.roomRepo.create({
      ...createRoomDto,
      shortId,
      passwordHash,
    });
  }

  async patch(room: Room, patchRoomDto: PatchRoomDto, userId: number) {
    if (room.ownerId !== userId) {
      throw new ForbiddenException('You are not allowed to update this room');
    }

    const { password, ...rest } = patchRoomDto;

    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    return await this.roomRepo.update(room.shortId, rest, passwordHash);
  }

  async getPrequisites(
    room: Room,
    userId: number | null,
    ip: string,
  ): Promise<Prequisites> {
    let numParticipants = 0;
    try {
      const participants = await this.livekit.listParticipants(room.shortId);
      numParticipants = participants.length;
    } catch (livekitError) {
      numParticipants = 0;
    }

    const isFinished = isMeetingFinished({
      startAt: room.startAt,
      durationMinutes: room.durationMinutes,
      numParticipants,
      gracePeriod: 5 * 60_000,
    });

    const isBlackListed = await this.redis.isInBlacklist(room.shortId, ip);

    const prequisites: Prequisites = {
      name: room.name,
      description: room.description,
      startAt: room.startAt,
      guestAllowed: room.isPublic,
      passwordRequired: !!room.passwordHash,
      waitingRoomEnabled: room.waitingRoomEnabled,
      allowEarlyJoin: room.allowEarlyJoin,
      isOwner: userId ? room.ownerId === userId : false,
      cancelled: room.cancelled,
      isFinished: isFinished,
      isBlackListed: isBlackListed,
    };

    return prequisites;
  }

  async addAllowedParticipants(
    room: Room,
    addParticipantsDto: AddParticipantsDto,
  ): Promise<AddParticipantResponseDto> {
    return {
      added: await this.roomRepo.addAllowedParticipants(
        addParticipantsDto,
        room.id,
      ),
    };
  }

  async getReports(room: Room): Promise<GetMeetingReportsDto> {
    return await this.roomRepo.getReports(room.id);
  }
}
