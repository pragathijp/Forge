import { Router } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, rotateRefreshToken } from '../services/tokenService';
import { registerSchema, loginSchema } from '../dto/authDto';
import { ValidationError, UnauthorizedError, ConflictError } from '../utils/errors';

const router = Router();

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid registration data', parsed.error.format());
  }

  const { organizationName, email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('Email already in use');
  }

  const organization = await prisma.organization.create({ data: { name: organizationName } });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, organizationId: organization.id, role: 'ADMIN' },
  });

  const accessToken = generateAccessToken({ userId: user.id, organizationId: organization.id, role: user.role });
  const refreshToken = await generateRefreshToken(user.id);

  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'strict' });
  res.status(201).json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid login data', parsed.error.format());
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const accessToken = generateAccessToken({ userId: user.id, organizationId: user.organizationId, role: user.role });
  const refreshToken = await generateRefreshToken(user.id);

  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'strict' });
  res.status(200).json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    throw new UnauthorizedError('No refresh token provided');
  }

  const result = await rotateRefreshToken(rawToken);
  if (!result) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const accessToken = generateAccessToken({ userId: user.id, organizationId: user.organizationId, role: user.role });

  res.cookie('refreshToken', result.newRawToken, { httpOnly: true, secure: false, sameSite: 'strict' });
  res.status(200).json({ accessToken });
});

router.post('/logout', async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    const { createHash } = await import('crypto');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
  }
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Logged out' });
});

export default router;