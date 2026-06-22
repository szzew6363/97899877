/**
 * Admin API — secured via env var ADMIN_SECRET (never in code)
 * POST /api/admin/verify          → verify admin password
 * POST /api/admin/activate-user   → manually activate a user's subscription
 * GET  /api/admin/stats           → platform stats
 * GET  /api/admin/users           → list users (paginated)
 * GET  /api/admin/errors          → recent error log
 * POST /api/admin/generate-code   → generate activation code
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import crypto from "crypto";

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function verifyAdmin(req: Request, res: Response): boolean {
  if (!ADMIN_SECRET) {
    res.status(503).json({ error: "Admin not configured. Set ADMIN_SECRET env var." });
    return false;
  }
  const body = req.body as Record<string, unknown>;
  const provided = req.headers["x-admin-secret"] as string | undefined
    || body?.adminSecret as string | undefined
    || body?.password as string | undefined;
  if (!provided || provided !== ADMIN_SECRET) {
    res.status(403).json({ error: "Invalid admin credentials" });
    return false;
  }
  return true;
}

/* ── POST /api/admin/verify ── */
router.post("/admin/verify", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  res.json({ ok: true, message: "Admin access granted" });
});

/* ── POST /api/admin/gen-code ── generate activation code server-side ── */
router.post("/admin/gen-code", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { tier = "starter", days = 30 } = req.body as { tier?: string; days?: number };
    const validTiers = ["free", "starter", "professional", "elite"];
    if (!validTiers.includes(tier)) { res.status(400).json({ error: "Invalid tier" }); return; }
    const expiry = Date.now() + Math.min(3650, Math.max(1, days)) * 86_400_000;
    const raw    = `${tier}|${expiry}|${ADMIN_SECRET}`;
    const encoded = Buffer.from(raw).toString("base64").replace(/=/g, "");
    const code = encoded.toUpperCase().slice(0, 32);
    res.json({ code, tier, expiry, daysValid: days });
  } catch {
    res.status(500).json({ error: "Failed to generate code" });
  }
});

/* ── GET /api/admin/stats ── */
router.get("/admin/stats", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const [users, subs, tokens, scans] = await Promise.all([
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h') as today FROM users"),
      pool.query("SELECT subscription, COUNT(*) as cnt FROM users GROUP BY subscription"),
      pool.query("SELECT SUM(tokens_used) as total_tokens FROM users"),
      pool.query("SELECT COUNT(*) as total FROM scan_results"),
    ]);

    res.json({
      users: {
        total: parseInt(users.rows[0].total),
        today: parseInt(users.rows[0].today),
      },
      subscriptions: subs.rows.reduce((acc, r) => ({ ...acc, [r.subscription]: parseInt(r.cnt) }), {}),
      totalTokensUsed: parseInt(tokens.rows[0].total_tokens) || 0,
      totalScans: parseInt(scans.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* ── GET /api/admin/users ── */
router.get("/admin/users", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const page = parseInt(req.query["page"] as string) || 1;
    const limit = Math.min(parseInt(req.query["limit"] as string) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query["search"] as string || "";

    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, role, subscription,
              subscription_expires_at, tokens_used, tokens_limit,
              last_login_at, created_at
       FROM users
       WHERE ($1 = '' OR email ILIKE $1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [search ? `%${search}%` : "", limit, offset],
    );
    const { rows: cnt } = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE ($1 = '' OR email ILIKE $1)",
      [search ? `%${search}%` : ""],
    );

    res.json({ users: rows, total: parseInt(cnt[0].total), page, limit });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/* ── POST /api/admin/activate-user ── */
router.post("/admin/activate-user", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { userId, subscription, durationDays = 30 } = req.body as {
      userId?: string;
      subscription?: string;
      durationDays?: number;
    };
    if (!userId || !subscription) {
      res.status(400).json({ error: "userId and subscription required" });
      return;
    }
    const tokenLimits: Record<string, number> = {
      free: 50_000, pro: 500_000, enterprise: 5_000_000,
    };
    const expiresAt = new Date(Date.now() + durationDays * 86400 * 1000);
    await pool.query(
      `UPDATE users
       SET subscription = $1,
           subscription_expires_at = $2,
           tokens_limit = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [subscription, expiresAt, tokenLimits[subscription] ?? 50_000, userId],
    );
    // Send notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1, 'subscription', '🎉 تم تفعيل اشتراكك!', $2)`,
      [userId, `اشتراك ${subscription} نشط حتى ${expiresAt.toLocaleDateString("ar")}`],
    );
    res.json({ ok: true, expiresAt });
  } catch (err) {
    res.status(500).json({ error: "Failed to activate subscription" });
  }
});

/* ── POST /api/admin/generate-code ── */
router.post("/admin/generate-code", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  try {
    const { tier, durationDays = 30 } = req.body as { tier?: string; durationDays?: number };
    if (!tier) { res.status(400).json({ error: "tier required" }); return; }

    const expiry = Date.now() + durationDays * 86400 * 1000;
    const secret = ADMIN_SECRET!;
    const raw = `${tier}|${expiry}|${secret}`;
    const code = Buffer.from(raw).toString("base64");

    res.json({ code, tier, expiresAt: new Date(expiry).toISOString() });
  } catch {
    res.status(500).json({ error: "Failed to generate code" });
  }
});

/* ── POST /api/admin/verify-code ── (public — used by clients) */
router.post("/admin/verify-code", async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body as { code?: string };
    if (!code || !ADMIN_SECRET) { res.status(400).json({ valid: false }); return; }

    const raw = Buffer.from(code, "base64").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 3) { res.json({ valid: false }); return; }

    const [tier, expiryStr, secret] = parts;
    if (secret !== ADMIN_SECRET) { res.json({ valid: false }); return; }

    const expiry = parseInt(expiryStr);
    if (isNaN(expiry) || Date.now() > expiry) {
      res.json({ valid: false, reason: "expired" }); return;
    }

    res.json({ valid: true, tier, expiresAt: new Date(expiry).toISOString() });
  } catch {
    res.json({ valid: false });
  }
});

/* ── In-memory error log (last 500 errors) ── */
export const errorLog: Array<{ ts: string; level: string; message: string; stack?: string }> = [];
export function logError(level: string, message: string, stack?: string) {
  errorLog.unshift({ ts: new Date().toISOString(), level, message, stack });
  if (errorLog.length > 500) errorLog.splice(500);
}

/* ── GET /api/admin/errors ── */
router.get("/admin/errors", async (req: Request, res: Response): Promise<void> => {
  if (!verifyAdmin(req, res)) return;
  const limit = Math.min(parseInt(req.query["limit"] as string) || 50, 200);
  res.json({ errors: errorLog.slice(0, limit), total: errorLog.length });
});

/* ── POST /api/admin/log-error ── (called by frontend) */
router.post("/admin/log-error", async (req: Request, res: Response): Promise<void> => {
  try {
    const { level = "error", message, stack } = req.body as {
      level?: string; message?: string; stack?: string;
    };
    if (message) logError(level, message, stack);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
