import 'module-alias/register';
import 'dotenv/config';
import http from 'http';
import { initDatabase } from '@tg-payment/core';
import createServer from './server';

// Initialize database
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tg_user:tg_pass@localhost:5432/tg_payment_dev';

async function startServer() {
  try {
    await initDatabase(DATABASE_URL);
    console.log('✅ Database initialized');

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
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
