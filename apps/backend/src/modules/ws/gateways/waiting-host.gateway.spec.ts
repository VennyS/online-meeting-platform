import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { WaitingHostGateway } from './waiting-host.gateway';
import { ConnectionService } from '../services/connection.service';
import { InitService } from '../services/init.service';
import { WaitingService } from '../services/waiting.service';
import { TypedSocket } from '../interfaces/socket-data.interface';
import * as authUtils from 'src/common/utils/auth.utils';

describe(WaitingHostGateway.name, () => {
  let connectionService: MockedClass<typeof ConnectionService>;
  let waitingService: MockedClass<typeof WaitingService>;
  let init: MockedClass<typeof InitService>;
  let waitingHostGateway: WaitingHostGateway;

  beforeEach(() => {
    connectionService = mockClass(ConnectionService);
    waitingService = mockClass(WaitingService);
    init = mockClass(InitService);

    waitingHostGateway = new WaitingHostGateway(
      connectionService,
      waitingService,
      init,
    );
  });

  describe('handleConnection', () => {
    it('should return if no host', async () => {
      const data = { roomShortId: 'room123', isHost: false };

      const mockSocket = {
        data: data,
      } as unknown as TypedSocket;

      const notifyHostSpy = jest.spyOn(waitingHostGateway, 'notifyHost');

      await waitingHostGateway.handleConnection(mockSocket);

      expect(init.waitForReady).toHaveBeenCalled();
      expect(notifyHostSpy).not.toHaveBeenCalled();
    });

    it('should notify host', async () => {
      const data = { roomShortId: 'room123', isHost: true };

      const mockSocket = {
        data: data,
      } as unknown as TypedSocket;

      waitingHostGateway.server = {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      } as any;

      const notifyHostSpy = jest.spyOn(waitingHostGateway, 'notifyHost');
      waitingService.getGuest.mockResolvedValue([] as any);

      await waitingHostGateway.handleConnection(mockSocket);

      expect(init.waitForReady).toHaveBeenCalled();
      expect(notifyHostSpy).toHaveBeenCalled();
    });
  });

  describe('approveGuest', () => {
    let mockSocket: TypedSocket;
    let mockGuestConnection: any;
    let createLivekitToken = jest.spyOn(authUtils, 'createLivekitToken');

    beforeEach(() => {
      mockSocket = {
        data: {
          roomShortId: 'room123',
          userId: 'host123',
          isHost: true,
        },
        emit: jest.fn(),
      } as unknown as TypedSocket;

      mockGuestConnection = {
        socket: {
          emit: jest.fn(),
        },
      };

      connectionService.getGuest.mockReturnValue(mockGuestConnection);
      waitingService.getGuest.mockResolvedValue({
        guestId: '1',
        name: 'Test Guest',
        requestedAt: Date(),
      });
      waitingService.removeGuest.mockResolvedValue({} as any);
      connectionService.removeGuest.mockReturnValue(undefined);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return if user is not host', async () => {
      mockSocket.data.isHost = false;

      await waitingHostGateway.approveGuest(
        { guestId: 1, approved: true },
        mockSocket,
      );

      expect(waitingService.getGuest).not.toHaveBeenCalled();
      expect(connectionService.getGuest).not.toHaveBeenCalled();
    });

    it('should return if guest connection not found', async () => {
      connectionService.getGuest.mockReturnValue(undefined);

      await waitingHostGateway.approveGuest(
        { guestId: 1, approved: true },
        mockSocket,
      );

      expect(waitingService.getGuest).not.toHaveBeenCalled();
      expect(mockGuestConnection.socket.emit).not.toHaveBeenCalled();
    });

    it('should return if guest not found in cache', async () => {
      waitingService.getGuest.mockResolvedValue(undefined);

      await waitingHostGateway.approveGuest(
        { guestId: 1, approved: true },
        mockSocket,
      );

      expect(connectionService.removeGuest).not.toHaveBeenCalled();
      expect(waitingService.removeGuest).not.toHaveBeenCalled();
      expect(mockGuestConnection.socket.emit).not.toHaveBeenCalled();
    });

    it('should approve guest and send token when approved is true', async () => {
      const mockToken = 'mock-livekit-token';

      createLivekitToken.mockResolvedValue(mockToken);

      const notifyHostSpy = jest
        .spyOn(waitingHostGateway, 'notifyHost')
        .mockResolvedValue();

      await waitingHostGateway.approveGuest(
        { guestId: 1, approved: true },
        mockSocket,
      );

      expect(waitingService.removeGuest).toHaveBeenCalledWith('room123', 1);
      expect(connectionService.removeGuest).toHaveBeenCalledWith(1);
      expect(notifyHostSpy).toHaveBeenCalledWith('room123');
      expect(mockGuestConnection.socket.emit).toHaveBeenCalledWith(
        'guest_approved',
        {
          token: mockToken,
          guestId: 1,
        },
      );
      expect(createLivekitToken).toHaveBeenCalledWith(
        'room123',
        '1',
        'Test Guest',
        true,
        'guest',
      );
    });

    it('should reject guest when approved is false', async () => {
      const notifyHostSpy = jest
        .spyOn(waitingHostGateway, 'notifyHost')
        .mockResolvedValue();

      await waitingHostGateway.approveGuest(
        { guestId: 1, approved: false },
        mockSocket,
      );

      expect(waitingService.removeGuest).toHaveBeenCalledWith('room123', 1);
      expect(connectionService.removeGuest).toHaveBeenCalledWith(1);
      expect(notifyHostSpy).toHaveBeenCalledWith('room123');
      expect(mockGuestConnection.socket.emit).toHaveBeenCalledWith(
        'guest_rejected',
      );
      expect(createLivekitToken).not.toHaveBeenCalled();
    });

    it('should handle errors during token creation', async () => {
      waitingHostGateway.server = {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      } as any;

      await waitingHostGateway.approveGuest(
        { guestId: 1, approved: true },
        mockSocket,
      );

      expect(mockGuestConnection.socket.emit).not.toHaveBeenCalledWith(
        'guest_approved',
      );
    });
  });
});
