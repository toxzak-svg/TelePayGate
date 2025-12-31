const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

async function showWebhookEvents(limit = 20) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const result = await client.query(
      `SELECT id, user_id, event, payload, status, attempts, created_at
       FROM webhook_events
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    if (result.rows.length === 0) {
      console.log('No webhook events found');
      return;
    }

    console.log(`\nLast ${result.rows.length} webhook events:\n`);
    for (const row of result.rows) {
      let payload = row.payload;
      try {
        payload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      } catch {}
      console.log('----------------------------------------');
      console.log('ID:', row.id);
      console.log('User:', row.user_id);
      console.log('Event:', row.event);
      console.log('Status:', row.status, `(attempts: ${row.attempts})`);
      console.log('Created:', row.created_at);
      console.log('Payload:', JSON.stringify(payload, null, 2));
    }
    console.log('----------------------------------------\n');
  } catch (err) {
    console.error('Failed to query webhook events:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

const limitArg = process.argv[2] ? parseInt(process.argv[2], 10) : 20;
showWebhookEvents(Number.isFinite(limitArg) ? limitArg : 20);
