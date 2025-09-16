import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray } from 'class-validator';

export class AddParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => (isNaN(Number(v)) ? v : Number(v)))
      : [],
  )
  userIds: (string | number)[];
}
