import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Server, Clock, ChevronDown, ChevronUp, GripHorizontal, Wifi, Database, TrendingUp, X } from "lucide-react";
import { trafficBus, type TrafficEvent } from "@/lib/trafficBus";

/* ═══════════════════════════════════════════════════════════════════════
   NETWORK TRAFFIC PANEL — 3D Live API Call Analyzer
   Holographic futuristic panel with real-time charts.
═══════════════════════════════════════════════════════════════════════ */

const STOR_KEY = "mr7-traffic-panel-pos";
const W = 340; const H = 200;

function loadPos(): { x: number; y: number } {
  try { const v = localStorage.getItem(STOR_KEY); if (v) return JSON.parse(v); } catch {}
  return { x: window.innerWidth - 360, y: 80 };
}

function providerColor(provider: string): string {
  const map: Record<string, string> = {
    openai: "#00e5ff", personal: "#00e5ff",
    anthropic: "#a78bfa", groq: "#22c55e",
    gemini: "#f59e0b", openrouter: "#fb923c",
    custom: "#e879f9", default: "#00e5ff",
  };
  return map[provider.toLowerCase()] ?? map.default;
}

function shortModel(m: string): string {
  return m.replace("CHAT-GPT ", "").replace("gpt-", "GPT-").slice(0, 14);
}

export function NetworkTrafficPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos]     = useState<{ x: number; y: number }>(loadPos);
  const [calls, setCalls] = useState<TrafficEvent[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [avgLatency, setAvgLatency]   = useState(0);
  const [callsPerMin, setCallsPerMin] = useState(0);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const frameRef   = useRef<number>(0);
  const histRef    = useRef<TrafficEvent[]>([]);
  const tickRef    = useRef(0);
  const cpmBuckets = useRef<number[]>([]);
  const dragRef    = useRef({ dragging: false, ox: 0, oy: 0, px: 0, py: 0 });

  // Subscribe to traffic bus
  useEffect(() => {
    const unsub = trafficBus.subscribe(ev => {
      histRef.current = trafficBus.history.slice(0, 20);
      setCalls([...histRef.current]);

      const done = histRef.current.filter(e => e.status === "success");
      const toks = done.reduce((s, e) => s + (e.tokens ?? 0), 0);
      setTotalTokens(toks);

      const lats = done.filter(e => e.latency != null).map(e => e.latency!);
      setAvgLatency(lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0);

      // CPM bucket
      cpmBuckets.current.push(Date.now());
      const cutoff = Date.now() - 60000;
      cpmBuckets.current = cpmBuckets.current.filter(t => t > cutoff);
      setCallsPerMin(cpmBuckets.current.length);
    });
    return unsub;
  }, []);

  // Canvas draw loop — 3D holographic bars + waveform
  useEffect(() => {
    if (collapsed) { cancelAnimationFrame(frameRef.current); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;
      ctx.clearRect(0, 0, W, H);

      // ── Background ──
      ctx.fillStyle = "rgba(4,4,12,0.97)";
      ctx.fillRect(0, 0, W, H);

      // Isometric grid
      ctx.save();
      ctx.strokeStyle = "rgba(0,229,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < W; gx += 20) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 20) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
      ctx.restore();

      // ── Baseline ──
      const baseY = H - 44;
      ctx.beginPath(); ctx.moveTo(20, baseY); ctx.lineTo(W - 20, baseY);
      ctx.strokeStyle = "rgba(0,229,255,0.15)"; ctx.lineWidth = 0.8; ctx.stroke();

      // ── 3D Latency Bars ──
      const bars = histRef.current.filter(e => e.status === "success" && e.latency != null).slice(0, 18);
      const maxLat = Math.max(...bars.map(e => e.latency!), 1000);
      const barAreaW = W - 40;
      const barW = Math.min(12, barAreaW / Math.max(bars.length, 1) - 2);

      bars.forEach((ev, i) => {
        const lat = ev.latency!;
        const barH = Math.max(4, (lat / maxLat) * (baseY - 20));
        const bx = 22 + (i / Math.max(bars.length - 1, 1)) * (barAreaW - barW);
        const by = baseY - barH;
        const col = providerColor(ev.provider);

        // 3D bar — right face
        ctx.fillStyle = col + "18";
        ctx.beginPath();
        ctx.moveTo(bx + barW, by); ctx.lineTo(bx + barW + 4, by - 3);
        ctx.lineTo(bx + barW + 4, baseY - 3); ctx.lineTo(bx + barW, baseY);
        ctx.closePath(); ctx.fill();

        // 3D bar — top face
        ctx.fillStyle = col + "30";
        ctx.beginPath();
        ctx.moveTo(bx, by); ctx.lineTo(bx + 4, by - 3);
        ctx.lineTo(bx + barW + 4, by - 3); ctx.lineTo(bx + barW, by);
        ctx.closePath(); ctx.fill();

        // Main bar face with gradient
        const grad = ctx.createLinearGradient(bx, by, bx, baseY);
        grad.addColorStop(0, col + "cc");
        grad.addColorStop(0.4, col + "55");
        grad.addColorStop(1, col + "11");
        ctx.fillStyle = grad;
        ctx.shadowColor = col; ctx.shadowBlur = 8;
        ctx.fillRect(bx, by, barW, barH);
        ctx.shadowBlur = 0;

        // Top cap glow
        ctx.fillStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.fillRect(bx, by, barW, 2);
        ctx.shadowBlur = 0;
      });

      // ── Live waveform (bottom strip) ──
      const waveY = H - 22;
      ctx.beginPath();
      for (let wx = 0; wx < W; wx += 2) {
        const wave = Math.sin(wx * 0.06 + t * 0.05) * 7
                   + Math.sin(wx * 0.02 + t * 0.02) * 4
                   + Math.sin(wx * 0.1 + t * 0.08) * 2;
        const hasActivity = histRef.current.some(e => e.status === "pending" || e.status === "streaming");
        const amp = hasActivity ? 1 : 0.3;
        if (wx === 0) ctx.moveTo(wx, waveY + wave * amp);
        else ctx.lineTo(wx, waveY + wave * amp);
      }
      const wg = ctx.createLinearGradient(0, 0, W, 0);
      wg.addColorStop(0, "transparent");
      wg.addColorStop(0.3, "rgba(0,229,255,0.6)");
      wg.addColorStop(0.7, "rgba(226,18,39,0.6)");
      wg.addColorStop(1, "transparent");
      ctx.strokeStyle = wg; ctx.lineWidth = 1.2; ctx.stroke();

      // ── Scan line ──
      const scanX = ((t * 1.2) % (W + 60)) - 30;
      const sg = ctx.createLinearGradient(scanX - 30, 0, scanX + 30, 0);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.5, "rgba(0,229,255,0.06)");
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(scanX - 30, 0, 60, H);

      // ── Y-axis labels ──
      ctx.font = "6px monospace"; ctx.textAlign = "right"; ctx.fillStyle = "rgba(0,229,255,0.3)";
      [0, 0.5, 1].forEach(f => {
        const ly = baseY - f * (baseY - 20);
        ctx.fillText(`${Math.round(f * maxLat)}ms`, 18, ly + 3);
        ctx.beginPath(); ctx.moveTo(20, ly); ctx.lineTo(23, ly);
        ctx.strokeStyle = "rgba(0,229,255,0.12)"; ctx.lineWidth = 0.5; ctx.stroke();
      });

      // ── Pending indicator ──
      const pending = histRef.current.filter(e => e.status === "pending" || e.status === "streaming");
      if (pending.length > 0) {
        const pulse = (Math.sin(t * 0.12) + 1) / 2;
        ctx.beginPath(); ctx.arc(W - 12, 12, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${0.4 + pulse * 0.6})`;
        ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 8;
        ctx.fill(); ctx.shadowBlur = 0;
      }
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [collapsed]);

  // Widget drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { dragging: true, ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
    function onMove(ev: MouseEvent) {
      if (!dragRef.current.dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth - W - 4, dragRef.current.px + (ev.clientX - dragRef.current.ox)));
      const ny = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.py + (ev.clientY - dragRef.current.oy)));
      setPos({ x: nx, y: ny });
    }
    function onUp() {
      dragRef.current.dragging = false;
      setPos(p => { try { localStorage.setItem(STOR_KEY, JSON.stringify(p)); } catch {} return p; });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const latestCall = calls[0];
  const pendingCount = calls.filter(e => e.status === "pending" || e.status === "streaming").length;
  const successCount = calls.filter(e => e.status === "success").length;
  const errorCount   = calls.filter(e => e.status === "error").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 84, userSelect: "none", width: W }}
    >
      {/* ── Header ── */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 10px",
          background: "linear-gradient(135deg, rgba(0,6,18,0.98), rgba(0,10,28,0.97))",
          border: "1px solid rgba(0,229,255,0.2)",
          borderBottom: collapsed ? "1px solid rgba(0,229,255,0.2)" : "1px solid rgba(0,229,255,0.06)",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          cursor: "grab",
          boxShadow: "0 0 20px rgba(0,229,255,0.06), 0 4px 24px rgba(0,0,0,0.8)",
        }}
      >
        <GripHorizontal style={{ width: 10, height: 10, color: "rgba(0,229,255,0.3)", flexShrink: 0 }} />
        <Activity style={{ width: 10, height: 10, color: "#00e5ff", flexShrink: 0 }} />
        <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 800, color: "#00e5ff", letterSpacing: "1.6px", flex: 1 }}>
          NETWORK TRAFFIC ANALYZER
        </span>
        {pendingCount > 0 && (
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
            style={{ fontSize: "7px", fontFamily: "monospace", color: "#00e5ff", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", borderRadius: 4, padding: "1px 5px" }}
          >
            LIVE
          </motion.span>
        )}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setCollapsed(c => !c)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 0, lineHeight: 1 }}
        >
          {collapsed ? <ChevronDown style={{ width: 10, height: 10 }} /> : <ChevronUp style={{ width: 10, height: 10 }} />}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            {/* ── Canvas Chart ── */}
            <div style={{
              border: "1px solid rgba(0,229,255,0.1)", borderTop: "none",
              background: "rgba(4,4,12,0.97)", position: "relative", overflow: "hidden",
            }}>
              {/* Top accent line */}
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.5) 50%, transparent)" }} />

              <canvas ref={canvasRef} width={W} height={H} style={{ display: "block" }} />

              {/* HUD corners */}
              {[[0,0,"tl"],[W-12,0,"tr"],[0,H-12,"bl"],[W-12,H-12,"br"]].map(([x,y,c]) => (
                <div key={String(c)} style={{
                  position: "absolute", top: Number(y) + 2, left: Number(x) + 2,
                  width: 10, height: 10,
                  borderTop: String(c).includes("t") ? "1.5px solid rgba(0,229,255,0.35)" : "none",
                  borderBottom: String(c).includes("b") ? "1.5px solid rgba(0,229,255,0.35)" : "none",
                  borderLeft: String(c).includes("l") ? "1.5px solid rgba(0,229,255,0.35)" : "none",
                  borderRight: String(c).includes("r") ? "1.5px solid rgba(0,229,255,0.35)" : "none",
                  pointerEvents: "none",
                }} />
              ))}

              {/* Empty state */}
              {calls.length === 0 && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 6,
                  pointerEvents: "none",
                }}>
                  <Wifi style={{ width: 20, height: 20, color: "rgba(0,229,255,0.2)" }} />
                  <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(0,229,255,0.2)", letterSpacing: "1px" }}>
                    AWAITING API CALLS...
                  </span>
                </div>
              )}
            </div>

            {/* ── Stats row ── */}
            <div style={{
              display: "flex",
              border: "1px solid rgba(0,229,255,0.1)", borderTop: "none",
              background: "rgba(2,2,10,0.98)",
            }}>
              {[
                { icon: <Clock style={{ width: 7, height: 7 }} />, label: "AVG LAT", val: avgLatency ? `${avgLatency}ms` : "—", color: avgLatency > 3000 ? "#e21227" : avgLatency > 1500 ? "#f59e0b" : "#00e5ff" },
                { icon: <Database style={{ width: 7, height: 7 }} />, label: "TOKENS", val: totalTokens > 999 ? `${(totalTokens/1000).toFixed(1)}K` : String(totalTokens), color: "#a78bfa" },
                { icon: <Zap style={{ width: 7, height: 7 }} />, label: "CALLS/M", val: String(callsPerMin), color: "#22c55e" },
                { icon: <TrendingUp style={{ width: 7, height: 7 }} />, label: "SUCCESS", val: `${successCount}/${successCount + errorCount}`, color: errorCount > 0 ? "#f59e0b" : "#22c55e" },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, padding: "5px 0", textAlign: "center",
                  borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: s.color, marginBottom: 1 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.5px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Recent calls list ── */}
            <div style={{
              border: "1px solid rgba(0,229,255,0.1)", borderTop: "none",
              borderRadius: "0 0 10px 10px", overflow: "hidden",
              background: "rgba(3,3,10,0.98)", maxHeight: 120, overflowY: "auto",
            }}>
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2) 50%, transparent)" }} />
              {calls.slice(0, 6).map((ev, i) => {
                const col = providerColor(ev.provider);
                const isPending = ev.status === "pending" || ev.status === "streaming";
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "4px 8px",
                      borderBottom: i < Math.min(calls.length, 6) - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                      background: i === 0 && isPending ? "rgba(0,229,255,0.03)" : "transparent",
                    }}
                  >
                    {/* Status dot */}
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                      background: ev.status === "success" ? "#22c55e" : ev.status === "error" ? "#e21227" : col,
                      boxShadow: isPending ? `0 0 6px ${col}` : "none",
                      animation: isPending ? "pulse 1s infinite" : "none",
                    }} />

                    {/* Model */}
                    <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: col, fontWeight: 700, minWidth: 60 }}>
                      {shortModel(ev.model)}
                    </span>

                    {/* Latency bar */}
                    <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                      {ev.latency != null && (
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${Math.min(100, (ev.latency / 5000) * 100)}%` }}
                          transition={{ duration: 0.4 }}
                          style={{ height: "100%", background: col, borderRadius: 2, boxShadow: `0 0 4px ${col}` }}
                        />
                      )}
                      {isPending && (
                        <motion.div
                          animate={{ x: ["0%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          style={{ height: "100%", width: "30%", background: `linear-gradient(90deg, transparent, ${col}, transparent)`, borderRadius: 2 }}
                        />
                      )}
                    </div>

                    {/* Latency value */}
                    <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", minWidth: 36, textAlign: "right" }}>
                      {ev.latency != null ? `${ev.latency}ms` : isPending ? "..." : "—"}
                    </span>

                    {/* Tokens */}
                    {ev.tokens != null && ev.tokens > 0 && (
                      <span style={{ fontSize: "7px", fontFamily: "monospace", color: "#a78bfa", minWidth: 28, textAlign: "right" }}>
                        {ev.tokens > 999 ? `${(ev.tokens/1000).toFixed(1)}K` : ev.tokens}t
                      </span>
                    )}
                  </motion.div>
                );
              })}

              {calls.length === 0 && (
                <div style={{ padding: "12px 8px", textAlign: "center", fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)" }}>
                  NO CALLS RECORDED
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
