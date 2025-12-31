import { v4 as uuidv4 } from "uuid";
import { ConversionService } from "../services/conversion.service";
import { initDatabase, Database } from "../db/connection";

jest.mock("../services/ton-blockchain.service", () => {
  return {
    TonBlockchainService: jest.fn().mockImplementation(() => {
      return {
        initializeWallet: jest.fn(),
        getTransaction: jest.fn(),
        getTransactionState: jest.fn(),
        getClient: jest.fn().mockReturnValue({}),
      };
    }),
  };
});

describe("ConversionService", () => {
  let db: Database;
  let conversionService: ConversionService;
  let conversionId: string;

  beforeEach(() => {
    db = initDatabase(process.env.DATABASE_URL || "postgres://localhost:5432/test");
    conversionService = new ConversionService(db);
    conversionId = uuidv4();
  });

  it("should be defined", () => {
    expect(conversionService).toBeDefined();
  });

  describe("pollConversionStatus", () => {
    it("should update status to completed when transaction is confirmed", async () => {
      jest.useFakeTimers();
      const tonService = (conversionService as any).tonService;
      tonService.getTransactionState.mockResolvedValue({
        status: 'confirmed',
        confirmations: 1,
        hash: 'some-hash',
      });
      const dbNoneSpy = jest.spyOn(db, "none").mockResolvedValue(undefined);
      jest.spyOn(db, "oneOrNone").mockResolvedValue({ id: "fee-id" });

      const pollPromise = (conversionService as any).pollConversionStatus(
        conversionId,
        "tx-hash",
      );

      // Advance timers to trigger the interval
      await jest.advanceTimersByTimeAsync(5000);

      // Wait for the polling to complete
      await pollPromise;

      expect(tonService.getTransactionState).toHaveBeenCalledWith("tx-hash", 1);
      expect(dbNoneSpy).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE conversions"),
        expect.arrayContaining([conversionId, "completed"]),
      );
      jest.useRealTimers();
    });

    it('should respect confirmations threshold before marking completed', async () => {
      jest.useFakeTimers();
      process.env.TON_MIN_CONFIRMATIONS = '2';

      const {tonService} = conversionService as any;

      // First poll returns confirmations=1 (below threshold), second poll confirms
      tonService.getTransactionState
        .mockResolvedValueOnce({ status: 'confirmed', confirmations: 1, hash: 'tx-1' })
        .mockResolvedValueOnce({ status: 'confirmed', confirmations: 2, hash: 'tx-1' });

      const dbNoneSpy = jest.spyOn(db, 'none').mockResolvedValue(undefined);
      jest.spyOn(db, 'oneOrNone').mockResolvedValue({ id: 'fee-id' });

      const pollPromise = (conversionService as any).pollConversionStatus(
        conversionId,
        'tx-1',
      );

      // Advance time once -> first poll (confirmations 1) should not resolve
      await jest.advanceTimersByTimeAsync(5000);
      expect(tonService.getTransactionState).toHaveBeenCalledTimes(1);

      // Advance time again -> second poll meets threshold and completes
      await jest.advanceTimersByTimeAsync(5000);
      await pollPromise;

      expect(tonService.getTransactionState).toHaveBeenCalledWith('tx-1', 2);
      expect(dbNoneSpy).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversions'),
        expect.arrayContaining([expect.any(String), expect.anything(), conversionId]),
      );

      delete process.env.TON_MIN_CONFIRMATIONS;
      jest.useRealTimers();
    });
  });
});
