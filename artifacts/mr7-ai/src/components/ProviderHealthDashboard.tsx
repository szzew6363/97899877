/**
 * Provider Health Dashboard
 * Real-time health, latency, success rate, and token pricing for all providers.
 * Draggable floating panel.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { X, Minus, Activity, RefreshCw, TrendingUp, DollarSign, Zap } from "lucide-react";

type ProviderHealth = {
  provider: string;
  available: boolean;
  latencyMs: number | null;
  successRate: number;
  lastCheckAt: number;
  errorCount: number;
  totalCalls: number;
  status: "healthy" | "degraded" | "down" | "unknown";
};

type TokenPrice = { model: string; input: number; output: number; provider: string };

type DashboardData = {
  providers: ProviderHealth[];
  summary: {
    totalProviders: number;
    healthyProviders: number;
    downProviders: number;
    avgLatencyMs: number;
    cacheHits: number;
    savedCalls: number;
  };
};

const STATUS_COLOR: Record<string, string> = {
  healthy: "#22c55e",
  degraded: "#f59e0b",
  down: "#e21227",
  unknown: "#888888",
};

const PROVIDER_LABELS: Record<string, string> = {
  personal: "Personal",
  openai: "OpenAI",
  anthropic: "Anthropic",
  groq: "Groq",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  custom: "Custom",
};

export function ProviderHealthDashboard({ onClose }: { onClose: () => void }) {
  const [pos, setPos] = useState({ x: Math.max(20, window.innerWidth - 440 - 20), y: 80 });
  const [minimized, setMinimized] = useState(false);
  const [tab, setTab] = useState<"health" | "pricing">("health");
  const [data, setData] = useState<DashboardData | null>(null);
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [probing, setProbing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const BASE = (window as Window & { __API_BASE__?: string }).__API_BASE__ ?? "";

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai-engine/dashboard`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json() as DashboardData & { ok: boolean };
        setData(d);
        setLastRefresh(Date.now());
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [BASE]);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/ai-engine/pricing`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json() as { ok: boolean; models: TokenPrice[] };
        setPrices(d.models ?? []);
      }
    } catch { /* ignore */ }
  }, [BASE]);

  const probe = useCallback(async () => {
    setProbing(true);
    try {
      await fetch(`${BASE}/api/ai-engine/probe`, { method: "POST", credentials: "include" });
      await fetchDashboard();
    } catch { /* ignore */ } finally {
      setProbing(false);
    }
  }, [BASE, fetchDashboard]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    if (tab === "pricing") fetchPrices();
  }, [tab, fetchPrices]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    function mv(e: MouseEvent) {
      if (!dragRef.current) return;
      setPos({ x: dragRef.current.px + e.clientX - dragRef.current.ox, y: dragRef.current.py + e.clientY - dragRef.current.oy });
    }
    function up() { dragRef.current = null; }
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  const tabBtn = (t: "health" | "pricing", icon: React.ReactNode, label: string) => (
    <button onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? "1px solid #00e5ff" : "1px solid transparent", color: tab === t ? "#00e5ff" : "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.08em", padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase" }}>
      {icon}{label}
    </button>
  );

  const latencyColor = (ms: number | null) => {
    if (ms === null) return "#888";
    if (ms < 500) return "#22c55e";
    if (ms < 1500) return "#f59e0b";
    return "#e21227";
  };

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: 420, zIndex: 9995, userSelect: "none", filter: "drop-shadow(0 0 20px rgba(0,229,255,0.10))", fontFamily: "monospace" }}>
      {/* Header */}
      <div onMouseDown={onMouseDown} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "linear-gradient(90deg, rgba(0,229,255,0.07), rgba(34,197,94,0.04))", borderRadius: minimized ? "8px" : "8px 8px 0 0", border: "1px solid rgba(0,229,255,0.2)", borderBottom: minimized ? undefined : "1px solid rgba(0,229,255,0.08)", cursor: "grab", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={12} color="#00e5ff" />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>AI PROVIDER HEALTH</span>
          {data && (
            <span style={{ fontSize: 8, color: data.summary.healthyProviders > 0 ? "#22c55e" : "#e21227", background: data.summary.healthyProviders > 0 ? "rgba(34,197,94,0.1)" : "rgba(226,18,39,0.1)", borderRadius: 3, padding: "1px 5px", border: `1px solid ${data.summary.healthyProviders > 0 ? "rgba(34,197,94,0.25)" : "rgba(226,18,39,0.25)"}` }}>
              {data.summary.healthyProviders}/{data.summary.totalProviders} UP
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={probe} disabled={probing} title="Force probe all providers" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: 2 }}>
            <RefreshCw size={11} style={{ animation: probing ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button onClick={() => setMinimized(m => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: 2 }}><Minus size={11} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: 2 }}><X size={11} /></button>
        </div>
      </div>

      {!minimized && (
        <div style={{ background: "rgba(4,8,12,0.97)", border: "1px solid rgba(0,229,255,0.12)", borderTop: "none", borderRadius: "0 0 8px 8px", backdropFilter: "blur(16px)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,229,255,0.06)", padding: "0 8px" }}>
            {tabBtn("health", <Activity size={9} />, "Health")}
            {tabBtn("pricing", <DollarSign size={9} />, "Pricing")}
          </div>

          {/* Summary strip */}
          {tab === "health" && data && (
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {[
                { label: "AVG LATENCY", val: data.summary.avgLatencyMs ? `${data.summary.avgLatencyMs}ms` : "—", color: latencyColor(data.summary.avgLatencyMs) },
                { label: "CACHE HITS", val: data.summary.cacheHits.toString(), color: "#a78bfa" },
                { label: "SAVED CALLS", val: data.summary.savedCalls.toString(), color: "#22c55e" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: "center", padding: "6px 4px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 12, color: s.color, fontWeight: "bold" }}>{s.val}</div>
                  <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Health tab */}
          {tab === "health" && (
            <div style={{ padding: "10px" }}>
              {loading && !data && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 20 }}>Loading...</div>}
              {data?.providers.map(p => (
                <div key={p.provider} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 4, background: "rgba(255,255,255,0.02)", borderRadius: 6, border: `1px solid ${STATUS_COLOR[p.status]}18` }}>
                  {/* Status dot */}
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[p.status], flexShrink: 0, boxShadow: p.status === "healthy" ? `0 0 6px ${STATUS_COLOR[p.status]}` : "none" }} />
                  {/* Name */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{PROVIDER_LABELS[p.provider] ?? p.provider}</div>
                    <div style={{ fontSize: 8, color: STATUS_COLOR[p.status], marginTop: 1 }}>{p.status}</div>
                  </div>
                  {/* Latency */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: latencyColor(p.latencyMs) }}>{p.latencyMs !== null ? `${p.latencyMs}ms` : "—"}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>latency</div>
                  </div>
                  {/* Success rate */}
                  <div style={{ textAlign: "right", minWidth: 40 }}>
                    <div style={{ fontSize: 11, color: p.successRate >= 0.9 ? "#22c55e" : p.successRate >= 0.6 ? "#f59e0b" : "#e21227" }}>
                      {p.totalCalls > 0 ? `${Math.round(p.successRate * 100)}%` : "—"}
                    </div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>success</div>
                  </div>
                  {/* Calls */}
                  <div style={{ textAlign: "right", minWidth: 32 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{p.totalCalls}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>calls</div>
                  </div>
                </div>
              ))}
              {lastRefresh && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", textAlign: "right", marginTop: 6 }}>Updated {new Date(lastRefresh).toLocaleTimeString()}</div>}
            </div>
          )}

          {/* Pricing tab */}
          {tab === "pricing" && (
            <div style={{ padding: "10px", maxHeight: 360, overflowY: "auto" }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>USD per 1M tokens (input / output) — sorted cheapest first</div>
              {prices.slice(0, 30).map(p => (
                <div key={p.model} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", marginBottom: 2, background: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.model}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{p.provider}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#22c55e" }}>${p.input}</div>
                      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>input</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#f59e0b" }}>${p.output}</div>
                      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>output</div>
                    </div>
                  </div>
                </div>
              ))}
              {prices.length === 0 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: 20 }}>Loading pricing data...</div>}
              <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 5, fontSize: 9, color: "#22c55e" }}>
                <TrendingUp size={9} style={{ display: "inline", marginRight: 4 }} />
                Cheapest: {prices[0]?.model ?? "—"} @ ${prices[0]?.input ?? 0}/M input tokens
              </div>
            </div>
          )}

          {/* Prompt cache summary */}
          {tab === "health" && data && data.summary.savedCalls > 0 && (
            <div style={{ margin: "0 10px 10px", padding: "6px 10px", background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={10} color="#a78bfa" />
                <span style={{ fontSize: 9, color: "#a78bfa" }}>
                  Prompt Cache: {data.summary.cacheHits} hits · {data.summary.savedCalls} API calls saved
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProviderHealthDashboard;
