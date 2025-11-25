import { Request, Response } from 'express';
import { sendSuccess, sendError, newRequestId } from '../utils/response';

export class WebhookController {
  static async handleTonTransaction(req: Request, res: Response) {
    const requestId = newRequestId();
    try {
      // For now, we just acknowledge the webhook.
      // In the future, we will add logic to handle the transaction.
      console.log('Received TON transaction webhook:', req.body);
      return sendSuccess(res, { message: 'Webhook received', payload: req.body }, 200, requestId);
    } catch (error: unknown) {
      console.error('Webhook handling error:', error);
      const message = error instanceof Error ? error.message : String(error);
      return sendError(res, 'WEBHOOK_HANDLING_ERROR', message, 500, requestId);
    }
  }
}
