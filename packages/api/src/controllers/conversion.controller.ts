import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { pool } from '../db/connection';
import { ConversionService } from '../../../core/src/services/conversion.service';

// Initialize service
const conversionService = new ConversionService(
  pool,
  process.env.TON_WALLET_ADDRESS || 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2'
);

export class ConversionController {
  /**
   * POST /api/v1/conversions/estimate
   * Get conversion rate estimate
   */
  static async estimateConversion(req: Request, res: Response) {
    const requestId = uuid();

    try {
      const { sourceAmount, sourceCurrency = 'STARS', targetCurrency = 'TON' } = req.body;

      if (!sourceAmount || sourceAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Valid source amount required' },
          requestId,
        });
      }

      const quote = await conversionService.getQuote(
        sourceAmount,
        sourceCurrency,
        targetCurrency
      );

      return res.status(200).json({
        success: true,
        quote,
        requestId,
      });
    } catch (error: any) {
      console.error('❌ Estimate error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'ESTIMATE_FAILED', message: error.message },
        requestId,
      });
    }
  }

  /**
   * POST /api/v1/conversions/lock-rate
   * Lock conversion rate
   */
  static async lockRate(req: Request, res: Response) {
    const requestId = uuid();
    const userId = req.headers['x-user-id'] as string;

    try {
      const {
        sourceAmount,
        sourceCurrency = 'STARS',
        targetCurrency = 'TON',
        durationSeconds = 300,
      } = req.body;

      if (!sourceAmount) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Source amount required' },
          requestId,
        });
      }

      const lockedRate = await conversionService.lockRate(
        userId,
        sourceAmount,
        sourceCurrency,
        targetCurrency,
        durationSeconds
      );

      return res.status(200).json({
        success: true,
        data: lockedRate,
        requestId,
      });
    } catch (error: any) {
      console.error('❌ Lock rate error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'LOCK_FAILED', message: error.message },
        requestId,
      });
    }
  }

  /**
   * POST /api/v1/conversions/create
   * Create new conversion
   */
  static async createConversion(req: Request, res: Response) {
    const requestId = uuid();
    const userId = req.headers['x-user-id'] as string;

    try {
      const { paymentIds, targetCurrency = 'TON' } = req.body;

      if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PAYMENTS', message: 'Payment IDs required' },
          requestId,
        });
      }

      const conversion = await conversionService.createConversion(
        userId,
        paymentIds,
        targetCurrency
      );

      return res.status(201).json({
        success: true,
        conversion: {
          id: conversion.id,
          sourceAmount: conversion.source_amount,
          targetAmount: conversion.target_amount,
          exchangeRate: conversion.exchange_rate,
          status: conversion.status,
          createdAt: conversion.created_at,
        },
        requestId,
      });
    } catch (error: any) {
      console.error('❌ Create conversion error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'CONVERSION_FAILED', message: error.message },
        requestId,
      });
    }
  }

  /**
   * GET /api/v1/conversions/:id/status
   * Get conversion status
   */
  static async getStatus(req: Request, res: Response) {
    const requestId = uuid();

    try {
      const { id } = req.params;
      const conversion = await conversionService.getConversionById(id);

      if (!conversion) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversion not found' },
          requestId,
        });
      }

      return res.status(200).json({
        success: true,
        conversion: {
          id: conversion.id,
          status: conversion.status,
          sourceAmount: conversion.source_amount,
          targetAmount: conversion.target_amount,
          exchangeRate: conversion.exchange_rate,
          fragmentTxId: conversion.fragment_tx_id,
          tonTxHash: conversion.ton_tx_hash,
          createdAt: conversion.created_at,
          completedAt: conversion.completed_at,
        },
        requestId,
      });
    } catch (error: any) {
      console.error('❌ Get status error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'STATUS_FAILED', message: error.message },
        requestId,
      });
    }
  }

  /**
   * GET /api/v1/conversions
   * List user conversions
   */
  static async listConversions(req: Request, res: Response) {
    const requestId = uuid();
    const userId = req.headers['x-user-id'] as string;

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const conversions = await conversionService.getUserConversions(
        userId,
        limit,
        offset
      );

      return res.status(200).json({
        success: true,
        data: conversions,
        pagination: {
          page,
          limit,
          total: conversions.length,
        },
        requestId,
      });
    } catch (error: any) {
      console.error('❌ List conversions error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'LIST_FAILED', message: error.message },
        requestId,
      });
    }
  }
}

export default ConversionController;
