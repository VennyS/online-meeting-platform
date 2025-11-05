import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { AdministrationService } from '../services/administration.service';
import { InitService } from '../services/init.service';
import { AdministrationGateway } from '../gateways/administration.gateway';
import { LivekitService } from 'src/common/modules/livekit/livekit.service';
import { AnalyticsService } from '../services/analytics.service';
import { BlacklistService } from '../services/blacklist.service';
import { ChatService } from '../services/chat.service';
import { ConnectionService } from '../services/connection.service';
import { Mainservice } from '../services/main.service';
import { PresentationService } from '../services/presentation.service';
import { BlacklistGateway } from '../gateways/blacklist.gateway';
import { ChatGateway } from '../gateways/chat.gateway';
import { MainGateway } from '../gateways/main.gateway';
import { PresentationGateway } from '../gateways/presentation.gateway';
import { TypedSocket } from '../interfaces/socket-data.interface';

describe('cross gateways actions', () => {
  let initMock: MockedClass<typeof InitService>;
  let administationService: MockedClass<typeof AdministrationService>;
  let connectionService: MockedClass<typeof ConnectionService>;
  let blacklistService: MockedClass<typeof BlacklistService>;
  let chatService: MockedClass<typeof ChatService>;
  let mainService: MockedClass<typeof Mainservice>;
  let analyticsService: MockedClass<typeof AnalyticsService>;
  let livekitService: MockedClass<typeof LivekitService>;
  let presentationService: MockedClass<typeof PresentationService>;

  let mainGateway: MainGateway;
  let administrationGateway: AdministrationGateway;
  let blacklistGateway: BlacklistGateway;
  let chatGateway: ChatGateway;
  let presentationGateway: PresentationGateway;

  let socket: TypedSocket;

  // Хелперы для создания сокетов
  const createSocket = (id: string, userId: string = 'user-1'): TypedSocket =>
    ({
      id,
      handshake: {
        auth: {
          roomShortId: 'room123',
          userId,
          username: `user-${userId}`,
        },
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      },
      disconnect: jest.fn(),
      emit: jest.fn(),
      data: { isHost: true },
      join: jest.fn(),
    }) as any;

  const createReadyPromise = () => {
    let resolveReady!: () => void;
    const readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    return { readyPromise, resolveReady };
  };

  const expectAllServicesNotCalled = () => {
    expect(administationService.setDefaultRole).not.toHaveBeenCalled();
    expect(blacklistService.getBlacklistedUsers).not.toHaveBeenCalled();
    expect(connectionService.getMetadata).not.toHaveBeenCalled();
    expect(presentationService.get).not.toHaveBeenCalled();
  };

  const expectAllServicesCalledOnce = () => {
    expect(administationService.setDefaultRole).toHaveBeenCalledTimes(1);
    expect(blacklistService.getBlacklistedUsers).toHaveBeenCalledTimes(1);
    expect(connectionService.getMetadata).toHaveBeenCalledTimes(1);
    expect(presentationService.get).toHaveBeenCalledTimes(1);
  };

  const clearAllServiceMocks = () => {
    administationService.setDefaultRole.mockClear();
    blacklistService.getBlacklistedUsers.mockClear();
    connectionService.getMetadata.mockClear();
    presentationService.get.mockClear();
  };

  const callAllGatewayConnections = (socket: TypedSocket) => {
    administrationGateway.handleConnection(socket);
    blacklistGateway.handleConnection(socket);
    chatGateway.handleConnection(socket);
    presentationGateway.handleConnection(socket);
  };

  beforeEach(() => {
    initMock = mockClass(InitService);
    administationService = mockClass(AdministrationService);
    connectionService = mockClass(ConnectionService);
    blacklistService = mockClass(BlacklistService);
    chatService = mockClass(ChatService);
    mainService = mockClass(Mainservice);
    analyticsService = mockClass(AnalyticsService);
    livekitService = mockClass(LivekitService);
    presentationService = mockClass(PresentationService);

    mainGateway = new MainGateway(
      connectionService,
      mainService,
      analyticsService,
      livekitService,
      initMock,
    );
    administrationGateway = new AdministrationGateway(
      administationService,
      initMock,
    );
    blacklistGateway = new BlacklistGateway(
      connectionService,
      blacklistService,
      initMock,
    );
    chatGateway = new ChatGateway(chatService, connectionService, initMock);
    presentationGateway = new PresentationGateway(
      presentationService,
      initMock,
    );

    socket = createSocket('test-socket-id', '123');

    mainService.getRoomInfo.mockResolvedValue({
      isHost: true,
      name: 'Test Room',
      showHistoryToNewbies: true,
    });
  });

  describe('initMock service ready state', () => {
    describe('single socket scenarios', () => {
      it('should not handle connections before ready', async () => {
        const { readyPromise } = createReadyPromise();
        initMock.waitForReady.mockReturnValue(readyPromise);

        mainGateway.handleConnection(socket);
        expect(initMock.markNotReady).toHaveBeenCalledWith(socket.id);

        await new Promise((resolve) => setTimeout(resolve, 10));
        callAllGatewayConnections(socket);
        await new Promise((resolve) => setTimeout(resolve, 10));

        expectAllServicesNotCalled();
      });

      it('should handle connections after ready', async () => {
        const { readyPromise, resolveReady } = createReadyPromise();
        initMock.waitForReady.mockReturnValue(readyPromise);

        const mainPromise = mainGateway.handleConnection(socket);
        expect(initMock.markNotReady).toHaveBeenCalledWith(socket.id);

        await new Promise((resolve) => setTimeout(resolve, 10));
        callAllGatewayConnections(socket);
        await new Promise((resolve) => setTimeout(resolve, 10));

        expectAllServicesNotCalled();

        resolveReady();
        await mainPromise;
        await new Promise((resolve) => setTimeout(resolve, 10));

        expectAllServicesCalledOnce();
      });
    });

    describe('multiple sockets scenarios', () => {
      it('should handle sockets independently - one ready, one not', async () => {
        const socket1 = createSocket('socket-1', 'user-1');
        const socket2 = createSocket('socket-2', 'user-2');

        const { readyPromise: readyPromise1, resolveReady: resolveReady1 } =
          createReadyPromise();
        const { readyPromise: readyPromise2, resolveReady: resolveReady2 } =
          createReadyPromise();

        initMock.waitForReady.mockImplementation((socketId: string) => {
          if (socketId === 'socket-1') return readyPromise1;
          if (socketId === 'socket-2') return readyPromise2;
          return Promise.resolve();
        });

        // Запускаем оба подключения
        const mainPromise1 = mainGateway.handleConnection(socket1);
        const mainPromise2 = mainGateway.handleConnection(socket2);

        expect(initMock.markNotReady).toHaveBeenCalledWith('socket-1');
        expect(initMock.markNotReady).toHaveBeenCalledWith('socket-2');

        callAllGatewayConnections(socket1);
        callAllGatewayConnections(socket2);
        await new Promise((resolve) => setTimeout(resolve, 10));

        expectAllServicesNotCalled();

        // Делаем ready только socket-1
        resolveReady1();
        await mainPromise1;
        await new Promise((resolve) => setTimeout(resolve, 10));

        expectAllServicesCalledOnce();
        clearAllServiceMocks();

        // socket-2 все еще не должен работать
        await new Promise((resolve) => setTimeout(resolve, 10));
        expectAllServicesNotCalled();

        // Теперь делаем ready socket-2
        resolveReady2();
        await mainPromise2;
        await new Promise((resolve) => setTimeout(resolve, 10));

        expectAllServicesCalledOnce();
      });
    });
  });
});
