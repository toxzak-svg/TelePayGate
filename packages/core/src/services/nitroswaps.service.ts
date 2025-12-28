import axios from "axios";
import { getDatabase } from "../db/connection";
import { TonBlockchainService } from "./ton-blockchain.service";

type CacheKey = string;

interface NitroQuote {
  fromToken: string;
  toToken: string;
  amount: number;
  expectedOutput: number;
  rate: number;
  feePercent: number;
  estimatedGas: number;
  route: string[];
  provider: string;
}

interface NitroSwapParams {
  fromToken: string;
  toToken: string;
  amount: number;
  minReceive: number;
  chain?: "TON";
  referenceId?: string;
  userId?: string;
}

interface NitroSwapResult {
  success: boolean;
  txHash?: string;
  outputAmount?: number;
  gasUsed?: number;
  error?: string;
  provider?: string;
}

class TtlCache<V> {
  private store = new Map<CacheKey, { v: V; exp: number }>();
  constructor(private ttlMs: number) {}
  get(k: CacheKey): V | undefined {
    const e = this.store.get(k);
    if (!e) return undefined;
    if (e.exp < Date.now()) {
      this.store.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k: CacheKey, v: V) {
    this.store.set(k, { v, exp: Date.now() + this.ttlMs });
  }
}

export class NitroSwapsService {
  private tonService: TonBlockchainService;
  private apiUrl: string | undefined;
  private apiKey: string | undefined;
  private enabled: boolean;
  private quoteCache: TtlCache<NitroQuote>;

  constructor(tonService?: TonBlockchainService) {
    this.tonService =
      tonService ||
      new TonBlockchainService(
        process.env.TON_API_URL || "",
        process.env.TON_API_KEY,
        process.env.TON_WALLET_MNEMONIC,
      );
    this.apiUrl = process.env.NITRO_API_URL;
    this.apiKey = process.env.NITRO_API_KEY;
    this.enabled = (process.env.NITRO_FEATURE_ENABLED || "false") === "true";
    this.quoteCache = new TtlCache<NitroQuote>(30_000);
  }

  async getQuote(
    fromToken: string,
    toToken: string,
    amount: number,
  ): Promise<NitroQuote> {
    const cacheKey = `${fromToken}:${toToken}:${amount}`;
    const cached = this.quoteCache.get(cacheKey);
    if (cached) return cached;

    if (!this.enabled) {
      const rate = 1;
      const expectedOutput = amount * rate * 0.99;
      const mock: NitroQuote = {
        fromToken,
        toToken,
        amount,
        expectedOutput,
        rate,
        feePercent: 0.003,
        estimatedGas: 0.05,
        route: [fromToken, toToken],
        provider: "nitro",
      };
      this.quoteCache.set(cacheKey, mock);
      return mock;
    }

    if (!this.apiUrl) {
      const fallback: NitroQuote = {
        fromToken,
        toToken,
        amount,
        expectedOutput: amount * 0.99,
        rate: 1,
        feePercent: 0.003,
        estimatedGas: 0.05,
        route: [fromToken, toToken],
        provider: "nitro",
      };
      this.quoteCache.set(cacheKey, fallback);
      return fallback;
    }

    const res = await axios.get(`${this.apiUrl}/quote`, {
      params: { fromToken, toToken, amount },
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      timeout: 5000,
    });

    const q: NitroQuote = {
      fromToken,
      toToken,
      amount,
      expectedOutput: parseFloat(res.data?.expectedOutput ?? "0"),
      rate: parseFloat(res.data?.rate ?? "0"),
      feePercent: parseFloat(res.data?.feePercent ?? "0.003"),
      estimatedGas: parseFloat(res.data?.estimatedGas ?? "0.05"),
      route: res.data?.route ?? [fromToken, toToken],
      provider: "nitro",
    };

    this.quoteCache.set(cacheKey, q);
    return q;
  }

  async executeSwap(params: NitroSwapParams): Promise<NitroSwapResult> {
    const { amount, minReceive, fromToken, toToken } = params;
    if (amount <= 0 || minReceive <= 0) {
      return { success: false, error: "INVALID_AMOUNT" };
    }
    if (!fromToken || !toToken) {
      return { success: false, error: "INVALID_TOKENS" };
    }

    const db = getDatabase();

    const fraud = await this.detectFraud(params);
    if (fraud) {
      await db.none(
        "INSERT INTO swap_logs (conversion_id, provider, amount_in, amount_out, tx_hash, gas_used, status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [
          params.referenceId || null,
          "nitro",
          amount,
          0,
          null,
          0,
          "fraud_suspected",
        ],
      );
      return { success: false, error: "FRAUD_SUSPECTED" };
    }

    if (!this.enabled || !this.apiUrl) {
      const txHash = `nitro_sim_${Date.now()}`;
      const outputAmount = amount * 0.98;
      if (outputAmount < minReceive) {
        return { success: false, error: "SLIPPAGE_EXCEEDED" };
      }

      await db.none(
        "INSERT INTO nitro_swaps (user_id, reference_id, from_token, to_token, amount_in, min_receive, provider, status, tx_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          params.userId || null,
          params.referenceId || null,
          fromToken,
          toToken,
          amount,
          minReceive,
          "nitro",
          "completed",
          txHash,
        ],
      );

      await db.none(
        "INSERT INTO swap_logs (conversion_id, provider, amount_in, amount_out, tx_hash, gas_used, status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [
          params.referenceId || null,
          "nitro",
          amount,
          outputAmount,
          txHash,
          0.05,
          "success",
        ],
      );

      return {
        success: true,
        txHash,
        outputAmount,
        gasUsed: 0.05,
        provider: "nitro",
      };
    }

    const res = await axios.post(
      `${this.apiUrl}/swap`,
      {
        fromToken,
        toToken,
        amount,
        minReceive,
        chain: params.chain || "TON",
        referenceId: params.referenceId,
      },
      {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        timeout: 10000,
      },
    );

    const txHash: string = res.data?.txHash;
    const outputAmount = parseFloat(res.data?.outputAmount ?? "0");
    const gasUsed = parseFloat(res.data?.gasUsed ?? "0");

    await db.none(
      "INSERT INTO nitro_swaps (user_id, reference_id, from_token, to_token, amount_in, min_receive, provider, status, tx_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        params.userId || null,
        params.referenceId || null,
        fromToken,
        toToken,
        amount,
        minReceive,
        "nitro",
        "executing",
        txHash,
      ],
    );

    const verified = await this.verifySwap(txHash);
    const finalStatus = verified ? "completed" : "pending";

    await db.none("UPDATE nitro_swaps SET status = $1 WHERE tx_hash = $2", [
      finalStatus,
      txHash,
    ]);

    await db.none(
      "INSERT INTO swap_logs (conversion_id, provider, amount_in, amount_out, tx_hash, gas_used, status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [
        params.referenceId || null,
        "nitro",
        amount,
        outputAmount,
        txHash,
        gasUsed,
        finalStatus === "completed" ? "success" : "pending",
      ],
    );

    return {
      success: finalStatus === "completed",
      txHash,
      outputAmount,
      gasUsed,
      provider: "nitro",
    };
  }

  async verifySwap(txHash: string): Promise<boolean> {
    try {
      await this.tonService.initializeWallet();
      const client = this.tonService.getClient();
      const { wallet } = this.tonService.getWallet();
      const txs = await client.getTransactions(wallet.address, { limit: 5 });
      return txs.some((t: any) => t?.hash().toString("hex") === txHash);
    } catch {
      return false;
    }
  }

  async getStatusByTx(txHash: string): Promise<{
    status: string;
    outputAmount?: number;
    provider?: string;
  }> {
    const db = getDatabase();
    const row = await db.oneOrNone(
      "SELECT status FROM nitro_swaps WHERE tx_hash = $1",
      [txHash],
    );
    if (!row) return { status: "unknown" };
    return { status: row.status, provider: "nitro" };
  }

  private async detectFraud(params: NitroSwapParams): Promise<boolean> {
    const amt = params.amount;
    if (amt > 1_000_000) return true;
    return false;
  }
}

export default NitroSwapsService;
