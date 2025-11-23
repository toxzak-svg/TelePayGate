
process.env.FEATURE_PASSWORDLESS_AUTH = 'true';
process.env.JWT_SECRET = 'dev-secret';
import request from 'supertest';
import { buildTestApp } from './integration/app.test-setup';
import { getDatabase } from '@tg-payment/core';

describe('Magic Link Authentication', () => {
  const app = buildTestApp();
  const agent = request.agent(app);
  const testEmail = 'test-magic@example.com';

  beforeAll(async () => {
    const db = getDatabase();
    await db.none('DELETE FROM magic_links WHERE email = $1', [testEmail]);
  });

  test('should issue a magic link and persist token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: testEmail });
    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token_jti).toBeDefined();
    expect(res.body.data.expires_at).toBeDefined();

    // Check DB for persisted token
    const db = getDatabase();
    const row = await db.oneOrNone('SELECT * FROM magic_links WHERE email = $1', [testEmail]);
    expect(row).not.toBeNull();
    expect(row.token_jti).toBe(res.body.data.token_jti);
  });

  test('should verify a valid magic link token and return user from /auth/me', async () => {
    // Issue a magic link
    const issueRes = await agent
      .post('/api/v1/auth/magic-link')
      .send({ email: testEmail });
    const token = issueRes.body.data.token;

    // Verify the magic link (capture cookies from response)
    const verifyRes = await request(app)
      .post('/api/v1/auth/magic-link/verify')
      .set('Content-Type', 'application/json')
      .send({ token });
    if (verifyRes.status !== 200) {
      // Print debug info if verification fails
      console.error('Magic link verify response:', verifyRes.status, verifyRes.body);
    }
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.user).toBeDefined();

    // Call /auth/me with explicit session cookie header
    const rawCookies = verifyRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(rawCookies)
      ? rawCookies.map((c: string) => c.split(';')[0]).join('; ')
      : (typeof rawCookies === 'string' ? rawCookies.split(';')[0] : '');
    // cookieHeader contains the `name=value` pairs for the session and csrf cookies
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user).toBeDefined();
  });
});
