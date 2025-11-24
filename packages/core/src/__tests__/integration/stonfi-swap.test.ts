import { setupDexIntegrationTest } from '../../test-utils';
import { DexAggregatorService } from '../../services/dex-aggregator.service';

const { dexService: _dexService, runDexIntegrationTests } = setupDexIntegrationTest();
const describeIfEnabled = runDexIntegrationTests ? describe : describe.skip;

describeIfEnabled('Ston.fi Swap Integration Tests', () => {
  // use the shared test util's instance
  const dexService = _dexService;

  describe('Rate Fetching', () => {
    it('should fetch rates with Ston.fi included', async () => {
      const quote = await dexService.getBestRate('TON', 'USDT', 1);

      expect(quote).toBeDefined();
      expect(quote.inputAmount).toBe(1);
      expect(quote.outputAmount).toBeGreaterThan(0);
      expect(quote.route).toBeDefined();
    });
  });

  describe('Small Swaps', () => {
    it.skip('should swap 0.1 TON to USDT via Ston.fi', async () => {
      // MANUAL TEST ONLY
      const result = await dexService.executeSwap(
        'stonfi',
        '', // Router doesn't use poolId directly
        'TON',
        'USDT',
        0.1,
        0.09
      );

      expect(result.txHash).toBeDefined();
      expect(result.outputAmount).toBeGreaterThanOrEqual(0.09);
    }, 120000);

    it('should handle slippage on Ston.fi', async () => {
      const service = new DexAggregatorService();
      (service as any).simulateSwap = jest.fn().mockRejectedValue(new Error('SLIPPAGE_EXCEEDED'));
      await expect(
        service.executeSwap(
          'stonfi',
          '',
          'TON',
          'USDT',
          0.1,
          999
        )
      ).rejects.toThrow('SLIPPAGE_EXCEEDED');
    });
  });

  describe('Multi-hop Swaps', () => {
    it('should find route for token pairs', async () => {
      const quote = await dexService.getBestRate('TON', 'USDT', 1);
      
      expect(quote.route).toBeDefined();
      expect(quote.route.length).toBeGreaterThanOrEqual(2);
    });
  });
});
