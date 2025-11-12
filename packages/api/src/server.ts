import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import globalLimiter from './middleware/ratelimit.middleware';
import authMiddleware from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import v1Routes from './routes/v1.routes';

export function createServer(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  app.use(globalLimiter);

  // Health check endpoint (no auth required)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // API routes
  app.use('/api/v1', v1Routes);

  // Error handling
  app.use(errorHandler);

  return app;
}

export default createServer;
