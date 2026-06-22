/**
 * Client-side error monitoring — captures JS errors and sends to /api/admin/log-error
 * Surfaces in Admin Panel as error log
 */

interface ErrorEntry {
  ts: string;
  level: "error" | "warn";
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  col?: number;
}

const errorLog: ErrorEntry[] = [];
const MAX_LOCAL = 200;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pending: ErrorEntry[] = [];

function enqueue(entry: ErrorEntry) {
  errorLog.unshift(entry);
  if (errorLog.length > MAX_LOCAL) errorLog.splice(MAX_LOCAL);
  pending.push(entry);
  if (!flushTimer) {
    flushTimer = setTimeout(flush, 3000);
  }
}

async function flush() {
  flushTimer = null;
  if (!pending.length) return;
  const batch = pending.splice(0, pending.length);
  try {
    for (const e of batch) {
      await fetch("/api/admin/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: e.level, message: e.message, stack: e.stack }),
      });
    }
  } catch { /* offline */ }
}

export function getErrorLog(): ErrorEntry[] {
  return [...errorLog];
}

export function initErrorMonitor() {
  if (typeof window === "undefined") return;
  if ((window as any).__mr7ErrorMonitorInit) return;
  (window as any).__mr7ErrorMonitorInit = true;

  window.addEventListener("error", (e) => {
    enqueue({
      ts: new Date().toISOString(),
      level: "error",
      message: e.message || String(e.error),
      stack: e.error?.stack,
      url: e.filename,
      line: e.lineno,
      col: e.colno,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason instanceof Error
      ? e.reason.message
      : String(e.reason);
    enqueue({
      ts: new Date().toISOString(),
      level: "error",
      message: `Unhandled Promise: ${msg}`,
      stack: e.reason instanceof Error ? e.reason.stack : undefined,
    });
  });

  const origConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    origConsoleError(...args);
    const msg = args.map(a => (a instanceof Error ? a.message : String(a))).join(" ");
    if (!msg.includes("[mr7-monitor]")) {
      enqueue({ ts: new Date().toISOString(), level: "error", message: msg });
    }
  };

  const origConsoleWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    origConsoleWarn(...args);
    const msg = args.map(a => String(a)).join(" ");
    enqueue({ ts: new Date().toISOString(), level: "warn", message: msg });
  };
}

export function captureError(err: unknown, context?: string) {
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  enqueue({
    ts: new Date().toISOString(),
    level: "error",
    message: context ? `[${context}] ${msg}` : msg,
    stack,
  });
}
