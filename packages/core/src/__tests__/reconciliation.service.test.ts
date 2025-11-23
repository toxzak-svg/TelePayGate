import { ReconciliationService } from '../services/reconciliation.service';
import { initDatabase, Database } from '../db/connection';



jest.mock('../services/ton-blockchain.service', () => {
  return {
    TonBlockchainService: jest.fn().mockImplementation(() => {
      return {
        initializeWallet: jest.fn(),
        getTransaction: jest.fn(),
      };
    }),
  };
});

describe('ReconciliationService', () => {
  let db: Database;
  let reconciliationService: ReconciliationService;

  beforeEach(() => {
    db = initDatabase('postgres://test:test@localhost:5432/test');
    reconciliationService = new ReconciliationService(db);
  });

  it('should be defined', () => {
    expect(reconciliationService).toBeDefined();
  });

  describe('reconcileConversion', () => {
    it('should reconcile a conversion against blockchain data', async () => {
      const tonService = (reconciliationService as any).tonService;
      tonService.getTransaction.mockResolvedValue({
        status: 'confirmed',
        transaction: { amount: 100 },
        confirmed: true,
        amount: 100,
      });
      const dbOneOrNone = jest.spyOn(db, 'oneOrNone').mockResolvedValueOnce({ id: 'conv-id', target_amount: 100, ton_tx_hash: 'tx-hash' });
      const dbQuery = jest.spyOn(db, 'one').mockResolvedValueOnce({ id: 'rec-id' });

      await reconciliationService.reconcileConversion('conv-id');

      expect(tonService.getTransaction).toHaveBeenCalledWith('tx-hash');
      expect(dbOneOrNone).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM conversions'), ['conv-id']);
      expect(dbQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO reconciliation_records'), expect.any(Array));
    });
  });
});
