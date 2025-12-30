import request from "supertest";
import { buildTestApp } from "../integration/app.test-setup";

describe("NitroSwaps API", () => {
  let app: any;
  const apiKey = "pk_test_12345678901234567890";

  beforeAll(() => {
    app = buildTestApp();
  });

  test("POST /api/v1/nitro/quote requires auth and returns quote", async () => {
    const unauth = await request(app)
      .post("/api/v1/nitro/quote")
      .send({ fromToken: "TON", toToken: "USDT", amount: 1 });
    expect(unauth.status).toBe(401);

    const res = await request(app)
      .post("/api/v1/nitro/quote")
      .set("X-API-Key", apiKey)
      .send({ fromToken: "TON", toToken: "USDT", amount: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("expectedOutput");
  });

  test("POST /api/v1/nitro/swaps validates input", async () => {
    const res = await request(app)
      .post("/api/v1/nitro/swaps")
      .set("X-API-Key", apiKey)
      .send({ fromToken: "TON", toToken: "USDT", amount: 0, minReceive: 1 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_INPUT");
  });
});
