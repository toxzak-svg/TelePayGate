import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import type { AuthenticatedRequest } from './auth.middleware';

export function requestIdMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || uuid();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
