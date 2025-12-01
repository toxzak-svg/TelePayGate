import { Request, Response } from "express";

/**
 * Shared controller helper utilities to reduce code duplication
 */

/**
 * Parse pagination parameters from request query
 * @param req Express request
 * @param defaults Optional default values for page, limit
 * @returns Pagination parameters { page, limit, offset }
 */
export function parsePagination(
  req: Request,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): { page: number; limit: number; offset: number } {
  const {
    page: defaultPage = 1,
    limit: defaultLimit = 20,
    maxLimit = 100,
  } = defaults;

  const page = Math.max(1, parseInt(req.query.page as string) || defaultPage);
  const limit = Math.min(
    Math.max(1, parseInt(req.query.limit as string) || defaultLimit),
    maxLimit,
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Get user ID from request headers with optional validation
 * @param req Express request
 * @returns User ID string or null if not present
 */
export function getUserIdFromRequest(req: Request): string | null {
  const userId = req.headers["x-user-id"];
  if (typeof userId === "string" && userId.trim()) {
    return userId.trim();
  }
  return null;
}

/**
 * Validate user ID is present and return error response if missing
 * @param req Express request
 * @param res Express response
 * @param options Configuration for error response
 * @returns User ID string or null (and sends error response)
 */
export function requireUserId(
  req: Request,
  res: Response,
  options: {
    errorCode?: string;
    errorMessage?: string;
    statusCode?: number;
  } = {},
): string | null {
  const {
    errorCode = "MISSING_USER_ID",
    errorMessage = "X-User-Id header is required",
    statusCode = 400,
  } = options;

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message: errorMessage },
    });
    return null;
  }
  return userId;
}

/**
 * Build pagination metadata for response
 * @param total Total number of items
 * @param page Current page
 * @param limit Items per page
 * @returns Pagination metadata object
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): {
  page: number;
  limit: number;
  total: number;
  pages: number;
  totalPages: number;
} {
  const pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    pages,
    totalPages: pages, // Alias for backward compatibility
  };
}

/**
 * Extract error message from unknown error
 * @param error Unknown error object
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Wrap async controller handler with consistent error handling
 * @param handler Async handler function
 * @param options Error handling options
 * @returns Wrapped handler
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  options: {
    onError?: (error: unknown) => void;
    logError?: boolean;
  } = {},
): Promise<T> {
  const { onError, logError = true } = options;

  return handler().catch((error) => {
    if (logError) {
      console.error("Controller error:", error);
    }
    if (onError) {
      onError(error);
    }
    throw error;
  });
}
