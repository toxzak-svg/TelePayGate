import { Request, Response, NextFunction } from "express";
import { getDatabase } from "@tg-payment/core";

export function requireDashboardRole(
  role: "admin" | "editor" | "viewer" | "dev",
) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const db = getDatabase();
      // dashboardUserId may be attached by authenticate fallback
      const dashboardUserId = (req as any).dashboardUserId as
        | string
        | undefined;

      if (!dashboardUserId) {
        // try session cookie
        const cookieHeader = req.headers.cookie as string | undefined;
        const sessionId = cookieHeader
          ?.split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("session_id="))
          ?.split("=")[1];
        if (!sessionId)
          return res
            .status(403)
            .json({
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "Not authenticated as dashboard user",
              },
            });
        const session = await db.oneOrNone(
          "SELECT * FROM sessions WHERE session_token = $1",
          [sessionId],
        );
        if (!session)
          return res
            .status(403)
            .json({
              success: false,
              error: { code: "FORBIDDEN", message: "Session not found" },
            });
        (req as any).dashboardUserId = session.user_id;
      }

      const dashUser = await db.oneOrNone(
        "SELECT * FROM dashboard_users WHERE id = $1",
        [(req as any).dashboardUserId],
      );
      if (!dashUser)
        return res
          .status(403)
          .json({
            success: false,
            error: { code: "FORBIDDEN", message: "Dashboard user not found" },
          });
      if (!dashUser.is_active)
        return res
          .status(403)
          .json({
            success: false,
            error: { code: "FORBIDDEN", message: "Account inactive" },
          });

      const rolesHierarchy: Record<string, number> = {
        viewer: 1,
        dev: 2,
        editor: 3,
        admin: 4,
      };
      if (rolesHierarchy[dashUser.role] < rolesHierarchy[role]) {
        return res
          .status(403)
          .json({
            success: false,
            error: { code: "FORBIDDEN", message: "Insufficient role" },
          });
      }

      // attach dashboard user to request
      (req as any).dashboardUser = dashUser;
      next();
    } catch (err: any) {
      console.error("Role middleware error", err);
      res
        .status(500)
        .json({
          success: false,
          error: { code: "SERVER_ERROR", message: "Role check failed" },
        });
    }
  };
}
