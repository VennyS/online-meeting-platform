import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { AdministrationGateway } from './administration.gateway';
import { PresentationService } from '../services/presentation.service';
import { InitService } from '../services/init.service';
import { PresentationGateway } from './presentation.gateway';
import { TypedSocket } from '../interfaces/socket-data.interface';
import { Presentation } from '../interfaces/presentation.interface';

describe(AdministrationGateway.name, () => {
  let presentationService: MockedClass<typeof PresentationService>;
  let init: MockedClass<typeof InitService>;
  let presentationGateway: PresentationGateway;
  let socket: TypedSocket;

  let emitMock: jest.Mock;

  beforeEach(() => {
    presentationService = mockClass(PresentationService);
    init = mockClass(InitService);
    presentationGateway = new PresentationGateway(presentationService, init);

    socket = {
      data: {
        roomShortId: 'room-123',
        userId: 1,
      },
      emit: jest.fn(),
    } as unknown as TypedSocket;

    emitMock = jest.fn();
    const toMock = jest.fn().mockReturnValue({ emit: emitMock });
    const ofMock = jest.fn().mockReturnValue({ to: toMock });

    presentationGateway.server = {
      to: toMock,
      server: {
        of: ofMock,
      },
    } as any;
  });

  describe('handleConnection', () => {
    it('should return if error while fetching presentations', async () => {
      presentationService.get.mockImplementationOnce(() => {
        throw Error('Ошибка');
      });

      await presentationGateway.handleConnection(socket);
      expect(presentationService.get).toHaveBeenCalledWith(
        socket.data.roomShortId,
      );
      expect(socket.emit).toHaveBeenCalledWith('presentations_error');
    });

    it('should return no presentations found', async () => {
      presentationService.get.mockResolvedValueOnce([]);

      await presentationGateway.handleConnection(socket);
      expect(presentationService.get).toHaveBeenCalledWith(
        socket.data.roomShortId,
      );
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('should message presentations', async () => {
      const presentations: Presentation[] = [
        {
          fileId: '',
          presentationId: '',
          authorId: '',
          url: '',
          currentPage: 0,
          zoom: 0,
          scroll: {
            x: 0,
            y: 0,
          },
          mode: 'presentationWithCamera',
        },
      ];

      presentationService.get.mockResolvedValueOnce(presentations);

      await presentationGateway.handleConnection(socket);
      expect(presentationService.get).toHaveBeenCalledWith(
        socket.data.roomShortId,
      );
      expect(socket.emit).toHaveBeenCalledWith(
        'presentations_init',
        presentations,
      );
    });
  });

  describe('handleDisconnect', () => {
    it('should finish presentation', async () => {
      presentationService.findAndFinishPresentation.mockImplementationOnce(
        () => {
          throw Error('Ошибка');
        },
      );

      await presentationGateway.handleDisconnect(socket);

      expect(
        presentationService.findAndFinishPresentation,
      ).toHaveBeenCalledWith(socket.data.roomShortId, socket.data.userId);
      expect(emitMock).not.toHaveBeenCalled();
    });

    it('should return if error', async () => {
      presentationService.findAndFinishPresentation.mockResolvedValueOnce(
        'presentation-id',
      );

      await presentationGateway.handleDisconnect(socket);

      expect(
        presentationService.findAndFinishPresentation,
      ).toHaveBeenCalledWith(socket.data.roomShortId, socket.data.userId);
      expect(emitMock).toHaveBeenCalled();
    });
  });

  describe('presentation_started', () => {
    it('should return if error', async () => {
      const data = {
        fileId: 'file-id',
        url: 'some-url',
      };

      presentationService.set.mockImplementationOnce(() => {
        throw Error('Ошибка');
      });

      await presentationGateway.startPresentation(data, socket);

      expect(presentationService.set).toHaveBeenCalled();
      expect(emitMock).not.toHaveBeenCalled();
    });

    it('should message', async () => {
      const data = {
        fileId: 'file-id',
        url: 'some-url',
      };

      await presentationGateway.startPresentation(data, socket);

      expect(presentationService.set).toHaveBeenCalled();
      expect(emitMock).toHaveBeenCalled();
    });
  });

  describe('presentation_finished', () => {
    it('should return if error', async () => {
      const data = {
        presentationId: 'presentation-id',
      };

      presentationService.finishPresentation.mockImplementationOnce(() => {
        throw Error('Ошибка');
      });

      await presentationGateway.finishPresentation(data, socket);

      expect(presentationService.finishPresentation).toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('presentation_error');
    });

    it('should message', async () => {
      const data = {
        presentationId: 'presentation-id',
      };

      await presentationGateway.finishPresentation(data, socket);

      expect(presentationService.finishPresentation).toHaveBeenCalled();
      expect(emitMock).toHaveBeenCalledWith('presentation_finished', {
        presentationId: data.presentationId,
      });
    });
  });

  describe('Presentation change events', () => {
    const testCases = [
      {
        eventName: 'presentation_page_changed',
        methodName: 'changePage',
        data: { presentationId: 'presentation-id', page: 5 },
        serviceField: 'currentPage',
        dataField: 'page', // ← добавим отдельное поле для данных
        emitData: { presentationId: 'presentation-id', page: 5 },
      },
      {
        eventName: 'presentation_zoom_changed',
        methodName: 'changeZoom',
        data: { presentationId: 'presentation-id', zoom: 1.5 },
        serviceField: 'zoom',
        dataField: 'zoom',
        emitData: { presentationId: 'presentation-id', zoom: 1.5 },
      },
      {
        eventName: 'presentation_scroll_changed',
        methodName: 'changeScroll',
        data: { presentationId: 'presentation-id', scroll: { x: 100, y: 200 } },
        serviceField: 'scroll',
        dataField: 'scroll',
        emitData: {
          presentationId: 'presentation-id',
          scroll: { x: 100, y: 200 },
        },
      },
      {
        eventName: 'presentation_mode_changed',
        methodName: 'changePresentationMode',
        data: {
          presentationId: 'presentation-id',
          mode: 'presentationWithCamera' as const,
        },
        serviceField: 'mode',
        dataField: 'mode',
        emitData: {
          presentationId: 'presentation-id',
          mode: 'presentationWithCamera',
        },
      },
    ];

    testCases.forEach(
      ({ eventName, methodName, data, serviceField, dataField, emitData }) => {
        describe(eventName, () => {
          it('should return if error', async () => {
            presentationService.changePresentation.mockImplementationOnce(
              () => {
                throw new Error('Ошибка');
              },
            );

            await presentationGateway[methodName](data, socket);

            expect(presentationService.changePresentation).toHaveBeenCalledWith(
              socket.data.roomShortId,
              data.presentationId,
              String(socket.data.userId),
              serviceField,
              data[dataField],
            );
            expect(socket.emit).toHaveBeenCalledWith('presentation_error');
          });

          it('should broadcast message', async () => {
            await presentationGateway[methodName](data, socket);

            expect(presentationService.changePresentation).toHaveBeenCalledWith(
              socket.data.roomShortId,
              data.presentationId,
              String(socket.data.userId),
              serviceField,
              data[dataField],
            );
            expect(emitMock).toHaveBeenCalledWith(eventName, emitData);
          });
        });
      },
    );
  });
});
