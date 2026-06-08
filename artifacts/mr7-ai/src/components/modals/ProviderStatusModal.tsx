import { useState, useEffect, useCallback } from "react";
import { Wifi, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

interface ProviderResult {
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
  testedAt: number;
}

type KnownProvider = {
  id: string;
  label: string;
  color: string;
  model: string;
};

const KNOWN_PROVIDERS: KnownProvider[] = [
  { id: "personal",   label: "Personal API",   color: "#e21227", model: "default" },
  { id: "openai",     label: "OpenAI",          color: "#10b981", model: "gpt-4o-mini" },
  { id: "anthropic",  label: "Anthropic",        color: "#f97316", model: "claude-3-haiku-20240307" },
  { id: "groq",       label: "Groq",             color: "#f59e0b", model: "llama-3.1-8b-instant" },
  { id: "gemini",     label: "Gemini",           color: "#3b82f6", model: "gemini-1.5-flash" },
  { id: "openrouter", label: "OpenRouter",       color: "#8b5cf6", model: "openai/gpt-4o-mini" },
];

function getLatencyColor(ms: number | null): string {
  if (ms === null) return "#555";
  if (ms < 500) return "#22c55e";
  if (ms < 1500) return "#f59e0b";
  return "#ef4444";
}

function getLatencyLabel(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 500) return "سريع";
  if (ms < 1500) return "عادي";
  return "بطيء";
}

export function ProviderStatusModal({ open, onOpenChange }: Props) {
  const { state } = useStore();
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, ProviderResult>>({});
  const [testing, setTesting] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [autoRefreshIn, setAutoRefreshIn] = useState(30);

  const testProvider = useCallback(async (prov: KnownProvider) => {
    setTesting(prev => new Set(prev).add(prov.id));
    const start = Date.now();
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: prov.id, model: prov.model }),
      });
      const data = await res.json() as { ok?: boolean; latencyMs?: number; error?: string };
      const elapsed = Date.now() - start;
      setResults(prev => ({
        ...prev,
        [prov.id]: {
          ok: data.ok ?? false,
          latencyMs: data.latencyMs ?? elapsed,
          error: data.error ?? null,
          testedAt: Date.now(),
        },
      }));
    } catch (e) {
      setResults(prev => ({
        ...prev,
        [prov.id]: {
          ok: false,
          latencyMs: null,
          error: e instanceof Error ? e.message : "Network error",
          testedAt: Date.now(),
        },
      }));
    } finally {
      setTesting(prev => { const n = new Set(prev); n.delete(prov.id); return n; });
    }
  }, []);

  const testAll = useCallback(async () => {
    setLastRefresh(Date.now());
    setAutoRefreshIn(30);
    await Promise.all(KNOWN_PROVIDERS.map(p => testProvider(p)));
    toast({ description: `تم اختبار ${KNOWN_PROVIDERS.length} مزود AI` });
  }, [testProvider, toast]);

  useEffect(() => {
    if (!open) return;
    testAll();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setAutoRefreshIn(prev => {
        if (prev <= 1) { void testAll(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, testAll]);

  if (!open) return null;

  const isAnyTesting = testing.size > 0;
  const connected = Object.values(results).filter(r => r.ok).length;
  const failed = Object.values(results).filter(r => !r.ok).length;
  const okResults = Object.values(results).filter(r => r.ok && r.latencyMs !== null);
  const avgLatency = okResults.length > 0
    ? Math.round(okResults.reduce((a, r) => a + (r.latencyMs ?? 0), 0) / okResults.length)
    : 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "#060606" }}>
      {/* Header */}
      <div className="p-4 border-b shrink-0 flex items-center justify-between" style={{ borderColor: "#3b82f618", background: "#3b82f604" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { l: "REAL-TIME", c: "#3b82f6" },
              { l: "AUTO-REFRESH 30s", c: "#22c55e" },
              { l: `${KNOWN_PROVIDERS.length} PROVIDERS`, c: "#f59e0b" },
            ].map(b => (
              <span key={b.l} className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border"
                style={{ borderColor: b.c + "40", color: b.c, background: b.c + "10" }}>{b.l}</span>
            ))}
          </div>
          {lastRefresh && (
            <p className="text-[9px] font-mono" style={{ color: "#333" }}>
              آخر فحص: {new Date(lastRefresh).toLocaleTimeString("ar")} · تحديث خلال {autoRefreshIn}s
            </p>
          )}
        </div>
        <button
          onClick={() => void testAll()}
          disabled={isAnyTesting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[11px] transition-all disabled:opacity-50"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)", color: "#3b82f6" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnyTesting ? "animate-spin" : ""}`} />
          {isAnyTesting ? "جارٍ الاختبار..." : "فحص الكل"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Active provider banner */}
        {state.activeProvider && (
          <div className="rounded-xl px-4 py-2.5 border mb-3 flex items-center gap-2 flex-wrap"
            style={{ borderColor: "#e2122740", background: "#e2122708" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#e21227" }} />
            <p className="text-[10px] font-mono font-bold uppercase" style={{ color: "#e21227" }}>
              المزود النشط: {state.activeProvider}
            </p>
            {state.activeProviderModel && (
              <p className="text-[9px] font-mono text-muted-foreground">/ {state.activeProviderModel}</p>
            )}
          </div>
        )}

        {/* Provider cards */}
        {KNOWN_PROVIDERS.map(prov => {
          const r = results[prov.id];
          const isTesting = testing.has(prov.id);
          const isActive = state.activeProvider === prov.id;

          return (
            <div key={prov.id}
              className="rounded-xl border p-4 transition-all"
              style={{ background: "#0a0a0a", borderColor: isActive ? prov.color + "40" : "#1a1a1a" }}
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div className="flex-shrink-0 w-5 flex items-center justify-center">
                  {isTesting ? (
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: prov.color }} />
                  ) : r ? (
                    r.ok
                      ? <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                      : <XCircle className="w-4 h-4" style={{ color: "#ef4444" }} />
                  ) : (
                    <AlertCircle className="w-4 h-4" style={{ color: "#374151" }} />
                  )}
                </div>

                {/* Provider info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: prov.color }} />
                    <p className="text-[12px] font-bold" style={{ color: prov.color }}>{prov.label}</p>
                    {isActive && (
                      <span className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ background: prov.color + "15", color: prov.color, border: `1px solid ${prov.color}30` }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{prov.model}</p>
                  {r?.error && (
                    <p className="text-[9px] font-mono mt-0.5 truncate" style={{ color: "#ef444480" }}>{r.error}</p>
                  )}
                </div>

                {/* Latency display */}
                <div className="flex-shrink-0 text-right min-w-[60px]">
                  {isTesting ? (
                    <p className="text-[9px] font-mono" style={{ color: "#555" }}>جارٍ...</p>
                  ) : r ? (
                    <>
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" style={{ color: getLatencyColor(r.latencyMs) }} />
                        <p className="text-[13px] font-black font-mono" style={{ color: getLatencyColor(r.latencyMs) }}>
                          {r.latencyMs !== null ? `${r.latencyMs}ms` : "—"}
                        </p>
                      </div>
                      <p className="text-[8px] font-mono" style={{ color: getLatencyColor(r.latencyMs) }}>
                        {getLatencyLabel(r.latencyMs)}
                      </p>
                    </>
                  ) : (
                    <p className="text-[9px] font-mono" style={{ color: "#333" }}>لم يُختبر</p>
                  )}
                </div>

                {/* Individual test button */}
                <button
                  onClick={() => void testProvider(prov)}
                  disabled={isTesting}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg border text-[9px] font-mono font-bold transition-all disabled:opacity-40"
                  style={{ borderColor: prov.color + "30", color: prov.color + "cc", background: prov.color + "08" }}
                >
                  فحص
                </button>
              </div>

              {/* Latency bar */}
              {r?.ok && r.latencyMs !== null && (
                <div className="mt-3">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (r.latencyMs / 3000) * 100)}%`,
                        background: getLatencyColor(r.latencyMs),
                        boxShadow: `0 0 8px ${getLatencyColor(r.latencyMs)}60`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[7px] font-mono" style={{ color: "#222" }}>0ms</span>
                    <span className="text-[7px] font-mono" style={{ color: "#222" }}>3000ms</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary stats */}
        {Object.keys(results).length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "متصل", value: connected, color: "#22c55e" },
              { label: "مقطوع", value: failed, color: "#ef4444" },
              { label: "متوسط Ping", value: `${avgLatency}ms`, color: "#3b82f6" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 border text-center" style={{ background: "#0d0d0d", borderColor: s.color + "20" }}>
                <p className="text-[18px] font-black font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: "#444" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Fallback chain */}
        {(state.settings.providerFallbackChain ?? []).length > 0 && (
          <div className="mt-4 rounded-xl border p-3" style={{ background: "#0a0a0a", borderColor: "#262626" }}>
            <p className="text-[9px] font-mono font-bold mb-2 uppercase tracking-wider" style={{ color: "#555" }}>
              سلسلة الاحتياط النشطة
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(state.settings.providerFallbackChain ?? []).map((fb, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-mono"
                  style={{ borderColor: "#1f1f1f", background: "#111", color: "#666" }}>
                  <span style={{ color: "#444" }}>{i + 1}.</span>
                  <span>{fb.provider}</span>
                  {fb.model && <span style={{ color: "#444" }}>/{fb.model.split("/").pop()}</span>}
                  {results[fb.provider] && (
                    results[fb.provider].ok
                      ? <CheckCircle2 className="w-2.5 h-2.5 ml-0.5" style={{ color: "#22c55e" }} />
                      : <XCircle className="w-2.5 h-2.5 ml-0.5" style={{ color: "#ef4444" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
