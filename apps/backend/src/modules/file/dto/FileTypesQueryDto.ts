import { FileType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export class FileTypesQueryDto {
  @IsOptional()
  @IsEnum(FileType, { each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  types: FileType[];
}
