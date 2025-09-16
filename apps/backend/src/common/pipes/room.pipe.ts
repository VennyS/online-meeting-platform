import { PipeTransform, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Room } from '@prisma/client';
import { RoomRepository } from 'src/repositories/room.repository';

@Injectable()
export class RoomByShortIdPipe implements PipeTransform<string, Promise<Room>> {
  constructor(private readonly roomRepo: RoomRepository) {}

  async transform(shortId: string): Promise<Room> {
    const room = await this.roomRepo.findByShortId(shortId);
    if (!room) {
      throw new NotFoundException(`Room with id "${shortId}" not found`);
    }
    return room;
  }
}
