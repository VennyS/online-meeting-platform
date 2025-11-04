import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { TypedSocket } from '../interfaces/socket-data.interface';
import { MainGateway } from './main.gateway';
import { InitService } from '../services/init.service';
import { LivekitService } from 'src/common/modules/livekit/livekit.service';
import { Mainservice } from '../services/main.service';
import { RoomInfo } from '../interfaces/room.interface';
import * as socketUtils from 'src/common/utils/socket.utils';
import { ConnectionService } from '../services/connection.service';
import { AnalyticsService } from '../services/analytics.service';

describe(MainGateway.name, () => {
  let mainGateway: MainGateway;
  let connectionService: MockedClass<typeof ConnectionService>;
  let mainService: MockedClass<typeof Mainservice>;
  let analyticsService: MockedClass<typeof AnalyticsService>;
  let livekitService: MockedClass<typeof LivekitService>;
  let init: MockedClass<typeof InitService>;

  beforeEach(() => {
    connectionService = mockClass(ConnectionService);
    mainService = mockClass(Mainservice);
    analyticsService = mockClass(AnalyticsService);
    livekitService = mockClass(LivekitService);
    init = mockClass(InitService);

    mainGateway = new MainGateway(
      connectionService,
      mainService,
      analyticsService,
      livekitService,
      init,
    );
  });

  describe('handleConnection', () => {
    it('should connect ', async () => {
      const mockSocket = {
        handshake: {
          auth: {
            roomShortId: 'room123',
            userId: 123,
            username: 'testuser',
          },
        },
        data: {},
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const roomInfo: RoomInfo = {
        name: 'room123',
        showHistoryToNewbies: true,
        isHost: false,
      };

      const { roomShortId, userId } = mockSocket.handshake.auth;

      const ip = '192.168.1.28';

      mainService.getRoomInfo.mockResolvedValue(roomInfo);
      jest.spyOn(socketUtils, 'getClientIP').mockReturnValue(ip);

      await mainGateway.handleConnection(mockSocket);

      expect(init.markNotReady).toHaveBeenCalledTimes(1);
      expect(connectionService.addRoom).toHaveBeenCalledTimes(1);
      expect(connectionService.addConnection).toHaveBeenCalledWith(userId, ip, {
        socket: mockSocket,
      });
      expect(mainService.getRoomInfo).toHaveBeenCalledWith(roomShortId, userId);
      expect(init.markReady).toHaveBeenCalledTimes(1);
      expect(analyticsService.join).toHaveBeenCalledTimes(1);
    });

    it('should disconnect if auth have not provided', async () => {
      const mockSocket = {
        handshake: {},
        data: {},
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      await mainGateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect if userId type string', async () => {
      const mockSocket = {
        handshake: {
          auth: {
            roomShortId: 'room123',
            userId: 'rwewer',
            username: 'testuser',
          },
        },
        disconnect: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      await mainGateway.handleConnection(mockSocket);
    });
  });

  describe('handleDisconnect', () => {
    it('should disconnect', async () => {
      const data = {
        roomShortId: 'room123',
        userId: 123,
        username: 'testuser',
      };

      const mockSocket = {
        data: data,
      } as unknown as TypedSocket;

      livekitService.isEmpty.mockResolvedValueOnce(false);

      await mainGateway.handleDisconnect(mockSocket);

      expect(analyticsService.leave).toHaveBeenCalledWith(
        data.roomShortId,
        String(data.userId),
      );
    });

    it('should clear analytics', async () => {
      const data = {
        roomShortId: 'room123',
        userId: 123,
        username: 'testuser',
      };

      const mockSocket = {
        data: data,
      } as unknown as TypedSocket;

      livekitService.isEmpty.mockResolvedValueOnce(true);

      await mainGateway.handleDisconnect(mockSocket);

      expect(analyticsService.leave).toHaveBeenCalledWith(
        data.roomShortId,
        String(data.userId),
      );
      expect(analyticsService.saveAndClear).toHaveBeenCalledWith(
        data.roomShortId,
      );
    });
  });
});
