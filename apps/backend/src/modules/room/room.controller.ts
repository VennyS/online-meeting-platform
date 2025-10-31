import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/common/decorators/user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/createRoomDto';
import { RoomByShortIdPipe } from 'src/common/pipes/room.pipe';
import type { Room } from '@prisma/client';
import { Prequisites } from './interfaces/prequisites.interface';
import { AddParticipantsDto } from './dto/addParticipantsDto';
import { AddParticipantResponseDto } from './dto/addParticipantsResponseDto';
import { PatchRoomDto } from './dto/patchRoomDto';
import type { Response, Request } from 'express';
import { ReportExportService } from 'src/common/services/report.meeting.service';
import { GetDto } from './dto/getDto';
import { extractIp } from 'src/common/utils/socket.utils';

@Controller('room')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly exportService: ReportExportService,
  ) {}

  @Get()
  @UseGuards(AuthGuard({ required: true }))
  getRoomsByUserId(@User('id') id: number): Promise<GetDto[]> {
    return this.roomService.getAllByUserId(id);
  }

  @Post()
  @UseGuards(AuthGuard({ required: true }))
  createRoom(@Body() query: CreateRoomDto): Promise<GetDto> {
    return this.roomService.create(query);
  }

  @Patch('/:shortId')
  @UseGuards(AuthGuard({ required: true }))
  patchRoom(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @Body() body: PatchRoomDto,
    @User('id') id: number,
  ): Promise<GetDto> {
    return this.roomService.patch(room, body, id);
  }

  @Get('/:shortId/reports')
  @UseGuards(AuthGuard({ required: true }))
  getMeetingReport(@Param('shortId', RoomByShortIdPipe) room: Room) {
    return this.roomService.getReports(room);
  }

  @Get('/:shortId/reports/excel')
  @UseGuards(AuthGuard({ required: true }))
  async exportReportsExcel(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @Res() res: Response,
  ) {
    const data = await this.roomService.getReports(room);
    const buffer = await this.exportService.generateExcel(data);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="meeting_reports.xlsx"`,
    );

    res.send(buffer);
  }

  @Get('/:shortId/reports/csv')
  @UseGuards(AuthGuard({ required: true }))
  async exportReportsCsv(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @Res() res: Response,
  ) {
    const data = await this.roomService.getReports(room);
    const csvString = this.exportService.generateCsv(data);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="meeting_reports.csv"`,
    );

    res.send(csvString);
  }

  @Get(':shortId/prequisites')
  @UseGuards(AuthGuard({ required: false }))
  async getPrequisites(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @User('id') id: number | null,
    @Req() req: Request,
  ): Promise<Prequisites> {
    const ip = extractIp(req);
    return this.roomService.getPrequisites(room, id, ip);
  }

  @Post('/:shortId/participants')
  async addParticipants(
    @Param('shortId', RoomByShortIdPipe) room: Room,
    @Body() body: AddParticipantsDto,
  ): Promise<AddParticipantResponseDto> {
    return this.roomService.addAllowedParticipants(room, body);
  }
}
