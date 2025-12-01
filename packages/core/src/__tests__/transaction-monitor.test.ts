import { TransactionMonitorService } from "../services/transaction-monitor.service";

describe("TransactionMonitorService", () => {
  let monitor: TransactionMonitorService;
  let mockDb: any;
  let mockTonService: any;

  beforeEach(() => {
    mockDb = {
      any: jest.fn(),
      tx: jest.fn((cb) =>
        cb({
          none: jest.fn(),
          oneOrNone: jest.fn().mockResolvedValue(null),
        }),
      ),
      none: jest.fn(),
    };

    mockTonService = {
      getTransactionState: jest.fn(),
    };

    monitor = new TransactionMonitorService(mockDb, mockTonService);
  });

  test("should process confirmed transactions", async () => {
    const conversion = {
      id: "conv-123",
      dex_tx_hash: "hash-123",
      status: "phase2_committed",
    };

    mockDb.any.mockResolvedValue([conversion]);
    mockTonService.getTransactionState.mockResolvedValue({
      status: 'confirmed',
      confirmations: 1,
      success: true,
      hash: 'hash-123',
    });

    await (monitor as any).checkPendingTransactions();

    expect(mockTonService.getTransactionState).toHaveBeenCalledWith("hash-123");
    expect(mockDb.tx).toHaveBeenCalled();
  });

  test("should handle failed transactions", async () => {
    const conversion = {
      id: "conv-456",
      dex_tx_hash: "hash-456",
      status: "phase2_committed",
    };

    mockDb.any.mockResolvedValue([conversion]);
    mockTonService.getTransactionState.mockResolvedValue({
      status: 'failed',
      confirmations: 1,
      success: false,
      exitCode: 123,
      hash: 'hash-456',
    });

    await (monitor as any).checkPendingTransactions();
      // TransactionMonitor calls getTransactionState internally
      expect(mockTonService.getTransactionState).toHaveBeenCalledWith("hash-456");
    expect(mockDb.none).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE conversions"),
      expect.arrayContaining([
        expect.stringContaining("exit code: 123"),
        "conv-456",
      ]),
    );
  });

  test('should respect confirmations threshold before marking completed', async () => {
    process.env.TON_MIN_CONFIRMATIONS = '2';

    const conversion = {
      id: 'conv-789',
      dex_tx_hash: 'hash-789',
      status: 'phase2_committed',
    };

    mockDb.any.mockResolvedValue([conversion]);
    mockTonService.getTransactionState
      .mockResolvedValueOnce({ status: 'confirmed', confirmations: 1, success: true, hash: 'hash-789' })
      .mockResolvedValueOnce({ status: 'confirmed', confirmations: 2, success: true, hash: 'hash-789' });

    // First run should not commit since confirmations < 2
    await (monitor as any).checkPendingTransactions();
    expect(mockDb.tx).not.toHaveBeenCalled();

    // Second run should now commit
    await (monitor as any).checkPendingTransactions();
    expect(mockDb.tx).toHaveBeenCalled();

    delete process.env.TON_MIN_CONFIRMATIONS;
  });
});
