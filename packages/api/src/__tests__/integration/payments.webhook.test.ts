import request from 'supertest';
describe('Payments API - webhook', () => {
  let app: any = null;
  let fixture: any = null;
  let cleanDatabase: any;
  let disconnectDatabase: any;

  beforeAll(async () => {
    jest.setTimeout(60_000);
    if (process.env.USE_TESTCONTAINERS === 'true') {
      // If globalSetup wrote DB info, read it and reuse instead of starting
      const path = require('path');
      const fs = require('fs');
      const tcFile = path.resolve(__dirname, '../../tmp', 'tc-db.json');
      if (fs.existsSync(tcFile)) {
        const data = JSON.parse(fs.readFileSync(tcFile, 'utf8'));
        fixture = { databaseUrl: data.databaseUrl };
        process.env.DATABASE_URL = fixture.databaseUrl;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { startPostgresFixture } = require('../fixtures/postgresFixture');
        fixture = await startPostgresFixture();
        process.env.DATABASE_URL = fixture.databaseUrl;
      }

      // Now require utilities and app builder so they use the injected DATABASE_URL
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./app.test-setup');
      app = mod.buildTestApp();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dbUtils = require('./db-test-utils');
      cleanDatabase = dbUtils.cleanDatabase;
      disconnectDatabase = dbUtils.disconnectDatabase;
    } else {
      // Non-fixture path: require modules normally
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./app.test-setup');
      app = mod.buildTestApp();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dbUtils = require('./db-test-utils');
      cleanDatabase = dbUtils.cleanDatabase;
      disconnectDatabase = dbUtils.disconnectDatabase;
    }
  });

  afterAll(async () => {
    if (fixture) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { stopPostgresFixture } = require('../fixtures/postgresFixture');
      await stopPostgresFixture(fixture);
    }
    if (disconnectDatabase) {
      await disconnectDatabase();
    }
  });

  beforeEach(async () => {
    // Only clean database, do not insert user
    await cleanDatabase();
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
  }, 10000);
});
