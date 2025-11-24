# Project Completion Plan

**Last Updated**: November 21, 2025
**Status**: In-Progress

---

## 1. Overview

This document outlines the plan to complete the remaining features required for the Telegram Payment Gateway to be production-ready. The features were identified during a project status verification on November 21, 2025.

The following key areas will be addressed:

1.  **Blockchain Transaction Polling**: Implement robust polling for transaction confirmation on the TON blockchain.
2.  **Redis Caching**: Integrate Redis for scalable and persistent caching of exchange rates.
3.  **Reconciliation Service**: Complete the service to verify conversions against on-chain data.

---

## 2. Detailed Implementation Plan

### Task 1: Blockchain Transaction Polling (Critical)

**Objective**: Implement the `pollConversionStatus` function in `conversion.service.ts` to reliably check TON blockchain transaction status.

**Estimated Effort**: 1 Day

**Files to Modify**:

- `packages/core/src/services/conversion.service.ts`
- `packages/core/src/services/ton.service.ts` (or `ton-blockchain.service.ts`)

**Implementation Steps**:

1.  **Enhance `TonService`**:
    - In `ton.service.ts`, ensure a method `getTransactionState(txHash: string)` exists and returns a standardized state object (e.g., `{ status: 'confirmed' | 'pending' | 'failed', confirmations: number }`). This method will query the TON blockchain for the transaction details.

2.  **Implement `pollConversionStatus`**:
    - In `conversion.service.ts`, rewrite the `pollConversionStatus` function to use the new `getTransactionState` method.
    - The function should poll at a set interval (e.g., every 10 seconds) for a maximum duration (e.g., 5 minutes).
    - Handle different transaction states:
      - **Confirmed**: If the transaction has sufficient confirmations (e.g., >= 10), update the conversion status to `completed`.
      - **Failed**: If the transaction has failed, update the conversion status to `failed` and log the error.
      - **Pending**: If the transaction is still pending after the timeout, mark the conversion as `stalled` or `timeout` for manual review.

**Proposed Code for `conversion.service.ts`**:

```typescript
// packages/core/src/services/conversion.service.ts

// ... imports
import { TonService } from "./ton.service"; // Assuming this is the correct service

export class ConversionService {
  private tonService: TonService;
  // ... other services

  constructor(pool: Pool) {
    // ...
    this.tonService = new TonService(); // Initialize TON service
  }

  // ... other methods

  private async pollConversionStatus(
    conversionId: string,
    txHash: string,
  ): Promise<void> {
    const maxPolls = 30; // 5 minutes at 10s intervals
    let pollCount = 0;

    const poll = async () => {
      if (pollCount >= maxPolls) {
        await this.updateConversionStatus(
          conversionId,
          "failed",
          "Transaction polling timeout",
        );
        return;
      }

      try {
        const txState = await this.tonService.getTransactionState(txHash);

        if (txState.status === "confirmed" && txState.confirmations >= 10) {
          await this.updateConversionStatus(conversionId, "completed");
          // Additional logic for fee collection can be triggered here
        } else if (txState.status === "failed") {
          await this.updateConversionStatus(
            conversionId,
            "failed",
            "Transaction failed on-chain",
          );
        } else {
          pollCount++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        }
      } catch (error) {
        console.error(`Error polling for tx ${txHash}:`, error);
        pollCount++;
        setTimeout(poll, 10000);
      }
    };

    await poll();
  }

  private async updateConversionStatus(
    conversionId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE conversions SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
      [status, errorMessage, conversionId],
    );
  }
}
```

---

### Task 2: Redis Caching for Rate Aggregator (Important)

**Objective**: Replace the in-memory cache in `rate.aggregator.ts` with Redis to ensure scalability and data persistence across multiple service instances.

**Estimated Effort**: 1 Day

**Files to Modify**:

- `packages/core/src/services/rate.aggregator.ts`
- `package.json` (in `packages/core`)
- `docker-compose.yml` (to add a Redis service for local development)

**Implementation Steps**:

1.  **Add Redis Dependency**:
    - Add `ioredis` to `packages/core/package.json`: `npm install ioredis @types/ioredis --workspace=@tg-payment/core`

2.  **Add Redis to Docker Compose**:
    - Update `docker-compose.yml` to include a Redis service.

3.  **Create a Redis Client**:
    - Create a singleton Redis client that can be shared across services.

4.  **Update `RateAggregatorService`**:
    - Modify `getRateWithCache` to use Redis for storing and retrieving rate data.
    - Use a consistent keying strategy, e.g., `rate:${sourceCurrency}:${targetCurrency}`.

**Proposed Code for `rate.aggregator.ts`**:

```typescript
// packages/core/src/services/rate.aggregator.ts

import Redis from "ioredis";
// ... other imports

export class RateAggregatorService {
  private redis: Redis;
  // ...

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    // ...
  }

  async getRateWithCache(
    source: string,
    target: string,
    cacheDuration: number = 60, // 60 seconds
  ): Promise<number> {
    const cacheKey = `rate:${source}:${target}`;
    const cachedRate = await this.redis.get(cacheKey);

    if (cachedRate) {
      return parseFloat(cachedRate);
    }

    const rate = await this.getAggregatedRate(source, target);
    await this.redis.set(cacheKey, rate.averageRate, "EX", cacheDuration);

    return rate.averageRate;
  }
}
```

---

### Task 3: Reconciliation Service Completion (Important)

**Objective**: Implement the blockchain verification logic in `reconciliation.service.ts` to ensure conversions are accurately reconciled against on-chain data.

**Estimated Effort**: 1 Day

**Files to Modify**:

- `packages/core/src/services/reconciliation.service.ts`

**Implementation Steps**:

1.  **Inject `TonService`**:
    - Update the `ReconciliationService` to have access to the `TonService`.

2.  **Implement `reconcileConversion`**:
    - In `reconcileConversion`, use the `tonService` to fetch the transaction details using the `ton_tx_hash` from the conversion record.
    - Compare the `target_amount` from the conversion with the actual amount transferred in the on-chain transaction.
    - Account for acceptable levels of discrepancy due to gas fees or slippage.

**Proposed Code for `reconciliation.service.ts`**:

```typescript
// packages/core/src/services/reconciliation.service.ts

import { TonService } from "./ton.service";
// ... other imports

export class ReconciliationService {
  private tonService: TonService;

  constructor(private pool: Pool) {
    this.tonService = new TonService();
  }

  async reconcileConversion(
    conversionId: string,
  ): Promise<ReconciliationRecord> {
    const conversionResult = await this.pool.query(
      "SELECT * FROM conversions WHERE id = $1",
      [conversionId],
    );

    if (conversionResult.rows.length === 0) {
      throw new Error("Conversion not found");
    }

    const conversion = conversionResult.rows[0];
    const expectedAmount = conversion.target_amount;
    let actualAmount = 0;
    let status: "matched" | "mismatch" | "pending" = "pending";

    if (conversion.ton_tx_hash) {
      const txDetails = await this.tonService.getTransactionDetails(
        conversion.ton_tx_hash,
      );
      actualAmount = txDetails.amount; // Assuming the service returns this
      const difference = Math.abs(expectedAmount - actualAmount);
      status = difference < 0.01 ? "matched" : "mismatch";
    }

    // ... rest of the logic to save the reconciliation record
  }
}
```

---

## 3. Timeline and Priorities

The features should be implemented in the following order of priority:

1.  **Week 1: Blockchain Transaction Polling**
    - This is a critical blocker and must be completed first.
2.  **Week 2: Redis Caching and Reconciliation Service**
    - These can be worked on in parallel.
3.  **Week 3: Testing and Validation**
    - End-to-end testing of the new features.
    - Integration tests for the services.
    - Update project documentation, including `PROJECT_STATUS.md`.

---

## 4. Testing and Validation

- **Unit Tests**: Add unit tests for the new logic in each service.
- **Integration Tests**: Create integration tests that simulate a full conversion flow, from payment to confirmed transaction, and verify that the reconciliation service works as expected.
- **Manual Testing**: Perform manual tests in a staging environment to ensure the end-to-end flow is seamless.
