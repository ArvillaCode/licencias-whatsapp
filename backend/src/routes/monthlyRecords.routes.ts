import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ensureMonthlyRecordsForYear } from '../lib/billHelpers';
import { ah } from '../lib/asyncHandler';
import { requirePermission } from '../middleware/auth';

export const monthlyRecordsRouter = Router();
monthlyRecordsRouter.use(requirePermission('bills'));

monthlyRecordsRouter.get(
  '/bills/:billId/monthly-records',
  ah(async (req, res) => {
    const billId = Number(req.params.billId);
    const year = Number(req.query.year) || new Date().getFullYear();
    await ensureMonthlyRecordsForYear(prisma, billId, year);
    const records = await prisma.monthlyRecord.findMany({
      where: { billId, year },
      include: { evidences: true },
      orderBy: { month: 'asc' },
    });
    res.json(records);
  })
);

monthlyRecordsRouter.get(
  '/monthly-records/:id',
  ah(async (req, res) => {
    const record = await prisma.monthlyRecord.findUnique({
      where: { id: Number(req.params.id) },
      include: { evidences: true },
    });
    if (!record) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(record);
  })
);

monthlyRecordsRouter.put(
  '/monthly-records/:id',
  ah(async (req, res) => {
    const { responsible, amountPaid, paymentMethod, paidAt, notes } = req.body ?? {};
    try {
      const record = await prisma.monthlyRecord.update({
        where: { id: Number(req.params.id) },
        data: {
          responsible,
          amountPaid: amountPaid === undefined || amountPaid === null || amountPaid === '' ? null : Number(amountPaid),
          paymentMethod,
          paidAt: paidAt ? new Date(paidAt) : null,
          notes,
        },
        include: { evidences: true },
      });
      res.json(record);
    } catch {
      res.status(404).json({ error: 'Registro no encontrado' });
    }
  })
);
