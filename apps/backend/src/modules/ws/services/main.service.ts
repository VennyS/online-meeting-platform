import { Injectable } from '@nestjs/common';
import { RoomRepository } from 'src/repositories/room.repository';
import { RoomInfo } from '../interfaces/room.interface';

@Injectable()
export class Mainservice {
  constructor(private readonly roomRepository: RoomRepository) {}

  async getRoomInfo(roomId: string, userId: number): Promise<RoomInfo | null> {
    const room = await this.roomRepository.findByShortId(roomId);
    return {
      isHost: room?.ownerId === userId,
      showHistoryToNewbies: room ? room.showHistoryToNewbies : false,
      name: room ? room.name : '',
    };
  }
}
