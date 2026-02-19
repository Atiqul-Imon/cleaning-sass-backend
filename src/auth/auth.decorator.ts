import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../shared/types/user.types';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): AuthenticatedUser | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    // If data is a string, return that property (e.g., 'role', 'id')
    if (typeof data === 'string') {
      return (request[data] as string) || (user?.[data as keyof AuthenticatedUser] as string) || '';
    }

    return user;
  },
);
