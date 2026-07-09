import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';
import { requireAdmin } from '../middleware/auth';
import { syncArriendoDueDay } from '../lib/billHelpers';

export const tenantsRouter = Router();

function parseDueDay(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 31) return NaN; // señal de valor inválido
  return n;
}

tenantsRouter.get(
  '/',
  ah(async (_req, res) => {
    const tenants = await prisma.tenant.findMany({
      include: { unit: true },
      orderBy: [{ unitId: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(tenants);
  })
);

tenantsRouter.post(
  '/',
  requireAdmin,
  ah(async (req, res) => {
    const { unitId, name, phone, rentAmount, rentDueDay, contractStartDate, notes } = req.body ?? {};
    if (!unitId || !name || !String(name).trim()) {
      return res.status(400).json({ error: 'unitId y name son requeridos' });
    }
    const dueDay = parseDueDay(rentDueDay);
    if (Number.isNaN(dueDay)) {
      return res.status(400).json({ error: 'El día de pago debe estar entre 1 y 31' });
    }

    // Cierra (con historial) al inquilino activo actual de la unidad, si lo hay.
    await prisma.tenant.updateMany({
      where: { unitId: Number(unitId), moveOutDate: null },
      data: { moveOutDate: new Date() },
    });

    const tenant = await prisma.tenant.create({
      data: {
        unitId: Number(unitId),
        name: String(name).trim(),
        phone: phone || null,
        rentAmount: rentAmount === undefined || rentAmount === null || rentAmount === '' ? null : Number(rentAmount),
        rentDueDay: dueDay ?? null,
        contractStartDate: contractStartDate ? new Date(contractStartDate) : null,
        notes: notes || null,
      },
    });

    if (dueDay !== undefined) {
      await syncArriendoDueDay(prisma, Number(unitId), dueDay ?? null);
    }

    res.status(201).json(tenant);
  })
);

tenantsRouter.put(
  '/:id',
  requireAdmin,
  ah(async (req, res) => {
    const { name, phone, rentAmount, rentDueDay, contractStartDate, notes } = req.body ?? {};
    const dueDay = parseDueDay(rentDueDay);
    if (Number.isNaN(dueDay)) {
      return res.status(400).json({ error: 'El día de pago debe estar entre 1 y 31' });
    }
    try {
      const tenant = await prisma.tenant.update({
        where: { id: Number(req.params.id) },
        data: {
          name: name !== undefined ? String(name).trim() : undefined,
          phone: phone === undefined ? undefined : phone || null,
          rentAmount:
            rentAmount === undefined
              ? undefined
              : rentAmount === null || rentAmount === ''
                ? null
                : Number(rentAmount),
          rentDueDay: dueDay,
          contractStartDate:
            contractStartDate === undefined ? undefined : contractStartDate ? new Date(contractStartDate) : null,
          notes: notes === undefined ? undefined : notes || null,
        },
      });
      if (dueDay !== undefined) {
        await syncArriendoDueDay(prisma, tenant.unitId, dueDay ?? null);
      }
      res.json(tenant);
    } catch {
      res.status(404).json({ error: 'Inquilino no encontrado' });
    }
  })
);

tenantsRouter.post(
  '/:id/end',
  requireAdmin,
  ah(async (req, res) => {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: Number(req.params.id) },
        data: { moveOutDate: new Date() },
      });
      res.json(tenant);
    } catch {
      res.status(404).json({ error: 'Inquilino no encontrado' });
    }
  })
);

tenantsRouter.delete(
  '/:id',
  requireAdmin,
  ah(async (req, res) => {
    try {
      await prisma.tenant.delete({ where: { id: Number(req.params.id) } });
      res.status(204).end();
    } catch {
      res.status(404).json({ error: 'Inquilino no encontrado' });
    }
  })
);
