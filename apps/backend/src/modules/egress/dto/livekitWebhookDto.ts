import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class LivekitFileDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  endedAt?: string;
}

class LivekitEgressInfoDto {
  @IsString()
  egressId: string;

  @IsString()
  roomName: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  endedAt?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LivekitFileDto)
  file?: LivekitFileDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LivekitFileDto)
  fileResults?: LivekitFileDto[];

  @IsOptional()
  @IsString()
  manifestLocation?: string;
}

export class LivekitWebhookDto {
  @IsString()
  event: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LivekitEgressInfoDto)
  egressInfo?: LivekitEgressInfoDto;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  createdAt?: string;
}
