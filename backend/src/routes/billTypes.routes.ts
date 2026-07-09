import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { backfillBillForNewType } from '../lib/billHelpers';
import { ah } from '../lib/asyncHandler';
import { requireAdmin } from '../middleware/auth';

export const billTypesRouter = Router();

billTypesRouter.get(
  '/',
  ah(async (_req, res) => {
    const types = await prisma.billType.findMany({ orderBy: { order: 'asc' } });
    res.json(types);
  })
);

billTypesRouter.post(
  '/',
  requireAdmin,
  ah(async (req, res) => {
    const { name, order, paymentUrl } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name es requerido' });
    const count = await prisma.billType.count();
    const billType = await prisma.billType.create({
      data: { name, order: order ?? count, paymentUrl: paymentUrl || null },
    });
    await backfillBillForNewType(prisma, billType.id, new Date().getFullYear());
    res.status(201).json(billType);
  })
);

billTypesRouter.put(
  '/:id',
  requireAdmin,
  ah(async (req, res) => {
    const { name, order, active, paymentUrl } = req.body ?? {};
    try {
      const billType = await prisma.billType.update({
        where: { id: Number(req.params.id) },
        data: { name, order, active, paymentUrl: paymentUrl === undefined ? undefined : paymentUrl || null },
      });
      res.json(billType);
    } catch {
      res.status(404).json({ error: 'Tipo no encontrado' });
    }
  })
);

billTypesRouter.delete(
  '/:id',
  requireAdmin,
  ah(async (req, res) => {
    try {
      await prisma.billType.update({ where: { id: Number(req.params.id) }, data: { active: false } });
      res.status(204).end();
    } catch {
      res.status(404).json({ error: 'Tipo no encontrado' });
    }
  })
);
