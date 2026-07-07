import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const COOKIE_NAME = 'token';
const TOKEN_TTL = '30d';

export interface AuthedRequest extends Request {
  userId?: number;
}

export function signToken(userId: number, username: string) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}
