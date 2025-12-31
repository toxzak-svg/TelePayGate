import * as core from "telepaygate-core";

// Normalize export shapes (CJS vs ESM default)
const getDatabase = (core as any).getDatabase || (core as any).default?.getDatabase;
const closeDatabase = (core as any).closeDatabase || (core as any).default?.closeDatabase;

// Debugging: log export shape during tests
try {
  // eslint-disable-next-line no-console
  console.log("[db-test-utils] telepaygate-core exports:", Object.keys(core));
  // eslint-disable-next-line no-console
  console.log("[db-test-utils] closeDatabase typeof:", typeof closeDatabase);
} catch (e) {
  // ignore in non-test environments
}

export async function cleanDatabase() {
  const db = getDatabase();
  if (!db) {
    console.warn("Database connection not available for cleaning.");
    return;
  }
  try {
    await db.none(
      "TRUNCATE TABLE users, wallets, payments, manual_deposits, conversions, atomic_swaps, platform_fees RESTART IDENTITY CASCADE;",
    );
  } catch (error) {
    console.error("Error cleaning database:", error);
    // Rethrow or handle as needed. For tests, we might want to fail fast.
    throw error;
  }
}

export async function disconnectDatabase() {
  if (typeof closeDatabase === "function") {
    // closeDatabase may be sync; wrap in Promise for safety
    return Promise.resolve(closeDatabase());
  }
  console.warn("closeDatabase not available on telepaygate-core exports");
}

// Provide a default export for interop with various import styles
export default {
  cleanDatabase,
  disconnectDatabase,
};
