#!/usr/bin/env node
/**
 * Create API Key Script
 * Generates a new API key for a user in the database
 */

const crypto = require('crypto');
const pgPromise = require('pg-promise');

// Generate a random API key with prefix
function generateApiKey() {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `pk_${randomBytes}`;
}

async function createApiKey() {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tg_user:tg_pass@localhost:5432/telepaygate_dev';
  
  const pgp = pgPromise();
  const db = pgp(DATABASE_URL);

  try {
    console.log('🔑 Creating API Key...\n');

    // Generate API key and secret
    const apiKey = generateApiKey();
    const apiSecret = generateApiKey();
    const userId = crypto.randomUUID();

    // Create user with API key
    const user = await db.one(`
      INSERT INTO users (
        id,
        api_key,
        api_secret,
        app_name,
        description,
        webhook_url,
        is_active
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        true
      )
      RETURNING *
    `, [
      userId,
      apiKey,
      apiSecret,
      'Dashboard Admin',
      'Admin API key for dashboard access',
      null
    ]);

    console.log('✅ API Key Created Successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`User ID:    ${user.id}`);
    console.log(`App Name:   ${user.app_name}`);
    console.log(`API Key:    ${user.api_key}`);
    console.log(`API Secret: ${user.api_secret}`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('💡 Use the API Key to access the dashboard and API endpoints\n');
    console.log('🔒 Keep these credentials secret and never commit them to version control\n');

    await pgp.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating API key:', error.message);
    await pgp.end();
    process.exit(1);
  }
}

createApiKey();
