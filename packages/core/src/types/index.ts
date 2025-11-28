/**
 * Core Type Definitions for Telegram Payment Gateway
 */

// User types
export interface User {
  id: string;
  apiKey: string;
  apiSecret: string;
  appName: string;
  webhookUrl?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Payment types
export interface Payment {
  id: string;
  userId: string;
  telegramPaymentId: string;
  starsAmount: number;
  status: 'pending' | 'received' | 'converting' | 'converted' | 'settled' | 'failed';
  rawPayload?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Conversion types
export interface Conversion {
  id: string;
  userId: string;
  paymentIds: string[];
  sourceCurrency: 'STARS';
  targetCurrency: 'TON' | 'USD' | 'EUR';
  sourceAmount: number;
  targetAmount?: number;
  exchangeRate?: number;
  rateLockedUntil?: number;
  status: 'pending' | 'rate_locked' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// Exchange rate types
export interface ExchangeRate {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  provider: string;
  timestamp: Date;
}

// API Request types
export interface EstimationParams {
  starsAmount: number;
  targetCurrency: string;
  lockedRate?: boolean;
}

export interface EstimationResult {
  starsAmount: number;
  tonEquivalent: number;
  estimatedFiat: number;
  exchangeRate: number;
  fees: {
    telegram: number;
    dex: number;
    exchange: number;
  };
  total: number;
}

// Telegram webhook payload
export interface TelegramSuccessfulPayment {
  telegramPaymentChargeId: string;
  providerPaymentChargeId: string;
  currency: string;
  totalAmount: number;
  invoicePayload: string;
  shippingOptionId?: string;
  orderInfo?: TelegramOrderInfo;
}

export interface TelegramOrderInfo {
  name?: string;
  phoneNumber?: string;
  email?: string;
  shippingAddress?: {
    countryCode: string;
    state: string;
    city: string;
    streetLine1: string;
    streetLine2?: string;
    postCode: string;
  };
}

export interface TelegramPreCheckoutQuery {
  id: string;
  from: { id: number; isBot: boolean; firstName: string };
  currency: string;
  totalAmount: number;
  invoicePayload: string;
  shippingOptionId?: string;
  orderInfo?: TelegramOrderInfo;
}

// Error types
export class PaymentGatewayError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}

export class ValidationError extends PaymentGatewayError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class ExternalApiError extends PaymentGatewayError {
  constructor(service: string, message: string) {
    super('EXTERNAL_API_ERROR', `${service}: ${message}`, 502);
  }
}

export class ConversionError extends PaymentGatewayError {
  constructor(message: string, details?: Record<string, any>) {
    super('CONVERSION_ERROR', message, 400, details);
  }
}

export type FeeBreakdown = {
  platform: number;
  network: number;
  telegram: number;
  total: number;
  platformPercentage: number;
};

export type PlatformConfig = {
  id: string;
  platformFeePercentage: number;
  telegramFeePercentage: number;
  networkFeePercentage: number;
  minConversionAmount: number;
  maxConversionAmount: number;
  rateLockDurationSeconds: number;
  platformTonWallet: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FeeCalculationResult = {
  paymentId: string;
  starsAmount: number;
  platformFee: number;
  telegramFee: number;
  totalFee: number;
  finalAmount: number;
  calculationId: string;
};

export type StaleConversion = {
  conversionId: string;
  userId: string;
  sourceAmount: number;
  targetAmount: number;
  status: string;
  ageHours: number;
};

export type StuckAtomicSwap = {
  payment_id?: string;
  conversion_id?: string;
  user_id: string;
  swap_id: string;
  swap_status: string;
  swap_created_at: Date;
};

export type UnverifiedDeposit = {
  deposit_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export interface ReconciliationRecord {
  id: string;
  paymentId: string;
  conversionId?: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  status: 'matched' | 'mismatch' | 'pending';
  reconciliationType: 'payment' | 'conversion' | 'settlement';
  externalReference?: string;
  notes?: string;
  reconciledAt?: Date;
  createdAt: Date;
}

export interface ReconciliationResult {
  matched: number;
  mismatched: number;
  pending: number;
  totalChecked: number;
  discrepancies: ReconciliationRecord[];
}

export type StalePayment = {
  paymentId: string;
  userId: string;
  starsAmount: number;
  status: string;
  ageHours: number;
};
