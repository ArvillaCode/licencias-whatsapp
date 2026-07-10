import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import supertest from 'supertest';
import { prisma } from '../lib/prisma';
import { createApp } from '../app';
import { signToken, AUTH_COOKIE_NAME } from '../middleware/auth';

const app = createApp();

async function loginAs(email: string, password: string) {
  const res = await supertest(app).post('/api/auth/login').send({ email, password });
  return res.headers['set-cookie']?.[0] ?? '';
}

describe('Units CRUD', () => {
  let cookie: string;

  beforeAll(async () => {
    // Crear admin de prueba
    const hash = await bcrypt.hash('test123', 10);
    await prisma.user.upsert({
      where: { email: 'test-admin@test.com' },
      update: { role: 'ADMIN', active: true, name: 'Test Admin' },
      create: { email: 'test-admin@test.com', name: 'Test Admin', passwordHash: hash, role: 'ADMIN' },
    });

    cookie = await loginAs('test-admin@test.com', 'test123');
  });

  it('obtiene lista vacía de unidades', async () => {
    const res = await supertest(app).get('/api/units').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('crea una unidad', async () => {
    const res = await supertest(app)
      .post('/api/units')
      .set('Cookie', cookie)
      .send({ address: 'Test Address', apartmentNo: '1A' });
    expect(res.status).toBe(201);
    expect(res.body.address).toBe('Test Address');
    expect(res.body.apartmentNo).toBe('1A');
  });

  it('obtiene detalle de unidad con bills', async () => {
    const list = await supertest(app).get('/api/units').set('Cookie', cookie);
    const unit = list.body[list.body.length - 1];

    const res = await supertest(app).get(`/api/units/${unit.id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(unit.id);
    expect(Array.isArray(res.body.bills)).toBe(true);
  });

  it('actualiza una unidad', async () => {
    const list = await supertest(app).get('/api/units').set('Cookie', cookie);
    const unit = list.body[list.body.length - 1];

    const res = await supertest(app)
      .put(`/api/units/${unit.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Unidad Renombrada' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Unidad Renombrada');
  });

  it('rechaza crear unidad sin admin', async () => {
    // Crear usuario normal
    const hash = await bcrypt.hash('test123', 10);
    await prisma.user.upsert({
      where: { email: 'test-user@test.com' },
      update: { role: 'USER', active: true, name: 'Test User' },
      create: { email: 'test-user@test.com', name: 'Test User', passwordHash: hash, role: 'USER' },
    });

    const userCookie = await loginAs('test-user@test.com', 'test123');
    const res = await supertest(app)
      .post('/api/units')
      .set('Cookie', userCookie)
      .send({ address: 'X', apartmentNo: '1' });
    expect(res.status).toBe(403);
  });

  it('rechaza borrar unidad sin admin', async () => {
    const userCookie = await loginAs('test-user@test.com', 'test123');
    const res = await supertest(app).delete('/api/units/999').set('Cookie', userCookie);
    expect(res.status).toBe(403);
  });
});
