import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { RateAggregatorService } from "../services/rate.aggregator";
import Redis from "ioredis";

jest.mock("ioredis");

describe("RateAggregatorService", () => {
  let rateAggregatorService: RateAggregatorService;
  let redis: any;

  beforeEach(() => {
    rateAggregatorService = new RateAggregatorService();
    // Ensure redis is a mock even if in simulation mode
    (rateAggregatorService as any).redis = {
      get: jest.fn(),
      set: jest.fn(),
    };
    redis = (rateAggregatorService as any).redis;
  });

  it("should be defined", () => {
    expect(rateAggregatorService).toBeDefined();
  });

  describe("getAggregatedRate with cache", () => {
    it("should return cached rate if available", async () => {
      const cachedRate = {
        bestRate: 123.45,
        averageRate: 123.45,
        rates: [],
        sourceCurrency: "TON",
        targetCurrency: "USD",
        timestamp: Date.now(),
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedRate));
      const rate = await rateAggregatorService.getAggregatedRate("TON", "USD");
      expect(rate.bestRate).toEqual(cachedRate.bestRate);
      expect(redis.get).toHaveBeenCalledWith("rate:TON:USD");
    });

    it("should fetch and cache rate if not available", async () => {
      redis.get.mockResolvedValue(null);
      const mockRate = {
        bestRate: 200.5,
        averageRate: 200.5,
        rates: [],
        sourceCurrency: "TON",
        targetCurrency: "USD",
        timestamp: Date.now(),
      };
      const getSimulatedRate = jest
        .spyOn(rateAggregatorService as any, "getSimulatedRate")
        .mockResolvedValue(mockRate);

      const rate = await rateAggregatorService.getAggregatedRate("TON", "USD");

      expect(rate.bestRate).toEqual(mockRate.bestRate);
      expect(getSimulatedRate).toHaveBeenCalledWith("TON", "USD");
      expect(redis.set).toHaveBeenCalledWith(
        "rate:TON:USD",
        expect.any(String),
        "EX",
        300,
      );
    });
  });
});
