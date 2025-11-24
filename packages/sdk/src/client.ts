import axios, { AxiosInstance, AxiosError } from "axios";
import {
  PaymentGatewayConfig,
  EstimationParams,
  EstimationResult,
  ConversionParams,
  Conversion,
  ConversionStatus,
  Payment,
  PaymentStats,
  RateLockParams,
  RateLock,
  ExchangeRates,
  UserProfile,
  APIError,
} from "./types";

export class TelegramPaymentGateway {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret?: string;

  constructor(config: PaymentGatewayConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;

    this.client = axios.create({
      baseURL: config.apiUrl || "http://localhost:3000/api/v1",
      timeout: config.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
        ...(this.apiSecret && { Authorization: `Bearer ${this.apiSecret}` }),
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        throw this.handleError(error);
      },
    );
  }

  // ==================== CONVERSION METHODS ====================

  /**
   * Estimate conversion from Stars to target currency
   * @example
   * ```
   * const estimate = await gateway.estimateConversion({
   *   starsAmount: 5000,
   *   targetCurrency: 'TON',
   *   lockedRate: true
   * });
   * ```
   */
  async estimateConversion(
    params: EstimationParams,
  ): Promise<EstimationResult> {
    const response = await this.client.post("/conversions/estimate", {
      sourceAmount: params.starsAmount,
      sourceCurrency: "STARS",
      targetCurrency: params.targetCurrency,
    });

    return response.data;
  }

  /**
   * Lock conversion rate for a specified duration
   * @example
   * ```
   * const rateLock = await gateway.lockRate({
   *   starsAmount: 5000,
   *   targetCurrency: 'TON',
   *   durationSeconds: 300 // 5 minutes
   * });
   * ```
   */
  async lockRate(params: RateLockParams): Promise<RateLock> {
    const response = await this.client.post("/conversions/lock-rate", {
      sourceAmount: params.starsAmount,
      sourceCurrency: "STARS",
      targetCurrency: params.targetCurrency,
      durationSeconds: params.durationSeconds || 300,
    });

    return response.data;
  }

  /**
   * Create a new conversion
   * @example
   * ```
   * const conversion = await gateway.createConversion({
   *   paymentIds: ['payment-uuid-1', 'payment-uuid-2'],
   *   targetCurrency: 'TON',
   *   rateLockId: 'lock-uuid' // optional
   * });
   * ```
   */
  async createConversion(params: ConversionParams): Promise<Conversion> {
    const response = await this.client.post("/conversions/create", {
      paymentIds: params.paymentIds,
      targetCurrency: params.targetCurrency,
      rateLockId: params.rateLockId,
    });

    return response.data.conversion;
  }

  /**
   * Get conversion status
   */
  async getConversionStatus(conversionId: string): Promise<ConversionStatus> {
    const response = await this.client.get(
      `/conversions/${conversionId}/status`,
    );
    return response.data;
  }

  /**
   * List conversions with pagination
   */
  async listConversions(options?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ conversions: Conversion[]; total: number; page: number }> {
    const response = await this.client.get("/conversions", {
      params: {
        page: options?.page || 1,
        limit: options?.limit || 20,
        status: options?.status,
      },
    });

    return response.data;
  }

  // ==================== PAYMENT METHODS ====================

  /**
   * Get payment details by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const response = await this.client.get(`/payments/${paymentId}`);
    return response.data.payment;
  }

  /**
   * List payments with pagination
   */
  async listPayments(options?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ payments: Payment[]; total: number; page: number }> {
    const response = await this.client.get("/payments", {
      params: {
        page: options?.page || 1,
        limit: options?.limit || 20,
        status: options?.status,
      },
    });

    return response.data;
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<PaymentStats> {
    const response = await this.client.get("/payments/stats");
    return response.data.stats;
  }

  // ==================== USER METHODS ====================

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await this.client.get("/users/me");
    return response.data.user;
  }

  /**
   * Regenerate API keys
   */
  async regenerateApiKeys(): Promise<{ apiKey: string; apiSecret: string }> {
    const response = await this.client.post("/users/api-keys/regenerate");
    return response.data;
  }

  // ==================== RATES METHODS ====================

  /**
   * Get current exchange rates
   */
  async getExchangeRates(): Promise<ExchangeRates> {
    const response = await this.client.get("/rates/current");
    return response.data.rates;
  }

  // ==================== ERROR HANDLING ====================

  private handleError(error: AxiosError): APIError {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as any;
      return {
        message: data.error || data.message || "API request failed",
        code: data.code || "UNKNOWN_ERROR",
        status: error.response.status,
        details: data.details,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: "No response from server",
        code: "NETWORK_ERROR",
        status: 0,
      };
    } else {
      // Error setting up request
      return {
        message: error.message || "Request setup failed",
        code: "REQUEST_ERROR",
        status: 0,
      };
    }
  }
}

export default TelegramPaymentGateway;
