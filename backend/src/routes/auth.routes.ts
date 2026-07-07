import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME, requireAuth, signToken, AuthedRequest } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = signToken(user.id, user.username);
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
  res.json({ id: user.id, username: user.username });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  res.json({ id: user.id, username: user.username });
});
