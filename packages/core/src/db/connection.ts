import pgPromise from "pg-promise";
import { Pool } from "pg";

const pgp = pgPromise();

export type Database = pgPromise.IDatabase<Record<string, unknown>>;

let db: Database | null = null;
let pool: Pool | null = null;

export function initDatabase(connectionString: string): Database {
  if (db) {
    return db;
  }

  const maxConns = parseInt(process.env.DATABASE_POOL_MAX || "10", 10);
  const idleMs = parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10);
  const connTimeoutMs = parseInt(process.env.DB_CONNECTION_TIMEOUT || "5000", 10);

  // SECURITY FIX: Remove insecure rejectUnauthorized: false
  // For production, use proper SSL certificate validation
  // For local development with self-signed certs, use environment variable to explicitly opt-in
  const sslConfig = (process.env.NODE_ENV === 'production' ||
    connectionString.includes('railway.app') ||
    connectionString.includes('render.com'))
    ? {
        // SECURITY FIX: Enable certificate validation by default
        // Only disable if explicitly configured (NOT RECOMMENDED)
        rejectUnauthorized: process.env.DB_SSL_ALLOW_UNAUTHORIZED === 'true' ? false : true,
      }
    : false;

  db = pgp({
    connectionString,
    max: maxConns,
    idleTimeoutMillis: idleMs,
    connectionTimeoutMillis: connTimeoutMs,
    ssl: sslConfig,
  });

  // FIXED: Non-null assertion since we just assigned it
  return db!;
}

export function initPool(connectionString: string): Pool {
  if (pool) {
    return pool;
  }

  const maxConns = parseInt(process.env.DATABASE_POOL_MAX || "10", 10);
  const idleMs = parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10);
  const connTimeoutMs = parseInt(process.env.DB_CONNECTION_TIMEOUT || "5000", 10);

  // SECURITY FIX: Remove insecure rejectUnauthorized: false
  // For production, use proper SSL certificate validation
  // For local development with self-signed certs, use environment variable to explicitly opt-in
  const sslConfig = (process.env.NODE_ENV === 'production' ||
    connectionString.includes('railway.app') ||
    connectionString.includes('render.com'))
    ? {
        // SECURITY FIX: Enable certificate validation by default
        // Only disable if explicitly configured (NOT RECOMMENDED)
        rejectUnauthorized: process.env.DB_SSL_ALLOW_UNAUTHORIZED === 'true' ? false : true,
      }
    : false;

  pool = new Pool({
    connectionString,
    max: maxConns,
    idleTimeoutMillis: idleMs,
    connectionTimeoutMillis: connTimeoutMs,
    ssl: sslConfig,
  });

  return pool;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error("Pool not initialized. Call initPool() first.");
  }
  return pool;
}

export function closeDatabase(): void {
  if (db) {
    pgp.end();
    db = null;
  }
  if (pool) {
    pool.end();
    pool = null;
  }
}
