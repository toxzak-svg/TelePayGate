import { RateAggregatorService } from '../rate.aggregator.ts';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RateAggregatorService', () => {
  let rateAggregatorService: RateAggregatorService;
  let redis: Redis;

  beforeEach(() => {
    rateAggregatorService = new RateAggregatorService();
    redis = new Redis();
  });

  it('should be defined', () => {
    expect(rateAggregatorService).toBeDefined();
  });

  describe('getRateWithCache', () => {
    it('should return cached rate if available', async () => {
      (redis.get as jest.Mock).mockResolvedValue('123.45');
      const rate = await rateAggregatorService.getRateWithCache('TON', 'USD');
      expect(rate).toBe(123.45);
      expect(redis.get).toHaveBeenCalledWith('rate:TON:USD');
    });

    it('should fetch and cache rate if not available', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      const getAggregatedRate = jest.spyOn(rateAggregatorService as any, 'getAggregatedRate').mockResolvedValue({ averageRate: 200.5 });
      
      const rate = await rateAggregatorService.getRateWithCache('TON', 'USD');
      
      expect(rate).toBe(200.5);
      expect(getAggregatedRate).toHaveBeenCalledWith('TON', 'USD');
      expect(redis.set).toHaveBeenCalledWith('rate:TON:USD', 200.5, 'EX', 60);
    });
  });
});
