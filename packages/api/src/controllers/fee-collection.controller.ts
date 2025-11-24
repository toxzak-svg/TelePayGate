import { Request, Response } from "express";
import { getDatabase, FeeCollectionService } from "@tg-payment/core";
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendError,
} from "../utils/response";

export class FeeCollectionController {
  private static getServices() {
    const db = getDatabase();
    const feeCollectionService = new FeeCollectionService(db);
    return { db, feeCollectionService };
  }

  /**
   * GET /api/v1/fees/stats
   */
  static async getFeeStats(req: Request, res: Response) {
    try {
      return sendSuccess(
        res,
        { stats: { totalFees: 0, collectedFees: 0, pendingFees: 0 } },
        200,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return sendError(res, "STATS_ERROR", message, 500);
    }
  }

  /**
   * GET /api/v1/fees/history
   */
  static async getFeeHistory(req: Request, res: Response) {
    try {
      return sendSuccess(res, { history: [] }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return sendError(res, "HISTORY_ERROR", message, 500);
    }
  }

  /**
   * POST /api/v1/fees/collect
   */
  static async collectFees(req: Request, res: Response) {
    try {
      return sendSuccess(res, { message: "Fees collected" }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return sendError(res, "COLLECT_ERROR", message, 500);
    }
  }

  /**
   * GET /api/v1/fees/uncollected
   * Get total uncollected platform fees
   */
  static async getUncollected(req: Request, res: Response) {
    try {
      const { feeCollectionService } = FeeCollectionController.getServices();
      const uncollected = await feeCollectionService.getUncollectedFees();

      return sendSuccess(
        res,
        {
          uncollected: {
            totalStars: uncollected.totalStars,
            totalTon: uncollected.totalTon,
            totalUsd: uncollected.totalUsd,
            feeCount: uncollected.feeCount,
          },
        },
        200,
      );
    } catch (error: unknown) {
      console.error("❌ Get uncollected fees error:", error);
      const message = error instanceof Error ? error.message : String(error);
      return sendError(res, "UNCOLLECTED_ERROR", message, 500);
    }
  }

  /**
   * POST /api/v1/fees/collect
   * Request fee collection/withdrawal
   */
  static async requestCollection(req: Request, res: Response) {
    const userId = req.headers["x-user-id"] as string;

    try {
      const { feeCollectionService } = FeeCollectionController.getServices();
      const { targetAddress, feeIds } = req.body;

      if (!targetAddress) {
        return sendBadRequest(
          res,
          "MISSING_ADDRESS",
          "Target TON address required",
        );
      }

      const collection = await feeCollectionService.createCollectionRequest(
        userId,
        { targetAddress, feeIds },
      );

      return sendCreated(res, {
        collection: {
          id: collection.id,
          totalFeesTon: collection.totalFeesTon,
          totalFeesUsd: collection.totalFeesUsd,
          feesCollected: collection.feesCollected,
          status: collection.status,
          targetAddress,
          createdAt: collection.createdAt,
        },
        message:
          "Fee collection request created. Transfer will be processed shortly.",
      });
    } catch (error: unknown) {
      console.error("❌ Request collection error:", error);
      const message = error instanceof Error ? error.message : String(error);
      return sendError(res, "COLLECTION_ERROR", message, 500);
    }
  }

  /**
   * POST /api/v1/fees/collections/:id/complete
   * Mark collection as completed (internal use after TON transfer)
   */
  static async markCompleted(req: Request, res: Response) {
    const { id } = req.params;
    const { txHash } = req.body;

    try {
      const { feeCollectionService } = FeeCollectionController.getServices();

      if (!txHash) {
        return sendBadRequest(
          res,
          "MISSING_TX_HASH",
          "Transaction hash required",
        );
      }

      await feeCollectionService.markAsCollected(id, txHash);

      return sendSuccess(
        res,
        { message: "Fee collection marked as completed" },
        200,
      );
    } catch (error: unknown) {
      console.error("❌ Mark completed error:", error);
      const message = error instanceof Error ? error.message : String(error);
      return sendError(res, "COMPLETE_ERROR", message, 500);
    }
  }

  /**
   * GET /api/v1/fees/collections
   * Get collection history
   */
  static async getHistory(req: Request, res: Response) {
    const userId = req.headers["x-user-id"] as string;

    try {
      const { feeCollectionService } = FeeCollectionController.getServices();
      const limit = parseInt(req.query.limit as string) || 20;

      const collections = await feeCollectionService.getCollectionHistory(
        userId,
        limit,
      );

      return sendSuccess(
        res,
        {
          collections: collections.map((c) => ({
            id: c.id,
            totalFeesTon: c.totalFeesTon,
            totalFeesUsd: c.totalFeesUsd,
            feesCollected: c.feesCollected,
            status: c.status,
            txHash: c.txHash,
            createdAt: c.createdAt,
          })),
        },
        200,
      );
    } catch (error: unknown) {
      console.error("❌ Get history error:", error);
      const message = error instanceof Error ? error.message : String(error);
      return sendError(res, "HISTORY_ERROR", message, 500);
    }
  }
}

export default FeeCollectionController;
