import { ConversionService } from '../conversion.service';
import { Pool } from 'pg';

jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('../ton-blockchain.service', () => {
  return {
    TonBlockchainService: jest.fn().mockImplementation(() => {
      return {
        initializeWallet: jest.fn(),
        getTransactionState: jest.fn(),
      };
    }),
  };
});

describe('ConversionService', () => {
  let pool: Pool;
  let conversionService: ConversionService;

  beforeEach(() => {
    pool = new Pool();
    conversionService = new ConversionService(pool);
  });

  it('should be defined', () => {
    expect(conversionService).toBeDefined();
  });

  describe('pollConversionStatus', () => {
    it('should update status to completed when transaction is confirmed', async () => {
      jest.useFakeTimers();
      const tonService = (conversionService as any).tonService;
      tonService.getTransactionState.mockResolvedValue({
        status: 'confirmed',
        confirmations: 10,
        transaction: { hash: 'some-hash' },
      });
      const poolQuery = (pool as any).query;
      poolQuery.mockResolvedValue({ rows: [{ id: 'fee-id' }] });

      (conversionService as any).pollConversionStatus('conv-id', 'tx-hash');

      jest.runAllTimers();

      await Promise.resolve(); // allow promises to resolve

      expect(tonService.getTransactionState).toHaveBeenCalledWith('tx-hash');
      expect(poolQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE conversions'), ['completed', undefined, 'conv-id']);
      jest.useRealTimers();
    });
  });
});
