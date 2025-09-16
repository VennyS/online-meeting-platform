import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/common/decorators/user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/createRoomDto';
import { RoomByShortIdPipe } from 'src/common/pipes/room.pipe';
import type { Room } from '@prisma/client';
import { LivekitService } from '../../common/modules/livekit/livekit.service';
import { Prequisites } from './interfaces/prequisites.interface';
import { PostMessageDto } from './dto/postMessageDto';
import { PostMessageResponseDto } from './dto/postMessageResponseDto';
import { AddParticipantsDto } from './dto/addParticipantsDto';
import { AddParticipantResponseDto } from './dto/addParticipantsResponseDto';
import { PatchRoomDto } from './dto/patchRoomDto';
import { Message } from './interfaces/message.interface';
import { GetMessagesResponseDto } from './dto/getMessagesResponseDto';

@Controller('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  @UseGuards(AuthGuard({ required: true }))
  getRoomsByUserId(@User('id') id: number) {
    return this.roomService.getAllByUserId(id);
  }

  @Post()
  @UseGuards(AuthGuard({ required: true }))
  createRoom(
    @Body() query: CreateRoomDto,
  ): Promise<Omit<Room, 'passwordHash'>> {
    return this.roomService.create(query);
  }

  @Patch('/:shortId')
  @UseGuards(AuthGuard({ required: true }))
  patchRoom(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @Body() body: PatchRoomDto,
    @User('id') id: number,
  ) {
    this.roomService.patch(room, body, id);
  }

  @Get(':shortId/prequisites')
  @UseGuards(AuthGuard({ required: false }))
  getPrequisites(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @User('id') id: number | null,
  ): Promise<Prequisites> {
    return this.roomService.getPrequisites(room, id);
  }

  @Get('/:shortId/history')
  async getHistory(
    @Param('shortId', RoomByShortIdPipe) room: Room,
  ): Promise<GetMessagesResponseDto> {
    return {
      messages: await this.roomService.getHistory(room),
    };
  }

  @Post('/:shortId/messages')
  async addMessage(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @Body() body: PostMessageDto,
  ): Promise<PostMessageResponseDto> {
    return this.roomService.createMessage(room, body);
  }

  @Post('/:shortId/participants')
  async addParticipants(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @Body() body: AddParticipantsDto,
  ): Promise<AddParticipantResponseDto> {
    return this.roomService.addAllowedParticipants(room, body);
  }
}
