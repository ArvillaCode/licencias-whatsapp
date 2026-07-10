import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Autenticación', () => {
  it('rechaza acceso sin cookie a /api/units con 401', async () => {
    const res = await supertest(app).get('/api/units');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('No autenticado');
  });

  it('rechaza acceso sin cookie a /api/bill-types con 401', async () => {
    const res = await supertest(app).get('/api/bill-types');
    expect(res.status).toBe(401);
  });

  it('rechaza acceso sin cookie a /api/dashboard/summary con 401', async () => {
    const res = await supertest(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });
});
