import { Request, Response, NextFunction } from 'express';
import { respondSuccess, respondError, newRequestId } from '../utils/response';

export class WebhookController {
  static async handleTonTransaction(req: Request, res: Response, next: NextFunction) {
    const requestId = newRequestId();
    try {
      // For now, we just acknowledge the webhook.
      // In the future, we will add logic to handle the transaction.
      console.log('Received TON transaction webhook:', req.body);
      return respondSuccess(res, { message: 'Webhook received', payload: req.body }, 200, requestId);
    } catch (error: unknown) {
      console.error('Webhook handling error:', error);
      const message = error instanceof Error ? error.message : String(error);
      return respondError(res, 'WEBHOOK_HANDLING_ERROR', message, 500, requestId);
    }
  }
}
