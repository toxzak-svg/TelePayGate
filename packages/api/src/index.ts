import "module-alias/register";
import "dotenv/config";
import http from "http";
import { initDatabase, validateEnvironment, getEnvironmentSummary } from "telepaygate-core";
import createServer from "./server";

// Validate environment variables before starting
console.log('🔍 Validating environment...\n');
const envValidation = validateEnvironment(process.env.NODE_ENV === 'production');

// Log warnings but don't exit - allow server to start for health checks
for (const warning of envValidation.warnings) {
  console.warn(`⚠️  ${warning}`);
}

if (!envValidation.valid) {
  console.error('\n⚠️  Environment validation issues found:');
  for (const error of envValidation.errors) {
    console.error(`   • ${error}`);
  }
  console.error('\n⚠️  Starting server anyway for health checks. Full functionality may be limited.\n');
}

// Log configured features
const features = getEnvironmentSummary();
console.log('📦 Configured features:');
Object.entries(features).forEach(([feature, enabled]) => {
  console.log(`   ${enabled ? '✓' : '○'} ${feature}`);
});
console.log('');

// Initialize database
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://tg_user:tg_pass@localhost:5432/telepaygate_dev";

async function startServer() {
  try {
    if (DATABASE_URL && DATABASE_URL.includes('postgresql://')) {
      await initDatabase(DATABASE_URL);
      console.log("✅ Database initialized");
    } else {
      console.warn("⚠️  Database URL not configured, skipping database initialization");
    }

    // Start server
    const PORT = process.env.PORT || 3000;
    const app = createServer();
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`🚀 API Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 API endpoint: http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully...");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
