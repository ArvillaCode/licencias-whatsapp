import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAdmin } from '../middleware/auth';

export const billsRouter = Router();

billsRouter.get(
  '/units/:unitId/bills',
  ah(async (req, res) => {
    const bills = await prisma.bill.findMany({
      where: { unitId: Number(req.params.unitId), billType: { active: true } },
      include: { billType: true },
      orderBy: { billType: { order: 'asc' } },
    });
    res.json(bills);
  })
);

billsRouter.get(
  '/bills/:id',
  ah(async (req, res) => {
    const bill = await prisma.bill.findUnique({
      where: { id: Number(req.params.id) },
      include: { billType: true },
    });
    if (!bill) return res.status(404).json({ error: 'Recibo no encontrado' });
    res.json(bill);
  })
);

billsRouter.put(
  '/bills/:id',
  requireAdmin,
  ah(async (req, res) => {
    const { billNumber, dueDay } = req.body ?? {};
    if (dueDay !== undefined && dueDay !== null) {
      const n = Number(dueDay);
      if (!Number.isInteger(n) || n < 1 || n > 31) {
        return res.status(400).json({ error: 'El día de vencimiento debe estar entre 1 y 31' });
      }
    }
    try {
      const bill = await prisma.bill.update({
        where: { id: Number(req.params.id) },
        data: { billNumber, dueDay: dueDay === undefined ? undefined : dueDay === null ? null : Number(dueDay) },
      });
      res.json(bill);
    } catch {
      res.status(404).json({ error: 'Recibo no encontrado' });
    }
  })
);
