// Ensure feature flag and secrets are set before importing app/controller modules
process.env.FEATURE_PASSWORDLESS_AUTH = 'true';
process.env.JWT_SECRET = 'dev-secret';
import request from 'supertest';
import { buildTestApp } from './integration/app.test-setup';
import { getDatabase } from '@tg-payment/core';

describe('TOTP Setup and Verification', () => {
  const app = buildTestApp();
  const testEmail = 'test-totp@example.com';

  let userId: string;
  let secret: string;

  beforeAll(async () => {
    // Optionally use Testcontainers fixture if requested
    if (process.env.USE_TESTCONTAINERS === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { startPostgresFixture } = require('./fixtures/postgresFixture');
      const fixture = await startPostgresFixture();
      process.env.DATABASE_URL = fixture.databaseUrl;
      // store fixture container on global so afterAll can stop it (best-effort)
      (global as any).__tc_fixture = fixture;
    }
    const db = getDatabase();
    await db.none('DELETE FROM dashboard_users WHERE email = $1', [testEmail]);
    const user = await db.one('INSERT INTO dashboard_users (email, role, is_active, created_at, updated_at) VALUES ($1, $2, true, now(), now()) RETURNING *', [testEmail, 'developer']);
    userId = user.id;
  });

  afterAll(async () => {
    const fixture = (global as any).__tc_fixture;
    if (fixture) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { stopPostgresFixture } = require('./fixtures/postgresFixture');
      await stopPostgresFixture(fixture);
    }
  });

  test('should provision TOTP secret and otpauth', async () => {
    const res = await request(app)
      .post('/api/v1/auth/totp/enable')
      .send({ email: testEmail });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.otpauth).toContain('otpauth://totp');
    secret = res.body.data.secret;
  });

  test('should confirm TOTP and generate backup codes', async () => {
    const res = await request(app)
      .post('/api/v1/auth/totp/confirm')
      .send({ user_id: userId, encrypted_secret: secret, confirm: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.backup_codes.length).toBeGreaterThan(0);
  });
});
