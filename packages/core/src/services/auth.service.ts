import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { getDatabase } from '../db/connection';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY || 'dev-secret';

export class AuthService {
  // Generate a random JTI for tokens
  static generateJti(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // Generate a short-lived pending token (opaque)
  static generatePendingToken(): string {
    return crypto.randomBytes(24).toString('hex');
  }

  // Generate backup codes (cleartext returned to user once)
  static generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10));
    }
    return codes;
  }

  // Encrypt a secret using WALLET_ENCRYPTION_KEY (hex) with AES-256-GCM
  static encryptSecret(plain: string): string {
    const keyHex = process.env.WALLET_ENCRYPTION_KEY || '';
    if (!keyHex || keyHex.length < 64) {
      // fallback: return base64 plaintext (ONLY FOR DEV)
      return Buffer.from(plain, 'utf8').toString('base64');
    }
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  static decryptSecret(blob: string): string {
    const keyHex = process.env.WALLET_ENCRYPTION_KEY || '';
    if (!keyHex || keyHex.length < 64) {
      return Buffer.from(blob, 'base64').toString('utf8');
    }
    const data = Buffer.from(blob, 'base64');
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const encrypted = data.slice(28);
    const key = Buffer.from(keyHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  // Request a magic link: sign a JWT, persist jti into magic_links, and attempt to email
  static async requestMagicLink(email: string, opts?: { ip?: string; userAgent?: string }) {
    const jti = AuthService.generateJti();
    // place `jti` into the JWT ID field (options.jwtid) and keep payload minimal
    const token = jwt.sign({ email }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '15m', jwtid: jti });

    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // seconds
    try {
      const db = getDatabase();
      await db.none('INSERT INTO magic_links (email, token_jti, expires_at, ip, user_agent) VALUES ($1, $2, to_timestamp($3), $4, $5)', [email, jti, expiresAt, opts?.ip || null, opts?.userAgent || null]);
    } catch (err) {
      // ignore in tests
    }

    // send mail if configured
    try {
      if (process.env.EMAIL_SMTP_HOST && process.env.EMAIL_SMTP_USER) {
        const transport = nodemailer.createTransport({
          host: process.env.EMAIL_SMTP_HOST,
          port: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
          secure: process.env.EMAIL_SMTP_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_SMTP_USER,
            pass: process.env.EMAIL_SMTP_PASS,
          },
        });
        const link = `${process.env.DASHBOARD_URL || 'http://localhost:5173'}/auth/verify?token=${encodeURIComponent(token)}`;
        await transport.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@example.com', to: email, subject: 'Your magic sign-in link', text: `Sign in: ${link}`, html: `<p>Sign in: <a href="${link}">${link}</a></p>` });
      } else if (process.env.NODE_ENV !== 'production') {
        console.log('Magic link (no SMTP):', token);
      }
    } catch (err) {
      console.warn('Failed to send magic link email', err);
    }

    return { token, token_jti: jti, expires_at: new Date(expiresAt * 1000).toISOString() };
  }

  // Verify magic link token (JWT). Creates dashboard_user if missing and session.
  static async verifyMagicLink(tokenOrJti: string) {
    const db = getDatabase();
    try {
      const payload: any = jwt.verify(tokenOrJti, JWT_SECRET) as any;
      const jti = payload.jti || payload.jti;
      const email = payload.email;

      const row = await db.oneOrNone('SELECT * FROM magic_links WHERE token_jti = $1', [jti]);
      if (!row) return { ok: false, reason: 'not_found' };
      if (row.used_at) return { ok: false, reason: 'replay' };
      if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };

      await db.none('UPDATE magic_links SET used_at = now() WHERE token_jti = $1', [jti]);

      // Ensure dashboard user exists
      let dashUser = await db.oneOrNone('SELECT * FROM dashboard_users WHERE email = $1', [email]);
      if (!dashUser) {
        dashUser = await db.one('INSERT INTO dashboard_users (email, role, is_active, created_at, updated_at) VALUES ($1, $2, true, now(), now()) RETURNING *', [email, 'admin']);
      }

      // Create session
      const sessionToken = AuthService.generatePendingToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.none('INSERT INTO sessions (user_id, session_token, created_at, last_seen_at, expires_at) VALUES ($1, $2, now(), now(), $3)', [dashUser.id, sessionToken, expiresAt]);

      return { ok: true, user: { id: dashUser.id, email: dashUser.email, role: dashUser.role }, session_token: sessionToken, expires_at: expiresAt.toISOString() };
    } catch (err: any) {
      // Log the verification error for debugging
      try {
        console.warn('AuthService.verifyMagicLink: jwt.verify error:', err && err.message ? err.message : err);
      } catch (e) {
        // ignore logging errors
      }
      // try fallback: if tokenOrJti looks like jti
      const row = await db.oneOrNone('SELECT * FROM magic_links WHERE token_jti = $1', [tokenOrJti]);
      if (!row) return { ok: false, reason: 'invalid' };
      if (row.used_at) return { ok: false, reason: 'replay' };
      if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };
      await db.none('UPDATE magic_links SET used_at = now() WHERE token_jti = $1', [tokenOrJti]);
      return { ok: true, user: { email: row.email } };
    }
  }
}

export default AuthService;
