import { IsBoolean, IsString } from 'class-validator';

export class HostApprovalDto {
  @IsString()
  roomId: string;

  @IsString()
  guestId: string;

  @IsString()
  guestName: string;

  @IsBoolean()
  approved: boolean;
}
