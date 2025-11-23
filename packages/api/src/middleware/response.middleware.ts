import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Response {
      replySuccess: (data?: unknown, status?: number) => Response;
      replyError: (code: string, message: string, status?: number, meta?: unknown) => Response;
    }
  }
}

export function responseMiddleware(req: Request, res: Response, next: NextFunction) {
  res.replySuccess = (data?: unknown, status = 200) => {
    // Maintain legacy shape used by `respondSuccess`: merge payload at root
    // while also providing a `data` envelope for newer callers/tests.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const payload = data as Record<string, unknown>;
      return res.status(status).json(Object.assign({ success: true }, payload, { data: payload }));
    }
    return res.status(status).json({ success: true, data });
  };

  res.replyError = (code: string, message: string, status = 500, meta?: unknown) =>
    res.status(status).json({ success: false, error: Object.assign({ code, message }, meta || {}) });
  next();
}

export default responseMiddleware;
