import { getDatabase, Database } from '../db/connection';
import { TonBlockchainService } from './ton-blockchain.service';
import {
  ReconciliationRecord,
  ReconciliationResult,
  StalePayment,
  StaleConversion,
  StuckAtomicSwap,
  UnverifiedDeposit,
} from '../types';

export class ReconciliationService {
  private db: Database;
  private tonService: TonBlockchainService;

  constructor(db: Database) {
    this.db = db;
    this.tonService = new TonBlockchainService(
      process.env.TON_API_URL!,
      process.env.TON_API_KEY,
      process.env.TON_WALLET_MNEMONIC
    );
  }

  /**
   * Reconcile payment against Telegram webhook data
   */
  async reconcilePayment(paymentId: string): Promise<ReconciliationRecord> {
    // Get payment from database
    const payment = await this.db.oneOrNone(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (!payment) {
      throw new Error('Payment not found');
    }

    const expectedAmount = payment.stars_amount;
    const actualAmount = payment.raw_payload?.successful_payment?.total_amount || 0;
    const difference = Math.abs(expectedAmount - actualAmount);

    const status = difference === 0 ? 'matched' : 'mismatch';

    // Record reconciliation
    const result = await this.db.one(
      `INSERT INTO reconciliation_records (
        payment_id, expected_amount, actual_amount, difference,
        status, reconciliation_type, reconciled_at
      ) VALUES ($1, $2, $3, $4, $5, 'payment', NOW())
      RETURNING *`,
      [paymentId, expectedAmount, actualAmount, difference, status]
    );

    console.log(`✅ Payment reconciled: ${paymentId} - Status: ${status}`);

    return this.mapToRecord(result);
  }

  /**
   * Reconcile conversion against DEX and TON blockchain
   */
  async reconcileConversion(conversionId: string): Promise<ReconciliationRecord> {
    // Get conversion from database
    const conversion = await this.db.oneOrNone(
      'SELECT * FROM conversions WHERE id = $1',
      [conversionId]
    );

    if (!conversion) {
      throw new Error('Conversion not found');
    }

    const expectedAmount = conversion.target_amount;
    let actualAmount = 0;
    let status: 'matched' | 'mismatch' | 'pending' = 'pending';
    let difference = 0;

    if (conversion.ton_tx_hash) {
      const tx = await this.tonService.getTransaction(conversion.ton_tx_hash);
      if (tx && tx.confirmed) {
        actualAmount = tx.amount;
        difference = Math.abs(expectedAmount - actualAmount);
        status = difference < 0.01 ? 'matched' : 'mismatch'; // Allow 0.01 TON tolerance
      }
    } else {
      status = 'pending';
    }

    const result = await this.db.one(
      `INSERT INTO reconciliation_records (
        conversion_id, expected_amount, actual_amount, difference,
        status, reconciliation_type, external_reference, reconciled_at
      ) VALUES ($1, $2, $3, $4, $5, 'conversion', $6, NOW())
      RETURNING *`,
      [
        conversionId,
        expectedAmount,
        actualAmount,
        difference,
        status,
        conversion.ton_tx_hash
      ]
    );

    console.log(`✅ Conversion reconciled: ${conversionId} - Status: ${status}`);

    return this.mapToRecord(result);
  }

    async checkStalePendingPayments(): Promise<StalePayment[]> {
    const paymentResult = await this.db.any(
      `SELECT 
         p.id as payment_id,
         p.user_id,
         p.stars_amount,
         p.status,
         p.created_at
       FROM payments p
       WHERE p.status = 'received' 
         AND p.created_at < NOW() - INTERVAL '1 hour'`
    );
    return paymentResult.map((p) => ({
      paymentId: p.payment_id,
      userId: p.user_id,
      starsAmount: p.stars_amount,
      status: p.status,
      ageHours: Math.floor(
        (new Date().getTime() - new Date(p.created_at).getTime()) / 3600000
      ),
    }));
  }

  async checkStalePendingConversions(): Promise<StaleConversion[]> {
    const result = await this.db.any(
      `SELECT 
         c.id as conversion_id,
         c.user_id,
         c.source_amount,
         c.target_amount,
         c.status,
         c.created_at
       FROM conversions c
       WHERE c.status = 'pending'
         AND c.created_at < NOW() - INTERVAL '1 hour'`
    );
    return result.map((c) => ({
      conversionId: c.conversion_id,
      userId: c.user_id,
      sourceAmount: c.source_amount,
      targetAmount: c.target_amount,
      status: c.status,
      ageHours: Math.floor(
        (new Date().getTime() - new Date(c.created_at).getTime()) / 3600000
      ),
    }));
  }

  /**
   * Run daily reconciliation for all unreconciled transactions
   */
  async checkStuckAtomicSwaps(): Promise<StuckAtomicSwap[]> {
    const paymentsResult = await this.db.any(
      `SELECT 
         p.id as payment_id,
         p.user_id,
         a.id as swap_id,
         a.status as swap_status,
         a.created_at as swap_created_at
       FROM payments p
       JOIN atomic_swaps a ON p.id = a.payment_id
       WHERE p.status = 'awaiting_ton' 
         AND a.status NOT IN ('completed', 'failed', 'expired')
         AND a.created_at < NOW() - INTERVAL '24 hours'`
    );

    const conversionsResult = await this.db.any(
      `SELECT 
         c.id as conversion_id,
         c.user_id,
         a.id as swap_id,
         a.status as swap_status,
         a.created_at as swap_created_at
       FROM conversions c
       JOIN atomic_swaps a ON c.id = a.conversion_id
       WHERE c.status = 'awaiting_ton'
         AND a.status NOT IN ('completed', 'failed', 'expired')
         AND a.created_at < NOW() - INTERVAL '24 hours'`
    );

    return [...paymentsResult, ...conversionsResult];
  }

    async checkUnverifiedDeposits(): Promise<UnverifiedDeposit[]> {
    const result = await this.db.any(
      `SELECT 
         d.id as deposit_id,
         d.user_id,
         d.amount,
         d.currency,
         d.status,
         d.created_at
       FROM deposits d
       WHERE d.status = 'awaiting_confirmation'
         AND d.created_at < NOW() - INTERVAL '1 hour'`
    );
    return result;
  }

  /**
   * Get reconciliation report for date range
   */
  async getReconciliationReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: ReconciliationResult;
    records: ReconciliationRecord[];
  }> {
    const results = await this.db.any(
      `SELECT * FROM reconciliation_records
       WHERE created_at BETWEEN $1 AND $2
       ORDER BY created_at DESC`,
      [startDate, endDate]
    );

    const records = results.map(r => this.mapToRecord(r));

    const summary: ReconciliationResult = {
      matched: records.filter(r => r.status === 'matched').length,
      mismatched: records.filter(r => r.status === 'mismatch').length,
      pending: records.filter(r => r.status === 'pending').length,
      totalChecked: records.length,
      discrepancies: records.filter(r => r.status === 'mismatch')
    };

    return { summary, records };
  }

  /**
   * Map database row to ReconciliationRecord
   */
  private mapToRecord(row: any): ReconciliationRecord {
    return {
      id: row.id,
      paymentId: row.payment_id,
      conversionId: row.conversion_id,
      expectedAmount: parseFloat(row.expected_amount),
      actualAmount: parseFloat(row.actual_amount),
      difference: parseFloat(row.difference),
      status: row.status,
      reconciliationType: row.reconciliation_type,
      externalReference: row.external_reference,
      notes: row.notes,
      reconciledAt: row.reconciled_at ? new Date(row.reconciled_at) : undefined,
      createdAt: new Date(row.created_at)
    };
  }
}
