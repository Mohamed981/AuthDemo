export const AUTH_COOKIE = 'access_token';

// Tighter limit than the global default to slow down credential stuffing.
export const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

export interface JwtPayload {
  sub: string;
}
