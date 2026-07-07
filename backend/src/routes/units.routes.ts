import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { createBillsForUnit } from '../lib/billHelpers';

export const unitsRouter = Router();

unitsRouter.get('/', async (_req, res) => {
  const units = await prisma.unit.findMany({ orderBy: { id: 'asc' } });
  res.json(units);
});

unitsRouter.get('/:id', async (req, res) => {
  const unit = await prisma.unit.findUnique({
    where: { id: Number(req.params.id) },
    include: { bills: { include: { billType: true } } },
  });
  if (!unit) return res.status(404).json({ error: 'Unidad no encontrada' });
  res.json(unit);
});

unitsRouter.post('/', async (req, res) => {
  const { address, apartmentNo, name, tenantName } = req.body ?? {};
  if (!address || !apartmentNo) {
    return res.status(400).json({ error: 'address y apartmentNo son requeridos' });
  }
  const unit = await prisma.unit.create({ data: { address, apartmentNo, name, tenantName } });
  await createBillsForUnit(prisma, unit.id, new Date().getFullYear());
  res.status(201).json(unit);
});

unitsRouter.put('/:id', async (req, res) => {
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
});

unitsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.unit.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Unidad no encontrada' });
  }
});
