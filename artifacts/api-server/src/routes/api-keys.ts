/**
 * Developer API Keys management
 * GET    /api/developer/keys         → list user's keys
 * POST   /api/developer/keys         → create new key
 * DELETE /api/developer/keys/:id     → revoke key
 * GET    /api/developer/docs         → Swagger UI redirect
 */
import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

const KEY_PREFIX = "mr7_";

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = KEY_PREFIX + crypto.randomBytes(32).toString("base64url");
  const prefix = raw.slice(0, 12) + "...";
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { key: raw, prefix, hash };
}

/* ── GET /api/developer/keys ── */
router.get("/developer/keys", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT id, key_prefix, name, permissions, rate_limit_per_min, last_used_at, expires_at, is_active, created_at
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.authUser!.id],
    );
    res.json({ keys: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch keys" });
  }
});

/* ── POST /api/developer/keys ── */
router.post("/developer/keys", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, permissions, expiresInDays } = req.body as {
      name?: string; permissions?: string[]; expiresInDays?: number;
    };

    // Max 5 keys per user
    const { rows: existing } = await pool.query(
      "SELECT COUNT(*) as cnt FROM api_keys WHERE user_id = $1 AND is_active = true",
      [req.authUser!.id],
    );
    if (parseInt(existing[0].cnt) >= 5) {
      res.status(400).json({ error: "Maximum 5 active API keys allowed" });
      return;
    }

    const { key, prefix, hash } = generateApiKey();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { rows } = await pool.query(
      `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, permissions, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, key_prefix, name, permissions, expires_at, created_at`,
      [req.authUser!.id, hash, prefix, name || "My API Key", JSON.stringify(permissions ?? ["chat"]), expiresAt],
    );

    // Return key only once — user must save it
    res.status(201).json({ ...rows[0], key, warning: "Save this key now — it will not be shown again." });
  } catch {
    res.status(500).json({ error: "Failed to create API key" });
  }
});

/* ── DELETE /api/developer/keys/:id ── */
router.delete("/developer/keys/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rowCount } = await pool.query(
      "UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2",
      [req.params.id, req.authUser!.id],
    );
    if (!rowCount) { res.status(404).json({ error: "Key not found" }); return; }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to revoke key" });
  }
});

/* ── POST /api/developer/webhooks ── */
router.post("/developer/webhooks", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, events } = req.body as { url?: string; events?: string[] };
    if (!url) { res.status(400).json({ error: "URL required" }); return; }
    const secret = "whsec_" + crypto.randomBytes(24).toString("base64url");
    const { rows } = await pool.query(
      `INSERT INTO webhook_endpoints (user_id, url, events, secret)
       VALUES ($1, $2, $3, $4) RETURNING id, url, events, created_at`,
      [req.authUser!.id, url, JSON.stringify(events ?? ["task.done"]), secret],
    );
    res.status(201).json({ ...rows[0], secret, warning: "Save this secret now." });
  } catch {
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

/* ── GET /api/developer/webhooks ── */
router.get("/developer/webhooks", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT id, url, events, is_active, created_at FROM webhook_endpoints WHERE user_id = $1 ORDER BY created_at DESC",
      [req.authUser!.id],
    );
    res.json({ webhooks: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
});

export default router;
