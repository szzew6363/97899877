/**
 * Personal Provider API Keys — AES-256-GCM Encrypted Storage
 * ────────────────────────────────────────────────────────────
 * Users can store their own AI provider API keys (OpenAI, Anthropic, Groq, etc.)
 * in the database. Keys are encrypted with AES-256-GCM before storage and
 * decrypted on retrieval ONLY for the authenticated owner.
 *
 * GET    /api/personal-keys            → list keys (names only, no raw values)
 * POST   /api/personal-keys            → store new encrypted key
 * GET    /api/personal-keys/:id/reveal → reveal decrypted key (owner only)
 * DELETE /api/personal-keys/:id        → delete key
 * PUT    /api/personal-keys/:id        → update (re-encrypt)
 */

import { Router, type Request, type Response } from "express";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth.js";
import { pool } from "../db.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { logSecurityEvent } from "../db.js";

const router = Router();
router.use(jwtAuth, requireAuth);

// Ensure table exists (idempotent)
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS personal_api_keys (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR NOT NULL,
      name VARCHAR NOT NULL DEFAULT 'My Key',
      encrypted_value TEXT NOT NULL,
      base_url VARCHAR,
      model_override VARCHAR,
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_personal_api_keys_user ON personal_api_keys(user_id, is_active);
  `);
}

function getIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
}

/* ── GET /api/personal-keys ── */
router.get("/personal-keys", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT id, provider, name, base_url, model_override, is_active, last_used_at, created_at
       FROM personal_api_keys
       WHERE user_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [req.authUser!.id],
    );
    // Never return the encrypted value in list view
    res.json({ ok: true, keys: rows });
  } catch (err) {
    logger.error({ err }, "[personal-keys] list error");
    res.status(500).json({ error: "Failed to list keys" });
  }
});

/* ── POST /api/personal-keys ── */
router.post("/personal-keys", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTable();
    const { provider, name, apiKey, baseUrl, modelOverride } = req.body as {
      provider?: string;
      name?: string;
      apiKey?: string;
      baseUrl?: string;
      modelOverride?: string;
    };

    if (!provider || !apiKey) {
      res.status(400).json({ error: "provider and apiKey are required" });
      return;
    }
    if (apiKey.length < 8 || apiKey.length > 500) {
      res.status(400).json({ error: "API key length invalid" });
      return;
    }

    // Check max 20 personal keys per user
    const { rows: existing } = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM personal_api_keys WHERE user_id=$1 AND is_active=true",
      [req.authUser!.id],
    );
    if ((existing[0]?.cnt ?? 0) >= 20) {
      res.status(400).json({ error: "Maximum 20 personal keys allowed" });
      return;
    }

    // Encrypt the API key value with AES-256-GCM
    const encryptedValue = encrypt(apiKey);

    const { rows } = await pool.query(
      `INSERT INTO personal_api_keys (user_id, provider, name, encrypted_value, base_url, model_override)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, provider, name, base_url, model_override, created_at`,
      [
        req.authUser!.id,
        provider.slice(0, 50),
        (name ?? "My Key").slice(0, 100),
        encryptedValue,
        baseUrl?.slice(0, 500) ?? null,
        modelOverride?.slice(0, 100) ?? null,
      ],
    );

    await logSecurityEvent({
      userId: req.authUser!.id,
      eventType: "personal_key.created",
      success: true,
      ipAddress: getIp(req),
      details: { provider, name },
    });

    res.status(201).json({ ok: true, key: rows[0] });
  } catch (err) {
    logger.error({ err }, "[personal-keys] create error");
    res.status(500).json({ error: "Failed to store key" });
  }
});

/* ── GET /api/personal-keys/:id/reveal ── */
router.get("/personal-keys/:id/reveal", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      "SELECT * FROM personal_api_keys WHERE id=$1 AND user_id=$2 AND is_active=true",
      [req.params.id, req.authUser!.id],
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Key not found" });
      return;
    }

    // Decrypt only for the authenticated owner
    const decrypted = decrypt(rows[0].encrypted_value);

    // Update last_used_at
    await pool.query("UPDATE personal_api_keys SET last_used_at=NOW() WHERE id=$1", [rows[0].id]);

    await logSecurityEvent({
      userId: req.authUser!.id,
      eventType: "personal_key.revealed",
      success: true,
      ipAddress: getIp(req),
      details: { keyId: rows[0].id, provider: rows[0].provider },
    });

    res.json({
      ok: true,
      id: rows[0].id,
      provider: rows[0].provider,
      name: rows[0].name,
      apiKey: decrypted,
      baseUrl: rows[0].base_url,
      modelOverride: rows[0].model_override,
    });
  } catch (err) {
    logger.error({ err }, "[personal-keys] reveal error");
    res.status(500).json({ error: "Failed to reveal key" });
  }
});

/* ── PUT /api/personal-keys/:id ── */
router.put("/personal-keys/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTable();
    const { name, apiKey, baseUrl, modelOverride } = req.body as {
      name?: string;
      apiKey?: string;
      baseUrl?: string;
      modelOverride?: string;
    };

    // Fetch existing to verify ownership
    const { rows: existing } = await pool.query(
      "SELECT id, encrypted_value FROM personal_api_keys WHERE id=$1 AND user_id=$2 AND is_active=true",
      [req.params.id, req.authUser!.id],
    );
    if (!existing[0]) {
      res.status(404).json({ error: "Key not found" });
      return;
    }

    // Re-encrypt if new value provided
    const encryptedValue = apiKey ? encrypt(apiKey) : existing[0].encrypted_value;

    const { rows } = await pool.query(
      `UPDATE personal_api_keys
       SET name=COALESCE($1, name),
           encrypted_value=$2,
           base_url=COALESCE($3, base_url),
           model_override=COALESCE($4, model_override),
           updated_at=NOW()
       WHERE id=$5 AND user_id=$6
       RETURNING id, provider, name, base_url, model_override, updated_at`,
      [
        name?.slice(0, 100) ?? null,
        encryptedValue,
        baseUrl?.slice(0, 500) ?? null,
        modelOverride?.slice(0, 100) ?? null,
        req.params.id,
        req.authUser!.id,
      ],
    );

    res.json({ ok: true, key: rows[0] });
  } catch (err) {
    logger.error({ err }, "[personal-keys] update error");
    res.status(500).json({ error: "Failed to update key" });
  }
});

/* ── DELETE /api/personal-keys/:id ── */
router.delete("/personal-keys/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTable();
    const { rowCount } = await pool.query(
      "UPDATE personal_api_keys SET is_active=false WHERE id=$1 AND user_id=$2",
      [req.params.id, req.authUser!.id],
    );
    if (!rowCount) {
      res.status(404).json({ error: "Key not found" });
      return;
    }

    await logSecurityEvent({
      userId: req.authUser!.id,
      eventType: "personal_key.deleted",
      success: true,
      ipAddress: getIp(req),
      details: { keyId: req.params.id },
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[personal-keys] delete error");
    res.status(500).json({ error: "Failed to delete key" });
  }
});

export default router;
