import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface DockItem {
  id: string;
  label: string;
  color: string;
  draw: (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void;
  onClick: () => void;
}

// ── Canvas animation drawers ─────────────────────────────────────────────────

function drawAtomOrbit(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  // Outer glow
  const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
  og.addColorStop(0, color + "22"); og.addColorStop(1, color + "00");
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = og; ctx.fill();
  // Core nucleus
  const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6);
  ng.addColorStop(0, "#ffffffff"); ng.addColorStop(0.3, color + "ff"); ng.addColorStop(1, color + "33");
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = ng; ctx.fill();
  // 3 orbital ellipses
  [[0, 1], [Math.PI / 3, 0.9], [Math.PI * 2 / 3, 0.75]].forEach(([baseAngle, opacity], oi) => {
    const rx = w * 0.40, ry = h * 0.16;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(baseAngle + oi * 0.3);
    ctx.globalAlpha = opacity as number;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color + "88"; ctx.lineWidth = 1; ctx.stroke();
    const angle = t * (1.6 + oi * 0.4);
    const ex = Math.cos(angle) * rx, ey = Math.sin(angle) * ry;
    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 5);
    eg.addColorStop(0, "#ffffff"); eg.addColorStop(0.4, color + "ff"); eg.addColorStop(1, color + "00");
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fillStyle = eg; ctx.fill();
    ctx.restore();
  });
}

function drawNeuralPulse(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const nodes = [
    { x: w * 0.5, y: h * 0.5 },
    { x: w * 0.15, y: h * 0.2 }, { x: w * 0.85, y: h * 0.2 },
    { x: w * 0.15, y: h * 0.8 }, { x: w * 0.85, y: h * 0.8 },
    { x: w * 0.5, y: h * 0.08 }, { x: w * 0.5, y: h * 0.92 },
  ];
  // Glow bg
  const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.5);
  bg.addColorStop(0, color + "18"); bg.addColorStop(1, color + "00");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // Lines
  nodes.slice(1).forEach(n => {
    const pulse = 0.2 + 0.5 * Math.abs(Math.sin(t * 1.5 + n.x));
    ctx.beginPath(); ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(n.x, n.y);
    ctx.strokeStyle = color + Math.round(pulse * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 0.9; ctx.stroke();
  });
  nodes.forEach((n, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.2);
    const r = i === 0 ? 7 : 3.5;
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r + pulse * 4);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.2, color + "ff"); g.addColorStop(1, color + "00");
    ctx.beginPath(); ctx.arc(n.x, n.y, r + pulse * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  });
}

function drawHolographicGlobe(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.37;
  // Outer atmosphere glow
  const og = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.5);
  og.addColorStop(0, color + "28"); og.addColorStop(1, color + "00");
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = og; ctx.fill();
  // Globe fill
  const sf = ctx.createRadialGradient(cx - r*0.25, cy - r*0.3, 0, cx, cy, r);
  sf.addColorStop(0, color + "44"); sf.addColorStop(0.4, color + "22"); sf.addColorStop(1, color + "0a");
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = sf; ctx.fill();
  // Latitude rings (3)
  [-0.5, 0, 0.5].forEach((frac, i) => {
    const ly = cy + frac * r * 0.88;
    const hw = Math.sqrt(Math.max(0, r * r - (ly - cy) ** 2));
    ctx.save(); ctx.beginPath();
    ctx.ellipse(cx, ly, hw, hw * 0.22, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color + (i === 1 ? "77" : "44");
    ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
  });
  // Rotating longitude lines (3)
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI + t * 0.45;
    const cosA = Math.abs(Math.cos(ang));
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.ellipse(0, 0, r * cosA, r, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color + (cosA > 0.6 ? "55" : "28");
    ctx.lineWidth = 0.7; ctx.stroke(); ctx.restore();
  }
  // Equatorial orbit ring (flat)
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1.35, 0.28);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  ctx.strokeStyle = color + "88"; ctx.lineWidth = 1.2 / 0.28; ctx.stroke();
  // Satellite dot on ring
  const satA = t * 1.3;
  const sx = Math.cos(satA) * r * 0.92, sy = Math.sin(satA) * r * 0.92;
  ctx.restore();
  const sg = ctx.createRadialGradient(cx + sx * 1.35, cy + sy * 0.28, 0, cx + sx * 1.35, cy + sy * 0.28, 3.5);
  sg.addColorStop(0, "#ffffffff"); sg.addColorStop(0.5, color + "ff"); sg.addColorStop(1, color + "00");
  ctx.beginPath(); ctx.arc(cx + sx * 1.35, cy + sy * 0.28, 3, 0, Math.PI * 2);
  ctx.fillStyle = sg; ctx.fill();
  // Specular highlight
  const hl = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 0, cx - r*0.3, cy - r*0.3, r * 0.3);
  hl.addColorStop(0, "#ffffff44"); hl.addColorStop(1, "transparent");
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = hl; ctx.fill();
}

function drawRadarSweep(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.42;
  // BG glow
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  bg.addColorStop(0, color + "18"); bg.addColorStop(1, color + "00");
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
  // Rings
  [0.33, 0.66, 1].forEach(f => {
    ctx.beginPath(); ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
    ctx.strokeStyle = color + "44"; ctx.lineWidth = 0.8; ctx.stroke();
  });
  // Cross hairs
  ctx.strokeStyle = color + "33"; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
  // Sweep
  const sweepAngle = t * 1.6;
  for (let i = 0; i < 48; i++) {
    const a = sweepAngle - (i / 48) * (Math.PI * 0.9);
    const op = (1 - i / 48) * 0.7;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a, a + 0.07); ctx.closePath();
    ctx.fillStyle = color + Math.round(op * 255).toString(16).padStart(2, "0"); ctx.fill();
  }
  // Target blips
  [[0.62, 0.28], [0.85, 0.71], [0.42, 0.82], [0.75, 0.48]].forEach(([dr, da]) => {
    const bx = cx + Math.cos(da * Math.PI * 2) * r * dr;
    const by = cy + Math.sin(da * Math.PI * 2) * r * dr;
    const pulse = Math.abs(Math.sin(t * 3.5 + da * 10));
    const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, 4);
    bg2.addColorStop(0, "#ffffffff"); bg2.addColorStop(0.3, color + "ff"); bg2.addColorStop(1, color + "00");
    ctx.beginPath(); ctx.arc(bx, by, 3 + pulse * 2, 0, Math.PI * 2);
    ctx.fillStyle = bg2; ctx.fill();
  });
}

function drawDNAHelix(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  // BG glow
  const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.45);
  bg.addColorStop(0, color + "14"); bg.addColorStop(1, color + "00");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const points = 24;
  for (let i = 0; i < points; i++) {
    const y = (i / (points - 1)) * h;
    const phase = (i / points) * Math.PI * 4.5 + t * 1.4;
    const x1 = w * 0.5 + Math.cos(phase) * w * 0.32;
    const x2 = w * 0.5 + Math.cos(phase + Math.PI) * w * 0.32;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.strokeStyle = color + "55"; ctx.lineWidth = 0.6; ctx.stroke();
    const alpha = 0.5 + 0.5 * Math.sin(phase);
    const r = 2.8;
    const g1 = ctx.createRadialGradient(x1, y, 0, x1, y, r * 1.5);
    g1.addColorStop(0, color + "ff"); g1.addColorStop(1, color + "00");
    const g2 = ctx.createRadialGradient(x2, y, 0, x2, y, r * 1.5);
    g2.addColorStop(0, "#8b5cf6ff"); g2.addColorStop(1, "#8b5cf600");
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(x1, y, r, 0, Math.PI * 2); ctx.fillStyle = g1; ctx.fill();
    ctx.beginPath(); ctx.arc(x2, y, r, 0, Math.PI * 2); ctx.fillStyle = g2; ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawTerminalScan(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0d0d0d"); bg.addColorStop(1, "#080808");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const lines = ["RECON", "EXPLOIT", "PERSIST", "EXFIL"];
  const lineH = h / (lines.length + 1);
  lines.forEach((line, i) => {
    const progress = Math.min(1, Math.max(0, ((t * 0.45 - i * 0.25) % 2.5)));
    const filled = Math.floor(progress * line.length);
    ctx.font = "bold 7.5px monospace";
    ctx.fillStyle = color + "bb"; ctx.fillText(line.slice(0, filled), 4, (i + 1) * lineH + 3);
    if (filled >= line.length) {
      ctx.fillStyle = "#10b981"; ctx.fillText(" ✓", 4 + filled * 5.5, (i + 1) * lineH + 3);
    }
  });
  const cursorOn = Math.sin(t * 5) > 0;
  if (cursorOn) { ctx.fillStyle = color; ctx.fillRect(4, h - 7, 7, 2); }
}

function drawForceGraph(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  // BG
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.6);
  bg.addColorStop(0, color + "18"); bg.addColorStop(1, color + "00");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // Simulated force-directed nodes
  const nodes = [
    { x: cx, y: cy, r: 5.5, c: "#e21227" },
    { x: cx - 15 + Math.sin(t * 0.7) * 3, y: cy - 12 + Math.cos(t * 0.5) * 2, r: 3.5, c: "#f97316" },
    { x: cx + 16 + Math.cos(t * 0.6) * 2, y: cy - 9 + Math.sin(t * 0.8) * 2, r: 3, c: "#3b82f6" },
    { x: cx + 13 + Math.sin(t * 0.9) * 2, y: cy + 12 + Math.cos(t * 0.7) * 2, r: 2.5, c: "#10b981" },
    { x: cx - 14 + Math.cos(t * 0.5) * 2, y: cy + 11 + Math.sin(t * 0.6) * 2, r: 2.5, c: "#8b5cf6" },
    { x: cx + 4 + Math.sin(t * 1.1) * 3, y: cy - 18 + Math.cos(t * 0.9) * 2, r: 2, c: "#ff3333" },
  ];
  for (let i = 1; i < nodes.length; i++) {
    const prog = ((t * 0.6 + i * 0.25) % 1);
    const pulse = 0.25 + 0.4 * Math.abs(Math.sin(t * 1.8 + i));
    ctx.beginPath(); ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(nodes[i].x, nodes[i].y);
    ctx.strokeStyle = color + Math.round(pulse * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 0.7; ctx.stroke();
    const dx = nodes[0].x + (nodes[i].x - nodes[0].x) * prog;
    const dy = nodes[0].y + (nodes[i].y - nodes[0].y) * prog;
    const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, 2.5);
    dg.addColorStop(0, nodes[i].c + "ff"); dg.addColorStop(1, nodes[i].c + "00");
    ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
  }
  nodes.forEach(n => {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2);
    ng.addColorStop(0, n.c + "ff"); ng.addColorStop(1, n.c + "00");
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = ng; ctx.fill();
  });
}

function drawPyramidAscend(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.55);
  bg.addColorStop(0, color + "18"); bg.addColorStop(1, color + "00");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const levels = 5;
  for (let i = 0; i < levels; i++) {
    const frac = (levels - i) / levels;
    const lw = w * frac * 0.82;
    const x = (w - lw) / 2;
    const lh = (h / levels) * 0.65;
    const y = h - (i + 1) * (h / levels) + (h / levels) * 0.18;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.9);
    const clr = i === levels - 1 ? "#fbbf24" : color;
    const lvlG = ctx.createLinearGradient(x, y, x + lw, y + lh);
    lvlG.addColorStop(0, clr + Math.round((0.3 + pulse * 0.5) * 255).toString(16).padStart(2, "0"));
    lvlG.addColorStop(1, clr + Math.round((0.5 + pulse * 0.4) * 255).toString(16).padStart(2, "0"));
    ctx.fillStyle = lvlG;
    ctx.fillRect(x, y, lw, lh);
    ctx.strokeStyle = clr + "88"; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, lw, lh);
  }
}

function drawSwarmDots(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.5);
  bg.addColorStop(0, color + "15"); bg.addColorStop(1, color + "00");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const count = 22;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + t * 0.55;
    const r = 13 + Math.sin(t * 2.2 + i * 0.7) * 7;
    const x = w / 2 + Math.cos(angle) * r;
    const y = h / 2 + Math.sin(angle) * r;
    const alpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.2 + i));
    const ptG = ctx.createRadialGradient(x, y, 0, x, y, 2.5);
    ptG.addColorStop(0, color + "ff"); ptG.addColorStop(1, color + "00");
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = ptG; ctx.fill();
  }
  ctx.globalAlpha = 1;
  const cg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 6);
  cg.addColorStop(0, "#ffffffcc"); cg.addColorStop(0.4, color + "ff"); cg.addColorStop(1, color + "00");
  ctx.beginPath(); ctx.arc(w/2, h/2, 5, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
}

// ── Animated Icon Button ─────────────────────────────────────────────────────

const BTN = 58; // button size in pixels

function DockButton({ item }: { item: DockItem }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      frameRef.current++;
      item.draw(ctx!, frameRef.current * 0.016, w, h);
    }
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [item]);

  return (
    <motion.button
      onClick={item.onClick}
      className="relative flex flex-col items-center gap-0.5 group flex-shrink-0"
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.93 }}
      title={item.label}
    >
      <div
        className="relative rounded-xl overflow-hidden transition-all duration-200"
        style={{
          width: BTN, height: BTN,
          background: `radial-gradient(circle at 40% 32%, ${item.color}28 0%, #0a0a12 100%)`,
          border: `1px solid ${item.color}40`,
          boxShadow: `0 0 12px ${item.color}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        {/* Hover inner glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
          style={{ boxShadow: `inset 0 0 20px ${item.color}55`, border: `1px solid ${item.color}99` }}
        />
        <canvas ref={canvasRef} width={BTN} height={BTN} className="relative z-10 block" />
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.18, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ border: `1px solid ${item.color}50` }}
        />
        {/* Top corner accent */}
        <div className="absolute top-1 right-1 w-1 h-1 rounded-full opacity-60"
          style={{ background: item.color }} />
      </div>
      {/* Label - always shown on desktop, hover only on mobile */}
      <span
        className="text-[7.5px] font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity truncate text-center"
        style={{ color: item.color, maxWidth: BTN + 4 }}
      >
        {item.label}
      </span>
    </motion.button>
  );
}

// ── QuickDock3D ───────────────────────────────────────────────────────────────

interface QuickDock3DProps {
  onOpenArsenal: () => void;
  onOpenAgent: () => void;
  onOpenNexus: () => void;
  onOpenWarRoom: () => void;
  onOpenCognitiveWarfare: () => void;
  onOpenAutonomousOffense: () => void;
  onOpenCyberHierarchy: () => void;
  onOpenAttackGraph: () => void;
}

export function QuickDock3D({
  onOpenArsenal, onOpenAgent, onOpenNexus, onOpenWarRoom,
  onOpenCognitiveWarfare, onOpenAutonomousOffense, onOpenCyberHierarchy,
  onOpenAttackGraph,
}: QuickDock3DProps) {
  const buildItems = useCallback((): DockItem[] => [
    {
      id: "arsenal", label: "ARSENAL", color: "#e21227",
      draw: (ctx, t, w, h) => drawAtomOrbit(ctx, t, w, h, "#e21227"),
      onClick: onOpenArsenal,
    },
    {
      id: "agent", label: "AGENT", color: "#ff6644",
      draw: (ctx, t, w, h) => drawNeuralPulse(ctx, t, w, h, "#ff6644"),
      onClick: onOpenAgent,
    },
    {
      id: "nexus", label: "NEXUS", color: "#a78bfa",
      draw: (ctx, t, w, h) => drawHolographicGlobe(ctx, t, w, h, "#a78bfa"),
      onClick: onOpenNexus,
    },
    {
      id: "warroom", label: "WAR ROOM", color: "#00e5ff",
      draw: (ctx, t, w, h) => drawRadarSweep(ctx, t, w, h, "#00e5ff"),
      onClick: onOpenWarRoom,
    },
    {
      id: "cogwar", label: "COG WAR", color: "#8b5cf6",
      draw: (ctx, t, w, h) => drawDNAHelix(ctx, t, w, h, "#8b5cf6"),
      onClick: onOpenCognitiveWarfare,
    },
    {
      id: "offense", label: "OFFENSE", color: "#f97316",
      draw: (ctx, t, w, h) => drawTerminalScan(ctx, t, w, h, "#f97316"),
      onClick: onOpenAutonomousOffense,
    },
    {
      id: "graph", label: "ATK GRAPH", color: "#10b981",
      draw: (ctx, t, w, h) => drawForceGraph(ctx, t, w, h, "#10b981"),
      onClick: onOpenAttackGraph,
    },
    {
      id: "hierarchy", label: "PYRAMID", color: "#fbbf24",
      draw: (ctx, t, w, h) => drawPyramidAscend(ctx, t, w, h, "#10b981"),
      onClick: onOpenCyberHierarchy,
    },
    {
      id: "council", label: "COUNCIL", color: "#ec4899",
      draw: (ctx, t, w, h) => drawSwarmDots(ctx, t, w, h, "#ec4899"),
      onClick: onOpenArsenal,
    },
  ], [onOpenArsenal, onOpenAgent, onOpenNexus, onOpenWarRoom, onOpenCognitiveWarfare,
      onOpenAutonomousOffense, onOpenCyberHierarchy, onOpenAttackGraph]);

  const items = buildItems();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="relative flex items-center gap-2 px-3 py-2 overflow-x-auto"
      style={{
        background: "linear-gradient(180deg, rgba(6,6,12,0.98) 0%, rgba(4,4,9,1) 100%)",
        borderBottom: "1px solid rgba(226,18,39,0.12)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03)",
        scrollbarWidth: "none",
        minHeight: BTN + 20,
      }}
    >
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none z-10"
        style={{ background: "linear-gradient(90deg, rgba(4,4,9,1), transparent)" }} />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none z-10"
        style={{ background: "linear-gradient(270deg, rgba(4,4,9,1), transparent)" }} />

      {items.map(item => (
        <DockButton key={item.id} item={item} />
      ))}

      {/* Divider */}
      <div className="h-10 w-px mx-1 flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />

      {/* Status */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pr-1">
        <div className="flex items-center gap-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ background: "#10b981" }}
          />
          <span className="text-[7.5px] font-mono font-bold" style={{ color: "#10b981" }}>LIVE</span>
        </div>
        <span className="text-[6.5px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>SYS.OK</span>
      </div>
    </motion.div>
  );
}
