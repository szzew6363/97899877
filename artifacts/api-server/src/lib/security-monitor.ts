/**
 * Security Monitor
 * ─────────────────
 * Central hub for:
 *  - Recording attack attempts to DB
 *  - Sending immediate admin alerts for high/critical severity events
 *  - Aggregating security metrics
 *  - Triggering the weekly security report scheduler
 *
 * Admin alerts are sent via in-app notifications + optional email/webhook.
 */

import { pool, logSecurityEvent } from "../db.js";
import { logger } from "./logger.js";

interface AttackRecord {
  userId?: string;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
  attacks: Array<{ type: string; severity: string; field: string; pattern: string }>;
  severity: "medium" | "high" | "critical";
}

interface SecurityMetrics {
  totalEventsLast24h: number;
  attacksLast24h: number;
  blockedIPs: number;
  topAttackTypes: Array<{ type: string; count: number }>;
  topTargetedPaths: Array<{ path: string; count: number }>;
}

class SecurityMonitor {
  // In-memory throttle: prevent flood of alerts for same IP
  private readonly alertThrottle = new Map<string, number>();
  private readonly ALERT_THROTTLE_MS = 5 * 60 * 1000; // 5 min cooldown per IP

  /**
   * Record an attack attempt to DB and send admin alert if severity warrants it.
   */
  async recordAttack(attack: AttackRecord): Promise<void> {
    // Log to security_events table
    await logSecurityEvent({
      userId: attack.userId,
      eventType: `attack.${attack.attacks[0]?.type ?? "unknown"}`,
      success: false,
      ipAddress: attack.ip,
      userAgent: attack.userAgent,
      details: {
        path: attack.path,
        method: attack.method,
        severity: attack.severity,
        attacks: attack.attacks.map((a) => ({ type: a.type, field: a.field, severity: a.severity })),
      },
    });

    // Only alert for high/critical, and throttle per IP
    if (attack.severity === "medium") return;

    const throttleKey = `${attack.ip}:${attack.attacks[0]?.type}`;
    const lastAlert = this.alertThrottle.get(throttleKey) ?? 0;
    if (Date.now() - lastAlert < this.ALERT_THROTTLE_MS) return;
    this.alertThrottle.set(throttleKey, Date.now());

    await this.alertAdmins(attack);
  }

  /**
   * Send immediate alert to all admin users.
   */
  private async alertAdmins(attack: AttackRecord): Promise<void> {
    try {
      const attackTypes = [...new Set(attack.attacks.map((a) => a.type))].join(", ");
      const title = `[${attack.severity.toUpperCase()}] Attack Detected`;
      const body = `${attackTypes} from ${attack.ip} on ${attack.method} ${attack.path}`;

      // Find all admin users
      const { rows: admins } = await pool.query(
        `SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 20`,
      );

      if (admins.length === 0) {
        logger.warn("[security-monitor] No admin users found for alert.");
        return;
      }

      // Insert in-app notifications for each admin
      const values = admins.map((admin: { id: string }, i: number) => {
        const offset = i * 6;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
      }).join(", ");

      const params = admins.flatMap((admin: { id: string }) => [
        admin.id,
        "security",
        title,
        body,
        false,
        JSON.stringify({
          severity: attack.severity,
          ip: attack.ip,
          path: attack.path,
          attacks: attack.attacks.map((a) => a.type),
        }),
      ]);

      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, is_read, data)
         VALUES ${values}`,
        params,
      );

      logger.warn({ attackTypes, ip: attack.ip, severity: attack.severity },
        "[security-monitor] Admin alert sent");

      // Optional: send to webhook if configured
      await this.sendAlertWebhook(attack, title, body);
    } catch (err) {
      logger.error({ err }, "[security-monitor] Failed to send admin alert");
    }
  }

  /**
   * Send attack alert to configured security webhook (Slack, Discord, SIEM, etc.)
   */
  private async sendAlertWebhook(attack: AttackRecord, title: string, body: string): Promise<void> {
    const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      const payload = {
        text: `🚨 ${title}`,
        attachments: [{
          color: attack.severity === "critical" ? "#ff0000" : "#ff6600",
          fields: [
            { title: "Severity", value: attack.severity, short: true },
            { title: "IP Address", value: attack.ip, short: true },
            { title: "Path", value: `${attack.method} ${attack.path}`, short: false },
            { title: "Attack Types", value: attack.attacks.map((a) => a.type).join(", "), short: false },
          ],
          footer: "mr7.ai Security Monitor",
          ts: Math.floor(Date.now() / 1000),
        }],
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch {
      // Non-fatal — webhook failure must never break the app
    }
  }

  /**
   * Log a general security event (login, logout, key rotation, etc.)
   */
  async logEvent(data: {
    userId?: string;
    email?: string;
    eventType: string;
    severity?: "info" | "low" | "medium" | "high" | "critical";
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await logSecurityEvent({
        userId: data.userId,
        email: data.email,
        eventType: data.eventType,
        success: data.success,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        details: { ...data.details, severity: data.severity ?? "info" },
      });
    } catch (err) {
      logger.error({ err }, "[security-monitor] Failed to log security event");
    }
  }

  /**
   * Gather security metrics for the last 24 hours.
   */
  async getMetrics24h(): Promise<SecurityMetrics> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [eventsRes, attacksRes, ipRes, typesRes, pathsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM security_events WHERE created_at > $1`, [since]),
      pool.query(`SELECT COUNT(*)::int AS count FROM security_events WHERE created_at > $1 AND success = false`, [since]),
      pool.query(`SELECT COUNT(DISTINCT ip_address)::int AS count FROM security_events WHERE created_at > $1 AND success = false`, [since]),
      pool.query(`
        SELECT event_type AS type, COUNT(*)::int AS count
        FROM security_events WHERE created_at > $1 AND success = false
        GROUP BY event_type ORDER BY count DESC LIMIT 10`, [since]),
      pool.query(`
        SELECT details->>'path' AS path, COUNT(*)::int AS count
        FROM security_events WHERE created_at > $1 AND success = false AND details->>'path' IS NOT NULL
        GROUP BY path ORDER BY count DESC LIMIT 10`, [since]),
    ]);

    return {
      totalEventsLast24h: eventsRes.rows[0]?.count ?? 0,
      attacksLast24h: attacksRes.rows[0]?.count ?? 0,
      blockedIPs: ipRes.rows[0]?.count ?? 0,
      topAttackTypes: typesRes.rows,
      topTargetedPaths: pathsRes.rows,
    };
  }

  /**
   * Get high/critical events from the last N days.
   */
  async getRecentHighSeverityEvents(days = 7): Promise<unknown[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { rows } = await pool.query(
      `SELECT se.*, u.email as user_email
       FROM security_events se
       LEFT JOIN users u ON se.user_id = u.id
       WHERE se.created_at > $1
         AND se.success = false
         AND (se.details->>'severity' IN ('high', 'critical') OR se.event_type LIKE 'attack.%')
       ORDER BY se.created_at DESC
       LIMIT 500`,
      [since],
    );
    return rows;
  }
}

export const securityMonitor = new SecurityMonitor();
