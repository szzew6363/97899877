/**
 * Tier-based rate limiter middleware.
 * Uses a sliding window (in-memory) per user.
 *
 * Limits (requests per minute):
 *   free        → 20 req/min
 *   starter     → 60 req/min
 *   professional→ 200 req/min
 *   elite       → 600 req/min
 *   anonymous   → 10 req/min
 */
import { type Request, type Response, type NextFunction } from "express";

interface Window {
  timestamps: number[];
}

const windows = new Map<string, Window>();

const TIER_LIMITS: Record<string, number> = {
  free:         20,
  starter:      60,
  professional: 200,
  elite:        600,
  anonymous:    10,
};

const WINDOW_MS = 60_000; // 1 minute

// Cleanup stale windows every 5 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, win] of windows) {
    win.timestamps = win.timestamps.filter(t => t > cutoff);
    if (win.timestamps.length === 0) windows.delete(key);
  }
}, 300_000);

export function tierRateLimit(req: Request, res: Response, next: NextFunction): void {
  const authUser = req.authUser;
  const tier     = (authUser?.subscription as string | undefined) ?? "anonymous";
  const userId   = authUser?.id ?? `ip:${req.ip}`;
  const limit    = TIER_LIMITS[tier] ?? TIER_LIMITS.anonymous;

  const now    = Date.now();
  const cutoff = now - WINDOW_MS;

  let win = windows.get(userId);
  if (!win) { win = { timestamps: [] }; windows.set(userId, win); }

  // Prune old timestamps
  win.timestamps = win.timestamps.filter(t => t > cutoff);

  if (win.timestamps.length >= limit) {
    const oldest = win.timestamps[0];
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    res.status(429).json({
      error: "Too many requests — slow down",
      tier,
      limit,
      retryAfter,
      upgradeUrl: "/app#pricing",
    });
    return;
  }

  win.timestamps.push(now);
  res.setHeader("X-RateLimit-Limit",     String(limit));
  res.setHeader("X-RateLimit-Remaining", String(limit - win.timestamps.length));
  res.setHeader("X-RateLimit-Reset",     String(Math.ceil((now + WINDOW_MS) / 1000)));
  next();
}
