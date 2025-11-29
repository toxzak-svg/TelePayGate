import { initDatabase, closeDatabase, getDatabase } from "../db/connection";
import AuthService from "../services/auth.service";

beforeAll(async () => {
  // Optionally start Testcontainers fixture when requested
  if (process.env.USE_TESTCONTAINERS === "true") {
    // compute path to api fixture
    const path = await import("path");
    const fixturePath = path.resolve(
      __dirname,
      "../../../../api/src/__tests__/fixtures/postgresFixture",
    );
    const mod = await import(fixturePath);
    const { startPostgresFixture } = mod;
    const fixture = await startPostgresFixture();
    process.env.DATABASE_URL = fixture.databaseUrl;
    (global as any).__tc_fixture = fixture;
  }
  // use test db URL
  initDatabase(
    process.env.DATABASE_URL ||
      "postgresql://tg_user:tg_pass@localhost:5432/tg_payment_test",
  );
});

afterAll(async () => {
  try {
    closeDatabase();
  } catch (e) {
    /* ignore cleanup errors */
  }
  const fixture = (global as any).__tc_fixture;
  if (fixture) {
    const path = await import("path");
    const fixturePath = path.resolve(
      __dirname,
      "../../../../api/src/__tests__/fixtures/postgresFixture",
    );
    const mod = await import(fixturePath);
    const { stopPostgresFixture } = mod;
    await stopPostgresFixture(fixture);
  }
});

test("persistTotpAndBackupCodes stores secret and backup codes", async () => {
  const db = getDatabase();
  // Clean up any existing test user and related records
  await db.none(
    "DELETE FROM backup_codes WHERE user_id IN (SELECT id FROM dashboard_users WHERE email = $1)",
    ["test-totp@example.com"],
  );
  await db.none(
    "DELETE FROM totp_secrets WHERE user_id IN (SELECT id FROM dashboard_users WHERE email = $1)",
    ["test-totp@example.com"],
  );
  await db.none("DELETE FROM dashboard_users WHERE email = $1", [
    "test-totp@example.com",
  ]);
  // create a dummy dashboard user
  const user = await db.one(
    "INSERT INTO dashboard_users (email, role, is_active, created_at, updated_at) VALUES ($1, $2, true, now(), now()) RETURNING *",
    ["test-totp@example.com", "developer"],
  );
  const userId = user.id;

  const secret = Buffer.from("my-secret").toString("base64");
  const backupPlain = ["code1", "code2", "code3"];

  await AuthService.persistTotpAndBackupCodes(userId, secret, backupPlain);

  const totp = await db.oneOrNone(
    "SELECT * FROM totp_secrets WHERE user_id = $1",
    [userId],
  );
  expect(totp).not.toBeNull();

  const codes = await db.any("SELECT * FROM backup_codes WHERE user_id = $1", [
    userId,
  ]);
  expect(codes.length).toBeGreaterThanOrEqual(3);

  // ensure hashed values don't equal plain codes
  const match = codes.some(
    (r: { code_hash: string }) => r.code_hash === "code1",
  );
  expect(match).toBe(false);
});
