import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import globalLimiter from "./middleware/ratelimit.middleware";
import { errorHandler } from "./middleware/error.middleware";
import v1Routes from "./routes/v1.routes";
import { responseMiddleware } from "./middleware/response.middleware";
import { metricsMiddleware } from "./middleware/metrics.middleware";

export function createServer(): Application {
  const app = express();

  // Metrics (should be first to track all requests)
  app.use(metricsMiddleware);

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(cookieParser());
  
  // Skip body parsing for serverless-http (it handles it)
  if (process.env.VERCEL !== '1') {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  }

  // Global rate limiting (skip for webhooks)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/webhooks')) {
      next(); // Skip rate limiting for webhooks
    } else {
      globalLimiter(req, res, next);
    }
  });

  // Attach response helpers
  app.use(responseMiddleware);

  // Health check endpoint (no additional auth required)
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // API routes
  app.use("/api/v1", v1Routes);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}

export default createServer;
