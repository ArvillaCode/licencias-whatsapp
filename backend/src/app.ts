import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { authRouter } from './routes/auth.routes';
import { unitsRouter } from './routes/units.routes';
import { billTypesRouter } from './routes/billTypes.routes';
import { billsRouter } from './routes/bills.routes';
import { monthlyRecordsRouter } from './routes/monthlyRecords.routes';
import { evidenceRouter } from './routes/evidence.routes';
import { paymentMethodsRouter, responsiblesRouter } from './routes/catalogs.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { requireAuth } from './middleware/auth';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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
  app.use('/api', api);

  return app;
}
