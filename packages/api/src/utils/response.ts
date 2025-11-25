import { Response } from 'express';
import { v4 as uuid } from 'uuid';

export function newRequestId() {
  return uuid();
}

export function sendSuccess(res: Response, data: Record<string, any> = {}, status = 200, requestId?: string) {
  const id = requestId || newRequestId();
  return res.status(status).json(Object.assign({ success: true, requestId: id }, data));
}

export function sendCreated(res: Response, data: Record<string, any> = {}, requestId?: string) {
  return sendSuccess(res, data, 201, requestId);
}

export function sendBadRequest(res: Response, code: string, message: string, requestId?: string) {
  const id = requestId || newRequestId();
  return res.status(400).json({ success: false, error: { code, message }, requestId: id });
}

export function sendError(res: Response, code: string, message: string, status = 500, requestId?: string) {
  const id = requestId || newRequestId();
  return res.status(status).json({ success: false, error: { code, message }, requestId: id });
}

const defaultExport = { newRequestId, sendSuccess, sendCreated, sendBadRequest, sendError };
export default defaultExport;

// Backwards-compat aliases (some controllers use older names)
// These are deprecated — they forward to the new helpers and emit a
// console warning so callers can be migrated gradually.
function emitAliasWarning(oldName: string, newName: string) {
  // Use console.warn so the message is visible in most runtimes.
  // Don't spam logs: include a hint for search/grep so teams can find callsites.
  console.warn(
    `[DEPRECATION] ${oldName} is deprecated. Use ${newName} instead. ` +
      `Search for "${oldName}("")" to find callers to migrate.`
  );
}

export const respondSuccess = (res: Response, data: Record<string, any> = {}, status = 200, requestId?: string) => {
  emitAliasWarning('respondSuccess', 'sendSuccess');
  return sendSuccess(res, data, status, requestId);
};

export const respondError = (res: Response, code: string, message: string, status = 500, requestId?: string) => {
  emitAliasWarning('respondError', 'sendError');
  return sendError(res, code, message, status, requestId);
};
