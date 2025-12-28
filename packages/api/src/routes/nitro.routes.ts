import { Router } from "express";
import { createRateLimiter } from "../middleware/ratelimit.middleware";
import { authenticateApiKey } from "../middleware/auth.middleware";
import { getQuote, createSwap, getSwapStatus } from "../controllers/nitro.controller";

const router = Router();
const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 20 });

router.use(limiter);
router.use(authenticateApiKey);

router.post("/quote", getQuote);
router.post("/swaps", createSwap);
router.get("/swaps/:txHash", getSwapStatus);

export default router;
