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

  private isEnabled(): boolean {
    return this.enabled === true;
  }

  private quoteKey(fromToken: string, toToken: string, amount: number): CacheKey {
    return `${fromToken}:${toToken}:${amount}`;
  }

  private buildMockQuote(fromToken: string, toToken: string, amount: number): NitroQuote {
    const rate = 1;
    const expectedOutput = amount * rate * 0.99;
    return {
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
  }

  private buildFallbackQuote(fromToken: string, toToken: string, amount: number): NitroQuote {
    return {
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
  }

  private parseQuoteResponse(
    fromToken: string,
    toToken: string,
    amount: number,
    resData: any,
  ): NitroQuote {
    return {
      fromToken,
      toToken,
      amount,
      expectedOutput: parseFloat(resData?.expectedOutput ?? "0"),
      rate: parseFloat(resData?.rate ?? "0"),
      feePercent: parseFloat(resData?.feePercent ?? "0.003"),
      estimatedGas: parseFloat(resData?.estimatedGas ?? "0.05"),
      route: resData?.route ?? [fromToken, toToken],
      provider: "nitro",
    };
  }

  private async fetchNitroQuote(
    fromToken: string,
    toToken: string,
    amount: number,
  ): Promise<NitroQuote> {
    if (!this.apiUrl) return this.buildFallbackQuote(fromToken, toToken, amount);
    const res = await axios.get(`${this.apiUrl}/quote`, {
      params: { fromToken, toToken, amount },
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      timeout: 5000,
    });
    return this.parseQuoteResponse(fromToken, toToken, amount, res.data);
  }

  async getQuote(
    fromToken: string,
    toToken: string,
    amount: number,
  ): Promise<NitroQuote> {
    const cacheKey = this.quoteKey(fromToken, toToken, amount);
    const cached = this.quoteCache.get(cacheKey);
    if (cached) return cached;

    const quote = this.isEnabled()
      ? await this.fetchNitroQuote(fromToken, toToken, amount)
      : this.buildMockQuote(fromToken, toToken, amount);

    this.quoteCache.set(cacheKey, quote);
    return quote;
  }

  private validateSwapParams(params: NitroSwapParams): string | null {
    if (params.amount <= 0 || params.minReceive <= 0) return "INVALID_AMOUNT";
    if (!params.fromToken || !params.toToken) return "INVALID_TOKENS";
    return null;
  }

  private async recordSwapLog(
    referenceId: string | undefined,
    amountIn: number,
    amountOut: number,
    txHash: string | null,
    gasUsed: number,
    status: string,
  ): Promise<void> {
    const db = getDatabase();
    await db.none(
      "INSERT INTO swap_logs (conversion_id, provider, amount_in, amount_out, tx_hash, gas_used, status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [referenceId || null, "nitro", amountIn, amountOut, txHash, gasUsed, status],
    );
  }

  private async insertNitroSwapRecord(
    userId: string | undefined,
    referenceId: string | undefined,
    fromToken: string,
    toToken: string,
    amountIn: number,
    minReceive: number,
    status: string,
    txHash: string | null,
  ): Promise<void> {
    const db = getDatabase();
    await db.none(
      "INSERT INTO nitro_swaps (user_id, reference_id, from_token, to_token, amount_in, min_receive, provider, status, tx_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        userId || null,
        referenceId || null,
        fromToken,
        toToken,
        amountIn,
        minReceive,
        "nitro",
        status,
        txHash,
      ],
    );
  }

  private async updateNitroSwapStatus(txHash: string, status: "pending" | "completed"): Promise<void> {
    const db = getDatabase();
    await db.none("UPDATE nitro_swaps SET status = $1 WHERE tx_hash = $2", [status, txHash]);
  }

  private computeSimulatedOutput(amount: number): number {
    return amount * 0.98;
  }

  private async requestNitroSwap(params: {
    fromToken: string;
    toToken: string;
    amount: number;
    minReceive: number;
    chain: "TON";
    referenceId?: string;
  }): Promise<{ txHash: string; outputAmount: number; gasUsed: number }> {
    if (!this.apiUrl) {
      throw new Error("Nitro API URL not configured");
    }
    const res = await axios.post(
      `${this.apiUrl}/swap`,
      params,
      {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        timeout: 10000,
      },
    );
    return {
      txHash: res.data?.txHash,
      outputAmount: parseFloat(res.data?.outputAmount ?? "0"),
      gasUsed: parseFloat(res.data?.gasUsed ?? "0"),
    };
  }

  async executeSwap(params: NitroSwapParams): Promise<NitroSwapResult> {
    const { amount, minReceive, fromToken, toToken } = params;
    const validationError = this.validateSwapParams(params);
    if (validationError) return { success: false, error: validationError };

    const fraud = await this.detectFraud(params);
    if (fraud) {
      await this.recordSwapLog(params.referenceId, amount, 0, null, 0, "fraud_suspected");
      return { success: false, error: "FRAUD_SUSPECTED" };
    }

    if (!this.isEnabled() || !this.apiUrl) {
      const txHash = `nitro_sim_${Date.now()}`;
      const outputAmount = this.computeSimulatedOutput(amount);
      if (outputAmount < minReceive) {
        return { success: false, error: "SLIPPAGE_EXCEEDED" };
      }

      await this.insertNitroSwapRecord(
        params.userId,
        params.referenceId,
        fromToken,
        toToken,
        amount,
        minReceive,
        "completed",
        txHash,
      );

      await this.recordSwapLog(params.referenceId, amount, outputAmount, txHash, 0.05, "success");

      return {
        success: true,
        txHash,
        outputAmount,
        gasUsed: 0.05,
        provider: "nitro",
      };
    }

    const swap = await this.requestNitroSwap({
      fromToken,
      toToken,
      amount,
      minReceive,
      chain: params.chain || "TON",
      referenceId: params.referenceId,
    });

    await this.insertNitroSwapRecord(
      params.userId,
      params.referenceId,
      fromToken,
      toToken,
      amount,
      minReceive,
      "executing",
      swap.txHash,
    );

    const verified = await this.verifySwap(swap.txHash);
    const finalStatus = verified ? "completed" : "pending";

    await this.updateNitroSwapStatus(swap.txHash, finalStatus as "completed" | "pending");

    await this.recordSwapLog(
      params.referenceId,
      amount,
      swap.outputAmount,
      swap.txHash,
      swap.gasUsed,
      finalStatus === "completed" ? "success" : "pending",
    );

    return {
      success: finalStatus === "completed",
      txHash: swap.txHash,
      outputAmount: swap.outputAmount,
      gasUsed: swap.gasUsed,
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
