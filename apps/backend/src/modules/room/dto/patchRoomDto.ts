import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PatchRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Date) // аналог z.coerce.date()
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
}
