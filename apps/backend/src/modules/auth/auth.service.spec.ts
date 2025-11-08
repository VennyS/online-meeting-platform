import { mockClass, MockedClass } from 'src/common/utils/test.utils';
import { AuthService } from './auth.service';
import { RoomRepository } from 'src/repositories/room.repository';
import { LivekitTokenQueryDto } from './dto/LivekitTokenQueryDto';
import * as authUtils from 'src/common/utils/auth.utils';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import bcrypt from 'bcrypt';

Object.defineProperty(bcrypt, 'compare', {
  value: jest.fn().mockResolvedValue(true),
  configurable: true,
});

describe(AuthService.name, () => {
  let roomRepo: MockedClass<typeof RoomRepository>;
  let authService: AuthService;

  beforeEach(() => {
    roomRepo = mockClass(RoomRepository);
    authService = new AuthService(roomRepo);
  });

  describe('generateToken', () => {
    it('should exception if user have not rights to join', async () => {
      const room = {
        isPublic: false,
      } as any;
      const query: Pick<LivekitTokenQueryDto, 'name' | 'password'> = {
        name: 'test-user',
      };

      await expect(
        authService.generateToken(query, room, false),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token if user is host', async () => {
      const ownerId = 1;
      const token = 'test-token';

      const room = {
        isPublic: false,
        ownerId: ownerId,
        name: 'test-room',
      } as any;
      const query: Pick<LivekitTokenQueryDto, 'name' | 'password'> = {
        name: 'test-user',
      };

      jest.spyOn(authUtils, 'createLivekitToken').mockResolvedValueOnce(token);

      const result = await authService.generateToken(
        query,
        room,
        true,
        ownerId,
      );

      expect(result).toEqual({
        token,
        metadata: {
          isOwner: true,
          isGuest: false,
          role: 'owner',
          name: room.name,
        },
      });
    });

    it('should exception if password required but it is lack', async () => {
      const ownerId = 1;
      const token = 'test-token';

      const room = {
        isPublic: false,
        ownerId: ownerId,
        name: 'test-room',
        passwordHash: 'test-password',
      } as any;
      const query: Pick<LivekitTokenQueryDto, 'name' | 'password'> = {
        name: 'test-user',
      };

      jest.spyOn(authUtils, 'createLivekitToken').mockResolvedValueOnce(token);

      await expect(
        authService.generateToken(query, room, false, 2),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should exception if password is not valid', async () => {
      const ownerId = 1;
      const token = 'test-token';

      const room = {
        isPublic: false,
        ownerId: ownerId,
        name: 'test-room',
        passwordHash: 'test-password',
      } as any;
      const query: Pick<LivekitTokenQueryDto, 'name' | 'password'> = {
        name: 'test-user',
        password: 'another-test-password',
      };

      jest.spyOn(authUtils, 'createLivekitToken').mockResolvedValueOnce(token);
      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(false),
      }));

      await expect(
        authService.generateToken(query, room, false, 2),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should exception if room is not public and user is not in whitelist', async () => {
      const ownerId = 1;
      const token = 'test-token';

      const room = {
        isPublic: false,
        ownerId: ownerId,
        name: 'test-room',
        passwordHash: 'test-password',
      } as any;
      const query: Pick<LivekitTokenQueryDto, 'name' | 'password'> = {
        name: 'test-user',
        password: 'test-password',
      };

      jest.spyOn(authUtils, 'createLivekitToken').mockResolvedValueOnce(token);

      roomRepo.isAllowed.mockResolvedValueOnce(false);

      await expect(
        authService.generateToken(query, room, true, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return token and its metadata', async () => {
      const ownerId = 1;
      const token = 'test-token';

      const room = {
        isPublic: false,
        ownerId: ownerId,
        name: 'test-room',
        passwordHash: 'test-password',
      } as any;
      const query: Pick<LivekitTokenQueryDto, 'name' | 'password'> = {
        name: 'test-user',
        password: 'test-password',
      };

      jest.spyOn(authUtils, 'createLivekitToken').mockResolvedValueOnce(token);

      roomRepo.isAllowed.mockResolvedValueOnce(true);

      const result = await authService.generateToken(query, room, true, 2);

      expect(result).toEqual({
        token,
        metadata: {
          isOwner: false,
          isGuest: false,
          role: 'participant',
          name: room.name,
        },
      });
    });
  });
});
