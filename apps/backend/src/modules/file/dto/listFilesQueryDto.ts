import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { FileType } from '@prisma/client';

export class ListFilesQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  skip: number = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  take: number = 10;

  @IsOptional()
  @IsEnum(FileType, { each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  type: FileType[];
}
