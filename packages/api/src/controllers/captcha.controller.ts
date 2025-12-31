import { Request, Response } from 'express';
import config from '../config';

export async function verifyToken(token?: string, remoteIp?: string) {
  if (!config.captcha.enabled) return { ok: true, provider: null, details: null };
  if (!token) return { ok: false, error: { code: 'MISSING_TOKEN', message: 'Missing captcha token' } };
  if (!config.captcha.provider || !config.captcha.secret) return { ok: false, error: { code: 'CAPTCHA_NOT_CONFIGURED', message: 'Captcha not configured' } };

  const provider = config.captcha.provider.toLowerCase();
  let verifyUrl = '';
  if (provider === 'recaptcha') verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
  else if (provider === 'hcaptcha') verifyUrl = 'https://hcaptcha.com/siteverify';
  else return { ok: false, error: { code: 'CAPTCHA_PROVIDER_UNSUPPORTED', message: 'Captcha provider not supported' } };

  const formParams = new URLSearchParams();
  formParams.set('secret', config.captcha.secret);
  formParams.set('response', token);
  if (remoteIp) formParams.set('remoteip', remoteIp);

  const fetchFn = (globalThis as any).fetch;
  if (typeof fetchFn !== 'function') return { ok: false, error: { code: 'FETCH_NOT_AVAILABLE', message: 'Server does not support fetch' } };

  try {
    const verifyRes = await fetchFn(verifyUrl, { method: 'POST', body: formParams });
    const json = await verifyRes.json();
    const ok = !!json.success;
    return { ok, details: json };
  } catch (err) {
    return { ok: false, error: { code: 'VERIFICATION_FAILED', message: 'Failed to verify with provider' } };
  }
}

export default class CaptchaController {
  static async verify(req: Request, res: Response) {
    try {
      const { token } = req.body || {};

      if (!config.captcha.enabled) {
        return res.status(200).json({ success: true, verified: true, provider: null });
      }

      if (!token) {
        return res.status(400).json({ success: false, verified: false, error: { code: 'MISSING_TOKEN', message: 'Missing captcha token' } });
      }

      if (!config.captcha.provider || !config.captcha.secret) {
        return res.status(503).json({ success: false, verified: false, error: { code: 'CAPTCHA_NOT_CONFIGURED', message: 'Captcha is enabled but not configured on server' } });
      }

      const result = await verifyToken(token, req.ip);
      if (result.ok) return res.status(200).json({ success: true, verified: true, provider: config.captcha.provider });
      return res.status(400).json({ success: false, verified: false, error: result.error || { code: 'CAPTCHA_FAILED', message: 'Captcha verification failed' }, details: result.details || null });
    } catch (error: unknown) {
      const e = error as Error;
      console.error('Captcha verify error', e.message);
      return res.status(500).json({ success: false, verified: false, error: { code: 'SERVER_ERROR', message: 'Failed to verify captcha' } });
    }
  }

  static async getFeatures(_req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      features: {
        captchaEnabled: !!config.captcha.enabled,
        captchaProvider: config.captcha.provider || null,
      }
    });
  }
}
