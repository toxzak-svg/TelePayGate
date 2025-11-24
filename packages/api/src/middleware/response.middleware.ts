import { Request, Response, NextFunction } from 'express';
import { respondSuccess, respondError, newRequestId } from '../utils/response';

declare global {
  namespace Express {
    interface Response {
      replySuccess: (data?: unknown, status?: number) => Response;
      replyError: (code: string, message: string, status?: number, meta?: unknown) => Response;
    }
  }
}

export function responseMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate a request id for tracing and attach to the request/response objects so
  // handlers and helpers can rely on a single source of truth for request IDs.
  const id = newRequestId();
  (res as any).locals = Object.assign((res as any).locals || {}, { requestId: id });
  (req as any).requestId = id;

  // Deprecated compatibility aliases. Prefer `sendSuccess`/`sendError` or `respondSuccess`/`respondError`.
  // See: `docs/process/response-helpers.md` for migration guidance.
  res.replySuccess = (data?: unknown, status = 200) => {
    // Deprecation notice (visible in server logs).
    // Intentionally not throwing — keep backwards compatibility while nudging maintainers.
    // eslint-disable-next-line no-console
    console.warn('[DEPRECATED] `res.replySuccess` is deprecated. Use `respondSuccess` (utils/response) instead. See docs/process/response-helpers.md');

    // Maintain previous payload shape: merge top-level properties and include a `data` envelope.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const payload = data as Record<string, unknown>;
      return respondSuccess(res, Object.assign({}, payload, { data: payload }), status);
    }
    return respondSuccess(res, { data }, status);
  };

  res.replyError = (code: string, message: string, status = 500, meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn('[DEPRECATED] `res.replyError` is deprecated. Use `respondError` (utils/response) instead. See docs/process/response-helpers.md');
    return respondError(res, code, message, status);
  };

  next();
}

export default responseMiddleware;
