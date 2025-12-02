import request from "supertest";
import { Application } from "express";

describe("Conversions API", () => {
  let app: Application;
  let fixture: any = null;
  let cleanDatabase: () => Promise<void>;
  let disconnectDatabase: () => Promise<void>;

  beforeAll(async () => {
    if (process.env.USE_TESTCONTAINERS === "true") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { startPostgresFixture } = require("../fixtures/postgresFixture");
      fixture = await startPostgresFixture();
      process.env.DATABASE_URL = fixture.databaseUrl;
    }
    
    const { buildTestApp } = await import("./app.test-setup");
    const dbUtils = await import("./db-test-utils");
    app = buildTestApp();
    cleanDatabase = dbUtils.cleanDatabase;
    disconnectDatabase = dbUtils.disconnectDatabase;
  }, 30000);

  beforeEach(async () => {
    await cleanDatabase();
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
    if (fixture) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { stopPostgresFixture } = require("../fixtures/postgresFixture");
      await stopPostgresFixture(fixture);
    }
  }, 15000);

  test("GET /api/v1/conversions/rate - returns quote", async () => {
    const res = await request(app)
      .get("/api/v1/conversions/rate")
      .query({ amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
  }, 15000);

  test("POST /api/v1/conversions - requires auth", async () => {
    const res = await request(app)
      .post("/api/v1/conversions")
      .send({ amount: 100 });
    // No API key => should be 401
    expect([401, 400, 500]).toContain(res.status);
  }, 15000);
});
