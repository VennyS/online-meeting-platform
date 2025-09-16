import { ApiProperty } from '@nestjs/swagger';

export class LivekitTokenMetadata {
  @ApiProperty({
    description: 'Flag indicating if the user is the owner of the room',
  })
  isOwner: boolean;

  @ApiProperty({
    description: 'Flag indicating if the user is a guest',
    type: Boolean,
  })
  isGuest: boolean;

  @ApiProperty({ description: 'User role in the room', example: 'owner' })
  role: string;

  @ApiProperty({ description: 'Name of the room' })
  name: string;
}
