/**
 * Subscriptions — server-side activation code verification
 * POST /api/subscriptions/activate  → verify code & activate subscription
 * GET  /api/subscriptions/status    → get current subscription status for user
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";
import crypto from "crypto";

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET;

/* ── POST /api/subscriptions/activate ── */
router.post("/subscriptions/activate", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) { res.status(400).json({ error: "Code required" }); return; }

    if (!ADMIN_SECRET) {
      // Fallback: client-side codes only (no server secret configured)
      res.status(503).json({ error: "Server-side activation not configured. Set ADMIN_SECRET env var." });
      return;
    }

    // Decode the activation code
    const padded = code.toLowerCase() + "=".repeat((4 - (code.length % 4)) % 4);
    let decoded: string;
    try {
      decoded = Buffer.from(padded, "base64").toString("utf-8");
    } catch {
      res.status(400).json({ error: "Invalid activation code format" });
      return;
    }

    const parts = decoded.split("|");
    if (parts.length !== 3) { res.status(400).json({ error: "Invalid code structure" }); return; }

    const [tier, expiryStr, secret] = parts;
    if (secret !== ADMIN_SECRET) { res.status(403).json({ error: "Invalid or tampered code" }); return; }

    const expiresAt = parseInt(expiryStr, 10);
    if (isNaN(expiresAt)) { res.status(400).json({ error: "Invalid expiry in code" }); return; }
    if (Date.now() > expiresAt) { res.status(400).json({ error: "Activation code has expired" }); return; }

    const validTiers = ["free", "starter", "professional", "elite"];
    if (!validTiers.includes(tier)) { res.status(400).json({ error: "Invalid tier in code" }); return; }

    // Update user subscription in DB
    const userId = req.authUser!.id;
    await pool.query(
      `UPDATE users
       SET subscription = $1,
           subscription_activated_at = NOW(),
           subscription_expires_at = to_timestamp($2 / 1000.0),
           tokens_limit = $3,
           tokens_used = 0,
           updated_at = NOW()
       WHERE id = $4`,
      [
        tier,
        expiresAt,
        tierTokenLimit(tier),
        userId,
      ],
    );

    // Create notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'subscription', $2, $3, $4)`,
      [
        userId,
        `تم تفعيل خطة ${tierLabel(tier)} بنجاح`,
        `اشتراكك ساري حتى ${new Date(expiresAt).toLocaleDateString("ar")}`,
        JSON.stringify({ tier, expiresAt }),
      ],
    ).catch(() => {}); // silent if notifications table not ready

    res.json({
      ok: true,
      tier,
      expiresAt,
      tokensLimit: tierTokenLimit(tier),
      message: `Subscription activated: ${tierLabel(tier)}`,
    });
  } catch {
    res.status(500).json({ error: "Failed to activate subscription" });
  }
});

/* ── GET /api/subscriptions/status ── */
router.get("/subscriptions/status", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT subscription, subscription_activated_at, subscription_expires_at,
              tokens_used, tokens_limit
       FROM users WHERE id = $1`,
      [req.authUser!.id],
    );
    if (!rows.length) { res.status(404).json({ error: "User not found" }); return; }
    const u = rows[0];
    res.json({
      tier: u.subscription ?? "free",
      activatedAt: u.subscription_activated_at,
      expiresAt: u.subscription_expires_at,
      tokensUsed: u.tokens_used ?? 0,
      tokensLimit: u.tokens_limit ?? tierTokenLimit(u.subscription ?? "free"),
      isExpired: u.subscription_expires_at ? new Date(u.subscription_expires_at) < new Date() : false,
    });
  } catch {
    res.status(500).json({ error: "Failed to get subscription status" });
  }
});

function tierTokenLimit(tier: string): number {
  const limits: Record<string, number> = {
    free: 10_000, starter: 300_000, professional: 1_500_000, elite: 3_000_000,
  };
  return limits[tier] ?? 10_000;
}
function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    free: "Free", starter: "Starter", professional: "Professional", elite: "Elite",
  };
  return labels[tier] ?? tier;
}

export default router;
