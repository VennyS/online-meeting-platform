import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { TypedSocket } from '../interfaces/socket-data.interface';
import { AdministrationService } from '../services/administration.service';
import type {
  RoomRole,
  UpdatePermissionData,
  UpdateRoleData,
  Permissions,
} from '../interfaces/administation.interface';
import { Server } from 'socket.io';
import { InitService } from '../services/init.service';

@WebSocketGateway({ path: '/ws', namespace: '/', cors: true })
export class AdministrationGateway implements OnGatewayConnection {
  constructor(
    private readonly administationService: AdministrationService,
    private readonly init: InitService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(socket: TypedSocket) {
    await this.init.waitForReady();

    await this.initRoles(socket);
    await this.initPermissions(socket);
  }

  async initPermissions(socket: TypedSocket) {
    let permissions: Record<RoomRole, Permissions>;
    try {
      permissions = await this.administationService.getPermissions(
        socket.data.roomShortId,
      );
    } catch (e) {
      socket.emit('permissions_error');
      return;
    }

    if (!permissions) return;

    socket.emit('permissions_init', permissions);
  }

  async initRoles(socket: TypedSocket) {
    let roles: Record<string, RoomRole>;
    try {
      await this.administationService.setDefaultRole(
        socket.data.roomShortId,
        String(socket.data.userId),
        socket.data.isHost,
      );
      roles = await this.administationService.getRoles(socket.data.roomShortId);
    } catch (e) {
      socket.emit('roles_error');
      return;
    }

    if (!roles) return;

    socket.emit('roles_updated', { roles: roles });
  }

  @SubscribeMessage('update_permission')
  async updatePermission(
    @MessageBody() data: UpdatePermissionData,
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { isHost, roomShortId } = socket.data;

    if (!isHost) return;

    let permissions: Permissions;

    try {
      permissions = await this.administationService.setPermission(
        socket.data.roomShortId,
        data,
      );
    } catch (e) {
      socket.emit('permissions_error');
      return;
    }

    this.server.to(`room-${roomShortId}`).emit('permissions_updated', {
      role: data.targetRole,
      permissions,
    });
  }

  @SubscribeMessage('update_role')
  async updateRole(
    @MessageBody() data: UpdateRoleData,
    @ConnectedSocket() socket: TypedSocket,
  ) {
    const { roomShortId, isHost } = socket.data;

    if (!isHost) return;

    try {
      this.administationService.setRole(socket.data.roomShortId, data);
    } catch (e) {
      socket.emit('roles_error');
      return;
    }

    this.server.to(`room-${roomShortId}`).emit('role_updated', {
      userId: data.targetUserId,
      role: data.newRole,
    });
  }
}
