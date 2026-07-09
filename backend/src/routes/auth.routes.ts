import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME, requireAuth, signToken, AuthedRequest } from '../middleware/auth';
import { ah } from '../lib/asyncHandler';

export const authRouter = Router();

authRouter.post(
  '/login',
  ah(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = signToken(user.id, user.email);
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: !!process.env.VERCEL,
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });
    res.json({ id: user.id, email: user.email, role: user.role, permissions: user.permissions });
  })
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !!process.env.VERCEL,
  });
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  ah(async (req: AuthedRequest, res) => {
    const u = req.authUser!;
    res.json({ id: u.id, email: u.email, role: u.role, permissions: u.permissions });
  })
);
