import { getDetectedRefreshRate } from "./adaptive-quality";

export type PerfSnapshot = {
  fps: number;
  frameTimeMs: number;    /* actual ms per frame — precise on high-Hz displays */
  fpsDrop: boolean;       /* true when fps < 80% of target */
  memoryMB: number;
  memoryPct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  tps: number;
  totalTokens: number;
  totalRequests: number;
  cacheHitRate: number;
  queueDepth: number;
  activeRequests: number;
  sessionStartMs: number;
};

type Subscriber = (snap: PerfSnapshot) => void;

class PerfMonitor {
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private fps = 60;
  private frameTimeMs = 16.67;
  private rafId = 0;
  /* Moving window — last 60 frame timestamps for rolling average */
  private frameTimes: number[] = [];

  private latencies: number[] = [];
  private tpsWindow: { ts: number; tokens: number }[] = [];
  private totalTokens = 0;
  private totalRequests = 0;
  private cacheHitRate = 0;
  private queueDepth = 0;
  private activeRequests = 0;
  private sessionStartMs = Date.now();

  private subscribers = new Set<Subscriber>();
  private running = false;

  start() {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.tick);
    setInterval(() => this.broadcast(), 500);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (ts: number) => {
    this.frameCount++;
    const now = ts;

    /* Track frame delta using moving window (last 60 frames) */
    if (this.frameTimes.length > 0) {
      const delta = now - this.frameTimes[this.frameTimes.length - 1];
      if (delta > 0 && delta < 250) this.frameTimeMs = delta;
    }
    this.frameTimes.push(now);
    if (this.frameTimes.length > 60) this.frameTimes.shift();

    /* Rolling FPS from actual timestamps — accurate on 120/144/240Hz */
    if (this.frameTimes.length >= 2) {
      const span = now - this.frameTimes[0];
      this.fps = Math.round(((this.frameTimes.length - 1) * 1000) / span);
    }

    /* Fallback legacy counter */
    const elapsed = now - this.lastFpsTime;
    if (elapsed >= 500) { this.frameCount = 0; this.lastFpsTime = now; }

    if (this.running) this.rafId = requestAnimationFrame(this.tick);
  };

  recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 200) this.latencies.shift();
    this.totalRequests++;
  }

  recordTokens(count: number) {
    this.totalTokens += count;
    const now = Date.now();
    this.tpsWindow.push({ ts: now, tokens: count });
    this.tpsWindow = this.tpsWindow.filter((e) => now - e.ts < 5000);
  }

  updateCache(hitRate: number) { this.cacheHitRate = hitRate; }
  updateQueue(depth: number, active: number) { this.queueDepth = depth; this.activeRequests = active; }

  subscribe(cb: Subscriber) {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  private broadcast() {
    const snap = this.snapshot();
    this.subscribers.forEach((cb) => cb(snap));
  }

  snapshot(): PerfSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const avg = sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] : 0;

    const now = Date.now();
    const window5s = this.tpsWindow.filter((e) => now - e.ts < 5000);
    const windowTokens = window5s.reduce((a, e) => a + e.tokens, 0);
    const tps = window5s.length > 0 ? windowTokens / 5 : 0;

    let memoryMB = 0;
    let memoryPct = 0;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (mem) {
      memoryMB = mem.usedJSHeapSize / 1_048_576;
      memoryPct = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
    }

    const targetFps = getDetectedRefreshRate();
    const fpsDrop = this.fps < targetFps * 0.8;

    return {
      fps: this.fps,
      frameTimeMs: this.frameTimeMs,
      fpsDrop,
      memoryMB,
      memoryPct,
      avgLatencyMs: avg,
      p95LatencyMs: p95,
      tps,
      totalTokens: this.totalTokens,
      totalRequests: this.totalRequests,
      cacheHitRate: this.cacheHitRate,
      queueDepth: this.queueDepth,
      activeRequests: this.activeRequests,
      sessionStartMs: this.sessionStartMs,
    };
  }
}

export const perfMonitor = new PerfMonitor();

if (typeof window !== "undefined") {
  perfMonitor.start();
}
