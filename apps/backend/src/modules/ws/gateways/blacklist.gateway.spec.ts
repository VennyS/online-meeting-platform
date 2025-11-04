import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { BlacklistGateway } from './blacklist.gateway';
import { BlacklistService } from '../services/blacklist.service';
import { ConnectionService } from '../services/connection.service';
import { InitService } from '../services/init.service';
import { TypedSocket } from '../interfaces/socket-data.interface';
import { AddToBlacklistDto } from '../dto/blacklist.dto';
import * as socketUtils from 'src/common/utils/socket.utils';
import { BlacklistEntry } from '../interfaces/blacklist-entry.interface';

describe(BlacklistGateway.name, () => {
  let connectionService: MockedClass<typeof ConnectionService>;
  let blacklistService: MockedClass<typeof BlacklistService>;
  let init: MockedClass<typeof InitService>;

  let blacklistGateway: BlacklistGateway;

  beforeEach(() => {
    connectionService = mockClass(ConnectionService);
    blacklistService = mockClass(BlacklistService);
    init = mockClass(InitService);

    blacklistGateway = new BlacklistGateway(
      connectionService,
      blacklistService,
      init,
    );
  });

  describe('handleConnection', () => {
    it('should return if no host', async () => {
      const mockSocket = {
        handshake: {},
        data: { isHost: false },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      await blacklistGateway.handleConnection(mockSocket);

      expect(blacklistService.getBlacklistedUsers).not.toHaveBeenCalled();
    });

    it('should return if blacklist empty', async () => {
      const mockSocket = {
        handshake: {},
        data: { isHost: true, roomShortId: 'room-1' },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const blacklist = [];

      blacklistService.getBlacklistedUsers.mockResolvedValueOnce(blacklist);

      await blacklistGateway.handleConnection(mockSocket);

      expect(blacklistService.getBlacklistedUsers).toHaveBeenCalledWith(
        mockSocket.data.roomShortId,
      );
      expect(mockSocket.emit).not.toHaveBeenCalledWith('blacklist_init', {
        blacklist: blacklist,
      });
    });

    it('should send blacklist', async () => {
      const mockSocket = {
        handshake: {},
        data: { isHost: true, roomShortId: 'room-1' },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const blacklist = [{ userId: 1, ip: '192.168.1.28', name: 'user-1' }];

      blacklistService.getBlacklistedUsers.mockResolvedValueOnce(blacklist);

      await blacklistGateway.handleConnection(mockSocket);

      expect(blacklistService.getBlacklistedUsers).toHaveBeenCalledWith(
        mockSocket.data.roomShortId,
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('blacklist_init', {
        blacklist: blacklist,
      });
    });
  });

  describe('add_to_blacklist', () => {
    it('should return if no host', async () => {
      const mockSocket = {
        handshake: {},
        data: { isHost: false, userId: 2, roomShortId: 'room-1' },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const data: AddToBlacklistDto = {
        userId: 1,
        name: 'test-user',
      };

      await blacklistGateway.addToBlackList(data, mockSocket);

      expect(connectionService.getConnection).not.toHaveBeenCalled();
    });

    it('should return if no excluded user found', async () => {
      const mockSocket = {
        handshake: {},
        data: { isHost: true, userId: 2, roomShortId: 'room-1' },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const data: AddToBlacklistDto = {
        userId: 1,
        name: 'test-user',
      };

      connectionService.getConnection.mockReturnValueOnce(undefined);

      await blacklistGateway.addToBlackList(data, mockSocket);

      expect(connectionService.getConnection).toHaveBeenCalledTimes(1);
      expect(blacklistService.addToBlacklist).not.toHaveBeenCalled();
    });

    it('should return if error occuried during adding to blacklist', async () => {
      const mockSocket = {
        handshake: {},
        data: { isHost: true, userId: 2, roomShortId: 'room-1' },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const data: AddToBlacklistDto = {
        userId: 1,
        name: 'test-user',
      };

      connectionService.getConnection.mockReturnValue({
        socket: {
          data: { roomShortId: 'room-1' },
        } as any,
      });
      blacklistService.addToBlacklist.mockImplementationOnce(() => {
        throw Error('Ошибка');
      });

      const emitMock = jest.fn();
      const toMock = jest.fn(() => ({ emit: emitMock }));

      (blacklistGateway as any).server = {
        to: toMock,
      };

      jest.spyOn(socketUtils, 'extractIp').mockReturnValueOnce('ip');

      await blacklistGateway.addToBlackList(data, mockSocket);

      expect(connectionService.getConnection).toHaveBeenCalled();
      expect(blacklistService.addToBlacklist).toHaveBeenCalled();
      expect(emitMock).not.toHaveBeenCalled();
    });

    it('should notify hosts', async () => {
      const mockSocket = {
        handshake: {},
        data: { isHost: true, userId: 2, roomShortId: 'room-1' },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const data: AddToBlacklistDto = {
        userId: 1,
        name: 'test-user',
      };

      connectionService.getConnection.mockReturnValue({
        socket: {
          data: { roomShortId: 'room-1' },
        } as any,
      });

      jest.spyOn(socketUtils, 'extractIp').mockReturnValueOnce('ip');

      const emitMock = jest.fn();
      const toMock = jest.fn(() => ({ emit: emitMock }));

      (blacklistGateway as any).server = {
        to: toMock,
      };

      await blacklistGateway.addToBlackList(data, mockSocket);

      expect(connectionService.getConnection).toHaveBeenCalled();
      expect(blacklistService.addToBlacklist).toHaveBeenCalled();
      expect(emitMock).toHaveBeenCalled();
    });
  });

  describe('remove_from_blacklist', () => {
    it('should return if no host', async () => {
      const mockSocket = {
        handshake: {},
        data: { isHost: false, userId: 2, roomShortId: 'room-1' },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const data: Pick<BlacklistEntry, 'ip'> = {
        ip: 'ip',
      };

      await blacklistGateway.removeFromBlacklist(data, mockSocket);

      expect(blacklistService.removeFromBlacklist).not.toHaveBeenCalled();
    });
  });

  it('should return if error occuried', async () => {
    const mockSocket = {
      handshake: {},
      data: { isHost: true, userId: 2, roomShortId: 'room-1' },
      disconnect: jest.fn(),
      join: jest.fn(),
      emit: jest.fn(),
    } as unknown as TypedSocket;

    const data: Pick<BlacklistEntry, 'ip'> = {
      ip: 'ip',
    };

    blacklistService.removeFromBlacklist.mockImplementationOnce(() => {
      throw Error('Ошибка');
    });

    const emitMock = jest.fn();
    const toMock = jest.fn(() => ({ emit: emitMock }));

    (blacklistGateway as any).server = {
      to: toMock,
    };

    await blacklistGateway.removeFromBlacklist(data, mockSocket);

    expect(blacklistService.removeFromBlacklist).toHaveBeenCalledWith(
      mockSocket.data.roomShortId,
      data.ip,
    );
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('should notify hosts', async () => {
    const mockSocket = {
      handshake: {},
      data: { isHost: true, userId: 2, roomShortId: 'room-1' },
      disconnect: jest.fn(),
      join: jest.fn(),
      emit: jest.fn(),
    } as unknown as TypedSocket;

    const data: Pick<BlacklistEntry, 'ip'> = {
      ip: 'ip',
    };

    const emitMock = jest.fn();
    const toMock = jest.fn(() => ({ emit: emitMock }));

    (blacklistGateway as any).server = {
      to: toMock,
    };

    await blacklistGateway.removeFromBlacklist(data, mockSocket);

    expect(blacklistService.removeFromBlacklist).toHaveBeenCalledWith(
      mockSocket.data.roomShortId,
      data.ip,
    );
    expect(emitMock).toHaveBeenCalled();
  });
});
