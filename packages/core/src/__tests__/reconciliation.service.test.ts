import { ReconciliationService } from '../reconciliation.service';
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

describe('ReconciliationService', () => {
  let pool: Pool;
  let reconciliationService: ReconciliationService;

  beforeEach(() => {
    pool = new Pool();
    reconciliationService = new ReconciliationService(pool);
  });

  it('should be defined', () => {
    expect(reconciliationService).toBeDefined();
  });

  describe('reconcileConversion', () => {
    it('should reconcile a conversion against blockchain data', async () => {
      const tonService = (reconciliationService as any).tonService;
      tonService.getTransactionState.mockResolvedValue({
        status: 'confirmed',
        transaction: { amount: 100 },
      });
      const poolQuery = (pool as any).query;
      poolQuery.mockResolvedValueOnce({ rows: [{ id: 'conv-id', target_amount: 100, ton_tx_hash: 'tx-hash' }] });
      poolQuery.mockResolvedValueOnce({ rows: [{ id: 'rec-id' }] });

      await reconciliationService.reconcileConversion('conv-id');

      expect(tonService.getTransactionState).toHaveBeenCalledWith('tx-hash');
      expect(poolQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO reconciliation_records'), expect.any(Array));
    });
  });
});
