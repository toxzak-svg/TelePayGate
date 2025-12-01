process.env.FEATURE_PASSWORDLESS_AUTH = "true";
process.env.JWT_SECRET = "dev-secret";
import request from "supertest";
import { buildTestApp } from "./integration/app.test-setup";
import { getDatabase } from "@tg-payment/core";

describe("Email/password registration & login", () => {
  const app = buildTestApp();
  const email = "email-login-test@example.com";
  const password = "verysecurepw";

  beforeAll(async () => {
    const db = getDatabase();
    await db.none("DELETE FROM dashboard_users WHERE email = $1", [email]);
  });

  test("register should create a dashboard user and set cookies", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);

    // DB row exists
    const db = getDatabase();
    const row = await db.oneOrNone("SELECT * FROM dashboard_users WHERE email = $1", [email]);
    expect(row).not.toBeNull();
    expect(row.password_hash).toBeDefined();
    // cookie set
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("login with correct password should create session cookie", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("login with wrong password returns 401", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email, password: "badpw" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
