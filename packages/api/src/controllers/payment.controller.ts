import { Router, Request, Response } from 'express';

export const paymentRouter = Router();

paymentRouter.get('/', async (req: Request, res: Response) => {
  res.json({ message: 'Payment API - Coming soon' });
});

paymentRouter.post('/', async (req: Request, res: Response) => {
  res.json({ message: 'Create payment - Coming soon' });
});
