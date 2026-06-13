type PrefetchHint = { key: string; probability: number; lastSeen: number };

const CACHE_TTL = 5 * 60 * 1000;

class PredictiveCache {
  private store = new Map<string, { value: string; ts: number }>();
  private hints = new Map<string, PrefetchHint>();
  private transitions = new Map<string, Map<string, number>>();
  private lastKey: string | null = null;
  private prefetchCount = 0;
  private hitCount = 0;

  private isExpired(ts: number): boolean { return Date.now() - ts > CACHE_TTL; }

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry.ts)) { this.store.delete(key); return null; }
    this.hitCount++;
    entry.ts = Date.now();
    return entry.value;
  }

  set(key: string, value: string) {
    this.store.set(key, { value, ts: Date.now() });
    this.recordAccess(key);
    if (this.store.size > 200) {
      const oldest = Array.from(this.store.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) this.store.delete(oldest[0]);
    }
  }

  recordAccess(key: string) {
    if (this.lastKey && this.lastKey !== key) {
      const after = this.transitions.get(this.lastKey) ?? new Map<string, number>();
      after.set(key, (after.get(key) ?? 0) + 1);
      this.transitions.set(this.lastKey, after);
    }
    this.lastKey = key;
  }

  getNextPredictions(key: string, topN = 3): string[] {
    const after = this.transitions.get(key);
    if (!after) return [];
    return Array.from(after.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([k]) => k);
  }

  async prefetch(key: string, fetchFn: () => Promise<string>) {
    if (this.get(key)) return;
    this.prefetchCount++;
    try {
      const value = await fetchFn();
      this.set(key, value);
    } catch { /* silent prefetch failure */ }
  }

  getStats() {
    return {
      cacheSize: this.store.size,
      prefetchCount: this.prefetchCount,
      hitCount: this.hitCount,
      transitionKeys: this.transitions.size,
      hintCount: this.hints.size,
    };
  }
}

export const predictiveCache = new PredictiveCache();
