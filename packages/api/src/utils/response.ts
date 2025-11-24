import { Response } from 'express';
import { v4 as uuid } from 'uuid';

export function newRequestId() {
  return uuid();
}

export function sendSuccess(res: Response, data: Record<string, any> = {}, status = 200, requestId?: string) {
  const id = requestId || (res as any)?.locals?.requestId || newRequestId();
  return res.status(status).json(Object.assign({ success: true, requestId: id }, data));
}

export function sendCreated(res: Response, data: Record<string, any> = {}, requestId?: string) {
  return sendSuccess(res, data, 201, requestId);
}

export function sendBadRequest(res: Response, code: string, message: string, requestId?: string) {
  const id = requestId || (res as any)?.locals?.requestId || newRequestId();
  return res.status(400).json({ success: false, error: { code, message }, requestId: id });
}

export function sendError(res: Response, code: string, message: string, status = 500, requestId?: string) {
  const id = requestId || (res as any)?.locals?.requestId || newRequestId();
  return res.status(status).json({ success: false, error: { code, message }, requestId: id });
}

const defaultExport = { newRequestId, sendSuccess, sendCreated, sendBadRequest, sendError };
export default defaultExport;

// Backwards-compat aliases (some controllers use older names)
export const respondSuccess = sendSuccess;
export const respondError = sendError;
