import request from 'supertest';
import { buildPasswordlessTestApp } from './auth.passwordless-app.test-setup';
import { resetPasswordlessStub } from './stubs/passwordless.stub.controller';

describe('Passwordless Auth (Isolated)', () => {
  let app = buildPasswordlessTestApp();

  beforeEach(() => {
    // Reset stub state and rebuild the app to ensure isolation per test
    resetPasswordlessStub();
    app = buildPasswordlessTestApp();
  });

  it('should request and verify magic link, then access /auth/me', async () => {
    const email = 'test@example.com';

    // Request magic link
    const res1 = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email })
      .set('Content-Type', 'application/json');
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('token');
    const { token } = res1.body;

    // Verify magic link
    const res2 = await request(app)
      .post('/api/v1/auth/magic-link/verify')
      .send({ token })
      .set('Content-Type', 'application/json');
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('session');
    const cookies = res2.headers['set-cookie'];

    // Access /auth/me with session cookie
    const req3 = request(app).get('/api/v1/auth/me').set('Content-Type', 'application/json');
    if (cookies && Array.isArray(cookies)) {
      req3.set('Cookie', cookies.join('; '));
    }
    const res3 = await req3;
    expect(res3.status).toBe(200);
    expect(res3.body).toHaveProperty('email', email);
  });
});
