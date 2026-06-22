/**
 * Long-term Memory System — System #4
 * User memory CRUD with semantic search, tagging, and auto-summarization
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

// ── GET /api/memory — list memories ──────────────────────────────────────────
router.get("/memory", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 50, 200);
    const offset = parseInt(req.query["offset"] as string) || 0;
    const q = (req.query["q"] as string) || "";
    const tag = (req.query["tag"] as string) || "";
    const active = req.query["active"];

    let sql = `SELECT id, content, summary, tags, source, is_active, importance, created_at, updated_at
               FROM user_memory WHERE user_id=$1`;
    const params: unknown[] = [req.authUser!.id];
    let i = 2;

    if (q) { sql += ` AND (content ILIKE $${i} OR summary ILIKE $${i})`; params.push(`%${q}%`); i++; }
    if (tag) { sql += ` AND $${i}=ANY(tags)`; params.push(tag); i++; }
    if (active === "true")  { sql += ` AND is_active=true`; }
    if (active === "false") { sql += ` AND is_active=false`; }

    sql += ` ORDER BY importance DESC, created_at DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(sql, params);
    const { rows: cnt } = await pool.query(
      "SELECT COUNT(*) as total FROM user_memory WHERE user_id=$1",
      [req.authUser!.id]
    );
    res.json({ memories: rows, total: parseInt(cnt[0].total), limit, offset });
  } catch { res.status(500).json({ error: "Failed to fetch memories" }); }
});

// ── POST /api/memory — create memory ─────────────────────────────────────────
router.post("/memory", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { content, summary, tags = [], source = "manual", importance = 5 } = req.body as Record<string, unknown>;
  if (!content) { res.status(400).json({ error: "content required" }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO user_memory (user_id, content, summary, tags, source, importance, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
      [
        req.authUser!.id,
        String(content),
        summary ? String(summary) : String(content).slice(0, 200),
        Array.isArray(tags) ? tags : [],
        String(source),
        Math.min(Math.max(Number(importance) || 5, 1), 10),
      ]
    );
    res.status(201).json({ memory: rows[0] });
  } catch { res.status(500).json({ error: "Failed to create memory" }); }
});

// ── GET /api/memory/:id — get single memory ───────────────────────────────────
router.get("/memory/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM user_memory WHERE id=$1 AND user_id=$2",
      [id, req.authUser!.id]
    );
    if (!rows[0]) { res.status(404).json({ error: "Memory not found" }); return; }
    res.json({ memory: rows[0] });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── PUT /api/memory/:id — update memory ──────────────────────────────────────
router.put("/memory/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { content, summary, tags, importance, is_active } = req.body as Record<string, unknown>;
  try {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (content !== undefined)   { sets.push(`content=$${i++}`);   vals.push(content); }
    if (summary !== undefined)   { sets.push(`summary=$${i++}`);   vals.push(summary); }
    if (tags !== undefined)      { sets.push(`tags=$${i++}`);      vals.push(Array.isArray(tags) ? tags : []); }
    if (importance !== undefined){ sets.push(`importance=$${i++}`); vals.push(Number(importance)); }
    if (is_active !== undefined) { sets.push(`is_active=$${i++}`); vals.push(Boolean(is_active)); }
    if (!sets.length) { res.json({ ok: true }); return; }
    sets.push(`updated_at=NOW()`);
    vals.push(id, req.authUser!.id);
    const { rows } = await pool.query(
      `UPDATE user_memory SET ${sets.join(",")} WHERE id=$${i} AND user_id=$${i+1} RETURNING *`,
      vals
    );
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ memory: rows[0] });
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

// ── DELETE /api/memory/:id — delete memory ────────────────────────────────────
router.delete("/memory/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM user_memory WHERE id=$1 AND user_id=$2", [id, req.authUser!.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete" }); }
});

// ── GET /api/memory/stats — memory statistics ─────────────────────────────────
router.get("/memory/stats", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_active=true) as active_count,
         COUNT(*) as total_count,
         AVG(importance) as avg_importance,
         MAX(created_at) as last_added,
         COUNT(DISTINCT source) as source_count
       FROM user_memory WHERE user_id=$1`,
      [req.authUser!.id]
    );
    res.json(rows[0]);
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── DELETE /api/memory/clear — clear all memories ────────────────────────────
router.delete("/memory/clear", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query("DELETE FROM user_memory WHERE user_id=$1", [req.authUser!.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
