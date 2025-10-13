import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionLevel } from '@prisma/client';

export class PatchRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  showHistoryToNewbies?: boolean;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowEarlyJoin?: boolean;

  @IsOptional()
  @IsBoolean()
  cancelled?: boolean;

  @IsOptional()
  @IsBoolean()
  finished?: boolean;

  @IsEnum(PermissionLevel)
  @IsOptional()
  canShareScreen?: PermissionLevel = PermissionLevel.ALL;

  @IsEnum(PermissionLevel)
  @IsOptional()
  canStartPresentation?: PermissionLevel = PermissionLevel.ALL;
}
