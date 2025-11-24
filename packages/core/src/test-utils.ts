import { DexAggregatorService } from "./services/dex-aggregator.service";

export function setupDexIntegrationTest() {
  process.env.DEX_SIMULATION_MODE = process.env.DEX_SIMULATION_MODE || "true";
  if (
    !process.env.RUN_DEX_INTEGRATION_TESTS &&
    process.env.DEX_SIMULATION_MODE === "true"
  ) {
    process.env.RUN_DEX_INTEGRATION_TESTS = "true";
  }
  process.env.TON_MAINNET = process.env.TON_MAINNET || "false";

  const runDexIntegrationTests =
    process.env.RUN_DEX_INTEGRATION_TESTS === "true";

  if (!runDexIntegrationTests) {
    console.warn(
      "⚠️ Skipping DEX integration tests (set RUN_DEX_INTEGRATION_TESTS=true to enable).",
    );
  } else if (process.env.DEX_SIMULATION_MODE === "true") {
    console.log("🧪 DEX integration tests running in simulation mode");
  }

  process.env.DEDUST_API_URL =
    process.env.DEDUST_API_URL || "https://api.dedust.io";
  process.env.STONFI_API_URL =
    process.env.STONFI_API_URL || "https://api.ston.fi";

  const dexService = new DexAggregatorService();
  (dexService as any).tonService = {
    getWalletAddress: () => "EQC-test-wallet-address",
    initializeWallet: jest.fn().mockResolvedValue(undefined),
    getTransaction: jest.fn(),
    getClient: jest.fn().mockReturnValue({}),
  };

  return { dexService, runDexIntegrationTests };
}
