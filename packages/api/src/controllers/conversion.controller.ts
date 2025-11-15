import { Request, Response, NextFunction } from 'express';
import { DirectConversionService } from '@tg-payment/core';
import { db } from '../db/connection';

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    telegramId: string;
    username?: string;
  };
}

export class ConversionController {
  private conversionService: DirectConversionService;

  constructor() {
    this.conversionService = new DirectConversionService();
  }

  /**
   * Get current conversion rate
   * GET /api/v1/conversions/rate
   */
  async getRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fromCurrency, toCurrency, amount } = req.query;

      if (!fromCurrency || !toCurrency) {
        res.status(400).json({
          success: false,
          error: 'fromCurrency and toCurrency are required'
        });
        return;
      }

      const rate = await this.conversionService.getCurrentRate(
        fromCurrency as string,
        toCurrency as string,
        amount ? parseFloat(amount as string) : undefined
      );

      res.json({
        success: true,
        data: rate
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new conversion request
   * POST /api/v1/conversions
   */
  async createConversion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fromCurrency, toCurrency, amount, slippageTolerance } = req.body;

      if (!fromCurrency || !toCurrency || !amount) {
        res.status(400).json({
          success: false,
          error: 'fromCurrency, toCurrency, and amount are required'
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const conversion = await this.conversionService.initiateConversion({
        userId: req.user.id,
        fromCurrency,
        toCurrency,
        amount: parseFloat(amount),
        slippageTolerance: slippageTolerance || 0.01
      });

      res.status(201).json({
        success: true,
        data: conversion
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversion by ID
   * GET /api/v1/conversions/:id
   */
  async getConversion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await db.query(
        'SELECT * FROM conversions WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Conversion not found'
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's conversion history
   * GET /api/v1/conversions
   */
  async getConversionHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, status } = req.query;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const offset = (Number(page) - 1) * Number(limit);

      let query = 'SELECT * FROM conversions WHERE user_id = $1';
      const params: any[] = [req.user.id];

      if (status) {
        query += ' AND status = $2';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(Number(limit), offset);

      const result = await db.query(query, params);

      const countQuery = status
        ? 'SELECT COUNT(*) FROM conversions WHERE user_id = $1 AND status = $2'
        : 'SELECT COUNT(*) FROM conversions WHERE user_id = $1';
      
      const countParams = status ? [req.user.id, status] : [req.user.id];
      const countResult = await db.query(countQuery, countParams);

      res.json({
        success: true,
        data: {
          conversions: result.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: parseInt(countResult.rows[0].count),
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute a pending conversion
   * POST /api/v1/conversions/:id/execute
   */
  async executeConversion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await this.conversionService.executeConversion(id, req.user.id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a pending conversion
   * POST /api/v1/conversions/:id/cancel
   */
  async cancelConversion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await this.conversionService.cancelConversion(id, req.user.id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export instance methods
const controller = new ConversionController();

export const getRate = controller.getRate.bind(controller);
export const createConversion = controller.createConversion.bind(controller);
export const getConversion = controller.getConversion.bind(controller);
export const getConversionHistory = controller.getConversionHistory.bind(controller);
export const executeConversion = controller.executeConversion.bind(controller);
export const cancelConversion = controller.cancelConversion.bind(controller);
