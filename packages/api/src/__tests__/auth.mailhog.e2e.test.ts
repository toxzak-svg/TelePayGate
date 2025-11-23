// Ensure feature flag and MailHog envs are set before modules import controllers
process.env.FEATURE_PASSWORDLESS_AUTH = process.env.FEATURE_PASSWORDLESS_AUTH || 'true';
process.env.EXPOSE_TEST_TOKENS = process.env.EXPOSE_TEST_TOKENS || 'false';
process.env.EMAIL_SMTP_HOST = process.env.EMAIL_SMTP_HOST || 'localhost';
process.env.EMAIL_SMTP_PORT = process.env.EMAIL_SMTP_PORT || '1025';

import request from 'supertest';
import axios from 'axios';
import { Application } from 'express';
import { buildTestApp } from './integration/app.test-setup';
import { extractTokenFromUrl } from './test-utils';

jest.setTimeout(30000);

describe('Magic Link via MailHog (E2E)', () => {
  let app: Application;
  beforeAll(() => {
    app = buildTestApp();
  });

  it('issues magic link and verifies via MailHog', async () => {
    const testEmail = `e2e-mailhog-${Date.now()}@example.com`;

    // issue magic link
    const issueRes = await request(app).post('/api/v1/auth/magic-link').send({ email: testEmail });
    if (![200, 201, 202].includes(issueRes.status)) {
      console.error('Magic link issue response:', issueRes.status, issueRes.body);
    }
    expect([200,201,202].includes(issueRes.status)).toBeTruthy();

    // Poll MailHog API for the message
    const mailhogUrl = process.env.MAILHOG_API_URL || 'http://localhost:8025/api/v2/messages';
    let token: string | null = null;
    const deadline = Date.now() + 10000;
    while (!token && Date.now() < deadline) {
      // fetch messages
      const res = await axios.get(mailhogUrl);
      const msgs = res.data && res.data.items ? res.data.items : [];
      // find message to our recipient
      for (const m of msgs) {
        const recipients = (m.To || []).map((r: { Mailbox: string; Domain: string }) => r.Mailbox + '@' + r.Domain);
        if (recipients.includes(testEmail)) {
          const content = m.Content || {};
          const rawBody = content.Body || (content.Headers && (content.Headers['HTML'] || content.Headers['Text'])) || '';
          // Clean quoted-printable artifacts (soft line breaks `=` at EOL, =3D for '=')
          const body = String(rawBody).replace(/=\r?\n/g, '').replace(/=3D/g, '=');
          console.log('MailHog message body (debug, cleaned):', body);
          // debug log found body
          // console.log('MailHog body:', body);
          // try to find a full URL in the body and extract token param
          const urlMatch = /https?:\/\/[^"]+auth\/verify\?[^"'\s]+/.exec(body);
          if (urlMatch) {
            const foundUrl = urlMatch[0].replace(/=3D/g, '=').replace(/=\r?\n/g, '');
            const t = extractTokenFromUrl(foundUrl);
            if (t) {
              token = t;
              console.log('Found token via URL match:', token);
              break;
            }
          }
          // fallback: look for JWT-like string
          const jwtMatch = /eyJ[\w-]+\.[\w-]+\.[\w-]+/.exec(body);
          if (jwtMatch) {
            token = jwtMatch[0];
            console.log('Found token via JWT match:', token);
            break;
          }
          console.log('MailHog message body did not contain token for', testEmail);
        }
      }
      if (!token) await new Promise((r) => setTimeout(r, 500));
    }

    expect(token).toBeDefined();

    // Verify token
    const verifyRes = await request(app).post('/api/v1/auth/magic-link/verify').send({ token });
    expect(verifyRes.status).toBe(200);

    // capture cookies and call /auth/me
    const rawCookies = verifyRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(rawCookies)
      ? rawCookies.map((c: string) => c.split(';')[0]).join('; ')
      : (typeof rawCookies === 'string' ? rawCookies.split(';')[0] : '');

    const meRes = await request(app).get('/api/v1/auth/me').set('Cookie', cookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user).toBeDefined();
  });
});
