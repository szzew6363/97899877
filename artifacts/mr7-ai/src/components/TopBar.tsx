import { useEffect, useRef, useState, useContext, createContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { AIQuickSetupButton } from "./AIQuickSetupButton";
import { ProviderHealthBadge3D } from "./ProviderHealthBadge3D";
import { PersonaSwitcher3D } from "./PersonaSwitcher3D";
import { QuantumPersona3D } from "./QuantumPersona3D";
import { NotificationsPanel } from "./NotificationsPanel";
import { ThemePopover } from "./ThemePopover";
import { TokensPopover } from "./TokensPopover";
import { AI_MODELS, getModel } from "@/lib/ai-config";
import { tierAtLeast } from "@/lib/subscription";
import {
  Menu, Sparkles, Coins, LayoutGrid, HelpCircle, Search, Zap, Server, Bot,
  Hexagon, Shield, Columns3, Crosshair, BarChart2, ChevronLeft, ChevronRight,
  Target, GitBranch, Bug, Activity, DollarSign, GitMerge, ShieldAlert, ShieldCheck,
  BrainCircuit, Gauge, Globe, AlertTriangle, Network, Cpu, Lock,
  Flame, Share2, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

// ── Compact mode context ───────────────────────────────────────────────────────
const CompactCtx = createContext(false);

// ── TopBar props ──────────────────────────────────────────────────────────────
interface TopBarProps {
  onMenuClick: () => void;
  onOpenPricing: () => void;
  onOpenToolsHub: () => void;
  onOpenHelp: () => void;
  onOpenPersonaEditor: () => void;
  onOpenPersonaManager?: () => void;
  onOpenLocalModel: () => void;
  onOpenAgent: () => void;
  onOpenNexus: () => void;
  onOpenArsenal: () => void;
  onOpenProviderSettings?: () => void;
  onOpenModelCompare?: () => void;
  onOpenNeuralMatrix?: () => void;
  onOpenAnalytics?: () => void;
  onOpenWarRoom?: () => void;
  onOpenDeepSearch?: () => void;
  onOpenChainInvestigation?: () => void;
  onOpenRedTeam?: () => void;
  onOpenPerfDash?: () => void;
  onOpenCostDash?: () => void;
  onOpenDedupViz?: () => void;
  onOpenThreatFeed?: () => void;
  onOpenSecurityDash?: () => void;
  onOpenContextMemory?: () => void;
  onOpenPrefetch?: () => void;
  onOpenMasterHud?: () => void;
  onOpenAnomalyLog?: () => void;
  onOpenNetworkTopo?: () => void;
  onOpenCyberHub?: () => void;
  onOpenWidgetsDock?: () => void;
  onOpenCisaLive?: () => void;
  onOpenCveTimeline?: () => void;
  onOpenThreatMap?: () => void;
  onOpenCveTracker?: () => void;
  onOpenLiveOps?: () => void;
  onOpenCyberHierarchy?: () => void;
  onOpenCognitiveWarfare?: () => void;
  onOpenAutonomousOffense?: () => void;
  onOpenAttackGraph?: () => void;
  onOpenAutonomousDecisionEngine?: () => void;
  onOpenJARVISCommandCenter?: () => void;
  onOpenOmegaAgent?: () => void;
  hudsVisible?: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

// ── Ultra 3D animated HUD background ──────────────────────────────────────────
function TopBarHUDCanvas({ powerOn }: { powerOn: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const powerRef  = useRef(powerOn);
  useEffect(() => { powerRef.current = powerOn; }, [powerOn]);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d", { alpha: true, desynchronized: true })!;

    let W = 0, H = 0, DPR = 1;
    function resize() {
      DPR = Math.min(window.devicePixelRatio, 2);
      W = cv.width  = cv.offsetWidth  * DPR;
      H = cv.height = cv.offsetHeight * DPR;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // ── Neural network nodes ────────────────────────────────────────────────
    type Node = { x: number; y: number; vx: number; vy: number; r: number; phase: number; type: number };
    const nodes: Node[] = Array.from({ length: 32 }, (_, i) => ({
      x: Math.random() * 1.0, y: Math.random() * 1.0,
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0004,
      r: 1.2 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      type: i % 3, // 0=crimson, 1=cyan, 2=violet
    }));

    // ── Binary columns (Matrix-style) ────────────────────────────────────────
    type Col = { x: number; chars: { y: number; v: string; a: number }[]; speed: number };
    const cols: Col[] = Array.from({ length: 22 }, () => {
      const x = Math.random();
      const len = 4 + Math.floor(Math.random() * 7);
      return {
        x,
        chars: Array.from({ length: len }, (_, j) => ({
          y: Math.random() - j * 0.06,
          v: Math.random() > 0.5 ? "1" : "0",
          a: j === 0 ? 0.18 : 0.05 - j * 0.005,
        })),
        speed: 0.0006 + Math.random() * 0.001,
      };
    });

    // ── Wave pulses ────────────────────────────────────────────────────────
    type Wave = { cx: number; r: number; a: number; color: number };
    const waves: Wave[] = [];
    let waveTick = 0;

    // ── Horizontal data streaks ────────────────────────────────────────────
    type Streak = { x: number; w: number; y: number; a: number; speed: number; color: number };
    const streaks: Streak[] = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * 1.5 - 0.25,
      w: 0.08 + Math.random() * 0.16,
      y: 0.2 + Math.random() * 0.6,
      a: 0.08 + Math.random() * 0.14,
      speed: (0.0008 + Math.random() * 0.0012) * (Math.random() > 0.5 ? 1 : -1),
      color: i % 3,
    }));

    const COLORS = [
      [226, 18, 39],   // crimson
      [0, 229, 255],   // cyan
      [139, 92, 246],  // violet
    ];

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      if (W === 0 || H === 0) return;
      tRef.current += 0.01;
      const t = tRef.current;
      const pw = powerRef.current;
      const pulse = (Math.sin(t * 2.2) + 1) * 0.5;

      ctx.clearRect(0, 0, W, H);

      // ── Deep perspective 3D grid (converging lines to center-bottom VP) ─────
      const vpX = W * 0.5, vpY = H * 2.2;
      const gridA = pw ? 0.07 : 0.038;
      ctx.save();
      ctx.setLineDash([3 * DPR, 10 * DPR]);
      ctx.lineWidth = 0.5;
      for (let i = -6; i <= 14; i++) {
        const x0 = W * (i / 8);
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(vpX, vpY);
        const fade = 1 - Math.abs(i - 4) / 12;
        ctx.strokeStyle = `rgba(226,18,39,${gridA * fade})`; ctx.stroke();
      }
      ctx.setLineDash([]);
      // Horizontal bands across the perspective grid
      for (let yf = 0; yf < 1; yf += 0.18) {
        const y = yf * H;
        const xL = vpX + (0 - vpX) * (y / vpY);
        const xR = vpX + (W - vpX) * (y / vpY);
        const bandPulse = (Math.sin(t * 0.5 + yf * 8) + 1) * 0.5;
        ctx.beginPath(); ctx.moveTo(xL, y); ctx.lineTo(xR, y);
        ctx.strokeStyle = `rgba(226,18,39,${(pw ? 0.045 : 0.022) + bandPulse * 0.012})`;
        ctx.lineWidth = 0.4; ctx.stroke();
      }
      ctx.restore();

      // ── Diagonal secondary grid ─────────────────────────────────────────────
      ctx.save();
      ctx.setLineDash([2 * DPR, 14 * DPR]);
      ctx.lineWidth = 0.35;
      for (let x = -H; x < W + H; x += 56 * DPR) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * 0.8, H);
        ctx.strokeStyle = `rgba(0,229,255,${pw ? 0.028 : 0.014})`; ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // ── Horizontal streaks ──────────────────────────────────────────────────
      streaks.forEach(s => {
        s.x += s.speed;
        if (s.x > 1.25) s.x = -0.25;
        if (s.x < -0.25) s.x = 1.25;
        const [r, g, b] = COLORS[s.color];
        const cx = s.x * W;
        const hw = s.w * W * 0.5;
        const g1 = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
        g1.addColorStop(0, `rgba(${r},${g},${b},0)`);
        g1.addColorStop(0.5, `rgba(${r},${g},${b},${pw ? s.a : s.a * 0.55})`);
        g1.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = g1;
        ctx.fillRect(cx - hw, s.y * H - 1, hw * 2, 2);
      });

      // ── Dual vertical scan beams ────────────────────────────────────────────
      const scanY1 = ((t * 0.32) % 1) * H;
      const sg1 = ctx.createLinearGradient(0, scanY1 - 18, 0, scanY1 + 18);
      sg1.addColorStop(0, "rgba(226,18,39,0)");
      sg1.addColorStop(0.35, `rgba(226,18,39,${pw ? 0.16 : 0.07})`);
      sg1.addColorStop(0.5, `rgba(255,80,80,${pw ? 0.1 : 0.045})`);
      sg1.addColorStop(1, "rgba(226,18,39,0)");
      ctx.fillStyle = sg1; ctx.fillRect(0, scanY1 - 18, W, 36);

      const scanY2 = ((t * 0.19 + 0.55) % 1) * H;
      const sg2 = ctx.createLinearGradient(0, scanY2 - 10, 0, scanY2 + 10);
      sg2.addColorStop(0, "rgba(0,229,255,0)");
      sg2.addColorStop(0.5, `rgba(0,229,255,${pw ? 0.06 : 0.028})`);
      sg2.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sg2; ctx.fillRect(0, scanY2 - 10, W, 20);

      // ── Binary matrix columns ─────────────────────────────────────────────
      ctx.font = `${6 * DPR}px monospace`;
      cols.forEach(col => {
        col.chars.forEach(ch => {
          ch.y += col.speed;
          if (ch.y > 1.1) { ch.y -= 1.1; ch.v = Math.random() > 0.5 ? "1" : "0"; }
          const alpha = ch.a * (pw ? 1.8 : 1);
          if (alpha < 0.005) return;
          ctx.fillStyle = `rgba(226,18,39,${alpha})`;
          ctx.fillText(ch.v, col.x * W, ch.y * H);
        });
      });

      // ── Neural network nodes + connections ─────────────────────────────────
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x += 1; if (n.x > 1) n.x -= 1;
        if (n.y < 0) n.y += 1; if (n.y > 1) n.y -= 1;
      });
      // Draw connections first
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W;
          const dy = (nodes[i].y - nodes[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = W * 0.12;
          if (dist < maxDist) {
            const aFade = (1 - dist / maxDist) * (pw ? 0.12 : 0.055);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * W, nodes[i].y * H);
            ctx.lineTo(nodes[j].x * W, nodes[j].y * H);
            ctx.strokeStyle = `rgba(226,18,39,${aFade})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      // Draw node dots
      nodes.forEach(n => {
        const pls = (Math.sin(t * 2 + n.phase) + 1) * 0.5;
        const alpha = (0.2 + pls * 0.5) * (pw ? 1 : 0.5);
        const [r, g, b] = COLORS[n.type];
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, n.r * DPR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      });

      // ── Wave pulse rings ─────────────────────────────────────────────────
      waveTick++;
      if (pw && waveTick % 70 === 0) {
        waves.push({ cx: (0.1 + Math.random() * 0.8) * W, r: 0, a: 0.4, color: Math.floor(Math.random() * 3) });
      }
      if (!pw && waveTick % 130 === 0) {
        waves.push({ cx: (0.1 + Math.random() * 0.8) * W, r: 0, a: 0.22, color: 0 });
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.r += 1.6 * DPR; w.a -= 0.007;
        if (w.a <= 0) { waves.splice(i, 1); continue; }
        const [r, g, b] = COLORS[w.color];
        ctx.beginPath(); ctx.arc(w.cx, H * 0.5, w.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${w.a})`;
        ctx.lineWidth = 1.4; ctx.stroke();
      }

      // ── Corner HUD brackets ──────────────────────────────────────────────
      const bs = 20 * DPR, bw = 2 * DPR;
      const bAlpha = pw ? 0.8 + pulse * 0.2 : 0.5;
      ctx.strokeStyle = `rgba(226,18,39,${bAlpha})`; ctx.lineWidth = bw;
      // TL
      ctx.beginPath(); ctx.moveTo(0, bs); ctx.lineTo(0, 0); ctx.lineTo(bs, 0); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(W - bs, 0); ctx.lineTo(W, 0); ctx.lineTo(W, bs); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(0, H - bs); ctx.lineTo(0, H); ctx.lineTo(bs, H); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(W - bs, H); ctx.lineTo(W, H); ctx.lineTo(W, H - bs); ctx.stroke();
      // Inner tick marks
      ctx.strokeStyle = `rgba(226,18,39,${pw ? 0.45 : 0.25})`; ctx.lineWidth = 0.9;
      [0, W].forEach((cx, ci) => {
        const sign = ci === 0 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(cx + sign * bs * 0.5, 0); ctx.lineTo(cx + sign * bs * 0.5, 5 * DPR); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, bs * 0.5); ctx.lineTo(cx + sign * 5 * DPR, bs * 0.5); ctx.stroke();
      });

      // ── Power mode side glow bands ───────────────────────────────────────
      if (pw) {
        const pls2 = 0.18 + pulse * 0.16;
        const lgL = ctx.createLinearGradient(0, 0, 48 * DPR, 0);
        lgL.addColorStop(0, `rgba(226,18,39,${pls2})`); lgL.addColorStop(1, "rgba(226,18,39,0)");
        ctx.fillStyle = lgL; ctx.fillRect(0, 0, 48 * DPR, H);
        const lgR = ctx.createLinearGradient(W, 0, W - 48 * DPR, 0);
        lgR.addColorStop(0, `rgba(226,18,39,${pls2})`); lgR.addColorStop(1, "rgba(226,18,39,0)");
        ctx.fillStyle = lgR; ctx.fillRect(W - 48 * DPR, 0, 48 * DPR, H);
        // Top edge shimmer
        const lgT = ctx.createLinearGradient(0, 0, 0, 10 * DPR);
        lgT.addColorStop(0, `rgba(226,18,39,${pls2 * 0.9})`); lgT.addColorStop(1, "rgba(226,18,39,0)");
        ctx.fillStyle = lgT; ctx.fillRect(0, 0, W, 10 * DPR);
      }
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return (
    <canvas ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.92, transform: "translateZ(0)", willChange: "transform" }} />
  );
}

// ── Real-time local model health ping hook ─────────────────────────────────────
type LocalHealth = "online" | "slow" | "offline" | "checking";
const HEALTH_C: Record<LocalHealth, string> = {
  online:   "#22c55e",
  slow:     "#f59e0b",
  offline:  "#ef4444",
  checking: "#6366f1",
};
const HEALTH_LBL: Record<LocalHealth, string> = {
  online:   "ONLINE",
  slow:     "SLOW",
  offline:  "OFFLINE",
  checking: "PING...",
};

function useLocalModelHealth(endpoint: string, enabled: boolean) {
  const [health,  setHealth]  = useState<LocalHealth>("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [lastMs,  setLastMs]  = useState<number | null>(null);

  const ping = useCallback(async () => {
    if (!enabled) { setHealth("offline"); setLatency(null); return; }
    setHealth("checking");
    const t0 = Date.now();
    try {
      const base = (endpoint || "http://localhost:11434/v1").replace(/\/v1\/?$/, "");
      // Try Ollama models endpoint, fallback to LM Studio
      const res = await Promise.race([
        fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(4000) }).catch(() =>
          fetch(`${base}/v1/models`, { signal: AbortSignal.timeout(4000) })
        ),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 4200)),
      ]) as Response;
      const ms = Date.now() - t0;
      setLatency(ms); setLastMs(Date.now());
      setHealth(ms < 600 ? "online" : ms < 2000 ? "slow" : "slow");
    } catch {
      setHealth("offline"); setLatency(null); setLastMs(Date.now());
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, [ping]);

  return { health, latency, lastMs, ping };
}

// ── 3D Health pulse orb canvas ─────────────────────────────────────────────────
function HealthOrb3D({ health }: { health: LocalHealth }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true, desynchronized: true })!;
    const S = 28, DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = S * DPR; cv.height = S * DPR; ctx.scale(DPR, DPR);
    const cx = S / 2, cy = S / 2, R = S * 0.36;

    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.05;
      const t = tRef.current;
      ctx.clearRect(0, 0, S, S);

      const col = HEALTH_C[health] || "#6366f1";
      const [r, g, b] = hexToRgb(col);

      // Outer glow ring
      const pulse = health === "checking" ? 0.5 + Math.sin(t * 4) * 0.4 : 0.5 + Math.sin(t * 2) * 0.25;
      const glow = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, S * 0.5);
      glow.addColorStop(0, `rgba(${r},${g},${b},${pulse * 0.55})`);
      glow.addColorStop(0.6, `rgba(${r},${g},${b},${pulse * 0.15})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();

      // Spinning ring (checking = fast)
      ctx.save(); ctx.translate(cx, cy);
      ctx.rotate(t * (health === "checking" ? 3.5 : 0.9));
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.25, 0, Math.PI * 1.35);
      ctx.strokeStyle = `rgba(${r},${g},${b},${health === "offline" ? 0.15 : 0.5})`;
      ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();

      // Inner sphere
      const diff = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      diff.addColorStop(0, `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+80,255)},0.95)`);
      diff.addColorStop(0.5, `rgba(${r},${g},${b},0.85)`);
      diff.addColorStop(1, `rgba(${Math.round(r*0.25)},${Math.round(g*0.25)},${Math.round(b*0.25)},0.7)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(r*0.06)},${Math.round(g*0.06)},${Math.round(b*0.06)},0.95)`;
      ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // Specular highlight
      const spec = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, 0, cx, cy, R);
      spec.addColorStop(0, "rgba(255,255,255,0.75)");
      spec.addColorStop(0.3, "rgba(255,255,255,0.18)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [health]);

  return <canvas ref={canvasRef} style={{ width: 28, height: 28, display: "block", flexShrink: 0 }} />;
}

// ── Local Model Quick Toggle ───────────────────────────────────────────────────
function LocalModelQuickToggle({ onOpenLocalModel }: { onOpenLocalModel: () => void }) {
  const { state, dispatch } = useStore();
  const useLocal = state.settings.useLocalModel;
  const model    = state.settings.localModel || "dolphin-mixtral";
  const endpoint = state.settings.localEndpoint || "http://localhost:11434/v1";
  const [floatOpen, setFloatOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const { health, latency, lastMs, ping } = useLocalModelHealth(endpoint, useLocal);
  const hColor = HEALTH_C[health];

  function openFloat() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top:  Math.min(r.bottom + 8, window.innerHeight - 380),
        left: Math.min(r.left, window.innerWidth - 340),
      });
    }
    setFloatOpen(o => !o);
  }

  useEffect(() => {
    if (!floatOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setFloatOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [floatOpen]);

  const lastAgo = lastMs ? Math.round((Date.now() - lastMs) / 1000) : null;

  return (
    <>
      <motion.button
        ref={btnRef}
        onClick={openFloat}
        className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg relative overflow-hidden"
        style={{
          color:      useLocal ? hColor : "rgba(255,80,80,0.65)",
          background: useLocal ? `${hColor}12` : "rgba(255,50,50,0.06)",
          border:     `1px solid ${useLocal ? hColor + "44" : "rgba(255,80,80,0.22)"}`,
          boxShadow:  useLocal ? `0 0 14px ${hColor}28` : "none",
        }}
        whileHover={{ scale: 1.05, y: -0.5 }}
        whileTap={{ scale: 0.94, transition: { type: "spring", stiffness: 600, damping: 25 } }}
        aria-label="Local Model status"
        title={useLocal ? `Local: ${model} — ${HEALTH_LBL[health]}` : "Local model disabled"}
      >
        {/* Shimmer sweep on hover */}
        <motion.span className="absolute inset-y-0 w-12 pointer-events-none"
          style={{ background: `linear-gradient(90deg,transparent,${hColor}22,transparent)` }}
          animate={{ x: ["-120%", "320%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }} />

        <motion.div style={{ filter: `drop-shadow(0 0 3px ${hColor}88)` }}
          animate={useLocal ? { opacity: [1, 0.3, 1] } : { opacity: 0.5 }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <Server className="w-3.5 h-3.5" />
        </motion.div>
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span className="text-[6.5px] font-black tracking-[0.3em] uppercase opacity-60">LOCAL</span>
          <span className="text-[8px] font-black tracking-wide">{useLocal ? "ON" : "OFF"}</span>
        </div>

        {/* Live health dot */}
        {useLocal && (
          <motion.span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: hColor, boxShadow: `0 0 8px ${hColor}` }}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.35, 1] }}
            transition={{ duration: health === "checking" ? 0.7 : 1.6, repeat: Infinity }} />
        )}

        {/* Active pulse bottom line */}
        {floatOpen && (
          <motion.span className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: `linear-gradient(90deg,transparent,${hColor},transparent)` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }} />
        )}
      </motion.button>

      {/* External floating window */}
      <AnimatePresence>
        {floatOpen && (
          <>
            <motion.div className="fixed inset-0 z-[1998]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(5px)" }}
              onClick={() => setFloatOpen(false)} />

            <motion.div
              className="fixed z-[1999] rounded-2xl"
              style={{
                top: pos.top, left: pos.left, width: 320,
                background: "linear-gradient(160deg, rgba(4,8,5,0.99) 0%, rgba(2,5,3,0.99) 100%)",
                border: `1px solid ${hColor}40`,
                boxShadow: `0 0 80px ${hColor}18, 0 0 30px ${hColor}0a, 0 28px 70px rgba(0,0,0,0.92), inset 0 1px 0 ${hColor}18`,
                backdropFilter: "blur(32px)",
              }}
              initial={{ opacity: 0, scale: 0.91, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.91, y: -8 }}
              transition={{ duration: 0.20, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-px w-full" style={{ background: `linear-gradient(90deg,transparent,${hColor},rgba(34,197,94,0.3),transparent)` }} />

              {/* Corner brackets */}
              <span className="absolute top-2 left-2 w-3 h-3 border-t border-l pointer-events-none" style={{ borderColor: hColor + "66" }} />
              <span className="absolute top-2 right-2 w-3 h-3 border-t border-r pointer-events-none" style={{ borderColor: hColor + "66" }} />
              <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l pointer-events-none" style={{ borderColor: hColor + "33" }} />
              <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r pointer-events-none" style={{ borderColor: hColor + "33" }} />

              <div className="px-5 pt-4 pb-2">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <HealthOrb3D health={health} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[7px] font-black tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>LOCAL MODEL ENGINE</div>
                    <div className="text-[13px] font-black flex items-center gap-1.5" style={{ color: hColor }}>
                      {HEALTH_LBL[health]}
                      {latency != null && (
                        <span className="text-[9px] font-mono font-normal" style={{ color: hColor + "aa" }}>{latency}ms</span>
                      )}
                    </div>
                  </div>
                  <motion.button onClick={() => setFloatOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
                    whileHover={{ background: "rgba(226,18,39,0.12)", color: "#e21227" }}>×</motion.button>
                </div>

                {/* Live latency bar */}
                {useLocal && (
                  <div className="mb-3 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>اتصال مباشر</span>
                      <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {lastAgo != null ? `آخر فحص: ${lastAgo}ث` : "—"} · كل 30ث
                      </span>
                    </div>
                    <div className="mx-2.5 mb-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full"
                        animate={{ width: health === "online" ? "92%" : health === "slow" ? "52%" : health === "checking" ? ["20%","80%","20%"] : "8%" }}
                        transition={{ duration: health === "checking" ? 1.2 : 0.6, repeat: health === "checking" ? Infinity : 0, ease: "easeOut" }}
                        style={{ background: `linear-gradient(90deg,${hColor},${hColor}aa)` }} />
                    </div>

                    {/* Real-time health indicators */}
                    <div className="grid grid-cols-3 gap-1 mx-2.5 mb-2">
                      {[
                        { label: "LATENCY", value: latency != null ? `${latency}ms` : "—", color: latency != null ? (latency < 600 ? "#22c55e" : latency < 2000 ? "#f59e0b" : "#ef4444") : "rgba(255,255,255,0.3)" },
                        { label: "STATUS",  value: HEALTH_LBL[health], color: hColor },
                        { label: "UPTIME",  value: health !== "offline" ? "LIVE" : "DOWN", color: health !== "offline" ? "#22c55e" : "#ef4444" },
                      ].map(s => (
                        <div key={s.label} className="rounded-lg p-1.5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div className="text-[6px] uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{s.label}</div>
                          <div className="text-[8px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Endpoint display */}
                <div className="text-[9px] font-mono mb-3 px-2 py-1.5 rounded-lg truncate"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {endpoint} · {model}
                </div>

                <div className="flex flex-col gap-2">
                  {/* Main toggle */}
                  <motion.button
                    onClick={() => {
                      dispatch({ type: "SET_SETTINGS", patch: { useLocalModel: !useLocal } });
                      setFloatOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl text-[11px] font-black tracking-wider uppercase relative overflow-hidden"
                    style={{
                      background: useLocal ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.14)",
                      border: `1px solid ${useLocal ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)"}`,
                      color: useLocal ? "#ef4444" : "#22c55e",
                    }}
                    whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${useLocal ? "rgba(239,68,68,0.22)" : "rgba(34,197,94,0.22)"}` }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <motion.span className="absolute inset-y-0 w-20 pointer-events-none"
                      style={{ background: `linear-gradient(90deg,transparent,${useLocal ? "rgba(239,68,68,0.18)" : "rgba(34,197,94,0.18)"},transparent)` }}
                      animate={{ x: ["-150%", "400%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />
                    {useLocal ? "⊘  تعطيل النموذج المحلي" : "⊕  تفعيل النموذج المحلي"}
                  </motion.button>

                  <div className="flex gap-2">
                    {/* Ping now */}
                    <motion.button
                      onClick={() => ping()}
                      className="flex-1 py-2 rounded-xl text-[9px] font-black tracking-wider uppercase"
                      style={{ background: `${hColor}10`, border: `1px solid ${hColor}28`, color: hColor }}
                      whileHover={{ scale: 1.02, background: `${hColor}18` }} whileTap={{ scale: 0.97 }}
                    >⟳ فحص الآن</motion.button>

                    <motion.button
                      onClick={() => { setFloatOpen(false); onOpenLocalModel(); }}
                      className="flex-1 py-2 rounded-xl text-[9px] font-black tracking-wider uppercase"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}
                      whileHover={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
                      whileTap={{ scale: 0.97 }}
                    >⚙ إعدادات</motion.button>
                  </div>
                </div>
              </div>
              <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${hColor}44,transparent)` }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Operation Mode Button 3D ──────────────────────────────────────────────────
type PerfMode     = "low" | "medium" | "high" | "xhigh";
type WorkflowMode = "Smarter" | "Lite" | "Autonomous" | "Max" | "Power" | "Turbo";

const PERF_DEFS: { id: PerfMode; label: string; color: string; desc: string; descEn: string }[] = [
  { id: "low",    label: "LOW",   color: "#4ade80", desc: "موفّر للطاقة",   descEn: "Power Saver"  },
  { id: "medium", label: "MED",   color: "#fbbf24", desc: "متوازن",         descEn: "Balanced"     },
  { id: "high",   label: "HIGH",  color: "#f97316", desc: "أداء عالٍ",      descEn: "High Perf"    },
  { id: "xhigh",  label: "XHIGH", color: "#e21227", desc: "الحد الأقصى",    descEn: "Extreme"      },
];
const WFLOW_DEFS: { id: WorkflowMode; color: string; desc: string; icon: string }[] = [
  { id: "Smarter",    color: "#6366f1", desc: "ذكاء متقدم",   icon: "◈" },
  { id: "Lite",       color: "#06b6d4", desc: "خفيف وسريع",   icon: "◇" },
  { id: "Autonomous", color: "#8b5cf6", desc: "مستقل",         icon: "◉" },
  { id: "Max",        color: "#e21227", desc: "أقصى قدرة",    icon: "◆" },
  { id: "Power",      color: "#f97316", desc: "طاقة عالية",   icon: "⬡" },
  { id: "Turbo",      color: "#fbbf24", desc: "توربو",         icon: "⬢" },
];
const LS_PERF  = "mr7-op-perf";
const LS_WFLOW = "mr7-op-wflow";

function OperationModeBtn3D() {
  const [perfMode,  setPerfMode]  = useState<PerfMode>(() =>
    (localStorage.getItem(LS_PERF) as PerfMode) || "medium");
  const [wflowMode, setWflowMode] = useState<WorkflowMode>(() =>
    (localStorage.getItem(LS_WFLOW) as WorkflowMode) || "Smarter");
  const [open, setOpen] = useState(false);

  const perf  = PERF_DEFS.find(p => p.id === perfMode)!;
  const wflow = WFLOW_DEFS.find(w => w.id === wflowMode)!;

  const savePerfMode  = (m: PerfMode)     => { setPerfMode(m);  localStorage.setItem(LS_PERF, m);  };
  const saveWflowMode = (m: WorkflowMode) => { setWflowMode(m); localStorage.setItem(LS_WFLOW, m); };

  return (
    <>
      {/* Trigger */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl relative overflow-hidden flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${perf.color}1a 0%, rgba(0,0,0,0.65) 100%)`,
          border: `1px solid ${perf.color}${open ? "66" : "30"}`,
          boxShadow: `0 0 18px ${perf.color}${open ? "40" : "18"}, inset 0 1px 0 ${perf.color}18`,
        }}
        whileHover={{ scale: 1.04, y: -0.5 }}
        whileTap={{ scale: 0.95 }}
        title={`وضع التشغيل — ${perf.label} · ${wflowMode}`}
        aria-label="أوضاع التشغيل"
      >
        <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none" style={{ borderColor: perf.color + "66" }} />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none" style={{ borderColor: perf.color + "66" }} />
        <motion.span className="absolute inset-y-0 pointer-events-none"
          style={{ width: 40, background: `linear-gradient(90deg,transparent,${perf.color}22,transparent)` }}
          animate={{ x: ["-100%", "400%"] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }} />
        <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: perf.color, boxShadow: `0 0 8px ${perf.color}` }}
          animate={{ opacity: [1, 0.25, 1], scale: [1, 1.4, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }} />
        <div className="flex flex-col items-start leading-none gap-0.5">
          <span className="text-[7px] font-black tracking-[0.25em] uppercase" style={{ color: perf.color + "99" }}>PERF</span>
          <span className="text-[9px] font-black tracking-wide" style={{ color: perf.color }}>{perf.label}</span>
        </div>
        <div className="w-px h-5 mx-0.5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="flex flex-col items-start leading-none gap-0.5">
          <span className="text-[7px] font-black tracking-[0.25em] uppercase hidden sm:block" style={{ color: wflow.color + "99" }}>FLOW</span>
          <span className="text-[9px] font-black tracking-wide hidden sm:block" style={{ color: wflow.color }}>{wflowMode.slice(0, 5).toUpperCase()}</span>
        </div>
      </motion.button>

      {/* Full-screen window overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[998]"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Window */}
            <motion.div
              className="fixed z-[999] rounded-2xl overflow-hidden"
              style={{
                top: "50%", left: "50%",
                width: "min(660px, 96vw)",
                background: "linear-gradient(160deg, rgba(5,3,14,0.99) 0%, rgba(3,2,10,0.99) 100%)",
                border: `1px solid ${perf.color}35`,
                boxShadow: `0 0 100px ${perf.color}20, 0 0 40px rgba(0,0,0,0.8), inset 0 1px 0 ${perf.color}18`,
              }}
              initial={{ opacity: 0, scale: 0.88, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1,    x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.90,    x: "-50%", y: "-50%" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Top glow line */}
              <div className="h-px w-full" style={{ background: `linear-gradient(90deg,transparent,${perf.color},rgba(255,255,255,0.3),${perf.color},transparent)` }} />

              {/* Animated scan beam across window */}
              <motion.div className="absolute inset-x-0 top-0 h-full pointer-events-none"
                style={{ background: `linear-gradient(180deg,${perf.color}06,transparent 40%)` }}
                animate={{ opacity: [0.6, 0.2, 0.6] }}
                transition={{ duration: 3, repeat: Infinity }} />

              {/* Corner brackets */}
              {[["top-2 left-2 border-t border-l","top"],["top-2 right-2 border-t border-r","top"],
                ["bottom-2 left-2 border-b border-l","bot"],["bottom-2 right-2 border-b border-r","bot"]].map(([cls], i) => (
                <span key={i} className={`absolute w-4 h-4 pointer-events-none ${cls}`} style={{ borderColor: perf.color + "60" }} />
              ))}

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 relative">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <motion.div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `${perf.color}18`, border: `1px solid ${perf.color}45` }}>
                      <motion.div className="w-3 h-3 rounded-full"
                        style={{ background: perf.color, boxShadow: `0 0 12px ${perf.color}` }}
                        animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity }} />
                    </motion.div>
                    <motion.div className="absolute inset-0 rounded-xl pointer-events-none"
                      animate={{ boxShadow: [`0 0 0px ${perf.color}00`, `0 0 16px ${perf.color}60`, `0 0 0px ${perf.color}00`] }}
                      transition={{ duration: 2, repeat: Infinity }} />
                  </div>
                  <div>
                    <div className="text-[9px] font-black tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>OPERATION CENTER</div>
                    <div className="text-[15px] font-black tracking-wide" style={{ color: perf.color }}>
                      {perf.label} · {wflowMode.toUpperCase()}
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-[14px] font-bold"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                  whileHover={{ background: "rgba(226,18,39,0.15)", borderColor: "rgba(226,18,39,0.4)", color: "#e21227" }}
                  whileTap={{ scale: 0.92 }}
                >×</motion.button>
              </div>

              <div className="mx-5 h-px" style={{ background: `linear-gradient(90deg,transparent,${perf.color}30,transparent)` }} />

              {/* Performance section */}
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[8px] font-black tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>PERFORMANCE LEVEL</div>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PERF_DEFS.map((p, idx) => {
                    const isActive = perfMode === p.id;
                    const barWidth = [25, 50, 75, 100][idx];
                    return (
                      <motion.button key={p.id}
                        onClick={() => savePerfMode(p.id)}
                        className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl relative overflow-hidden"
                        style={{
                          background: isActive ? `${p.color}14` : "rgba(255,255,255,0.025)",
                          border: `1px solid ${isActive ? p.color + "55" : "rgba(255,255,255,0.07)"}`,
                          boxShadow: isActive ? `0 0 24px ${p.color}28, inset 0 1px 0 ${p.color}20` : "none",
                        }}
                        whileHover={{ scale: 1.04, background: `${p.color}12` }}
                        whileTap={{ scale: 0.94 }}
                      >
                        {isActive && (
                          <motion.div className="absolute inset-x-0 top-0 h-px"
                            style={{ background: `linear-gradient(90deg,transparent,${p.color},transparent)` }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }} />
                        )}
                        {/* Bar visualizer */}
                        <div className="w-full flex items-end gap-0.5 h-7">
                          {[...Array(5)].map((_, bi) => {
                            const filled = bi < Math.ceil(barWidth / 20);
                            return (
                              <motion.div key={bi}
                                className="flex-1 rounded-sm"
                                style={{
                                  height: `${(bi + 1) * 20}%`,
                                  background: filled ? (isActive ? p.color : p.color + "60") : "rgba(255,255,255,0.06)",
                                  boxShadow: filled && isActive ? `0 0 6px ${p.color}80` : "none",
                                }}
                                animate={filled && isActive ? { opacity: [0.7, 1, 0.7] } : {}}
                                transition={{ duration: 1.2, delay: bi * 0.1, repeat: Infinity }} />
                            );
                          })}
                        </div>
                        <span className="text-[10px] font-black tracking-widest" style={{ color: isActive ? p.color : "rgba(255,255,255,0.35)" }}>{p.label}</span>
                        <span className="text-[8px] font-mono" style={{ color: isActive ? p.color + "aa" : "rgba(255,255,255,0.18)" }}>{p.descEn}</span>
                        {isActive && (
                          <motion.div className="w-1.5 h-1.5 rounded-full"
                            style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="mx-5 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

              {/* Workflow section */}
              <div className="px-5 pt-3 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[8px] font-black tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>WORKFLOW MODE</div>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {WFLOW_DEFS.map(w => {
                    const isActive = wflowMode === w.id;
                    return (
                      <motion.button key={w.id}
                        onClick={() => saveWflowMode(w.id)}
                        className="flex flex-col items-center gap-2 py-3.5 px-3 rounded-2xl relative overflow-hidden"
                        style={{
                          background: isActive ? `${w.color}14` : "rgba(255,255,255,0.025)",
                          border: `1px solid ${isActive ? w.color + "55" : "rgba(255,255,255,0.07)"}`,
                          boxShadow: isActive ? `0 0 20px ${w.color}28, inset 0 1px 0 ${w.color}20` : "none",
                        }}
                        whileHover={{ scale: 1.04, background: `${w.color}12` }}
                        whileTap={{ scale: 0.94 }}
                      >
                        {isActive && (
                          <motion.div className="absolute inset-x-0 top-0 h-px"
                            style={{ background: `linear-gradient(90deg,transparent,${w.color},transparent)` }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }} />
                        )}
                        <span className="text-[18px]" style={{ color: isActive ? w.color : "rgba(255,255,255,0.25)", filter: isActive ? `drop-shadow(0 0 6px ${w.color})` : "none" }}>{w.icon}</span>
                        <span className="text-[10px] font-black tracking-wide" style={{ color: isActive ? w.color : "rgba(255,255,255,0.5)" }}>{w.id}</span>
                        <span className="text-[8px] font-mono text-center" style={{ color: "rgba(255,255,255,0.2)" }}>{w.desc}</span>
                        {isActive && (
                          <motion.div className="w-1.5 h-1.5 rounded-full"
                            style={{ background: w.color, boxShadow: `0 0 6px ${w.color}` }}
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Status footer */}
              <div className="px-5 py-2.5 flex items-center justify-between" style={{ background: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: perf.color }}
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                    <span className="text-[9px] font-mono font-bold" style={{ color: perf.color }}>{perf.label}</span>
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                  <div className="flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: wflow.color }}
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
                    <span className="text-[9px] font-mono font-bold" style={{ color: wflow.color }}>{wflowMode}</span>
                  </div>
                </div>
                <span className="text-[7.5px] font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.15)" }}>OPERATION · CENTER</span>
              </div>

              <div className="h-px w-full" style={{ background: `linear-gradient(90deg,transparent,${perf.color}40,transparent)` }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Holographic HUD toolbar button ────────────────────────────────────────────
function HUDBtn({
  icon: Icon, label, color, onClick, badge, shortLabel, title: tip, active, iconOnly,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  onClick: () => void;
  badge?: string;
  shortLabel?: string;
  title?: string;
  active?: boolean;
  iconOnly?: boolean;
}) {
  const compact = useContext(CompactCtx);
  const isIconOnly = compact || iconOnly;
  return (
    <motion.button
      onClick={onClick}
      title={tip ?? label}
      aria-label={label}
      className="flex-shrink-0 flex items-center gap-1.5 rounded-lg relative overflow-hidden whitespace-nowrap"
      style={{
        padding: isIconOnly ? "6px 8px" : "6px 10px 6px 8px",
        background: active
          ? `linear-gradient(135deg, ${color}28 0%, ${color}10 100%)`
          : `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`,
        border: active ? `1px solid ${color}80` : `1px solid ${color}35`,
        color: color,
        boxShadow: active
          ? `0 0 18px ${color}50, 0 2px 12px ${color}22, inset 0 1px 0 ${color}28`
          : `inset 0 1px 0 ${color}10`,
        transform: "translateZ(0)",
        willChange: "transform",
      }}
      whileHover={{
        scale: 1.06, y: -1.5,
        boxShadow: `0 6px 28px ${color}35, 0 0 18px ${color}25, inset 0 1px 0 ${color}30`,
        backgroundColor: `${color}1e`,
        borderColor: `${color}70`,
      }}
      whileTap={{ scale: 0.93, y: 0 }}
      transition={{ type: "spring", stiffness: 600, damping: 25 }}
    >
      {/* Shimmer sweep on hover */}
      <motion.span className="absolute inset-y-0 pointer-events-none"
        style={{ width: 32, background: `linear-gradient(90deg,transparent,${color}22,transparent)`, left: "-100%" }}
        whileHover={{ left: "200%" }}
        transition={{ duration: 0.45, ease: "easeOut" }} />
      {/* Active pulse line */}
      {active && (
        <motion.span className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }}
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
      )}
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
      {!isIconOnly && (
        <span className="hidden sm:block text-[10px] font-black tracking-wide uppercase">
          {shortLabel ?? label}
        </span>
      )}
      {!isIconOnly && badge && (
        <span className="hidden sm:block text-[7px] font-black px-1 py-0.5 rounded"
          style={{ background: `${color}28`, color: color, border: `1px solid ${color}45`, boxShadow: `0 0 6px ${color}30` }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

// ── Vertical divider between button groups ─────────────────────────────────────
function VDivider() {
  return (
    <div className="flex-shrink-0 w-px mx-1 self-stretch my-1.5"
      style={{ background: "linear-gradient(180deg, transparent, rgba(226,18,39,0.25), transparent)" }} />
  );
}

// ── Model selector 3D — External floating window ──────────────────────────────
function ModelSelector3D({
  onOpenPricing,
}: {
  onOpenPricing: () => void;
}) {
  const { state, dispatch } = useStore();
  const { t } = useT();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [modelOff, setModelOff] = useState(() => localStorage.getItem("mr7-model-off") === "1");

  function openWindow() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 346) });
    }
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const active = getModel(state.activeModel);
  const ActiveIcon = active.icon;
  const filtered = AI_MODELS.filter(m =>
    m.id.toLowerCase().includes(q.toLowerCase()) ||
    m.desc.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <motion.button
        ref={btnRef}
        onClick={openWindow}
        aria-label={`${t("top.switchModel")} — ${active.id}`}
        className="flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-xl relative overflow-hidden"
        style={{
          background: open
            ? "linear-gradient(135deg,rgba(226,18,39,0.16) 0%,rgba(20,8,8,0.96) 100%)"
            : "linear-gradient(135deg,rgba(226,18,39,0.08) 0%,rgba(12,8,8,0.92) 100%)",
          border: `1px solid rgba(226,18,39,${open ? 0.6 : 0.24})`,
          boxShadow: open
            ? "0 0 28px rgba(226,18,39,0.25), inset 0 1px 0 rgba(226,18,39,0.18)"
            : "0 0 10px rgba(226,18,39,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
        whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(226,18,39,0.2)" }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.6)" }} />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.6)" }} />

        <span className="relative flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
          style={{ background: "rgba(226,18,39,0.14)", border: "1px solid rgba(226,18,39,0.3)", boxShadow: "0 0 10px rgba(226,18,39,0.25)" }}>
          <ActiveIcon className={`w-3.5 h-3.5 ${active.color}`} />
          <motion.span className="absolute inset-0 rounded-lg pointer-events-none"
            animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ border: "1px solid rgba(226,18,39,0.4)" }} />
        </span>

        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span className="text-[7px] font-black tracking-[0.2em] uppercase" style={{ color: "rgba(226,18,39,0.55)" }}>MODEL</span>
          <span className="text-[11px] font-black max-w-[120px] truncate" style={{ color: "rgba(255,255,255,0.92)" }}>{active.id}</span>
        </div>

        <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"
          style={{ color: "rgba(226,18,39,0.55)" }}
          animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </motion.button>

      {/* EXTERNAL floating window — fixed position, outside TopBar DOM */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-[1996]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}
              onClick={() => setOpen(false)} />

            <motion.div
              className="fixed z-[1997] rounded-2xl overflow-hidden"
              style={{
                top: pos.top, left: pos.left,
                width: 338,
                maxHeight: "min(76vh, 600px)",
                background: "linear-gradient(160deg, rgba(6,4,14,0.99) 0%, rgba(4,2,10,0.99) 100%)",
                border: "1px solid rgba(226,18,39,0.28)",
                boxShadow: "0 0 80px rgba(226,18,39,0.14), 0 24px 80px rgba(0,0,0,0.92), inset 0 1px 0 rgba(226,18,39,0.12)",
              }}
              initial={{ opacity: 0, scale: 0.92, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,#e21227,rgba(255,100,100,0.5),transparent)" }} />
              {/* Scan sweep */}
              <motion.div className="absolute inset-x-0 top-0 h-full pointer-events-none"
                style={{ background: "linear-gradient(180deg,rgba(226,18,39,0.04),transparent 35%)" }}
                animate={{ opacity: [0.7, 0.3, 0.7] }} transition={{ duration: 3, repeat: Infinity }} />
              {/* Corner brackets */}
              {[["top-2 left-2 border-t border-l"],["top-2 right-2 border-t border-r"],["bottom-2 left-2 border-b border-l"],["bottom-2 right-2 border-b border-r"]].map(([cls], i) => (
                <span key={i} className={`absolute w-3 h-3 pointer-events-none ${cls}`} style={{ borderColor: "rgba(226,18,39,0.45)" }} />
              ))}

              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <div className="text-[8px] font-black tracking-[0.5em] uppercase" style={{ color: "rgba(226,18,39,0.5)" }}>AI MODEL SELECT</div>
                  {/* OFF toggle button */}
                  <motion.button
                    onClick={() => {
                      const next = !modelOff;
                      setModelOff(next);
                      localStorage.setItem("mr7-model-off", next ? "1" : "0");
                      toast({ description: next ? "AI Model disabled — responses paused." : "AI Model enabled." });
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black tracking-widest relative overflow-hidden"
                    style={{
                      background: modelOff ? "rgba(255,45,85,0.18)" : "rgba(34,197,94,0.12)",
                      border: `1px solid ${modelOff ? "rgba(255,45,85,0.5)" : "rgba(34,197,94,0.4)"}`,
                      color: modelOff ? "#ff2d55" : "#22c55e",
                      boxShadow: modelOff ? "0 0 12px rgba(255,45,85,0.3), inset 0 0 8px rgba(255,45,85,0.1)" : "0 0 10px rgba(34,197,94,0.25), inset 0 0 6px rgba(34,197,94,0.08)",
                    }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    title={modelOff ? "Click to enable AI Model" : "Click to disable AI Model"}
                  >
                    {/* Power icon */}
                    <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="w-2.5 h-2.5"
                      animate={modelOff ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
                      transition={{ duration: 1.2, repeat: modelOff ? Infinity : 0 }}
                    >
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                    </motion.svg>
                    {modelOff ? "OFF" : "ON"}
                    {/* Shimmer sweep */}
                    <motion.span className="absolute inset-y-0 w-6 pointer-events-none"
                      style={{ background: `linear-gradient(90deg,transparent,${modelOff ? "rgba(255,45,85,0.3)" : "rgba(34,197,94,0.3)"},transparent)` }}
                      animate={{ x: ["-150%", "250%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }} />
                  </motion.button>
                </div>
                <motion.button onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[12px]"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
                  whileHover={{ background: "rgba(226,18,39,0.12)", color: "#e21227" }}>×</motion.button>
              </div>
              {/* Model disabled overlay banner */}
              {modelOff && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mx-3 mb-2 rounded-xl flex items-center gap-2 px-3 py-2"
                  style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", boxShadow: "0 0 20px rgba(255,45,85,0.1)" }}
                >
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                    </svg>
                  </motion.div>
                  <div>
                    <p className="text-[10px] font-black tracking-widest" style={{ color: "#ff2d55" }}>AI MODEL DISABLED</p>
                    <p className="text-[8px] text-muted-foreground/60 font-mono">All responses are paused · Click ON to resume</p>
                  </div>
                </motion.div>
              )}

              {/* Search */}
              <div className="px-3 pb-2" style={{ borderBottom: "1px solid rgba(226,18,39,0.08)" }}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "rgba(226,18,39,0.5)" }} />
                  <input
                    autoFocus
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder={t("top.searchModels")}
                    className="w-full rounded-lg pl-7 pr-3 py-1.5 text-[11px] outline-none"
                    style={{ background: "rgba(226,18,39,0.06)", border: "1px solid rgba(226,18,39,0.2)", color: "rgba(255,255,255,0.85)" }}
                  />
                </div>
              </div>

              {/* Model list */}
              <div className="p-1.5 overflow-y-auto space-y-0.5"
                style={{ maxHeight: "min(55vh, 440px)", scrollbarWidth: "thin", scrollbarColor: "rgba(226,18,39,0.3) transparent" }}>
                {filtered.map(m => {
                  const Icon = m.icon;
                  const isFree = m.id === "CHAT-GPT Fast";
                  const locked = !isFree && !tierAtLeast(state.subscription.tier, "starter");
                  const isActive = state.activeModel === m.id;
                  return (
                    <motion.button
                      key={m.id}
                      onClick={() => {
                        if (locked) { toast({ description: `${m.id} requires Starter plan.` }); setOpen(false); onOpenPricing(); return; }
                        dispatch({ type: "SET_MODEL", model: m.id });
                        setOpen(false);
                      }}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left relative overflow-hidden"
                      style={{
                        background: isActive ? "rgba(226,18,39,0.1)" : "transparent",
                        border: `1px solid ${isActive ? "rgba(226,18,39,0.3)" : "transparent"}`,
                        opacity: locked ? 0.55 : 1,
                      }}
                      whileHover={{ background: "rgba(226,18,39,0.07)", borderColor: "rgba(226,18,39,0.15)" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.2)" }}>
                        {locked ? <Lock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} /> : <Icon className={`w-4 h-4 ${m.color}`} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12px] font-bold truncate" style={{ color: isActive ? "#e21227" : "rgba(255,255,255,0.88)" }}>{m.id}</span>
                          {m.badge && !locked && (
                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(226,18,39,0.18)", color: "#e21227", border: "1px solid rgba(226,18,39,0.3)" }}>{m.badge}</span>
                          )}
                          {locked && (
                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>STARTER+</span>
                          )}
                        </div>
                        <span className="block text-[10px] leading-snug mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{m.desc}</span>
                      </div>
                      {isActive && (
                        <motion.span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0"
                          style={{ background: "#e21227", boxShadow: "0 0 6px #e21227" }}
                          animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      )}
                    </motion.button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-center py-6 text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{t("toolsHub.noResults", { q })}</p>
                )}
              </div>

              {/* Footer */}
              <div style={{ borderTop: "1px solid rgba(226,18,39,0.1)" }}>
                <motion.button onClick={() => { onOpenPricing(); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold"
                  style={{ color: "#e21227" }}
                  whileHover={{ background: "rgba(226,18,39,0.06)" }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("top.getMoreTokens")}
                </motion.button>
              </div>
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.4),transparent)" }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Pinned Shortcuts Bar ──────────────────────────────────────────────────────
const SHORTCUT_DEFS = [
  { id: "new-chat",  label: "New Chat",  color: "#e21227", icon: "+" },
  { id: "arsenal",   label: "Arsenal",   color: "#e21227", icon: "A" },
  { id: "agent",     label: "Agent",     color: "#ff6644", icon: "G" },
  { id: "cisa",      label: "CISA KEV",  color: "#10b981", icon: "K" },
  { id: "warroom",   label: "War Room",  color: "#00e5ff", icon: "W" },
  { id: "nexus",     label: "NEXUS",     color: "#a78bfa", icon: "N" },
  { id: "offense",   label: "Offense",   color: "#f97316", icon: "O" },
  { id: "hierarchy", label: "Hierarchy", color: "#fbbf24", icon: "H" },
  { id: "cogwar",    label: "Cog War",   color: "#8b5cf6", icon: "C" },
  { id: "graph",     label: "Atk Graph", color: "#10b981", icon: "Gr" },
] as const;

type ShortcutId = typeof SHORTCUT_DEFS[number]["id"];
const LS_KEY = "mr7-pinned-shortcuts";
const DEFAULT_PINNED: ShortcutId[] = ["new-chat","arsenal","agent","cisa","warroom","nexus"];

interface PinnedShortcutsBarProps {
  onOpenArsenal: () => void;
  onOpenAgent: () => void;
  onOpenNexus: () => void;
  onOpenWarRoom: () => void;
  onOpenCisaLive: () => void;
  onOpenCyberHierarchy: () => void;
  onOpenCognitiveWarfare: () => void;
  onOpenAutonomousOffense: () => void;
  onOpenAttackGraph: () => void;
}

function PinnedShortcutsBar({
  onOpenArsenal, onOpenAgent, onOpenNexus, onOpenWarRoom, onOpenCisaLive,
  onOpenCyberHierarchy, onOpenCognitiveWarfare, onOpenAutonomousOffense,
  onOpenAttackGraph,
}: PinnedShortcutsBarProps) {
  const { dispatch } = useStore();
  const [pinned, setPinned] = useState<ShortcutId[]>(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      return s ? (JSON.parse(s) as ShortcutId[]) : DEFAULT_PINNED;
    } catch { return DEFAULT_PINNED; }
  });
  const [addOpen, setAddOpen] = useState(false);

  const savePinned = (next: ShortcutId[]) => {
    setPinned(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const actionMap: Record<ShortcutId, () => void> = {
    "new-chat":  () => dispatch({ type: "NEW_CHAT" }),
    "arsenal":   onOpenArsenal,
    "agent":     onOpenAgent,
    "cisa":      onOpenCisaLive,
    "warroom":   onOpenWarRoom,
    "nexus":     onOpenNexus,
    "offense":   onOpenAutonomousOffense,
    "hierarchy": onOpenCyberHierarchy,
    "cogwar":    onOpenCognitiveWarfare,
    "graph":     onOpenAttackGraph,
  };

  return (
    <div className="relative flex items-center gap-1 px-2 overflow-x-auto"
      style={{
        height: 28,
        background: "rgba(4,3,9,0.98)",
        borderTop: "1px solid rgba(255,255,255,0.03)",
        scrollbarWidth: "none",
      }}>
      {/* Left scan glow */}
      <div className="absolute inset-y-0 left-0 w-3 pointer-events-none z-10"
        style={{ background: "linear-gradient(90deg,rgba(226,18,39,0.12),transparent)" }} />

      {pinned.map(id => {
        const def = SHORTCUT_DEFS.find(d => d.id === id);
        if (!def) return null;
        return (
          <motion.button
            key={id}
            onClick={actionMap[id]}
            onContextMenu={e => { e.preventDefault(); savePinned(pinned.filter(p => p !== id)); }}
            className="flex-shrink-0 flex items-center gap-1 px-2 rounded text-[7.5px] font-bold tracking-wide whitespace-nowrap"
            style={{
              height: 18,
              color: def.color,
              background: def.color + "14",
              border: `1px solid ${def.color}28`,
            }}
            whileHover={{ background: def.color + "26", scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            title={`${def.label} (右键取消固定)`}
          >
            <span className="font-black" style={{ fontSize: 7, opacity: 0.8 }}>{def.icon}</span>
            {def.label}
          </motion.button>
        );
      })}

      {/* Add button */}
      <div className="relative flex-shrink-0">
        <motion.button
          onClick={() => setAddOpen(o => !o)}
          className="flex items-center justify-center rounded"
          style={{
            width: 18, height: 18,
            color: "rgba(255,255,255,0.3)",
            border: "1px dashed rgba(255,255,255,0.12)",
            fontSize: 10,
          }}
          whileHover={{ color: "#e21227", borderColor: "rgba(226,18,39,0.4)", background: "rgba(226,18,39,0.08)" }}
          whileTap={{ scale: 0.92 }}
          title="إضافة اختصار مثبّت"
        >+</motion.button>
        <AnimatePresence>
          {addOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              className="absolute top-6 left-0 z-50 rounded-xl overflow-hidden"
              style={{
                width: 160,
                background: "rgba(10,8,20,0.98)",
                border: "1px solid rgba(226,18,39,0.25)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.8), 0 0 16px rgba(226,18,39,0.08)",
              }}
            >
              <div className="px-3 py-1.5 text-[7px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.28)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                اختصارات مثبّتة
              </div>
              {SHORTCUT_DEFS.map(def => {
                const isPinned = pinned.includes(def.id);
                return (
                  <button key={def.id}
                    onClick={() => {
                      const next = isPinned
                        ? pinned.filter(p => p !== def.id)
                        : [...pinned, def.id];
                      savePinned(next);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold text-left transition-all"
                    style={{
                      color: isPinned ? def.color : "rgba(255,255,255,0.5)",
                      background: isPinned ? def.color + "10" : "transparent",
                    }}
                  >
                    <span className="w-3.5 h-3.5 flex items-center justify-center rounded text-[7px] font-black flex-shrink-0"
                      style={{ background: def.color + "20", color: def.color }}>
                      {def.icon}
                    </span>
                    {def.label}
                    {isPinned && <span className="ml-auto text-[7px]" style={{ color: def.color }}>✓</span>}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right fade */}
      <div className="absolute inset-y-0 right-0 w-4 pointer-events-none z-10"
        style={{ background: "linear-gradient(270deg,rgba(4,3,9,1),transparent)" }} />
    </div>
  );
}

// ── Main TopBar ───────────────────────────────────────────────────────────────
export function TopBar({
  onMenuClick, onOpenPricing, onOpenToolsHub, onOpenHelp, onOpenPersonaEditor, onOpenPersonaManager,
  onOpenLocalModel, onOpenAgent, onOpenNexus, onOpenArsenal, onOpenProviderSettings,
  onOpenModelCompare, onOpenNeuralMatrix, onOpenAnalytics, onOpenWarRoom,
  onOpenDeepSearch, onOpenChainInvestigation, onOpenRedTeam, onOpenPerfDash,
  onOpenCostDash, onOpenDedupViz, onOpenThreatFeed, onOpenSecurityDash,
  onOpenContextMemory, onOpenPrefetch, onOpenMasterHud, onOpenAnomalyLog,
  onOpenNetworkTopo, onOpenCyberHub, onOpenWidgetsDock, onOpenCisaLive, onOpenCveTimeline,
  onOpenThreatMap, onOpenCveTracker, onOpenLiveOps,
  onOpenCyberHierarchy, onOpenCognitiveWarfare, onOpenAutonomousOffense, onOpenAttackGraph,
  onOpenAutonomousDecisionEngine,
  onOpenJARVISCommandCenter,
  onOpenOmegaAgent,
  hudsVisible,
  sidebarCollapsed,
  onToggleSidebar,
}: TopBarProps) {
  const { state, dispatch } = useStore();
  const { t } = useT();
  const { toast } = useToast();
  const powerOn = state.settings.powerMode;

  const scrollRef  = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function checkScroll() {
    const el = scrollRef.current; if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll); ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, []);
  function scrollBy(d: number) { scrollRef.current?.scrollBy({ left: d, behavior: "smooth" }); }

  function togglePower() {
    const next = !powerOn;
    dispatch({ type: "SET_SETTINGS", patch: { powerMode: next } });
    toast({ description: t(next ? "power.activated" : "power.deactivated") });
  }

  const [compact, setCompact] = useState(() => localStorage.getItem("mr7-topbar-compact") === "1");
  function toggleCompact() {
    setCompact(c => {
      const next = !c;
      localStorage.setItem("mr7-topbar-compact", next ? "1" : "0");
      return next;
    });
  }

  return (
    <CompactCtx.Provider value={compact}>
    <motion.header
      className="CHAT-GPT-topbar sticky top-0 z-30 flex flex-col"
      style={{
        background: "linear-gradient(180deg, rgba(8,6,14,0.99) 0%, rgba(6,4,10,0.98) 100%)",
        borderBottom: `1px solid rgba(226,18,39,${powerOn ? 0.5 : 0.18})`,
        boxShadow: powerOn
          ? "0 1px 0 rgba(226,18,39,0.4), 0 4px 40px rgba(0,0,0,0.7), 0 0 60px rgba(226,18,39,0.12)"
          : "0 1px 0 rgba(226,18,39,0.14), 0 4px 40px rgba(0,0,0,0.6)",
        backdropFilter: "blur(24px)",
        transition: "box-shadow 0.4s, border-color 0.4s",
      }}
    >
      {/* ── Main row (h-14) — single scrollable strip ───────────────── */}
      <div className="h-14 flex items-center px-1 relative overflow-hidden">

      {/* 3D HUD canvas background */}
      <TopBarHUDCanvas powerOn={powerOn} />

      {/* Bottom animated neon line */}
      <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(226,18,39,0.5) 20%, rgba(255,80,80,0.35) 50%, rgba(226,18,39,0.5) 80%, transparent 100%)" }} />

      {/* Travelling bottom streak */}
      <div className="absolute bottom-0 h-px pointer-events-none"
        style={{
          left: "-30%", width: "30%",
          background: "linear-gradient(90deg, transparent, rgba(255,80,80,0.7), #e21227, rgba(255,80,80,0.7), transparent)",
          animation: "topbar-travel 3.5s linear infinite",
        }} />

      {/* ── LEFT scroll arrow — outside scrollable zone ──────────── */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            onClick={() => scrollBy(-220)}
            className="flex-shrink-0 p-1 rounded-lg z-20 relative"
            style={{ color: "rgba(226,18,39,0.8)", background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)" }}
            whileHover={{ background: "rgba(226,18,39,0.2)" }}
            aria-label="تمرير لليسار"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── SINGLE SCROLLABLE STRIP — left + center + right ─────── */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto relative z-10 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {/* Mobile hamburger */}
        <motion.button
          onClick={onMenuClick}
          className="p-2 md:hidden rounded-lg flex-shrink-0"
          style={{ color: "rgba(255,255,255,0.45)" }}
          whileHover={{ color: "#e21227", background: "rgba(226,18,39,0.1)" }}
          whileTap={{ scale: 0.92 }}
          aria-label={t("top.openMenu")}
        >
          <Menu className="w-5 h-5" />
        </motion.button>

        {/* Desktop sidebar collapse toggle */}
        {onToggleSidebar && (
          <motion.button
            onClick={onToggleSidebar}
            className="hidden md:flex p-2 rounded-lg relative overflow-hidden flex-shrink-0"
            style={{
              color: sidebarCollapsed ? "#e21227" : "rgba(255,255,255,0.42)",
              background: sidebarCollapsed ? "rgba(226,18,39,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${sidebarCollapsed ? "rgba(226,18,39,0.40)" : "rgba(255,255,255,0.09)"}`,
              boxShadow: sidebarCollapsed ? "0 0 14px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
            }}
            whileHover={{ color: "#e21227", background: "rgba(226,18,39,0.14)", borderColor: "rgba(226,18,39,0.45)", scale: 1.06 }}
            whileTap={{ scale: 0.90 }}
            aria-label={sidebarCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {sidebarCollapsed && (
              <motion.span className="absolute inset-0 rounded-lg pointer-events-none"
                animate={{ opacity: [0.4, 0, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                style={{ border: "1px solid rgba(226,18,39,0.6)" }} />
            )}
          </motion.button>
        )}

        {/* Model selector */}
        <ModelSelector3D onOpenPricing={onOpenPricing} />

        {/* Operation Mode Button */}
        <OperationModeBtn3D />

        <VDivider />

        {/* ── CENTER: 4 futuristic 3D holographic buttons ──────────── */}
        <div className="flex-shrink-0 relative flex items-center" style={{ padding: "2px 0" }}>
          {/* Holographic panel glow */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(226,18,39,0.04) 0%, rgba(139,92,246,0.04) 50%, rgba(0,229,255,0.04) 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 20px rgba(226,18,39,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
            }} />
          {/* Top corner brackets */}
          <span className="absolute top-0.5 left-1 w-2.5 h-2.5 border-t border-l pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.45)" }} />
          <span className="absolute top-0.5 right-1 w-2.5 h-2.5 border-t border-r pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.45)" }} />
          <span className="absolute bottom-0.5 left-1 w-2.5 h-2.5 border-b border-l pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.3)" }} />
          <span className="absolute bottom-0.5 right-1 w-2.5 h-2.5 border-b border-r pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.3)" }} />
          {/* Scan sweep */}
          <motion.div className="absolute inset-y-0 w-8 pointer-events-none rounded-2xl"
            style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.08),transparent)" }}
            animate={{ x: ["-100%", "500%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />

          <div className="flex items-center gap-1.5 px-2 relative z-10">
            <ProviderHealthBadge3D />
            <AIQuickSetupButton />
            <QuantumPersona3D onOpenPersonaManager={onOpenPersonaManager} />
            <PersonaSwitcher3D onOpenPersonaEditor={onOpenPersonaEditor} onOpenPersonaManager={onOpenPersonaManager} />
          </div>
        </div>

        <VDivider />

        {/* ── RIGHT toolbar buttons — now inline in the single strip ── */}
        {/* ── GROUP 1 — Core ──────────────────────────────────────────── */}
        <HUDBtn icon={LayoutGrid} label={t("top.toolsHub")} shortLabel={t("top.tools")} color="#10b981" onClick={onOpenToolsHub} />
        <HUDBtn icon={Bot} label="KaliAgent" color="#ff4d4d" onClick={onOpenAgent} iconOnly />
        <HUDBtn icon={Hexagon}   label="NEXUS"      color="#fbbf24" onClick={onOpenNexus}   badge="5X" />
        <HUDBtn icon={Shield}    label="Arsenal"    color="#e21227" onClick={onOpenArsenal} />
        <VDivider />

        {/* ── GROUP 2 — Ops ───────────────────────────────────────────── */}
        {onOpenWarRoom              && <HUDBtn icon={Target}      label="War Room"     color="#e21227" onClick={onOpenWarRoom} />}
        {onOpenDeepSearch           && <HUDBtn icon={Search}      label="Deep Search"  color="#f97316" onClick={onOpenDeepSearch} />}
        {onOpenChainInvestigation   && <HUDBtn icon={GitBranch}   label="Chain Intel"  color="#8b5cf6" onClick={onOpenChainInvestigation} />}
        {onOpenRedTeam              && <HUDBtn icon={Bug}         label="Red Team"     color="#e21227" onClick={onOpenRedTeam} badge="!" />}
        {onOpenCognitiveWarfare     && <HUDBtn icon={BrainCircuit}label="Cog. Warfare" color="#8b5cf6" onClick={onOpenCognitiveWarfare} />}
        {onOpenAutonomousOffense    && <HUDBtn icon={Flame}       label="Offense"      color="#f97316" onClick={onOpenAutonomousOffense} />}
        {onOpenAttackGraph          && <HUDBtn icon={Share2}      label="Atk. Graph"   color="#10b981" onClick={onOpenAttackGraph} />}
        {onOpenAutonomousDecisionEngine && <HUDBtn icon={BrainCircuit} label="AI Engine" shortLabel="ADE" color="#8b5cf6" onClick={onOpenAutonomousDecisionEngine} badge="NEW" />}
        {onOpenJARVISCommandCenter && <HUDBtn icon={Bot} label="JARVIS" shortLabel="JRV" color="#00d4ff" onClick={onOpenJARVISCommandCenter} badge="NEW" />}
        {(onOpenWarRoom || onOpenDeepSearch || onOpenChainInvestigation || onOpenRedTeam || onOpenCognitiveWarfare || onOpenAutonomousOffense || onOpenAttackGraph || onOpenAutonomousDecisionEngine || onOpenJARVISCommandCenter) && <VDivider />}

        {/* ── GROUP 3 — Analytics & Intelligence ─────────────────────── */}
        {onOpenNeuralMatrix && <HUDBtn icon={Crosshair}   label="Neural Matrix" color="#e21227"  onClick={onOpenNeuralMatrix} />}
        {onOpenModelCompare && <HUDBtn icon={Columns3}    label="Compare"       color="#818cf8"  onClick={onOpenModelCompare} />}
        {onOpenAnalytics    && <HUDBtn icon={BarChart2}   label="Analytics"     color="#3b82f6"  onClick={onOpenAnalytics} />}
        {onOpenPerfDash     && <HUDBtn icon={Activity}    label="Perf"          color="#e21227"  onClick={onOpenPerfDash} />}
        {onOpenCostDash     && <HUDBtn icon={DollarSign}  label="Cost"          color="#22c55e"  onClick={onOpenCostDash} />}
        {(onOpenNeuralMatrix || onOpenModelCompare || onOpenAnalytics || onOpenPerfDash || onOpenCostDash) && <VDivider />}

        {/* ── GROUP 4 — Cyber Intel ────────────────────────────────────── */}
        {onOpenCisaLive       && <HUDBtn icon={ShieldAlert}  label="CISA Live"    color="#e21227" onClick={onOpenCisaLive} />}
        {onOpenCveTimeline    && <HUDBtn icon={BarChart2}    label="CVE Timeline" color="#f97316" onClick={onOpenCveTimeline} />}
        {onOpenThreatMap      && <HUDBtn icon={Globe}        label="Threat Map"   color="#00e5ff" onClick={onOpenThreatMap}   badge="3D" />}
        {onOpenCveTracker     && <HUDBtn icon={ShieldAlert}  label="CVE Intel"    color="#e21227" onClick={onOpenCveTracker} />}
        {onOpenLiveOps        && <HUDBtn icon={Activity}     label="Live Ops"     color="#8b5cf6" onClick={onOpenLiveOps} />}
        {onOpenCyberHierarchy && <HUDBtn icon={Cpu}          label="Cyber Hier."  color="#00ff41" onClick={onOpenCyberHierarchy} />}
        {onOpenDedupViz       && <HUDBtn icon={GitMerge}     label="Dedup"        color="#a78bfa" onClick={onOpenDedupViz} />}
        {onOpenThreatFeed     && <HUDBtn icon={ShieldAlert}  label="Threat Feed"  color="#e21227" onClick={onOpenThreatFeed} />}
        {onOpenSecurityDash   && <HUDBtn icon={ShieldCheck}  label="Security"     color="#00e5ff" onClick={onOpenSecurityDash} />}
        {onOpenContextMemory  && <HUDBtn icon={BrainCircuit} label="Memory"       color="#a78bfa" onClick={onOpenContextMemory} />}
        {onOpenAnomalyLog     && <HUDBtn icon={AlertTriangle}label="Anomaly"      color="#e21227" onClick={onOpenAnomalyLog} />}
        {onOpenNetworkTopo    && <HUDBtn icon={Network}      label="NET·HUD"      color="#3b82f6" onClick={onOpenNetworkTopo} active={hudsVisible} />}
        {onOpenPrefetch       && <HUDBtn icon={Gauge}        label="Prefetch"     color="#fbbf24" onClick={onOpenPrefetch} />}
        {onOpenMasterHud      && <HUDBtn icon={Globe}        label="HUD"          color="#22c55e" onClick={onOpenMasterHud} />}
        {onOpenCyberHub       && <HUDBtn icon={Zap}          label="Cyber Hub"    color="#e21227" onClick={onOpenCyberHub} badge="3D" />}
        {onOpenWidgetsDock    && <HUDBtn icon={Gauge}        label="Widgets HUD"  color="#06b6d4" onClick={onOpenWidgetsDock} badge="6P" />}
        {(onOpenCisaLive || onOpenCveTimeline || onOpenCyberHierarchy || onOpenThreatFeed) && <VDivider />}

        {/* ── GROUP 5 — System ────────────────────────────────────────── */}
        {onOpenProviderSettings && (
          <motion.button
            onClick={onOpenProviderSettings}
            className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "rgba(167,139,250,0.85)" }}
            whileHover={{ scale: 1.04, background: "rgba(139,92,246,0.15)", borderColor: "rgba(139,92,246,0.5)" }}
            whileTap={{ scale: 0.96 }}
            title="إعدادات المزوّد"
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(167,139,250,0.9)", boxShadow: "0 0 6px rgba(139,92,246,0.8)" }} />
            <span className="hidden sm:block text-[10px] font-black tracking-wider uppercase">
              {(state.activeProvider ?? "personal").slice(0, 8)}
            </span>
            {state.activeProviderModel && (
              <span className="hidden md:block text-[9px] font-mono" style={{ color: "rgba(167,139,250,0.45)" }}>
                /{state.activeProviderModel.split("/").pop()?.slice(0, 10)}
              </span>
            )}
          </motion.button>
        )}

        <LocalModelQuickToggle onOpenLocalModel={onOpenLocalModel} />

        <motion.button
          onClick={togglePower}
          className="flex-shrink-0 flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg"
          style={powerOn ? {
            background: "rgba(226,18,39,0.18)", border: "1px solid rgba(226,18,39,0.65)", color: "#e21227",
            boxShadow: "0 0 20px rgba(226,18,39,0.5), 0 0 40px rgba(226,18,39,0.18)",
          } : {
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(200,210,230,0.65)",
          }}
          whileHover={{ scale: 1.05, y: -0.5 }} whileTap={{ scale: 0.94 }}
          aria-label={t("power.title")} title={t(powerOn ? "power.tooltipOn" : "power.tooltipOff")}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        >
          <motion.div animate={powerOn ? { rotate: [0, 5, -5, 0] } : {}} transition={{ duration: 3, repeat: Infinity }}>
            <Zap className={`w-3.5 h-3.5 ${powerOn ? "fill-current" : ""}`} />
          </motion.div>
          <span className="hidden sm:block text-[10px] font-black tracking-widest uppercase">{t("power.title")}</span>
          {powerOn && (
            <motion.span className="text-[7px] font-black px-1 py-0.5 rounded"
              style={{ background: "rgba(226,18,39,0.3)", color: "#ff5577" }}
              animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
              ON
            </motion.span>
          )}
        </motion.button>

        <motion.button
          onClick={onOpenPricing}
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-white text-[10px] font-black tracking-wide"
          style={{
            background: "linear-gradient(135deg,#d946ef 0%,#8b5cf6 50%,#6366f1 100%)",
            boxShadow: "0 0 20px rgba(217,70,239,0.35), 0 0 40px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
          whileHover={{ scale: 1.05, y: -0.5, boxShadow: "0 0 28px rgba(217,70,239,0.5), 0 0 50px rgba(139,92,246,0.25)" }}
          whileTap={{ scale: 0.95 }}
          aria-label={t("top.buyTokens")} title={t("top.buyTokens")}
        >
          <Coins className="w-3.5 h-3.5" />
          <span className="hidden sm:block">{t("top.buyTokens")}</span>
        </motion.button>

        <motion.button
          onClick={onOpenHelp}
          className="flex-shrink-0 hidden sm:flex p-2 rounded-lg"
          style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
          whileHover={{ color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.06)", scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          aria-label={t("top.shortcuts")} title={t("top.shortcuts")}
        >
          <HelpCircle className="w-4 h-4" />
        </motion.button>

        <motion.button
          onClick={toggleCompact}
          className="flex-shrink-0 p-2 rounded-lg"
          style={{
            color: compact ? "#00e5ff" : "rgba(255,255,255,0.3)",
            background: compact ? "rgba(0,229,255,0.08)" : "transparent",
            border: `1px solid ${compact ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}
          whileHover={{ scale: 1.06, background: "rgba(0,229,255,0.12)" }}
          whileTap={{ scale: 0.94 }}
          title={compact ? "وضع موسّع" : "وضع مضغوط"}
          aria-label="تبديل الوضع المضغوط"
        >
          {compact ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </motion.button>

        <NotificationsPanel />
        <ThemePopover />
        <TokensPopover onUpgrade={onOpenPricing} />

      </div>{/* end scrollable strip */}

      {/* ── RIGHT scroll arrow — outside scrollable zone ─────────── */}
      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            onClick={() => scrollBy(220)}
            className="flex-shrink-0 p-1 rounded-lg z-20 relative"
            style={{ color: "rgba(226,18,39,0.8)", background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)" }}
            whileHover={{ background: "rgba(226,18,39,0.2)" }}
            aria-label="تمرير لليمين"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>

      </div>{/* end h-14 main row */}

      {/* ── Pinned shortcuts row ──────────────────────────────────────── */}
      <PinnedShortcutsBar
        onOpenArsenal={onOpenArsenal}
        onOpenAgent={onOpenAgent}
        onOpenNexus={onOpenNexus ?? (() => {})}
        onOpenWarRoom={onOpenWarRoom ?? (() => {})}
        onOpenCisaLive={onOpenCisaLive ?? (() => {})}
        onOpenCyberHierarchy={onOpenCyberHierarchy ?? (() => {})}
        onOpenCognitiveWarfare={onOpenCognitiveWarfare ?? (() => {})}
        onOpenAutonomousOffense={onOpenAutonomousOffense ?? (() => {})}
        onOpenAttackGraph={onOpenAttackGraph ?? (() => {})}
      />
    </motion.header>
    </CompactCtx.Provider>
  );
}
