import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = await this.auth.verifySessionToken(request.cookies?.[AUTH_COOKIE]);
    if (!userId) {
      throw new UnauthorizedException();
    }
    request.userId = userId;
    return true;
  }
}
