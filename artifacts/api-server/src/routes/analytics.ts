/**
 * Analytics & Usage Dashboard — System #10
 * Personal and admin analytics, usage trends, model stats
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

function verifyAdmin(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  const provided = req.headers["x-admin-secret"] as string || (req.body as Record<string, string>)?.adminSecret;
  return !!(secret && provided === secret);
}

// ── GET /api/analytics/me — Personal usage analytics ─────────────────────────
router.get("/analytics/me", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Math.min(parseInt(req.query["days"] as string) || 30, 90);

    const [daily, models, totals] = await Promise.all([
      pool.query(
        `SELECT date_trunc('day', created_at) as day,
                SUM(tokens_used) as tokens,
                COUNT(*) as requests
         FROM usage_stats WHERE user_id=$1 AND created_at > NOW() - ($2 || ' days')::interval
         GROUP BY 1 ORDER BY 1 ASC`,
        [req.authUser!.id, days]
      ),
      pool.query(
        `SELECT model, SUM(tokens_used) as tokens, COUNT(*) as requests
         FROM usage_stats WHERE user_id=$1 AND created_at > NOW() - ($2 || ' days')::interval
         GROUP BY model ORDER BY tokens DESC LIMIT 10`,
        [req.authUser!.id, days]
      ),
      pool.query(
        `SELECT u.tokens_used, u.tokens_limit, u.subscription,
                (SELECT COUNT(*) FROM usage_stats WHERE user_id=$1) as total_requests,
                (SELECT COALESCE(SUM(amount),0) FROM invoices WHERE user_id=$1 AND status='paid') as total_spent
         FROM users u WHERE u.id=$1`,
        [req.authUser!.id]
      ),
    ]);

    res.json({
      daily: daily.rows,
      topModels: models.rows,
      totals: totals.rows[0],
      period: days,
    });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── GET /api/analytics/admin — Admin platform analytics ──────────────────────
router.get("/analytics/admin", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req)) { res.status(403).json({ error: "Unauthorized" }); return; }
  try {
    const [growth, revenue, topUsers, modelUsage, retention] = await Promise.all([
      pool.query(`
        SELECT date_trunc('day', created_at) as day, COUNT(*) as signups
        FROM users WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1 ASC`),
      pool.query(`
        SELECT date_trunc('day', created_at) as day, SUM(amount) as revenue
        FROM invoices WHERE status='paid' AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1 ASC`),
      pool.query(`
        SELECT u.email, u.subscription, u.tokens_used, u.last_login_at
        FROM users u ORDER BY u.tokens_used DESC LIMIT 20`),
      pool.query(`
        SELECT model, SUM(tokens_used) as tokens, COUNT(*) as requests
        FROM usage_stats WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY model ORDER BY tokens DESC LIMIT 10`),
      pool.query(`
        SELECT subscription, COUNT(*) as cnt FROM users GROUP BY subscription`),
    ]);

    const { rows: summary } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW()-INTERVAL '30d') as new_users_30d,
        (SELECT COALESCE(SUM(amount),0) FROM invoices WHERE status='paid') as total_revenue,
        (SELECT COALESCE(SUM(tokens_used),0) FROM users) as total_tokens_used,
        (SELECT COUNT(*) FROM users WHERE last_login_at > NOW()-INTERVAL '7d') as active_7d`);

    res.json({
      summary: summary[0],
      growth: growth.rows,
      revenue: revenue.rows,
      topUsers: topUsers.rows,
      modelUsage: modelUsage.rows,
      retention: retention.rows,
    });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── GET /api/analytics/rate-status — Current user rate limit status ─────────
router.get("/analytics/rate-status", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.authUser.id;
    const tier = req.authUser.subscription || "free";

    const TIER_LIMITS: Record<string, { rpm: number; rpd: number; tokens: number }> = {
      free:         { rpm: 10,   rpd: 100,    tokens: 50_000 },
      starter:      { rpm: 100,  rpd: 1000,   tokens: 200_000 },
      pro:          { rpm: 500,  rpd: 10000,  tokens: 500_000 },
      professional: { rpm: 500,  rpd: 10000,  tokens: 1_000_000 },
      elite:        { rpm: 2000, rpd: -1,     tokens: 5_000_000 },
      enterprise:   { rpm: 2000, rpd: -1,     tokens: -1 },
    };
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    const [todayRow, minuteRow, userRow] = await Promise.all([
      pool.query(`SELECT COUNT(*) as cnt FROM usage_stats WHERE user_id=$1 AND created_at > NOW()-INTERVAL '24h'`, [userId]).catch(() => ({ rows: [{ cnt: 0 }] })),
      pool.query(`SELECT COUNT(*) as cnt FROM usage_stats WHERE user_id=$1 AND created_at > NOW()-INTERVAL '1 min'`, [userId]).catch(() => ({ rows: [{ cnt: 0 }] })),
      pool.query(`SELECT tokens_used, tokens_limit, subscription FROM users WHERE id=$1`, [userId]).catch(() => ({ rows: [] })),
    ]);

    const user = userRow.rows[0] || {};
    res.json({
      tier,
      requestsPerMin: limits.rpm,
      requestsPerDay: limits.rpd,
      tokensPerMonth: limits.tokens,
      usedToday: Number(todayRow.rows[0]?.cnt || 0),
      usedThisMinute: Number(minuteRow.rows[0]?.cnt || 0),
      tokensUsed: Number(user.tokens_used || 0),
      tokensLimit: Number(user.tokens_limit || limits.tokens),
      resetMinute: 60,
      resetDay: 86400,
    });
  } catch { res.status(500).json({ error: "Failed to fetch rate status" }); }
});

// ── GET /api/analytics/realtime — Live stats (last 5 min) ────────────────────
router.get("/analytics/realtime", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req)) { res.status(403).json({ error: "Unauthorized" }); return; }
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM usage_stats WHERE created_at > NOW()-INTERVAL '5 min') as requests_5m,
        (SELECT COALESCE(SUM(tokens_used),0) FROM usage_stats WHERE created_at > NOW()-INTERVAL '5 min') as tokens_5m,
        (SELECT COUNT(*) FROM users WHERE last_login_at > NOW()-INTERVAL '15 min') as active_users_15m,
        (SELECT COUNT(*) FROM error_logs WHERE created_at > NOW()-INTERVAL '5 min') as errors_5m`);

    res.json({ realtime: rows[0], timestamp: new Date().toISOString() });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
