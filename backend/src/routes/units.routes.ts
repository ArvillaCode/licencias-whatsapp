import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { createBillsForUnit } from '../lib/billHelpers';
import { ah } from '../lib/asyncHandler';

export const unitsRouter = Router();

unitsRouter.get(
  '/',
  ah(async (_req, res) => {
    const units = await prisma.unit.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] });
    res.json(units);
  })
);

unitsRouter.put(
  '/reorder',
  ah(async (req, res) => {
    const { orderedIds } = req.body ?? {};
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'number')) {
      return res.status(400).json({ error: 'orderedIds debe ser un arreglo de números' });
    }
    await prisma.$transaction(
      orderedIds.map((id: number, index: number) =>
        prisma.unit.update({ where: { id }, data: { order: index } })
      )
    );
    res.json({ ok: true });
  })
);

unitsRouter.get(
  '/:id',
  ah(async (req, res) => {
    const unit = await prisma.unit.findUnique({
      where: { id: Number(req.params.id) },
      include: { bills: { include: { billType: true } } },
    });
    if (!unit) return res.status(404).json({ error: 'Unidad no encontrada' });
    res.json(unit);
  })
);

unitsRouter.post(
  '/',
  ah(async (req, res) => {
    const { address, apartmentNo, name, tenantName } = req.body ?? {};
    if (!address || !apartmentNo) {
      return res.status(400).json({ error: 'address y apartmentNo son requeridos' });
    }
    const maxOrder = await prisma.unit.aggregate({ _max: { order: true } });
    const unit = await prisma.unit.create({
      data: { address, apartmentNo, name, tenantName, order: (maxOrder._max.order ?? -1) + 1 },
    });
    await createBillsForUnit(prisma, unit.id, new Date().getFullYear());
    res.status(201).json(unit);
  })
);

unitsRouter.put(
  '/:id',
  ah(async (req, res) => {
    const { address, apartmentNo, name, tenantName } = req.body ?? {};
    try {
      const unit = await prisma.unit.update({
        where: { id: Number(req.params.id) },
        data: { address, apartmentNo, name, tenantName },
      });
      res.json(unit);
    } catch {
      res.status(404).json({ error: 'Unidad no encontrada' });
    }
  })
);

unitsRouter.delete(
  '/:id',
  ah(async (req, res) => {
    try {
      await prisma.unit.delete({ where: { id: Number(req.params.id) } });
      res.status(204).end();
    } catch {
      res.status(404).json({ error: 'Unidad no encontrada' });
    }
  })
);
