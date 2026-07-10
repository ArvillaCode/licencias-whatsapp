import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('GET /api/health', () => {
  it('responde con ok: true', async () => {
    const res = await supertest(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('POST /api/auth/login', () => {
  it('rechaza email vacío con 400', async () => {
    const res = await supertest(app).post('/api/auth/login').send({ email: '', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('requeridos');
  });

  it('rechaza password vacío con 400', async () => {
    const res = await supertest(app).post('/api/auth/login').send({ email: 'test@test.com', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('requeridos');
  });

  it('rechaza credenciales inválidas con 401', async () => {
    const res = await supertest(app).post('/api/auth/login').send({ email: 'noexiste@test.com', password: 'xyz' });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('inválidas');
  });

  it('rechaza usuario inactivo con 401', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@test.com', password: 'xyz' });
    expect(res.status).toBe(401);
  });
});
