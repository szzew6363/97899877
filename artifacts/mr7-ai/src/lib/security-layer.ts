export type AuditEventType =
  | "input_sanitized" | "rate_limited" | "request_validated"
  | "xss_blocked" | "injection_blocked" | "request_sent"
  | "response_received" | "error_caught" | "session_start";

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  severity: "info" | "warn" | "critical";
  message: string;
  ts: number;
  meta?: Record<string, string | number | boolean>;
};

export type SecurityStats = {
  totalInputs: number;
  sanitized: number;
  blocked: number;
  rateLimited: number;
  requestsSent: number;
  errorsCount: number;
};

const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b/gi,
  /data:text\/html/gi,
];

const INJECTION_PATTERNS = [
  /;\s*(drop|delete|insert|update|exec)\s+/gi,
  /union\s+select/gi,
  /\/etc\/passwd/gi,
  /\.\.\//g,
];

const AUDIT_STORAGE_KEY = "mr7-audit-trail-v1";
const MAX_AUDIT_ENTRIES = 500;

let _counter = 0;
function makeId() { return `sec-${++_counter}-${Date.now().toString(36)}`; }

class SecurityLayerEngine {
  private auditTrail: AuditEvent[] = [];
  private rateLimitMap = new Map<string, { count: number; windowStart: number }>();
  private stats: SecurityStats = { totalInputs: 0, sanitized: 0, blocked: 0, rateLimited: 0, requestsSent: 0, errorsCount: 0 };
  private subscribers = new Set<(e: AuditEvent) => void>();

  constructor() {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) this.auditTrail = JSON.parse(stored).slice(0, 100);
    } catch { /* ignore */ }
    this.audit("session_start", "info", "Security layer initialized");
  }

  subscribe(cb: (e: AuditEvent) => void): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  getStats(): SecurityStats { return { ...this.stats }; }
  getAuditTrail(): AuditEvent[] { return [...this.auditTrail]; }

  audit(type: AuditEventType, severity: AuditEvent["severity"], message: string, meta?: AuditEvent["meta"]): AuditEvent {
    const event: AuditEvent = { id: makeId(), type, severity, message, ts: Date.now(), meta };
    this.auditTrail.unshift(event);
    if (this.auditTrail.length > MAX_AUDIT_ENTRIES) this.auditTrail.length = MAX_AUDIT_ENTRIES;
    this.subscribers.forEach((cb) => cb(event));
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.auditTrail.slice(0, 100)));
    } catch { /* ignore */ }
    return event;
  }

  sanitize(input: string): string {
    this.stats.totalInputs++;
    let out = input;
    let wasSanitized = false;

    for (const p of XSS_PATTERNS) {
      if (p.test(out)) {
        wasSanitized = true;
        this.stats.blocked++;
        this.audit("xss_blocked", "critical", `XSS pattern detected and removed`, { pattern: p.source.slice(0, 40) });
      }
      out = out.replace(p, "");
    }
    for (const p of INJECTION_PATTERNS) {
      if (p.test(out)) {
        wasSanitized = true;
        this.stats.blocked++;
        this.audit("injection_blocked", "warn", `Injection pattern detected`, { pattern: p.source.slice(0, 40) });
      }
    }
    if (wasSanitized) {
      this.stats.sanitized++;
      this.audit("input_sanitized", "warn", `Input sanitized before processing`);
    }
    return out;
  }

  checkRateLimit(key: string, maxPerMin = 30): boolean {
    const now = Date.now();
    const window = 60000;
    const entry = this.rateLimitMap.get(key);
    if (!entry || now - entry.windowStart > window) {
      this.rateLimitMap.set(key, { count: 1, windowStart: now });
      return true;
    }
    entry.count++;
    if (entry.count > maxPerMin) {
      this.stats.rateLimited++;
      this.audit("rate_limited", "warn", `Rate limit exceeded for key: ${key.slice(0, 20)}`, { count: entry.count, max: maxPerMin });
      return false;
    }
    return true;
  }

  recordRequestSent() { this.stats.requestsSent++; this.audit("request_sent", "info", `API request dispatched`); }
  recordError(msg: string) { this.stats.errorsCount++; this.audit("error_caught", "warn", msg.slice(0, 80)); }
}

export const securityLayer = new SecurityLayerEngine();
