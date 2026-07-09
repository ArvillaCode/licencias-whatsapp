import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { authRouter } from './routes/auth.routes';
import { unitsRouter } from './routes/units.routes';
import { billTypesRouter } from './routes/billTypes.routes';
import { billsRouter } from './routes/bills.routes';
import { monthlyRecordsRouter } from './routes/monthlyRecords.routes';
import { evidenceRouter } from './routes/evidence.routes';
import { paymentMethodsRouter, responsiblesRouter } from './routes/catalogs.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { usersRouter } from './routes/users.routes';
import { tenantsRouter } from './routes/tenants.routes';
import { requireAuth } from './middleware/auth';

export function createApp() {
  const app = express();

  const onVercel = !!process.env.VERCEL;

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // En local, las evidencias se sirven desde disco. En Vercel vienen de Blob (URL directa).
  if (!onVercel) {
    app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
  }

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);

  // Todo lo demás bajo /api requiere sesión.
  const api = express.Router();
  api.use(requireAuth);
  api.use('/units', unitsRouter);
  api.use('/bill-types', billTypesRouter);
  api.use('/', billsRouter);
  api.use('/', monthlyRecordsRouter);
  api.use('/', evidenceRouter);
  api.use('/payment-methods', paymentMethodsRouter);
  api.use('/responsibles', responsiblesRouter);
  api.use('/dashboard', dashboardRouter);
  api.use('/users', usersRouter);
  api.use('/tenants', tenantsRouter);
  app.use('/api', api);

  // En Vercel el frontend estático lo sirve el CDN; localmente lo sirve Express.
  if (!onVercel) {
    const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un elemento con ese nombre.' });
      return;
    }
    if (err instanceof multer.MulterError || (err instanceof Error && err.message === 'Formato de imagen no soportado')) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
