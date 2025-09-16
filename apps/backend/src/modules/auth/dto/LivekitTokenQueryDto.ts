import { IsOptional, IsString, MinLength } from 'class-validator';

export class LivekitTokenQueryDto {
  @IsString()
  @MinLength(1, { message: 'room is required' })
  room: string;

  @IsString()
  @MinLength(1, { message: 'name is required' })
  name: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
