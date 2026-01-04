import { Request, Response } from "express";
import { respondSuccess, respondError } from "../utils/response";

export class WebhookController {
  static async handleTonTransaction(req: Request, res: Response) {
    try {
      // For now, we just acknowledge the webhook.
      // In the future, we will add logic to handle the transaction.
      console.log("Received TON transaction webhook:", req.body);
      return respondSuccess(
        res,
        { message: "Webhook received", payload: req.body },
        200,
      );
    } catch (error: unknown) {
      console.error("Webhook handling error:", error);
      const message = error instanceof Error ? error.message : String(error);
      return respondError(res, "WEBHOOK_HANDLING_ERROR", message, 500);
    }
  }

  static async handleTelegramWebhook(req: Request, res: Response) {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 📨 Telegram webhook START`);
    
    try {
      const update = req.body;
      console.log(`[${new Date().toISOString()}] Received update:`, JSON.stringify(update, null, 2));
      
      console.log(`[${new Date().toISOString()}] Sending success response`);
      const response = respondSuccess(
        res,
        { message: "Telegram webhook received", update_id: update?.update_id },
        200,
      );
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ✅ Telegram webhook COMPLETE (${duration}ms)`);
      
      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] ❌ Telegram webhook ERROR (${duration}ms):`, error);
      const message = error instanceof Error ? error.message : String(error);
      return respondError(res, "TELEGRAM_WEBHOOK_ERROR", message, 500);
    }
  }
}
