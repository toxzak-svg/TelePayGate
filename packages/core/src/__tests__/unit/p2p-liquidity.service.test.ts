import { P2PLiquidityService } from "../../services/p2p-liquidity.service";

describe("P2PLiquidityService", () => {
  const mockDb = {
    oneOrNone: jest.fn(),
    any: jest.fn(),
    none: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRAGMENT_ENABLED = "true";
  });

  it("finds best route including fragment", async () => {
    mockDb.oneOrNone.mockResolvedValueOnce({
      order_count: "2",
      total_liquidity: "1000",
      average_rate: "0.00001",
    });
    const svc = new P2PLiquidityService(mockDb);
    const route = await svc.findBestRoute("STARS", "TON", 500);
    expect(route).toBeDefined();
    expect(route.sources.length).toBeGreaterThan(0);
  });

  it("executes conversion via fragment when enabled", async () => {
    const svc = new P2PLiquidityService(mockDb);
    mockDb.oneOrNone
      .mockResolvedValueOnce({
        id: "conv-1",
        source_amount: 500,
        source_currency: "STARS",
        target_currency: "TON",
        user_id: "user-1",
      })
      .mockResolvedValueOnce({
        id: "conv-1",
        source_amount: 500,
        source_currency: "STARS",
        target_currency: "TON",
        user_id: "user-1",
      });
    const result = await (svc as any).executeFragmentConversion("conv-1", {
      sources: [],
      totalRate: 0.000015,
      totalFee: 1,
      estimatedTime: 45,
      confidence: 0.9,
    });
    expect(result.txHash).toContain("fragment-");
  });
});
