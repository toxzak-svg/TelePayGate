// Ensure feature flag is set before modules are loaded
process.env.FEATURE_PASSWORDLESS_AUTH = 'true';
process.env.JWT_SECRET = 'dev-secret';
import request from 'supertest';
import createServer from '../../server';
import { initDatabase } from '@tg-payment/core';
import { AuthService } from '@tg-payment/core';

beforeAll(async () => {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tg_user:tg_pass@localhost:5432/tg_payment_test';
  await initDatabase(DATABASE_URL as string);
});

afterAll(() => {
  // nothing for now
});

test('magic link verify -> session cookie -> /auth/me', async () => {

  const app = createServer();
  const agent = request.agent(app);

  const email = `int-test-${Date.now()}@example.com`;
  // Request magic link via core service so we get token back
  const req = await AuthService.requestMagicLink(email, { ip: '127.0.0.1' });
  expect(req.token).toBeDefined();

  // Call verify endpoint and capture cookies from set-cookie header
  const resVerify = await request(app).post('/api/v1/auth/magic-link/verify').send({ token: req.token }).set('Content-Type', 'application/json');
  expect(resVerify.status).toBe(200);

  // Use the returned cookie to call /auth/me explicitly
  const rawCookies = resVerify.headers['set-cookie'];
  const cookieHeader = Array.isArray(rawCookies)
    ? rawCookies.map((c: string) => c.split(';')[0]).join('; ')
    : (typeof rawCookies === 'string' ? rawCookies.split(';')[0] : '');
  const meRes = await request(app).get('/api/v1/auth/me').set('Cookie', cookieHeader);
  expect(meRes.status).toBe(200);
  expect(meRes.body.success).toBe(true);
  expect(meRes.body.data.user.email).toBe(email);
});
