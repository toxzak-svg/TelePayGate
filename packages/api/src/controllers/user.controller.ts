import { Response, Request } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDatabase, PaymentModel } from '@tg-payment/core';

export class UserController {
  private static getServices() {
    const db = getDatabase();
    const paymentModel = new PaymentModel(db);
    return { db, paymentModel };
  }

  /**
   * POST /api/v1/users/register
   */
  static async register(req: Request, res: Response) {
    const requestId = uuid();
    try {
      const { db } = UserController.getServices();
      const { appName, description, webhookUrl } = req.body;

      if (!appName) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_APP_NAME', message: 'appName is required' },
          requestId,
          timestamp: new Date().toISOString(),
        });
      }

      const apiKey = `pk_${crypto.randomBytes(24).toString('hex')}`;
      const apiSecret = `sk_${crypto.randomBytes(32).toString('hex')}`;

      const user = await db.one(
        `INSERT INTO users (api_key, api_secret, app_name, description, webhook_url, kyc_status, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', true, NOW(), NOW()) RETURNING *`,
        [apiKey, apiSecret, appName, description || null, webhookUrl || null]
      );

      console.log('✅ User registered:', { requestId, userId: user.id, appName });

      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          appName: user.app_name,
          apiKey: user.api_key,
          apiSecret: user.api_secret,
          webhookUrl: user.webhook_url,
          kycStatus: user.kyc_status,
          createdAt: user.created_at,
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Registration error:', { requestId, error: error.message });
      return res.status(500).json({
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: 'Failed to register user' },
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/v1/users/me
   */
  static async getMe(req: Request, res: Response) {
    const requestId = uuid();
    const userId = req.headers['x-user-id'] as string;

    try {
      const { db } = UserController.getServices();

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          requestId,
        });
      }

      const user = await db.oneOrNone(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
          requestId,
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          appName: user.app_name,
          apiKey: user.api_key,
          webhookUrl: user.webhook_url,
          kycStatus: user.kyc_status,
          isActive: user.is_active,
          createdAt: user.created_at,
        },
        requestId,
      });
    } catch (error) {
      console.error('❌ Get profile error:', { requestId, error });
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to get profile' },
        requestId,
      });
    }
  }

  /**
   * POST /api/v1/users/api-keys/regenerate
   */
  static async regenerateApiKey(req: Request, res: Response) {
    const requestId = uuid();
    const userId = req.headers['x-user-id'] as string;

    try {
      const { db } = UserController.getServices();

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          requestId,
        });
      }

      const newApiKey = `pk_${crypto.randomBytes(24).toString('hex')}`;
      const newApiSecret = `sk_${crypto.randomBytes(32).toString('hex')}`;

      const updatedUser = await db.oneOrNone(
        `UPDATE users SET api_key = $1, api_secret = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING api_key, api_secret`,
        [newApiKey, newApiSecret, userId]
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
          requestId,
        });
      }

      return res.status(200).json({
        success: true,
        apiKey: updatedUser.api_key,
        apiSecret: updatedUser.api_secret,
        message: 'API keys regenerated successfully',
        requestId,
      });
    } catch (error) {
      console.error('❌ Regenerate key error:', { requestId, error });
      return res.status(500).json({
        success: false,
        error: { code: 'REGENERATE_FAILED', message: 'Failed to regenerate API key' },
        requestId,
      });
    }
  }

  /**
   * GET /api/v1/users/stats
   */
  static async getStats(req: Request, res: Response) {
    const requestId = uuid();
    const userId = req.headers['x-user-id'] as string;

    try {
      const { paymentModel } = UserController.getServices();

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          requestId,
        });
      }

      const stats = await paymentModel.getStatsByUser(userId);

      return res.status(200).json({
        success: true,
        stats: {
          totalPayments: stats.totalPayments,
          totalStars: stats.totalStars,
          byStatus: stats.byStatus,
        },
        requestId,
      });
    } catch (error) {
      console.error('❌ Get stats error:', { requestId, error });
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to get statistics' },
        requestId,
      });
    }
  }
}

export default UserController;
