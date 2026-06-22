/**
 * Custom Model Training — System #15
 * Training job management, dataset upload, model versioning
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";
import crypto from "crypto";

const router = Router();

// ── GET /api/training/jobs ────────────────────────────────────────────────────
router.get("/training/jobs", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, model_base, status, progress, dataset_size, epochs, loss,
              error_msg, started_at, completed_at, created_at
       FROM training_jobs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.authUser!.id]
    );
    res.json({ jobs: rows });
  } catch { res.status(500).json({ error: "Failed to fetch jobs" }); }
});

// ── POST /api/training/jobs — Create training job ─────────────────────────────
router.post("/training/jobs", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, modelBase, datasetId, epochs = 3, learningRate = 0.0001, batchSize = 8 } = req.body as Record<string, unknown>;
  if (!name || !modelBase) { res.status(400).json({ error: "name and modelBase required" }); return; }

  try {
    // Check user tier allows training
    const { rows: user } = await pool.query("SELECT subscription FROM users WHERE id=$1", [req.authUser!.id]);
    if (!["professional", "elite", "enterprise"].includes(user[0]?.subscription)) {
      res.status(403).json({ error: "Fine-tuning requires Professional plan or higher" }); return;
    }

    const jobId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO training_jobs (id, user_id, name, model_base, dataset_id, epochs, learning_rate,
       batch_size, status, progress, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued', 0, NOW())`,
      [jobId, req.authUser!.id, name, modelBase, datasetId || null, epochs, learningRate, batchSize]
    );

    // Simulate async training start
    simulateTraining(jobId);

    res.status(201).json({ job: { id: jobId, name, modelBase, status: "queued", progress: 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create training job" });
  }
});

// Simulate training progress for demo
async function simulateTraining(jobId: string) {
  try {
    await pool.query("UPDATE training_jobs SET status='running', started_at=NOW() WHERE id=$1", [jobId]);
    const steps = [10, 25, 40, 55, 70, 80, 90, 100];
    for (const progress of steps) {
      await new Promise(r => setTimeout(r, 8000));
      const loss = (2.5 - (progress / 100) * 2.1 + Math.random() * 0.1).toFixed(4);
      if (progress === 100) {
        await pool.query(
          "UPDATE training_jobs SET progress=$1, loss=$2, status='completed', completed_at=NOW() WHERE id=$3",
          [progress, loss, jobId]
        );
      } else {
        await pool.query("UPDATE training_jobs SET progress=$1, loss=$2 WHERE id=$3", [progress, loss, jobId]);
      }
    }
  } catch { /* ignore */ }
}

// ── GET /api/training/jobs/:id ────────────────────────────────────────────────
router.get("/training/jobs/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM training_jobs WHERE id=$1 AND user_id=$2",
      [req.params.id, req.authUser!.id]
    );
    if (!rows.length) { res.status(404).json({ error: "Job not found" }); return; }
    res.json({ job: rows[0] });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── DELETE /api/training/jobs/:id — Cancel job ───────────────────────────────
router.delete("/training/jobs/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      "UPDATE training_jobs SET status='cancelled' WHERE id=$1 AND user_id=$2 AND status IN ('queued','running')",
      [req.params.id, req.authUser!.id]
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── GET /api/training/datasets ────────────────────────────────────────────────
router.get("/training/datasets", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, content_type, file_size, created_at
       FROM knowledge_documents WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [req.authUser!.id]
    );
    res.json({ datasets: rows });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── POST /api/training/samples — Add training sample ─────────────────────────
router.post("/training/samples", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { prompt, completion, category, quality = 5 } = req.body as Record<string, unknown>;
  if (!prompt || !completion) { res.status(400).json({ error: "prompt and completion required" }); return; }
  try {
    await pool.query(
      `INSERT INTO training_samples (user_id, prompt, completion, category, quality_score, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [req.authUser!.id, prompt, completion, category || "general", quality]
    );
    res.status(201).json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── GET /api/training/samples ─────────────────────────────────────────────────
router.get("/training/samples", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 50, 200);
    const { rows } = await pool.query(
      `SELECT id, prompt, completion, category, quality_score, created_at
       FROM training_samples WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [req.authUser!.id, limit]
    );
    const { rows: cnt } = await pool.query("SELECT COUNT(*) as total FROM training_samples WHERE user_id=$1", [req.authUser!.id]);
    res.json({ samples: rows, total: parseInt(cnt[0].total) });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
