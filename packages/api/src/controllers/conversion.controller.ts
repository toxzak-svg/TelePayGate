import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { 
  ConversionModel, 
  ConversionStatus, 
  Currency,
  PaymentModel,
  PaymentStatus,
  getDatabase,
  rateLockManager,
  ConversionStateMachine,
  ConversionState,
  WebhookService
} from '@tg-payment/core';

// Mock exchange rate (replace with real rate aggregator)
const STARS_TO_TON_RATE = 0.00099;

export class ConversionController {
  private static getServices() {
    const db = getDatabase();
    const conversionModel = new ConversionModel(db);
    const paymentModel = new PaymentModel(db);
    
    let webhookService: WebhookService | null = null;
    if (process.env.WEBHOOK_SECRET) {
      webhookService = new WebhookService(db as any, process.env.WEBHOOK_SECRET);
    }
    
    return { db, conversionModel, paymentModel, webhookService };
  }

  /**
   * POST /api/v1/conversions/estimate
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

      if (sourceAmount < 1000) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'MINIMUM_AMOUNT_NOT_MET', 
            message: 'Minimum conversion amount is 1000 Stars' 
          },
          requestId,
        });
      }

      const exchangeRate = STARS_TO_TON_RATE;
      const targetAmount = sourceAmount * exchangeRate;
      const platformFee = sourceAmount * 0.02;
      const netAmount = targetAmount - (platformFee * exchangeRate);

      return res.status(200).json({
        success: true,
        estimate: {
          sourceAmount,
          sourceCurrency,
          targetCurrency,
          estimatedAmount: netAmount,
          exchangeRate,
          fees: {
            platform: platformFee,
            total: platformFee
          },
          validUntil: Date.now() + 60000
        },
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
   */
  static async lockRate(req: Request, res: Response) {
    const requestId = uuid();

    try {
      const {
        sourceAmount,
        sourceCurrency = 'STARS',
        targetCurrency = 'TON',
        durationSeconds = 300,
      } = req.body;

      if (!sourceAmount || sourceAmount < 1000) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Minimum 1000 Stars required' },
          requestId,
        });
      }

      const rateLock = rateLockManager.createLock(
        STARS_TO_TON_RATE,
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        durationSeconds
      );

      return res.status(200).json({
        success: true,
        rateLock: {
          id: rateLock.id,
          exchangeRate: rateLock.exchangeRate,
          lockedUntil: rateLock.expiresAt,
          sourceAmount: rateLock.sourceAmount,
          targetCurrency: rateLock.targetCurrency,
          durationSeconds: rateLock.durationSeconds
        },
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
   */
  static async createConversion(req: Request, res: Response) {
    const requestId = uuid();
    const userId = req.headers['x-user-id'] as string;

    try {
      const { paymentModel, conversionModel, webhookService, db } = ConversionController.getServices();

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_USER_ID', message: 'X-User-Id header required' },
          requestId,
        });
      }

      const { paymentIds, targetCurrency = 'TON', rateLockId } = req.body;

      if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PAYMENTS', message: 'Payment IDs required' },
          requestId,
        });
      }

      const payments = await paymentModel.findByIds(paymentIds);

      if (payments.length !== paymentIds.length) {
        return res.status(404).json({
          success: false,
          error: { code: 'PAYMENTS_NOT_FOUND', message: 'Some payments not found' },
          requestId,
        });
      }

      const invalidPayments = payments.filter(
        p => p.userId !== userId || p.status !== PaymentStatus.RECEIVED
      );

      if (invalidPayments.length > 0) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_PAYMENT_STATUS', 
            message: 'All payments must be in received status' 
          },
          requestId,
        });
      }

      const totalStars = payments.reduce((sum, p) => sum + p.starsAmount, 0);

      if (totalStars < 1000) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'MINIMUM_AMOUNT_NOT_MET', 
            message: 'Minimum 1000 Stars required for conversion' 
          },
          requestId,
        });
      }

      let exchangeRate = STARS_TO_TON_RATE;
      if (rateLockId) {
        const lock = rateLockManager.getLock(rateLockId);
        if (!lock) {
          return res.status(400).json({
            success: false,
            error: { code: 'RATE_LOCK_EXPIRED', message: 'Rate lock expired or invalid' },
            requestId,
          });
        }
        exchangeRate = lock.exchangeRate;
      }

      const targetAmount = totalStars * exchangeRate * 0.98;

      const conversion = await conversionModel.create({
        paymentIds,
        sourceCurrency: Currency.STARS,
        targetCurrency: targetCurrency as Currency,
        sourceAmount: totalStars,
        status: ConversionStatus.PENDING
      });

      await conversionModel.update(conversion.id, {
        exchangeRate,
        targetAmount,
        status: ConversionStatus.PHASE1_PREPARED
      });

      await paymentModel.updateMany(
        { id: { in: paymentIds } },
        { status: PaymentStatus.CONVERTING }
      );

      console.log('✅ Conversion created:', conversion.id);

      if (webhookService) {
        const userProfile = await db.one(
          'SELECT webhook_url FROM users WHERE id = $1',
          [userId]
        );

        if (userProfile.webhook_url) {
          await webhookService.queueEvent(
            userId,
            userProfile.webhook_url,
            'conversion.created',
            {
              conversionId: conversion.id,
              sourceAmount: totalStars,
              targetAmount,
              targetCurrency
            }
          );
        }
      }

      return res.status(201).json({
        success: true,
        conversion: {
          id: conversion.id,
          sourceAmount: totalStars,
          targetAmount,
          exchangeRate,
          status: ConversionStatus.PHASE1_PREPARED,
          createdAt: conversion.createdAt
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
   */
  static async getStatus(req: Request, res: Response) {
    const requestId = uuid();

    try {
      const { conversionModel } = ConversionController.getServices();
      const { id } = req.params;
      const conversion = await conversionModel.findById(id);

      if (!conversion) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversion not found' },
          requestId,
        });
      }

      const stateMachine = new ConversionStateMachine(
        conversion.status as unknown as ConversionState
      );

      return res.status(200).json({
        success: true,
        status: {
          conversion: {
            id: conversion.id,
            status: conversion.status,
            sourceAmount: conversion.sourceAmount,
            targetAmount: conversion.targetAmount,
            exchangeRate: conversion.exchangeRate,
            fragmentTxId: conversion.fragmentTxId,
            tonTxHash: conversion.tonTxHash,
            createdAt: conversion.createdAt,
            completedAt: conversion.completedAt
          },
          progress: {
            phase: stateMachine.getPhaseName(),
            percentage: stateMachine.getProgressPercentage(),
            estimatedCompletion: stateMachine.getEstimatedCompletion()
          }
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
   */
  static async listConversions(req: Request, res: Response) {
    const requestId = uuid();
    const userId = req.headers['x-user-id'] as string;

    try {
      const { conversionModel } = ConversionController.getServices();

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_USER_ID', message: 'X-User-Id header required' },
          requestId,
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const status = req.query.status as ConversionStatus | undefined;

      const { conversions, total } = await conversionModel.listByUser(userId, {
        limit,
        offset,
        status
      });

      return res.status(200).json({
        success: true,
        conversions: conversions.map(c => ({
          id: c.id,
          sourceAmount: c.sourceAmount,
          targetAmount: c.targetAmount,
          exchangeRate: c.exchangeRate,
          status: c.status,
          createdAt: c.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
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
