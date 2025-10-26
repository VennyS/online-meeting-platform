import { Room } from '@prisma/client';

export type RoomInfo = Pick<Room, 'name' | 'showHistoryToNewbies'> & {
  isHost: boolean;
};
