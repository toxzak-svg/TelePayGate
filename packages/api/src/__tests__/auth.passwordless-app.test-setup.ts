import express, { Application } from "express";
import cookieParser from "cookie-parser";
import { PasswordlessStubController } from "./stubs/passwordless.stub.controller";

export function buildPasswordlessTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.post("/api/v1/auth/magic-link", (req, res, next) =>
    PasswordlessStubController.requestMagicLink(req, res, next),
  );
  app.post("/api/v1/auth/magic-link/verify", (req, res, next) =>
    PasswordlessStubController.verifyMagicLink(req, res, next),
  );
  app.get("/api/v1/auth/me", (req, res, next) =>
    PasswordlessStubController.me(req, res, next),
  );
  return app;
}
