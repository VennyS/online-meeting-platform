import { Type } from 'class-transformer';
import { IsInt, IsString } from 'class-validator';

export class AddToBlacklistDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsString()
  name: string;
}
