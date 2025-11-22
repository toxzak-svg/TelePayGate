import { ConversionService } from '../src/services/conversion.service';
import { ReconciliationService } from '../src/services/reconciliation.service';
import { TonBlockchainService } from '../src/services/ton-blockchain.service';
import { Pool } from 'pg';

jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn().mockReturnThis(),
    query: jest.fn(),
    release: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('../src/services/ton-blockchain.service', () => {
  return {
    TonBlockchainService: jest.fn().mockImplementation(() => {
      return {
        initializeWallet: jest.fn(),
        getTransactionState: jest.fn(),
      };
    }),
  };
});

describe('Conversion and Reconciliation Integration Test', () => {
  let pool: Pool;
  let conversionService: ConversionService;
  let reconciliationService: ReconciliationService;
  let tonService: TonBlockchainService;

  beforeEach(() => {
    pool = new Pool();
    conversionService = new ConversionService(pool);
    reconciliationService = new ReconciliationService(pool);
    tonService = (conversionService as any).tonService;
  });

  it('should process a conversion and then reconcile it', async () => {
    jest.useFakeTimers();
    
    // --- Conversion Part ---
    const poolQuery = (pool as any).query;
    // Mock database calls for conversion
    poolQuery.mockResolvedValueOnce({ rows: [{ total_stars: 1000 }] }); // Get total stars
    poolQuery.mockResolvedValueOnce({ rows: [{ minConversionAmount: 100 }] }); // Get config
    poolQuery.mockResolvedValueOnce({ rows: [{ id: 'conv-id', target_amount: 1, exchange_rate: 0.001, fees: { platform: 10 } }] }); // Create conversion
    poolQuery.mockResolvedValueOnce({ rows: [] }); // Update payments
    poolQuery.mockResolvedValueOnce({ rows: [] }); // Record fee
    
    (conversionService as any).p2pLiquidityService = {
        findBestRoute: jest.fn().mockResolvedValue({}),
        executeConversion: jest.fn().mockResolvedValue({ success: true, txHash: 'tx-hash' })
    };

    tonService.getTransactionState.mockResolvedValue({
      status: 'confirmed',
      confirmations: 10,
      transaction: { hash: 'tx-hash', amount: 1 },
    });
    poolQuery.mockResolvedValue({ rows: [{ id: 'fee-id' }] });


    await conversionService.createConversion('user-1', ['payment-1']);
    
    // --- Polling Part ---
    jest.runAllTimers();
    await new Promise(resolve => setImmediate(resolve));


    // --- Reconciliation Part ---
    poolQuery.mockResolvedValueOnce({ rows: [{ id: 'conv-id', target_amount: 1, ton_tx_hash: 'tx-hash' }] });
    poolQuery.mockResolvedValueOnce({ rows: [{ id: 'rec-id' }] });

    const reconciliationRecord = await reconciliationService.reconcileConversion('conv-id');

    expect(reconciliationRecord.status).toBe('matched');
    
    jest.useRealTimers();
  });
});
