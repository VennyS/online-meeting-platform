import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPayload } from '../utils/auth.utils';

export interface AuthGuardOptions {
  required?: boolean;
}

export function AuthGuard(options: AuthGuardOptions): Type<CanActivate> {
  @Injectable()
  class AuthGuardMixin implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const cookie = req.headers.cookie;

      const token = cookie
        ?.split('; ')
        .find((c) => c.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        if (options.required) {
          throw new UnauthorizedException('Auth token is required');
        }
        req.user = null;
        return true;
      }

      try {
        req.user = this.jwtService.verify<AuthTokenPayload>(token);
        req.user.token = token;
        return true;
      } catch {
        if (options.required) {
          throw new UnauthorizedException('Invalid token');
        }
        req.user = null;
        return true;
      }
    }
  }

  return mixin(AuthGuardMixin);
}
