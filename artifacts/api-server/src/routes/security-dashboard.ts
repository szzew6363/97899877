/**
 * Security Dashboard — Admin Routes
 * ────────────────────────────────────
 * GET  /api/admin/security/metrics      → 24h metrics
 * GET  /api/admin/security/events       → paginated security events
 * GET  /api/admin/security/report/now   → generate report on demand
 * POST /api/admin/security/block-ip     → add IP to blocklist
 */

import { Router, type Request, type Response } from "express";
import { jwtAuth, requireAdmin } from "../middlewares/jwtAuth.js";
import { securityMonitor } from "../lib/security-monitor.js";
import { runReport } from "../lib/weekly-report.js";
import { pool } from "../db.js";
import { logger } from "../lib/logger.js";

const router = Router();

// All routes require admin auth
router.use(jwtAuth, requireAdmin);

/* ── GET /api/admin/security/metrics ── */
router.get("/admin/security/metrics", async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await securityMonitor.getMetrics24h();
    res.json({ ok: true, metrics });
  } catch (err) {
    logger.error({ err }, "[security-dashboard] metrics error");
    res.status(500).json({ error: "Failed to load metrics" });
  }
});

/* ── GET /api/admin/security/events ── */
router.get("/admin/security/events", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"))));
    const offset = (page - 1) * limit;
    const severity = req.query.severity as string | undefined;
    const type = req.query.type as string | undefined;
    const since = req.query.since as string | undefined;

    let whereClause = "WHERE 1=1";
    const params: unknown[] = [];
    let pIdx = 1;

    if (severity) {
      whereClause += ` AND details->>'severity' = $${pIdx++}`;
      params.push(severity);
    }
    if (type) {
      whereClause += ` AND event_type = $${pIdx++}`;
      params.push(type);
    }
    if (since) {
      whereClause += ` AND created_at > $${pIdx++}`;
      params.push(since);
    }

    const [eventsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT se.id, se.event_type, se.success, se.ip_address, se.user_agent,
                se.details, se.created_at, u.email as user_email
         FROM security_events se
         LEFT JOIN users u ON se.user_id = u.id
         ${whereClause}
         ORDER BY se.created_at DESC
         LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
        [...params, limit, offset],
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM security_events ${whereClause}`, params),
    ]);

    res.json({
      ok: true,
      events: eventsRes.rows,
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    });
  } catch (err) {
    logger.error({ err }, "[security-dashboard] events error");
    res.status(500).json({ error: "Failed to load events" });
  }
});

/* ── GET /api/admin/security/report/now ── */
router.get("/admin/security/report/now", async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await runReport();
    res.json({ ok: true, report });
  } catch (err) {
    logger.error({ err }, "[security-dashboard] report error");
    res.status(500).json({ error: "Failed to generate report" });
  }
});

/* ── POST /api/admin/security/block-ip ── */
router.post("/admin/security/block-ip", async (req: Request, res: Response): Promise<void> => {
  try {
    const { ip, reason, durationHours } = req.body as {
      ip?: string;
      reason?: string;
      durationHours?: number;
    };

    if (!ip || !/^[\d.:a-fA-F]+$/.test(ip)) {
      res.status(400).json({ error: "Valid IP address required" });
      return;
    }

    // Ensure ip_blocklist table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ip_blocklist (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        ip_address VARCHAR NOT NULL UNIQUE,
        reason TEXT,
        blocked_by VARCHAR REFERENCES users(id),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 3600_000).toISOString()
      : null;

    await pool.query(
      `INSERT INTO ip_blocklist (ip_address, reason, blocked_by, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ip_address) DO UPDATE SET reason=$2, blocked_by=$3, expires_at=$4, created_at=NOW()`,
      [ip, reason ?? "Manual block", req.authUser!.id, expiresAt],
    );

    logger.warn({ ip, reason, blockedBy: req.authUser!.id }, "[security-dashboard] IP blocked");
    res.json({ ok: true, ip, expiresAt });
  } catch (err) {
    logger.error({ err }, "[security-dashboard] block-ip error");
    res.status(500).json({ error: "Failed to block IP" });
  }
});

/* ── GET /api/admin/security/blocked-ips ── */
router.get("/admin/security/blocked-ips", async (_req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ip_blocklist (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        ip_address VARCHAR NOT NULL UNIQUE,
        reason TEXT,
        blocked_by VARCHAR REFERENCES users(id),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const { rows } = await pool.query(
      `SELECT bl.*, u.email as blocked_by_email
       FROM ip_blocklist bl
       LEFT JOIN users u ON bl.blocked_by = u.id
       WHERE bl.expires_at IS NULL OR bl.expires_at > NOW()
       ORDER BY bl.created_at DESC`,
    );
    res.json({ ok: true, blocked: rows });
  } catch (err) {
    logger.error({ err }, "[security-dashboard] blocked-ips error");
    res.status(500).json({ error: "Failed to load blocklist" });
  }
});

/* ── DELETE /api/admin/security/block-ip/:ip ── */
router.delete("/admin/security/block-ip/:ip", async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query("DELETE FROM ip_blocklist WHERE ip_address = $1", [req.params.ip]);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[security-dashboard] unblock error");
    res.status(500).json({ error: "Failed to unblock IP" });
  }
});

export default router;
