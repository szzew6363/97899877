import { useEffect, useRef, useState, useCallback } from "react";
import { X, Minus, Network } from "lucide-react";
import { networkTopology, type NetStats } from "@/lib/network-topology";

const W = 440;
const H = 420;

type NodeDef = { id: string; label: string; x: number; y: number; color: string; size: number };
type EdgeState = { provider: string; active: boolean; latencyMs: number; error: boolean; pulseT: number; activity: number };

const PROVIDERS = [
  { id: "openai",      label: "OPENAI",      color: "#22c55e", y: H/2 - 120 },
  { id: "anthropic",   label: "ANTHROPIC",   color: "#f97316", y: H/2 - 72  },
  { id: "groq",        label: "GROQ",        color: "#00e5ff", y: H/2 - 24  },
  { id: "gemini",      label: "GEMINI",      color: "#818cf8", y: H/2 + 24  },
  { id: "openrouter",  label: "OPENROUTER",  color: "#fbbf24", y: H/2 + 72  },
  { id: "personal",    label: "LOCAL / KEY", color: "#94a3b8", y: H/2 + 120 },
];

const NODES: NodeDef[] = [
  { id: "client",     label: "CLIENT",     x: 60,      y: H/2, color: "#3b82f6", size: 16 },
  { id: "api_server", label: "API SERVER", x: W/2 - 10, y: H/2, color: "#e21227", size: 20 },
  ...PROVIDERS.map((p) => ({ id: p.id, label: p.label, x: W - 60, y: p.y, color: p.color, size: 12 })),
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function drawNode(ctx: CanvasRenderingContext2D, n: NodeDef, t: number, activity: number) {
  const pulse = Math.sin(t * 2.5 + n.x * 0.02) * 0.5 + 0.5;
  const glow = activity > 0 ? Math.min(1, activity * 2) : 0.3;

  for (let r = n.size + 18; r >= n.size; r -= 6) {
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = n.color + Math.round((0.04 + glow * 0.06 + (r === n.size ? pulse * 0.03 : 0)) * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 0.5; ctx.stroke();
  }

  const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size);
  ng.addColorStop(0, n.color + (activity > 0.5 ? "ff" : "cc"));
  ng.addColorStop(1, n.color + "22");
  ctx.beginPath(); ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
  ctx.fillStyle = ng;
  ctx.shadowColor = n.color; ctx.shadowBlur = 12 + glow * 16 + pulse * 4;
  ctx.fill(); ctx.shadowBlur = 0;

  ctx.font = "bold 7px monospace"; ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(n.label.slice(0, 6), n.x, n.y - 1);
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, es: EdgeState, t: number,
) {
  const alpha = es.active ? 0.9 : Math.max(0.08, es.activity * 0.6);
  const w = es.active ? 2.5 : 1;

  ctx.save(); ctx.globalAlpha = alpha;
  const lg = ctx.createLinearGradient(x1, y1, x2, y2);
  lg.addColorStop(0, "#3b82f6" + "88"); lg.addColorStop(0.4, color + "55"); lg.addColorStop(1, color + "88");
  ctx.strokeStyle = lg; ctx.lineWidth = w;
  if (es.active) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.shadowBlur = 0;

  if (es.active) {
    const progress = ((t * 0.8) % 1);
    const px = lerp(x1, x2, progress);
    const py = lerp(y1, y2, progress);
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.fill(); ctx.shadowBlur = 0;
    const p2 = ((t * 0.8 + 0.3) % 1);
    ctx.beginPath(); ctx.arc(lerp(x1, x2, p2), lerp(y1, y2, p2), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color + "99"; ctx.fill();
  }

  if (es.error) {
    const ef = Math.sin(t * 8) * 0.5 + 0.5;
    ctx.globalAlpha = ef * 0.6;
    ctx.strokeStyle = "#e21227"; ctx.lineWidth = 3; ctx.shadowColor = "#e21227"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.shadowBlur = 0;
  }

  if (es.active && es.latencyMs > 0) {
    ctx.globalAlpha = 0.7;
    ctx.font = "7px monospace"; ctx.fillStyle = color;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    const mx = lerp(x1, x2, 0.5), my = lerp(y1, y2, 0.5) - 6;
    ctx.fillText(`${es.latencyMs}ms`, mx, my);
  }
  ctx.restore();
}

function drawStats(ctx: CanvasRenderingContext2D, cw: number, stats: NetStats, t: number) {
  const pulse = Math.sin(t * 1.8) * 0.5 + 0.5;
  ctx.font = "bold 9px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("NETWORK TOPOLOGY · 3D LIVE", 14, 20);
  ctx.beginPath(); ctx.arc(cw - 14, 16, 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(59,130,246,${0.8 + pulse * 0.2})`; ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 6 + pulse * 4; ctx.fill(); ctx.shadowBlur = 0;

  const items = [
    { label: "TOTAL REQ",  val: stats.totalRequests,                    col: "#3b82f6" },
    { label: "AVG LATENCY", val: `${Math.round(stats.avgLatencyMs)}ms`, col: "#22c55e" },
    { label: "ERRORS",      val: `${Math.round(stats.errorRate*100)}%`, col: "#e21227" },
    { label: "ACTIVE",      val: stats.activeCount,                      col: "#fbbf24" },
  ];
  const sw = (cw - 28) / 4;
  items.forEach((s, i) => {
    const sx = 14 + i * sw;
    ctx.fillStyle = "rgba(255,255,255,0.025)"; ctx.fillRect(sx, 27, sw - 3, 30);
    ctx.font = "bold 12px monospace"; ctx.fillStyle = s.col;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = s.col; ctx.shadowBlur = 4;
    ctx.fillText(String(s.val), sx + sw/2 - 1.5, 38); ctx.shadowBlur = 0;
    ctx.font = "6px monospace"; ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText(s.label, sx + sw/2 - 1.5, 50);
  });
}

export function NetworkTopology3D({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const edgesRef = useRef<Record<string, EdgeState>>(
    Object.fromEntries(PROVIDERS.map((p) => [p.id, { provider: p.id, active: false, latencyMs: 0, error: false, pulseT: 0, activity: 0 }]))
  );
  const statsRef = useRef<NetStats>(networkTopology.getStats());
  const simRef = useRef(0);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - W - 24, y: 80 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const syncTopology = useCallback(() => {
    statsRef.current = networkTopology.getStats();
    const active = networkTopology.getActive();
    const recent = networkTopology.getRecords().slice(0, 6);
    PROVIDERS.forEach((p) => {
      const es = edgesRef.current[p.id];
      if (!es) return;
      const isActive = Array.from(active.values()).some((r) => r.provider === p.id);
      if (isActive) { es.active = true; es.activity = 1; es.error = false; return; }
      const lastRec = recent.find((r) => r.provider === p.id);
      if (lastRec) {
        es.active = false;
        es.latencyMs = lastRec.latencyMs;
        es.error = lastRec.status === "error";
        es.activity = Math.max(0, 1 - (Date.now() - lastRec.ts) / 10000);
      } else {
        es.active = false; es.activity = Math.max(0, es.activity - 0.02);
      }
    });
  }, []);

  useEffect(() => {
    syncTopology();
    const unsub = networkTopology.subscribe(syncTopology);
    return unsub;
  }, [syncTopology]);

  // Simulation: generate plausible traffic if no real data yet
  useEffect(() => {
    const simulate = () => {
      const providers = PROVIDERS.map((p) => p.id);
      const pick = providers[Math.floor(Math.random() * providers.length)];
      networkTopology.startRequest(pick, "model-sim");
      const id = networkTopology.getRecords()[0]?.id;
      if (id) {
        const latency = 300 + Math.random() * 1800;
        setTimeout(() => {
          networkTopology.endRequest(id, Math.round(latency), Math.round(Math.random() * 800 + 100), Math.random() < 0.05);
        }, latency);
      }
      simRef.current = window.setTimeout(simulate, 4000 + Math.random() * 8000);
    };
    simRef.current = window.setTimeout(simulate, 1500);
    return () => clearTimeout(simRef.current);
  }, []);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;

    const tick = () => {
      tRef.current += 0.016;
      const ctx = canvas.getContext("2d")!;
      ctx.save(); ctx.scale(dpr, dpr);

      ctx.fillStyle = "rgba(4,6,14,0.97)"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(59,130,246,0.15)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(0.5, 0.5, W - 1, H - 1); ctx.stroke();

      drawStats(ctx, W, statsRef.current, tRef.current);

      const apiNode = NODES.find((n) => n.id === "api_server")!;
      const clientNode = NODES.find((n) => n.id === "client")!;

      const clientEdge: EdgeState = { provider: "client", active: statsRef.current.activeCount > 0, latencyMs: 0, error: false, pulseT: tRef.current, activity: statsRef.current.activeCount > 0 ? 1 : 0.4 };
      drawEdge(ctx, clientNode.x + clientNode.size, clientNode.y, apiNode.x - apiNode.size, apiNode.y, "#3b82f6", clientEdge, tRef.current);

      PROVIDERS.forEach((p) => {
        const pNode = NODES.find((n) => n.id === p.id)!;
        const es = edgesRef.current[p.id];
        if (!es) return;
        es.activity = Math.max(0, es.activity - 0.003);
        drawEdge(ctx, apiNode.x + apiNode.size, apiNode.y, pNode.x - pNode.size, pNode.y, p.color, es, tRef.current);
      });

      NODES.forEach((n) => {
        let activity = 0;
        if (n.id === "client") activity = statsRef.current.activeCount > 0 ? 1 : 0.3;
        else if (n.id === "api_server") activity = statsRef.current.activeCount > 0 ? 1 : 0.5;
        else { const es = edgesRef.current[n.id]; activity = es?.active ? 1 : (es?.activity ?? 0); }
        drawNode(ctx, n, tRef.current, activity);
      });

      const scanX = ((tRef.current * 24) % (W + 20)) - 10;
      ctx.fillStyle = "rgba(59,130,246,0.014)"; ctx.fillRect(scanX, 0, 14, H);

      ctx.restore();
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
    function mv(e: MouseEvent) { if (!dragRef.current) return; setPos({ x: dragRef.current.px + e.clientX - dragRef.current.ox, y: dragRef.current.py + e.clientY - dragRef.current.oy }); }
    function up() { dragRef.current = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: W, zIndex: 9993, userSelect: "none", filter: "drop-shadow(0 0 20px rgba(59,130,246,0.15))" }}>
      <div onMouseDown={onMouseDown} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "linear-gradient(90deg,rgba(59,130,246,0.1),rgba(59,130,246,0.03))", borderRadius: minimized ? "8px" : "8px 8px 0 0", border: "1px solid rgba(59,130,246,0.35)", borderBottom: minimized ? undefined : "1px solid rgba(59,130,246,0.12)", cursor: "grab", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Network size={12} color="#3b82f6" />
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>NETWORK TOPOLOGY 3D</span>
          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#3b82f6", background: "rgba(59,130,246,0.1)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(59,130,246,0.25)" }}>LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><Minus size={12} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><X size={12} /></button>
        </div>
      </div>
      {!minimized && <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", borderRadius: "0 0 8px 8px", border: "1px solid rgba(59,130,246,0.15)", borderTop: "none" }} />}
    </div>
  );
}
