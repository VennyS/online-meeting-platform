import { ApiProperty } from '@nestjs/swagger';
import { PermissionLevel } from '@prisma/client';

export class GetDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  shortId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty()
  startAt: Date;

  @ApiProperty()
  timeZone: string;

  @ApiProperty({ required: false, nullable: true })
  durationMinutes?: number | null;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  showHistoryToNewbies: boolean;

  @ApiProperty()
  waitingRoomEnabled: boolean;

  @ApiProperty()
  allowEarlyJoin: boolean;

  @ApiProperty()
  ownerId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  cancelled: boolean;

  @ApiProperty()
  finished: boolean;

  @ApiProperty()
  canShareScreen: PermissionLevel;

  @ApiProperty()
  canStartPresentation: PermissionLevel;

  @ApiProperty()
  haveFiles: boolean;

  @ApiProperty()
  haveReports: boolean;
}
