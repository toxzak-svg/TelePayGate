import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controller";

const router = Router();

router.post("/ton-transaction", WebhookController.handleTonTransaction);
router.post("/telegram", WebhookController.handleTelegramWebhook);

export default router;
