import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, RefreshCw, TrendingUp, Clock, Zap, Trophy, BarChart3, Download } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   BENCHMARK HISTORY — 3D TIME-SERIES CHART
   Canvas-based 3D perspective bar chart with animated particle effects.
   localStorage key: mr7-bench-history
══════════════════════════════════════════════════════════════════════ */

const LS_KEY = "mr7-bench-history";

export interface BenchHistoryResult {
  name: string;
  avgTps: number;
  avgTtft: number;
  minTps: number;
  maxTps: number;
}

export interface BenchHistoryEntry {
  ts: number;
  prompt: string;
  results: BenchHistoryResult[];
}

export function loadBenchHistory(): BenchHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch { return []; }
}

export function saveBenchEntry(entry: BenchHistoryEntry): void {
  try {
    const h = loadBenchHistory();
    h.unshift(entry);
    if (h.length > 50) h.length = 50;
    localStorage.setItem(LS_KEY, JSON.stringify(h));
  } catch { /* quota */ }
}

export function clearBenchHistory(): void {
  localStorage.removeItem(LS_KEY);
}

// ── Model color palette ─────────────────────────────────────────────
const MODEL_PALETTE: Record<string, string> = {
  "qwen2.5:0.5b":           "#10b981",
  "qwen2:0.5b":             "#10b981",
  "tinyllama":               "#f59e0b",
  "deepseek-r1:1.5b":       "#0ea5e9",
  "llama3.2:1b":             "#8b5cf6",
  "gemma2:2b":               "#ec4899",
  "phi3:mini":               "#06b6d4",
  "mistral:7b-q4_0":        "#f97316",
  "smollm:135m":             "#22d3ee",
  "smollm:1.7b":             "#34d399",
  "qwen2.5:1.5b":            "#a3e635",
  "qwen2.5:3b":              "#4ade80",
  "qwen2.5-coder:1.5b":     "#38bdf8",
  "llama3.2:3b":             "#c084fc",
  "phi3.5:mini":             "#67e8f9",
  "orca-mini:3b":            "#fb923c",
  "stablelm2:1.6b":          "#facc15",
};
function modelColor(name: string): string {
  const exact = MODEL_PALETTE[name];
  if (exact) return exact;
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  const hue = (h % 360 + 360) % 360;
  return `hsl(${hue},80%,60%)`;
}

// ── 3D projection helpers ───────────────────────────────────────────
function project(x: number, y: number, z: number, W: number, H: number) {
  const fov   = 700;
  const camZ  = 600;
  const camY  = -140;
  const scale = fov / (fov + z - camZ);
  return {
    sx: W * 0.5 + x * scale,
    sy: H * 0.55 + (y + camY) * scale,
    scale,
  };
}

// ── Main 3D Chart Canvas ────────────────────────────────────────────
function Chart3D({ history, animating }: { history: BenchHistoryEntry[]; animating: boolean }) {
  const ref    = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef   = useRef(0);
  const progRef = useRef(0);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    function resize() {
      W = cv!.width  = cv!.offsetWidth  * DPR;
      H = cv!.height = cv!.offsetHeight * DPR;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    if (animating) progRef.current = 0;

    // collect all unique model names across history
    const allModels = Array.from(
      new Set(history.flatMap(e => e.results.map(r => r.name)))
    ).slice(0, 8);

    const sessions = history.slice(0, 10).reverse(); // oldest first
    const maxTps   = Math.max(...history.flatMap(e => e.results.map(r => r.avgTps)), 10);

    // bar layout
    const BAR_W   = 32;
    const GAP_X   = 52;
    const GAP_Z   = 40;
    const MAX_H3D = 180;

    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.012;
      const t = tRef.current;
      if (!W || !H) return;

      ctx.clearRect(0, 0, W, H);

      // bg radial
      const bg = ctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.4, W*0.7);
      bg.addColorStop(0, "rgba(8,0,20,0.98)");
      bg.addColorStop(1, "rgba(4,0,12,1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      if (sessions.length === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.font = `bold ${14*DPR}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("لا يوجد تاريخ — شغّل Benchmark أولاً", W*0.5, H*0.5);
        return;
      }

      // animate grow-in
      if (animating) {
        progRef.current = Math.min(1, progRef.current + 0.015);
      } else {
        progRef.current = 1;
      }
      const prog = progRef.current;

      // base grid plane
      const gridColor = "rgba(124,58,237,0.06)";
      const rows = 8, cols = 8;
      for (let r = 0; r <= rows; r++) {
        const { sx: sx0, sy: sy0 } = project(-200 + r*(400/rows), 0, 0, W, H);
        const { sx: sx1, sy: sy1 } = project(-200 + r*(400/rows), 0, 400, W, H);
        ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1);
        ctx.strokeStyle = gridColor; ctx.lineWidth = 0.8; ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        const { sx: sx0, sy: sy0 } = project(-200, 0, c*(400/cols), W, H);
        const { sx: sx1, sy: sy1 } = project(200, 0, c*(400/cols), W, H);
        ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1);
        ctx.strokeStyle = gridColor; ctx.lineWidth = 0.8; ctx.stroke();
      }

      // Y-axis gridlines + labels
      [0.25, 0.5, 0.75, 1].forEach(ratio => {
        const yVal = maxTps * ratio;
        const y3D  = -MAX_H3D * ratio;
        const tps  = Math.round(yVal);
        const { sx, sy } = project(-200, y3D, 0, W, H);
        ctx.beginPath();
        ctx.setLineDash([4*DPR, 6*DPR]);
        for (let c = 0; c <= cols; c++) {
          const { sx: rx0, sy: ry0 } = project(-200, y3D, c*(400/cols), W, H);
          const { sx: rx1, sy: ry1 } = project(200,  y3D, c*(400/cols), W, H);
          if (c === 0) ctx.moveTo(rx0, ry0); else ctx.lineTo(rx1, ry1);
        }
        ctx.strokeStyle = "rgba(124,58,237,0.09)"; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(200,180,255,0.3)";
        ctx.font = `${9*DPR}px monospace`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${tps}t/s`, sx - 8, sy);
      });

      // draw bars for each session × model
      sessions.forEach((sess, si) => {
        const baseX = (si - sessions.length / 2 + 0.5) * GAP_X;

        allModels.forEach((mName, mi) => {
          const res = sess.results.find(r => r.name === mName);
          if (!res || res.avgTps === 0) return;

          const color   = modelColor(mName);
          const barH3D  = (res.avgTps / maxTps) * MAX_H3D * prog;
          const bx      = baseX + (mi - allModels.length / 2) * GAP_Z * 0.5;
          const bz      = mi * GAP_Z + 80;
          const pulse   = (Math.sin(t * 2.4 + si + mi) + 1) * 0.5;
          const glowA   = 0.15 + pulse * 0.15;

          // 4 corners of top face
          const corners3D = [
            [-BAR_W/2, -barH3D, 0],
            [ BAR_W/2, -barH3D, 0],
            [ BAR_W/2, -barH3D, BAR_W],
            [-BAR_W/2, -barH3D, BAR_W],
          ].map(([x, y, z]) => project(bx+x, y, bz+z, W, H));

          const front3D = [
            [-BAR_W/2, 0,      0],
            [ BAR_W/2, 0,      0],
            [ BAR_W/2, -barH3D, 0],
            [-BAR_W/2, -barH3D, 0],
          ].map(([x, y, z]) => project(bx+x, y, bz+z, W, H));

          const side3D = [
            [ BAR_W/2, 0,      0],
            [ BAR_W/2, 0,      BAR_W],
            [ BAR_W/2, -barH3D, BAR_W],
            [ BAR_W/2, -barH3D, 0],
          ].map(([x, y, z]) => project(bx+x, y, bz+z, W, H));

          function drawFace(pts: { sx: number; sy: number }[], lightFactor: number) {
            ctx.beginPath();
            pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy));
            ctx.closePath();
            const hex = color.startsWith("hsl") ? color : color;
            const alpha = (0.35 + pulse * 0.1) * lightFactor;
            ctx.fillStyle = hex.startsWith("#")
              ? hex + Math.round(alpha * 255).toString(16).padStart(2, "0")
              : `rgba(255,255,255,${alpha})`;
            ctx.fill();
            ctx.strokeStyle = color + "66";
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }

          drawFace(side3D, 0.7);
          drawFace(front3D, 1.0);
          drawFace(corners3D, 1.3);

          // glow at top
          const topCenter = project(bx, -barH3D, BAR_W/2, W, H);
          const grd = ctx.createRadialGradient(topCenter.sx, topCenter.sy, 0, topCenter.sx, topCenter.sy, 20*DPR);
          grd.addColorStop(0, color + Math.round(glowA * 255).toString(16).padStart(2, "0"));
          grd.addColorStop(1, "transparent");
          ctx.fillStyle = grd;
          ctx.fillRect(topCenter.sx - 20*DPR, topCenter.sy - 20*DPR, 40*DPR, 40*DPR);

          // value label above bar
          if (barH3D > 20) {
            const labelPos = project(bx, -barH3D - 16, BAR_W/2, W, H);
            ctx.fillStyle = color;
            ctx.font = `bold ${8*DPR}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(`${res.avgTps}`, labelPos.sx, labelPos.sy);
          }
        });

        // session label (date) below ground
        const { sx: lx, sy: ly } = project(baseX, 12, 80, W, H);
        const d = new Date(sess.ts);
        ctx.fillStyle = "rgba(200,180,255,0.4)";
        ctx.font = `${7*DPR}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`, lx, ly);
      });

      // scan line
      const scanY = ((t * 0.08) % 1) * H;
      const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      sg.addColorStop(0, "rgba(124,58,237,0)");
      sg.addColorStop(0.5, "rgba(124,58,237,0.04)");
      sg.addColorStop(1, "rgba(124,58,237,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 30, W, 60);

      // particles
      const pCount = 18;
      for (let i = 0; i < pCount; i++) {
        const px = (Math.sin(t * 0.4 + i * 2.1) * 0.5 + 0.5) * W;
        const py = (Math.cos(t * 0.3 + i * 1.7) * 0.5 + 0.5) * H;
        const pr = (Math.sin(t + i) + 1) * 0.5;
        const pc = allModels[i % allModels.length];
        const pcol = pc ? modelColor(pc) : "#7c3aed";
        ctx.beginPath();
        ctx.arc(px, py, (0.6 + pr) * DPR, 0, Math.PI * 2);
        ctx.fillStyle = pcol + "44";
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [history, animating]);

  return <canvas ref={ref} className="w-full h-full block" />;
}

// ── Main Export Component ───────────────────────────────────────────
interface BenchmarkHistory3DProps {
  className?: string;
}

export function BenchmarkHistory3D({ className = "" }: BenchmarkHistory3DProps) {
  const [history, setHistory]   = useState<BenchHistoryEntry[]>([]);
  const [animating, setAnimating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [view, setView]         = useState<"chart" | "table">("chart");

  const refresh = useCallback(() => {
    setHistory(loadBenchHistory());
    setAnimating(true);
    setTimeout(() => setAnimating(false), 2400);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleClear = () => {
    clearBenchHistory();
    setHistory([]);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mr7-benchmark-history-${Date.now()}.json`;
    a.click();
  };

  const allModels = Array.from(new Set(history.flatMap(e => e.results.map(r => r.name))));
  const best = history.flatMap(e => e.results).reduce<BenchHistoryResult | null>((acc, r) => {
    return !acc || r.avgTps > acc.avgTps ? r : acc;
  }, null);

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b"
        style={{ borderColor: "rgba(124,58,237,0.15)" }}>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <span className="text-[11px] font-black tracking-widest text-violet-200">BENCHMARK HISTORY</span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-violet-900/40 border border-violet-700/30 text-violet-400">
            {history.length} sessions
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          {["chart","table"].map(v => (
            <button key={v} onClick={() => setView(v as "chart"|"table")}
              className="px-2.5 py-1 rounded text-[9px] font-bold transition-all"
              style={{
                background: view === v ? "rgba(124,58,237,0.25)" : "transparent",
                color: view === v ? "#c4b5fd" : "rgba(255,255,255,0.25)",
                border: `1px solid ${view === v ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.06)"}`,
              }}>
              {v.toUpperCase()}
            </button>
          ))}
          <button onClick={refresh} className="p-1.5 rounded-lg border border-violet-800/30 text-violet-500 hover:text-violet-300 transition-all">
            <RefreshCw className="w-3 h-3" />
          </button>
          {history.length > 0 && (
            <>
              <button onClick={handleExport} className="p-1.5 rounded-lg border border-cyan-800/30 text-cyan-600 hover:text-cyan-400 transition-all" title="تصدير JSON">
                <Download className="w-3 h-3" />
              </button>
              <button onClick={handleClear} className="p-1.5 rounded-lg border border-red-800/30 text-red-600 hover:text-red-400 transition-all" title="مسح">
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.8, repeat: Infinity }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center border"
            style={{ background: "rgba(124,58,237,0.08)", borderColor: "rgba(124,58,237,0.2)" }}>
            <BarChart3 className="w-8 h-8 text-violet-600" />
          </motion.div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-violet-400">لا يوجد تاريخ بعد</p>
            <p className="text-[10px] text-white/25 font-mono">شغّل BENCHMARK من تبويب BENCH لبدء التسجيل</p>
          </div>
        </div>
      ) : (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2.5 shrink-0">
            {[
              { icon: <Trophy className="w-3 h-3" />, label: "أفضل TPS", value: best ? `${best.avgTps}` : "--", color: "#fbbf24", sub: best?.name?.split(":")[0] ?? "" },
              { icon: <Zap className="w-3 h-3" />,    label: "جلسات",    value: String(history.length),         color: "#a78bfa", sub: "مسجّلة" },
              { icon: <TrendingUp className="w-3 h-3" />, label: "نماذج", value: String(allModels.length),     color: "#34d399", sub: "فريدة" },
              { icon: <Clock className="w-3 h-3" />,  label: "آخر جلسة", value: history.length ? new Date(history[0].ts).toLocaleTimeString("ar") : "--", color: "#06b6d4", sub: "" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 space-y-1 border"
                style={{ background: `${s.color}08`, borderColor: `${s.color}20` }}>
                <div className="flex items-center gap-1" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-[8px] font-mono text-white/30">{s.label}</span>
                </div>
                <div className="text-[13px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                {s.sub && <div className="text-[7px] text-white/20 truncate">{s.sub}</div>}
              </div>
            ))}
          </div>

          {view === "chart" ? (
            /* 3D Chart */
            <div className="flex-1 overflow-hidden px-2 pb-2">
              <div className="w-full h-full rounded-xl overflow-hidden border"
                style={{ borderColor: "rgba(124,58,237,0.15)", background: "rgba(8,0,20,0.8)" }}>
                <Chart3D history={history} animating={animating} />
              </div>

              {/* Model color legend */}
              <div className="flex flex-wrap gap-2 px-2 pt-2">
                {allModels.slice(0, 8).map(m => (
                  <div key={m} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: modelColor(m) }} />
                    <span className="text-[8px] font-mono text-white/30">{m.split(":")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Table view */
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 pt-1">
              {history.map((entry, idx) => (
                <motion.div key={entry.ts}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: "rgba(124,58,237,0.18)", background: "rgba(20,12,40,0.6)" }}>
                  <button className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                    onClick={() => setExpanded(expanded === idx ? null : idx)}>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold font-mono text-violet-400">
                        #{history.length - idx}
                      </span>
                      <span className="text-[10px] text-white/60 font-mono">
                        {new Date(entry.ts).toLocaleString("ar")}
                      </span>
                      <span className="text-[9px] text-white/25 italic truncate max-w-[120px]">
                        "{entry.prompt.slice(0, 30)}{entry.prompt.length > 30 ? "…" : ""}"
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.results.slice(0, 3).map(r => (
                        <span key={r.name} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded"
                          style={{ background: modelColor(r.name) + "22", color: modelColor(r.name) }}>
                          {r.avgTps}t/s
                        </span>
                      ))}
                      <span className="text-white/20 text-xs">{expanded === idx ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  <AnimatePresence>
                    {expanded === idx && (
                      <motion.div key="detail"
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-3 space-y-2">
                          {entry.results.map(r => {
                            const c = modelColor(r.name);
                            const maxT = Math.max(...entry.results.map(x => x.avgTps), 1);
                            return (
                              <div key={r.name} className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                                <span className="text-[9px] font-mono text-white/50 w-28 shrink-0 truncate">{r.name}</span>
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                  <motion.div className="h-full rounded-full"
                                    style={{ background: c }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(r.avgTps / maxT) * 100}%` }}
                                    transition={{ duration: 0.6 }} />
                                </div>
                                <span className="text-[9px] font-bold font-mono w-12 text-right shrink-0" style={{ color: c }}>{r.avgTps}t/s</span>
                                <span className="text-[8px] text-white/20 font-mono w-14 text-right shrink-0">{r.avgTtft}ms TTFT</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
