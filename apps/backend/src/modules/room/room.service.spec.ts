import * as meetingUtils from 'src/common/utils/room.utils';
import bcrypt from 'bcrypt';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/createRoomDto';
import { PermissionLevel } from '@prisma/client';
import { Room } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { AddParticipantsDto } from './dto/addParticipantsDto';
import { RoomRepository } from 'src/repositories/room.repository';
import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { LivekitService } from 'src/common/modules/livekit/livekit.service';
import { RedisService } from 'src/common/modules/redis/redis.service';

const mockRoom: Room = {
  shortId: 'room123',
  name: 'Test Room',
  description: 'Test Description',
  startAt: new Date(),
  durationMinutes: 60,
  isPublic: true,
  passwordHash: 'hash',
  waitingRoomEnabled: true,
  allowEarlyJoin: false,
  ownerId: 42,
  cancelled: false,
  finished: false,
  id: 0,
  timeZone: '',
  showHistoryToNewbies: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  canShareScreen: 'OWNER',
  canStartPresentation: 'OWNER',
};

describe(RoomService.name, () => {
  let roomService: RoomService;
  let mockRoomRepo: MockedClass<typeof RoomRepository>;
  let mockLivekit: MockedClass<typeof LivekitService>;
  let mockRedis: MockedClass<typeof RedisService>;

  beforeEach(() => {
    mockRoomRepo = mockClass(RoomRepository);
    mockLivekit = mockClass(LivekitService);
    mockRedis = mockClass(RedisService);

    roomService = new RoomService(mockRoomRepo, mockLivekit, mockRedis);
  });

  describe('checkPendingFinishedRooms', () => {
    it('should not mark room as finished if meeting is finished', async () => {
      const room = {
        shortId: 'room1',
        startAt: new Date(Date.now()),
        durationMinutes: 30,
      };

      mockRoomRepo.findPendingToFinish.mockResolvedValue([room]);
      mockLivekit.listParticipants.mockResolvedValue([{} as any]);

      jest.spyOn(meetingUtils, 'isMeetingFinished').mockReturnValue(false);

      await roomService.checkPendingFinishedRooms();

      expect(mockRoomRepo.findPendingToFinish).toHaveBeenCalled();
      expect(mockLivekit.listParticipants).toHaveBeenCalledWith('room1');
      expect(mockRoomRepo.markAsFinished).not.toHaveBeenCalledWith('room1');
    });

    it('should mark room as finished if meeting is finished', async () => {
      const room = {
        shortId: 'room1',
        startAt: new Date(Date.now() - 60 * 60 * 1000),
        durationMinutes: 30,
      };

      mockRoomRepo.findPendingToFinish.mockResolvedValue([room]);
      mockLivekit.listParticipants.mockResolvedValue([]);

      jest.spyOn(meetingUtils, 'isMeetingFinished').mockReturnValue(true);

      await roomService.checkPendingFinishedRooms();

      expect(mockRoomRepo.markAsFinished).toHaveBeenCalledWith('room1');
    });

    it('should handle Livekit errors gracefully', async () => {
      const room = {
        shortId: 'room1',
        startAt: new Date(Date.now() - 60 * 60 * 1000),
        durationMinutes: 30,
      };

      mockRoomRepo.findPendingToFinish.mockResolvedValue([room]);
      mockLivekit.listParticipants.mockRejectedValue(
        new Error('Livekit error'),
      );

      await roomService.checkPendingFinishedRooms();

      expect(mockRoomRepo.markAsFinished).toHaveBeenCalledWith('room1');
    });

    it('should handle empty pending rooms', async () => {
      mockRoomRepo.findPendingToFinish.mockResolvedValue([]);

      await roomService.checkPendingFinishedRooms();

      expect(mockLivekit.listParticipants).not.toHaveBeenCalled();
      expect(mockRoomRepo.markAsFinished).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should correct creating room', async () => {
      const createRoomDto: CreateRoomDto = {
        ownerId: 42,
        name: 'Test Meeting Room',
        description: 'Internal team sync-up meeting',
        startAt: new Date(Date.now() + 10 * 60 * 1000),
        durationMinutes: 45,
        isPublic: false,
        showHistoryToNewbies: true,
        password: 'securePass123',
        waitingRoomEnabled: true,
        allowEarlyJoin: false,
        timeZone: 'Europe/Stockholm',
        canShareScreen: PermissionLevel.OWNER,
        canStartPresentation: PermissionLevel.OWNER,
      };

      mockRoomRepo.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');

      await roomService.create(createRoomDto);

      expect(mockRoomRepo.exists).toHaveBeenCalledTimes(2);
      expect(mockRoomRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRoomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createRoomDto,
          passwordHash: 'hashed-password',
          shortId: expect.any(String),
        }),
      );
    });

    it('should handle room without password', async () => {
      const createRoomDto: CreateRoomDto = {
        ownerId: 42,
        name: 'Test Room',
        startAt: new Date(),
        durationMinutes: 30,
        isPublic: true,
        showHistoryToNewbies: false,
        waitingRoomEnabled: false,
        allowEarlyJoin: true,
        timeZone: 'UTC',
        canShareScreen: PermissionLevel.OWNER,
        canStartPresentation: PermissionLevel.OWNER,
      };

      mockRoomRepo.exists.mockResolvedValue(false);

      await roomService.create(createRoomDto);

      expect(mockRoomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: null,
        }),
      );
    });
  });

  describe('getAllByUserId', () => {
    it('should return all rooms for user', async () => {
      const userId = 42;
      const mockRooms: any[] = [
        { id: 1, name: 'Room 1' },
        { id: 2, name: 'Room 2' },
      ];

      mockRoomRepo.getAllByUserId.mockResolvedValue(mockRooms);

      const result = await roomService.getAllByUserId(userId);

      expect(mockRoomRepo.getAllByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockRooms);
    });
  });

  describe('patch', () => {
    const mockRoom: Room = {
      shortId: 'room123',
      name: 'Test Room',
      description: 'Test Description',
      startAt: new Date(),
      durationMinutes: 60,
      isPublic: true,
      passwordHash: 'hash',
      waitingRoomEnabled: true,
      allowEarlyJoin: false,
      ownerId: 42,
      cancelled: false,
      finished: false,
      id: 0,
      timeZone: '',
      showHistoryToNewbies: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      canShareScreen: 'OWNER',
      canStartPresentation: 'OWNER',
    };

    it('should update room when user is owner', async () => {
      const userId = 42;
      const patchRoomDto = { name: 'Updated Name', description: 'New desc' };

      mockRoomRepo.update.mockResolvedValue({
        ...mockRoom,
        ...patchRoomDto,
        haveFiles: true,
        haveReports: true,
      });

      await roomService.patch(mockRoom, patchRoomDto, userId);

      expect(mockRoomRepo.update).toHaveBeenCalledWith(
        'room123',
        patchRoomDto,
        undefined,
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const userId = 999;
      const patchRoomDto = { name: 'Updated Name' };

      await expect(
        roomService.patch(mockRoom, patchRoomDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should hash password when provided', async () => {
      const userId = 42;
      const patchRoomDto = { password: 'new-password' };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-password');

      await roomService.patch(mockRoom, patchRoomDto, userId);

      expect(mockRoomRepo.update).toHaveBeenCalledWith(
        'room123',
        {},
        'new-hashed-password',
      );
    });
  });

  describe('getPrequisites', () => {
    beforeEach(() => {
      mockLivekit.createRoom.mockResolvedValue(undefined);
    });

    it('should return prequisites for room owner', async () => {
      const userId = 42;
      const ip = '192.168.1.1';

      mockRedis.isInBlacklist.mockResolvedValue(false);

      const result = await roomService.getPrequisites(mockRoom, userId, ip);

      expect(mockLivekit.createRoom).toHaveBeenCalledWith(
        mockRoom.shortId,
        mockRoom.startAt,
        mockRoom.durationMinutes,
      );
      expect(result.isOwner).toBe(true);
      expect(result.isBlackListed).toBe(false);
    });

    it('should return prequisites for anonymous user', async () => {
      const userId = null;
      const ip = '192.168.1.1';

      mockRedis.isInBlacklist.mockResolvedValue(true);

      const result = await roomService.getPrequisites(mockRoom, userId, ip);

      expect(result.isOwner).toBe(false);
      expect(result.isBlackListed).toBe(true);
    });
  });

  describe('addAllowedParticipants', () => {
    it('should add allowed participants', async () => {
      const addParticipantsDto: AddParticipantsDto = {
        userIds: ['user1', 'user2'],
      };
      const expectedResponse = addParticipantsDto.userIds.length;

      mockRoomRepo.addAllowedParticipants.mockResolvedValue(expectedResponse);

      const result = await roomService.addAllowedParticipants(
        mockRoom,
        addParticipantsDto,
      );

      expect(mockRoomRepo.addAllowedParticipants).toHaveBeenCalledWith(
        addParticipantsDto,
        mockRoom.id,
      );
      expect(result).toEqual({ added: expectedResponse });
    });
  });

  describe('getReports', () => {
    it('should return meeting reports', async () => {
      const mockReports = {} as any;

      mockRoomRepo.getReports.mockResolvedValue(mockReports);

      const result = await roomService.getReports(mockRoom);

      expect(mockRoomRepo.getReports).toHaveBeenCalledWith(mockRoom.id);
      expect(result).toEqual(mockReports);
    });
  });
});
