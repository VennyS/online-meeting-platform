import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { AdministrationGateway } from './administration.gateway';
import { AdministrationService } from '../services/administration.service';
import { InitService } from '../services/init.service';
import { TypedSocket } from '../interfaces/socket-data.interface';
import {
  Permissions,
  RoomRole,
  UpdatePermissionData,
  UpdateRoleData,
} from '../interfaces/administation.interface';

describe(AdministrationGateway.name, () => {
  let administationService: MockedClass<typeof AdministrationService>;
  let init: MockedClass<typeof InitService>;
  let administrationGateway: AdministrationGateway;

  beforeEach(() => {
    administationService = mockClass(AdministrationService);
    init = mockClass(InitService);
    administrationGateway = new AdministrationGateway(
      administationService,
      init,
    );
  });

  describe('initPermissions', () => {
    it('should return if error occuried while fetching permissions', async () => {
      const mockSocket = {
        data: { userId: 1, roomShortId: 'room123' },
        emit: jest.fn(),
      } as unknown as TypedSocket;

      administationService.getPermissions.mockImplementationOnce(() => {
        throw Error('Ошибка');
      });

      await administrationGateway.initPermissions(mockSocket);
      expect(mockSocket.emit).toHaveBeenCalledWith('permissions_error');
    });

    it('should message permissions', async () => {
      const mockSocket = {
        data: { userId: 1, roomShortId: 'room123' },
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const permissions = {
        owner: {
          canShareScreen: true,
          canStartPresentation: true,
        },
        admin: {
          canShareScreen: true,
          canStartPresentation: true,
        },
        participant: {
          canShareScreen: true,
          canStartPresentation: true,
        },
      };

      administationService.getPermissions.mockResolvedValue(permissions);

      await administrationGateway.initPermissions(mockSocket);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'permissions_init',
        permissions,
      );
    });
  });

  describe('initRoles', () => {
    it('should return if error occuried while set default role', async () => {
      const mockSocket = {
        data: { userId: 1, roomShortId: 'room123' },
        emit: jest.fn(),
      } as unknown as TypedSocket;

      administationService.setDefaultRole.mockImplementationOnce(() => {
        throw Error('Ошибка');
      });

      await administrationGateway.initRoles(mockSocket);
      expect(mockSocket.emit).toHaveBeenCalledWith('roles_error');
    });

    it('should return if error occuried fetching roles', async () => {
      const mockSocket = {
        data: { userId: 1, roomShortId: 'room123' },
        emit: jest.fn(),
      } as unknown as TypedSocket;

      administationService.getRoles.mockImplementationOnce(() => {
        throw Error('Ошибка');
      });

      await administrationGateway.initRoles(mockSocket);
      expect(mockSocket.emit).toHaveBeenCalledWith('roles_error');
    });

    it('should message roles', async () => {
      const mockSocket = {
        data: { userId: 1, roomShortId: 'room123' },
        emit: jest.fn(),
      } as unknown as TypedSocket;

      const roles: Record<string, RoomRole> = {
        1: 'owner',
        2: 'participant',
      };

      administationService.getRoles.mockResolvedValue(roles);

      await administrationGateway.initRoles(mockSocket);
      expect(mockSocket.emit).toHaveBeenCalledWith('roles_updated', {
        roles: roles,
      });
    });

    describe('update_permission', () => {
      it('should return if no host', async () => {
        const mockSocket = {
          data: { userId: 1, roomShortId: 'room123', isHost: false },
          emit: jest.fn(),
        } as unknown as TypedSocket;

        const data: UpdatePermissionData = {
          targetRole: 'owner',
          permission: 'canShareScreen',
          value: false,
        };

        await administrationGateway.updatePermission(data, mockSocket);

        expect(administationService.setPermission).not.toHaveBeenCalled();
      });

      it('should return if error while setting permissions', async () => {
        const mockSocket = {
          data: { userId: 1, roomShortId: 'room123', isHost: true },
          emit: jest.fn(),
        } as unknown as TypedSocket;

        const data: UpdatePermissionData = {
          targetRole: 'owner',
          permission: 'canShareScreen',
          value: false,
        };

        administationService.setPermission.mockImplementationOnce(() => {
          throw Error('Ошибка');
        });

        await administrationGateway.updatePermission(data, mockSocket);

        expect(administationService.setPermission).toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('permissions_error');
      });

      it('should message all', async () => {
        const mockSocket = {
          data: { userId: 1, roomShortId: 'room123', isHost: true },
          emit: jest.fn(),
        } as unknown as TypedSocket;

        const data: UpdatePermissionData = {
          targetRole: 'owner',
          permission: 'canShareScreen',
          value: false,
        };

        const permissions: Permissions = {
          canShareScreen: data.value,
          canStartPresentation: true,
        };

        const emitMock = jest.fn();
        const toMock = jest.fn(() => ({ emit: emitMock }));

        (administrationGateway as any).server = {
          to: toMock,
        };

        administationService.setPermission.mockResolvedValueOnce(permissions);

        await administrationGateway.updatePermission(data, mockSocket);

        expect(administationService.setPermission).toHaveBeenCalled();
        expect(emitMock).toHaveBeenCalledWith('permissions_updated', {
          role: data.targetRole,
          permissions,
        });
      });
    });

    describe('update_role', () => {
      it('should return if no host', async () => {
        const mockSocket = {
          data: { userId: 1, roomShortId: 'room123', isHost: false },
          emit: jest.fn(),
        } as unknown as TypedSocket;

        const data: UpdateRoleData = {
          targetUserId: '1',
          newRole: 'owner',
        };

        await administrationGateway.updateRole(data, mockSocket);

        expect(administationService.setRole).not.toHaveBeenCalled();
      });

      it('should return if error while setting role', async () => {
        const mockSocket = {
          data: { userId: 1, roomShortId: 'room123', isHost: true },
          emit: jest.fn(),
        } as unknown as TypedSocket;

        const data: UpdateRoleData = {
          targetUserId: '1',
          newRole: 'owner',
        };

        administationService.setRole.mockImplementationOnce(() => {
          throw Error('Ошибка');
        });

        await administrationGateway.updateRole(data, mockSocket);

        expect(administationService.setRole).toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('roles_error');
      });

      it('should message all', async () => {
        const mockSocket = {
          data: { userId: 1, roomShortId: 'room123', isHost: true },
          emit: jest.fn(),
        } as unknown as TypedSocket;

        const data: UpdateRoleData = {
          targetUserId: '1',
          newRole: 'owner',
        };

        const emitMock = jest.fn();
        const toMock = jest.fn(() => ({ emit: emitMock }));

        (administrationGateway as any).server = {
          to: toMock,
        };
        await administrationGateway.updateRole(data, mockSocket);

        expect(administationService.setRole).toHaveBeenCalled();
        expect(emitMock).toHaveBeenCalledWith('role_updated', {
          userId: data.targetUserId,
          role: data.newRole,
        });
      });
    });
  });
});
