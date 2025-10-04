import { Injectable } from '@nestjs/common';
import { AddParticipantsDto } from 'src/modules/room/dto/addParticipantsDto';
import { CreateRoomDto } from 'src/modules/room/dto/createRoomDto';
import { GetDto } from 'src/modules/room/dto/getDto';
import {
  GetMeetingReportsDto,
  MeetingReportDto,
  ParticipantDto,
  ParticipantSessionDto,
} from 'src/modules/room/dto/getMeetingReportDto';
import { PatchRoomDto } from 'src/modules/room/dto/patchRoomDto';
import { PrismaService } from 'src/prisma/prisma.service';

export interface BulkMeetingAnalyticsDto {
  sessions: BulkMeetingSessionDto[];
}

export interface BulkMeetingSessionDto {
  startTime: string;
  endTime?: string;
  duration?: number;
  participants: BulkParticipantDto[];
}

export interface BulkParticipantDto {
  userId: number;
  name: string;
  sessions: BulkParticipantSessionDto[];
}

export interface BulkParticipantSessionDto {
  joinTime: string;
  leaveTime?: string;
}

@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByShortId(shortId: string) {
    return this.prisma.room.findUnique({ where: { shortId } });
  }

  exists(shortId: string) {
    return !this.findByShortId(shortId);
  }

  async getAllByUserId(userId: number): Promise<GetDto[]> {
    return this.prisma.room
      .findMany({
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
          _count: {
            select: {
              files: true,
              sessions: true,
            },
          },
        },
      })
      .then((rooms) =>
        rooms.map(({ _count, ...room }) => ({
          ...room,
          haveFiles: _count.files > 0,
          haveReports: _count.sessions > 0,
        })),
      );
  }

  findAllowedParticipant(roomId: number, userId: number) {
    return this.prisma.allowedParticipant.findFirst({
      where: { roomId, userId },
    });
  }

  async create(
    newRoom: CreateRoomDto & { shortId: string; passwordHash: string },
  ): Promise<GetDto> {
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
        canStartPresentation: newRoom.canStartPresentation,
      },
      include: {
        _count: {
          select: {
            files: true,
            sessions: true,
          },
        },
      },
    });

    const { passwordHash, _count, ...rest } = room;
    return {
      ...rest,
      haveFiles: _count.files > 0,
      haveReports: _count.sessions > 0,
    };
  }

  async update(
    shortId: string,
    data: Omit<PatchRoomDto, 'password'>,
    passwordHash?: string,
  ): Promise<GetDto> {
    const room = await this.prisma.room.update({
      where: { shortId },
      data: {
        ...data,
        passwordHash,
      },
      include: {
        _count: {
          select: {
            files: true,
            sessions: true,
          },
        },
      },
    });

    const { passwordHash: _, _count, ...rest } = room;

    return {
      ...rest,
      haveFiles: _count.files > 0,
      haveReports: _count.sessions > 0,
    };
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

  async getReports(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        sessions: {
          include: {
            participants: {
              select: {
                id: true,
                userId: true,
                name: true,
                sessions: {
                  select: {
                    joinTime: true,
                    leaveTime: true,
                    meetingSessionId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new Error(`Room with ID ${roomId} not found`);
    }

    // Преобразуем данные в DTO
    const roomMeetingsDto: GetMeetingReportsDto = {
      sessions: room.sessions.map(
        (session): MeetingReportDto => ({
          id: session.id,
          roomId: session.roomId,
          startTime: session.startTime.toISOString(),
          endTime: session.endTime?.toISOString(),
          duration: session.duration ?? undefined,
          participants: session.participants.map(
            (participant): ParticipantDto => ({
              id: participant.id,
              userId: participant.userId,
              name: participant.name,
              sessions: participant.sessions
                .filter((s) => s.meetingSessionId === session.id)
                .map(
                  (s): ParticipantSessionDto => ({
                    joinTime: s.joinTime.toISOString(),
                    leaveTime: s.leaveTime?.toISOString(),
                  }),
                ),
            }),
          ),
        }),
      ),
    };

    return roomMeetingsDto;
  }

  async bulkSaveMeetingAnalytics(
    roomId: number,
    analyticsData: BulkMeetingAnalyticsDto,
  ) {
    // Проверяем существование комнаты
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new Error(`Room with ID ${roomId} not found`);
    }

    // Используем транзакцию для пачечной записи
    await this.prisma.$transaction(async (tx) => {
      // Создаём MeetingSession
      const meetingSessionsData = analyticsData.sessions.map((session) => ({
        roomId,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : null,
        duration: session.duration ?? null,
      }));

      await tx.meetingSession.createMany({
        data: meetingSessionsData,
        skipDuplicates: true,
      });

      // Получаем созданные сессии для ID
      const sessionRecords = await tx.meetingSession.findMany({
        where: {
          roomId,
          startTime: { in: meetingSessionsData.map((s) => s.startTime) },
        },
        select: { id: true, startTime: true },
      });

      // Подготовка данных для Participant и ParticipantSession
      const participantData: { userId: number; name: string }[] = [];
      const participantSessionData: {
        participantId: number;
        meetingSessionId: number;
        joinTime: Date;
        leaveTime: Date | null;
      }[] = [];
      const participantConnections: {
        meetingSessionId: number;
        participantId: number;
      }[] = [];

      // Собираем уникальных участников
      const uniqueParticipants = new Map<number, string>();
      for (const session of analyticsData.sessions) {
        for (const participant of session.participants) {
          if (!uniqueParticipants.has(participant.userId)) {
            uniqueParticipants.set(participant.userId, participant.name);
          }
        }
      }

      // Подготовка данных для upsert участников
      for (const [userId, name] of uniqueParticipants) {
        participantData.push({ userId, name });
      }

      // Upsert всех участников
      const participantPromises = participantData.map((p) =>
        tx.participant.upsert({
          where: { userId: p.userId },
          update: { name: p.name },
          create: { userId: p.userId, name: p.name },
          select: { id: true, userId: true },
        }),
      );
      const participants = await Promise.all(participantPromises);
      const participantMap = new Map(participants.map((p) => [p.userId, p.id]));

      // Собираем ParticipantSession и связи
      for (const [index, session] of analyticsData.sessions.entries()) {
        const sessionRecord = sessionRecords[index];
        if (!sessionRecord) continue;

        for (const participant of session.participants) {
          const participantId = participantMap.get(participant.userId);
          if (!participantId) continue;

          // Добавляем связь MeetingSession-Participant
          participantConnections.push({
            meetingSessionId: sessionRecord.id,
            participantId,
          });

          // Собираем ParticipantSession
          for (const sessionEntry of participant.sessions) {
            participantSessionData.push({
              participantId,
              meetingSessionId: sessionRecord.id,
              joinTime: new Date(sessionEntry.joinTime),
              leaveTime: sessionEntry.leaveTime
                ? new Date(sessionEntry.leaveTime)
                : null,
            });
          }
        }
      }

      // Пачечная запись ParticipantSession
      if (participantSessionData.length > 0) {
        await tx.participantSession.createMany({
          data: participantSessionData,
          skipDuplicates: true,
        });
      }

      // Пачечное подключение участников к сессиям
      for (const connection of participantConnections) {
        await tx.meetingSession.update({
          where: { id: connection.meetingSessionId },
          data: {
            participants: {
              connect: { id: connection.participantId },
            },
          },
        });
      }
    });
  }
}
