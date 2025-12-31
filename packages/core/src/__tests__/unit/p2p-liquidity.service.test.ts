import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { P2PLiquidityService } from "../../services/p2p-liquidity.service";
import { NitroSwapsService } from "../../services/nitroswaps.service";

jest.mock("../../services/nitroswaps.service");

describe("P2PLiquidityService", () => {
  const mockDb = {
    oneOrNone: jest.fn(),
    any: jest.fn(),
    none: jest.fn(),
  } as any;

  let mockNitroService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRAGMENT_ENABLED = "true";
  });

  it("finds best route including nitro aggregator", async () => {
    mockDb.oneOrNone.mockResolvedValueOnce({
      order_count: "0",
      total_liquidity: "0",
      average_rate: "0",
    });

    // Mock Nitro to return a very good rate
    const mockNitroQuote = {
      fromToken: "STARS",
      toToken: "TON",
      amount: 500,
      expectedOutput: 0.01,
      rate: 0.00002, // Better than default 0.00001
      feePercent: 0.001,
      estimatedGas: 0.05,
      route: ["STARS", "TON"],
      provider: "nitro",
    };

    // Need to ensure the instance is created before calling findBestRoute
    const svc = new P2PLiquidityService(mockDb);
    const nitroInstance = (NitroSwapsService as any).mock.instances[0];
    nitroInstance.getQuote.mockResolvedValue(mockNitroQuote);

    const route = await svc.findBestRoute("STARS", "TON", 500);
    expect(route).toBeDefined();
    expect(route.sources[0].provider).toBe("nitro");
    expect(route.totalRate).toBe(0.00002);
  });

  it("executes conversion via nitro when selected", async () => {
    const svc = new P2PLiquidityService(mockDb);
    const nitroInstance = (NitroSwapsService as any).mock.instances[0];

    mockDb.oneOrNone.mockResolvedValueOnce({
      id: "conv-nitro",
      source_amount: 500,
      source_currency: "STARS",
      target_currency: "TON",
      user_id: "user-1",
    });

    nitroInstance.executeSwap.mockResolvedValue({
      success: true,
      txHash: "nitro-tx-hash",
      outputAmount: 0.0099,
      provider: "nitro",
    });

    const route = {
      sources: [{ type: "nitro", provider: "nitro", rate: 0.00002 } as any],
      totalRate: 0.00002,
    } as any;

    const result = await svc.executeConversion("conv-nitro", route);
    expect(result.success).toBe(true);
    expect(result.txHash).toBe("nitro-tx-hash");
    expect(result.dexProvider).toBe("nitro");
    expect(nitroInstance.executeSwap).toHaveBeenCalled();
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
