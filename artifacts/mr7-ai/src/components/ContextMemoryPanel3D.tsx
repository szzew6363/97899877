import { useEffect, useRef, useState, useCallback } from "react";
import { X, Minus, BrainCircuit } from "lucide-react";
import { contextMemory, type MemoryStats } from "@/lib/context-memory";

const W = 380;
const H = 400;

function drawMemory(
  ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number,
  stats: MemoryStats, keywords: Array<[string, number]>,
  shortTerm: Array<{ role: string; content: string; ts: number; keywords: string[] }>,
) {
  const pulse = Math.sin(t * 2) * 0.5 + 0.5;

  const bg = ctx.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, "rgba(8,6,18,0.98)");
  bg.addColorStop(1, "rgba(5,4,12,0.99)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = "rgba(167,139,250,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(0.5, 0.5, cw - 1, ch - 1);
  ctx.stroke();

  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("CONTEXT MEMORY · 3D", 14, 20);
  ctx.fillStyle = `rgba(167,139,250,${0.7 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(cw - 16, 16, 4, 0, Math.PI * 2);
  ctx.fill();

  const cx = cw / 2;
  const cy = 80;

  for (let ring = 1; ring <= 3; ring++) {
    const rr = 28 * ring;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(167,139,250,${0.06 + (ring === 1 ? pulse * 0.05 : 0)})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  const neuronAngle = (t * 0.8) % (Math.PI * 2);
  for (let i = 0; i < 6; i++) {
    const a = neuronAngle + (Math.PI * 2 / 6) * i;
    const nr = 42;
    const nx = cx + Math.cos(a) * nr;
    const ny = cy + Math.sin(a) * nr;
    const pulseSub = Math.sin(t * 3 + i) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = `rgba(167,139,250,${0.15 + pulseSub * 0.12})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(nx, ny, 3 + pulseSub * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(167,139,250,${0.6 + pulseSub * 0.4})`;
    ctx.shadowColor = "#a78bfa";
    ctx.shadowBlur = 6 + pulseSub * 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(167,139,250,${0.3 + pulse * 0.2})`;
  ctx.shadowColor = "#a78bfa";
  ctx.shadowBlur = 16 + pulse * 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  const statsY = cy + 55;
  const statItems = [
    { label: "SHORT TERM", val: stats.shortTermCount, max: 100, color: "#a78bfa" },
    { label: "KEYWORDS", val: stats.longTermKeywords, max: 2000, color: "#00e5ff" },
    { label: "SAVED TOKENS", val: stats.savedTokens, max: Math.max(stats.savedTokens, 1000), color: "#22c55e" },
    { label: "EFFICIENCY %", val: stats.contextEfficiency, max: 100, color: "#f59e0b", unit: "%" },
  ];
  const sw = (cw - 28) / 2;
  statItems.forEach((s, i) => {
    const sx = 14 + (i % 2) * sw;
    const sy = statsY + Math.floor(i / 2) * 40;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.rect(sx, sy, sw - 4, 34);
    ctx.fill();

    const fill = Math.min(s.val / s.max, 1);
    const barW = (sw - 12) * fill;
    const barGrad = ctx.createLinearGradient(sx + 4, 0, sx + 4 + barW, 0);
    barGrad.addColorStop(0, s.color + "44");
    barGrad.addColorStop(1, s.color);
    ctx.fillStyle = barGrad;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 3;
    ctx.fillRect(sx + 4, sy + 26, barW, 4);
    ctx.shadowBlur = 0;

    const valStr = s.unit ? s.val.toFixed(0) + s.unit : String(s.val);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = s.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 5;
    ctx.fillText(valStr, sx + sw / 2 - 2, sy + 13);
    ctx.shadowBlur = 0;
    ctx.font = "7px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText(s.label, sx + sw / 2 - 2, sy + 23);
  });

  const kwY = statsY + 90;
  ctx.font = "bold 8px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "left";
  ctx.fillText("TOP MEMORY KEYWORDS", 14, kwY);

  const topKw = keywords.slice(0, 20);
  const maxKwCount = topKw[0]?.[1] ?? 1;
  let kwX = 14;
  let kwLine = 0;
  topKw.forEach(([kw, count]) => {
    const alpha = 0.4 + (count / maxKwCount) * 0.6;
    const col = `rgba(167,139,250,${alpha})`;
    ctx.font = `${7 + Math.round((count / maxKwCount) * 3)}px monospace`;
    ctx.fillStyle = col;
    ctx.textAlign = "left";
    const tw = ctx.measureText(kw).width + 8;
    if (kwX + tw > cw - 14) { kwX = 14; kwLine++; }
    if (kwLine > 3) return;
    ctx.fillText(kw, kwX, kwY + 14 + kwLine * 14);
    kwX += tw;
  });

  const recentY = kwY + 82;
  ctx.font = "bold 8px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "left";
  ctx.fillText("RECENT CONTEXT", 14, recentY);
  shortTerm.slice(-4).reverse().forEach((m, i) => {
    const my = recentY + 12 + i * 20;
    const roleCol = m.role === "user" ? "#00e5ff" : "#a78bfa";
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(14, my, cw - 28, 16);
    ctx.beginPath();
    ctx.arc(20, my + 8, 3, 0, Math.PI * 2);
    ctx.fillStyle = roleCol;
    ctx.fill();
    ctx.font = "8px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const label = m.content.length > 48 ? m.content.slice(0, 48) + "…" : m.content;
    ctx.fillText(label, 28, my + 8);
  });

  const scanX = ((t * 25) % (cw + 20)) - 10;
  ctx.fillStyle = "rgba(167,139,250,0.02)";
  ctx.fillRect(scanX, 0, 12, ch);
}

export function ContextMemoryPanel3D({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const statsRef = useRef<MemoryStats>(contextMemory.getStats());
  const kwRef = useRef<Array<[string, number]>>(contextMemory.getLongTermKeywords());
  const stRef = useRef(contextMemory.getShortTerm());
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - W / 2, y: 80 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const refresh = useCallback(() => {
    statsRef.current = contextMemory.getStats();
    kwRef.current = contextMemory.getLongTermKeywords();
    stRef.current = contextMemory.getShortTerm();
  }, []);

  useEffect(() => {
    refresh();
    const unsub = contextMemory.subscribe(refresh);
    return unsub;
  }, [refresh]);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const tick = () => {
      tRef.current += 0.016;
      const c2 = canvas.getContext("2d")!;
      c2.clearRect(0, 0, canvas.width, canvas.height);
      c2.save();
      c2.scale(dpr, dpr);
      drawMemory(c2, W, H, tRef.current, statsRef.current, kwRef.current,
        stRef.current.map((m) => ({ role: m.role, content: m.content, ts: m.ts, keywords: m.keywords })));
      c2.restore();
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
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: W, zIndex: 9996, userSelect: "none", filter: "drop-shadow(0 0 20px rgba(167,139,250,0.12))" }}>
      <div onMouseDown={onMouseDown} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "linear-gradient(90deg, rgba(167,139,250,0.08), rgba(139,92,246,0.04))", borderRadius: minimized ? "8px" : "8px 8px 0 0", border: "1px solid rgba(167,139,250,0.25)", borderBottom: minimized ? undefined : "1px solid rgba(167,139,250,0.1)", cursor: "grab", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BrainCircuit size={12} color="#a78bfa" />
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>CONTEXT MEMORY 3D</span>
          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#a78bfa", background: "rgba(167,139,250,0.1)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(167,139,250,0.25)" }}>SMART</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><Minus size={12} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><X size={12} /></button>
        </div>
      </div>
      {!minimized && (
        <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", borderRadius: "0 0 8px 8px", border: "1px solid rgba(167,139,250,0.15)", borderTop: "none" }} />
      )}
    </div>
  );
}
