import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { WaitingGuestGateway } from './waiting-quest.gateway';
import { WaitingService } from '../services/waiting.service';
import { ConnectionService } from '../services/connection.service';
import { TypedSocket } from '../interfaces/socket-data.interface';

describe(WaitingGuestGateway.name, () => {
  let connectionService: MockedClass<typeof ConnectionService>;
  let waitingService: MockedClass<typeof WaitingService>;
  let waitingGuestGateway: WaitingGuestGateway;

  beforeEach(() => {
    connectionService = mockClass(ConnectionService);
    waitingService = mockClass(WaitingService);

    waitingGuestGateway = new WaitingGuestGateway(
      connectionService,
      waitingService,
    );
  });

  describe('handleConnection', () => {
    it('should message to hosts', async () => {
      const mockSocket = {
        handshake: {
          auth: {
            roomShortId: 'room123',
            username: 'testuser',
          },
        },
        emit: jest.fn(),
        data: {},
      } as unknown as TypedSocket;

      const emitMock = jest.fn();
      const toMock = jest.fn().mockReturnValue({ emit: emitMock });
      const ofMock = jest.fn().mockReturnValue({ to: toMock });

      waitingGuestGateway.server = {
        server: {
          of: ofMock,
        },
      } as any;

      waitingService.getGuests.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);

      await waitingGuestGateway.handleConnection(mockSocket);

      expect(mockSocket.data.userId).toBeDefined();
      expect(connectionService.addGuest).toHaveBeenCalledTimes(1);
      expect(waitingService.addGuest).toHaveBeenCalledTimes(1);

      expect(ofMock).toHaveBeenCalledWith('/');
      expect(toMock).toHaveBeenCalledWith('hosts-room123');
      expect(emitMock).toHaveBeenCalledWith('waiting_queue_updated', {
        guests: [{ id: 1 }, { id: 2 }],
      });
    });

    it('should disconnect if auth have not provided', async () => {
      const mockSocket = {
        handshake: {},
        data: {},
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      await waitingGuestGateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove guest', () => {
      const mockSocket = {
        data: { userId: 1, roomShortId: 'room123' },
      } as unknown as TypedSocket;

      waitingGuestGateway.handleDisconnect(mockSocket);

      expect(connectionService.removeGuest).toHaveBeenCalledWith(
        mockSocket.data.userId,
      );
      expect(waitingService.removeGuest).toHaveBeenCalledWith(
        mockSocket.data.roomShortId,
        mockSocket.data.userId,
      );
    });
  });
});
