import { initDatabase, Database } from "../db/connection";
import TonPaymentService from "./ton-payment.service";
import EncryptionUtil from "../utils/encryption.util";

export interface DepositInfo {
  depositId: string;
  address: string;
  expectedAmount: number;
  expiresAt: Date;
  paymentLink: string;
  minConfirmations: number;
}

export class WalletManagerService {
  private db: Database;
  private tonService: TonPaymentService;
  private encryption: EncryptionUtil;
  private minConfirmations: number;
  // SECURITY FIX: Store interval IDs to prevent memory leaks
  private depositPollIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    const conn = process.env.DATABASE_URL || "";
    if (!conn) throw new Error("DATABASE_URL is required");
    this.db = initDatabase(conn);

    this.tonService = new TonPaymentService({
      endpoint: process.env.TON_API_ENDPOINT || "",
      apiKey: process.env.TON_API_KEY,
      mnemonic: process.env.TON_WALLET_MNEMONIC || "",
    });

    this.encryption = new EncryptionUtil(
      process.env.WALLET_ENCRYPTION_KEY || "",
    );
    this.minConfirmations = parseInt(
      process.env.TON_MIN_CONFIRMATIONS || "2",
      10,
    );
  }

  /**
   * Create or reuse a custody wallet and return deposit info
   */
  async createDepositAddress(
    userId: string,
    paymentId: string,
    expectedAmount: number,
  ): Promise<DepositInfo> {
    // Ensure TON wallet initialized
    await this.tonService.initializeWallet();
    const address = this.tonService.getWalletAddress();

    // Upsert wallet record (simple SQL)
    const existing = await this.db.oneOrNone(
      "SELECT * FROM wallets WHERE wallet_address = $1",
      [address],
    );
    let walletId: string;
    if (!existing) {
      const encrypted = this.encryption.encrypt(
        process.env.TON_WALLET_MNEMONIC || "",
      );
      const res = await this.db.one(
        `INSERT INTO wallets (user_id, wallet_address, wallet_type, public_key, encrypted_private_key, balance_ton, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,0,true,NOW(),NOW()) RETURNING id`,
        [userId, address, "custody", "", encrypted],
      );
      walletId = res.id;
    } else {
      walletId = existing.id;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const deposit = await this.db.one(
      `INSERT INTO manual_deposits (user_id, wallet_id, payment_id, expected_amount_ton, deposit_address, status, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,'pending',$6,NOW()) RETURNING id`,
      [userId, walletId, paymentId, expectedAmount, address, expiresAt],
    );

    const paymentLink = this.tonService.getWalletAddress();

    // Start simple polling monitor (non-blocking)
    this.startDepositPoll(deposit.id, address, expectedAmount);

    return {
      depositId: deposit.id,
      address,
      expectedAmount,
      expiresAt,
      paymentLink,
      minConfirmations: this.minConfirmations,
    };
  }

  /**
   * Start polling for deposit confirmation
   * SECURITY FIX: Store interval IDs and provide cleanup method to prevent memory leaks
   */
  private async startDepositPoll(
    depositId: string,
    address: string,
    expectedAmount: number,
  ) {
    // SECURITY FIX: Clear any existing interval for this deposit to prevent duplicates
    if (this.depositPollIntervals.has(depositId)) {
      clearInterval(this.depositPollIntervals.get(depositId)!);
    }

    // Poll every 30s for matching payments
    const interval = setInterval(async () => {
      try {
        const found =
          await this.tonService.checkIncomingPayments(expectedAmount);
        if (found) {
          // Update deposit record to awaiting_confirmation
          await this.db.none(
            "UPDATE manual_deposits SET status = $1, received_amount_ton = $2, confirmed_at = NOW() WHERE id = $3",
            ["awaiting_confirmation", expectedAmount, depositId],
          );
          this.stopDepositPoll(depositId);
          return;
        }
        // Expire if past deadline
        const dep = (await this.db.oneOrNone(
          "SELECT * FROM manual_deposits WHERE id = $1",
          [depositId],
        )) as { expires_at?: string } | null;
        if (dep && dep.expires_at && new Date(dep.expires_at) < new Date()) {
          await this.db.none(
            "UPDATE manual_deposits SET status = $1 WHERE id = $2",
            ["expired", depositId],
          );
          this.stopDepositPoll(depositId);
          return;
        }
      } catch (err) {
        console.error("Error monitoring deposit:", err);
      }
    }, 30000);

    // SECURITY FIX: Store interval ID for cleanup
    this.depositPollIntervals.set(depositId, interval);
  }

  /**
   * Stop polling for a specific deposit
   * SECURITY FIX: Cleanup method to prevent memory leaks
   */
  private stopDepositPoll(depositId: string): void {
    const interval = this.depositPollIntervals.get(depositId);
    if (interval) {
      clearInterval(interval);
      this.depositPollIntervals.delete(depositId);
      console.log(`Stopped deposit polling for: ${depositId}`);
    }
  }

  /**
   * Stop all active deposit polls
   * SECURITY FIX: Cleanup method to prevent memory leaks on shutdown
   */
  public stopAllDepositPolls(): void {
    this.depositPollIntervals.forEach((interval, depositId) => {
      clearInterval(interval);
      console.log(`Stopped deposit polling for: ${depositId}`);
    });
    this.depositPollIntervals.clear();
  }
}

export default WalletManagerService;
