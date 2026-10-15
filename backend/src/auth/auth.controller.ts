import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { PublicUser } from '../users/schemas/user.schema';
import { AuthCookies } from './auth-cookies';
import { AUTH_COOKIE, AUTH_THROTTLE } from './auth.constants';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookies,
  ) {}

  @Post('signup')
  @Throttle(AUTH_THROTTLE)
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    const { user, accessToken } = await this.auth.signUp(dto);
    this.cookies.setSession(res, accessToken);
    return { user };
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    const { user, accessToken } = await this.auth.signIn(dto);
    this.cookies.setSession(res, accessToken);
    return { user };
  }

  @Post('signout')
  @HttpCode(HttpStatus.NO_CONTENT)
  signOut(@Res({ passthrough: true }) res: Response): void {
    this.cookies.clearSession(res);
  }

  /**
   * Current session for page loads: always 200, with `user: null` when signed
   * out, so checking "is anyone signed in?" is not treated as an error.
   */
  @Get('session')
  async session(@Req() req: Request): Promise<{ user: PublicUser | null }> {
    const userId = await this.auth.verifySessionToken(req.cookies?.[AUTH_COOKIE]);
    return { user: userId ? await this.auth.findProfile(userId) : null };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthenticatedRequest): Promise<{ user: PublicUser }> {
    return { user: await this.auth.getProfile(req.userId) };
  }
}
