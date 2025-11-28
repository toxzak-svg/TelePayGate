import { Request, Response } from 'express';
import { AppError, ErrorHandler } from '@tg-payment/core';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response
): void {
  // Log error
  ErrorHandler.logError(error);

  // Handle AppError from core
  if (error instanceof AppError) {
    const errorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    };

    if (typeof res.status === 'function') {
      res.status(error.statusCode).json(errorResponse);
    } else {
      // Fallback for non-Express response objects
      res.json ? res.json(errorResponse) : res.send?.(JSON.stringify(errorResponse));
    }
    return;
  }

  // Handle unknown errors
  const statusCode = ErrorHandler.getStatusCode(error);
  const errorResponse = ErrorHandler.formatError(error);

  if (typeof res.status === 'function') {
    res.status(statusCode).json({
      ...errorResponse,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    });
  } else {
    // Fallback for non-Express response objects
    res.json ? res.json({
      ...errorResponse,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    }) : res.send?.(JSON.stringify({
      ...errorResponse,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    }));
  }
}
