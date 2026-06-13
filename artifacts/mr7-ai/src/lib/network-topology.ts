export type NetRequest = {
  id: string;
  provider: string;
  model: string;
  status: "active" | "success" | "error";
  latencyMs: number;
  tokens: number;
  ts: number;
};

export type NetStats = {
  totalRequests: number;
  avgLatencyMs: number;
  errorRate: number;
  activeCount: number;
  byProvider: Record<string, { count: number; avgLatencyMs: number; errors: number }>;
};

let _id = 0;

class NetworkTopology {
  private records: NetRequest[] = [];
  private active = new Map<string, NetRequest>();
  private subscribers = new Set<() => void>();

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }
  private notify() { this.subscribers.forEach((cb) => cb()); }

  startRequest(provider: string, model: string): string {
    const id = `req-${++_id}-${Date.now().toString(36)}`;
    const rec: NetRequest = { id, provider, model, status: "active", latencyMs: 0, tokens: 0, ts: Date.now() };
    this.active.set(id, rec);
    this.records.unshift({ ...rec });
    if (this.records.length > 100) this.records.length = 100;
    this.notify();
    return id;
  }

  endRequest(id: string, latencyMs: number, tokens: number, isError = false) {
    const rec = this.active.get(id);
    if (!rec) return;
    this.active.delete(id);
    const final: NetRequest = { ...rec, status: isError ? "error" : "success", latencyMs, tokens, };
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx >= 0) this.records[idx] = final; else this.records.unshift(final);
    if (this.records.length > 100) this.records.length = 100;
    this.notify();
  }

  getRecords(): NetRequest[] { return [...this.records]; }
  getActive(): Map<string, NetRequest> { return new Map(this.active); }

  getStats(): NetStats {
    const done = this.records.filter((r) => r.status !== "active");
    const totalRequests = done.length;
    const avgLatencyMs = done.length > 0 ? done.reduce((s, r) => s + r.latencyMs, 0) / done.length : 0;
    const errors = done.filter((r) => r.status === "error").length;
    const errorRate = done.length > 0 ? errors / done.length : 0;
    const byProvider: NetStats["byProvider"] = {};
    done.forEach((r) => {
      const p = (byProvider[r.provider] ??= { count: 0, avgLatencyMs: 0, errors: 0 });
      p.count++;
      p.avgLatencyMs = (p.avgLatencyMs * (p.count - 1) + r.latencyMs) / p.count;
      if (r.status === "error") p.errors++;
    });
    return { totalRequests, avgLatencyMs, errorRate, activeCount: this.active.size, byProvider };
  }
}

export const networkTopology = new NetworkTopology();
