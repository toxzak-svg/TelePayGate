import { Request, Response, NextFunction } from 'express';
import { FragmentService } from '../../../core/src/services/fragment.service';
import { RateAggregatorService } from '../../../core/src/services/rate.aggregator';

export class ConversionController {
  private static fragmentService: FragmentService;
  private static rateAggregator: RateAggregatorService;

  /**
   * Initialize controller with services
   */
  static initialize(walletAddress: string) {
    this.fragmentService = new FragmentService(walletAddress);
    this.rateAggregator = new RateAggregatorService();
  }

  /**
   * Estimate conversion cost
   * POST /api/v1/conversions/estimate
   */
  static async estimateConversion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { starsAmount, targetCurrency = 'USD', lockedRate = false } = req.body;

      if (!starsAmount || starsAmount < 1000) {
        res.status(400).json({
          success: false,
          error: 'Minimum 1,000 Stars required for conversion',
        });
        return;
      }

      // Get current rates
      const tonRate = await ConversionController.rateAggregator.getAggregatedRate('TON', targetCurrency);
      const starsToTonRate = 0.001; // Mock: 1 Star = 0.001 TON

      const tonEquivalent = starsAmount * starsToTonRate;
      const estimatedFiat = tonEquivalent * tonRate.averageRate;

      res.status(200).json({
        success: true,
        starsAmount,
        tonEquivalent,
        estimatedFiat,
        targetCurrency,
        exchangeRate: tonRate.averageRate,
        lockedUntil: lockedRate ? Date.now() + 60000 : null,
        fees: {
          telegram: starsAmount * 0.01, // 1%
          fragment: tonEquivalent * 0.005, // 0.5%
          total: (starsAmount * 0.01) + (tonEquivalent * 0.005),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create conversion order
   * POST /api/v1/conversions/create
   */
  static async createConversion(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { paymentIds, targetCurrency = 'TON', rateLockId } = req.body;

      if (!paymentIds || paymentIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Payment IDs required',
        });
        return;
      }

      const conversion = await ConversionController.fragmentService.convertStarsToTON(
        paymentIds,
        { lockedRateDuration: 60 }
      );

      res.status(201).json({
        success: true,
        conversion: {
          id: conversion.id,
          status: conversion.status,
          starsAmount: conversion.starsAmount,
          tonAmount: conversion.tonAmount,
          exchangeRate: conversion.exchangeRate,
          rateLockedUntil: conversion.rateLockedUntil,
          createdAt: conversion.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lock exchange rate
   * POST /api/v1/conversions/lock-rate
   */
  static async lockRate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { starsAmount, targetCurrency, duration = 60 } = req.body;

      const rate = await ConversionController.rateAggregator.getAggregatedRate('TON', targetCurrency);

      res.status(200).json({
        success: true,
        rateLockId: `lock_${Date.now()}`,
        rate: rate.averageRate,
        lockedUntil: Date.now() + duration * 1000,
        duration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversion status
   * GET /api/v1/conversions/:id/status
   */
  static async getStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const status = await ConversionController.fragmentService.pollConversionStatus(id);

      res.status(200).json({
        success: true,
        conversionId: id,
        status: status.status,
        tonAmount: status.tonAmount,
        tonTxHash: status.tonTxHash,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List conversions
   * GET /api/v1/conversions
   */
  static async listConversions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { page = 1, limit = 20 } = req.query;

      // TODO: Fetch from database
      res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          pages: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ConversionController;
