import { Type } from 'class-transformer';
import { IsBoolean, IsInt } from 'class-validator';

export class HostApprovalDto {
  @Type(() => Number)
  @IsInt()
  guestId: number;

  @IsBoolean()
  approved: boolean;
}
