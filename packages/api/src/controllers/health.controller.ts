import { Request, Response } from 'express';

export class HealthController {
  /**
   * GET /health
   */
  static async check(req: Request, res: Response) {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
}

export default HealthController;
