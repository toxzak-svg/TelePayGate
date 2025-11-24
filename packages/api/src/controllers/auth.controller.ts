import { Request, Response } from 'express';
import { AuthService } from '@tg-payment/core';
import { getDatabase } from '@tg-payment/core';
import { respondSuccess, respondError, sendBadRequest, newRequestId } from '../utils/response';

const FEATURE_FLAG = process.env.FEATURE_PASSWORDLESS_AUTH === 'true';

export default class AuthController {
  static async requestMagicLink(req: Request, res: Response) {
    if (!FEATURE_FLAG) return res.replyError('FEATURE_DISABLED', 'Passwordless auth is disabled', 404);

    const { email } = req.body;
    if (!email) return res.replyError('MISSING_EMAIL', 'Email is required', 400);

    try {
      const result = await AuthService.requestMagicLink(email, { ip: req.ip, userAgent: req.get('User-Agent') || undefined });
      const responseData = { message: 'Magic link issued', token_jti: result.token_jti, expires_at: result.expires_at };
      if (process.env.EXPOSE_TEST_TOKENS === 'true') {
        (responseData as any).token = result.token;
      }
      res.replySuccess(responseData, 202);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.replyError('INTERNAL_ERROR', message || 'Failed to issue magic link', 500);
    }
  }

  static async verifyMagicLink(req: Request, res: Response) {
    if (!FEATURE_FLAG) return res.replyError('FEATURE_DISABLED', 'Passwordless auth is disabled', 404);

    const { token } = req.body;
    if (!token) return res.replyError('MISSING_TOKEN', 'Token is required', 400);

    try {
      const result = await AuthService.verifyMagicLink(token);
      if (!result.ok) {
        return res.replyError('INVALID_TOKEN', result.reason, 400);
      }

      const isProd = process.env.NODE_ENV === 'production';
      const maxAge = result.expires_at ? Math.max(0, new Date(result.expires_at).getTime() - Date.now()) : 24 * 60 * 60 * 1000;
      res.cookie('session_id', result.session_token, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge });
      if (result.csrf_token) {
        res.cookie('csrf_token', result.csrf_token, { httpOnly: false, secure: isProd, sameSite: 'lax', maxAge });
      }
      res.replySuccess({ user: result.user }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.replyError('INTERNAL_ERROR', message || 'Verification failed', 500);
    }
  }

  static async totpVerify(req: Request, res: Response) {
    const requestId = newRequestId();
    if (!FEATURE_FLAG) return respondError(res, 'FEATURE_DISABLED', 'Passwordless auth is disabled', 404, requestId);

    // Placeholder: real implementation verifies pending token and TOTP code
    const { pending_token, code } = req.body;
    if (!pending_token || !code) return sendBadRequest(res, 'MISSING_PARAMS', 'pending_token and code are required', requestId);

    // For now accept any code of length 6 (testing skeleton)
    if (String(code).length !== 6) return respondError(res, 'INVALID_CODE', 'Invalid TOTP code', 401, requestId);

    res.cookie('session_id', AuthService.generatePendingToken(), { httpOnly: true, secure: true, sameSite: 'strict' });
    return respondSuccess(res, { data: { message: 'TOTP verified' } }, 200, requestId);
  }

  static async enableTotp(req: Request, res: Response) {
    if (!FEATURE_FLAG) return respondError(res, 'FEATURE_DISABLED', 'Passwordless auth is disabled', 404);

    // Return provisioning data (secret + otpauth). Don't persist until user confirms.
    const secret = AuthService.generatePendingToken();
    const otpauth = `otpauth://totp/TG-Payment:${encodeURIComponent(req.body.email || 'user')}?secret=${secret}&issuer=TG-Payment`;
    return respondSuccess(res, { data: { secret, otpauth } }, 200);
  }

  static async totpConfirm(req: Request, res: Response) {
    // Persist encrypted secret and generate backup codes
    try {
      const { user_id, encrypted_secret, confirm } = req.body;
      if (!user_id || !encrypted_secret || !confirm) return sendBadRequest(res, 'MISSING_PARAMS', 'user_id, encrypted_secret and confirm are required');

      // Generate backup codes
      const backupCodes = AuthService.generateBackupCodes(8);
      await AuthService.persistTotpAndBackupCodes(user_id, encrypted_secret, backupCodes);

      return respondSuccess(res, { data: { backup_codes: backupCodes } }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return respondError(res, 'INTERNAL', message || 'Failed to persist TOTP', 500);
    }
  }

  static async logout(req: Request, res: Response) {
    // Revoke session cookie
    const sessionToken = req.cookies?.session_id || req.headers['x-session-token'];
    if (sessionToken) {
      try {
        await AuthService.revokeSession(sessionToken as string);
      } catch (e) {
        // ignore
      }
    }
    res.clearCookie('session_id');
    res.clearCookie('csrf_token');
    return respondSuccess(res, {}, 200);
  }

  static async me(req: Request, res: Response) {
    // Return current dashboard user via session cookie
    try {
      const sessionToken = req.cookies?.session_id as string | undefined;
      if (!sessionToken) return respondError(res, 'NO_SESSION', 'No session', 401);
      const db = getDatabase();
      const session = await db.oneOrNone('SELECT * FROM sessions WHERE session_token = $1', [sessionToken]);
      if (!session) return respondError(res, 'INVALID_SESSION', 'Session not found', 401);
      if (session.revoked_at) return respondError(res, 'REVOKED', 'Session revoked', 401);
      if (new Date(session.expires_at) < new Date()) return respondError(res, 'EXPIRED', 'Session expired', 401);
      const user = await db.oneOrNone('SELECT id, email, role, is_active FROM dashboard_users WHERE id = $1', [session.user_id]);
      if (!user) return respondError(res, 'NO_USER', 'User not found', 404);
      return respondSuccess(res, { data: { user } }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return respondError(res, 'INTERNAL', message || 'Failed', 500);
    }
  }
}
