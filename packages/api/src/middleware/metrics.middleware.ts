import { Request, Response, NextFunction } from "express";
import { requestDuration } from "../utils/metrics";

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const duration = process.hrtime(start);
    const durationSeconds = duration[0] + duration[1] / 1e9;
    
    const route = req.route ? req.route.path : req.path;
    
    requestDuration.observe(
      {
        method: req.method,
        route: route,
        status_code: res.statusCode,
      },
      durationSeconds
    );
  });

  next();
};
