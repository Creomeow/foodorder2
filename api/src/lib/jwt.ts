import jwt from 'jsonwebtoken';
import type { Role } from '@foodorder/shared';
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  brandId: string | null;
  restaurantId: string | null;
}

export function signAccessToken(payload: JwtPayload): string {
  const opts = { expiresIn: env.jwt.accessTtl } as jwt.SignOptions;
  return jwt.sign(payload, env.jwt.accessSecret, opts);
}

export function signRefreshToken(payload: JwtPayload): string {
  const opts = { expiresIn: env.jwt.refreshTtl } as jwt.SignOptions;
  return jwt.sign(payload, env.jwt.refreshSecret, opts);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
}
