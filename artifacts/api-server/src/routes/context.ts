import { Router, type IRouter, type Request, type Response } from "express";
import { callOnce } from "../lib/ai-providers";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router: IRouter = Router();

// ── GET /api/context — list user context rules ────────────────────────────────
router.get("/context", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, content, type, priority, active, triggers, created_at, updated_at
       FROM context_rules WHERE user_id=$1
       ORDER BY priority DESC, created_at DESC`,
      [req.authUser!.id]
    );
    res.json({ rules: rows });
  } catch { res.status(500).json({ error: "Failed to fetch context rules" }); }
});

// ── POST /api/context — create context rule ───────────────────────────────────
router.post("/context", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, content, type = "system", priority = 5, triggers = [] } = req.body as Record<string, unknown>;
  if (!name || !content) { res.status(400).json({ error: "name and content required" }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO context_rules (user_id, name, content, type, priority, active, triggers)
       VALUES ($1,$2,$3,$4,$5,true,$6) RETURNING *`,
      [req.authUser!.id, name, content, type, Number(priority) || 5, Array.isArray(triggers) ? triggers : []]
    );
    res.status(201).json({ rule: rows[0] });
  } catch { res.status(500).json({ error: "Failed to create context rule" }); }
});

// ── PUT /api/context/:id — update context rule ────────────────────────────────
router.put("/context/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, content, type, priority, active, triggers } = req.body as Record<string, unknown>;
  try {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (name !== undefined)     { sets.push(`name=$${i++}`);     vals.push(name); }
    if (content !== undefined)  { sets.push(`content=$${i++}`);  vals.push(content); }
    if (type !== undefined)     { sets.push(`type=$${i++}`);     vals.push(type); }
    if (priority !== undefined) { sets.push(`priority=$${i++}`); vals.push(Number(priority)); }
    if (active !== undefined)   { sets.push(`active=$${i++}`);   vals.push(Boolean(active)); }
    if (triggers !== undefined) { sets.push(`triggers=$${i++}`); vals.push(Array.isArray(triggers) ? triggers : []); }
    sets.push(`updated_at=NOW()`);

    if (sets.length === 1) { res.json({ ok: true }); return; }
    vals.push(id, req.authUser!.id);
    const { rows } = await pool.query(
      `UPDATE context_rules SET ${sets.join(",")} WHERE id=$${i} AND user_id=$${i+1} RETURNING *`,
      vals
    );
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ rule: rows[0] });
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

// ── DELETE /api/context/:id — delete context rule ─────────────────────────────
router.delete("/context/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM context_rules WHERE id=$1 AND user_id=$2", [id, req.authUser!.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to delete" }); }
});

// ── POST /api/context/summarize — AI context compression ─────────────────────
router.post("/context/summarize", async (req, res) => {
  try {
    const body = req.body as {
      messages?: { role: string; content: string }[];
      language?: string;
    };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const language = body.language ?? "en";
    if (messages.length === 0) {
      return res.json({ summary: "", originalCount: 0 });
    }
    const transcript = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 1500)}`)
      .join("\n\n");

    const langNote = language === "ar" ? "Write the summary in Arabic." : "Write the summary in English.";
    const summary = await callOnce([
      {
        role: "system",
        content: `You are a context compression engine. Compress a conversation into a dense, information-preserving summary that a future AI session can use to continue seamlessly.

RULES:
- Keep ALL facts, decisions, code, credentials, file paths, URLs, IPs, CVEs, and conclusions
- Use a structured bullet list format grouped by topic
- Preserve technical accuracy — no approximations
- Include the final state of any ongoing work
- ${langNote}
- Be maximally dense: every word must carry information
- Mark the most recent context clearly so the AI knows where things stand`,
      },
      { role: "user", content: transcript },
    ], 2000);
    return res.json({ summary, originalCount: messages.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "summarize failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
