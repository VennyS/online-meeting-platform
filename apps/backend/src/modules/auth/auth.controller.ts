import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { Room } from '@prisma/client';
import { AuthService } from './auth.service';
import { RoomByShortIdPipe } from 'src/common/pipes/room.pipe';
import { LivekitTokenResponseDto } from './dto/LivekitTokenResponseDto';
import { LivekitTokenQueryDto } from './dto/LivekitTokenQueryDto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { User } from 'src/common/decorators/user.decorator';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/config/configuration';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProxyCheckResponseDto } from './dto/ProxyCheckResponseDto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  @Get('token')
  @UseGuards(AuthGuard({ required: false }))
  @ApiOkResponse({
    type: LivekitTokenResponseDto,
    description: 'LiveKit token generated successfully',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed for query parameters',
  })
  @ApiUnauthorizedResponse({
    description: 'Auth token required for private rooms or invalid password',
  })
  @ApiForbiddenResponse({
    description: 'User is not allowed to join this room',
  })
  @ApiNotFoundResponse({ description: 'Room not found' })
  getLivekitToken(
    @Query('room', RoomByShortIdPipe) room: Room,
    @Query() query: LivekitTokenQueryDto,
    @User('id') id: number | null,
  ): Promise<LivekitTokenResponseDto> {
    const userId = id ?? query.userId;
    const haveToken = !!id;
    return this.authService.generateToken(
      query,
      room,
      userId as number,
      haveToken,
    );
  }

  @Get('proxycheck')
  @UseGuards(AuthGuard({ required: true }))
  @ApiCookieAuth('auth-token')
  @ApiOkResponse({
    type: ProxyCheckResponseDto,
    description: 'Token is valid, proxy returned user info',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token (401)' })
  @ApiForbiddenResponse({ description: 'Email not verified (403)' })
  @ApiNotFoundResponse({ description: 'User not found (404)' })
  async checkViaProxyAuthToken(@User('token') token: string | null) {
    const proxyRoute = this.configService.get('proxy', { infer: true })!.route;

    const response = await fetch(proxyRoute, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return { status: response.status, ...data };
  }

  @Get('check')
  @UseGuards(AuthGuard({ required: true }))
  @ApiOkResponse({
    description: 'Auth token is valid',
    schema: {
      example: {
        ok: true,
        message: 'Auth token is valid',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Auth token missing or invalid',
  })
  async verifyAuthToken() {
    return {
      ok: true,
      message: 'Auth token is valid',
    };
  }
}
