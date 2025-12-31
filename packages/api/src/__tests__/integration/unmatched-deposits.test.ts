import request from "supertest";
import { Application } from "express";

describe("Unmatched Deposits", () => {
  let app: Application;
  let cleanDatabase: () => Promise<void>;
  let disconnectDatabase: () => Promise<void>;

  beforeAll(async () => {
    const { buildTestApp } = await import("./app.test-setup");
    const dbUtils = await import("./db-test-utils");
    app = buildTestApp();
    cleanDatabase = dbUtils.cleanDatabase;
    disconnectDatabase = dbUtils.disconnectDatabase;
  }, 30000);

  beforeEach(async () => {
    await cleanDatabase();
  }, 15000);

  afterAll(async () => {
    try {
      const core: any = await import("telepaygate-core");
      if (typeof core.closeDatabase === "function") await core.closeDatabase();
      else if (core.default && typeof core.default.closeDatabase === "function") await core.default.closeDatabase();
    } catch (e) {
      // ignore
    }
  }, 15000);

  test("it should handle an unexpected deposit", async () => {
    // This test will simulate an incoming TON transaction that does not match any pending deposit.
    // The system should gracefully handle this and, ideally, notify the user.

    // For now, we will just check that the system does not crash and returns a 200 OK.
    // In the future, we will implement a notification system and test for that.

    const payload = {
      // This payload will simulate a webhook from a TON scanner indicating a new transaction.
      // The format of this payload will depend on the TON scanner service we use.
      // For now, we'll use a simplified format.
      tx_hash: "unmatched_tx_hash",
      sender: "some_ton_address",
      amount: "1000000000", // 1 TON in nanotons
      destination: "our_custodial_wallet_address",
    };

    const res = await request(app)
      .post("/api/v1/webhooks/ton-transaction")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Webhook received");
  }, 15000);
});
