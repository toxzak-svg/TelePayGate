import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});
