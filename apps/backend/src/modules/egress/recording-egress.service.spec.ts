import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { RecordingEgressService } from './recording-egress.service';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { RoomRepository } from 'src/repositories/room.repository';
import { FileManagementService } from '../file/file-management.service';
import { RecordingGateway } from '../ws/gateways/recording.gateway';
import { EgressClient, EgressInfo } from 'livekit-server-sdk';
import { Room } from '@prisma/client';
import * as authUtils from 'src/common/utils/auth.utils';
import { Message } from '../ws/interfaces/message.interface';

describe(RecordingEgressService.name, () => {
  let fileManagementService: MockedClass<typeof FileManagementService>;
  let redis: MockedClass<typeof RedisService>;
  let roomRepo: MockedClass<typeof RoomRepository>;
  let recordingGateway: MockedClass<typeof RecordingGateway>;
  let egressClient: MockedClass<typeof EgressClient>;
  let recordingEgressService: RecordingEgressService;

  beforeEach(() => {
    fileManagementService = mockClass(FileManagementService);
    redis = mockClass(RedisService);
    roomRepo = mockClass(RoomRepository);
    recordingGateway = mockClass(RecordingGateway);
    egressClient = mockClass(EgressClient);

    recordingEgressService = new RecordingEgressService(
      fileManagementService,
      redis,
      roomRepo,
      recordingGateway,
    );

    recordingEgressService['egressClient'] = egressClient;
  });

  describe('startRecording', () => {
    it('should return if room does not exists', async () => {
      const data = {
        shortId: 'test-room',
        userId: 'test-user-id',
      };

      roomRepo.findByShortId.mockResolvedValueOnce(null);

      const result = await recordingEgressService.startRecording(
        data.shortId,
        data.userId,
      );

      expect(result).toBeUndefined();
    });

    it('should throw exception on recording error', async () => {
      const data = {
        shortId: 'test-room',
        userId: 'test-user-id',
      };

      const room = {
        shortId: 'test-room',
        id: 1,
      } as any as Room;

      const expectedError = new Error('Ошибка');

      roomRepo.findByShortId.mockResolvedValueOnce(room);
      const authUtilsSpy = jest
        .spyOn(authUtils, 'createEgressLivekitToken')
        .mockResolvedValueOnce('egress-token');

      egressClient.startWebEgress.mockImplementationOnce(() => {
        throw expectedError;
      });

      await expect(
        recordingEgressService.startRecording(data.shortId, data.userId),
      ).rejects.toThrow(expectedError);

      expect(authUtilsSpy).toHaveBeenCalledWith(room.shortId);
      expect(egressClient.startWebEgress).toHaveBeenCalledTimes(1);
    });

    it('should return egress info', async () => {
      const data = {
        shortId: 'test-room',
        userId: 'test-user-id',
      };

      const room = {
        shortId: 'test-room',
        id: 1,
      } as any as Room;

      const result = {
        egressId: 'egress-id',
      } as any as EgressInfo;

      roomRepo.findByShortId.mockResolvedValueOnce(room);
      const authUtilsSpy = jest
        .spyOn(authUtils, 'createEgressLivekitToken')
        .mockResolvedValueOnce('egress-token');

      egressClient.startWebEgress.mockResolvedValueOnce(result);

      const returned = await recordingEgressService.startRecording(
        data.shortId,
        data.userId,
      );

      expect(authUtilsSpy).toHaveBeenCalledWith(room.shortId);
      expect(egressClient.startWebEgress).toHaveBeenCalledTimes(1);
      expect(returned).toEqual(result);
    });
  });

  describe('stopRecording', () => {
    it('should throw exception on stop recording error', async () => {
      const result = {
        egressId: 'egress-id',
      } as any as EgressInfo;

      const expectedError = new Error('Ошибка');

      egressClient.stopEgress.mockImplementationOnce(() => {
        throw expectedError;
      });

      await expect(
        recordingEgressService.stopRecording(result.egressId),
      ).rejects.toThrow(expectedError);

      expect(egressClient.stopEgress).toHaveBeenCalledWith(result.egressId);
    });

    it('should return egress info', async () => {
      const result = {
        egressId: 'egress-id',
      } as any as EgressInfo;

      egressClient.stopEgress.mockResolvedValueOnce(result);

      const returned = await recordingEgressService.stopRecording(
        result.egressId,
      );

      expect(egressClient.stopEgress).toHaveBeenCalledWith(result.egressId);
      expect(returned).toEqual(result);
    });
  });

  describe('handleEgressFinished', () => {
    const mockEvent = {
      fileName: 'recording-123.mp4',
      size: 1024000,
      mimeType: 'video/mp4',
      egressId: 'egress-123',
      startTime: 1700001000000000000n,
      endTime: 1700003000000000000n,
    };

    const mockEgressData = {
      userId: 1,
      roomShortId: 'room-123',
    };

    const mockRoom = {
      id: 1,
      shortId: 'room-123',
    } as Room;

    const mockMessages: Message[] = [
      {
        createdAt: new Date(1700001000000),
        user: { firstName: 'John' },
        text: 'Hello everyone',
      },
      {
        createdAt: new Date(1700002000000),
        user: { firstName: 'Jane' },
        text: 'Hi there!',
      },
      {
        createdAt: new Date(1700004000000),
        user: { firstName: 'Bob' },
        text: 'Later message',
      },
    ] as any as Message[];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return if no egress data found', async () => {
      redis.getEgressData.mockResolvedValueOnce(null);

      await recordingEgressService.handleEgressFinished(mockEvent);

      expect(redis.getEgressData).toHaveBeenCalledWith(mockEvent.egressId);
      expect(roomRepo.findByShortId).not.toHaveBeenCalled();
      expect(fileManagementService.createFileRecord).not.toHaveBeenCalled();
    });

    it('should return if room does not exist', async () => {
      redis.getEgressData.mockResolvedValueOnce(mockEgressData);
      roomRepo.findByShortId.mockResolvedValueOnce(null);

      await recordingEgressService.handleEgressFinished(mockEvent);

      expect(roomRepo.findByShortId).toHaveBeenCalledWith(
        mockEgressData.roomShortId,
      );
      expect(fileManagementService.createFileRecord).not.toHaveBeenCalled();
    });

    it('should create file record and process messages', async () => {
      redis.getEgressData.mockResolvedValueOnce(mockEgressData);
      roomRepo.findByShortId.mockResolvedValueOnce(mockRoom);
      redis.getRoomMessages.mockResolvedValueOnce(mockMessages);
      fileManagementService.createFileRecord.mockResolvedValueOnce({
        id: 1,
      } as any);

      await recordingEgressService.handleEgressFinished(mockEvent);

      expect(fileManagementService.createFileRecord).toHaveBeenCalledWith({
        roomId: mockRoom.id,
        userId: mockEgressData.userId,
        fileKey: mockEvent.fileName,
        fileType: expect.any(String),
        fileName: mockEvent.fileName,
        fileSize: mockEvent.size,
        mimeType: mockEvent.mimeType,
      });

      expect(fileManagementService.uploadFile).toHaveBeenCalledWith(
        mockRoom.id,
        mockEgressData.userId,
        expect.objectContaining({
          originalname: 'recording-123.txt',
          mimetype: 'text/plain',
          buffer: expect.any(Buffer),
        }),
      );

      expect(redis.deleteEgressData).toHaveBeenCalledWith(
        mockEvent.egressId,
        mockEgressData.userId,
      );
    });

    it('should not create txt file if no messages in timeframe', async () => {
      redis.getEgressData.mockResolvedValueOnce(mockEgressData);
      roomRepo.findByShortId.mockResolvedValueOnce(mockRoom);
      redis.getRoomMessages.mockResolvedValueOnce([]); // no messages
      fileManagementService.createFileRecord.mockResolvedValueOnce({
        id: 1,
      } as any);

      await recordingEgressService.handleEgressFinished(mockEvent);

      expect(fileManagementService.uploadFile).not.toHaveBeenCalled();
    });

    it('should notify user about storage overflow', async () => {
      redis.getEgressData.mockResolvedValueOnce(mockEgressData);
      roomRepo.findByShortId.mockResolvedValueOnce(mockRoom);
      redis.getRoomMessages.mockResolvedValueOnce([]);
      fileManagementService.createFileRecord.mockResolvedValueOnce({
        id: 1,
      } as any);
      fileManagementService.getTotalFileSizeByUser.mockResolvedValueOnce(2048); // > 1024

      await recordingEgressService.handleEgressFinished(mockEvent);

      expect(recordingGateway.sendToUser).toHaveBeenCalledWith(
        String(mockEgressData.userId),
        'recording_storage_overflow',
        {
          totalVideoSize: 2048,
          constraint: 1024,
          causedById: 1,
        },
      );
    });

    it('should not notify user if storage within limit', async () => {
      redis.getEgressData.mockResolvedValueOnce(mockEgressData);
      roomRepo.findByShortId.mockResolvedValueOnce(mockRoom);
      redis.getRoomMessages.mockResolvedValueOnce([]);
      fileManagementService.createFileRecord.mockResolvedValueOnce({
        id: 1,
      } as any);
      fileManagementService.getTotalFileSizeByUser.mockResolvedValueOnce(512); // < 1024

      await recordingEgressService.handleEgressFinished(mockEvent);

      expect(recordingGateway.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle case when userId is null', async () => {
      const egressDataWithoutUser = { ...mockEgressData, userId: 0 };
      redis.getEgressData.mockResolvedValueOnce(egressDataWithoutUser);
      roomRepo.findByShortId.mockResolvedValueOnce(mockRoom);
      redis.getRoomMessages.mockResolvedValueOnce(mockMessages);
      fileManagementService.createFileRecord.mockResolvedValueOnce({
        id: 1,
      } as any);

      await recordingEgressService.handleEgressFinished(mockEvent);

      expect(fileManagementService.createFileRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 0, // default value
        }),
      );

      expect(
        fileManagementService.getTotalFileSizeByUser,
      ).not.toHaveBeenCalled();
      expect(recordingGateway.sendToUser).not.toHaveBeenCalled();
    });

    it('should filter messages by recording timeframe correctly', async () => {
      redis.getEgressData.mockResolvedValueOnce(mockEgressData);
      roomRepo.findByShortId.mockResolvedValueOnce(mockRoom);
      redis.getRoomMessages.mockResolvedValueOnce(mockMessages);
      fileManagementService.createFileRecord.mockResolvedValueOnce({
        id: 1,
      } as any);

      await recordingEgressService.handleEgressFinished(mockEvent);

      // Проверяем что был создан txt файл только с сообщениями в timeframe
      const uploadedFile = fileManagementService.uploadFile.mock.calls[0][2];
      const fileContent = uploadedFile.buffer.toString();

      expect(fileContent).toContain('John: Hello everyone');
      expect(fileContent).toContain('Jane: Hi there!');
      expect(fileContent).not.toContain('Bob: Later message'); // outside timeframe
    });
  });
});
