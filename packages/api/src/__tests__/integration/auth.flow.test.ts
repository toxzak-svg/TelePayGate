// Ensure feature flag is set before modules are loaded
process.env.FEATURE_PASSWORDLESS_AUTH = "true";
process.env.JWT_SECRET = "dev-secret";
import request from "supertest";
import { Application } from "express";

// We'll lazy-require server/core modules when starting the fixture so DB URL
// can be injected before modules create DB connections.
let createServer: (() => Application) | undefined;
let initDatabase: any;
let AuthService:
  | {
      requestMagicLink: (
        email: string,
        opts?: unknown,
      ) => Promise<{ token?: string }>;
    }
  | undefined;

beforeAll(async () => {
  jest.setTimeout(60_000);
  // Optionally start Testcontainers fixture when requested
  if (process.env.USE_TESTCONTAINERS === "true") {
    const mod = await import("../fixtures/postgresFixture");
    const { startPostgresFixture } = mod;
    const fixture = await startPostgresFixture();
    process.env.DATABASE_URL = fixture.databaseUrl;
    (global as any).__tc_fixture = fixture;

    // Now import modules that rely on DATABASE_URL
    const srv = await import("../../server");
    createServer = srv.default;
    const coreMod = await import("@tg-payment/core");
    initDatabase = coreMod.initDatabase;
    AuthService = coreMod.AuthService;
  } else {
    // Non-fixture path: import modules normally
    const srv = await import("../../server");
    createServer = srv.default;
    const coreMod = await import("@tg-payment/core");
    initDatabase = coreMod.initDatabase;
    AuthService = coreMod.AuthService;
  }

  const DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://tg_user:tg_pass@localhost:5432/tg_payment_test";
  await initDatabase(DATABASE_URL as string);
});

afterAll(async () => {
  const fixture = (global as any).__tc_fixture;
  if (fixture) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { stopPostgresFixture } = require("../fixtures/postgresFixture");
    await stopPostgresFixture(fixture);
  }
});

test("magic link verify -> session cookie -> /auth/me", async () => {
  const app = createServer();
  const agent = request.agent(app);

  const email = `int-test-${Date.now()}@example.com`;
  // Request magic link via core service so we get token back
  const req = await AuthService.requestMagicLink(email, { ip: "127.0.0.1" });
  expect(req.token).toBeDefined();

  // Call verify endpoint and capture cookies from set-cookie header
  const resVerify = await agent
    .post("/api/v1/auth/magic-link/verify")
    .send({ token: req.token })
    .set("Content-Type", "application/json");
  expect(resVerify.status).toBe(200);

  // Use the returned cookie to call /auth/me explicitly
  const rawCookies = resVerify.headers["set-cookie"];
  const cookieHeader = Array.isArray(rawCookies)
    ? rawCookies.map((c: string) => c.split(";")[0]).join("; ")
    : typeof rawCookies === "string"
      ? rawCookies.split(";")[0]
      : "";
  const meRes = await agent.get("/api/v1/auth/me").set("Cookie", cookieHeader);
  expect(meRes.status).toBe(200);
  expect(meRes.body.success).toBe(true);
  expect(meRes.body.data.user.email).toBe(email);
});
