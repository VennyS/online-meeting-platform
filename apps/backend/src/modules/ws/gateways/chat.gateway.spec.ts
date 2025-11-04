import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../services/chat.service';
import { ConnectionService } from '../services/connection.service';
import { InitService } from '../services/init.service';
import { TypedSocket } from '../interfaces/socket-data.interface';
import { RoomMetadata } from '../interfaces/room-metadata.interface';
import { Message } from '../interfaces/message.interface';

describe(ChatGateway.name, () => {
  let chatService: MockedClass<typeof ChatService>;
  let connectionService: MockedClass<typeof ConnectionService>;
  let init: MockedClass<typeof InitService>;
  let chatGateway: ChatGateway;

  beforeEach(() => {
    chatService = mockClass(ChatService);
    connectionService = mockClass(ConnectionService);
    init = mockClass(InitService);

    chatGateway = new ChatGateway(chatService, connectionService, init);
  });

  describe('handleConnection', () => {
    it('should return if no room metadata', async () => {
      const mockSocket = {
        data: { roomShortId: 'room123' },
      } as unknown as TypedSocket;

      connectionService.getMetadata.mockReturnValueOnce(undefined);

      await chatGateway.handleConnection(mockSocket);

      expect(chatService.getMessages).not.toHaveBeenCalled();
      expect(init.waitForReady).toHaveBeenCalled();
    });

    it('should return if no messages found', async () => {
      const data = { roomShortId: 'room123' };

      const mockSocket = {
        data: data,
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const metadata = { showHistoryToNewbies: true } as RoomMetadata;

      connectionService.getMetadata.mockReturnValueOnce(metadata);

      await chatGateway.handleConnection(mockSocket);

      expect(chatService.getMessages).toHaveBeenCalledWith(data.roomShortId);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('new_message', () => {
    it('should call chat service', async () => {
      const mockSocket = {
        data: { roomShortId: 'room123' },
      } as unknown as TypedSocket;

      const data: { message: Omit<Message, 'id' | 'createdAt'> } = {
        message: {
          user: {
            id: 1,
            firstName: 'Test user',
          },
          text: 'Test message',
        },
      };

      connectionService.getMetadata.mockReturnValueOnce(undefined);

      chatGateway.newMessage(data, mockSocket);

      expect(chatService.newMessage).toHaveBeenCalledWith(
        mockSocket.data.roomShortId,
        data.message,
      );
    });
  });
});
