process.env.FEATURE_PASSWORDLESS_AUTH = "true";
process.env.JWT_SECRET = "dev-secret";
// Allow tests to receive raw magic link token from controller responses
process.env.EXPOSE_TEST_TOKENS = "true";

import request from "supertest";
import type { Application } from "express";
import type { SuperAgentTest } from "supertest";

// Optionally run this test against a disposable Postgres container when
// USE_TESTCONTAINERS=true. This is off by default to keep CI/environment
// simple. When enabled, we start a container, run migrations, and set
// DATABASE_URL accordingly.
let containerFixture: any = null;

describe("Magic Link Authentication", () => {
  let app: Application;
  let agent: SuperAgentTest;
  const testEmail = "test-magic@example.com";

  beforeAll(async () => {
    if (process.env.USE_TESTCONTAINERS === "true") {
      // Lazy import to avoid pulling testcontainers when not used
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { startPostgresFixture } = require("./fixtures/postgresFixture");
      containerFixture = await startPostgresFixture();
      process.env.DATABASE_URL = containerFixture.databaseUrl;
    }
    
    const { buildTestApp } = await import("./integration/app.test-setup");
    const { getDatabase } = await import("telepaygate-core");
    
    app = buildTestApp();
    agent = request.agent(app);
    
    const db = getDatabase();
    await db.none("DELETE FROM magic_links WHERE email = $1", [testEmail]);
  }, 30000);
  
  afterAll(async () => {
    if (containerFixture) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { stopPostgresFixture } = require("./fixtures/postgresFixture");
      await stopPostgresFixture(containerFixture);
    }
  }, 15000);

  test("should issue a magic link and persist token", async () => {
    const { getDatabase } = await import("telepaygate-core");
    const res = await request(app)
      .post("/api/v1/auth/magic-link")
      .send({ email: testEmail });
    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token_jti).toBeDefined();
    expect(res.body.data.expires_at).toBeDefined();

    // Check DB for persisted token
    const db = getDatabase();
    const row = await db.oneOrNone(
      "SELECT * FROM magic_links WHERE email = $1",
      [testEmail],
    );
    expect(row).not.toBeNull();
    expect(row.token_jti).toBe(res.body.data.token_jti);
  }, 15000);

  test("should verify a valid magic link token and return user from /auth/me", async () => {
    // Issue a magic link
    const issueRes = await agent
      .post("/api/v1/auth/magic-link")
      .send({ email: testEmail });
    const token = issueRes.body.data.token;

    // Verify the magic link (capture cookies from response)
    const verifyRes = await request(app)
      .post("/api/v1/auth/magic-link/verify")
      .set("Content-Type", "application/json")
      .send({ token });
    if (verifyRes.status !== 200) {
      // Print debug info if verification fails
      console.error(
        "Magic link verify response:",
        verifyRes.status,
        verifyRes.body,
      );
    }
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.user).toBeDefined();

    // Call /auth/me with explicit session cookie header
    const rawCookies = verifyRes.headers["set-cookie"];
    const cookieHeader = Array.isArray(rawCookies)
      ? rawCookies.map((c: string) => c.split(";")[0]).join("; ")
      : typeof rawCookies === "string"
        ? rawCookies.split(";")[0]
        : "";
    // cookieHeader contains the `name=value` pairs for the session and csrf cookies
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user).toBeDefined();
  }, 15000);
});
