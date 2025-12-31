import { TelePayGateClient } from "../src/telepaygate";

describe("Negative cases", () => {
  const baseUrl = process.env.TELEPAYGATE_API_URL || "http://localhost:3000";
  const client = new TelePayGateClient({ apiBaseUrl: baseUrl });

  test("verifySettlement returns false for unknown payment", async () => {
    const ok = await client.verifySettlement("999", "non-existent", {
      retry: 1,
      backoffMs: 100
    });
    expect(ok).toBe(false);
  });
});

