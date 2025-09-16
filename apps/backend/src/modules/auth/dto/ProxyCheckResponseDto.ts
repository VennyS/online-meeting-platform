import { ApiProperty } from '@nestjs/swagger';

export class ProxyCheckUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Ivan' })
  firstName: string;

  @ApiProperty({ example: 'Ivanov' })
  lastName: string;

  @ApiProperty({ example: 'ivan@example.com' })
  email: string;

  @ApiProperty({ example: '+79001234567' })
  phoneNumber: string;

  @ApiProperty({ example: 'User' })
  role: string;

  @ApiProperty({ example: 2 })
  roleId: number;

  @ApiProperty({ example: true })
  emailVerified: boolean;

  @ApiProperty({ example: 'profile_images/1-1234567890.png' })
  profileImage: string;
}

export class ProxyCheckResponseDto {
  @ApiProperty({ example: 200 })
  status: number;

  @ApiProperty({ type: ProxyCheckUserDto })
  user: ProxyCheckUserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token: string;
}
