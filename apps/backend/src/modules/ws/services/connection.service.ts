import { Injectable } from '@nestjs/common';
import { RoomMetadata } from '../interfaces/room-metadata.interface';

@Injectable()
export class ConnectionService {
  private rooms = new Map<string, RoomMetadata>();

  addRoom(meta: RoomMetadata) {
    this.rooms.set(meta.roomshortId, meta);
  }

  getMetadata(roomShortId: string): RoomMetadata | undefined {
    return this.rooms.get(roomShortId);
  }
}
