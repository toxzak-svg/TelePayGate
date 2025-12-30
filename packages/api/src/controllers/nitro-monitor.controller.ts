import { Request, Response } from "express";
import { getDatabase } from "telepaygate-core";

export async function getMetrics(req: Request, res: Response) {
  try {
    const db = getDatabase();
    const rows = await db.manyOrNone(
      `SELECT 
        COUNT(*)::int as total_swaps,
        COALESCE(SUM(amount_in),0)::float as total_volume_in,
        COALESCE(SUM(amount_out),0)::float as total_volume_out,
        COALESCE(AVG(gas_used),0)::float as avg_gas_used,
        COUNT(*) FILTER (WHERE status = 'success')::int as success_count,
        COUNT(*) FILTER (WHERE status != 'success')::int as failure_count
      FROM swap_logs
      WHERE provider = 'nitro'`,
    );
    const r = rows?.[0] || {
      total_swaps: 0,
      total_volume_in: 0,
      total_volume_out: 0,
      avg_gas_used: 0,
      success_count: 0,
      failure_count: 0,
    };
    const successRate =
      (r.success_count * 100.0) /
      Math.max(1, r.success_count + r.failure_count);
    res.json({
      success: true,
      data: {
        ...r,
        success_rate: successRate,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: err.message },
    });
  }
}
