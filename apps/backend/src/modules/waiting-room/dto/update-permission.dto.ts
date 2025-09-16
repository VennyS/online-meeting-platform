import { IsString, IsBoolean } from 'class-validator';

export class UpdatePermissionDto {
  @IsString()
  roomId: string;

  @IsString()
  userId: string;

  @IsString()
  targetRole: string;

  @IsString()
  permission: string;

  @IsBoolean()
  value: boolean;
}
