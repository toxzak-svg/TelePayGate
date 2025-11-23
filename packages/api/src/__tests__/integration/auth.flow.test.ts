import request from 'supertest';
import createServer from '../../server';
import { initDatabase } from '@tg-payment/core';
import AuthService from '@tg-payment/core/dist/services/auth.service';

beforeAll(async () => {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tg_user:tg_pass@localhost:5432/tg_payment_test';
  await initDatabase(DATABASE_URL as string);
});

afterAll(() => {
  // nothing for now
});

test('magic link verify -> session cookie -> /auth/me', async () => {
  const app = createServer();

  const email = `int-test-${Date.now()}@example.com`;
  // Request magic link via core service so we get token back
  const req = await AuthService.requestMagicLink(email, { ip: '127.0.0.1' });
  expect(req.token).toBeDefined();

  // Call verify endpoint
  const resVerify = await request(app).post('/api/v1/auth/magic-link/verify').send({ token: req.token });
  expect(resVerify.status).toBe(200);

  const cookies = Array.isArray(resVerify.headers['set-cookie']) ? resVerify.headers['set-cookie'] : [resVerify.headers['set-cookie']];
  expect(cookies.length).toBeGreaterThan(0);
  const sessionCookie = cookies.find((c: string) => c.startsWith('session_id='));
  const csrfCookie = cookies.find((c: string) => c.startsWith('csrf_token='));
  expect(sessionCookie).toBeDefined();
  expect(csrfCookie).toBeDefined();

  // Use cookies to call /auth/me
  const cookieHeader = [sessionCookie, csrfCookie].filter(Boolean).join('; ');
  const meRes = await request(app)
    .get('/api/v1/auth/me')
    .set('Cookie', cookieHeader);
  expect(meRes.status).toBe(200);
  expect(meRes.body.success).toBe(true);
  expect(meRes.body.data.user.email).toBe(email);
});
