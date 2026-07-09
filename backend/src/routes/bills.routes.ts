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
    const { billNumber, dueDate } = req.body ?? {};
    try {
      const bill = await prisma.bill.update({
        where: { id: Number(req.params.id) },
        data: { billNumber, dueDate: dueDate ? new Date(dueDate) : null },
      });
      res.json(bill);
    } catch {
      res.status(404).json({ error: 'Recibo no encontrado' });
    }
  })
);
