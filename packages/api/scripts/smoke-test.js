const http = require('http');
const serverModule = require('../dist/packages/api/src/server');

async function run() {
  const app = serverModule.default();
  const server = http.createServer(app);
  const port = 4005;
  server.listen(port, async () => {
    console.log('Test server listening on', port);

    try {
      // Health check
      const res1 = await fetch(`http://localhost:${port}/health`);
      console.log('/health', res1.status);

      // Payments webhook (no DB checks)
      const payload = { message: { successful_payment: { invoice_payload: 'p1', total_amount: 100, telegram_payment_charge_id: 'c1' } } };
      const res2 = await fetch(`http://localhost:${port}/api/v1/payments/webhook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': 'test-user' }, body: JSON.stringify(payload)
      });
      const body2 = await res2.json();
      console.log('/payments/webhook', res2.status, body2 && body2.success);

      // Conversions rate
      const res3 = await fetch(`http://localhost:${port}/api/v1/conversions/rate?amount=100`);
      const body3 = await res3.json();
      console.log('/conversions/rate', res3.status, !!body3.data);

    } catch (err) {
      console.error('Smoke test error', err);
    } finally {
      server.close(() => process.exit(0));
    }
  });
}

run();
