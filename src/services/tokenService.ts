import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { env } from '../config/env';
import { prisma } from '../config/prisma';

export interface TokenPayload {
  userId: string;
  organizationId: string;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const rawToken = randomBytes(40).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return rawToken;
}

export async function rotateRefreshToken(rawToken: string): Promise<{ userId: string; newRawToken: string } | null> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing || existing.revoked || existing.expiresAt < new Date()) {
    return null;
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revoked: true },
  });

  const newRawToken = await generateRefreshToken(existing.userId);

  return { userId: existing.userId, newRawToken };
}