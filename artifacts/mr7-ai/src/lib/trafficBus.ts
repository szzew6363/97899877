/* ═══════════════════════════════════════════════════════════════
   TRAFFIC BUS — Global pub/sub for real-time API call tracking
   Emits events that NetworkTrafficPanel subscribes to.
═══════════════════════════════════════════════════════════════ */

export type TrafficStatus = "pending" | "success" | "error" | "streaming";

export interface TrafficEvent {
  id: string;
  model: string;
  provider: string;
  startTime: number;
  endTime?: number;
  latency?: number;
  tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  bytesSent?: number;
  bytesReceived?: number;
  status: TrafficStatus;
  endpoint: string;
}

type Listener = (event: TrafficEvent) => void;

class TrafficBus {
  private listeners: Listener[] = [];
  private _history: TrafficEvent[] = [];
  private maxHistory = 50;

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  emit(event: TrafficEvent): void {
    const idx = this._history.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      this._history[idx] = event;
    } else {
      this._history.unshift(event);
      if (this._history.length > this.maxHistory) this._history.pop();
    }
    this.listeners.forEach(fn => fn(event));
  }

  get history(): TrafficEvent[] { return this._history; }

  startCall(params: { model: string; provider: string; endpoint: string; bytesSent?: number }): string {
    const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.emit({
      id,
      model: params.model,
      provider: params.provider,
      endpoint: params.endpoint,
      startTime: Date.now(),
      status: "pending",
      bytesSent: params.bytesSent ?? 0,
    });
    return id;
  }

  updateCall(id: string, updates: Partial<TrafficEvent>): void {
    const existing = this._history.find(e => e.id === id);
    if (!existing) return;
    const merged: TrafficEvent = { ...existing, ...updates };
    if (merged.endTime && merged.startTime) {
      merged.latency = merged.endTime - merged.startTime;
    }
    this.emit(merged);
  }

  completeCall(id: string, params: { tokens?: number; inputTokens?: number; outputTokens?: number; bytesReceived?: number }): void {
    this.updateCall(id, {
      status: "success",
      endTime: Date.now(),
      ...params,
    });
  }

  failCall(id: string): void {
    this.updateCall(id, { status: "error", endTime: Date.now() });
  }
}

export const trafficBus = new TrafficBus();
