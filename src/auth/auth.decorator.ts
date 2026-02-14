import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // If data is a string, return that property (e.g., 'role', 'id')
    if (typeof data === 'string') {
      return request[data] || user?.[data];
    }
    
    return user;
  },
);

