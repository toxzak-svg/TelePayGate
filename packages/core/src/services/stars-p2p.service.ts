import { initDatabase, Database } from '../db/connection';
import StarsOrderModel, { StarsOrder, AtomicSwap } from '../models/stars-order.model';

/**
 * Simple P2P matching service for Stars <-> TON orders.
 * - Immediate-match strategy: when an order is created, attempt to find a counter-order.
 * - Background loop periodically scans open orders and attempts matches.
 */
export class StarsP2PService {
  private db: Database;
  private model: StarsOrderModel;
  private loopHandle: NodeJS.Timeout | null = null;

  constructor(connOrConnString?: Database | string) {
    if (!connOrConnString) {
      const conn = process.env.DATABASE_URL ?? '';
      if (!conn) throw new Error('DATABASE_URL is required for StarsP2PService');
      this.db = initDatabase(conn);
    } else if (typeof (connOrConnString as any).any === 'function') {
      // assume this is a pg-promise Database instance
      this.db = connOrConnString as Database;
    } else {
      this.db = initDatabase(connOrConnString as string);
    }
    this.model = new StarsOrderModel(this.db);
  }

  async createSellOrder(userId: string, starsAmount: number, rate: string) {
    const order: StarsOrder = {
      user_id: userId,
      type: 'sell',
      stars_amount: starsAmount,
      rate,
      status: 'open',
    };
    const created = await this.model.createOrder(order);
    // Try to match immediately
    await this.tryMatchOrder(created);
    return created;
  }

  async createBuyOrder(userId: string, tonAmount: string, rate: string) {
    const order: StarsOrder = {
      user_id: userId,
      type: 'buy',
      ton_amount: tonAmount,
      rate,
      status: 'open',
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
      if (order.status !== 'open') return null; // Don't match already matched/filled orders

      if (order.type === 'sell') {
        // find buy orders with rate >= sell.rate
        const candidates = await this.model.findOpenOrders('buy', undefined, order.rate, 5);
        if (candidates.length === 0) return null;
        const buyer = candidates[0];
        return await this.createSwapAndLock(order, buyer);
      } else {
        // order.type === 'buy'
        // find sell orders with rate <= buy.rate
        const candidates = await this.model.findOpenOrders('sell', order.rate, undefined, 5);
        if (candidates.length === 0) return null;
        const seller = candidates[0];
        return await this.createSwapAndLock(seller, order);
      }
    } catch (err) {
      console.error('Error trying to match order:', err);
      return null;
    }
  }

  private async createSwapAndLock(sell: any, buy: any) {
    // Mark both orders as matched (transactionally) and create atomic swap record
    return this.db.tx(async t => {
      const m = new StarsOrderModel(t as any);
      await m.markOrdersMatched(sell.id, buy.id);
      const swap: AtomicSwap = {
        sell_order_id: sell.id,
        buy_order_id: buy.id,
        status: 'initiated',
        ton_transfer_tx: '',
        stars_transfer_id: ''
      };
      const createdSwap = await m.createAtomicSwap(swap);
      // In a real implementation we would now coordinate escrow and TON transfer
      // For MVP mark swap as in_progress
      await t.none('UPDATE atomic_swaps SET status = $1 WHERE id = $2', ['in_progress', createdSwap.id]);
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
        const sells = await this.model.listOpenOrders('sell', 20);
        for (const s of sells) {
          // attempt match for each sell
          await this.tryMatchOrder(s);
        }
      } catch (err) {
        console.error('P2P matching loop error:', err);
      }
    }, intervalMs);
  }

  stopLoop() {
    if (this.loopHandle) {
      clearInterval(this.loopHandle as NodeJS.Timeout);
      this.loopHandle = null;
    }
  }

  async executeAtomicSwap(swapId: string) {
    // Placeholder: run the settlement steps and mark swap completed
    const swap = await this.db.oneOrNone('SELECT * FROM atomic_swaps WHERE id = $1', [swapId]);
    // TODO: orchestrate TON transfer + Telegram escrow confirmation
    await this.db.none('UPDATE atomic_swaps SET status = $1 WHERE id = $2', ['completed', swapId]);
    // Mark orders completed
    await this.db.none('UPDATE stars_orders SET status = $1, completed_at = NOW() WHERE id IN ($2, $3)', ['completed', swap.sell_order_id, swap.buy_order_id]);
    return { success: true };
  }
}

export default StarsP2PService;
