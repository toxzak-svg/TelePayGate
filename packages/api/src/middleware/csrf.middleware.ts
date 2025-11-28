import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@tg-payment/core';

// Simple CSRF middleware: for session-authenticated requests, require X-CSRF-Token header
// Must be used after cookie-parser and authenticate (optionalAuth) so session id is available
export default async function csrfProtect(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  // Only enforce on state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  // If API key used, skip CSRF (API keys are not subject to browser CSRF)
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) return next();

  try {
    const sessionToken = req.cookies?.session_id as string | undefined;
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: { code: 'NO_SESSION', message: 'No session provided' } });
    }
    const db = getDatabase();
    const session = await db.oneOrNone('SELECT meta FROM sessions WHERE session_token = $1', [sessionToken]);
    if (!session) return res.status(401).json({ success: false, error: { code: 'INVALID_SESSION', message: 'Session not found' } });
    const meta = session.meta || {};
    const csrfExpected = meta.csrf_token || req.cookies?.csrf_token;
    const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
    if (!csrfHeader || !csrfExpected || csrfHeader !== csrfExpected) {
      return res.status(403).json({ success: false, error: { code: 'CSRF_FAILED', message: 'Invalid CSRF token' } });
    }
    return next();
  } catch (err) {
    console.error('CSRF middleware error', err);
    return res.status(500).json({ success: false, error: { code: 'CSRF_ERROR', message: 'CSRF verification failed' } });
  }
}
