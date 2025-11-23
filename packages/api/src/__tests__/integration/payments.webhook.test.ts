import request from 'supertest';
import { buildTestApp } from './app.test-setup';
import { cleanDatabase, disconnectDatabase } from './db-test-utils';

describe('Payments API - webhook', () => {
  const app = buildTestApp();

  beforeEach(async () => {
    // Only clean database, do not insert user
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  test('POST /api/v1/payments/webhook - acknowledges webhook', async () => {
    const payload = {
      message: {
        successful_payment: {
          invoice_payload: 'payload123',
          total_amount: 1000,
          telegram_payment_charge_id: 'charge_abc'
        }
      }
    };

    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-user-id', 'test-user-1')
      .send(payload);

    if (res.status !== 200) {
      console.error('Test failed: Response status:', res.status);
      console.error('Response body:', res.body);
      console.error('Response headers:', res.headers);
    }
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('payment');
    expect(res.body.payment).toHaveProperty('starsAmount');
    // Log for debugging (userId is not returned in response)
    // console.log('Test response payment.userId:', res.body.payment.userId);
  }, 10000);
});
