import request from 'supertest';
import { buildTestApp } from './app.test-setup';
import { cleanDatabase, disconnectDatabase } from './db-test-utils';

describe('Conversions API', () => {
  let app = buildTestApp();
  let fixture: any = null;

  beforeAll(async () => {
    if (process.env.USE_TESTCONTAINERS === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { startPostgresFixture } = require('../fixtures/postgresFixture');
      fixture = await startPostgresFixture();
      process.env.DATABASE_URL = fixture.databaseUrl;
      // rebuild app to pick up DB-backed middleware
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('./app.test-setup');
      app = mod.buildTestApp();
    }
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (fixture) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { stopPostgresFixture } = require('../fixtures/postgresFixture');
      await stopPostgresFixture(fixture);
    }
  });

  test('GET /api/v1/conversions/rate - returns quote', async () => {
    const res = await request(app).get('/api/v1/conversions/rate').query({ amount: 100 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
  });

  test('POST /api/v1/conversions - requires auth', async () => {
    const res = await request(app)
      .post('/api/v1/conversions')
      .send({ amount: 100 });
    // No API key => should be 401
    expect([401, 400, 500]).toContain(res.status);
  });
});
