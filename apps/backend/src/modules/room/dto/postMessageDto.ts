import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PostMessageUserDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsString()
  @IsNotEmpty()
  firstName: string;
}

export class PostMessageDto {
  @IsString()
  @MinLength(1, { message: 'Message text is required' })
  text: string;

  @ValidateNested()
  @Type(() => PostMessageUserDto)
  from: PostMessageUserDto;
}
