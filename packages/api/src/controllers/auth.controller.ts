import { Request, Response } from "express";
import { AuthService } from "telepaygate-core";
import { getDatabase } from "telepaygate-core";
import {
  respondSuccess,
  respondError,
  sendBadRequest,
} from "../utils/response";

const FEATURE_FLAG = process.env.FEATURE_PASSWORDLESS_AUTH === "true";

export default class AuthController {
  static async requestMagicLink(req: Request, res: Response) {
    if (!FEATURE_FLAG)
      return respondError(
        res,
        "FEATURE_DISABLED",
        "Passwordless auth is disabled",
        404,
      );

    const { email } = req.body;
    if (!email)
      return sendBadRequest(res, "MISSING_EMAIL", "Email is required");

    try {
      const result = await AuthService.requestMagicLink(email, {
        ip: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      });
      const responseData: Record<string, unknown> = {
        message: "Magic link issued",
        token_jti: result.token_jti,
        expires_at: result.expires_at,
      };
      if (process.env.EXPOSE_TEST_TOKENS === "true") {
        (responseData as Record<string, unknown> & { token?: string }).token =
          result.token;
      }
      return respondSuccess(res, { data: responseData }, 202);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return respondError(
        res,
        "INTERNAL_ERROR",
        message || "Failed to issue magic link",
        500,
      );
    }
  }

  static async verifyMagicLink(req: Request, res: Response) {
    if (!FEATURE_FLAG)
      return respondError(
        res,
        "FEATURE_DISABLED",
        "Passwordless auth is disabled",
        404,
      );

    const { token } = req.body;
    if (!token)
      return sendBadRequest(res, "MISSING_TOKEN", "Token is required");

    try {
      const result = await AuthService.verifyMagicLink(token);
      if (!result.ok) {
        return respondError(res, "INVALID_TOKEN", result.reason, 400);
      }

      const isProd = process.env.NODE_ENV === "production";
      const maxAge = result.expires_at
        ? Math.max(0, new Date(result.expires_at).getTime() - Date.now())
        : 24 * 60 * 60 * 1000;

      res.cookie("session_id", result.session_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge,
      });
      if (result.csrf_token) {
        res.cookie("csrf_token", result.csrf_token, {
          httpOnly: false,
          secure: isProd,
          sameSite: "lax",
          maxAge,
        });
      }

      return respondSuccess(res, { data: { user: result.user } }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return respondError(
        res,
        "INTERNAL_ERROR",
        message || "Verification failed",
        500,
      );
    }
  }

  static async registerEmail(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password)
      return sendBadRequest(res, "MISSING_PARAMS", "email and password required");
    if (String(password).length < 8)
      return respondError(res, "WEAK_PASSWORD", "Password must be at least 8 characters", 400);

    try {
      const user = await AuthService.registerDashboardUserWithPassword(email, password);
      // create session
      const session = await AuthService.createSessionForUser(user.id);

      const isProd = process.env.NODE_ENV === "production";
      const maxAge = session.expires_at ? Math.max(0, new Date(session.expires_at).getTime() - Date.now()) : 24 * 60 * 60 * 1000;
      res.cookie("session_id", session.session_token, { httpOnly: true, secure: isProd, sameSite: "lax", maxAge });
      res.cookie("csrf_token", session.csrf_token, { httpOnly: false, secure: isProd, sameSite: "lax", maxAge });

      return respondSuccess(res, { data: { user: { id: user.id, email: user.email, role: user.role } } }, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return respondError(res, "INTERNAL_ERROR", message || "Registration failed", 500);
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password)
      return sendBadRequest(res, "MISSING_PARAMS", "email and password required");

    try {
      const result: unknown = await AuthService.loginWithPassword(
        email,
        password,
      );
      const loginResult = result as {
        ok: boolean;
        reason?: string;
        expires_at?: string;
        session_token?: string;
        csrf_token?: string;
        user?: unknown;
      };
      if (!loginResult.ok) {
        const map: Record<string, [number, string]> = {
          not_found: [404, "USER_NOT_FOUND"],
          no_password: [400, "NO_PASSWORD"],
          inactive: [403, "INACTIVE"],
          invalid_credentials: [401, "INVALID_CREDENTIALS"],
        };
        const [status, code] = map[loginResult.reason as string] || [401, "INVALID_CREDENTIALS"];
        return respondError(res, code, loginResult.reason || "Login failed", status);
      }

      const isProd = process.env.NODE_ENV === "production";
      const maxAge = loginResult.expires_at
        ? Math.max(0, new Date(loginResult.expires_at).getTime() - Date.now())
        : 24 * 60 * 60 * 1000;
      res.cookie("session_id", loginResult.session_token as string, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge,
      });
      if (loginResult.csrf_token)
        res.cookie("csrf_token", loginResult.csrf_token as string, {
          httpOnly: false,
          secure: isProd,
          sameSite: "lax",
          maxAge,
        });

      return respondSuccess(res, { data: { user: loginResult.user } }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return respondError(res, "INTERNAL_ERROR", message || "Login failed", 500);
    }
  }

  static async totpVerify(req: Request, res: Response) {
    if (!FEATURE_FLAG)
      return respondError(
        res,
        "FEATURE_DISABLED",
        "Passwordless auth is disabled",
        404,
      );

    const { pending_token, code } = req.body;
    if (!pending_token || !code)
      return sendBadRequest(
        res,
        "MISSING_PARAMS",
        "pending_token and code are required",
      );
    if (String(code).length !== 6)
      return respondError(res, "INVALID_CODE", "Invalid TOTP code", 401);

    res.cookie("session_id", AuthService.generatePendingToken(), {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    return respondSuccess(res, { data: { message: "TOTP verified" } }, 200);
  }

  static async enableTotp(req: Request, res: Response) {
    if (!FEATURE_FLAG)
      return respondError(
        res,
        "FEATURE_DISABLED",
        "Passwordless auth is disabled",
        404,
      );

    const secret = AuthService.generatePendingToken();
    const otpauth = `otpauth://totp/TG-Payment:${encodeURIComponent(req.body.email || "user")}?secret=${secret}&issuer=TG-Payment`;
    return respondSuccess(res, { data: { secret, otpauth } }, 200);
  }

  static async totpConfirm(req: Request, res: Response) {
    try {
      const { user_id, encrypted_secret, confirm } = req.body;
      if (!user_id || !encrypted_secret || !confirm)
        return sendBadRequest(
          res,
          "MISSING_PARAMS",
          "user_id, encrypted_secret and confirm are required",
        );

      const backupCodes = AuthService.generateBackupCodes(8);
      await AuthService.persistTotpAndBackupCodes(
        user_id,
        encrypted_secret,
        backupCodes,
      );

      return respondSuccess(res, { data: { backup_codes: backupCodes } }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return respondError(
        res,
        "INTERNAL",
        message || "Failed to persist TOTP",
        500,
      );
    }
  }

  static async logout(req: Request, res: Response) {
    const sessionToken =
      req.cookies?.session_id || req.headers["x-session-token"];
    if (sessionToken) {
      try {
        await AuthService.revokeSession(sessionToken as string);
      } catch (e) {
        // ignore
      }
    }
    res.clearCookie("session_id");
    res.clearCookie("csrf_token");
    return respondSuccess(res, {}, 200);
  }

  static async me(req: Request, res: Response) {
    try {
      const sessionToken = req.cookies?.session_id as string | undefined;
      if (!sessionToken)
        return respondError(res, "NO_SESSION", "No session", 401);
      const db = getDatabase();
      const session = await db.oneOrNone(
        "SELECT * FROM sessions WHERE session_token = $1",
        [sessionToken],
      );
      if (!session)
        return respondError(res, "INVALID_SESSION", "Session not found", 401);
      if (session.revoked_at)
        return respondError(res, "REVOKED", "Session revoked", 401);
      if (new Date(session.expires_at) < new Date())
        return respondError(res, "EXPIRED", "Session expired", 401);
      const user = await db.oneOrNone(
        "SELECT id, email, role, is_active FROM dashboard_users WHERE id = $1",
        [session.user_id],
      );
      if (!user) return respondError(res, "NO_USER", "User not found", 404);
      return respondSuccess(res, { data: { user } }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return respondError(res, "INTERNAL", message || "Failed", 500);
    }
  }
}
