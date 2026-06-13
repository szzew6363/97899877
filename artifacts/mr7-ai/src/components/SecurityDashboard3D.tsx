import { useEffect, useRef, useState, useCallback } from "react";
import { X, Minus, ShieldCheck } from "lucide-react";
import { securityLayer, type AuditEvent, type SecurityStats } from "@/lib/security-layer";

const W = 400;
const H = 420;

const SEV_COLOR: Record<AuditEvent["severity"], string> = {
  info: "#00e5ff",
  warn: "#f59e0b",
  critical: "#e21227",
};

function drawRadar(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  t: number, stats: SecurityStats,
) {
  const pulse = Math.sin(t * 2) * 0.5 + 0.5;

  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r / 4) * ring, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,229,255,${0.08 + (ring === 4 ? pulse * 0.04 : 0)})`;
    ctx.lineWidth = ring === 4 ? 1 : 0.5;
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 / 8) * i;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.strokeStyle = "rgba(0,229,255,0.06)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  const sweep = (t * 1.5) % (Math.PI * 2);
  for (let i = 0; i < 60; i++) {
    const a = sweep - (i / 60) * (Math.PI * 0.7);
    const alpha = (1 - i / 60) * 0.25;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a, a + 0.05);
    ctx.closePath();
    ctx.fillStyle = `rgba(0,229,255,${alpha})`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweep) * r, cy + Math.sin(sweep) * r);
  ctx.strokeStyle = `rgba(0,229,255,${0.7 + pulse * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const secScore = Math.max(0, 100 - (stats.blocked * 5 + stats.rateLimited * 3));
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = secScore > 80 ? "#22c55e" : secScore > 50 ? "#f59e0b" : "#e21227";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.fillText(secScore.toString(), cx, cy - 6);
  ctx.shadowBlur = 0;
  ctx.font = "7px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("SECURITY SCORE", cx, cy + 10);
}

function draw(canvas: HTMLCanvasElement, t: number, events: AuditEvent[], stats: SecurityStats) {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  const cw = canvas.width / (window.devicePixelRatio || 1);
  const ch = canvas.height / (window.devicePixelRatio || 1);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const bg = ctx.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, "rgba(4,8,12,0.98)");
  bg.addColorStop(1, "rgba(2,6,10,0.99)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = "rgba(0,229,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(0.5, 0.5, cw - 1, ch - 1);
  ctx.stroke();

  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("SECURITY SHIELD · LIVE", 14, 20);
  const dotPulse = 0.7 + Math.sin(t * 3) * 0.3;
  ctx.fillStyle = `rgba(34,197,94,${dotPulse})`;
  ctx.beginPath();
  ctx.arc(cw - 16, 16, 4, 0, Math.PI * 2);
  ctx.fill();

  const radarR = 68;
  const radarCX = cw / 2;
  const radarCY = 36 + radarR + 8;
  drawRadar(ctx, radarCX, radarCY, radarR, t, stats);

  const statsY = radarCY + radarR + 18;
  const statItems = [
    { label: "INPUTS SCANNED", val: stats.totalInputs, color: "#00e5ff" },
    { label: "THREATS BLOCKED", val: stats.blocked, color: "#e21227" },
    { label: "RATE LIMITED", val: stats.rateLimited, color: "#f59e0b" },
    { label: "REQUESTS", val: stats.requestsSent, color: "#22c55e" },
  ];
  const sw = (cw - 28) / 2;
  statItems.forEach((s, i) => {
    const sx = 14 + (i % 2) * sw;
    const sy = statsY + Math.floor(i / 2) * 38;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.rect(sx, sy, sw - 4, 32);
    ctx.fill();
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = s.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 6;
    ctx.fillText(String(s.val), sx + sw / 2 - 2, sy + 12);
    ctx.shadowBlur = 0;
    ctx.font = "7px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(s.label, sx + sw / 2 - 2, sy + 25);
  });

  const logY = statsY + 80;
  ctx.font = "bold 8px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "left";
  ctx.fillText("AUDIT LOG", 14, logY);

  const recentEvents = events.slice(0, 7);
  recentEvents.forEach((e, i) => {
    const ey = logY + 12 + i * 22;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.rect(14, ey, cw - 28, 18);
    ctx.fill();

    const dot = SEV_COLOR[e.severity];
    ctx.fillStyle = dot;
    ctx.shadowColor = dot;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(22, ey + 9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = "9px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const label = e.message.length > 42 ? e.message.slice(0, 42) + "…" : e.message;
    ctx.fillText(label, 30, ey + 9);

    const ts = new Date(e.ts).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    ctx.font = "8px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textAlign = "right";
    ctx.fillText(ts, cw - 14, ey + 9);
  });

  const scanX = ((t * 30) % (cw + 20)) - 10;
  ctx.fillStyle = "rgba(0,229,255,0.025)";
  ctx.fillRect(scanX, 0, 12, ch);

  ctx.restore();
}

export function SecurityDashboard3D({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const eventsRef = useRef<AuditEvent[]>([]);
  const statsRef = useRef<SecurityStats>({ totalInputs: 0, sanitized: 0, blocked: 0, rateLimited: 0, requestsSent: 0, errorsCount: 0 });
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: window.innerHeight - H - 80 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const refresh = useCallback(() => {
    eventsRef.current = securityLayer.getAuditTrail();
    statsRef.current = securityLayer.getStats();
  }, []);

  useEffect(() => {
    refresh();
    const unsub = securityLayer.subscribe(() => refresh());
    return unsub;
  }, [refresh]);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const tick = () => {
      tRef.current += 0.016;
      draw(canvas, tRef.current, eventsRef.current, statsRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [minimized]);

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

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: W, zIndex: 9996, userSelect: "none", filter: "drop-shadow(0 0 20px rgba(0,229,255,0.12))" }}>
      <div onMouseDown={onMouseDown} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "linear-gradient(90deg, rgba(0,229,255,0.08), rgba(34,197,94,0.04))", borderRadius: minimized ? "8px" : "8px 8px 0 0", border: "1px solid rgba(0,229,255,0.25)", borderBottom: minimized ? undefined : "1px solid rgba(0,229,255,0.1)", cursor: "grab", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={12} color="#00e5ff" />
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>SECURITY SHIELD 3D</span>
          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#22c55e", background: "rgba(34,197,94,0.1)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(34,197,94,0.25)" }}>ACTIVE</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><Minus size={12} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><X size={12} /></button>
        </div>
      </div>
      {!minimized && (
        <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", borderRadius: "0 0 8px 8px", border: "1px solid rgba(0,229,255,0.15)", borderTop: "none" }} />
      )}
    </div>
  );
}
