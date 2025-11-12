import axios from 'axios';
import crypto from 'crypto';
import { Pool } from 'pg';

export interface WebhookEvent {
  id: string;
  userId: string;
  webhookUrl: string;
  event: string;
  payload: any;
  signature: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export class WebhookService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly RETRY_DELAYS = [30, 60, 300, 900, 3600]; // seconds

  constructor(
    private pool: Pool,
    private webhookSecret: string
  ) {}

  /**
   * Queue a new webhook event
   */
  async queueEvent(
    userId: string,
    webhookUrl: string,
    event: string,
    payload: any
  ): Promise<WebhookEvent> {
    const signature = this.generateSignature(payload);

    const result = await this.pool.query(
      `INSERT INTO webhook_events (
        id, user_id, webhook_url, event, payload, signature,
        status, attempts, max_attempts, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, 'pending', 0, $6, NOW()
      ) RETURNING *`,
      [
        userId,
        webhookUrl,
        event,
        JSON.stringify(payload),
        signature,
        this.MAX_ATTEMPTS
      ]
    );

    const webhookEvent = this.mapToWebhookEvent(result.rows[0]);

    // Attempt immediate delivery
    await this.deliverEvent(webhookEvent.id);

    return webhookEvent;
  }

  /**
   * Deliver a webhook event
   */
  async deliverEvent(eventId: string): Promise<boolean> {
    // Get event from database
    const result = await this.pool.query(
      'SELECT * FROM webhook_events WHERE id = $1',
      [eventId]
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook event not found');
    }

    const event = this.mapToWebhookEvent(result.rows[0]);

    // Check if max attempts reached
    if (event.attempts >= event.maxAttempts) {
      await this.markAsFailed(eventId, 'Max delivery attempts reached');
      return false;
    }

    try {
      // Send webhook
      const response = await axios.post(
        event.webhookUrl,
        {
          event: event.event,
          timestamp: Date.now(),
          data: event.payload
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': event.signature,
            'X-Event-Id': event.id,
            'User-Agent': 'TelegramPaymentGateway/1.0'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // Check if response is successful (2xx)
      if (response.status >= 200 && response.status < 300) {
        await this.markAsDelivered(eventId);
        console.log(`✅ Webhook delivered: ${eventId} to ${event.webhookUrl}`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      
      // Increment attempts
      const newAttempts = event.attempts + 1;
      const nextRetryDelay = this.RETRY_DELAYS[newAttempts - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
      const nextRetryAt = new Date(Date.now() + (nextRetryDelay * 1000));

      await this.pool.query(
        `UPDATE webhook_events
         SET attempts = $1, last_attempt_at = NOW(), next_retry_at = $2, error_message = $3
         WHERE id = $4`,
        [newAttempts, nextRetryAt, errorMessage, eventId]
      );

      console.error(`❌ Webhook delivery failed (attempt ${newAttempts}/${this.MAX_ATTEMPTS}):`, {
        eventId,
        url: event.webhookUrl,
        error: errorMessage,
        nextRetry: nextRetryAt
      });

      // Check if we've reached max attempts
      if (newAttempts >= this.MAX_ATTEMPTS) {
        await this.markAsFailed(eventId, errorMessage);
      }

      return false;
    }
  }

  /**
   * Retry failed webhooks
   */
  async retryFailedWebhooks(): Promise<number> {
    // Get pending webhooks that are ready for retry
    const result = await this.pool.query(
      `SELECT id FROM webhook_events
       WHERE status = 'pending'
       AND attempts < max_attempts
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       LIMIT 100`
    );

    let retried = 0;
    for (const row of result.rows) {
      try {
        await this.deliverEvent(row.id);
        retried++;
      } catch (error) {
        console.error(`Failed to retry webhook ${row.id}:`, error);
      }
    }

    return retried;
  }

  /**
   * Get webhook events for a user
   */
  async getEventsByUser(
    userId: string,
    options: {
      status?: 'pending' | 'delivered' | 'failed';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ events: WebhookEvent[]; total: number }> {
    const { status, limit = 20, offset = 0 } = options;

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    const [eventsResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT * FROM webhook_events ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      this.pool.query(
        `SELECT COUNT(*) as count FROM webhook_events ${whereClause}`,
        params
      )
    ]);

    return {
      events: eventsResult.rows.map(r => this.mapToWebhookEvent(r)),
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Mark event as delivered
   */
  private async markAsDelivered(eventId: string): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_events
       SET status = 'delivered', delivered_at = NOW()
       WHERE id = $1`,
      [eventId]
    );
  }

  /**
   * Mark event as failed
   */
  private async markAsFailed(eventId: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `UPDATE webhook_events
       SET status = 'failed', error_message = $1
       WHERE id = $2`,
      [errorMessage, eventId]
    );
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: any): string {
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return hmac.update(data).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string): boolean {
    const expectedSignature = this.generateSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get webhook statistics
   */
  async getStats(userId?: string): Promise<{
    total: number;
    delivered: number;
    pending: number;
    failed: number;
    successRate: number;
  }> {
    const whereClause = userId ? 'WHERE user_id = $1' : '';
    const params = userId ? [userId] : [];

    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM webhook_events ${whereClause}`,
      params
    );

    const row = result.rows[0];
    const total = parseInt(row.total);
    const delivered = parseInt(row.delivered);

    return {
      total,
      delivered,
      pending: parseInt(row.pending),
      failed: parseInt(row.failed),
      successRate: total > 0 ? (delivered / total) * 100 : 0
    };
  }

  /**
   * Map database row to WebhookEvent
   */
  private mapToWebhookEvent(row: any): WebhookEvent {
    return {
      id: row.id,
      userId: row.user_id,
      webhookUrl: row.webhook_url,
      event: row.event,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      signature: row.signature,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
      nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at)
    };
  }
}
