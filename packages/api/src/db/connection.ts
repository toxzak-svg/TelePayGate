import { initDatabase, getDatabase } from "telepaygate-core";

// Initialize database connection (only if not already initialized)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://tg_user:tg_pass@localhost:5432/telepaygate_dev";

// Only initialize database if we're not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  try {
    initDatabase(DATABASE_URL);
  } catch (err) {
    console.warn("[db] Database initialization failed:", (err as Error)?.message);
  }
}

// Export database instance
export const db = getDatabase();

// Export getDatabase for use in controllers
export { getDatabase };
