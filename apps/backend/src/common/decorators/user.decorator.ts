import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthTokenPayload } from '../../modules/auth/interfaces/auth-token-payload.interface';

export const User = createParamDecorator(
  (field: keyof AuthTokenPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user: AuthTokenPayload | null = req.user ?? null;

    if (!user) return null;
    return field ? user[field] : user;
  },
);
