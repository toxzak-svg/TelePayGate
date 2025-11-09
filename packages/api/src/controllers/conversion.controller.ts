import { Router, Request, Response } from 'express';

export const conversionRouter = Router();

conversionRouter.get('/', async (req: Request, res: Response) => {
  res.json({ message: 'Conversion API - Coming soon' });
});
