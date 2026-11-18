import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { config } from '../config/environment';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Generates a short-lived JWT Access Token (15 minutes)
 */
export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: '15m',
  };
  return jwt.sign(payload, config.jwt.accessSecret, options);
}

/**
 * Generates a cryptographically secure random Refresh Token string
 */
export function generateRefreshTokenString(): string {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Hashes a token using SHA-256 before database storage
 * Ensures raw tokens are never exposed in Neon PostgreSQL
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verifies JWT Access Token
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}
