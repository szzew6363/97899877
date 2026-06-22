/**
 * Billing & Invoices — System #18
 * Full billing history, invoice generation, usage-based billing
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

// ── GET /api/billing/invoices ─────────────────────────────────────────────────
router.get("/billing/invoices", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 20, 100);
    const offset = parseInt(req.query["offset"] as string) || 0;

    const { rows } = await pool.query(
      `SELECT id, amount, currency, status, description, period_start, period_end,
              stripe_invoice_id, pdf_url, created_at
       FROM invoices WHERE user_id=$1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.authUser!.id, limit, offset]
    );
    const { rows: cnt } = await pool.query("SELECT COUNT(*) as total FROM invoices WHERE user_id=$1", [req.authUser!.id]);
    res.json({ invoices: rows, total: parseInt(cnt[0].total), limit, offset });
  } catch { res.status(500).json({ error: "Failed to fetch invoices" }); }
});

// ── GET /api/billing/invoices/:id ─────────────────────────────────────────────
router.get("/billing/invoices/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, u.email, u.first_name, u.last_name
       FROM invoices i JOIN users u ON u.id=i.user_id
       WHERE i.id=$1 AND i.user_id=$2`,
      [req.params.id, req.authUser!.id]
    );
    if (!rows.length) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json({ invoice: rows[0] });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── GET /api/billing/subscription ────────────────────────────────────────────
router.get("/billing/subscription", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT u.subscription, u.subscription_expires_at, u.tokens_used, u.tokens_limit,
              s.stripe_subscription_id, s.stripe_customer_id, s.status as sub_status,
              s.current_period_start, s.current_period_end, s.cancel_at_period_end
       FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id
       WHERE u.id=$1`,
      [req.authUser!.id]
    );
    if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }

    const usage_percent = rows[0].tokens_limit > 0
      ? Math.round((rows[0].tokens_used / rows[0].tokens_limit) * 100)
      : 0;

    res.json({ subscription: { ...rows[0], usage_percent } });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── GET /api/billing/usage ────────────────────────────────────────────────────
router.get("/billing/usage", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT date_trunc('day', created_at) as day, SUM(tokens_used) as tokens, COUNT(*) as requests
       FROM usage_stats WHERE user_id=$1 AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY 1 ORDER BY 1 ASC`,
      [req.authUser!.id]
    );

    const { rows: summary } = await pool.query(
      `SELECT tokens_used, tokens_limit,
              ROUND(tokens_used::numeric / NULLIF(tokens_limit, 0) * 100, 1) as pct
       FROM users WHERE id=$1`,
      [req.authUser!.id]
    );

    res.json({ daily: rows, summary: summary[0] });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── POST /api/billing/cancel ──────────────────────────────────────────────────
router.post("/billing/cancel", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT stripe_subscription_id FROM subscriptions WHERE user_id=$1",
      [req.authUser!.id]
    );
    if (!rows.length || !rows[0].stripe_subscription_id) {
      res.status(400).json({ error: "No active subscription" }); return;
    }

    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_KEY) { res.status(503).json({ error: "Stripe not configured" }); return; }

    const stripe = await import("stripe").then(m => new m.default(STRIPE_KEY));
    await stripe.subscriptions.update(rows[0].stripe_subscription_id, { cancel_at_period_end: true });
    await pool.query("UPDATE subscriptions SET cancel_at_period_end=true WHERE user_id=$1", [req.authUser!.id]);

    res.json({ ok: true, message: "Subscription will cancel at end of billing period" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// ── GET /api/billing/portal ───────────────────────────────────────────────────
router.get("/billing/portal", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_KEY) { res.status(503).json({ error: "Stripe not configured" }); return; }

    const { rows } = await pool.query("SELECT stripe_customer_id FROM subscriptions WHERE user_id=$1", [req.authUser!.id]);
    if (!rows.length || !rows[0].stripe_customer_id) {
      res.status(400).json({ error: "No billing account found" }); return;
    }

    const stripe = await import("stripe").then(m => new m.default(STRIPE_KEY));
    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: process.env.APP_URL || "https://mr7.ai",
    });
    res.json({ url: session.url });
  } catch { res.status(500).json({ error: "Failed to create portal session" }); }
});

export default router;
