import { config } from "dotenv";
import * as path from "path";

// CRITICAL: Load .env from project root
// In development with tsx watch or ts-node, __dirname points to packages/api/src/config
// We need to go up 4 levels: config -> src -> api -> packages -> root
const envPath = path.resolve(__dirname, "../../../../.env");
console.log("🔍 Looking for .env at:", envPath);
config({ path: envPath });

console.log("🔍 DATABASE_URL loaded:", process.env.DATABASE_URL);

export default {
  app: {
    port: parseInt(process.env.PORT || "3000", 10),
    env: process.env.NODE_ENV || "development",
    apiUrl: process.env.API_URL || "http://localhost:3000",
  },
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres@localhost:5433/payment_gateway",
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || "2", 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || "10", 10),
  },
  security: {
<<<<<<< HEAD
    apiSecretKey: process.env.API_SECRET_KEY || 'dev_secret_key_change_in_production',
    jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret',
    webhookSecret: process.env.WEBHOOK_SECRET || 'dev_webhook_secret'
  }
  ,
  rateLimit: {
    // register route specific limits (ms)
    registerWindowMs: parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS || `${60 * 60 * 1000}`, 10),
    registerMaxRequests: parseInt(process.env.REGISTER_RATE_LIMIT_MAX || '10', 10),
  },
  captcha: {
    enabled: (process.env.CAPTCHA_ENABLED || 'false') === 'true',
    provider: process.env.CAPTCHA_PROVIDER || '',
    secret: process.env.CAPTCHA_SECRET || '',
  }
=======
    apiSecretKey:
      process.env.API_SECRET_KEY || "dev_secret_key_change_in_production",
    jwtSecret: process.env.JWT_SECRET || "dev_jwt_secret",
    webhookSecret: process.env.WEBHOOK_SECRET || "dev_webhook_secret",
  },
>>>>>>> main
};
