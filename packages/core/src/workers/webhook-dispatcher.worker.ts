import "dotenv/config";
import { Pool } from "pg";
import { WebhookService } from "../services/webhook.service";
import {
  createPeriodicRunner,
  installGracefulShutdown,
} from "../lib/worker-utils";

/**
 * Webhook Dispatcher Worker
 * Periodically retries failed webhook events
 */
class WebhookDispatcherWorker {
  private pool: Pool;
  private webhookService: WebhookService;
  private runner = createPeriodicRunner(() => Promise.resolve(), 0);

  // Configuration
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

  constructor(pool: Pool, webhookService: WebhookService) {
    this.pool = pool;
    this.webhookService = webhookService;
  }

  /**
   * Start the webhook dispatcher worker
   */
  async start(): Promise<void> {
    if (this.runner.isRunning()) {
      console.warn("⚠️ Webhook dispatcher worker already running");
      return;
    }

    console.log("🚀 Webhook dispatcher worker started");
    console.log(`⏰ Check interval: ${this.CHECK_INTERVAL_MS / 1000}s`);

    this.runner = createPeriodicRunner(
      () => this.processRetries(),
      this.CHECK_INTERVAL_MS,
    );
    await this.runner.start();
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    await this.runner.stop();
    console.log("🛑 Webhook dispatcher worker stopped");
  }

  /**
   * Process retry queue
   */
  private async processRetries(): Promise<void> {
    try {
      const retriedCount = await this.webhookService.retryFailedWebhooks();
      if (retriedCount > 0) {
        console.log(`🔄 Retried ${retriedCount} failed webhooks`);
      }
    } catch (error) {
      console.error("❌ Webhook retry error:", error);
    }
  }
}

/**
 * Bootstrap and start the worker
 */
async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!process.env.WEBHOOK_SECRET) {
    throw new Error("WEBHOOK_SECRET is required");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

  const webhookService = new WebhookService(pool, process.env.WEBHOOK_SECRET);
  const worker = new WebhookDispatcherWorker(pool, webhookService);

  await worker.start();

  installGracefulShutdown(async () => {
    console.log("\n🛑 Shutting down webhook dispatcher worker...");
    await worker.stop();
    await pool.end();
  });
}

// Only run if executed directly
if (require.main === module) {
  bootstrap().catch((err) => {
    console.error("Failed to start webhook dispatcher worker:", err);
    process.exit(1);
  });
}

export default WebhookDispatcherWorker;
