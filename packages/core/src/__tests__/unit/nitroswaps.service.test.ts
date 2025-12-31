import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { NitroSwapsService } from "../../services/nitroswaps.service";
import axios from "axios";
import { getDatabase } from "../../db/connection";

jest.mock("axios");
jest.mock("../../db/connection");

describe("NitroSwapsService", () => {
  let service: NitroSwapsService;
  const mockDb = {
    none: (jest.fn() as any).mockResolvedValue(undefined),
    oneOrNone: jest.fn() as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as any).mockReturnValue(mockDb);
    process.env.NITRO_FEATURE_ENABLED = "true";
    process.env.NITRO_API_URL = "https://api.nitro.com";
    process.env.NITRO_API_KEY = "test-key";
    service = new NitroSwapsService();
  });

  describe("getQuote", () => {
    it("should fetch quote from API when enabled", async () => {
      const mockResponse = {
        data: {
          expectedOutput: "100",
          rate: "0.5",
          feePercent: "0.003",
          estimatedGas: "0.05",
          route: ["TOKEN1", "TOKEN2"],
        },
      };
      (axios.get as any).mockResolvedValue(mockResponse);

      const quote = await service.getQuote("TOKEN1", "TOKEN2", 200);

      expect(quote.expectedOutput).toBe(100);
      expect(quote.rate).toBe(0.5);
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("/quote"), expect.any(Object));
    });

    it("should return mock quote when disabled", async () => {
      process.env.NITRO_FEATURE_ENABLED = "false";
      const serviceDisabled = new NitroSwapsService();
      
      const quote = await serviceDisabled.getQuote("TOKEN1", "TOKEN2", 200);
      
      expect(quote.provider).toBe("nitro");
      expect(quote.rate).toBe(1);
    });
  });

  describe("executeSwap", () => {
    it("should execute swap via API", async () => {
      (axios.post as any).mockResolvedValue({
        data: {
          txHash: "0x123",
          outputAmount: "198",
          gasUsed: "0.05",
        },
      });

      // Mock verifySwap to return true
      jest.spyOn(service, "verifySwap").mockResolvedValue(true);

      const result = await service.executeSwap({
        fromToken: "TON",
        toToken: "USDT",
        amount: 200,
        minReceive: 190,
        userId: "user-1",
        referenceId: "conv-1",
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBe("0x123");
      expect(mockDb.none).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO nitro_swaps"),
        expect.any(Array)
      );
    });

    it("should return error if validation fails", async () => {
      const result = await service.executeSwap({
        fromToken: "",
        toToken: "USDT",
        amount: 0,
        minReceive: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("INVALID_AMOUNT");
    });
  });

  describe("getStatusByTx", () => {
    it("should return status from DB", async () => {
      (mockDb.oneOrNone as any).mockResolvedValue({ status: "completed" });
      
      const status = await service.getStatusByTx("0x123");
      
      expect(status.status).toBe("completed");
      expect(mockDb.oneOrNone).toHaveBeenCalledWith(
        expect.stringContaining("SELECT status FROM nitro_swaps"),
        ["0x123"]
      );
    });

    it("should return unknown if not found", async () => {
      (mockDb.oneOrNone as any).mockResolvedValue(null);
      const status = await service.getStatusByTx("0x999");
      expect(status.status).toBe("unknown");
    });
  });
});
