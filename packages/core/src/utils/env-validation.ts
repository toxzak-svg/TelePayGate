/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup to fail fast
 * rather than encountering cryptic errors at runtime.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface EnvVarConfig {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  pattern?: RegExp;
}

const ENV_VARS: EnvVarConfig[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    pattern: /^postgresql:\/\/.+/,
  },
  
  // Server
  {
    name: 'PORT',
    required: false,
    description: 'Server port (defaults to 3000)',
    validator: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0 && parseInt(v) < 65536,
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node environment (development, production, test)',
    validator: (v) => ['development', 'production', 'test'].includes(v),
  },
  
  // Security
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'JWT signing secret (min 32 characters)',
    validator: (v) => v.length >= 32,
  },
  {
    name: 'API_SECRET_KEY',
    required: false,
    description: 'API secret key for internal operations',
  },
  
  // Telegram
  {
    name: 'TELEGRAM_BOT_TOKEN',
    required: false,
    description: 'Telegram Bot API token',
    pattern: /^\d+:[A-Za-z0-9_-]+$/,
  },
  {
    name: 'TELEGRAM_WEBHOOK_SECRET',
    required: false,
    description: 'Telegram webhook verification secret',
  },
  
  // TON Blockchain
  {
    name: 'TON_API_URL',
    required: false,
    description: 'TON Center API URL',
    pattern: /^https?:\/\/.+/,
  },
  {
    name: 'TON_API_KEY',
    required: false,
    description: 'TON Center API key',
  },
  {
    name: 'TON_WALLET_MNEMONIC',
    required: false,
    description: 'TON wallet 24-word mnemonic',
    validator: (v) => v.trim().split(/\s+/).length >= 12,
  },
  
  // DEX Integration
  {
    name: 'DEDUST_API_URL',
    required: false,
    description: 'DeDust API URL',
    pattern: /^https?:\/\/.+/,
  },
  {
    name: 'STONFI_API_URL',
    required: false,
    description: 'Ston.fi API URL',
    pattern: /^https?:\/\/.+/,
  },
  
  // Rate Providers
  {
    name: 'COINGECKO_API_KEY',
    required: false,
    description: 'CoinGecko API key for rate fetching',
  },
  {
    name: 'COINMARKETCAP_API_KEY',
    required: false,
    description: 'CoinMarketCap API key for rate fetching',
  },
  
  // Fiat Gateway
  {
    name: 'FIAT_GATEWAY_PROVIDER',
    required: false,
    description: 'Fiat gateway provider (stub, stripe, wise)',
    validator: (v) => ['stub', 'stripe', 'wise'].includes(v.toLowerCase()),
  },
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret key (required if using Stripe gateway)',
    pattern: /^sk_(live|test)_.+/,
  },
  {
    name: 'WISE_API_KEY',
    required: false,
    description: 'Wise API key (required if using Wise gateway)',
  },
  
  // Dashboard
  {
    name: 'DASHBOARD_URL',
    required: false,
    description: 'Dashboard URL for CORS',
    pattern: /^https?:\/\/.+/,
  },
];

/**
 * Validate all environment variables
 */
export function validateEnvironment(strict: boolean = false): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    // Check required vars
    if (envVar.required && !value) {
      errors.push(`Missing required environment variable: ${envVar.name} - ${envVar.description}`);
      continue;
    }

    // Skip validation if not set and not required
    if (!value) {
      continue;
    }

    // Pattern validation
    if (envVar.pattern && !envVar.pattern.test(value)) {
      const message = `Invalid format for ${envVar.name}: does not match expected pattern`;
      if (strict) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }

    // Custom validator
    if (envVar.validator && !envVar.validator(value)) {
      const message = `Invalid value for ${envVar.name}: validation failed - ${envVar.description}`;
      if (strict) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }
  }

  // Cross-validation: if FIAT_GATEWAY_PROVIDER is stripe, STRIPE_SECRET_KEY is required
  const fiatProvider = process.env.FIAT_GATEWAY_PROVIDER?.toLowerCase();
  if (fiatProvider === 'stripe' && !process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY is required when FIAT_GATEWAY_PROVIDER is "stripe"');
  }
  if (fiatProvider === 'wise' && !process.env.WISE_API_KEY) {
    errors.push('WISE_API_KEY is required when FIAT_GATEWAY_PROVIDER is "wise"');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment and exit if invalid
 */
export function validateEnvironmentOrExit(strict: boolean = false): void {
  const result = validateEnvironment(strict);

  // Log warnings
  for (const warning of result.warnings) {
    console.warn(`⚠️  ${warning}`);
  }

  // Log and exit on errors
  if (!result.valid) {
    console.error('\n❌ Environment validation failed:\n');
    for (const error of result.errors) {
      console.error(`   • ${error}`);
    }
    console.error('\nPlease set the required environment variables and try again.\n');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log(`\n✅ Environment validated with ${result.warnings.length} warning(s)\n`);
  } else {
    console.log('✅ Environment validated successfully\n');
  }
}

/**
 * Get a summary of configured features based on environment
 */
export function getEnvironmentSummary(): Record<string, boolean> {
  return {
    database: !!process.env.DATABASE_URL,
    telegram: !!process.env.TELEGRAM_BOT_TOKEN,
    tonBlockchain: !!process.env.TON_API_URL,
    tonWallet: !!process.env.TON_WALLET_MNEMONIC,
    dedust: !!process.env.DEDUST_API_URL,
    stonfi: !!process.env.STONFI_API_URL,
    coingecko: !!process.env.COINGECKO_API_KEY,
    coinmarketcap: !!process.env.COINMARKETCAP_API_KEY,
    stripeFiat: process.env.FIAT_GATEWAY_PROVIDER?.toLowerCase() === 'stripe',
    wiseFiat: process.env.FIAT_GATEWAY_PROVIDER?.toLowerCase() === 'wise',
  };
}

export default {
  validateEnvironment,
  validateEnvironmentOrExit,
  getEnvironmentSummary,
};
