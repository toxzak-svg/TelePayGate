import pgPromise from 'pg-promise';

const pgp = pgPromise();

export type Database = pgPromise.IDatabase<any>;

let db: Database | null = null;

export function initDatabase(connectionString: string): Database {
  if (db) {
    return db;
  }

  db = pgp({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // FIXED: Non-null assertion since we just assigned it
  return db!;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    pgp.end();
    db = null;
  }
}
