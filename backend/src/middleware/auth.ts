import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import type { PermissionKey } from '../lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const COOKIE_NAME = 'token';
const TOKEN_TTL = '30d';

export interface AuthedUser {
  id: number;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthedRequest extends Request {
  userId?: number;
  authUser?: AuthedUser;
}

export function signToken(userId: number, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  let payload: { userId: number; email: string };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Cuenta no disponible' });
    }

    req.userId = user.id;
    req.authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function isAdmin(user?: AuthedUser) {
  return user?.role === 'ADMIN';
}

export function hasPermission(user: AuthedUser | undefined, key: PermissionKey) {
  return isAdmin(user) || !!user?.permissions.includes(key);
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!isAdmin(req.authUser)) {
    return res.status(403).json({ error: 'Solo el administrador puede realizar esta acción' });
  }
  next();
}

export function requirePermission(key: PermissionKey) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!hasPermission(req.authUser, key)) {
      return res.status(403).json({ error: 'No tienes permiso para esta sección' });
    }
    next();
  };
}
