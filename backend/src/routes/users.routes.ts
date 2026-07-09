import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAdmin, type AuthedRequest } from '../middleware/auth';
import { generatePassword } from '../lib/password';

export const usersRouter = Router();

usersRouter.use(requireAdmin);

const publicUser = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

usersRouter.get(
  '/',
  ah(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: publicUser,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    res.json(users);
  })
);

usersRouter.post(
  '/',
  ah(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const name = String(req.body?.name ?? '').trim();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Correo electrónico no válido' });
    }
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: 'USER', active: true },
      select: publicUser,
    });

    // La contraseña en texto plano se devuelve una sola vez para que el admin la comparta.
    res.status(201).json({ user, password });
  })
);

usersRouter.put(
  '/:id',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const user = await prisma.user.update({ where: { id }, data: { name }, select: publicUser });
    res.json(user);
  })
);

usersRouter.post(
  '/:id/reset-password',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    res.json({ password });
  })
);

usersRouter.put(
  '/:id/active',
  ah(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    const active = Boolean(req.body?.active);
    if (id === req.authUser?.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.role === 'ADMIN' && !active) {
      return res.status(400).json({ error: 'No se puede desactivar a un administrador' });
    }
    const user = await prisma.user.update({ where: { id }, data: { active }, select: publicUser });
    res.json(user);
  })
);

usersRouter.delete(
  '/:id',
  ah(async (req: AuthedRequest, res) => {
    const id = Number(req.params.id);
    if (id === req.authUser?.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.role === 'ADMIN') {
      return res.status(400).json({ error: 'No se puede eliminar a un administrador' });
    }
    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  })
);
