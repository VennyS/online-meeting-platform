import { IsString } from 'class-validator';

export class GuestJoinRequestDto {
  @IsString()
  roomId: string;

  @IsString()
  userId: string;

  @IsString()
  name: string;
}
