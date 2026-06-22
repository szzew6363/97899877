/**
 * Error Monitoring & System Health — System #13
 * Real error tracking, performance metrics, uptime monitoring
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";
import os from "os";

const router = Router();

function verifyAdmin(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided = req.headers["x-admin-secret"] as string || (req.body as Record<string, string>)?.adminSecret;
  return provided === secret;
}

// ── POST /api/monitoring/error — Client-side error reporting ──────────────────
router.post("/monitoring/error", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, stack, url, component, severity = "error" } = req.body as Record<string, string>;
    await pool.query(
      `INSERT INTO error_logs (user_id, message, stack_trace, url, component, severity, environment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'production', NOW())`,
      [req.authUser?.id || null, message, stack || null, url || null, component || null, severity]
    );
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
});

// ── GET /api/monitoring/errors — Admin: recent errors ────────────────────────
router.get("/monitoring/errors", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req)) { res.status(403).json({ error: "Unauthorized" }); return; }
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 50, 200);
    const severity = req.query["severity"] as string || null;

    const { rows } = await pool.query(
      `SELECT el.*, u.email as user_email
       FROM error_logs el LEFT JOIN users u ON u.id=el.user_id
       WHERE ($1::text IS NULL OR el.severity=$1)
       ORDER BY el.created_at DESC LIMIT $2`,
      [severity, limit]
    );
    res.json({ errors: rows });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── GET /api/monitoring/health — Detailed system health ──────────────────────
router.get("/monitoring/health", async (req: Request, res: Response): Promise<void> => {
  try {
    const start = Date.now();
    let dbOk = false;
    let dbLatency = 0;
    try {
      const t = Date.now();
      await pool.query("SELECT 1");
      dbLatency = Date.now() - t;
      dbOk = true;
    } catch { /* */ }

    const mem = process.memoryUsage();
    const cpuLoad = os.loadavg();

    const { rows: stats } = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24h') as new_users_24h,
        (SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL '24h') as active_24h,
        (SELECT SUM(tokens_used) FROM users) as total_tokens_used,
        (SELECT COUNT(*) FROM error_logs WHERE created_at > NOW() - INTERVAL '1h') as errors_1h,
        (SELECT COUNT(*) FROM error_logs WHERE severity='critical' AND created_at > NOW() - INTERVAL '24h') as critical_errors_24h`
    );

    res.json({
      status: dbOk ? "healthy" : "degraded",
      uptime: process.uptime(),
      responseTime: Date.now() - start,
      database: { ok: dbOk, latency: dbLatency },
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      cpu: { load1: cpuLoad[0], load5: cpuLoad[1], load15: cpuLoad[2] },
      platform: { node: process.version, os: os.platform(), arch: os.arch() },
      stats: stats[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: String(err) });
  }
});

// ── GET /api/monitoring/metrics — Time-series metrics ────────────────────────
router.get("/monitoring/metrics", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req)) { res.status(403).json({ error: "Unauthorized" }); return; }
  try {
    const [hourly, daily, errorTrend] = await Promise.all([
      pool.query(`
        SELECT date_trunc('hour', created_at) as hour, COUNT(*) as requests, SUM(tokens_used) as tokens
        FROM usage_stats WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY 1 ORDER BY 1 ASC`),
      pool.query(`
        SELECT date_trunc('day', created_at) as day, COUNT(*) as new_users
        FROM users WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1 ASC`),
      pool.query(`
        SELECT date_trunc('hour', created_at) as hour, severity, COUNT(*) as cnt
        FROM error_logs WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY 1, 2 ORDER BY 1 ASC`),
    ]);

    res.json({
      hourlyUsage: hourly.rows,
      dailySignups: daily.rows,
      errorTrend: errorTrend.rows,
    });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── POST /api/monitoring/alert — Log alert/event ─────────────────────────────
router.post("/monitoring/alert", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req)) { res.status(403).json({ error: "Unauthorized" }); return; }
  try {
    const { title, message, severity = "warning" } = req.body as Record<string, string>;
    await pool.query(
      "INSERT INTO error_logs (message, severity, environment, created_at) VALUES ($1, $2, 'system', NOW())",
      [`[ALERT] ${title}: ${message}`, severity]
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
