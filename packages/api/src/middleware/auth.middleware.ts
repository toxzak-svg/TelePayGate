import { Request, Response, NextFunction } from "express";
import { getDatabase } from "telepaygate-core";

/**
 * Authenticate API key from header
 */
async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let apiKey = req.headers["x-api-key"] as string;

    // If no API key in header, attempt to find it via session
    if (!apiKey) {
      const sessionToken = req.cookies?.session_id as string | undefined;
      if (sessionToken) {
        const db = getDatabase();
        const user = await db.oneOrNone(
          `SELECT u.api_key 
           FROM sessions s
           JOIN dashboard_users du ON s.user_id = du.id
           JOIN users u ON du.merchant_id = u.id
           WHERE s.session_token = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
          [sessionToken],
        );
        if (user) {
          apiKey = user.api_key;
        }
      }
    }

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Authentication failed: API key or valid session is required",
        },
      });
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith("pk_") || apiKey.length < 20) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Authentication failed: Invalid API key format",
        },
      });
      return;
    }

    // SECURITY FIX: Removed test mode bypass that accepted ANY pk_test_* key without validation
    // Test mode bypass was a critical security vulnerability that allowed unauthorized access
    // All API keys must now be validated against the database regardless of environment
    // For testing, use properly seeded test API keys in the database
    
    const db = getDatabase();

    // Look up user by API key
    const user = await db.oneOrNone(
      "SELECT id, api_key, is_active FROM users WHERE api_key = $1",
      [apiKey],
    );

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Authentication failed: Invalid API key",
        },
      });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Authentication failed: Account is inactive",
        },
      });
      return;
    }

    // Attach user ID to request headers for downstream use
    req.headers["x-user-id"] = user.id;

    next();
  } catch (error: unknown) {
    console.error("❌ Authentication error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Authentication failed: Internal server error",
      },
    });
  }
}

/**
 * Optional authentication (doesn't fail if no API key)
 */
async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    // Attempt session cookie auth for dashboard users
    try {
      const sessionToken = req.cookies?.session_id as string | undefined;
      if (sessionToken) {
        const db = getDatabase();
        const session = await db.oneOrNone(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionToken],
        );
        if (
          session &&
          !session.revoked_at &&
          new Date(session.expires_at) > new Date()
        ) {
          // attach dashboard user id to headers
          req.headers["x-dashboard-user-id"] = session.user_id;
        }
      }
    } catch (e) {
      // ignore session lookup errors and continue as unauthenticated
    }
    next();
    return;
  }

  // If API key is provided, validate it
  await authenticateApiKey(req, res, next);
}

export default authenticateApiKey;
export { optionalAuth, authenticateApiKey as authenticate };
