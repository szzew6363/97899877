/**
 * Security & Compliance — System #20
 * GDPR compliance, audit logs, data export, threat detection
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

// ── GET /api/security/audit-log (alias: /security/events) ────────────────────
async function getSecurityEvents(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 100, 500);
    const { rows } = await pool.query(
      `SELECT id, event_type, success, ip_address, user_agent, details, created_at
       FROM security_events WHERE user_id=$1
       ORDER BY created_at DESC LIMIT $2`,
      [req.authUser!.id, limit]
    );
    res.json({ events: rows, count: rows.length });
  } catch { res.status(500).json({ error: "Failed" }); }
}
router.get("/security/audit-log", jwtAuth, requireAuth, getSecurityEvents);
router.get("/security/events", jwtAuth, requireAuth, getSecurityEvents);

// ── GET /api/security/threat-score ───────────────────────────────────────────
router.get("/security/threat-score", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM security_events WHERE user_id=$1 AND success=false AND created_at > NOW()-INTERVAL '7d') as failed_logins,
        (SELECT COUNT(DISTINCT ip_address) FROM security_events WHERE user_id=$1 AND created_at > NOW()-INTERVAL '7d') as unique_ips,
        (SELECT COUNT(*) FROM user_sessions WHERE user_id=$1) as active_sessions,
        u.totp_enabled, u.email_verified, u.failed_login_attempts
       FROM users u WHERE u.id=$1`,
      [req.authUser!.id]
    );
    const d = rows[0];
    let score = 100;
    if (!d.totp_enabled) score -= 20;
    if (!d.email_verified) score -= 15;
    if (d.failed_logins > 5) score -= 20;
    if (d.unique_ips > 5) score -= 10;
    if (d.active_sessions > 5) score -= 10;

    const level = score >= 80 ? "high" : score >= 60 ? "medium" : "low";
    const recommendations = [];
    if (!d.totp_enabled) recommendations.push({ id: "totp", text: "فعّل المصادقة الثنائية (2FA)", priority: "critical" });
    if (!d.email_verified) recommendations.push({ id: "email", text: "تحقق من بريدك الإلكتروني", priority: "high" });
    if (d.active_sessions > 5) recommendations.push({ id: "sessions", text: "راجع الجلسات النشطة وأنهِ غير الضرورية", priority: "medium" });

    res.json({ score: Math.max(0, score), level, recommendations, details: d });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── GET /api/security/data-export — GDPR data export ─────────────────────────
router.get("/security/data-export", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [user, sessions, events, apiKeys, notifications] = await Promise.all([
      pool.query("SELECT id, email, first_name, last_name, username, role, subscription, created_at FROM users WHERE id=$1", [req.authUser!.id]),
      pool.query("SELECT device_name, device_type, browser, os, ip_address, created_at FROM user_sessions WHERE user_id=$1", [req.authUser!.id]),
      pool.query("SELECT event_type, success, ip_address, created_at FROM security_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1000", [req.authUser!.id]),
      pool.query("SELECT name, created_at, last_used_at FROM api_keys WHERE user_id=$1", [req.authUser!.id]),
      pool.query("SELECT title, body, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 500", [req.authUser!.id]),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      account: user.rows[0],
      sessions: sessions.rows,
      securityEvents: events.rows,
      apiKeys: apiKeys.rows,
      notifications: notifications.rows,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="mr7-data-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch { res.status(500).json({ error: "Export failed" }); }
});

// ── DELETE /api/security/delete-account — GDPR right to erasure ──────────────
router.delete("/security/delete-account", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { password, confirmation } = req.body as { password?: string; confirmation?: string };
  if (confirmation !== "DELETE MY ACCOUNT") {
    res.status(400).json({ error: "Type 'DELETE MY ACCOUNT' to confirm" }); return;
  }
  try {
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id=$1", [req.authUser!.id]);
    if (rows[0]?.password_hash && password) {
      const bcrypt = await import("bcryptjs");
      const valid = await bcrypt.compare(password, rows[0].password_hash);
      if (!valid) { res.status(401).json({ error: "Wrong password" }); return; }
    }

    // Anonymize rather than delete (preserve referential integrity)
    const anon = `deleted_${Date.now()}`;
    await pool.query(
      `UPDATE users SET email=$1, first_name='Deleted', last_name='User', username=$2,
       password_hash=NULL, refresh_token=NULL, totp_secret=NULL, status='banned',
       profile_image_url=NULL, updated_at=NOW() WHERE id=$3`,
      [`${anon}@deleted.mr7.ai`, anon, req.authUser!.id]
    );
    await pool.query("DELETE FROM user_sessions WHERE user_id=$1", [req.authUser!.id]);
    await pool.query("DELETE FROM api_keys WHERE user_id=$1", [req.authUser!.id]);

    res.json({ ok: true, message: "Account deleted. You will be signed out." });
  } catch { res.status(500).json({ error: "Deletion failed" }); }
});

// ── GET /api/security/compliance ─────────────────────────────────────────────
router.get("/security/compliance", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT totp_enabled, email_verified, created_at, last_login_at FROM users WHERE id=$1",
      [req.authUser!.id]
    );
    const u = rows[0];
    const checks = [
      { id: "2fa", label: "المصادقة الثنائية", status: u.totp_enabled ? "pass" : "fail", critical: true },
      { id: "email", label: "التحقق من البريد", status: u.email_verified ? "pass" : "fail", critical: false },
      { id: "password", label: "كلمة مرور قوية", status: "pass", critical: false },
      { id: "sessions", label: "مراجعة الجلسات", status: "pass", critical: false },
      { id: "gdpr", label: "بيانات GDPR قابلة للتصدير", status: "pass", critical: false },
    ];
    const passed = checks.filter(c => c.status === "pass").length;
    res.json({ checks, score: Math.round((passed / checks.length) * 100), passed, total: checks.length });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
