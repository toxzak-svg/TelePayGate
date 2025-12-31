import { initDatabase, Database } from "../db/connection";
import StarsOrderModel, {
  StarsOrder,
  AtomicSwap,
} from "../models/stars-order.model";
import { TonBlockchainService } from "./ton-blockchain.service";

export interface AtomicSwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
  sellOrderId: string;
  buyOrderId: string;
  tonAmount: string;
  starsAmount: number;
}

/**
 * Simple P2P matching service for Stars <-> TON orders.
 * - Immediate-match strategy: when an order is created, attempt to find a counter-order.
 * - Background loop periodically scans open orders and attempts matches.
 * - Atomic swap execution with TON transfer orchestration.
 */
export class StarsP2PService {
  private db: Database;
  private model: StarsOrderModel;
  private loopHandle: NodeJS.Timeout | null = null;
  private tonService: TonBlockchainService | null = null;

  constructor(connOrConnString?: Database | string, tonService?: TonBlockchainService) {
    if (!connOrConnString) {
      const conn = process.env.DATABASE_URL ?? "";
      if (!conn)
        throw new Error("DATABASE_URL is required for StarsP2PService");
      this.db = initDatabase(conn);
    } else if (typeof (connOrConnString as any).any === "function") {
      // assume this is a pg-promise Database instance
      this.db = connOrConnString as Database;
    } else {
      this.db = initDatabase(connOrConnString as string);
    }
    this.model = new StarsOrderModel(this.db);
    this.tonService = tonService || null;
  }

  /**
   * Initialize TON service for atomic swap execution
   */
  async initializeTonService(): Promise<void> {
    if (!this.tonService) {
      const endpoint = process.env.TON_API_URL || "https://toncenter.com/api/v2/jsonRPC";
      const apiKey = process.env.TON_API_KEY;
      const mnemonic = process.env.TON_WALLET_MNEMONIC;
      
      this.tonService = new TonBlockchainService(endpoint, apiKey, mnemonic);
    }
    await this.tonService.initializeWallet();
  }

  async createSellOrder(userId: string, starsAmount: number, rate: string) {
    const order: StarsOrder = {
      user_id: userId,
      type: "sell",
      stars_amount: starsAmount,
      rate,
      status: "open",
    };
    const created = await this.model.createOrder(order);
    // Try to match immediately
    await this.tryMatchOrder(created);
    return created;
  }

  async createBuyOrder(userId: string, tonAmount: string, rate: string) {
    const order: StarsOrder = {
      user_id: userId,
      type: "buy",
      ton_amount: tonAmount,
      rate,
      status: "open",
    };
    const created = await this.model.createOrder(order);
    // Try to match immediately and get the result
    const _matchResult = await this.tryMatchOrder(created);

    // Return the latest state of the order
    const latestOrder = await this.model.getById(created.id);
    return latestOrder || created;
  }

  private async tryMatchOrder(order: any) {
    try {
      if (!order || !order.id) return null;
      if (order.status !== "open") return null; // Don't match already matched/filled orders

      if (order.type === "sell") {
        // find buy orders with rate >= sell.rate
        const candidates = await this.model.findOpenOrders(
          "buy",
          undefined,
          order.rate,
          5,
        );
        if (candidates.length === 0) return null;
        const buyer = candidates[0];
        return await this.createSwapAndLock(order, buyer);
      } else {
        // order.type === 'buy'
        // find sell orders with rate <= buy.rate
        const candidates = await this.model.findOpenOrders(
          "sell",
          order.rate,
          undefined,
          5,
        );
        if (candidates.length === 0) return null;
        const seller = candidates[0];
        return await this.createSwapAndLock(seller, order);
      }
    } catch (err) {
      console.error("Error trying to match order:", err);
      return null;
    }
  }

  private async createSwapAndLock(sell: any, buy: any) {
    // Mark both orders as matched (transactionally) and create atomic swap record
    return this.db.tx(async (t) => {
      const m = new StarsOrderModel(t as any);
      await m.markOrdersMatched(sell.id, buy.id);
      const swap: AtomicSwap = {
        sell_order_id: sell.id,
        buy_order_id: buy.id,
        status: "initiated",
        ton_transfer_tx: "",
        stars_transfer_id: "",
      };
      const createdSwap = await m.createAtomicSwap(swap);
      // In a real implementation we would now coordinate escrow and TON transfer
      // For MVP mark swap as in_progress
      await t.none("UPDATE atomic_swaps SET status = $1 WHERE id = $2", [
        "in_progress",
        createdSwap.id,
      ]);
      return createdSwap;
    });
  }

  /**
   * Background matching loop: scan open sells and attempt to match against buys
   */
  startLoop(intervalMs = 5000) {
    if (this.loopHandle) return;
    this.loopHandle = setInterval(async () => {
      try {
        const sells = await this.model.listOpenOrders("sell", 20);
        for (const s of sells) {
          // attempt match for each sell
          await this.tryMatchOrder(s);
        }
      } catch (err) {
        console.error("P2P matching loop error:", err);
      }
    }, intervalMs);
  }

  stopLoop() {
    if (this.loopHandle) {
      clearInterval(this.loopHandle as NodeJS.Timeout);
      this.loopHandle = null;
    }
  }

  async executeAtomicSwap(swapId: string): Promise<AtomicSwapResult> {
    const swap = await this.db.oneOrNone(
      "SELECT * FROM atomic_swaps WHERE id = $1",
      [swapId],
    );

    if (!swap) {
      return { 
        success: false, 
        error: "Swap not found",
        sellOrderId: "",
        buyOrderId: "",
        tonAmount: "0",
        starsAmount: 0,
      };
    }

    // Get the associated orders
    const sellOrder = await this.db.oneOrNone(
      "SELECT * FROM stars_orders WHERE id = $1",
      [swap.sell_order_id],
    );
    const buyOrder = await this.db.oneOrNone(
      "SELECT * FROM stars_orders WHERE id = $1",
      [swap.buy_order_id],
    );

    if (!sellOrder || !buyOrder) {
      await this.db.none("UPDATE atomic_swaps SET status = $1 WHERE id = $2", [
        "failed",
        swapId,
      ]);
      return {
        success: false,
        error: "Associated orders not found",
        sellOrderId: swap.sell_order_id,
        buyOrderId: swap.buy_order_id,
        tonAmount: "0",
        starsAmount: 0,
      };
    }

    try {
      // Step 1: Update swap status to executing
      await this.db.none("UPDATE atomic_swaps SET status = $1 WHERE id = $2", [
        "executing",
        swapId,
      ]);

      // Step 2: Execute TON transfer if TON service is available
      let txHash: string | undefined;
      const tonAmount = buyOrder.ton_amount || "0";
      const starsAmount = sellOrder.stars_amount || 0;

      if (this.tonService) {
        // Get seller's wallet address (the one receiving TON)
        const sellerWallet = await this.db.oneOrNone(
          "SELECT wallet_address FROM users WHERE id = $1",
          [sellOrder.user_id],
        );

        if (sellerWallet?.wallet_address) {
          try {
            txHash = await this.tonService.sendTON(
              sellerWallet.wallet_address,
              parseFloat(tonAmount),
              `P2P Swap: ${starsAmount} Stars`,
            );

            // Update swap with transaction hash
            await this.db.none(
              "UPDATE atomic_swaps SET ton_transfer_tx = $1, status = $2 WHERE id = $3",
              [txHash, "ton_sent", swapId],
            );
          } catch (tonError: any) {
            console.error("TON transfer failed:", tonError);
            await this.db.none("UPDATE atomic_swaps SET status = $1 WHERE id = $2", [
              "ton_failed",
              swapId,
            ]);
            return {
              success: false,
              error: `TON transfer failed: ${tonError.message}`,
              sellOrderId: swap.sell_order_id,
              buyOrderId: swap.buy_order_id,
              tonAmount,
              starsAmount,
            };
          }
        }
      }

      // Step 3: Mark swap as completed (Stars transfer handled by Telegram escrow externally)
      // In production, this would integrate with Telegram's Stars API for confirmation
      await this.db.none("UPDATE atomic_swaps SET status = $1 WHERE id = $2", [
        "completed",
        swapId,
      ]);

      // Step 4: Mark orders as completed
      await this.db.none(
        "UPDATE stars_orders SET status = $1, completed_at = NOW() WHERE id IN ($2, $3)",
        ["completed", swap.sell_order_id, swap.buy_order_id],
      );

      console.log(`✅ Atomic swap ${swapId} completed successfully`, {
        txHash,
        tonAmount,
        starsAmount,
      });

      return { 
        success: true, 
        txHash,
        sellOrderId: swap.sell_order_id,
        buyOrderId: swap.buy_order_id,
        tonAmount,
        starsAmount,
      };
    } catch (error: any) {
      console.error(`❌ Atomic swap ${swapId} failed:`, error);
      
      await this.db.none("UPDATE atomic_swaps SET status = $1 WHERE id = $2", [
        "failed",
        swapId,
      ]);

      return {
        success: false,
        error: error.message,
        sellOrderId: swap.sell_order_id,
        buyOrderId: swap.buy_order_id,
        tonAmount: buyOrder?.ton_amount || "0",
        starsAmount: sellOrder?.stars_amount || 0,
      };
    }
  }

  /**
   * Retry a failed atomic swap
   */
  async retrySwap(swapId: string): Promise<AtomicSwapResult> {
    const swap = await this.db.oneOrNone(
      "SELECT * FROM atomic_swaps WHERE id = $1 AND status IN ($2, $3)",
      [swapId, "failed", "ton_failed"],
    );

    if (!swap) {
      return {
        success: false,
        error: "Swap not found or not in retryable state",
        sellOrderId: "",
        buyOrderId: "",
        tonAmount: "0",
        starsAmount: 0,
      };
    }

    // Reset to initiated and re-execute
    await this.db.none("UPDATE atomic_swaps SET status = $1 WHERE id = $2", [
      "initiated",
      swapId,
    ]);

    return this.executeAtomicSwap(swapId);
  }

  /**
   * Get swap status with full details
   */
  async getSwapStatus(swapId: string): Promise<AtomicSwap | null> {
    return this.db.oneOrNone(
      "SELECT * FROM atomic_swaps WHERE id = $1",
      [swapId],
    );
  }
}

export default StarsP2PService;
