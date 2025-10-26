import { Injectable } from '@nestjs/common';
import {
  Connection,
  RoomMetadata,
} from '../interfaces/room-metadata.interface';

@Injectable()
export class ConnectionService {
  private rooms = new Map<string, RoomMetadata>();
  private userToSocket = new Map<number, Connection>();
  private ipToSocket = new Map<string, Connection>();

  addRoom(meta: RoomMetadata) {
    this.rooms.set(meta.roomshortId, meta);
  }

  getMetadata(roomShortId: string): RoomMetadata | undefined {
    return this.rooms.get(roomShortId);
  }

  addConnection(userId: number, ip: string, connection: Connection) {
    this.userToSocket.set(userId, connection);
    this.ipToSocket.set(ip, connection);
  }

  getConnection(
    params: { userId: number } | { ip: string },
  ): Connection | undefined {
    if ('userId' in params) {
      return this.userToSocket.get(params.userId);
    } else {
      return this.ipToSocket.get(params.ip);
    }
  }
}
