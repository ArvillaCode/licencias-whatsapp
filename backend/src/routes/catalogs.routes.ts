import { Router } from 'express';
import { prisma } from '../lib/prisma';

function buildCatalogRouter(model: 'paymentMethod' | 'responsible') {
  const router = Router();
  const db = () => (prisma[model] as any);

  router.get('/', async (_req, res) => {
    const items = await db().findMany({ orderBy: { name: 'asc' } });
    res.json(items);
  });

  router.post('/', async (req, res) => {
    const { name } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name es requerido' });
    const item = await db().create({ data: { name } });
    res.status(201).json(item);
  });

  router.put('/:id', async (req, res) => {
    const { name, active } = req.body ?? {};
    try {
      const item = await db().update({ where: { id: Number(req.params.id) }, data: { name, active } });
      res.json(item);
    } catch {
      res.status(404).json({ error: 'No encontrado' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await db().update({ where: { id: Number(req.params.id) }, data: { active: false } });
      res.status(204).end();
    } catch {
      res.status(404).json({ error: 'No encontrado' });
    }
  });

  return router;
}

export const paymentMethodsRouter = buildCatalogRouter('paymentMethod');
export const responsiblesRouter = buildCatalogRouter('responsible');
