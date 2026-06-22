/**
 * Attack Detection Middleware
 * ────────────────────────────
 * Automatically detects and blocks:
 *   - SQL injection attempts
 *   - XSS (Cross-Site Scripting) payloads
 *   - Path traversal attacks
 *   - Command injection
 *   - SSRF patterns
 *   - NoSQL injection
 *
 * On detection:
 *   1. Logs the attack to security_events table
 *   2. Fires an alert notification to admins
 *   3. Returns 400 (does NOT reveal what was detected)
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";
import { securityMonitor } from "../lib/security-monitor.js";

// ── Attack pattern library ────────────────────────────────────────────────────

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|TRUNCATE|REPLACE)\b)/i,
  /'(\s*(OR|AND)\s*['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
  /--\s*(.*|$)/,
  /\/\*[\s\S]*?\*\//,
  /\b(OR|AND)\s+1\s*=\s*1/i,
  /;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\s/i,
  /WAITFOR\s+DELAY/i,
  /BENCHMARK\s*\(/i,
  /SLEEP\s*\(/i,
  /INTO\s+OUTFILE/i,
  /LOAD_FILE\s*\(/i,
  /0x[0-9a-fA-F]{4,}/,
  /CHAR\s*\(\s*\d+/i,
  /xp_cmdshell/i,
  /sp_executesql/i,
];

const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /<script[\s\S]*?>/i,
  /javascript\s*:/i,
  /on(load|error|click|mouseover|submit|focus|blur|change|keydown|keyup|keypress|input|paste|copy|cut)\s*=/i,
  /<iframe[\s\S]*?>/i,
  /<object[\s\S]*?>/i,
  /<embed[\s\S]*?>/i,
  /<svg[\s\S]*?on\w+\s*=/i,
  /expression\s*\(/i,
  /vbscript\s*:/i,
  /<img[^>]+src\s*=\s*["']?\s*javascript:/i,
  /data\s*:\s*text\/html/i,
  /&#(x[0-9a-fA-F]+|[0-9]+);.*<script/i,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e\//i,
  /\.\.%2f/i,
  /%252e%252e/i,
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\/proc\/self/i,
  /\/windows\/system32/i,
  /\|/,                              // pipe character in paths
];

const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$]\s*(ls|cat|rm|wget|curl|bash|sh|python|perl|ruby|php|node)\b/i,
  /\$\(.*\)/,
  /`.*`/,
  /;\s*(id|whoami|uname|ifconfig|netstat|ps)\s/i,
  />\s*\/dev\/(null|tcp|udp)/i,
];

const NOSQL_INJECTION_PATTERNS = [
  /\$where\s*:/i,
  /\$gt\s*:/i,
  /\$ne\s*:/i,
  /\$or\s*:\s*\[/i,
  /\$regex\s*:/i,
  /\$expr\s*:/i,
  /\{\s*"\$.*"\s*:/,
];

const SSRF_PATTERNS = [
  /https?:\/\/(localhost|127\.0\.0\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)/i,
  /https?:\/\/0x[0-9a-fA-F]+/i,
  /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
  /file:\/\//i,
  /gopher:\/\//i,
  /dict:\/\//i,
];

// ── Endpoints where we DON'T check for SQL patterns (AI messages contain SQL for learning) ──
const SQL_EXEMPT_ENDPOINTS = ["/api/chat", "/api/council", "/api/godmode", "/api/agent"];

type AttackType = "sql_injection" | "xss" | "path_traversal" | "command_injection" | "nosql_injection" | "ssrf";

interface DetectedAttack {
  type: AttackType;
  severity: "medium" | "high" | "critical";
  field: string;
  pattern: string;
}

function checkPatterns(value: string, patterns: RegExp[], type: AttackType, severity: DetectedAttack["severity"], field: string): DetectedAttack | null {
  for (const pattern of patterns) {
    if (pattern.test(value)) {
      return { type, severity, field, pattern: pattern.toString() };
    }
  }
  return null;
}

function extractStrings(obj: unknown, prefix = "", depth = 0): Array<{ key: string; value: string }> {
  if (depth > 5) return [];
  if (typeof obj === "string") return [{ key: prefix, value: obj }];
  if (typeof obj === "number" || typeof obj === "boolean") return [];
  if (Array.isArray(obj)) {
    return obj.flatMap((item, i) => extractStrings(item, `${prefix}[${i}]`, depth + 1));
  }
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) =>
      extractStrings(v, prefix ? `${prefix}.${k}` : k, depth + 1),
    );
  }
  return [];
}

function detectAttacks(fields: Array<{ key: string; value: string }>, exemptSql: boolean): DetectedAttack[] {
  const attacks: DetectedAttack[] = [];

  for (const { key, value } of fields) {
    if (!value || value.length < 3) continue;

    if (!exemptSql) {
      const sqli = checkPatterns(value, SQL_INJECTION_PATTERNS, "sql_injection", "critical", key);
      if (sqli) attacks.push(sqli);
    }

    const xss = checkPatterns(value, XSS_PATTERNS, "xss", "high", key);
    if (xss) attacks.push(xss);

    const pt = checkPatterns(value, PATH_TRAVERSAL_PATTERNS, "path_traversal", "high", key);
    if (pt) attacks.push(pt);

    const cmd = checkPatterns(value, COMMAND_INJECTION_PATTERNS, "command_injection", "critical", key);
    if (cmd) attacks.push(cmd);

    const nosql = checkPatterns(value, NOSQL_INJECTION_PATTERNS, "nosql_injection", "high", key);
    if (nosql) attacks.push(nosql);

    const ssrf = checkPatterns(value, SSRF_PATTERNS, "ssrf", "high", key);
    if (ssrf) attacks.push(ssrf);
  }

  return attacks;
}

export function attackDetector(req: Request, res: Response, next: NextFunction): void {
  try {
    const isSqlExempt = SQL_EXEMPT_ENDPOINTS.some((ep) => req.path.startsWith(ep));

    // Gather all string values to check
    const fields: Array<{ key: string; value: string }> = [
      ...extractStrings(req.body, "body"),
      ...extractStrings(req.query, "query"),
      ...extractStrings(req.params, "params"),
      // Check specific headers that users control
      ...(req.headers["x-forwarded-for"] ? [{ key: "header.x-forwarded-for", value: String(req.headers["x-forwarded-for"]) }] : []),
      ...(req.headers["referer"] ? [{ key: "header.referer", value: String(req.headers["referer"]) }] : []),
    ];

    const attacks = detectAttacks(fields, isSqlExempt);

    if (attacks.length === 0) {
      next();
      return;
    }

    // Determine overall severity
    const maxSeverity = attacks.some((a) => a.severity === "critical")
      ? "critical"
      : attacks.some((a) => a.severity === "high")
        ? "high"
        : "medium";

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const userId = (req as Request & { authUser?: { id: string } }).authUser?.id;

    // Log attack (non-blocking)
    const attackSummary = attacks.map((a) => `${a.type}:${a.field}`).join(", ");
    logger.warn({ ip, path: req.path, method: req.method, attacks: attackSummary }, "[attack-detector] Attack blocked");

    // Async: record to DB + alert admins
    securityMonitor.recordAttack({
      userId,
      ip,
      userAgent: req.headers["user-agent"],
      path: req.path,
      method: req.method,
      attacks,
      severity: maxSeverity,
    }).catch((err) => logger.error({ err }, "[attack-detector] Failed to record attack"));

    // Generic 400 — never reveal what pattern matched
    res.status(400).json({ error: "Bad request" });
  } catch (err) {
    // If detector itself errors, log and allow request (fail-open to avoid DoS)
    logger.error({ err }, "[attack-detector] Detector error");
    next();
  }
}
