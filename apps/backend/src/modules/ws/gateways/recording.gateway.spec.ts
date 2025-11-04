import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { RecordingGateway } from './recording.gateway';
import { ConnectionService } from '../services/connection.service';
import { RecordingService } from '../services/recording.service';
import { TypedSocket } from '../interfaces/socket-data.interface';

describe(RecordingGateway.name, () => {
  let connectionService: MockedClass<typeof ConnectionService>;
  let recordingService: MockedClass<typeof RecordingService>;
  let recordingGateway: RecordingGateway;

  beforeEach(() => {
    connectionService = mockClass(ConnectionService);
    recordingService = mockClass(RecordingService);

    recordingGateway = new RecordingGateway(
      connectionService,
      recordingService,
    );
  });

  describe('recording_started', () => {
    it('return if no host', async () => {
      const mockSocket = {
        data: { isHost: false },
      } as unknown as TypedSocket;

      await recordingGateway.startRecording(mockSocket);

      expect(recordingService.startRecording).not.toHaveBeenCalled();
    });

    it('should message all', async () => {
      const data = {
        roomShortId: 'room123',
        userId: 123,
        username: 'testuser',
        isHost: true,
      };
      const mockSocket = {
        data: data,
      } as unknown as TypedSocket;

      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });

      recordingGateway.server = {
        sockets: {
          to: toMock,
        },
      } as any;

      recordingService.startRecording.mockResolvedValueOnce('egress-id');

      await recordingGateway.startRecording(mockSocket);

      expect(recordingService.startRecording).toHaveBeenLastCalledWith(
        data.roomShortId,
        data.userId,
      );
      expect(emitMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('recording_finished', () => {
    it('return if no host', async () => {
      const mockSocket = {
        data: { isHost: false },
      } as unknown as TypedSocket;

      await recordingGateway.startRecording(mockSocket);

      expect(recordingService.startRecording).not.toHaveBeenCalled();
    });

    it('should message all', async () => {
      const data = {
        roomShortId: 'room123',
        userId: 123,
        username: 'testuser',
        isHost: true,
      };
      const mockSocket = {
        data: data,
      } as unknown as TypedSocket;

      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });

      recordingGateway.server = {
        sockets: {
          to: toMock,
        },
      } as any;

      await recordingGateway.finishRecording(mockSocket, {
        egressId: 'egress-id',
      });

      expect(recordingService.stopRecording).toHaveBeenLastCalledWith(
        'egress-id',
      );
      expect(emitMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleDisconnect', () => {
    it('should stop recording', async () => {
      const mockSocket = {
        data: { userId: 1, roomShortId: 'room123', isHost: false },
      } as unknown as TypedSocket;

      recordingGateway.handleDisconnect(mockSocket);

      expect(recordingService.stopRecording).toHaveBeenCalledWith(
        mockSocket.data.userId,
      );
    });
  });
});
