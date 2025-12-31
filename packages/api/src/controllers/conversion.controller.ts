import { Request, Response, NextFunction } from "express";
import { DirectConversionService } from "telepaygate-core";
import {
  requireUserId,
  parsePagination,
  buildPaginationMeta,
} from "../utils/controller-helpers";

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    telegramId: string;
    username?: string;
  };
}

export class ConversionController {
  private getConversionService(): DirectConversionService {
    return new DirectConversionService();
  }

  /**
   * Get conversion rate quote
   * GET /api/v1/conversions/rate
   */
  async getRate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        amount = 100,
        sourceCurrency = "STARS",
        targetCurrency = "TON",
      } = req.query;

      const conversionService = this.getConversionService();
      const quote = await conversionService.getQuote(
        parseFloat(amount as string),
        sourceCurrency as string,
        targetCurrency as string,
      );

      res.json({
        success: true,
        data: quote,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      next(message);
    }
  }

  /**
   * Lock conversion rate
   * POST /api/v1/conversions/lock-rate
   */
  async lockRate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        amount,
        sourceAmount,
        sourceCurrency = "STARS",
        targetCurrency = "TON",
        durationSeconds = 300,
      } = req.body;

      const amountToLock = amount || sourceAmount;

      if (!amountToLock) {
        res.status(400).json({
          success: false,
          error: "amount or sourceAmount is required",
        });
        return;
      }

      const userId = requireUserId(req, res, {
        errorCode: "UNAUTHORIZED",
        errorMessage: "Authentication required",
        statusCode: 401,
      });
      if (!userId) return;

      const conversionService = this.getConversionService();
      const conversion = await conversionService.lockRate(
        userId,
        parseFloat(amountToLock.toString()),
        sourceCurrency,
        targetCurrency,
        durationSeconds,
      );

      res.status(201).json({
        success: true,
        data: {
          ...conversion,
          id: conversion.conversionId, // For dashboard compatibility
          status: "rate_locked",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create and execute conversion
   * POST /api/v1/conversions/create
   */
  async createConversion(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        paymentIds,
        targetCurrency = "TON",
        destinationAddress,
      } = req.body;

      if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: "paymentIds array is required",
        });
        return;
      }

      const userId = requireUserId(req, res, {
        errorCode: "UNAUTHORIZED",
        errorMessage: "Authentication required",
        statusCode: 401,
      });
      if (!userId) return;

      const conversionService = this.getConversionService();
      const conversion = await conversionService.createConversion(
        userId,
        paymentIds,
        targetCurrency,
        destinationAddress,
      );

      res.status(201).json({
        success: true,
        data: conversion,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversion by ID
   * GET /api/v1/conversions/:id
   */
  async getConversion(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const conversionService = this.getConversionService();
      const conversion = await conversionService.getConversionById(id);

      if (!conversion) {
        res.status(404).json({
          success: false,
          error: "Conversion not found",
        });
        return;
      }

      res.json({
        success: true,
        data: conversion,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's conversion history
   * GET /api/v1/conversions
   */
  async getConversionHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { status } = req.query;
      const { page, limit, offset } = parsePagination(req);

      const userId = requireUserId(req, res, {
        errorCode: "UNAUTHORIZED",
        errorMessage: "Authentication required",
        statusCode: 401,
      });
      if (!userId) return;

      const conversionService = this.getConversionService();
      const conversions = await conversionService.getUserConversions(userId);

      // Filter by status if provided
      const filtered = status
        ? conversions.filter((c) => c.status === status)
        : conversions;

      // Simple pagination
      const paginated = filtered.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          conversions: paginated,
          pagination: buildPaginationMeta(filtered.length, page, limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export instance methods
const controller = new ConversionController();

export const getRate = controller.getRate.bind(controller);
export const lockRate = controller.lockRate.bind(controller);
export const createConversion = controller.createConversion.bind(controller);
export const getConversion = controller.getConversion.bind(controller);
export const getConversionHistory =
  controller.getConversionHistory.bind(controller);
