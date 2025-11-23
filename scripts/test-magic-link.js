/* Test script: request + verify magic link and inspect session
   Usage: node scripts/test-magic-link.js
*/

require('dotenv').config({ path: '.env' });

const { initDatabase, getDatabase } = require('../packages/core/dist/db/connection');
const AuthService = require('../packages/core/dist/services/auth.service').default;

async function run() {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tg_user:tg_pass@localhost:5432/tg_payment_dev';
  console.log('Using DATABASE_URL:', DATABASE_URL);
  // Init DB connection
  const db = initDatabase(DATABASE_URL);

  const testEmail = process.env.TEST_MAGIC_EMAIL || 'dev-admin@example.com';
  console.log('Requesting magic link for', testEmail);
  const req = await AuthService.requestMagicLink(testEmail, { ip: '127.0.0.1', userAgent: 'test-agent' });
  console.log('Request result:', { token_jti: req.token_jti, expires_at: req.expires_at });

  const token = req.token;
  if (!token) {
    console.error('No token returned by requestMagicLink. Aborting.');
    process.exit(1);
  }

  console.log('\nVerifying token...');
  const verify = await AuthService.verifyMagicLink(token);
  console.log('Verify result:', verify);

  if (verify.ok && verify.session_token) {
    const rows = await db.any('SELECT * FROM sessions WHERE session_token = $1', [verify.session_token]);
    console.log('\nSessions rows matching token:', rows);
  } else {
    console.log('No session created (verify result):', verify);
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
