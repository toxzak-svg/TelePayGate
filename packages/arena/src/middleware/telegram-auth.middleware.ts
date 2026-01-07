import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Telegram WebApp Init Data
 *
 * Structure of data passed from Telegram WebApp
 */
interface TelegramWebAppInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  auth_date: number;
  hash: string;
  start_param?: string; // Referral code
}

/**
 * Extended Request with Telegram user context
 */
export interface AuthenticatedRequest extends Request {
  telegramUser?: {
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
    isPremium?: boolean;
    authDate: number;
  };
}

/**
 * Telegram Authentication Middleware
 *
 * Validates Telegram WebApp init data to ensure requests come from legitimate Telegram users.
 * Uses HMAC-SHA256 signature verification as per Telegram documentation.
 *
 * @see https://core.telegram.org/bots/webapps#validating-the-initdata
 */
export class TelegramAuthMiddleware {
  private botToken: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    if (!this.botToken) {
      throw new Error(
        "TELEGRAM_BOT_TOKEN is required for Telegram authentication",
      );
    }
  }

  /**
   * Middleware function to validate Telegram WebApp init data
   */
  middleware() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Get init data from header or query
        const initData =
          req.headers["x-telegram-init-data"] as string ||
          req.query.initData as string;

        if (!initData) {
          return res.status(401).json({
            success: false,
            error: {
              code: "MISSING_INIT_DATA",
              message: "Telegram init data is required",
            },
          });
        }

        // Parse and validate init data
        const parsedData = this.parseInitData(initData);
        const isValid = this.verifyInitData(initData, parsedData);

        if (!isValid) {
          console.warn(
            `❌ Invalid Telegram signature from IP: ${req.ip}`,
          );
          return res.status(401).json({
            success: false,
            error: {
              code: "INVALID_SIGNATURE",
              message: "Invalid Telegram signature",
            },
          });
        }

        // Attach user context to request
        req.telegramUser = {
          id: parsedData.user?.id || 0,
          firstName: parsedData.user?.first_name || "",
          lastName: parsedData.user?.last_name,
          username: parsedData.user?.username,
          isPremium: parsedData.user?.is_premium,
          authDate: parsedData.auth_date,
        };

        next();
      } catch (error: any) {
        console.error("Telegram auth middleware error:", error);
        return res.status(500).json({
          success: false,
          error: {
            code: "AUTH_ERROR",
            message: "Authentication failed",
          },
        });
      }
    };
  }

  /**
   * Parse URL-encoded init data into object
   */
  private parseInitData(initData: string): TelegramWebAppInitData {
    const params = new URLSearchParams(initData);
    const result: Record<string, string | number | boolean | Record<string, unknown>> = {};

    for (const [key, value] of params.entries()) {
      // Parse nested objects (user)
      if (key === "user") {
        try {
          result[key] = JSON.parse(value) as Record<string, unknown>;
        } catch {
          result[key] = value;
        }
      } else {
        // Parse numbers and booleans
        if (value === "true") {
          result[key] = true;
        } else if (value === "false") {
          result[key] = false;
        } else if (!isNaN(Number(value))) {
          result[key] = Number(value);
        } else {
          result[key] = value;
        }
      }
    }

    return result as unknown as TelegramWebAppInitData;
  }

  /**
   * Verify Telegram signature using HMAC-SHA256
   *
   * Process:
   * 1. Extract hash from data
   * 2. Sort remaining keys alphabetically
   * 3. Create key=value pairs
   * 4. Generate HMAC-SHA256 with bot token
   * 5. Compare with received hash
   */
  private verifyInitData(
    initData: string,
    parsedData: TelegramWebAppInitData,
  ): boolean {
    // Extract hash
    const receivedHash = parsedData.hash;
    if (!receivedHash) {
      return false;
    }

    // Create data check string (all keys except hash, sorted alphabetically)
    const dataCheckString = this.createDataCheckString(parsedData);

    // Generate HMAC-SHA256
    const secretKey = crypto
      .createHash("sha256")
      .update(this.botToken)
      .digest();

    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Compare hashes using constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(receivedHash, "hex"),
    );
  }

  /**
   * Create data check string from init data
   *
   * Format: key1=value1\nkey2=value2\n...
   * Keys sorted alphabetically, excluding 'hash' key
   */
  private createDataCheckString(data: TelegramWebAppInitData): string {
    const entries = Object.entries(data)
      .filter(([key]) => key !== "hash")
      .sort(([a], [b]) => a.localeCompare(b));

    const pairs = entries.map(([key, value]) => {
      return `${key}=${value}`;
    });

    return pairs.join("\n");
  }

  /**
   * Extract referral code from start_param
   */
  static extractReferralCode(initData: string): string | undefined {
    const params = new URLSearchParams(initData);
    return params.get("start_param") || undefined;
  }
}

export default TelegramAuthMiddleware;
