import { IsString, MinLength } from 'class-validator';

export class PatchFileDto {
  @IsString()
  @MinLength(1)
  name: string;
}
