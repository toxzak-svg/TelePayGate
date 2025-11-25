import { Database } from '../db/connection';

export interface Payment {
  id: string;
  userId: string;
  telegramInvoiceId: string;
  starsAmount: number;
  status: PaymentStatus;
  telegramPaymentId: string;
  rawPayload?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  CONVERTING = 'converting',
  CONVERTED = 'converted',
  SETTLED = 'settled',
  FAILED = 'failed'
}

export class PaymentModel {
  constructor(private db: Database) { }

  /**
   * Create a new payment record
   */
  async create(data: {
    userId: string;
    telegramInvoiceId: string;
    starsAmount: number;
    telegramPaymentId: string;
    status?: PaymentStatus;
    rawPayload?: unknown;
  }): Promise<Payment> {
    const result = await this.db.one(
      `INSERT INTO payments (
        id, user_id, telegram_invoice_id, stars_amount, status, 
        telegram_payment_id, raw_payload, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
      ) RETURNING *`,
      [
        data.userId,
        data.telegramInvoiceId,
        data.starsAmount,
        data.status || PaymentStatus.PENDING,
        data.telegramPaymentId,
        JSON.stringify(data.rawPayload || {})
      ]
    );

    return this.mapToPayment(result);
  }

  /**
   * Find payment by ID
   */
  async findById(id: string): Promise<Payment | null> {
    try {
      const result = await this.db.one(
        'SELECT * FROM payments WHERE id = $1',
        [id]
      );
      return this.mapToPayment(result);
    } catch (error) {
      return null;
    }
  }

  /**
   * Find payment by Telegram payment ID
   */
  async findByTelegramPaymentId(telegramPaymentId: string): Promise<Payment | null> {
    try {
      const result = await this.db.one(
        'SELECT * FROM payments WHERE telegram_payment_id = $1',
        [telegramPaymentId]
      );
      return this.mapToPayment(result);
    } catch (error) {
      return null;
    }
  }

  /**
   * Find multiple payments by IDs
   */
  async findByIds(ids: string[]): Promise<Payment[]> {
    if (ids.length === 0) return [];

    const results = await this.db.any<Payment>(
      'SELECT * FROM payments WHERE id = ANY($1::uuid[])',
      [ids]
    );

    return results.map(r => this.mapToPayment(r));
  }

  /**
   * List payments for a user with pagination
   */
  async listByUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: PaymentStatus;
    } = {}
  ): Promise<{ payments: Payment[]; total: number }> {
    const { limit = 20, offset = 0, status } = options;

    let whereClause = 'WHERE user_id = $1';
    const params: string[] = [userId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    const [results, countResult] = await Promise.all([
      this.db.any(
        `SELECT * FROM payments ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      this.db.one(
        `SELECT COUNT(*) as count FROM payments ${whereClause}`,
        params
      )
    ]);

    return {
      payments: results.map(r => this.mapToPayment(r)),
      total: parseInt(countResult.count)
    };
  }

  /**
   * Update payment status
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    const result = await this.db.one(
      `UPDATE payments 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    return this.mapToPayment(result);
  }

  /**
   * Update multiple payment statuses
   */
  async updateMany(
    criteria: { id?: { in: string[] } },
    updates: { status: PaymentStatus }
  ): Promise<number> {
    if (criteria.id?.in) {
      const result = await this.db.result(
        `UPDATE payments 
         SET status = $1, updated_at = NOW() 
         WHERE id = ANY($2::uuid[])`,
        [updates.status, criteria.id.in]
      );

      return result.rowCount;
    }

    return 0;
  }

  /**
   * Get payment statistics for a user
   */
  async getStatsByUser(userId: string): Promise<{
    totalPayments: number;
    totalStars: number;
    byStatus: Record<PaymentStatus, number>;
  }> {
    const [countResult, sumResult, statusResults] = await Promise.all([
      this.db.one(
        'SELECT COUNT(*) as count FROM payments WHERE user_id = $1',
        [userId]
      ),
      this.db.one(
        'SELECT COALESCE(SUM(stars_amount), 0) as total FROM payments WHERE user_id = $1',
        [userId]
      ),
      this.db.any(
        'SELECT status, COUNT(*) as count FROM payments WHERE user_id = $1 GROUP BY status',
        [userId]
      )
    ]);

    const byStatus: Record<string, number> = {};
    statusResults.forEach(r => {
      byStatus[r.status] = parseInt(r.count);
    });

    return {
      totalPayments: parseInt(countResult.count),
      totalStars: parseFloat(sumResult.total),
      byStatus: byStatus as Record<PaymentStatus, number>
    };
  }

  /**
   * Map database row to Payment object
   */
  private mapToPayment(row: any): Payment {
    return {
      id: row.id,
      userId: row.user_id,
      telegramInvoiceId: row.telegram_invoice_id,
      starsAmount: parseFloat(row.stars_amount),
      status: row.status as PaymentStatus,
      telegramPaymentId: row.telegram_payment_id,
      rawPayload: typeof row.raw_payload === 'string'
        ? JSON.parse(row.raw_payload)
        : row.raw_payload,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
