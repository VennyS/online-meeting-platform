import { Injectable } from '@nestjs/common';
import { Room } from '@prisma/client';
import { AddParticipantsDto } from 'src/modules/room/dto/addParticipantsDto';
import { CreateRoomDto } from 'src/modules/room/dto/createRoomDto';
import { PatchRoomDto } from 'src/modules/room/dto/patchRoomDto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByShortId(shortId: string) {
    return this.prisma.room.findUnique({ where: { shortId } });
  }

  exists(shortId: string) {
    return !this.findByShortId(shortId);
  }

  getAllByUserId(userId: number) {
    return this.prisma.room.findMany({
      orderBy: { startAt: 'desc' },
      where: { ownerId: userId },
      select: {
        id: true,
        shortId: true,
        name: true,
        description: true,
        startAt: true,
        timeZone: true,
        durationMinutes: true,
        isPublic: true,
        showHistoryToNewbies: true,
        waitingRoomEnabled: true,
        allowEarlyJoin: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        cancelled: true,
        canShareScreen: true,
        canStartPresentation: true,
      },
    });
  }

  findAllowedParticipant(roomId: number, userId: number) {
    return this.prisma.allowedParticipant.findFirst({
      where: { roomId, userId },
    });
  }

  async create(
    newRoom: CreateRoomDto & { shortId: string; passwordHash: string },
  ): Promise<Omit<Room, 'passwordHash'>> {
    const room = await this.prisma.room.create({
      data: {
        shortId: newRoom.shortId,
        ownerId: newRoom.ownerId,
        name: newRoom.name,
        description: newRoom.description,
        startAt: newRoom.startAt,
        durationMinutes: newRoom.durationMinutes,
        isPublic: newRoom.isPublic,
        showHistoryToNewbies: newRoom.showHistoryToNewbies,
        passwordHash: newRoom.passwordHash,
        waitingRoomEnabled: newRoom.waitingRoomEnabled,
        allowEarlyJoin: newRoom.allowEarlyJoin ?? true,
        timeZone: newRoom.timeZone || 'Europe/Moscow',
        canShareScreen: newRoom.canShareScreen,
        canStartPresentation: newRoom.сanStartPresentation,
      },
    });

    const { passwordHash, ...rest } = room;
    return rest;
  }

  async update(
    shortId: string,
    data: Omit<PatchRoomDto, 'password'>,
    passwordHash?: string,
  ) {
    return this.prisma.room.update({
      where: { shortId },
      data: {
        ...data,
        passwordHash,
      },
    });
  }

  async addAllowedParticipants(
    AddParticipantsDto: AddParticipantsDto,
    roomId: number,
  ) {
    const created = await this.prisma.allowedParticipant.createMany({
      data: AddParticipantsDto.userIds.map((uid) => ({
        roomId: roomId,
        userId: typeof uid === 'string' ? parseInt(uid, 10) : uid,
      })),
      skipDuplicates: true,
    });

    return created.count;
  }
}
