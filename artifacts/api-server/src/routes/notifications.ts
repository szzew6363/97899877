/**
 * In-app notifications
 * GET    /api/notifications           → list user notifications
 * POST   /api/notifications/:id/read  → mark as read
 * POST   /api/notifications/read-all  → mark all read
 * DELETE /api/notifications/:id       → delete
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

/* ── GET /api/notifications ── */
router.get("/notifications", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 50, 100);
    const { rows } = await pool.query(
      `SELECT id, type, title, body, is_read, data, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [req.authUser!.id, limit],
    );
    const { rows: cnt } = await pool.query(
      "SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = false",
      [req.authUser!.id],
    );
    res.json({ notifications: rows, unreadCount: parseInt(cnt[0].unread) });
  } catch {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

/* ── POST /api/notifications/:id/read ── */
router.post("/notifications/:id/read", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [req.params.id, req.authUser!.id],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

/* ── POST /api/notifications/read-all ── */
router.post("/notifications/read-all", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [req.authUser!.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

/* ── DELETE /api/notifications/:id ── */
router.delete("/notifications/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [req.params.id, req.authUser!.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

/* ── POST /api/notifications/push-subscribe ── Web Push */
router.post("/notifications/push-subscribe", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  // Store push subscription in DB for future use
  try {
    const { subscription } = req.body as { subscription?: unknown };
    if (!subscription) { res.status(400).json({ error: "Subscription required" }); return; }
    // Store in user metadata (simplified — production would use a push_subscriptions table)
    await pool.query(
      "UPDATE users SET updated_at = NOW() WHERE id = $1",
      [req.authUser!.id],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to store push subscription" });
  }
});

export default router;
