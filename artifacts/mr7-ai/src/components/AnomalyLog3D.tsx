import { useEffect, useRef, useState, useCallback } from "react";
import { X, Minus, AlertTriangle } from "lucide-react";
import { anomalyDetector, type AnomalyEvent, type AnomalyStats } from "@/lib/anomaly-detector";

const W = 460;
const H = 500;

const SEV_COLORS: Record<string, string> = {
  high:   "#e21227",
  medium: "#f59e0b",
  low:    "#22c55e",
};
const TYPE_COLORS: Record<string, string> = {
  rapid_fire:     "#e21227",
  high_frequency: "#dc2626",
  large_payload:  "#f59e0b",
  repeated_error: "#a78bfa",
  pattern_anomaly:"#06b6d4",
};

const TYPE_LABELS: Record<string, string> = {
  rapid_fire:     "RAPID FIRE",
  high_frequency: "HIGH FREQ",
  large_payload:  "LARGE PAYLOAD",
  repeated_error: "REPEAT ERR",
  pattern_anomaly:"PATTERN ANOM",
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function drawBackground(ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number) {
  ctx.fillStyle = "rgba(4,6,14,0.97)";
  ctx.fillRect(0, 0, cw, ch);

  const pulse = Math.sin(t * 1.4) * 0.5 + 0.5;
  const nodeCount = 18;
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2 + t * 0.1;
    const r = 160 + Math.sin(t * 0.7 + i) * 30;
    const nx = cw / 2 + Math.cos(angle) * r;
    const ny = ch / 2 + Math.sin(angle) * r * 0.6;
    ctx.beginPath(); ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(226,18,39,${0.06 + pulse * 0.04})`; ctx.fill();
    const next = (i + 1) % nodeCount;
    const na2 = (next / nodeCount) * Math.PI * 2 + t * 0.1;
    const nx2 = cw / 2 + Math.cos(na2) * r;
    const ny2 = ch / 2 + Math.sin(na2) * r * 0.6;
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx2, ny2);
    ctx.strokeStyle = `rgba(226,18,39,${0.04 + pulse * 0.02})`; ctx.lineWidth = 0.5; ctx.stroke();
  }
  ctx.strokeStyle = "rgba(226,18,39,0.15)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(0.5, 0.5, cw - 1, ch - 1); ctx.stroke();
}

function drawStats(ctx: CanvasRenderingContext2D, cw: number, stats: AnomalyStats, t: number) {
  const pulse = Math.sin(t * 2.2) * 0.5 + 0.5;
  const riskCol = stats.riskScore > 60 ? "#e21227" : stats.riskScore > 30 ? "#f59e0b" : "#22c55e";

  ctx.font = "bold 9px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("ANOMALY LOG · 3D LIVE FEED", 14, 20);
  ctx.beginPath(); ctx.arc(cw - 14, 16, 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(226,18,39,${0.8 + pulse * 0.2})`; ctx.shadowColor = "#e21227";
  ctx.shadowBlur = 8 + pulse * 6; ctx.fill(); ctx.shadowBlur = 0;

  const items = [
    { label: "TOTAL EVENTS", val: stats.total, col: "#e21227" },
    { label: "RISK SCORE", val: `${stats.riskScore}%`, col: riskCol },
    { label: "HIGH SEV", val: stats.byType.high_frequency ?? 0, col: "#dc2626" },
    { label: "REPEAT ERR", val: stats.byType.repeated_error ?? 0, col: "#a78bfa" },
  ];
  const sw = (cw - 28) / 4;
  items.forEach((s, i) => {
    const sx = 14 + i * sw;
    ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(sx, 28, sw - 3, 32);
    ctx.font = "bold 13px monospace"; ctx.fillStyle = s.col;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = s.col; ctx.shadowBlur = 5;
    ctx.fillText(String(s.val), sx + sw / 2 - 1.5, 40);
    ctx.shadowBlur = 0;
    ctx.font = "6px monospace"; ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText(s.label, sx + sw / 2 - 1.5, 52);
  });

  const barW = cw - 28;
  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(14, 64, barW, 6);
  ctx.fillStyle = riskCol;
  ctx.shadowColor = riskCol; ctx.shadowBlur = 6;
  ctx.fillRect(14, 64, Math.min(barW * (stats.riskScore / 100), barW), 6);
  ctx.shadowBlur = 0;
  ctx.font = "7px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.textAlign = "right"; ctx.fillText("RISK", cw - 14, 82);
}

function drawEvent(
  ctx: CanvasRenderingContext2D,
  ev: AnomalyEvent, y: number, cw: number, t: number, idx: number,
) {
  const col = SEV_COLORS[ev.severity] ?? "#ffffff";
  const tcol = TYPE_COLORS[ev.type] ?? "#a78bfa";
  const age = (Date.now() - ev.ts) / 1000;
  const alpha = Math.min(1, Math.max(0.3, 1 - age / 120));
  const ringT = t + idx * 0.5;

  ctx.save(); ctx.globalAlpha = alpha;

  ctx.fillStyle = "rgba(255,255,255,0.018)"; ctx.fillRect(14, y, cw - 28, 46);
  ctx.strokeStyle = col + "33"; ctx.lineWidth = 0.5; ctx.strokeRect(14, y, cw - 28, 46);

  const cx2 = 36, cy2 = y + 23;
  ctx.beginPath(); ctx.arc(cx2, cy2, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.6);
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.shadowColor = col; ctx.shadowBlur = ev.severity === "high" ? 12 : 6;
  ctx.stroke(); ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx2, cy2, 10, ringT, ringT + 0.8);
  ctx.strokeStyle = col + "66"; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = "bold 7px monospace"; ctx.fillStyle = col;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(ev.severity.slice(0, 3).toUpperCase(), cx2, cy2);

  const typeLabel = TYPE_LABELS[ev.type] ?? ev.type.replace(/_/g, " ").toUpperCase();
  ctx.fillStyle = tcol + "22"; ctx.fillRect(54, y + 6, typeLabel.length * 5.5 + 6, 13);
  ctx.font = "bold 7px monospace"; ctx.fillStyle = tcol;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(typeLabel, 57, y + 13);

  const msgShort = ev.message.length > 52 ? ev.message.slice(0, 52) + "…" : ev.message;
  ctx.font = "8px monospace"; ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(msgShort, 54, y + 28);

  ctx.font = "7px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillText(timeAgo(ev.ts), 54, y + 40);

  const maxVal = Math.max(ev.value, ev.threshold);
  if (maxVal > 0) {
    const bw = 80;
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(cw - 104, y + 30, bw, 5);
    const threshX = (ev.threshold / maxVal) * bw;
    ctx.fillStyle = col + "44"; ctx.fillRect(cw - 104, y + 30, Math.min((ev.value / maxVal) * bw, bw), 5);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(cw - 104 + threshX - 0.5, y + 28, 1, 9);
    ctx.font = "6px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "right";
    ctx.fillText(`${ev.value}/${ev.threshold}`, cw - 14, y + 42);
  }
  ctx.restore();
}

export function AnomalyLog3D({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const eventsRef = useRef<AnomalyEvent[]>([]);
  const statsRef = useRef<AnomalyStats>(anomalyDetector.getStats());
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 80 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    eventsRef.current = anomalyDetector.getEvents();
    statsRef.current = anomalyDetector.getStats();
    const unsub = anomalyDetector.subscribe((ev) => {
      eventsRef.current = anomalyDetector.getEvents();
      statsRef.current = anomalyDetector.getStats();
      setFlashId(ev.id);
      setTimeout(() => setFlashId(null), 800);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const tick = () => {
      tRef.current += 0.016;
      const ctx2 = canvas.getContext("2d")!;
      ctx2.save(); ctx2.scale(dpr, dpr);
      drawBackground(ctx2, W, H, tRef.current);
      drawStats(ctx2, W, statsRef.current, tRef.current);
      const evs = eventsRef.current.slice(0, 7);
      if (evs.length === 0) {
        ctx2.font = "9px monospace"; ctx2.fillStyle = "rgba(255,255,255,0.2)";
        ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
        ctx2.fillText("NO ANOMALIES DETECTED — SYSTEM NOMINAL", W / 2, H / 2);
        ctx2.fillStyle = "rgba(34,197,94,0.4)";
        ctx2.beginPath(); ctx2.arc(W / 2, H / 2 - 30, 14, 0, Math.PI * 2); ctx2.fill();
        ctx2.font = "bold 10px monospace"; ctx2.fillStyle = "#22c55e";
        ctx2.fillText("OK", W / 2, H / 2 - 30);
      } else {
        evs.forEach((ev, i) => {
          drawEvent(ctx2, ev, 95 + i * 52, W, tRef.current, i);
        });
      }
      const scanX = ((tRef.current * 30) % (W + 20)) - 10;
      ctx2.fillStyle = "rgba(226,18,39,0.012)"; ctx2.fillRect(scanX, 0, 16, H);
      ctx2.restore();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [minimized, flashId]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);
  useEffect(() => {
    function mv(e: MouseEvent) { if (!dragRef.current) return; setPos({ x: dragRef.current.px + e.clientX - dragRef.current.ox, y: dragRef.current.py + e.clientY - dragRef.current.oy }); }
    function up() { dragRef.current = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: W, zIndex: 9994, userSelect: "none", filter: `drop-shadow(0 0 ${flashId ? "32px" : "16px"} rgba(226,18,39,${flashId ? "0.4" : "0.12"}))`, transition: "filter 0.3s" }}>
      <div onMouseDown={onMouseDown} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "linear-gradient(90deg, rgba(226,18,39,0.1), rgba(226,18,39,0.03))", borderRadius: minimized ? "8px" : "8px 8px 0 0", border: "1px solid rgba(226,18,39,0.35)", borderBottom: minimized ? undefined : "1px solid rgba(226,18,39,0.12)", cursor: "grab", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={12} color="#e21227" />
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>ANOMALY LOG 3D</span>
          {statsRef.current.riskScore > 0 && (
            <span style={{ fontSize: 8, fontFamily: "monospace", color: "#e21227", background: "rgba(226,18,39,0.15)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(226,18,39,0.3)", animation: flashId ? "pulse 0.3s ease" : undefined }}>
              RISK {statsRef.current.riskScore}%
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><Minus size={12} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><X size={12} /></button>
        </div>
      </div>
      {!minimized && (
        <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", borderRadius: "0 0 8px 8px", border: "1px solid rgba(226,18,39,0.15)", borderTop: "none" }} />
      )}
    </div>
  );
}
