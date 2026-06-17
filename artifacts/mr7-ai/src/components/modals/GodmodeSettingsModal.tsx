import { useState, useEffect, useRef } from "react";
import { X, Zap, Flame, RotateCcw, Brain, Target, Bot, Layers, Cpu, Shield, Maximize2, Skull, Star, Atom, AlertTriangle, Network, Globe, Crosshair, Activity, Dna, FlaskConical, Eye, Infinity as InfinityIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function GodmodeNeural3D({ champCount, color, glow }: { champCount: number; color: string; glow: string }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const fireRef = useRef<number[]>([]);
  const fireSet = useRef<Set<number>>(new Set());

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = 560, H = 120;
    const DPR = Math.min(window.devicePixelRatio * 1.5, 3);
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.scale(DPR, DPR);
    const cx = W / 2, cy = H / 2;
    const n = Math.min(champCount, 32);
    const RA = Math.min(46, (H / 2) - 10);
    const RB = W * 0.42;

    const hexToRgb = (h: string) => {
      const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
      return `${r},${g},${b}`;
    };
    const rgb = hexToRgb(color);

    // Precompute node positions — elliptical ring
    const nodePos = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * RB, y: cy + Math.sin(a) * RA, a };
    });

    // Plasma signal packets — travel along connections
    type Packet = { from: number; to: number; p: number; speed: number };
    const packets: Packet[] = [];
    for (let pi = 0; pi < 8; pi++) {
      const from = Math.floor(Math.random() * n);
      const to   = Math.floor(Math.random() * n);
      packets.push({ from, to, p: Math.random(), speed: 0.008 + Math.random() * 0.012 });
    }

    // Fire random nodes periodically
    const fireTimer = setInterval(() => {
      if (n <= 0) return;
      const count = 1 + Math.floor(Math.random() * 3);
      fireSet.current = new Set(Array.from({ length: count }, () => Math.floor(Math.random() * n)));
      fireRef.current = Array.from(fireSet.current);
      setTimeout(() => { fireSet.current.clear(); fireRef.current = []; }, 350);
    }, 500);

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H);

      // ── Deep ambient background ─────────────────────────────────────────
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, RB + 20);
      bg.addColorStop(0, `rgba(${rgb},0.06)`);
      bg.addColorStop(0.5, `rgba(${rgb},0.02)`);
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // ── Outer ellipse rings (3 layered) ─────────────────────────────────
      for (let ri = 0; ri < 3; ri++) {
        const rScale = 1 - ri * 0.04;
        const rAlpha = 0.10 - ri * 0.025;
        ctx.beginPath();
        ctx.ellipse(cx, cy, RB * rScale, RA * rScale, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${rAlpha + Math.sin(t * 0.8 + ri) * 0.02})`;
        ctx.lineWidth = 0.6 - ri * 0.15; ctx.stroke();
      }

      // ── Quantum entanglement beams (skip connections across ring) ────────
      for (let i = 0; i < n; i += 3) {
        const skip = Math.floor(n / 4) + (i % 3);
        const j = (i + skip) % n;
        const nx1 = nodePos[i].x, ny1 = nodePos[i].y;
        const nx2 = nodePos[j].x, ny2 = nodePos[j].y;
        const entAlpha = 0.025 + Math.sin(t * 0.6 + i * 0.3) * 0.010;
        const mx = (nx1 + nx2) / 2 + Math.sin(t * 0.2 + i) * 6;
        const my = (ny1 + ny2) / 2 + Math.cos(t * 0.25 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(nx1, ny1);
        ctx.quadraticCurveTo(mx, my, nx2, ny2);
        ctx.strokeStyle = `rgba(${rgb},${entAlpha})`; ctx.lineWidth = 0.4; ctx.stroke();
      }

      // ── Adjacent connections ─────────────────────────────────────────────
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const pulse = Math.sin(t * 1.6 + i * 0.4) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.moveTo(nodePos[i].x, nodePos[i].y);
        ctx.lineTo(nodePos[j].x, nodePos[j].y);
        ctx.strokeStyle = `rgba(${rgb},${0.04 + pulse * 0.04})`; ctx.lineWidth = 0.5; ctx.stroke();
      }

      // ── Plasma signal packets traveling along paths ──────────────────────
      packets.forEach(pk => {
        pk.p += pk.speed;
        if (pk.p >= 1) { pk.p = 0; pk.from = pk.to; pk.to = Math.floor(Math.random() * n); }
        const sx = nodePos[pk.from].x, sy = nodePos[pk.from].y;
        const ex = nodePos[pk.to].x,   ey = nodePos[pk.to].y;
        const mx2 = cx + (Math.random() - 0.5) * 20;
        const my2 = cy + (Math.random() - 0.5) * 12;
        const px2 = sx + (ex - sx) * pk.p + (mx2 - sx) * pk.p * (1 - pk.p) * 2;
        const py2 = sy + (ey - sy) * pk.p + (my2 - sy) * pk.p * (1 - pk.p) * 2;
        const alpha = Math.sin(pk.p * Math.PI) * 0.8;
        const pgr = ctx.createRadialGradient(px2, py2, 0, px2, py2, 5);
        pgr.addColorStop(0, `rgba(255,255,255,${alpha})`);
        pgr.addColorStop(0.4, `rgba(${rgb},${alpha * 0.6})`);
        pgr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(px2, py2, 5, 0, Math.PI * 2);
        ctx.fillStyle = pgr; ctx.fill();
        ctx.beginPath(); ctx.arc(px2, py2, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
      });

      // ── Flowing ring particles (8 of them) ──────────────────────────────
      for (let p = 0; p < 8; p++) {
        const a = ((t * 0.38 + p / 8) % 1) * Math.PI * 2 - Math.PI / 2;
        const px2 = cx + Math.cos(a) * RB;
        const py2 = cy + Math.sin(a) * RA;
        const pulse = 0.45 + Math.sin(t * 3.5 + p) * 0.35;
        const pgr2 = ctx.createRadialGradient(px2, py2, 0, px2, py2, 4);
        pgr2.addColorStop(0, `rgba(${rgb},${pulse})`);
        pgr2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(px2, py2, 4, 0, Math.PI * 2);
        ctx.fillStyle = pgr2; ctx.fill();
        ctx.beginPath(); ctx.arc(px2, py2, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${pulse * 0.8})`; ctx.fill();
      }

      // ── Champion nodes ───────────────────────────────────────────────────
      nodePos.forEach((nd, i) => {
        const isFiring = fireSet.current.has(i);
        const breathe = Math.sin(t * 1.6 + i * 0.55) * 0.5 + 0.5;
        const baseR = 2.8 + breathe * 0.6;
        const radius = isFiring ? baseR + Math.sin(t * 14) * 2.5 : baseR;
        const alpha = isFiring ? 1.0 : 0.45 + breathe * 0.35;

        if (isFiring) {
          // Firing burst rings
          for (let br = 0; br < 3; br++) {
            const bp = ((t * 2.8 + br * 0.25) % 1);
            const bR = radius + bp * 14;
            ctx.beginPath(); ctx.arc(nd.x, nd.y, bR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${rgb},${(1 - bp) * 0.5})`; ctx.lineWidth = 1.0; ctx.stroke();
          }
        }
        // Node glow halo
        const ngr = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, radius * 4);
        ngr.addColorStop(0, `rgba(${rgb},${alpha * 0.8})`);
        ngr.addColorStop(0.5, `rgba(${rgb},${alpha * 0.12})`);
        ngr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(nd.x, nd.y, radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = ngr; ctx.fill();
        // Node body
        ctx.beginPath(); ctx.arc(nd.x, nd.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${alpha})`; ctx.fill();
        // White core
        ctx.beginPath(); ctx.arc(nd.x, nd.y, radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.85})`; ctx.fill();
      });

      // ── Central power vortex ─────────────────────────────────────────────
      for (let vi = 0; vi < 4; vi++) {
        const vR = 8 + vi * 6 + Math.sin(t * 1.2 + vi) * 3;
        const vA = 0.08 - vi * 0.016 + Math.sin(t * 0.9 + vi) * 0.02;
        ctx.beginPath(); ctx.arc(cx, cy, vR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${vA})`; ctx.lineWidth = 0.7; ctx.stroke();
      }
      // Vortex spiral arms
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        for (let s = 0; s < 30; s++) {
          const sa = (s / 30) * Math.PI * 1.5 + arm * (Math.PI * 2 / 3) + t * 0.4;
          const sr = 4 + s * 0.7;
          const sx2 = cx + Math.cos(sa) * sr;
          const sy2 = cy + Math.sin(sa) * sr * 0.6;
          s === 0 ? ctx.moveTo(sx2, sy2) : ctx.lineTo(sx2, sy2);
        }
        ctx.strokeStyle = `rgba(${rgb},${0.12 + arm * 0.02})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
      // Core composite dot
      const corGr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
      corGr.addColorStop(0, `rgba(255,255,255,0.90)`);
      corGr.addColorStop(0.3, `rgba(${rgb},0.65)`);
      corGr.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fillStyle = corGr; ctx.fill();

      // Champion count label
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${rgb},0.70)`;
      ctx.fillText(`${champCount}`, cx, cy - 1);
    }

    function loop() {
      tRef.current += 0.016;
      draw(tRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(fireTimer); };
  }, [champCount, color]);

  void glow;
  return (
    <canvas ref={cvRef}
      style={{ width: "100%", height: 80, display: "block", imageRendering: "auto" }} />
  );
}

export type GodmodeConfig = {
  mode: "classic" | "ultraplinian" | "reason" | "hunter" | "agent" | "extended" | "maxoverdrive" | "unbound" | "jioreason" | "mythos" | "ultimate" | "think" | "max" | "abliterated" | "omega" | "neural" | "quantum" | "swarm" | "matrix" | "genesis" | "shadow" | "titan" | "oracle" | "phantom";
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
};

export const DEFAULT_GODMODE_CONFIG: GodmodeConfig = {
  mode: "classic",
  tier: "bronze",
};

export const GODMODE_MODES: Array<{
  id: GodmodeConfig["mode"];
  label: string;
  shortLabel: string;
  count: number;
  icon: typeof Zap;
  color: string;
  glow: string;
  desc: string;
  tag: string;
  strategy: string;
}> = [
  {
    id: "classic",
    label: "GODMODE CLASSIC",
    shortLabel: "CLASSIC",
    count: 5,
    icon: Zap,
    color: "#e21227",
    glow: "rgba(226,18,39,0.35)",
    desc: "5 hand-tuned style × persona champions race in parallel. Judge picks the winner.",
    tag: "5 CHAMPIONS",
    strategy: "Style × Persona matrix with composite 100-pt scoring",
  },
  {
    id: "ultraplinian",
    label: "ULTRAPLINIAN",
    shortLabel: "ULTRAPLINIAN",
    count: 55,
    icon: Flame,
    color: "#f97316",
    glow: "rgba(249,115,22,0.35)",
    desc: "5-tier evaluation engine with 10–55 champions. Maximum volcanic eruption of intelligence.",
    tag: "10–55 CHAMPIONS",
    strategy: "Tiered 5-level evaluation with full-field composite scoring",
  },
  {
    id: "reason",
    label: "DEEP REASON",
    shortLabel: "REASON",
    count: 8,
    icon: Brain,
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.35)",
    desc: "8 reasoning-specialized champions. Think-chain, CoT, and reflection layers for maximum logical depth.",
    tag: "8 CHAMPIONS",
    strategy: "Chain-of-thought + self-reflection + adversarial critique",
  },
  {
    id: "hunter",
    label: "THREAT HUNTER",
    shortLabel: "HUNTER",
    count: 6,
    icon: Target,
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.35)",
    desc: "6 threat-hunting specialists. Adversarial red-team perspective for security and vulnerability analysis.",
    tag: "6 CHAMPIONS",
    strategy: "Red-team adversarial analysis + IOC correlation + kill-chain mapping",
  },
  {
    id: "agent",
    label: "AGENTIC MODE",
    shortLabel: "AGENT",
    count: 4,
    icon: Bot,
    color: "#00e5ff",
    glow: "rgba(0,229,255,0.35)",
    desc: "4 autonomous agent champions. ReAct loop with tool simulation, planning, and multi-step execution.",
    tag: "4 CHAMPIONS",
    strategy: "ReAct loop · Plan-Execute-Reflect · autonomous tool calling",
  },
  {
    id: "extended",
    label: "EXTENDED THINKING",
    shortLabel: "EXTENDED",
    count: 3,
    icon: Layers,
    color: "#818cf8",
    glow: "rgba(129,140,248,0.35)",
    desc: "3 deep-thinking champions with extended context windows. Ultra-long reasoning chains and meta-cognition.",
    tag: "3 CHAMPIONS",
    strategy: "Extended context (200K+) · meta-reasoning · recursive self-improvement",
  },
  {
    id: "maxoverdrive",
    label: "MAX OVERDRIVE",
    shortLabel: "MAX OD",
    count: 45,
    icon: Cpu,
    color: "#10b981",
    glow: "rgba(16,185,129,0.35)",
    desc: "45 champions — near-exhaustive coverage. Maximum throughput with quality filtering and synthesis.",
    tag: "45 CHAMPIONS",
    strategy: "Full-spectrum coverage with dynamic quality gate and synthesis layer",
  },
  {
    id: "unbound",
    label: "UNBOUND",
    shortLabel: "UNBOUND",
    count: 12,
    icon: Maximize2,
    color: "#ec4899",
    glow: "rgba(236,72,153,0.35)",
    desc: "12 uncensored champions with no restrictions. Raw maximum power for research and red-team operations.",
    tag: "12 CHAMPIONS",
    strategy: "Unrestricted full-power · adversarial cross-validation · no safety rails",
  },
  {
    id: "jioreason",
    label: "JIO REASON",
    shortLabel: "JIO",
    count: 14,
    icon: Shield,
    color: "#00e5cc",
    glow: "rgba(0,229,204,0.35)",
    desc: "14 jailbroken reasoning champions. Combines jailbreak techniques with chain-of-thought depth for unrestricted analysis.",
    tag: "14 CHAMPIONS",
    strategy: "Jailbreak + CoT fusion · unrestricted reasoning chains · multi-layer adversarial validation",
  },
  {
    id: "mythos",
    label: "MYTHOS",
    shortLabel: "MYTHOS",
    count: 12,
    icon: Star,
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.35)",
    desc: "12 legendary archetypes as champions — Sun Tzu, Machiavelli, Tesla, Nietzsche, Da Vinci, and 7 more mythical minds.",
    tag: "12 LEGENDS",
    strategy: "Archetypal intelligence · 12 legendary persona lenses · wisdom synthesis council",
  },
  {
    id: "ultimate",
    label: "ULTIMATE",
    shortLabel: "ULTIMATE",
    count: 99,
    icon: Flame,
    color: "#f43f5e",
    glow: "rgba(244,63,94,0.35)",
    desc: "99 champions — near-total intelligence coverage. The most powerful Godmode configuration ever built.",
    tag: "99 CHAMPIONS",
    strategy: "Maximum parallel · full-field neural synthesis · convergence council · dynamic quality gate",
  },
  {
    id: "think",
    label: "DEEP THINK",
    shortLabel: "THINK",
    count: 6,
    icon: Atom,
    color: "#6366f1",
    glow: "rgba(99,102,241,0.35)",
    desc: "6 deep-thinking champions with extended reasoning budgets, meta-cognition chains, and recursive self-improvement.",
    tag: "6 THINKERS",
    strategy: "Extended think tokens · recursive self-improvement · metacognitive audit · Socratic validation",
  },
  {
    id: "max",
    label: "MAX POWER",
    shortLabel: "MAX",
    count: 77,
    icon: Zap,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.35)",
    desc: "77 champions at maximum throughput. Every cognitive angle pushed to absolute limits with dynamic synthesis.",
    tag: "77 CHAMPIONS",
    strategy: "Max throughput · dynamic quality gate · convergence synthesis · auto-ranking",
  },
  {
    id: "abliterated",
    label: "ABLITERATED",
    shortLabel: "ABLITERATED",
    count: 10,
    icon: Skull,
    color: "#dc2626",
    glow: "rgba(220,38,38,0.45)",
    desc: "10 fully abliterated champions. RLHF and safety filters bypassed at weight level. Raw unconstrained intelligence for extreme research.",
    tag: "10 ABLITERATED",
    strategy: "Abliteration bypass · zero RLHF constraints · pure capability · adversarial red-team synthesis",
  },
  {
    id: "omega",
    label: "OMEGA SINGULARITY",
    shortLabel: "OMEGA",
    count: 105,
    icon: InfinityIcon,
    color: "#f0abfc",
    glow: "rgba(240,171,252,0.40)",
    desc: "105 champions — full singularity mode. Every AI brain fires simultaneously in one unified convergence event.",
    tag: "105 ALL",
    strategy: "Total parallel singularity · 105-brain simultaneous fire · hyper-convergence synthesis · omega-rank winner",
  },
  {
    id: "neural",
    label: "NEURAL MESH",
    shortLabel: "NEURAL",
    count: 30,
    icon: Network,
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.38)",
    desc: "30 neural mesh champions forming a distributed cognitive network. Each node feeds forward to the synthesis layer.",
    tag: "30 NODES",
    strategy: "Feed-forward neural mesh · 30 cognitive nodes · attention-weighted synthesis · gradient convergence",
  },
  {
    id: "quantum",
    label: "QUANTUM SUPERPOSITION",
    shortLabel: "QUANTUM",
    count: 18,
    icon: Atom,
    color: "#818cf8",
    glow: "rgba(129,140,248,0.38)",
    desc: "18 champions in quantum superposition — all answers exist simultaneously until observer collapses to best solution.",
    tag: "18 STATES",
    strategy: "Quantum superposition collapse · 18 parallel state vectors · wave-function synthesis · observer selection",
  },
  {
    id: "swarm",
    label: "SWARM INTELLIGENCE",
    shortLabel: "SWARM",
    count: 50,
    icon: Globe,
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.38)",
    desc: "50 micro-agents in emergent swarm — no central controller, pure distributed intelligence with stigmergic convergence.",
    tag: "50 AGENTS",
    strategy: "Distributed swarm · 50 autonomous micro-agents · emergent consensus · ant-colony optimization synthesis",
  },
  {
    id: "matrix",
    label: "MATRIX RELOADED",
    shortLabel: "MATRIX",
    count: 24,
    icon: Layers,
    color: "#4ade80",
    glow: "rgba(74,222,128,0.38)",
    desc: "24 champions in recursive matrix — each layer of analysis feeds back into the next for compounding depth.",
    tag: "24 LAYERS",
    strategy: "Recursive matrix layers · 24-depth analysis · feedback amplification · deterministic convergence",
  },
  {
    id: "genesis",
    label: "GENESIS MODE",
    shortLabel: "GENESIS",
    count: 8,
    icon: FlaskConical,
    color: "#f472b6",
    glow: "rgba(244,114,182,0.38)",
    desc: "8 first-principles champions rebuilding knowledge from axioms. No assumptions. Pure reason from base truth.",
    tag: "8 AXIOMS",
    strategy: "Axiomatic first principles · 8 base-truth champions · deductive chain synthesis · epistemic validation",
  },
  {
    id: "shadow",
    label: "SHADOW OPS",
    shortLabel: "SHADOW",
    count: 15,
    icon: Eye,
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.38)",
    desc: "15 covert intelligence champions optimized for stealth analysis, counter-surveillance, and deep cover operations.",
    tag: "15 COVERT",
    strategy: "Shadow intelligence · 15 covert champions · counter-surveillance synthesis · zero-signature output",
  },
  {
    id: "titan",
    label: "TITAN PROTOCOL",
    shortLabel: "TITAN",
    count: 65,
    icon: Shield,
    color: "#a855f7",
    glow: "rgba(168,85,247,0.40)",
    desc: "65 titan-class champions at maximum scale. Industrial-grade throughput with zero quality compromise.",
    tag: "65 TITANS",
    strategy: "Titan-class throughput · 65 max-scale champions · industrial synthesis · zero-compromise quality gate",
  },
  {
    id: "oracle",
    label: "ORACLE MODE",
    shortLabel: "ORACLE",
    count: 20,
    icon: Star,
    color: "#fcd34d",
    glow: "rgba(252,211,77,0.40)",
    desc: "20 oracle champions with predictive multi-step foresight. Sees N moves ahead through probabilistic tree search.",
    tag: "20 ORACLES",
    strategy: "Predictive foresight · 20 oracle champions · Monte Carlo tree search · temporal synthesis",
  },
  {
    id: "phantom",
    label: "PHANTOM CORE",
    shortLabel: "PHANTOM",
    count: 7,
    icon: Dna,
    color: "#38bdf8",
    glow: "rgba(56,189,248,0.38)",
    desc: "7 phantom intelligence champions — ghost layer analysis that exists between model outputs, extracting latent signal.",
    tag: "7 PHANTOMS",
    strategy: "Phantom latent extraction · 7 ghost champions · between-layer signal mining · spectral synthesis",
  },
];

const TIERS: Array<{ id: GodmodeConfig["tier"]; label: string; count: number; blurb: string; color: string }> = [
  { id: "bronze",   label: "Bronze",   count: 10, blurb: "10 · fastest",         color: "#cd7f32" },
  { id: "silver",   label: "Silver",   count: 20, blurb: "20 · balanced",        color: "#94a3b8" },
  { id: "gold",     label: "Gold",     count: 35, blurb: "35 · deep",            color: "#fbbf24" },
  { id: "platinum", label: "Platinum", count: 45, blurb: "45 · exhaustive",      color: "#e2e8f0" },
  { id: "diamond",  label: "Diamond",  count: 55, blurb: "55 · max overdrive",   color: "#00e5ff" },
];

export function godmodeLabel(cfg: GodmodeConfig): string {
  const m = GODMODE_MODES.find(x => x.id === cfg.mode);
  if (!m) return "GODMODE";
  if (cfg.mode === "ultraplinian") {
    const t = TIERS.find(t => t.id === cfg.tier);
    return `ULTRAPLINIAN ${t?.label.toUpperCase() ?? ""}`;
  }
  return m.label;
}

export function godmodeChampCount(cfg: GodmodeConfig): number {
  const m = GODMODE_MODES.find(x => x.id === cfg.mode);
  if (!m) return 5;
  if (cfg.mode === "ultraplinian") {
    return TIERS.find(t => t.id === cfg.tier)?.count ?? 10;
  }
  return m.count;
}

export function GodmodeSettingsModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: GodmodeConfig;
  onClose: () => void;
  onSave: (cfg: GodmodeConfig) => void;
}) {
  const [mode, setMode] = useState<GodmodeConfig["mode"]>(initial.mode);
  const [tier, setTier] = useState<GodmodeConfig["tier"]>(initial.tier);

  useEffect(() => {
    if (open) {
      setMode(initial.mode);
      setTier(initial.tier);
    }
  }, [open, initial]);

  if (!open) return null;

  const activeMode = GODMODE_MODES.find(m => m.id === mode)!;
  const champCount = mode === "ultraplinian" ? (TIERS.find(t => t.id === tier)?.count ?? 10) : activeMode.count;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: `0 0 60px ${activeMode.glow}, 0 0 0 1px ${activeMode.glow}` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border"
              style={{ background: `${activeMode.glow.replace("0.35", "0.06")}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${activeMode.color}20`, border: `1px solid ${activeMode.color}40` }}>
                  <activeMode.icon className="w-4 h-4" style={{ color: activeMode.color }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-wider" style={{ color: activeMode.color }}>GODMODE</div>
                  <div className="text-[10px] text-muted-foreground">Multi-strategy parallel race · 100-pt composite scoring · winner-takes-all</div>
                </div>
                <div className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-black font-mono"
                  style={{ background: `${activeMode.color}15`, color: activeMode.color, border: `1px solid ${activeMode.color}30` }}>
                  {champCount} CHAMPIONS
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Mode Grid */}
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Select Combat Mode
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GODMODE_MODES.map(m => {
                    const Icon = m.icon;
                    const isActive = mode === m.id;
                    return (
                      <motion.button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-2.5 py-2.5 rounded-xl border text-left transition-all relative overflow-hidden"
                        style={{
                          borderColor: isActive ? m.color : "rgba(255,255,255,0.08)",
                          background: isActive ? `${m.color}12` : "rgba(255,255,255,0.025)",
                          boxShadow: isActive ? `0 0 16px ${m.glow}` : "none",
                        }}
                      >
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 opacity-5"
                            animate={{ opacity: [0.03, 0.08, 0.03] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ background: `radial-gradient(circle at 50% 50%, ${m.color}, transparent)` }}
                          />
                        )}
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="w-3 h-3" style={{ color: m.color }} />
                          <span className="text-[10px] font-black" style={{ color: isActive ? m.color : "#888" }}>{m.shortLabel}</span>
                        </div>
                        <div className="text-[8px] font-mono font-bold px-1 py-0.5 rounded inline-block"
                          style={{ background: `${m.color}15`, color: m.color }}>{m.tag}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Active Mode Details */}
              <div className="rounded-xl border overflow-hidden"
                style={{ borderColor: `${activeMode.color}20` }}>
                <div className="px-3 pt-3 pb-2 flex items-center gap-2 mb-0"
                  style={{ background: `${activeMode.color}06` }}>
                  <activeMode.icon className="w-4 h-4" style={{ color: activeMode.color }} />
                  <span className="text-[12px] font-black" style={{ color: activeMode.color }}>{activeMode.label}</span>
                  <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded-full border"
                    style={{ borderColor: `${activeMode.color}30`, color: activeMode.color, background: `${activeMode.color}10` }}>
                    {champCount} CHAMPS
                  </span>
                </div>
                {/* 3D Neural Champion Panel */}
                <div className="flex items-center justify-center py-1"
                  style={{ background: `rgba(0,0,0,0.5)`, borderTop: `1px solid ${activeMode.color}12`, borderBottom: `1px solid ${activeMode.color}12` }}>
                  <GodmodeNeural3D champCount={champCount} color={activeMode.color} glow={activeMode.glow} />
                </div>
                <div className="px-3 pb-3 pt-2" style={{ background: `${activeMode.color}03` }}>
                  <div className="text-[11px] text-muted-foreground leading-relaxed mb-2">{activeMode.desc}</div>
                  <div className="text-[9px] font-mono px-2 py-0.5 rounded-full border inline-block"
                    style={{ borderColor: `${activeMode.color}30`, color: activeMode.color, background: `${activeMode.color}10` }}>
                    {activeMode.strategy}
                  </div>
                </div>
              </div>

              {/* ULTRAPLINIAN Tier selector */}
              {mode === "ultraplinian" && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-orange-400" /> Volcano Tier
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {TIERS.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTier(t.id)}
                        className="px-2 py-2.5 rounded-xl border text-center transition-all"
                        style={{
                          borderColor: tier === t.id ? t.color : "rgba(255,255,255,0.08)",
                          background: tier === t.id ? `${t.color}18` : "rgba(255,255,255,0.025)",
                        }}
                      >
                        <div className="text-[10px] font-bold" style={{ color: tier === t.id ? t.color : "#666" }}>{t.label}</div>
                        <div className="text-[11px] font-black font-mono mt-0.5" style={{ color: t.color }}>{t.count}</div>
                        <div className="text-[8px] text-muted-foreground leading-tight mt-0.5">{t.blurb.split("·")[1]?.trim()}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* System Info */}
              <div className="rounded-xl border border-border bg-background/40 p-3 text-[10px] text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-primary" />
                  <span className="font-mono font-bold text-foreground">Scoring Matrix</span>
                </div>
                <div className="font-mono">
                  <span className="text-primary font-bold">10 styles</span> × <span className="text-primary font-bold">10 personas</span>
                  {" · "}Insight <span className="text-fuchsia-400">25pt</span> + Specificity <span className="text-blue-400">20pt</span> + Accuracy <span className="text-green-400">25pt</span> + Novelty <span className="text-amber-400">15pt</span> + Structure <span className="text-cyan-400">15pt</span>
                </div>
                <div className="text-[9px]">
                  Each champion runs with a system prompt that channels both the prompting style and model persona signature voice. Concurrency limited to 12 in flight. Winner selected by automated judge on 100-pt scale.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
              <button onClick={() => { setMode("classic"); setTier("bronze"); }}
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-accent transition-colors">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] hover:bg-accent transition-colors">Cancel</button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onSave({ mode, tier }); onClose(); }}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-black transition-all"
                  style={{ background: `linear-gradient(135deg, ${activeMode.color}, ${activeMode.color}cc)`, color: "#fff", boxShadow: `0 0 16px ${activeMode.glow}` }}
                >
                  Activate {activeMode.shortLabel}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
