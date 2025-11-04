import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ConnectionAuthDto {
  @IsString()
  @IsNotEmpty()
  roomShortId: string;

  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  username: string;
}
