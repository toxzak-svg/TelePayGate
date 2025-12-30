export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRatePerSec: number;

  constructor(capacity = 10, refillRatePerSec = 5) {
    this.capacity = capacity;
    this.refillRatePerSec = refillRatePerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const refillAmount = Math.floor(elapsed * this.refillRatePerSec);
    if (refillAmount > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + refillAmount);
      this.lastRefill = now;
    }
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    this.refill();
    if (this.tokens <= 0) {
      const waitMs = Math.ceil(1000 / this.refillRatePerSec);
      await new Promise((r) => setTimeout(r, waitMs));
      this.refill();
    }
    this.tokens -= 1;
    return fn();
  }
}

