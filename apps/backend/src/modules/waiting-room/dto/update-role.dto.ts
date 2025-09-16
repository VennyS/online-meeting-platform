import { IsString } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  roomId: string;

  @IsString()
  userId: string;

  @IsString()
  targetUserId: string;

  @IsString()
  newRole: string;
}
