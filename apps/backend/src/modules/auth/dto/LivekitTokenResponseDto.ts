import { ApiProperty } from '@nestjs/swagger';
import { LivekitTokenMetadata } from './LivekitTokenMetadata';

export class LivekitTokenResponseDto {
  @ApiProperty({ description: 'JWT token for connecting to LiveKit' })
  token: string;

  @ApiProperty({
    description: 'Metadata about the user and the room',
    type: LivekitTokenMetadata,
  })
  metadata: LivekitTokenMetadata;
}
