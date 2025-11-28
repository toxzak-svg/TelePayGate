import { AuthService, getDatabase, initDatabase } from '@tg-payment/core';
describe('Backup Codes Integration', () => {
  const codes = AuthService.generateBackupCodes(5);
  let userId: string;

  beforeAll(async () => {
    // Optionally start Testcontainers fixture when requested
    if (process.env.USE_TESTCONTAINERS === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { startPostgresFixture } = require('./fixtures/postgresFixture');
      const fixture = await startPostgresFixture();
      process.env.DATABASE_URL = fixture.databaseUrl;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).__tc_fixture = fixture;
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL must be set for backup codes test');
    initDatabase(dbUrl);
    const db = getDatabase();
    // create a dashboard user and use its id
    await db.none('DELETE FROM dashboard_users WHERE email = $1', ['test-backup@example.com']);
    const user = await db.one('INSERT INTO dashboard_users (email, role, is_active, created_at, updated_at) VALUES ($1, $2, true, now(), now()) RETURNING id', ['test-backup@example.com', 'developer']);
    userId = user.id;
    await db.none('DELETE FROM backup_codes WHERE user_id = $1', [userId]);
  });

  afterAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixture = (global as any).__tc_fixture;
    if (fixture) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { stopPostgresFixture } = require('./fixtures/postgresFixture');
      await stopPostgresFixture(fixture);
    }
  });

  test('should persist and verify backup codes', async () => {
    await AuthService.persistTotpAndBackupCodes(userId, Buffer.from('secret').toString('base64'), codes);
    const db = getDatabase();
    const rows = await db.any('SELECT * FROM backup_codes WHERE user_id = $1', [userId]);
    expect(rows.length).toBe(5);
    // Hashes should not match plain codes
    for (let i = 0; i < codes.length; i++) {
      expect(rows[i].code_hash).not.toBe(codes[i]);
    }
  });
});
