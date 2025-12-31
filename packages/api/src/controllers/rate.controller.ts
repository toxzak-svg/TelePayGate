import { Request, Response } from "express";
import { RateAggregatorService } from "telepaygate-core";
import { respondSuccess, respondError } from "../utils/response";

export class RateController {
  static async getCurrentRates(req: Request, res: Response) {
    try {
      const rateService = new RateAggregatorService();
      
      // Fetch common pairs
      const pairs = [
        { source: "STARS", target: "TON" },
        { source: "TON", target: "USD" },
        { source: "STARS", target: "USD" },
      ];

      const rates: Record<string, Record<string, number>> = {};

      await Promise.all(
        pairs.map(async ({ source, target }) => {
          const rateData = await rateService.getAggregatedRate(source, target);
          if (!rates[source]) rates[source] = {};
          rates[source][target] = rateData.averageRate;
        })
      );

      return respondSuccess(res, { rates });
    } catch (error) {
      console.error("Failed to fetch rates:", error);
      return respondError(res, "RATE_FETCH_FAILED", "Failed to fetch current exchange rates", 500);
    }
  }
}

export default RateController;
