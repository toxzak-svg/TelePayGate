import { Database } from '../db/connection';

export interface Settlement {
  id: string;
  userId: string;
  conversionId: string;
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
  exchangePlatform?: string;
  bankAccountId?: string;
  recipientInfo?: SettlementRecipient;
  status: SettlementStatus;
  settlementDate?: Date;
  transactionId?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export enum FiatCurrency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  AUD = 'AUD',
  CAD = 'CAD'
}

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SettlementRecipient {
  name: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  swiftCode?: string;
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

export class SettlementModel {
  constructor(private db: Database) { }

  /**
   * Create a new settlement
   */
  async create(data: {
    userId: string;
    conversionId: string;
    fiatAmount: number;
    fiatCurrency: FiatCurrency;
    exchangePlatform?: string;
    bankAccountId?: string;
    recipientInfo?: SettlementRecipient;
    status?: SettlementStatus;
  }): Promise<Settlement> {
    const result = await this.db.one(
      `INSERT INTO settlements (
        id, user_id, conversion_id, fiat_amount, fiat_currency,
        exchange_platform, bank_account_id, recipient_info, status, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      ) RETURNING *`,
      [
        data.userId,
        data.conversionId,
        data.fiatAmount,
        data.fiatCurrency,
        data.exchangePlatform,
        data.bankAccountId,
        JSON.stringify(data.recipientInfo || {}),
        data.status || SettlementStatus.PENDING
      ]
    );

    return this.mapToSettlement(result);
  }

  /**
   * Find settlement by ID
   */
  async findById(id: string): Promise<Settlement | null> {
    try {
      const result = await this.db.one(
        'SELECT * FROM settlements WHERE id = $1',
        [id]
      );
      return this.mapToSettlement(result);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update settlement
   */
  async update(
    id: string,
    updates: {
      status?: SettlementStatus;
      transactionId?: string;
      settlementDate?: Date;
      errorMessage?: string;
      completedAt?: Date;
    }
  ): Promise<Settlement> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id) as Promise<Settlement>;
    }

    const result = await this.db.one(
      `UPDATE settlements 
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} 
       RETURNING *`,
      [...values, id]
    );

    return this.mapToSettlement(result);
  }

  /**
   * List settlements for a user
   */
  async listByUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: SettlementStatus;
    } = {}
  ): Promise<{ settlements: Settlement[]; total: number }> {
    const { limit = 20, offset = 0, status } = options;

    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    const [results, countResult] = await Promise.all([
      this.db.any<Settlement>(
        `SELECT * FROM settlements ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      this.db.one(
        `SELECT COUNT(*) as count FROM settlements ${whereClause}`,
        params
      )
    ]);

    return {
      settlements: results.map(r => this.mapToSettlement(r)),
      total: parseInt(countResult.count)
    };
  }

  /**
   * Get settlement statistics
   */
  async getStats(userId?: string): Promise<{
    totalSettlements: number;
    totalAmount: number;
    byStatus: Record<SettlementStatus, number>;
    byCurrency: Record<FiatCurrency, number>;
  }> {
    const whereClause = userId ? 'WHERE user_id = $1' : '';
    const params = userId ? [userId] : [];

    const [countResult, sumResult, statusResults, currencyResults] = await Promise.all([
      this.db.one(
        `SELECT COUNT(*) as count FROM settlements ${whereClause}`,
        params
      ),
      this.db.one(
        `SELECT COALESCE(SUM(fiat_amount), 0) as total FROM settlements ${whereClause}`,
        params
      ),
      this.db.any<{ status: SettlementStatus; count: string }>(
        `SELECT status, COUNT(*) as count FROM settlements ${whereClause} GROUP BY status`,
        params
      ),
      this.db.any<{ fiat_currency: FiatCurrency; total: string }>(
        `SELECT fiat_currency, SUM(fiat_amount) as total FROM settlements ${whereClause} GROUP BY fiat_currency`,
        params
      )
    ]);

    const byStatus: Record<string, number> = {};
    statusResults.forEach(r => {
      byStatus[r.status] = parseInt(r.count);
    });

    const byCurrency: Record<string, number> = {};
    currencyResults.forEach(r => {
      byCurrency[r.fiat_currency] = parseFloat(r.total);
    });

    return {
      totalSettlements: parseInt(countResult.count),
      totalAmount: parseFloat(sumResult.total),
      byStatus: byStatus as Record<SettlementStatus, number>,
      byCurrency: byCurrency as Record<FiatCurrency, number>
    };
  }

  /**
   * Map database row to Settlement object
   */
  private mapToSettlement(row: any): Settlement {
    return {
      id: row.id,
      userId: row.user_id,
      conversionId: row.conversion_id,
      fiatAmount: parseFloat(row.fiat_amount),
      fiatCurrency: row.fiat_currency as FiatCurrency,
      exchangePlatform: row.exchange_platform,
      bankAccountId: row.bank_account_id,
      recipientInfo: typeof row.recipient_info === 'string'
        ? JSON.parse(row.recipient_info)
        : row.recipient_info,
      status: row.status as SettlementStatus,
      settlementDate: row.settlement_date ? new Date(row.settlement_date) : undefined,
      transactionId: row.transaction_id,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }
}
