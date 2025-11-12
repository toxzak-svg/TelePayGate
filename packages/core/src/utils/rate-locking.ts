export interface RateLock {
  id: string;
  exchangeRate: number;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  lockedAt: number;
  expiresAt: number;
  durationSeconds: number;
}

export class RateLockManager {
  private locks: Map<string, RateLock> = new Map();
  private readonly MIN_DURATION = 60; // 1 minute
  private readonly MAX_DURATION = 600; // 10 minutes

  /**
   * Create a new rate lock
   */
  createLock(
    exchangeRate: number,
    sourceCurrency: string,
    targetCurrency: string,
    sourceAmount: number,
    durationSeconds: number = 300
  ): RateLock {
    // Validate duration
    if (durationSeconds < this.MIN_DURATION || durationSeconds > this.MAX_DURATION) {
      throw new Error(
        `Lock duration must be between ${this.MIN_DURATION} and ${this.MAX_DURATION} seconds`
      );
    }

    const now = Date.now();
    const lock: RateLock = {
      id: this.generateLockId(),
      exchangeRate,
      sourceCurrency,
      targetCurrency,
      sourceAmount,
      lockedAt: now,
      expiresAt: now + (durationSeconds * 1000),
      durationSeconds
    };

    this.locks.set(lock.id, lock);

    // Auto-cleanup after expiration
    setTimeout(() => {
      this.locks.delete(lock.id);
    }, durationSeconds * 1000);

    return lock;
  }

  /**
   * Get a rate lock by ID
   */
  getLock(lockId: string): RateLock | null {
    const lock = this.locks.get(lockId);
    if (!lock) {
      return null;
    }

    // Check if expired
    if (this.isExpired(lock)) {
      this.locks.delete(lockId);
      return null;
    }

    return lock;
  }

  /**
   * Validate if a lock is still valid
   */
  isValid(lockId: string): boolean {
    const lock = this.getLock(lockId);
    return lock !== null && !this.isExpired(lock);
  }

  /**
   * Check if a lock is expired
   */
  isExpired(lock: RateLock): boolean {
    return Date.now() > lock.expiresAt;
  }

  /**
   * Get remaining time for a lock (in seconds)
   */
  getRemainingTime(lockId: string): number {
    const lock = this.getLock(lockId);
    if (!lock) {
      return 0;
    }

    const remaining = Math.max(0, lock.expiresAt - Date.now());
    return Math.floor(remaining / 1000);
  }

  /**
   * Extend a lock (if not expired)
   */
  extendLock(lockId: string, additionalSeconds: number): RateLock | null {
    const lock = this.getLock(lockId);
    if (!lock) {
      return null;
    }

    const newDuration = this.getRemainingTime(lockId) + additionalSeconds;
    if (newDuration > this.MAX_DURATION) {
      throw new Error(`Cannot extend lock beyond ${this.MAX_DURATION} seconds`);
    }

    lock.expiresAt = Date.now() + (newDuration * 1000);
    lock.durationSeconds = newDuration;

    return lock;
  }

  /**
   * Release a lock manually
   */
  releaseLock(lockId: string): boolean {
    return this.locks.delete(lockId);
  }

  /**
   * Get all active locks
   */
  getActiveLocks(): RateLock[] {
    const now = Date.now();
    return Array.from(this.locks.values()).filter(lock => lock.expiresAt > now);
  }

  /**
   * Clear all expired locks
   */
  clearExpiredLocks(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [id, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Generate a unique lock ID
   */
  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const rateLockManager = new RateLockManager();
