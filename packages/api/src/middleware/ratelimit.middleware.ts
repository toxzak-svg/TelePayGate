import rateLimit from 'express-rate-limit';

/**
 * Create configurable rate limiter
 */
export default function createRateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
}) {
  const { windowMs = 60000, maxRequests = 60 } = options || {};

  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// Default global rate limiter
export const globalLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 60
});
