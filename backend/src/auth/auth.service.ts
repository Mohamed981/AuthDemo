import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import {
  type PublicUser,
  toPublicUser,
  type UserDocument,
} from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './auth.constants';
import type { SignInDto } from './dto/sign-in.dto';
import type { SignUpDto } from './dto/sign-up.dto';

interface AuthResult {
  user: PublicUser;
  accessToken: string;
}

@Injectable()
export class AuthService {
  // Verified against when the email is unknown, so response time does not
  // reveal whether an account exists.
  private readonly dummyHash = argon2.hash('dummy-password-for-timing');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResult> {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });
    return this.issueToken(user);
  }

  async signIn(dto: SignInDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const passwordMatches = await argon2.verify(hash, dto.password);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueToken(user);
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const profile = await this.findProfile(userId);
    if (!profile) {
      throw new UnauthorizedException();
    }
    return profile;
  }

  async findProfile(userId: string): Promise<PublicUser | null> {
    const user = await this.users.findById(userId);
    return user ? toPublicUser(user) : null;
  }

  /** Returns the user ID of a valid session token, or null for anything else. */
  async verifySessionToken(token: unknown): Promise<string | null> {
    if (typeof token !== 'string' || token.length === 0) return null;
    try {
      const payload = await this.jwt.verifyAsync<Partial<JwtPayload>>(token);
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  private async issueToken(user: UserDocument): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id as string };
    const accessToken = await this.jwt.signAsync(payload);
    return { user: toPublicUser(user), accessToken };
  }
}
