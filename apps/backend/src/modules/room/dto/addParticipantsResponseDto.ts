import { ApiProperty } from '@nestjs/swagger';

export class AddParticipantResponseDto {
  @ApiProperty({ description: 'Amount of added participants' })
  added: number;
}
