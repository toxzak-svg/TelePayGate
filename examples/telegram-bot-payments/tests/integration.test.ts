import { TelePayGateClient } from "../src/telepaygate";

describe("TelePayGate integration (mock)", () => {
  const baseUrl = process.env.TELEPAYGATE_API_URL || "http://localhost:3000";
  const client = new TelePayGateClient({ apiBaseUrl: baseUrl });

  test("deriveCredentials returns deterministic keys", () => {
    const creds = (client as any).deriveCredentials("12345");
    expect(creds.apiKey).toMatch(/^pk_/);
    expect(creds.apiSecret).toMatch(/^sk_/);
  });
});
