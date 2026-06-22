/**
 * Token Monitor — watches subscription token usage and pushes server-side
 * notifications at 80% and 95% consumption thresholds.
 * 
 * Runs as a singleton. Call startTokenMonitor() once in App.tsx.
 */
import { getCachedUser, authFetch } from "./auth";

const WARNED_KEY = "mr7_token_warn_v1"; // localStorage key

interface WarnedState {
  [userId: string]: {
    pct80?: number;  // timestamp when 80% warn was sent
    pct95?: number;  // timestamp when 95% warn was sent
    period?: string; // "YYYY-MM" period marker
  };
}

function getWarnedState(): WarnedState {
  try { return JSON.parse(localStorage.getItem(WARNED_KEY) ?? "{}") as WarnedState; }
  catch { return {}; }
}
function saveWarnedState(s: WarnedState) {
  localStorage.setItem(WARNED_KEY, JSON.stringify(s));
}

// Current period key (monthly reset)
function getPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function pushTokenWarning(level: "80" | "95", tokensUsed: number, tokensTotal: number) {
  try {
    await authFetch("/api/notifications", {
      method: "POST",
      body: JSON.stringify({
        type: "token_warning",
        title: level === "80" ? "تحذير: 80% من رصيد التوكنز" : "تنبيه: 95% من رصيد التوكنز — يوشك على النفاد",
        body: level === "80"
          ? `استهلكت ${tokensUsed.toLocaleString()} من ${tokensTotal.toLocaleString()} توكن (80%). فكّر في الترقية قريباً.`
          : `تبقى لك ${(tokensTotal - tokensUsed).toLocaleString()} توكن فقط! قم بالترقية لتجنب الانقطاع.`,
        data: { tokensUsed, tokensTotal, level },
      }),
    });
  } catch { /* offline — silent */ }
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;

export function startTokenMonitor(
  getTokensUsed: () => number,
  getTokensTotal: () => number,
) {
  if (monitorInterval) return; // already running

  function check() {
    const user = getCachedUser();
    if (!user) return;

    const used  = getTokensUsed();
    const total = getTokensTotal();
    if (!total || total <= 0) return;

    const pct = used / total;
    const period = getPeriod();
    const warned = getWarnedState();
    const uid  = user.id ?? "anon";
    const entry = warned[uid] ?? {};

    // Reset warnings on new billing period
    if (entry.period !== period) {
      warned[uid] = { period };
      saveWarnedState(warned);
      return;
    }

    if (pct >= 0.95 && !entry.pct95) {
      entry.pct95 = Date.now();
      warned[uid] = entry;
      saveWarnedState(warned);
      void pushTokenWarning("95", used, total);
    } else if (pct >= 0.80 && !entry.pct80) {
      entry.pct80 = Date.now();
      warned[uid] = entry;
      saveWarnedState(warned);
      void pushTokenWarning("80", used, total);
    }
  }

  check(); // run immediately
  monitorInterval = setInterval(check, 60_000); // check every minute
}

export function stopTokenMonitor() {
  if (monitorInterval) { clearInterval(monitorInterval); monitorInterval = null; }
}
