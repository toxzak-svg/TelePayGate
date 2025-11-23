import request from 'supertest';
import { Application } from 'express';
console.log('[test-debug] USE_TESTCONTAINERS=', process.env.USE_TESTCONTAINERS);
// Fixture setup (container start + migrations) may take longer than Jest's default timeout
jest.setTimeout(120000);
import { buildPasswordlessTestApp } from './auth.passwordless-app.test-setup';
import { resetPasswordlessStub } from './stubs/passwordless.stub.controller';

describe('Passwordless Auth (Isolated or Fixture)', () => {
  let app: Application | null = null;
  let fixture: { databaseUrl: string } | null = null;

  beforeAll(async () => {
    if (process.env.USE_TESTCONTAINERS === 'true') {
      // Start fixture and use real integration app
      // Lazy-load to avoid pulling testcontainers for the default path
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      try {
        const mod = await import('./fixtures/postgresFixture');
        const { startPostgresFixture } = mod;
        fixture = await startPostgresFixture();
      } catch (err) {
        console.error('[test-debug] startPostgresFixture error:', err && (err.stack || err.message || err));
        throw err;
      }
      process.env.DATABASE_URL = fixture.databaseUrl;
      // Enable feature and token exposure for deterministic tests
      process.env.FEATURE_PASSWORDLESS_AUTH = 'true';
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
      process.env.EXPOSE_TEST_TOKENS = 'true';

      // Use the real integration app
      try {
        const mod2 = await import('./integration/app.test-setup');
        const { buildTestApp } = mod2;
        app = buildTestApp();
        console.log('[test-debug] Started fixture, built integration app');
      } catch (err) {
        console.error('[test-debug] buildTestApp error:', err && (err.stack || err.message || err));
        throw err;
      }
    }
  });

  afterAll(async () => {
    if (fixture) {
      const mod = await import('./fixtures/postgresFixture');
      const { stopPostgresFixture } = mod;
      await stopPostgresFixture(fixture);
    }
  });

  beforeEach(() => {
    if (!app) {
      // Default: isolated stub app
      resetPasswordlessStub();
      app = buildPasswordlessTestApp();
    }
  });

  it('should request and verify magic link, then access /auth/me', async () => {
    const email = 'test@example.com';

    // Request magic link
    const res1 = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email })
      .set('Content-Type', 'application/json');

    if (process.env.USE_TESTCONTAINERS === 'true') {
      console.log('[test-debug] magic-link response:', res1.status, JSON.stringify(res1.body));
    }

    // When using the real controllers + EXPOSE_TEST_TOKENS, token is in res.body.data.token
    // When using the stub, token is in res.body.token
    let token: string | undefined;
    if (res1.body?.data?.token) token = res1.body.data.token;
    if (!token && res1.body?.token) token = res1.body.token;

    expect(res1.status === 200 || res1.status === 202 || res1.status === 201 || res1.status === 202).toBeTruthy();
    expect(token).toBeDefined();

    // Verify magic link
    const res2 = await request(app)
      .post('/api/v1/auth/magic-link/verify')
      .send({ token })
      .set('Content-Type', 'application/json');
    if (process.env.USE_TESTCONTAINERS === 'true') {
      console.log('[test-debug] verify response:', res2.status, JSON.stringify(res2.body), 'headers:', res2.headers && res2.headers['set-cookie']);
    }
    expect(res2.status).toBe(200);
    const cookies = res2.headers['set-cookie'];

    // Access /auth/me with session cookie
    const req3 = request(app).get('/api/v1/auth/me').set('Content-Type', 'application/json');
    if (cookies && Array.isArray(cookies)) {
      // normalize Set-Cookie -> Cookie header
      const cookieHeader = cookies.map((c: string) => c.split(';')[0]).join('; ');
      req3.set('Cookie', cookieHeader);
    }
    const res3 = await req3;
    expect(res3.status).toBe(200);
    if (res3.body?.data?.user?.email) {
      expect(res3.body.data.user.email).toBe(email);
    } else if (res3.body?.email) {
      expect(res3.body.email).toBe(email);
    }
  });
});
