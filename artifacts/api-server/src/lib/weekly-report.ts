/**
 * Weekly Security Report Scheduler
 * ──────────────────────────────────
 * Every Monday at 08:00 UTC, generates and sends a security report to all admins.
 *
 * Report includes:
 *  - Total events / attacks this week
 *  - Top attack types and targeted paths
 *  - Blocked IPs
 *  - High/critical events list
 *  - Trend vs prior week
 *  - Recommendations
 *
 * Delivery: in-app notification + optional email + optional webhook.
 */

import { pool } from "../db.js";
import { logger } from "./logger.js";
import { securityMonitor } from "./security-monitor.js";

interface WeeklyReportData {
  week: string;
  totalEvents: number;
  totalAttacks: number;
  blockedIPs: number;
  criticalCount: number;
  highCount: number;
  topAttackTypes: Array<{ type: string; count: number }>;
  topTargetedPaths: Array<{ path: string; count: number }>;
  newUsersThisWeek: number;
  topCountries: Array<{ country: string; count: number }>;
  recommendations: string[];
}

async function generateReport(since: Date, until: Date): Promise<WeeklyReportData> {
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();
  const weekStr = `${since.toISOString().slice(0, 10)} — ${until.toISOString().slice(0, 10)}`;

  const [total, attacks, ips, critical, high, types, paths, newUsers, countries] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS c FROM security_events WHERE created_at BETWEEN $1 AND $2`, [sinceIso, untilIso]),
    pool.query(`SELECT COUNT(*)::int AS c FROM security_events WHERE created_at BETWEEN $1 AND $2 AND success = false`, [sinceIso, untilIso]),
    pool.query(`SELECT COUNT(DISTINCT ip_address)::int AS c FROM security_events WHERE created_at BETWEEN $1 AND $2 AND success = false`, [sinceIso, untilIso]),
    pool.query(`SELECT COUNT(*)::int AS c FROM security_events WHERE created_at BETWEEN $1 AND $2 AND details->>'severity' = 'critical'`, [sinceIso, untilIso]),
    pool.query(`SELECT COUNT(*)::int AS c FROM security_events WHERE created_at BETWEEN $1 AND $2 AND details->>'severity' = 'high'`, [sinceIso, untilIso]),
    pool.query(`
      SELECT event_type AS type, COUNT(*)::int AS count
      FROM security_events WHERE created_at BETWEEN $1 AND $2 AND success = false
      GROUP BY event_type ORDER BY count DESC LIMIT 10`, [sinceIso, untilIso]),
    pool.query(`
      SELECT details->>'path' AS path, COUNT(*)::int AS count
      FROM security_events WHERE created_at BETWEEN $1 AND $2 AND success = false AND details->>'path' IS NOT NULL
      GROUP BY path ORDER BY count DESC LIMIT 10`, [sinceIso, untilIso]),
    pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE created_at BETWEEN $1 AND $2`, [sinceIso, untilIso]),
    pool.query(`
      SELECT COALESCE(details->>'country', 'Unknown') AS country, COUNT(*)::int AS count
      FROM security_events WHERE created_at BETWEEN $1 AND $2 AND success = false
      GROUP BY country ORDER BY count DESC LIMIT 5`, [sinceIso, untilIso]).catch(() => ({ rows: [] })),
  ]);

  // Auto-generate recommendations based on data
  const recommendations: string[] = [];
  const attackCount = attacks.rows[0]?.c ?? 0;
  const criticalCount = critical.rows[0]?.c ?? 0;
  const highCount = high.rows[0]?.c ?? 0;
  const blockedIPs = ips.rows[0]?.c ?? 0;

  if (criticalCount > 0) recommendations.push(`${criticalCount} critical severity events detected — immediate review required.`);
  if (highCount > 10) recommendations.push(`High volume of high-severity events (${highCount}) — consider adding IP blocklist rules.`);
  if (blockedIPs > 50) recommendations.push(`${blockedIPs} unique IPs blocked — consider geo-fencing or additional rate limiting.`);
  if (attackCount > 100) recommendations.push("Elevated attack volume — review WAF rules and consider DDoS protection.");

  const topPath = paths.rows[0]?.path;
  if (topPath) recommendations.push(`Most targeted endpoint: ${topPath} — review rate limiting for this route.`);

  if (recommendations.length === 0) recommendations.push("No significant threats detected this week. Continue monitoring.");

  return {
    week: weekStr,
    totalEvents: total.rows[0]?.c ?? 0,
    totalAttacks: attackCount,
    blockedIPs,
    criticalCount,
    highCount,
    topAttackTypes: types.rows,
    topTargetedPaths: paths.rows,
    newUsersThisWeek: newUsers.rows[0]?.c ?? 0,
    topCountries: (countries as { rows: Array<{ country: string; count: number }> }).rows,
    recommendations,
  };
}

async function sendReportToAdmins(report: WeeklyReportData): Promise<void> {
  // Get all admin users
  const { rows: admins } = await pool.query(
    `SELECT id, email FROM users WHERE role = 'admin' AND status = 'active'`,
  );

  if (admins.length === 0) {
    logger.info("[weekly-report] No admin users — skipping report delivery");
    return;
  }

  const title = `Weekly Security Report — ${report.week}`;
  const body = [
    `Events: ${report.totalEvents} | Attacks: ${report.totalAttacks} | Blocked IPs: ${report.blockedIPs}`,
    `Critical: ${report.criticalCount} | High: ${report.highCount}`,
    `New users: ${report.newUsersThisWeek}`,
    report.recommendations[0] ?? "",
  ].join(" | ");

  const reportData = JSON.stringify(report);

  // In-app notifications
  if (admins.length > 0) {
    const values = admins.map((_: unknown, i: number) => {
      const offset = i * 6;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
    }).join(", ");

    const params = admins.flatMap((admin: { id: string }) => [
      admin.id, "security", title, body, false, reportData,
    ]);

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, is_read, data) VALUES ${values}`,
      params,
    );
  }

  // Optional: send report to webhook
  const webhookUrl = process.env.SECURITY_REPORT_WEBHOOK_URL || process.env.SECURITY_ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const payload = {
        text: `📊 *${title}*`,
        attachments: [{
          color: report.criticalCount > 0 ? "#ff0000" : report.highCount > 5 ? "#ff6600" : "#00cc66",
          fields: [
            { title: "Total Events", value: String(report.totalEvents), short: true },
            { title: "Attacks Blocked", value: String(report.totalAttacks), short: true },
            { title: "Unique IPs Blocked", value: String(report.blockedIPs), short: true },
            { title: "Critical Events", value: String(report.criticalCount), short: true },
            { title: "Top Attack Type", value: report.topAttackTypes[0]?.type ?? "none", short: true },
            { title: "Most Targeted Path", value: report.topTargetedPaths[0]?.path ?? "none", short: true },
            { title: "Recommendations", value: report.recommendations.join("\n"), short: false },
          ],
          footer: "mr7.ai Weekly Security Report",
        }],
      };
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 8000);
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch {
      // Non-fatal
    }
  }

  logger.info({ admins: admins.length, week: report.week }, "[weekly-report] Report delivered");
}

/**
 * Start the weekly security report scheduler.
 * Fires every Monday at 08:00 UTC.
 */
export function startWeeklyReportScheduler(): void {
  logger.info("[weekly-report] Scheduler started");

  function scheduleNext(): void {
    const now = new Date();
    const next = new Date(now);

    // Find next Monday at 08:00 UTC
    const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
    next.setUTCDate(next.getUTCDate() + daysUntilMonday);
    next.setUTCHours(8, 0, 0, 0);

    const msUntilNext = next.getTime() - now.getTime();
    logger.info({ nextReport: next.toISOString(), msUntilNext }, "[weekly-report] Next report scheduled");

    setTimeout(async () => {
      await runReport();
      scheduleNext(); // schedule the one after
    }, msUntilNext);
  }

  scheduleNext();
}

export async function runReport(): Promise<WeeklyReportData> {
  logger.info("[weekly-report] Generating weekly security report...");
  const until = new Date();
  const since = new Date(until.getTime() - 7 * 24 * 60 * 60 * 1000);

  const report = await generateReport(since, until);
  await sendReportToAdmins(report);
  logger.info({ totalAttacks: report.totalAttacks, criticals: report.criticalCount }, "[weekly-report] Report sent");
  return report;
}
