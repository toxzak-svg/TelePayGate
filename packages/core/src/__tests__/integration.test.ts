import { ConversionService } from '../services/conversion.service';
import { ReconciliationService } from '../services/reconciliation.service';
import { TonBlockchainService } from '../services/ton-blockchain.service';
import { initDatabase, Database } from '../db/connection';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';



jest.mock('../services/ton-blockchain.service');

describe('Conversion and Reconciliation Integration Test', () => {
  let db: Database;
  let conversionService: ConversionService;
  let reconciliationService: ReconciliationService;
  let tonService: jest.Mocked<TonBlockchainService>;
  let conversionId: string;
  let paymentId: string;
  let userId: string;

  beforeEach(() => {
    db = initDatabase(process.env.DATABASE_URL!);
    conversionService = new ConversionService(db);
    reconciliationService = new ReconciliationService(db);
    
    // Create a mocked instance of TonBlockchainService
    tonService = new (TonBlockchainService as jest.Mock<TonBlockchainService>)() as jest.Mocked<TonBlockchainService>;
    
    // Inject the mocked service into the services under test
    (conversionService as any).tonService = tonService;
    (reconciliationService as any).tonService = tonService;

    conversionId = uuidv4();
    paymentId = uuidv4();
    userId = uuidv4();
  });

  it('should process a conversion and then reconcile it', async () => {
    // --- Mock services ---
    (conversionService as any).p2pLiquidityService = {
        findBestRoute: jest.fn().mockResolvedValue({}),
        executeConversion: jest.fn().mockResolvedValue({ success: true, txHash: 'tx-hash' })
    };
    tonService.getTransaction.mockResolvedValue({
        confirmed: true,
        amount: 1,
        success: true,
    } as any);

    // --- Mock DB ---
    const dbOneSpy = jest.spyOn(db, 'one').mockResolvedValue({ total_stars: 1000 });
    const dbNoneSpy = jest.spyOn(db, 'none').mockResolvedValue(undefined);
    const dbOneOrNoneSpy = jest.spyOn(db, 'oneOrNone').mockResolvedValue({ id: conversionId, target_amount: 1, ton_tx_hash: 'tx-hash' });

    // --- Execute ---
    await conversionService.createConversion(userId, [paymentId]);
    await reconciliationService.reconcileConversion(conversionId);

    // --- Assert ---
    expect(tonService.getTransaction).toHaveBeenCalledWith('tx-hash');
    expect(dbOneOrNoneSpy).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM conversions'), [conversionId]);
  });
});
