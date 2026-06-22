/**
 * Stripe payment integration
 * - POST /api/stripe/create-checkout   → create Stripe checkout session
 * - POST /api/stripe/webhook           → receive Stripe events (raw body required)
 * - GET  /api/stripe/plans             → list available plans
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || "https://mr7.ai";

const PLANS = [
  {
    id: "free",
    name: "مجاني",
    nameEn: "Free",
    price: 0,
    currency: "usd",
    tokensLimit: 50_000,
    features: ["50K token/شهر", "نماذج أساسية", "Chat + Code mode"],
    stripePriceId: null,
  },
  {
    id: "pro",
    name: "محترف",
    nameEn: "Pro",
    price: 19,
    currency: "usd",
    tokensLimit: 500_000,
    features: ["500K token/شهر", "جميع النماذج", "Council + Godmode", "API access", "دعم أولوي"],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
  },
  {
    id: "enterprise",
    name: "مؤسسي",
    nameEn: "Enterprise",
    price: 99,
    currency: "usd",
    tokensLimit: 5_000_000,
    features: ["5M token/شهر", "جميع الأدوات", "Team collaboration", "RAG & Long Memory", "SLA 99.9%", "دعم مخصص"],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
  },
];

/* ── GET /api/stripe/plans ── */
router.get("/stripe/plans", (_req: Request, res: Response) => {
  res.json({ plans: PLANS });
});

/* ── POST /api/stripe/create-checkout ── */
router.post("/stripe/create-checkout", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Stripe not configured. Set STRIPE_SECRET_KEY env var." });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });

    const { planId } = req.body as { planId?: string };
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || !plan.stripePriceId) {
      res.status(400).json({ error: "Invalid or unconfigured plan" });
      return;
    }

    const user = req.authUser!;

    // Get or create Stripe customer
    let customerId: string | undefined;
    const { rows } = await pool.query("SELECT stripe_customer_id FROM users WHERE id = $1", [user.id]);
    if (rows[0]?.stripe_customer_id) {
      customerId = rows[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [customerId, user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${APP_URL}/app?payment=success&plan=${plan.id}`,
      cancel_url: `${APP_URL}/app?payment=cancelled`,
      metadata: { userId: user.id, planId: plan.id },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

/* ── POST /api/stripe/webhook ── raw body required */
router.post(
  "/stripe/webhook",
  async (req: Request, res: Response): Promise<void> => {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      res.status(200).json({ received: true }); // Don't fail silently
      return;
    }

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });

      const sig = req.headers["stripe-signature"] as string;
      let event: import("stripe").Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body as Buffer, sig, STRIPE_WEBHOOK_SECRET);
      } catch {
        res.status(400).json({ error: "Invalid webhook signature" });
        return;
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const plan = PLANS.find(p => p.id === planId);

        if (userId && plan) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await pool.query(
            `UPDATE users SET
               subscription = $1,
               subscription_expires_at = $2,
               tokens_limit = $3,
               stripe_subscription_id = $4,
               tokens_used = 0,
               updated_at = NOW()
             WHERE id = $5`,
            [plan.id, expiresAt.toISOString(), plan.tokensLimit, session.subscription, userId],
          );

          await pool.query(
            `INSERT INTO notifications (user_id, type, title, body, data)
             VALUES ($1, 'subscription_activated', '🎉 تم تفعيل اشتراكك!', $2, $3)`,
            [
              userId,
              `تم تفعيل خطة "${plan.name}" بنجاح. لديك الآن ${(plan.tokensLimit / 1000).toFixed(0)}K token.`,
              JSON.stringify({ planId: plan.id, expiresAt }),
            ],
          );
        }
      } else if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        await pool.query(
          `UPDATE users SET subscription = 'free', tokens_limit = 50000, stripe_subscription_id = NULL
           WHERE stripe_subscription_id = $1`,
          [sub.id],
        );
      } else if (event.type === "invoice.payment_failed") {
        const inv = event.data.object as (import("stripe").Stripe.Invoice & { subscription?: string | { id?: string } | null });
        const subId = typeof inv.subscription === "string" ? inv.subscription : (inv.subscription as { id?: string } | null)?.id;
        if (subId) {
          const { rows } = await pool.query(
            "SELECT id FROM users WHERE stripe_subscription_id = $1",
            [subId],
          );
          if (rows[0]) {
            await pool.query(
              `INSERT INTO notifications (user_id, type, title, body)
               VALUES ($1, 'payment_failed', '❌ فشل الدفع', 'فشل تجديد اشتراكك. يرجى تحديث بيانات بطاقتك.')`,
              [rows[0].id],
            );
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  },
);

/* ── GET /api/stripe/portal ── Customer portal for managing subscription */
router.get("/stripe/portal", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!STRIPE_SECRET_KEY) { res.status(503).json({ error: "Stripe not configured" }); return; }
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });
    const { rows } = await pool.query("SELECT stripe_customer_id FROM users WHERE id = $1", [req.authUser!.id]);
    if (!rows[0]?.stripe_customer_id) { res.status(400).json({ error: "No billing account" }); return; }
    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: `${APP_URL}/app`,
    });
    res.json({ url: session.url });
  } catch {
    res.status(500).json({ error: "Failed to open billing portal" });
  }
});

export default router;
