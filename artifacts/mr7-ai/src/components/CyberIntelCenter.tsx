/*
  ╔═══════════════════════════════════════════════════════════════╗
  ║         CYBER INTELLIGENCE COMMAND CENTER — 3D EDITION        ║
  ║  Full-screen AI-powered defense & monitoring platform.         ║
  ║  6 panels: BRAIN · THREATS · NETWORK · COMMANDS · MEMORY ·    ║
  ║            PROFILE                                             ║
  ╚═══════════════════════════════════════════════════════════════╝
*/

import {
  useEffect, useRef, useState, useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Brain, AlertTriangle, Network, Terminal, Database,
  User, Activity, Wifi, Shield, Zap, Clock, RotateCcw,
  Play, Square, TrendingUp, TrendingDown, ChevronRight,
  Cpu, Globe, Eye, Layers,
} from "lucide-react";

import { cyberBrain, type BrainScores, type BrainDecision, type ThreatLevel } from "@/lib/cyberBrain";
import { intelligenceMemory, type ScoreSnapshot } from "@/lib/intelligenceMemory";
import { behaviorProfiler } from "@/lib/behaviorProfiler";
import { anomalyDetector, type AnomalyEvent } from "@/lib/anomaly-detector";

/* ── Constants ──────────────────────────────────────────────────────────────── */

const THREAT_COLOR: Record<ThreatLevel, string> = {
  NOMINAL:  "#22c55e",
  ELEVATED: "#f59e0b",
  HIGH:     "#f97316",
  CRITICAL: "#e21227",
};

const SEV_COLOR: Record<string, string> = {
  critical: "#e21227",
  warn:     "#f59e0b",
  info:     "#22c55e",
  high:     "#e21227",
  medium:   "#f59e0b",
  low:      "#22c55e",
};

const TABS = [
  { id: "brain",    label: "BRAIN",    icon: Brain },
  { id: "threats",  label: "THREATS",  icon: AlertTriangle },
  { id: "network",  label: "NETWORK",  icon: Network },
  { id: "commands", label: "COMMANDS", icon: Terminal },
  { id: "memory",   label: "MEMORY",   icon: Database },
  { id: "profile",  label: "PROFILE",  icon: User },
] as const;
type TabId = typeof TABS[number]["id"];

/* ── Brain 3D Canvas ────────────────────────────────────────────────────────── */

function BrainCanvas3D({ scores, threat, size }: {
  scores: BrainScores; threat: ThreatLevel; size: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    cv.width  = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;
    const col = THREAT_COLOR[threat];

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.018;
      const t = tRef.current;
      ctx.clearRect(0, 0, size, size);

      /* Deep space background */
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
      bg.addColorStop(0, "#0a0a14");
      bg.addColorStop(1, "#04040a");
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2); ctx.fill();

      /* Outer hex grid ring */
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.05);
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 / 12) * i;
        const r = size * 0.46;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const ha = (Math.PI * 2 / 6) * j;
          const hx = px + Math.cos(ha) * (size * 0.025);
          const hy = py + Math.sin(ha) * (size * 0.025);
          j === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.strokeStyle = col + "33";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();

      /* Scanning cone */
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.9);
      const sweep = ctx.createConicalGradient
        ? ctx.createLinearGradient(-size * 0.44, 0, size * 0.44, 0)
        : ctx.createLinearGradient(-size * 0.44, 0, size * 0.44, 0);
      sweep.addColorStop(0, "transparent");
      sweep.addColorStop(0.8, col + "22");
      sweep.addColorStop(1,   col + "77");
      ctx.fillStyle = sweep;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, size * 0.44, -0.38, 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      /* Concentric data rings */
      [[0.44, "33", 1.2], [0.33, "44", 0.7], [0.22, "55", 0.5]].forEach(([r, alpha, lw]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, size * (r as number), 0, Math.PI * 2);
        ctx.strokeStyle = col + alpha;
        ctx.lineWidth   = lw as number;
        ctx.stroke();
      });

      /* Score arcs — 4 quadrants */
      const scoreQuads = [
        { val: scores.systemHealth / 100,     color: "#22c55e", label: "SYS" },
        { val: scores.networkStability / 100,  color: "#00e5ff", label: "NET" },
        { val: 1 - scores.threatLevel / 100,   color: "#e21227", label: "THR" },
        { val: scores.userEngagement / 100,    color: "#f59e0b", label: "ENG" },
      ];
      scoreQuads.forEach(({ val, color }, i) => {
        const startAngle = -Math.PI / 2 + (Math.PI * 2 / 4) * i + 0.08;
        const spanMax    = Math.PI * 2 / 4 - 0.16;

        /* Track */
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.40, startAngle, startAngle + spanMax);
        ctx.strokeStyle = "#ffffff0a";
        ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke();

        /* Filled */
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.40, startAngle, startAngle + spanMax * val);
        ctx.strokeStyle = color + "cc";
        ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke();
      });

      /* Score value labels */
      const vals = [scores.systemHealth, scores.networkStability, scores.threatLevel, scores.userEngagement];
      const vColors = ["#22c55e", "#00e5ff", "#e21227", "#f59e0b"];
      vals.forEach((v, i) => {
        const a = -Math.PI / 2 + (Math.PI * 2 / 4) * i + (Math.PI * 2 / 4) * 0.5;
        const r = size * 0.48;
        const lx = cx + Math.cos(a) * r;
        const ly = cy + Math.sin(a) * r;
        ctx.font = `bold ${size * 0.055}px monospace`;
        ctx.fillStyle = vColors[i];
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(v), lx, ly);
      });

      /* Orbit rings */
      for (let ring = 0; ring < 2; ring++) {
        const speed   = ring === 0 ? 1.4 : -0.9;
        const r       = size * (ring === 0 ? 0.28 : 0.36);
        const count   = ring === 0 ? 8 : 6;
        for (let i = 0; i < count; i++) {
          const a  = t * speed + (Math.PI * 2 / count) * i;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          const br = ring === 0 ? 2.5 : 2;
          const bgrad = ctx.createRadialGradient(px, py, 0, px, py, br * 2);
          bgrad.addColorStop(0, col);
          bgrad.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(px, py, br * 2, 0, Math.PI * 2);
          ctx.fillStyle = bgrad; ctx.fill();
        }
      }

      /* Neural connection lines */
      const nCount = 6;
      for (let i = 0; i < nCount; i++) {
        const a1 = t * 0.3 + (Math.PI * 2 / nCount) * i;
        const a2 = t * 0.3 + (Math.PI * 2 / nCount) * ((i + 2) % nCount);
        const r  = size * 0.20;
        const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
        const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cx, cy, cx, cy, x2, y2);
        ctx.strokeStyle = col + "22";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        /* Travelling dot */
        const progress = ((t * 0.5 + i * 0.17) % 1);
        const dotX = cx + Math.cos(a1 + (a2 - a1) * progress) * r * (1 - progress) + Math.cos(a2) * r * progress;
        const dotY = cy + Math.sin(a1 + (a2 - a1) * progress) * r * (1 - progress) + Math.sin(a2) * r * progress;
        ctx.beginPath(); ctx.arc(dotX, dotY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = col + "bb"; ctx.fill();
      }

      /* Central neural core */
      const pulse = 0.86 + Math.sin(t * 2.8) * 0.14;
      const coreR = size * 0.13 * pulse;
      const core  = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, "#ffffff");
      core.addColorStop(0.3, col + "ff");
      core.addColorStop(0.7, col + "88");
      core.addColorStop(1,   col + "00");
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = core; ctx.fill();

      /* Inner glow bloom */
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5);
      bloom.addColorStop(0, col + "33");
      bloom.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = bloom; ctx.fill();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [scores, threat, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="rounded-full" />;
}

/* ── Global Network Canvas ──────────────────────────────────────────────────── */

const NODES = [
  { id: "NYC",  x: 0.22, y: 0.37, label: "New York",    health: 92 },
  { id: "LON",  x: 0.46, y: 0.26, label: "London",      health: 88 },
  { id: "TOK",  x: 0.79, y: 0.34, label: "Tokyo",       health: 94 },
  { id: "SIN",  x: 0.76, y: 0.50, label: "Singapore",   health: 85 },
  { id: "SYD",  x: 0.84, y: 0.68, label: "Sydney",      health: 90 },
  { id: "DXB",  x: 0.60, y: 0.42, label: "Dubai",       health: 78 },
  { id: "FRA",  x: 0.50, y: 0.29, label: "Frankfurt",   health: 91 },
  { id: "SAO",  x: 0.28, y: 0.62, label: "São Paulo",   health: 72 },
  { id: "MUM",  x: 0.66, y: 0.45, label: "Mumbai",      health: 80 },
  { id: "JNB",  x: 0.53, y: 0.65, label: "Johannesburg",health: 65 },
  { id: "SEA",  x: 0.13, y: 0.30, label: "Seattle",     health: 96 },
  { id: "AMS",  x: 0.48, y: 0.27, label: "Amsterdam",   health: 89 },
];

const CONNECTIONS = [
  [0,1],[0,2],[1,2],[1,6],[1,11],[2,3],[3,4],[3,8],[4,5],[5,6],
  [6,7],[7,9],[8,9],[10,0],[10,6],[11,6],
];

function NetworkCanvas({ threat }: { threat: ThreatLevel }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const cvEl = canvasRef.current;
    const parent = parentRef.current;
    if (!cvEl || !parent) return;
    const cv: HTMLCanvasElement = cvEl;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

    const resize = () => {
      cv.width  = parent.clientWidth  * dpr;
      cv.height = parent.clientHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const threatCol = THREAT_COLOR[threat];

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.012;
      const t = tRef.current;
      const W = cv.width, H = cv.height;
      const ctx = cv.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);

      /* Dark bg */
      ctx.fillStyle = "#06060e";
      ctx.fillRect(0, 0, W, H);

      /* Grid */
      ctx.strokeStyle = "#ffffff08";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40 * dpr) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40 * dpr) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      /* Node positions */
      const nodePos = NODES.map(n => ({ ...n, px: n.x * W, py: n.y * H }));

      /* Connection lines */
      CONNECTIONS.forEach(([ai, bi]) => {
        const a = nodePos[ai], b = nodePos[bi];
        const avgHealth = (a.health + b.health) / 200;
        const lineCol   = avgHealth > 0.8 ? "#22c55e" : avgHealth > 0.6 ? "#f59e0b" : "#e21227";

        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        const cpx = (a.px + b.px) / 2 + (Math.sin(t * 0.4 + ai) * 20 * dpr);
        const cpy = (a.py + b.py) / 2 + (Math.cos(t * 0.4 + bi) * 10 * dpr);
        ctx.quadraticCurveTo(cpx, cpy, b.px, b.py);
        ctx.strokeStyle = lineCol + "55";
        ctx.lineWidth = 0.8 * dpr;
        ctx.stroke();

        /* Travelling data packet */
        const progress = ((t * 0.35 + (ai + bi) * 0.15) % 1);
        const interp = (a: number, b: number, t: number) => a + (b - a) * t;
        const dotX = interp(interp(a.px, cpx, progress), interp(cpx, b.px, progress), progress);
        const dotY = interp(interp(a.py, cpy, progress), interp(cpy, b.py, progress), progress);
        ctx.beginPath(); ctx.arc(dotX, dotY, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = lineCol + "cc"; ctx.fill();
      });

      /* Nodes */
      nodePos.forEach(n => {
        const healthColor = n.health > 85 ? "#22c55e" : n.health > 65 ? "#f59e0b" : "#e21227";
        const isH = hovered === n.id;
        const r   = (isH ? 7 : 5) * dpr;

        /* Pulse ring */
        const pulseProg = ((t * 1.2 + n.x * 5) % 1);
        const pulseR    = (r + pulseProg * 16 * dpr);
        const pulseAlpha = 1 - pulseProg;
        ctx.beginPath(); ctx.arc(n.px, n.py, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = healthColor + Math.round(pulseAlpha * 0x88).toString(16).padStart(2, "0");
        ctx.lineWidth = 1 * dpr; ctx.stroke();

        /* Core dot */
        const grd = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, r);
        grd.addColorStop(0, "#ffffff");
        grd.addColorStop(0.4, healthColor);
        grd.addColorStop(1, healthColor + "44");
        ctx.beginPath(); ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        /* Label */
        if (isH || W > 600 * dpr) {
          ctx.font        = `bold ${10 * dpr}px monospace`;
          ctx.fillStyle   = isH ? "#ffffff" : "#ffffff99";
          ctx.textAlign   = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(n.id, n.px, n.py - r - 2 * dpr);
          if (isH) {
            ctx.font = `${9 * dpr}px monospace`;
            ctx.fillStyle = healthColor;
            ctx.fillText(`${n.health}%`, n.px, n.py - r - 13 * dpr);
          }
        }
      });

      /* Threat scan sweep */
      if (threat !== 'NOMINAL') {
        const sweepAngle = (t * 1.5) % (Math.PI * 2);
        const cx = W * 0.5, cy = H * 0.5;
        const sweepLen = Math.max(W, H) * 0.65;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(sweepAngle);
        const sg = ctx.createLinearGradient(0, 0, sweepLen, 0);
        sg.addColorStop(0, threatCol + "22");
        sg.addColorStop(1, threatCol + "00");
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, sweepLen, -0.25, 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [threat, hovered]);

  return (
    <div ref={parentRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%" }}
        className="absolute inset-0"
        onMouseMove={(e) => {
          const cv = canvasRef.current;
          if (!cv) return;
          const rect = cv.getBoundingClientRect();
          const mx = (e.clientX - rect.left) / rect.width;
          const my = (e.clientY - rect.top)  / rect.height;
          const hit = NODES.find(n => Math.hypot(n.x - mx, n.y - my) < 0.04);
          setHovered(hit?.id ?? null);
        }}
        onMouseLeave={() => setHovered(null)}
      />
    </div>
  );
}

/* ── Score Trend Chart ──────────────────────────────────────────────────────── */

function TrendChart({ data, color, label }: {
  data: number[]; color: string; label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl || data.length < 2) return;
    const cv: HTMLCanvasElement = cvEl;
    const W = cv.offsetWidth, H = cv.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const mn = Math.min(...data) - 5, mx = Math.max(...data) + 5;
    const range = Math.max(mx - mn, 10);
    const toX = (i: number) => (i / (data.length - 1)) * W;
    const toY = (v: number) => H - ((v - mn) / range) * H * 0.85 - H * 0.05;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + "44");
    grad.addColorStop(1, color + "00");

    ctx.beginPath();
    data.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    data.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
    ctx.strokeStyle = color + "cc"; ctx.lineWidth = 1.5;
    ctx.lineJoin = "round"; ctx.stroke();

    ctx.font = "bold 10px monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.fillText(label, 4, 14);
    ctx.fillText(`${Math.round(data[data.length - 1])}`, W - 28, 14);
  }, [data, color, label]);

  return (
    <canvas ref={canvasRef} style={{ width: "100%", height: 52 }} className="rounded" />
  );
}

/* ── Gauge ──────────────────────────────────────────────────────────────────── */

function Gauge({ value, color, label, icon: Icon }: {
  value: number; color: string; label: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff0f" strokeWidth="4" />
          <motion.circle
            cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${163.4 * value / 100} 163.4`}
            initial={false}
            animate={{ strokeDasharray: `${163.4 * value / 100} 163.4` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon size={12} style={{ color }} />
          <span className="text-[10px] font-mono font-bold" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">{label}</span>
    </div>
  );
}

/* ── Simulation Button ──────────────────────────────────────────────────────── */

function SimButton({ label, description, color, icon: Icon, active, onStart, onStop }: {
  label: string; description: string; color: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean; onStart: () => void; onStop?: () => void;
}) {
  return (
    <div
      className="rounded-xl p-4 border transition-all duration-300"
      style={{
        background: active ? color + "18" : "#0d0d18",
        borderColor: active ? color + "88" : "#1f1f30",
        boxShadow: active ? `0 0 20px ${color}33` : "none",
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <motion.div
          animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={active ? { duration: 1.2, repeat: Infinity } : {}}
        >
          <Icon size={18} style={{ color: active ? color : "#ffffff44" }} />
        </motion.div>
        <div className="flex-1">
          <div className="text-[11px] font-mono font-bold text-white/80 uppercase tracking-wider">{label}</div>
          <div className="text-[9px] font-mono text-white/35 mt-0.5">{description}</div>
        </div>
        {active && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ color, background: color + "22", border: `1px solid ${color}55` }}
          >
            ACTIVE
          </motion.div>
        )}
      </div>
      <button
        onClick={active ? onStop : onStart}
        className="w-full py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.97]"
        style={{
          background: active ? "#1f1f30" : `linear-gradient(135deg, ${color}33, ${color}11)`,
          border: `1px solid ${active ? "#2a2a40" : color + "55"}`,
          color: active ? "#ffffff66" : color,
        }}
      >
        {active ? (
          <span className="flex items-center justify-center gap-1"><Square size={8} /> Stop</span>
        ) : (
          <span className="flex items-center justify-center gap-1"><Play size={8} /> Simulate</span>
        )}
      </button>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */

interface CyberIntelCenterProps {
  open:    boolean;
  onClose: () => void;
}

export function CyberIntelCenter({ open, onClose }: CyberIntelCenterProps) {
  const [activeTab, setActiveTab]   = useState<TabId>("brain");
  const [scores,    setScores]      = useState<BrainScores>(() => cyberBrain.getScores());
  const [decisions, setDecisions]   = useState<BrainDecision[]>(() => cyberBrain.getDecisions());
  const [anomalies, setAnomalies]   = useState<AnomalyEvent[]>(() => anomalyDetector.getEvents());
  const [threat,    setThreat]      = useState<ThreatLevel>(() => cyberBrain.getThreatLevel());
  const [simState,  setSimState]    = useState(() => cyberBrain.getSimState());
  const [memSnaps,  setMemSnaps]    = useState<ScoreSnapshot[]>(() => intelligenceMemory.getRecentScores(60));
  const [profileSummary, setProfileSummary] = useState(() => behaviorProfiler.getSummary());

  /* Subscribe to brain events */
  useEffect(() => {
    if (!open) return;
    return cyberBrain.subscribe((ev) => {
      if (ev.type === 'scores_update') {
        const s = ev.payload as BrainScores;
        setScores(s);
        setThreat(cyberBrain.getThreatLevel());
        intelligenceMemory.pushScores(s);
        setMemSnaps(intelligenceMemory.getRecentScores(60));
        setSimState(cyberBrain.getSimState());
      }
      if (ev.type === 'decision') {
        const d = ev.payload as BrainDecision;
        setDecisions(cyberBrain.getDecisions());
        intelligenceMemory.pushDecision(d);
      }
      if (ev.type === 'threat_detected' || ev.type === 'anomaly') {
        setAnomalies(anomalyDetector.getEvents());
        intelligenceMemory.pushAnomaly((ev.payload as { message: string }).message);
      }
    });
  }, [open]);

  /* Refresh profile on open */
  useEffect(() => {
    if (open) {
      setProfileSummary(behaviorProfiler.getSummary());
      setMemSnaps(intelligenceMemory.getRecentScores(60));
    }
  }, [open]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const threatColor  = THREAT_COLOR[threat];
  const overallColor = scores.overallScore > 75 ? "#22c55e" : scores.overallScore > 50 ? "#f59e0b" : "#e21227";
  const memSummary   = intelligenceMemory.getSummary();

  /* Score history arrays for charts */
  const healthData  = memSnaps.map(s => s.health);
  const netData     = memSnaps.map(s => s.network);
  const threatData  = memSnaps.map(s => s.threat);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[1000] flex items-stretch justify-stretch"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ scale: 0.93, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.93, y: 20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex-1 flex flex-col overflow-hidden m-2 rounded-2xl border"
            style={{
              background: "#06060e",
              borderColor: threatColor + "44",
              boxShadow: `0 0 60px ${threatColor}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center gap-4 px-6 py-4 shrink-0"
              style={{ borderBottom: `1px solid ${threatColor}22` }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Layers size={22} style={{ color: threatColor }} />
                </motion.div>
                <div>
                  <div className="text-[13px] font-mono font-black tracking-[0.3em] text-white uppercase">
                    Cyber Intelligence Center
                  </div>
                  <div className="text-[9px] font-mono text-white/35 tracking-widest uppercase">
                    AI-Powered Defense Platform · v3.0 · {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Overall score */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                  style={{ borderColor: overallColor + "55", background: overallColor + "11" }}
                >
                  <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: overallColor }} />
                  </motion.div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: overallColor }}>
                    SYSTEM {scores.overallScore}%
                  </span>
                </div>

                {/* Threat badge */}
                <motion.div
                  animate={{ boxShadow: threat !== 'NOMINAL' ? [`0 0 8px ${threatColor}44`, `0 0 20px ${threatColor}88`, `0 0 8px ${threatColor}44`] : `0 0 8px ${threatColor}22` }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold"
                  style={{ color: threatColor, borderColor: threatColor + "66", background: threatColor + "11" }}
                >
                  <Shield size={10} />
                  {threat}
                </motion.div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div
              className="flex items-center gap-1 px-6 py-2 shrink-0"
              style={{ borderBottom: "1px solid #1a1a28" }}
            >
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all"
                    style={{
                      color: active ? threatColor : "#ffffff44",
                      background: active ? threatColor + "18" : "transparent",
                      border: `1px solid ${active ? threatColor + "55" : "transparent"}`,
                    }}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-y-auto"
                >
                  {/* ───────── TAB: BRAIN ───────── */}
                  {activeTab === "brain" && (
                    <div className="flex h-full">
                      {/* Left — 3D brain */}
                      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
                        <BrainCanvas3D scores={scores} threat={threat} size={340} />
                        <div className="text-center">
                          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Neural Core Status</div>
                          <div className="text-[12px] font-mono font-bold" style={{ color: threatColor }}>
                            {threat === 'NOMINAL' ? 'All Systems Nominal' : threat === 'ELEVATED' ? 'Elevated Alert Mode' : threat === 'HIGH' ? 'High Alert — Monitoring' : 'Critical — Full Alert'}
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <Gauge value={scores.systemHealth}     color="#22c55e" label="HEALTH"  icon={Activity} />
                          <Gauge value={scores.networkStability} color="#00e5ff" label="NETWORK" icon={Wifi} />
                          <Gauge value={scores.threatLevel}      color="#e21227" label="THREAT"  icon={AlertTriangle} />
                          <Gauge value={scores.userEngagement}   color="#f59e0b" label="ENGAGE"  icon={Zap} />
                        </div>
                      </div>

                      {/* Right — decisions */}
                      <div
                        className="w-80 flex flex-col border-l overflow-hidden"
                        style={{ borderColor: "#1a1a28" }}
                      >
                        <div className="px-4 py-3 border-b" style={{ borderColor: "#1a1a28" }}>
                          <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">AI Decisions</div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {decisions.slice(0, 20).map((d) => (
                            <div
                              key={d.id}
                              className="flex items-start gap-3 px-4 py-3 border-b"
                              style={{ borderColor: "#0f0f1a" }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                style={{ background: SEV_COLOR[d.severity] }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-mono text-white/60 leading-relaxed">{d.message}</div>
                                <div className="text-[8px] font-mono text-white/20 mt-1 flex items-center gap-1">
                                  <Clock size={7} />
                                  {new Date(d.ts).toLocaleTimeString()}
                                  <span className="ml-1 px-1 rounded text-[7px]" style={{ background: SEV_COLOR[d.severity] + "22", color: SEV_COLOR[d.severity] }}>
                                    {d.auto ? "AUTO" : "MANUAL"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {decisions.length === 0 && (
                            <div className="px-4 py-8 text-center text-[10px] font-mono text-white/20">
                              No decisions yet — monitoring...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ───────── TAB: THREATS ───────── */}
                  {activeTab === "threats" && (
                    <div className="flex h-full">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Threat level banner */}
                        <div
                          className="flex items-center gap-4 px-6 py-4 mx-4 mt-4 rounded-xl border"
                          style={{
                            background: threatColor + "0f",
                            borderColor: threatColor + "44",
                            boxShadow: threat !== 'NOMINAL' ? `0 0 24px ${threatColor}22` : "none",
                          }}
                        >
                          <motion.div
                            animate={threat !== 'NOMINAL' ? { scale: [1, 1.2, 1], opacity: [1, 0.6, 1] } : {}}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <AlertTriangle size={28} style={{ color: threatColor }} />
                          </motion.div>
                          <div>
                            <div className="text-[16px] font-mono font-black" style={{ color: threatColor }}>{threat}</div>
                            <div className="text-[10px] font-mono text-white/40">
                              Threat Score: {scores.threatLevel}% · {anomalies.length} events detected
                            </div>
                          </div>
                          <div className="ml-auto text-right">
                            <div className="text-[11px] font-mono text-white/60">Risk Score</div>
                            <div className="text-[24px] font-mono font-black" style={{ color: threatColor }}>
                              {scores.threatLevel}
                            </div>
                          </div>
                        </div>

                        {/* Anomaly list */}
                        <div className="flex-1 overflow-y-auto px-4 py-4">
                          <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-3">Detected Anomalies</div>
                          {anomalies.length === 0 && (
                            <div className="text-center py-12 text-[11px] font-mono text-white/20">
                              No anomalies detected — system clean
                            </div>
                          )}
                          {anomalies.slice(0, 30).map((a) => (
                            <div
                              key={a.id}
                              className="flex items-start gap-3 p-3 rounded-lg mb-2 border"
                              style={{
                                background: SEV_COLOR[a.severity] + "0a",
                                borderColor: SEV_COLOR[a.severity] + "33",
                              }}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ background: SEV_COLOR[a.severity] }} />
                                <div
                                  className="text-[7px] font-mono font-bold uppercase"
                                  style={{ color: SEV_COLOR[a.severity] }}
                                >
                                  {a.severity}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-mono text-white/70">{a.message}</div>
                                <div className="text-[8px] font-mono text-white/30 mt-1 flex items-center gap-2">
                                  <span>{a.type.replace(/_/g, " ")}</span>
                                  <span>·</span>
                                  <Clock size={7} />
                                  {new Date(a.ts).toLocaleTimeString()}
                                  <span>·</span>
                                  <span>val: {a.value}</span>
                                </div>
                              </div>
                              <ChevronRight size={12} className="text-white/20 shrink-0 mt-1" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ───────── TAB: NETWORK ───────── */}
                  {activeTab === "network" && (
                    <div className="flex h-full">
                      <div className="flex-1 relative overflow-hidden rounded-b-xl">
                        <NetworkCanvas threat={threat} />
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                          <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-2">Node Legend</div>
                          {[["#22c55e","Health > 85%"],["#f59e0b","Health 65–85%"],["#e21227","Health < 65%"]].map(([c,l])=>(
                            <div key={l} className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                              <span className="text-[9px] font-mono text-white/50">{l}</span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                          <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-2">Network Stats</div>
                          <div className="text-[10px] font-mono text-white/60">{NODES.length} Active Nodes</div>
                          <div className="text-[10px] font-mono text-white/60">{CONNECTIONS.length} Connections</div>
                          <div className="text-[10px] font-mono" style={{ color: THREAT_COLOR[threat] }}>
                            Stability: {scores.networkStability}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ───────── TAB: COMMANDS ───────── */}
                  {activeTab === "commands" && (
                    <div className="p-6 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                      <div className="col-span-2 text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">
                        Safe Simulation Controls — No real attacks executed
                      </div>
                      <SimButton
                        label="CPU Stress Test"
                        description="Simulate high CPU load — tests system resilience (30s)"
                        color="#e21227"
                        icon={Cpu}
                        active={simState.stressTest}
                        onStart={() => { cyberBrain.simulateStressTest(); setSimState(cyberBrain.getSimState()); }}
                        onStop={() => { cyberBrain.resetAllSimulations(); setSimState(cyberBrain.getSimState()); }}
                      />
                      <SimButton
                        label="Latency Spike"
                        description="Simulate network latency surge — tests tolerance (20s)"
                        color="#f59e0b"
                        icon={Activity}
                        active={simState.latencySpike}
                        onStart={() => { cyberBrain.simulateLatencySpike(); setSimState(cyberBrain.getSimState()); }}
                        onStop={() => { cyberBrain.resetAllSimulations(); setSimState(cyberBrain.getSimState()); }}
                      />
                      <SimButton
                        label="Intrusion Attempt"
                        description="Simulate fake intrusion — tests detection systems (15s)"
                        color="#a78bfa"
                        icon={Eye}
                        active={simState.intrusionSim}
                        onStart={() => { cyberBrain.simulateIntrusionAttempt(); setSimState(cyberBrain.getSimState()); }}
                        onStop={() => { cyberBrain.resetAllSimulations(); setSimState(cyberBrain.getSimState()); }}
                      />
                      <SimButton
                        label="Traffic Spike"
                        description="Simulate request flood — evaluates load handling (25s)"
                        color="#00e5ff"
                        icon={Globe}
                        active={simState.trafficSpike}
                        onStart={() => { cyberBrain.simulateTrafficSpike(); setSimState(cyberBrain.getSimState()); }}
                        onStop={() => { cyberBrain.resetAllSimulations(); setSimState(cyberBrain.getSimState()); }}
                      />
                      <div className="col-span-2">
                        <button
                          onClick={() => { cyberBrain.resetAllSimulations(); setSimState(cyberBrain.getSimState()); }}
                          className="w-full py-2.5 rounded-lg border text-[11px] font-mono font-bold uppercase tracking-widest text-white/50 border-white/10 hover:border-white/25 hover:text-white/70 transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={12} /> Reset All Simulations
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ───────── TAB: MEMORY ───────── */}
                  {activeTab === "memory" && (
                    <div className="flex h-full">
                      <div className="flex-1 overflow-y-auto p-6">
                        {/* Stats row */}
                        <div className="grid grid-cols-4 gap-3 mb-6">
                          {[
                            { label: "Sessions",     value: memSummary.sessionCount,  color: "#00e5ff",  icon: Database },
                            { label: "Avg Health",   value: memSummary.avgHealth+"%", color: "#22c55e",  icon: Activity },
                            { label: "Avg Threat",   value: memSummary.avgThreat+"%", color: "#e21227",  icon: AlertTriangle },
                            { label: "Peak Threat",  value: memSummary.peakThreat+"%",color: "#f97316",  icon: TrendingUp },
                          ].map(({ label, value, color, icon: Icon }) => (
                            <div key={label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                              <Icon size={14} style={{ color }} className="mb-2" />
                              <div className="text-[16px] font-mono font-black" style={{ color }}>{value}</div>
                              <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mt-1">{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Trend charts */}
                        {memSnaps.length > 1 && (
                          <div className="grid grid-cols-1 gap-3 mb-6">
                            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                              <TrendChart data={healthData}  color="#22c55e" label="SYSTEM HEALTH" />
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                              <TrendChart data={netData}     color="#00e5ff" label="NETWORK STABILITY" />
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                              <TrendChart data={threatData}  color="#e21227" label="THREAT LEVEL" />
                            </div>
                          </div>
                        )}

                        {/* Decision timeline */}
                        <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-3">Decision History</div>
                        {memSummary.decisionHistory.slice(0, 30).map((d) => (
                          <div key={d.id} className="flex items-start gap-3 py-2 border-b border-white/[0.04]">
                            <div className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: SEV_COLOR[d.severity] }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[9px] font-mono text-white/55">{d.message}</div>
                              <div className="text-[8px] font-mono text-white/20 mt-0.5">{new Date(d.ts).toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                        {memSummary.decisionHistory.length === 0 && (
                          <div className="text-center py-8 text-[10px] font-mono text-white/20">No history yet</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ───────── TAB: PROFILE ───────── */}
                  {activeTab === "profile" && (
                    <div className="p-6 max-w-2xl mx-auto">
                      {/* User type card */}
                      <div
                        className="rounded-2xl p-6 border mb-6"
                        style={{
                          background: "#0a0a18",
                          borderColor: profileSummary.currentType === 'explorer' ? "#a78bfa44" : profileSummary.currentType === 'focused' ? "#22c55e44" : "#ffffff22",
                        }}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center border-2"
                            style={{
                              borderColor: profileSummary.currentType === 'explorer' ? "#a78bfa" : profileSummary.currentType === 'focused' ? "#22c55e" : "#ffffff44",
                              background: profileSummary.currentType === 'explorer' ? "#a78bfa22" : profileSummary.currentType === 'focused' ? "#22c55e22" : "#ffffff11",
                            }}
                          >
                            <User size={24} style={{ color: profileSummary.currentType === 'explorer' ? "#a78bfa" : profileSummary.currentType === 'focused' ? "#22c55e" : "#ffffff55" }} />
                          </div>
                          <div>
                            <div className="text-[18px] font-mono font-black capitalize text-white">{profileSummary.currentType}</div>
                            <div className="text-[10px] font-mono text-white/40">
                              {profileSummary.currentType === 'explorer' ? 'High activity, exploring multiple features' :
                               profileSummary.currentType === 'focused' ? 'Concentrated, task-oriented workflow' :
                               'Low activity, background monitoring mode'}
                            </div>
                          </div>
                          {profileSummary.dominantBehavior !== profileSummary.currentType && (
                            <div className="ml-auto text-right">
                              <div className="text-[9px] font-mono text-white/30 uppercase">Dominant</div>
                              <div className="text-[11px] font-mono font-bold capitalize text-white/60">{profileSummary.dominantBehavior}</div>
                            </div>
                          )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Sessions",        value: profileSummary.totalSessions },
                            { label: "Clicks/min",      value: profileSummary.avgClicksPerMin },
                            { label: "Avg session",     value: `${profileSummary.avgSessionMinutes}m` },
                          ].map(({ label, value }) => (
                            <div key={label} className="text-center rounded-lg p-3 bg-white/[0.03] border border-white/[0.05]">
                              <div className="text-[14px] font-mono font-bold text-white/80">{value}</div>
                              <div className="text-[8px] font-mono text-white/30 uppercase tracking-wider mt-1">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Behavior adaptation */}
                      <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-3">AI Adaptation for this Profile</div>
                      {[
                        profileSummary.currentType === 'explorer' && { icon: TrendingUp, color: "#a78bfa", text: "Showing extended tool panels — high exploration mode detected" },
                        profileSummary.currentType === 'focused'  && { icon: Shield, color: "#22c55e", text: "Minimizing distractions — focused workflow optimization active" },
                        profileSummary.currentType === 'passive'  && { icon: TrendingDown, color: "#ffffff55", text: "Reducing background processing — idle conservation mode active" },
                        { icon: Zap, color: "#f59e0b", text: `Response pipeline optimized for ${profileSummary.currentType} behavior pattern` },
                        { icon: Brain, color: "#00e5ff", text: `Prediction accuracy adapts over ${profileSummary.totalSessions} recorded sessions` },
                      ].filter(Boolean).map((item, i) => {
                        const { icon: Icon, color, text } = item as { icon: React.ComponentType<{size?: number}>, color: string, text: string };
                        return (
                          <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04]">
                            <Icon size={13} style={{ color }} className="mt-0.5 shrink-0" />
                            <span className="text-[10px] font-mono text-white/50">{text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
