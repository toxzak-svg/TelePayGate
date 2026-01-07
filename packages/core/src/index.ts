/**
 * @tg-payment/core
 * Core business logic for TelePayGate
 *
 * VERSION: 2.0.0 - Direct TON Integration (No Fragment API)
 * Updated: November 14, 2025
 */
/**
 * @tg-payment/core
 * Core business logic for TelePayGate
 *
 * VERSION: 2.0.0 - Direct TON Integration (No Fragment API)
 * Updated: November 14, 2025
 */

// ============================================
// SERVICES (Updated - No Fragment)
// ============================================
export { TelegramService } from "./services/Telegram.service";
export { DirectConversionService } from "./services/direct-conversion.service";
export { TonPaymentService } from "./services/ton-payment.service";
export { TonBlockchainService } from "./services/ton-blockchain.service";
export { FeeService } from "./services/fee.service";
export { FeeCollectionService } from "./services/fee-collection.service";
export { RateAggregatorService } from "./services/rate.aggregator";
export { PaymentService } from "./services/payment.service";
export { WebhookService } from "./services/webhook.service";
export { RiskEngineService } from "./services/risk-engine.service";
export { ReconciliationService } from "./services/reconciliation.service";
export { WithdrawalService } from "./services/withdrawal.service";
export { StarsP2PService } from "./services/stars-p2p.service";
export { FragmentService } from "./services/fragment.service";
export { NitroSwapsService } from "./services/nitroswaps.service";
export { AuthService } from "./services/auth.service";
export {
  AdminAnalyticsService,
  DashboardStats,
  DailyMetric,
} from "./services/admin-analytics.service";
export { StarsOrderModel } from "./models/stars-order.model";
export * from "./services/wallet-manager.service";
export * from "./services/webhook.service";
export * from "./services/p2p-liquidity.service";
export * from "./services/dex-aggregator.service";

// ============================================
// MODELS
// ============================================
export { PaymentModel, Payment, PaymentStatus } from "./models/payment.model";

export {
  ConversionModel,
  Conversion as ConversionRecord,
  ConversionStatus,
  Currency,
  ConversionFees,
} from "./models/conversion.model";

export {
  SettlementModel,
  Settlement,
  SettlementStatus,
  FiatCurrency,
  SettlementRecipient,
} from "./models/settlement.model";

// ============================================
// UTILITIES
// ============================================
export {
  RateLock,
  RateLockManager,
  rateLockManager,
} from "./utils/rate-locking";

export {
  ConversionState,
  StateTransition,
  ConversionStateMachine,
} from "./utils/state-machine";

export {
  ErrorCode,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  ConversionError,
  ErrorHandler,
} from "./utils/error-handler";

export {
  validateEnvironment,
  validateEnvironmentOrExit,
  getEnvironmentSummary,
  EnvValidationResult,
} from "./utils/env-validation";

// ============================================
// DATABASE
// ============================================
export {
  Database,
  initDatabase,
  getDatabase,
  closeDatabase,
} from "./db/connection";

// ============================================
// CONFIGURATION
// ============================================
export { config } from "./config/index";

// ============================================
// SERVER
// ============================================
export { ServerBase } from "./server";

// ============================================
// VERSION INFO
// ============================================
export const VERSION = "0.1.2";
export const API_VERSION = "v1";
export const INTEGRATION_METHOD = "DIRECT_TON"; // No Fragment

// Note: Removed console.log side effects for cleaner npm package
// Use initializeKmsProvider() to set up AWS KMS if needed

// If an AWS KMS key is configured, wire the AWS provider into KMS abstraction.
try {
  // lazy require to avoid pulling AWS SDK unless needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setKmsProvider } = require("./services/kms.service");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const createAws = require("./services/kms.aws").createAwsKmsProvider;
  if (process.env.AWS_KMS_KEY_ID) {
    try {
      const provider = createAws();
      setKmsProvider(provider);
      console.log("🔐 KMS: AWS KMS provider configured");
    } catch (err) {
      console.warn(
        "🔐 KMS: failed to configure AWS provider:",
        err && err.message ? err.message : err,
      );
    }
  }
} catch (e) {
  // ignore if optional dependency not available
}
