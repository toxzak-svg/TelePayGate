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

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle unknown errors
  const statusCode = ErrorHandler.getStatusCode(error);
  const errorResponse = ErrorHandler.formatError(error);

  res.status(statusCode).json({
    ...errorResponse,
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString(),
  });
}
