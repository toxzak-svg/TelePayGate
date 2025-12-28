import { Request, Response } from "express";
import { NitroSwapsService } from "telepaygate-core/services/nitroswaps.service";

const nitroService = new NitroSwapsService();

export async function getQuote(req: Request, res: Response) {
  try {
    const { fromToken, toToken, amount } = req.body || {};
    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "amount must be > 0" },
      });
      return;
    }
    if (!fromToken || !toToken) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "tokens required" },
      });
      return;
    }
    const quote = await nitroService.getQuote(fromToken, toToken, amount);
    res.json({ success: true, data: quote });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    });
  }
}

export async function createSwap(req: Request, res: Response) {
  try {
    const { fromToken, toToken, amount, minReceive, referenceId } =
      req.body || {};
    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "amount must be > 0" },
      });
      return;
    }
    if (typeof minReceive !== "number" || minReceive <= 0) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "minReceive must be > 0" },
      });
      return;
    }
    if (!fromToken || !toToken) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "tokens required" },
      });
      return;
    }
    const userId = (req as any).user?.id || null;
    const result = await nitroService.executeSwap({
      fromToken,
      toToken,
      amount,
      minReceive,
      chain: "TON",
      referenceId,
      userId,
    });
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: result.error || "SWAP_FAILED" },
      });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    });
  }
}

export async function getSwapStatus(req: Request, res: Response) {
  try {
    const { txHash } = req.params;
    if (!txHash) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "txHash required" },
      });
      return;
    }
    const status = await nitroService.getStatusByTx(txHash);
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    });
  }
}
