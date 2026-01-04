import { Request, Response } from "express";
import { AppError, ErrorHandler } from "telepaygate-core";

export function errorHandler(error: Error, req: Request, res: Response): void {
  // Log error
  ErrorHandler.logError(error);

  // Get request ID safely
  const requestId = req.headers?.["x-request-id"] as string | undefined;

  // Handle AppError from core
  if (error instanceof AppError) {
    const errorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      requestId,
      timestamp: new Date().toISOString(),
    };

    const responseJson = JSON.stringify(errorResponse);
    if (typeof (res as any).setHeader === 'function') {
      (res as any).setHeader('Content-Type', 'application/json');
    }
    if (typeof (res as any).writeHead === 'function') {
      (res as any).writeHead(error.statusCode);
    }
    if (typeof (res as any).end === 'function') {
      (res as any).end(responseJson);
    }
    return;
  }

  // Handle unknown errors
  const statusCode = ErrorHandler.getStatusCode(error);
  const errorResponse = ErrorHandler.formatError(error);
  const responseJson = JSON.stringify({
    ...errorResponse,
    requestId,
    timestamp: new Date().toISOString(),
  });

  if (typeof (res as any).setHeader === 'function') {
    (res as any).setHeader('Content-Type', 'application/json');
  }
  if (typeof (res as any).writeHead === 'function') {
    (res as any).writeHead(statusCode);
  }
  if (typeof (res as any).end === 'function') {
    (res as any).end(responseJson);
  }
}
