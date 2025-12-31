import { Router } from "express";
import { createRateLimiter } from "../middleware/ratelimit.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { getQuote, createSwap, getSwapStatus } from "../controllers/nitro.controller";
import { getMetrics } from "../controllers/nitro-monitor.controller";
import { requireDashboardRole } from "../middleware/role.middleware";

const router = Router();
const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 20 });

router.use(limiter);
router.use(authenticate);

router.post("/quote", getQuote);
router.post("/swaps", createSwap);
router.get("/swaps/:txHash", getSwapStatus);
router.get("/metrics", requireDashboardRole("admin"), getMetrics);

export default router;
