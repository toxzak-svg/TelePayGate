import express from "express";
import cookieParser from "cookie-parser";
import routes from "../../routes/v1.routes";
import { responseMiddleware } from "../../middleware/response.middleware";
import { initDatabase } from "@tg-payment/core";

export function buildTestApp() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in the test environment");
  }
  initDatabase(DATABASE_URL);

  const app = express();
  // Ensure body parsing is first
  app.use(express.json());
  // Attach response helpers for controllers
  app.use(responseMiddleware);
  // Parse cookies so tests can access session cookies set by controllers
  app.use(cookieParser());
  // ...existing code...
  app.use("/api/v1", routes);
  return app;
}
