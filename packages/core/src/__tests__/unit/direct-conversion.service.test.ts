import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { DirectConversionService } from "../../services/direct-conversion.service";
import { getDatabase } from "../../db/connection";
import { FeeService } from "../../services/fee.service";
import { RateAggregatorService } from "../../services/rate-aggregator.service";
import { TonPaymentService } from "../../services/ton-payment.service";

jest.mock("../../db/connection");
jest.mock("../../services/fee.service");
jest.mock("../../services/rate-aggregator.service");
jest.mock("../../services/ton-payment.service");

describe("DirectConversionService", () => {
  let service: DirectConversionService;
  const mockDb = {
    one: (jest.fn() as any).mockResolvedValue({}),
    none: (jest.fn() as any).mockResolvedValue(undefined),
    oneOrNone: (jest.fn() as any).mockResolvedValue({}),
    tx: (jest.fn() as any).mockImplementation((cb: any) => cb(mockDb)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as any).mockReturnValue(mockDb);
    process.env.TON_API_URL = "https://test.com";
    process.env.TON_WALLET_MNEMONIC = "test mnemonic";
    service = new DirectConversionService();
  });

  describe("getQuote", () => {
    it("should calculate correct quote", async () => {
      const mockRateData = { averageRate: 5.0 }; // 1 TON = 5 USD
      const mockFeeBreakdown = {
        platform: 10,
        network: 5,
        total: 15,
        platformPercentage: 2,
      };

      (service as any).rateAggregator.getAggregatedRate.mockResolvedValue(mockRateData);
      (service as any).feeService.calculateFeeBreakdown.mockResolvedValue(mockFeeBreakdown);
      (service as any).feeService.getPlatformWallet.mockResolvedValue("platform-wallet");

      const quote = await service.getQuote(1000);

      // 1 Star = 0.015 USD. 1 TON = 5 USD.
      // StarsToTonRate = 0.015 / 5 = 0.003
      expect(quote.exchangeRate).toBe(0.003);
      // TargetAmount = (1000 - 15) * 0.003 = 985 * 0.003 = 2.955
      expect(quote.targetAmount).toBeCloseTo(2.955);
      expect(quote.platformWallet).toBe("platform-wallet");
    });
  });

  describe("createConversion", () => {
    it("should create conversion and initiate TON transfer", async () => {
      (mockDb.one as any)
        .mockResolvedValueOnce({ total_stars: 1000 }) // SUM result
        .mockResolvedValueOnce({ id: "conv-1", target_amount: 2.955, platform_fee_amount: 10 }); // INSERT result

      (service as any).feeService.calculateFeeBreakdown.mockResolvedValue({
        platform: 10,
        network: 5,
        total: 15,
        platformPercentage: 2,
      });
      (service as any).rateAggregator.getAggregatedRate.mockResolvedValue({ averageRate: 5.0 });
      
      // Mock executeDirectTonTransfer to avoid async issues in test
      const transferSpy = jest.spyOn(service as any, "executeDirectTonTransfer").mockResolvedValue(undefined);

      const result = await service.createConversion("user-1", ["pay-1"], "TON", "dest-addr");

      expect(result.id).toBe("conv-1");
      expect(mockDb.tx).toHaveBeenCalled();
      expect(transferSpy).toHaveBeenCalledWith("conv-1", "dest-addr", expect.any(Number));
    });

    it("should throw if no valid payments found", async () => {
      (mockDb.one as any).mockResolvedValueOnce({ total_stars: 0 });

      await expect(service.createConversion("user-1", ["pay-1"]))
        .rejects.toThrow("No valid payments found for conversion");
    });
  });
});
