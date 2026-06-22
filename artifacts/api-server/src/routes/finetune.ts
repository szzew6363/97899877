/**
 * Fine-tuning data collection and export
 * GET  /api/finetune/export     → export approved chats as JSONL for OpenAI fine-tuning
 * POST /api/finetune/approve    → mark a chat/message pair as training data
 * GET  /api/finetune/stats      → stats on collected training data
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth } from "../middlewares/jwtAuth";

const router = Router();

/* ── Ensure fine-tuning tables exist ── */
async function ensureFinetuneTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finetune_samples (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      messages JSONB NOT NULL,
      system_prompt TEXT,
      quality_score INTEGER DEFAULT 5,
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      approved BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `).catch(() => {});
}
ensureFinetuneTables();

/* ── POST /api/finetune/approve ── */
router.post("/finetune/approve", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, systemPrompt, qualityScore = 5, tags = [] } = req.body as {
      messages?: { role: string; content: string }[];
      systemPrompt?: string;
      qualityScore?: number;
      tags?: string[];
    };

    if (!messages || messages.length < 2) {
      res.status(400).json({ error: "Need at least 2 messages (user + assistant)" });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO finetune_samples (user_id, messages, system_prompt, quality_score, tags, approved)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
      [
        req.authUser?.id ?? null,
        JSON.stringify(messages),
        systemPrompt ?? null,
        Math.min(10, Math.max(1, qualityScore)),
        tags,
      ],
    );
    res.status(201).json({ id: rows[0].id, ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save training sample" });
  }
});

/* ── GET /api/finetune/stats ── */
router.get("/finetune/stats", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userFilter = req.authUser ? "WHERE user_id = $1" : "";
    const params = req.authUser ? [req.authUser.id] : [];
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE approved = true) as approved,
         AVG(quality_score) as avg_quality,
         array_agg(DISTINCT unnest(tags)) as all_tags
       FROM finetune_samples ${userFilter}`,
      params,
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* ── GET /api/finetune/export?format=jsonl|csv ── */
router.get("/finetune/export", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const format = (req.query["format"] as string) ?? "jsonl";
    const userFilter = req.authUser ? "AND user_id = $1" : "";
    const params = req.authUser ? [req.authUser.id] : [];

    const { rows } = await pool.query(
      `SELECT messages, system_prompt, quality_score FROM finetune_samples
       WHERE approved = true ${userFilter}
       ORDER BY quality_score DESC, created_at DESC
       LIMIT 10000`,
      params,
    );

    if (format === "jsonl") {
      res.setHeader("Content-Type", "application/jsonl");
      res.setHeader("Content-Disposition", "attachment; filename=kaligpt-finetune.jsonl");
      const lines = rows.map(row => {
        const msgs: { role: string; content: string }[] = row.messages;
        const entry: Record<string, unknown> = {
          messages: [
            ...(row.system_prompt ? [{ role: "system", content: row.system_prompt }] : []),
            ...msgs,
          ],
        };
        return JSON.stringify(entry);
      });
      res.send(lines.join("\n"));
    } else {
      // CSV format
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=kaligpt-finetune.csv");
      const header = "prompt,completion,quality_score\n";
      const csvRows = rows.map(row => {
        const msgs: { role: string; content: string }[] = row.messages;
        const userMsg = msgs.find(m => m.role === "user")?.content ?? "";
        const assistantMsg = msgs.find(m => m.role === "assistant")?.content ?? "";
        return `"${userMsg.replace(/"/g, '""')}","${assistantMsg.replace(/"/g, '""')}",${row.quality_score}`;
      });
      res.send(header + csvRows.join("\n"));
    }
  } catch {
    res.status(500).json({ error: "Failed to export data" });
  }
});

/* ── GET /api/finetune/samples?limit=50&tag=xxx ── */
router.get("/finetune/samples", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, parseInt((req.query["limit"] as string) ?? "50", 10) || 50);
    const tag   = req.query["tag"] as string | undefined;
    const userFilter = req.authUser ? "AND user_id = $1" : "";
    const params: unknown[] = req.authUser ? [req.authUser.id] : [];
    let tagClause = "";
    if (tag) { params.push(tag); tagClause = `AND $${params.length} = ANY(tags)`; }
    params.push(limit);
    const { rows } = await pool.query(
      `SELECT id, messages, system_prompt, quality_score, tags, approved, created_at
       FROM finetune_samples WHERE 1=1 ${userFilter} ${tagClause}
       ORDER BY created_at DESC LIMIT $${params.length}`,
      params,
    );
    res.json({ samples: rows });
  } catch {
    res.status(500).json({ error: "Failed to list samples" });
  }
});

/* ── DELETE /api/finetune/samples/:id ── */
router.delete("/finetune/samples/:id", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      "DELETE FROM finetune_samples WHERE id = $1 AND user_id = $2",
      [req.params["id"], req.authUser?.id],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete sample" });
  }
});

export default router;
