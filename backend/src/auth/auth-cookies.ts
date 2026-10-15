import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import type { Env } from '../config/env.validation';
import { AUTH_COOKIE } from './auth.constants';

@Injectable()
export class AuthCookies {
  constructor(private readonly config: ConfigService<Env, true>) {}

  setSession(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE, token, {
      ...this.sessionOptions(),
      maxAge: this.config.get('JWT_EXPIRES_IN', { infer: true }) * 1000,
    });
  }

  clearSession(res: Response): void {
    res.clearCookie(AUTH_COOKIE, this.sessionOptions());
  }

  private sessionOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'strict',
      path: '/',
    };
  }
}
