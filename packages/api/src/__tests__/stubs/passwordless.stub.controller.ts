import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Very small in-memory stub to simulate magic link flow and sessions for isolated tests
const tokenMap: Map<string, string> = new Map(); // token -> email
const sessionMap: Map<string, { email: string; expiresAt: number }> = new Map();

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

export const PasswordlessStubController = {
  async requestMagicLink(req: Request, res: Response, _next?: NextFunction) {
    const { email } = req.body || {};
    if (!email)
      return res
        .status(400)
        .json({ success: false, error: { code: "MISSING_EMAIL" } });
    const token = generateToken();
    tokenMap.set(token, email);
    // return token in response for tests to use
    res.status(200).json({ success: true, token });
  },

  async verifyMagicLink(req: Request, res: Response, _next?: NextFunction) {
    const { token } = req.body || {};
    if (!token)
      return res
        .status(400)
        .json({ success: false, error: { code: "MISSING_TOKEN" } });
    const email = tokenMap.get(token);
    if (!email)
      return res
        .status(400)
        .json({ success: false, error: { code: "INVALID_TOKEN" } });

    // create session
    const sessionToken = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    sessionMap.set(sessionToken, { email, expiresAt });

    res.cookie("session_id", sessionToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res
      .status(200)
      .json({
        success: true,
        session: {
          session_id: sessionToken,
          expires_at: new Date(expiresAt).toISOString(),
        },
        user: { email },
      });
  },

  async me(req: Request, res: Response, _next?: NextFunction) {
    const cookie = req.cookies?.session_id;
    if (!cookie)
      return res
        .status(401)
        .json({ success: false, error: { code: "NO_SESSION" } });
    const session = sessionMap.get(cookie);
    if (!session)
      return res
        .status(401)
        .json({ success: false, error: { code: "INVALID_SESSION" } });
    if (session.expiresAt < Date.now())
      return res
        .status(401)
        .json({ success: false, error: { code: "EXPIRED" } });
    res.status(200).json({ success: true, email: session.email });
  },
};

export function resetPasswordlessStub() {
  tokenMap.clear();
  sessionMap.clear();
}
