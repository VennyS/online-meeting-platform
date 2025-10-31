import { v4 as uuidv4 } from 'uuid';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { TypedSocket } from '../interfaces/socket-data.interface';
import {
  PresentationNotFoundError,
  PresentationService,
} from '../services/presentation.service';
import { Presentation } from '../interfaces/presentation.interface';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { InitService } from '../services/init.service';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class PresentationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PresentationGateway.name);
  constructor(
    private readonly presentationService: PresentationService,
    private readonly init: InitService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(socket: TypedSocket) {
    let presentations: Presentation[] = [];

    try {
      presentations = await this.presentationService.get(
        socket.data.roomShortId,
      );
    } catch (e) {
      this.logger.error('Error occuried while fetching presentations', e);
      socket.emit('presentations_error');
      return;
    }

    if (!presentations.length) return;

    const data = presentations.map((p) => ({
      fileId: p.fileId,
      presentationId: p.presentationId,
      url: p.url,
      authorId: p.authorId,
      currentPage: p.currentPage,
      zoom: p.zoom,
      scroll: p.scroll,
    }));

    socket.emit('presentations_state', data);
    this.logger.log(
      `Sent presentations state for room ${socket.data.roomShortId} to client`,
    );
  }

  async handleDisconnect(socket: TypedSocket) {
    const { roomShortId, userId } = socket.data;

    let presentationId: string | undefined;

    try {
      presentationId = await this.presentationService.findAndFinishPresentation(
        roomShortId,
        userId,
      );
    } catch (e) {
      if (e instanceof PresentationNotFoundError) {
        this.logger.debug(
          `No presentation found started by ${userId} in room ${roomShortId}`,
        );
      } else {
        this.logger.error(
          `Error occuried while stopping presentation started by ${userId} in room ${roomShortId}`,
        );
      }

      return;
    }

    this.server
      .of('/')
      .to(`room-${roomShortId}`)
      .emit('presentation_finished', { presentationId });

    this.logger.debug(
      `Presentation finish messages have been sent ${roomShortId}`,
    );
  }

  @SubscribeMessage('presentation_started')
  async startPresentation(
    @MessageBody()
    data: {
      fileId: string;
      url: string;
      mode?: 'presentationWithCamera' | 'presentationOnly';
    },
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, userId } = socket.data;

    const presentation: Presentation = {
      fileId: data.fileId,
      presentationId: uuidv4(),
      url: data.url,
      authorId: String(userId),
      currentPage: 1,
      zoom: 1,
      scroll: { x: 0, y: 0 },
      mode: data.mode || 'presentationWithCamera',
    };

    this.server.sockets.to(`room-${roomShortId}`).emit('presentation_started', {
      fileId: presentation.fileId,
      presentationId: presentation.presentationId,
      url: presentation.url,
      authorId: presentation.authorId,
      currentPage: presentation.currentPage,
      zoom: presentation.zoom,
      scroll: presentation.scroll,
      mode: presentation.mode,
    });
  }

  @SubscribeMessage('presentation_page_changed')
  async changePage(
    @MessageBody() data: { presentationId: string; page: number },
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, userId } = socket.data;

    try {
      this.presentationService.changePresentation(
        roomShortId,
        data.presentationId,
        String(userId),
        'currentPage',
        data.page,
      );
    } catch (e) {
      socket.emit('presentation_error');
    }

    this.server.sockets
      .to(`room-${roomShortId}`)
      .emit('presentation_page_changed', {
        presentationId: data.presentationId,
        page: data.page,
      });
  }

  @SubscribeMessage('presentation_zoom_changed')
  async changeZoom(
    @MessageBody() data: { presentationId: string; zoom: number },
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, userId } = socket.data;

    try {
      await this.presentationService.changePresentation(
        roomShortId,
        data.presentationId,
        String(userId),
        'zoom',
        data.zoom,
      );
    } catch (e) {
      socket.emit('presentation_error');
      return;
    }

    this.server.to(roomShortId).emit('presentation_zoom_changed', {
      presentationId: data.presentationId,
      zoom: data.zoom,
    });
  }

  @SubscribeMessage('presentation_scroll_changed')
  async changeScroll(
    @MessageBody() data: { presentationId: string; x: number; y: number },
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, userId } = socket.data;

    try {
      await this.presentationService.changePresentation(
        roomShortId,
        data.presentationId,
        String(userId),
        'scroll',
        { x: data.x, y: data.y },
      );
    } catch (e) {
      socket.emit('presentation_error');
      return;
    }

    this.server.to(roomShortId).emit('presentation_scroll_changed', {
      presentationId: data.presentationId,
      x: data.x,
      y: data.y,
    });
  }

  @SubscribeMessage('presentation_mode_changed')
  async changePresentationMode(
    @MessageBody()
    data: {
      presentationId: string;
      mode: 'presentationWithCamera' | 'presentationOnly';
    },
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, userId } = socket.data;

    try {
      await this.presentationService.changePresentation(
        roomShortId,
        data.presentationId,
        String(userId),
        'mode',
        data.mode,
      );
    } catch (e) {
      socket.emit('presentation_error');
      return;
    }

    this.server.to(roomShortId).emit('presentation_mode_changed', {
      presentationId: data.presentationId,
      mode: data.mode,
    });
  }

  @SubscribeMessage('presentation_finished')
  async finishPresentation(
    @MessageBody() data: { presentationId: string },
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, userId } = socket.data;

    try {
      await this.presentationService.finishPresentation(
        roomShortId,
        data.presentationId,
      );
    } catch (e) {
      socket.emit('presentation_error');
      return;
    }

    this.server.to(roomShortId).emit('presentation_finished', {
      presentationId: data.presentationId,
    });
  }
}
