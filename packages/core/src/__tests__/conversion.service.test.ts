import { v4 as uuidv4 } from 'uuid';
import { ConversionService } from '../services/conversion.service';
import { initDatabase, Database } from '../db/connection';
import { Pool } from 'pg';



jest.mock('../services/ton-blockchain.service', () => {
  return {
    TonBlockchainService: jest.fn().mockImplementation(() => {
      return {
        initializeWallet: jest.fn(),
        getTransaction: jest.fn(),
        getClient: jest.fn().mockReturnValue({}),
      };
    }),
  };
});

describe('ConversionService', () => {
  let db: Database;
  let conversionService: ConversionService;
  let conversionId: string;

  beforeEach(() => {
    db = initDatabase(process.env.DATABASE_URL!);
    conversionService = new ConversionService(db);
    conversionId = uuidv4();
  });

  it('should be defined', () => {
    expect(conversionService).toBeDefined();
  });

  describe('pollConversionStatus', () => {
    it('should update status to completed when transaction is confirmed', async () => {
      jest.useFakeTimers();
      const tonService = (conversionService as any).tonService;
      tonService.getTransaction.mockResolvedValue({
        confirmed: true,
        success: true,
        transaction: { hash: 'some-hash' },
      });
      const dbNoneSpy = jest.spyOn(db, 'none').mockResolvedValue(undefined);
      jest.spyOn(db, 'oneOrNone').mockResolvedValue({ id: 'fee-id' });

      const pollPromise = (conversionService as any).pollConversionStatus(conversionId, 'tx-hash');

      // Advance timers to trigger the interval
      await jest.advanceTimersByTimeAsync(5000);

      // Wait for the polling to complete
      await pollPromise;

      expect(tonService.getTransaction).toHaveBeenCalledWith('tx-hash');
      expect(dbNoneSpy).toHaveBeenCalledWith(expect.stringContaining('UPDATE conversions'), ['completed', undefined, conversionId]);
      jest.useRealTimers();
    });
  });
});
