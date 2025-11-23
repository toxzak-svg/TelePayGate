import { Request, Response } from 'express';
import { AuthService } from '@tg-payment/core';
import { getDatabase } from '@tg-payment/core';

const FEATURE_FLAG = process.env.FEATURE_PASSWORDLESS_AUTH === 'true';

export default class AuthController {
  static async requestMagicLink(req: Request, res: Response) {
    if (!FEATURE_FLAG) return res.replyError('FEATURE_DISABLED', 'Passwordless auth is disabled', 404);

    const { email } = req.body;
    if (!email) return res.replyError('MISSING_EMAIL', 'Email is required', 400);

    try {
      const result = await AuthService.requestMagicLink(email, { ip: req.ip, userAgent: req.get('User-Agent') || undefined });
      // In production, send email via SMTP provider. Here we return 202.
      // For tests and development, include the token in the response so test suites can verify flows without SMTP.
      const responseData = { message: 'Magic link issued', token_jti: result.token_jti, expires_at: result.expires_at };
      // Only expose raw token when explicitly allowed (tests/dev), to avoid leaking tokens in CI/production.
      if (process.env.EXPOSE_TEST_TOKENS === 'true') {
        // explicit property only when allowed
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

    // (no debug logs)

    const { token } = req.body;
    if (!token) return res.replyError('MISSING_TOKEN', 'Token is required', 400);

    try {
      const result = await AuthService.verifyMagicLink(token);
      if (!result.ok) {
        return res.replyError('INVALID_TOKEN', result.reason, 400);
      }

      // Set secure session cookie and CSRF cookie
      const isProd = process.env.NODE_ENV === 'production';
      const maxAge = result.expires_at ? Math.max(0, new Date(result.expires_at).getTime() - Date.now()) : 24 * 60 * 60 * 1000;

      // session_id: HttpOnly, Secure in production, SameSite lax
      res.cookie('session_id', result.session_token, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge });

      // csrf_token: accessible to JS (not HttpOnly) so single-page app can read and include in headers
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
    if (!FEATURE_FLAG) return res.status(404).json({ success: false, error: { code: 'FEATURE_DISABLED', message: 'Passwordless auth is disabled' } });

    // Placeholder: real implementation verifies pending token and TOTP code
    const { pending_token, code } = req.body;
    if (!pending_token || !code) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAMS', message: 'pending_token and code are required' } });

    // For now accept any code of length 6 (testing skeleton)
    if (String(code).length !== 6) return res.status(401).json({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid TOTP code' } });

    res.cookie('session_id', AuthService.generatePendingToken(), { httpOnly: true, secure: true, sameSite: 'strict' });
    res.status(200).json({ success: true, data: { message: 'TOTP verified' } });
  }

  static async enableTotp(req: Request, res: Response) {
    if (!FEATURE_FLAG) return res.status(404).json({ success: false, error: { code: 'FEATURE_DISABLED', message: 'Passwordless auth is disabled' } });

    // Return provisioning data (secret + otpauth). Don't persist until user confirms.
    const secret = AuthService.generatePendingToken();
    const otpauth = `otpauth://totp/TG-Payment:${encodeURIComponent(req.body.email || 'user')}?secret=${secret}&issuer=TG-Payment`;
    res.status(200).json({ success: true, data: { secret, otpauth } });
  }

  static async totpConfirm(req: Request, res: Response) {
    // Persist encrypted secret and generate backup codes
    try {
      const { user_id, encrypted_secret, confirm } = req.body;
      if (!user_id || !encrypted_secret || !confirm) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAMS', message: 'user_id, encrypted_secret and confirm are required' } });

      // Generate backup codes
      const backupCodes = AuthService.generateBackupCodes(8);
      await AuthService.persistTotpAndBackupCodes(user_id, encrypted_secret, backupCodes);

      res.status(200).json({ success: true, data: { backup_codes: backupCodes } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: message || 'Failed to persist TOTP' } });
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
    res.status(200).json({ success: true });
  }

  static async me(req: Request, res: Response) {
    // Return current dashboard user via session cookie
    try {
      const sessionToken = req.cookies?.session_id as string | undefined;
      if (!sessionToken) return res.status(401).json({ success: false, error: { code: 'NO_SESSION', message: 'No session' } });
      const db = getDatabase();
      const session = await db.oneOrNone('SELECT * FROM sessions WHERE session_token = $1', [sessionToken]);
      if (!session) return res.status(401).json({ success: false, error: { code: 'INVALID_SESSION', message: 'Session not found' } });
      if (session.revoked_at) return res.status(401).json({ success: false, error: { code: 'REVOKED', message: 'Session revoked' } });
      if (new Date(session.expires_at) < new Date()) return res.status(401).json({ success: false, error: { code: 'EXPIRED', message: 'Session expired' } });
      const user = await db.oneOrNone('SELECT id, email, role, is_active FROM dashboard_users WHERE id = $1', [session.user_id]);
      if (!user) return res.status(404).json({ success: false, error: { code: 'NO_USER', message: 'User not found' } });
      res.status(200).json({ success: true, data: { user } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL', message: message || 'Failed' } });
    }
  }
}
