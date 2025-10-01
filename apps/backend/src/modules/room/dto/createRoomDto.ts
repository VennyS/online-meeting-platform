import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionLevel } from '@prisma/client';

export class CreateRoomDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  ownerId: number;

  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @Type(() => Number)
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

  @IsString()
  @IsOptional()
  timeZone: string = 'Europe/Moscow';

  @IsEnum(PermissionLevel)
  @IsOptional()
  canShareScreen: PermissionLevel = PermissionLevel.ALL;

  @IsEnum(PermissionLevel)
  @IsOptional()
  canStartPresentation: PermissionLevel = PermissionLevel.ALL;
}
