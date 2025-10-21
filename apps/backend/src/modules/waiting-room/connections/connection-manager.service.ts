import { Injectable } from '@nestjs/common';
import { RoomData, UserConnection } from './connection.types';
import { WSSendMessage } from '../interfaces/wsmessages.interface';

@Injectable()
export class ConnectionManager {
  private rooms = new Map<string, RoomData>();

  addConnection(
    roomId: string,
    userId: string,
    conn: UserConnection,
    settings?: Partial<RoomData['settings']>,
  ) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        settings: {
          showHistoryToNewbies: settings?.showHistoryToNewbies ?? false,
        },
      });
    }
    this.rooms.get(roomId)!.users.set(userId, conn);
  }

  removeConnection(
    ws: WebSocket,
  ): { roomId: string; userId: string; usersLeftRoom: boolean } | null {
    for (const [roomId, roomData] of this.rooms.entries()) {
      for (const [userId, conn] of roomData.users.entries()) {
        if (conn.ws === ws) {
          roomData.users.delete(userId);
          const usersLeftRoom = roomData.users.size === 0;
          if (usersLeftRoom) {
            this.rooms.delete(roomId);
          }
          return { roomId, userId, usersLeftRoom };
        }
      }
    }
    return null;
  }

  sendEvent<E extends WSSendMessage['event']>(
    ws: WebSocket,
    event: E,
    data: Extract<WSSendMessage, { event: E }>['data'],
  ) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }
}
