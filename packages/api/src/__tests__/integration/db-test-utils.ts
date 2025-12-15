import * as core from "telepaygate-core";

const getDatabase = (core as any).getDatabase || (core as any).default?.getDatabase;
const closeDatabase = (core as any).closeDatabase || (core as any).default?.closeDatabase;

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
