import axios from 'axios';
import { TelePayGate } from '../client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelePayGate SDK', () => {
  let client: TelePayGate;
  let mockAxiosInstance: jest.Mocked<ReturnType<typeof axios.create>>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create client
    client = new TelePayGate({
      apiKey: 'pk_test_123456',
      apiUrl: 'https://api.telepaygate.com/v1',
    });
  });

  describe('constructor', () => {
    it('should create client with default options', () => {
      new TelePayGate({
        apiKey: 'pk_test_abc',
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000/api/v1',
          timeout: 30000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': 'pk_test_abc',
          }),
        })
      );
    });

    it('should create client with custom options', () => {
      new TelePayGate({
        apiKey: 'pk_test_xyz',
        apiSecret: 'sk_test_secret',
        apiUrl: 'https://custom.api.com',
        timeout: 60000,
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://custom.api.com',
          timeout: 60000,
          headers: expect.objectContaining({
            'X-API-Key': 'pk_test_xyz',
            Authorization: 'Bearer sk_test_secret',
          }),
        })
      );
    });
  });

  describe('estimateConversion', () => {
    it('should estimate conversion successfully', async () => {
      const mockResponse = {
        data: {
          estimatedAmount: 100.5,
          rate: 0.0201,
          fee: 2.5,
          targetCurrency: 'TON',
        },
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await client.estimateConversion({
        starsAmount: 5000,
        targetCurrency: 'TON',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/conversions/estimate', {
        sourceAmount: 5000,
        sourceCurrency: 'STARS',
        targetCurrency: 'TON',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('lockRate', () => {
    it('should lock rate successfully', async () => {
      const mockResponse = {
        data: {
          lockId: 'lock_123',
          rate: 0.0201,
          expiresAt: '2024-12-01T12:00:00Z',
        },
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await client.lockRate({
        starsAmount: 5000,
        targetCurrency: 'TON',
        durationSeconds: 600,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/conversions/lock-rate', {
        sourceAmount: 5000,
        sourceCurrency: 'STARS',
        targetCurrency: 'TON',
        durationSeconds: 600,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should use default duration when not specified', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} });

      await client.lockRate({
        starsAmount: 1000,
        targetCurrency: 'USD',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/conversions/lock-rate', {
        sourceAmount: 1000,
        sourceCurrency: 'STARS',
        targetCurrency: 'USD',
        durationSeconds: 300,
      });
    });
  });

  describe('createConversion', () => {
    it('should create conversion successfully', async () => {
      const mockResponse = {
        data: {
          conversion: {
            id: 'conv_123',
            status: 'pending',
            sourceAmount: 5000,
            targetAmount: 100.5,
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await client.createConversion({
        paymentIds: ['pay_1', 'pay_2'],
        targetCurrency: 'TON',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/conversions/create', {
        paymentIds: ['pay_1', 'pay_2'],
        targetCurrency: 'TON',
        rateLockId: undefined,
      });
      expect(result).toEqual(mockResponse.data.conversion);
    });

    it('should create conversion with rate lock', async () => {
      const mockResponse = {
        data: {
          conversion: { id: 'conv_456' },
        },
      };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await client.createConversion({
        paymentIds: ['pay_1'],
        targetCurrency: 'TON',
        rateLockId: 'lock_789',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/conversions/create', {
        paymentIds: ['pay_1'],
        targetCurrency: 'TON',
        rateLockId: 'lock_789',
      });
    });
  });

  describe('getConversionStatus', () => {
    it('should get conversion status', async () => {
      const mockResponse = {
        data: {
          status: 'completed',
          completedAt: '2024-12-01T12:00:00Z',
        },
      };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await client.getConversionStatus('conv_123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/conversions/conv_123/status');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listConversions', () => {
    it('should list conversions with default pagination', async () => {
      const mockResponse = {
        data: {
          conversions: [{ id: 'conv_1' }, { id: 'conv_2' }],
          total: 2,
          page: 1,
        },
      };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await client.listConversions();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/conversions', {
        params: { page: 1, limit: 20, status: undefined },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should list conversions with custom options', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { conversions: [] } });

      await client.listConversions({
        page: 2,
        limit: 50,
        status: 'completed',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/conversions', {
        params: { page: 2, limit: 50, status: 'completed' },
      });
    });
  });

  describe('getPayment', () => {
    it('should get payment by ID', async () => {
      const mockPayment = {
        id: 'pay_123',
        amount: 1000,
        currency: 'STARS',
        status: 'completed',
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { payment: mockPayment } });

      const result = await client.getPayment('pay_123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/payments/pay_123');
      expect(result).toEqual(mockPayment);
    });
  });

  describe('listPayments', () => {
    it('should list payments with default pagination', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { payments: [], total: 0, page: 1 },
      });

      await client.listPayments();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/payments', {
        params: { page: 1, limit: 20, status: undefined },
      });
    });
  });

  describe('getPaymentStats', () => {
    it('should get payment statistics', async () => {
      const mockStats = {
        totalPayments: 1000,
        totalAmount: 500000,
        successRate: 98.5,
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { stats: mockStats } });

      const result = await client.getPaymentStats();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/payments/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getProfile', () => {
    it('should get user profile', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        apiKey: 'pk_test_123',
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { user: mockUser } });

      const result = await client.getProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('regenerateApiKeys', () => {
    it('should regenerate API keys', async () => {
      const mockKeys = {
        apiKey: 'pk_new_123',
        apiSecret: 'sk_new_456',
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockKeys });

      const result = await client.regenerateApiKeys();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users/api-keys/regenerate');
      expect(result).toEqual(mockKeys);
    });
  });

  describe('getExchangeRates', () => {
    it('should get exchange rates', async () => {
      const mockRates = {
        STARS_TON: 0.0201,
        STARS_USDT: 0.01,
        TON_USDT: 5.5,
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { rates: mockRates } });

      const result = await client.getExchangeRates();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/rates/current');
      expect(result).toEqual(mockRates);
    });
  });
});
