import { useEffect, useRef, useState, useContext, createContext } from "react";
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
  hudsVisible?: boolean;
}

// ── 3D animated HUD background ────────────────────────────────────────────────
function TopBarHUDCanvas({ powerOn }: { powerOn: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const powerRef  = useRef(powerOn);
  useEffect(() => { powerRef.current = powerOn; }, [powerOn]);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    // Use non-null typed alias so TypeScript doesn't lose narrowing inside closures
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d", { alpha: true })!;

    function resize() {
      cv.width  = cv.offsetWidth  * Math.min(window.devicePixelRatio, 2);
      cv.height = cv.offsetHeight * Math.min(window.devicePixelRatio, 2);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // Floating particles
    type Pt = { x: number; y: number; vx: number; vy: number; r: number; a: number; hue: number };
    const pts: Pt[] = Array.from({ length: 46 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0007,
      vy: (Math.random() - 0.5) * 0.0005,
      r: 0.5 + Math.random() * 1.4,
      a: 0.06 + Math.random() * 0.28,
      hue: i < 30 ? 350 : i < 40 ? 180 : 270,
    }));

    // Data stream nodes — vertical drifting bits
    type Bit = { x: number; y: number; speed: number; alpha: number; val: string };
    const bits: Bit[] = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0008 + Math.random() * 0.0016,
      alpha: 0.04 + Math.random() * 0.12,
      val: Math.random() > 0.5 ? "1" : "0",
    }));

    // Wave pulses
    type Wave = { cx: number; r: number; maxR: number; alpha: number };
    const waves: Wave[] = [];
    let waveTimer = 0;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.009;
      const t = tRef.current;
      const W = cv.width, H = cv.height;
      const pw = powerRef.current;
      const DPR = Math.min(window.devicePixelRatio, 2);
      ctx.clearRect(0, 0, W, H);

      // ── Diagonal cyber grid ────────────────────────────────────────────────
      const gridA = pw ? 0.055 : 0.033;
      ctx.save(); ctx.setLineDash([4 * DPR, 8 * DPR]);
      for (let x = -H; x < W + H; x += 48 * DPR) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H);
        ctx.strokeStyle = `rgba(226,18,39,${gridA})`; ctx.lineWidth = 0.6; ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let x = 0; x < W; x += 56 * DPR) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H);
        ctx.strokeStyle = `rgba(226,18,39,${gridA * 0.7})`; ctx.lineWidth = 0.4; ctx.stroke();
      }
      ctx.restore();

      // ── Horizontal data bands ──────────────────────────────────────────────
      for (let y = 0; y < H; y += 14 * DPR) {
        const band = (Math.sin(t * 0.4 + y * 0.08) + 1) / 2;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
        ctx.strokeStyle = `rgba(226,18,39,${pw ? 0.035 + band * 0.018 : 0.018})`; ctx.lineWidth = 0.4; ctx.stroke();
      }

      // ── Dual scan beams ────────────────────────────────────────────────────
      const scanY = ((t * 0.38) % 1) * H;
      const sg = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12);
      sg.addColorStop(0, "rgba(226,18,39,0)");
      sg.addColorStop(0.4, `rgba(226,18,39,${pw ? 0.14 : 0.065})`);
      sg.addColorStop(0.6, `rgba(255,60,60,${pw ? 0.09 : 0.04})`);
      sg.addColorStop(1, "rgba(226,18,39,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 12, W, 24);

      const scanY2 = ((t * 0.22 + 0.5) % 1) * H;
      const sg2 = ctx.createLinearGradient(0, scanY2 - 8, 0, scanY2 + 8);
      sg2.addColorStop(0, "rgba(0,229,255,0)");
      sg2.addColorStop(0.5, `rgba(0,229,255,${pw ? 0.05 : 0.025})`);
      sg2.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sg2; ctx.fillRect(0, scanY2 - 8, W, 16);

      // ── Dual horizontal streaks ────────────────────────────────────────────
      const sx = ((t * 0.15 + 0.1) % 1.4 - 0.2) * W;
      const hg = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0);
      hg.addColorStop(0, "rgba(226,18,39,0)");
      hg.addColorStop(0.5, `rgba(226,18,39,${pw ? 0.22 : 0.1})`);
      hg.addColorStop(1, "rgba(226,18,39,0)");
      ctx.fillStyle = hg; ctx.fillRect(sx - 120, 0, 240, H);

      const sx2 = ((t * 0.09 + 0.7) % 1.4 - 0.2) * W;
      const hg2 = ctx.createLinearGradient(sx2 - 80, 0, sx2 + 80, 0);
      hg2.addColorStop(0, "rgba(139,92,246,0)");
      hg2.addColorStop(0.5, `rgba(139,92,246,${pw ? 0.07 : 0.03})`);
      hg2.addColorStop(1, "rgba(139,92,246,0)");
      ctx.fillStyle = hg2; ctx.fillRect(sx2 - 80, 0, 160, H);

      // ── Binary rain bits ──────────────────────────────────────────────────
      ctx.font = `${7 * DPR}px monospace`;
      bits.forEach(b => {
        b.y += b.speed;
        if (b.y > 1) { b.y = 0; b.x = Math.random(); b.val = Math.random() > 0.5 ? "1" : "0"; }
        ctx.fillStyle = `rgba(226,18,39,${b.alpha * (pw ? 1.6 : 1)})`;
        ctx.fillText(b.val, b.x * W, b.y * H);
      });

      // ── Wave pulse rings ──────────────────────────────────────────────────
      waveTimer++;
      if (pw && waveTimer % 90 === 0) {
        waves.push({ cx: Math.random() * W, r: 0, maxR: 30 * DPR + Math.random() * 20 * DPR, alpha: 0.35 });
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.r += 1.2 * DPR; w.alpha -= 0.008;
        if (w.alpha <= 0) { waves.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(w.cx, H / 2, w.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(226,18,39,${w.alpha})`; ctx.lineWidth = 1.2; ctx.stroke();
      }

      // ── Corner HUD brackets ───────────────────────────────────────────────
      const bs = 16 * DPR, bw = 1.8 * DPR;
      const pulse = (Math.sin(t * 2.4) + 1) / 2;
      ctx.strokeStyle = `rgba(226,18,39,${pw ? 0.75 + pulse * 0.2 : 0.45})`; ctx.lineWidth = bw;
      ctx.beginPath(); ctx.moveTo(0, bs); ctx.lineTo(0, 0); ctx.lineTo(bs, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - bs, 0); ctx.lineTo(W, 0); ctx.lineTo(W, bs); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H - bs); ctx.lineTo(0, H); ctx.lineTo(bs, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - bs, H); ctx.lineTo(W, H); ctx.lineTo(W, H - bs); ctx.stroke();
      // Inner tick marks on brackets
      ctx.strokeStyle = `rgba(226,18,39,${pw ? 0.4 : 0.22})`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(bs * 0.5, 0); ctx.lineTo(bs * 0.5, 4 * DPR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, bs * 0.5); ctx.lineTo(4 * DPR, bs * 0.5); ctx.stroke();

      // ── Power mode glow bands ────────────────────────────────────────────
      if (pw) {
        const pls = 0.16 + pulse * 0.14;
        const lg = ctx.createLinearGradient(0, 0, 40 * DPR, 0);
        lg.addColorStop(0, `rgba(226,18,39,${pls})`); lg.addColorStop(1, "rgba(226,18,39,0)");
        ctx.fillStyle = lg; ctx.fillRect(0, 0, 40 * DPR, H);
        const rg = ctx.createLinearGradient(W, 0, W - 40 * DPR, 0);
        rg.addColorStop(0, `rgba(226,18,39,${pls})`); rg.addColorStop(1, "rgba(226,18,39,0)");
        ctx.fillStyle = rg; ctx.fillRect(W - 40 * DPR, 0, 40 * DPR, H);
        // Top glow band
        const tg = ctx.createLinearGradient(0, 0, 0, 8 * DPR);
        tg.addColorStop(0, `rgba(226,18,39,${pls * 0.8})`); tg.addColorStop(1, "rgba(226,18,39,0)");
        ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 8 * DPR);
      }

      // ── Floating particles ───────────────────────────────────────────────
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
        const pls2 = (Math.sin(t * 2.4 + p.x * 12 + p.y * 8) + 1) / 2;
        const alpha = p.a * (0.38 + pls2 * 0.62);
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * DPR, 0, Math.PI * 2);
        if (p.hue === 350) ctx.fillStyle = `rgba(226,18,39,${alpha})`;
        else if (p.hue === 180) ctx.fillStyle = `rgba(0,229,255,${alpha * 0.45})`;
        else ctx.fillStyle = `rgba(139,92,246,${alpha * 0.4})`;
        ctx.fill();
      });
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return (
    <canvas ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9 }} />
  );
}

// ── Holographic HUD toolbar button ────────────────────────────────────────────
function HUDBtn({
  icon: Icon, label, color, onClick, badge, shortLabel, title: tip, active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  onClick: () => void;
  badge?: string;
  shortLabel?: string;
  title?: string;
  active?: boolean;
}) {
  const compact = useContext(CompactCtx);
  return (
    <motion.button
      onClick={onClick}
      title={tip ?? label}
      aria-label={label}
      className="flex-shrink-0 flex items-center gap-1.5 py-1.5 rounded-lg relative overflow-hidden whitespace-nowrap"
      style={{
        padding: compact ? "6px 8px" : undefined,
        paddingLeft: compact ? undefined : "8px",
        paddingRight: compact ? undefined : "10px",
        background: active ? `${color}22` : `${color}0e`,
        border: active ? `1px solid ${color}77` : `1px solid ${color}30`,
        color: color,
        boxShadow: active ? `0 0 14px ${color}44, inset 0 1px 0 ${color}22` : undefined,
      }}
      whileHover={{
        scale: 1.05, y: -1,
        boxShadow: `0 4px 22px ${color}28, 0 0 12px ${color}18, inset 0 1px 0 ${color}20`,
        backgroundColor: `${color}18`,
        borderColor: `${color}60`,
      }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {!compact && (
        <span className="hidden sm:block text-[10px] font-black tracking-wide uppercase">
          {shortLabel ?? label}
        </span>
      )}
      {!compact && badge && (
        <span className="hidden sm:block text-[7px] font-black px-1 py-0.5 rounded"
          style={{ background: `${color}25`, color: color, border: `1px solid ${color}40` }}>
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

// ── Model selector 3D ─────────────────────────────────────────────────────────
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const active = getModel(state.activeModel);
  const ActiveIcon = active.icon;
  const filtered = AI_MODELS.filter(m =>
    m.id.toLowerCase().includes(q.toLowerCase()) ||
    m.desc.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <motion.button
        onClick={() => setOpen(o => !o)}
        aria-label={`${t("top.switchModel")} — ${active.id}`}
        className="flex items-center gap-2 px-2 py-1 rounded-xl relative overflow-hidden"
        style={{
          background: open
            ? "linear-gradient(135deg,rgba(226,18,39,0.14) 0%,rgba(20,8,8,0.95) 100%)"
            : "linear-gradient(135deg,rgba(226,18,39,0.07) 0%,rgba(12,8,8,0.9) 100%)",
          border: `1px solid rgba(226,18,39,${open ? 0.55 : 0.22})`,
          boxShadow: open
            ? "0 0 24px rgba(226,18,39,0.22), inset 0 1px 0 rgba(226,18,39,0.15)"
            : "0 0 10px rgba(226,18,39,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {/* HUD top-left corner */}
        <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none"
          style={{ borderColor: "rgba(226,18,39,0.6)" }} />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none"
          style={{ borderColor: "rgba(226,18,39,0.6)" }} />

        {/* Model icon with glow ring */}
        <span className="relative flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
          style={{
            background: "rgba(226,18,39,0.14)",
            border: "1px solid rgba(226,18,39,0.3)",
            boxShadow: "0 0 10px rgba(226,18,39,0.25)",
          }}>
          <ActiveIcon className={`w-3.5 h-3.5 ${active.color}`} />
          {/* Pulse ring */}
          <motion.span className="absolute inset-0 rounded-lg pointer-events-none"
            animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.25, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ border: "1px solid rgba(226,18,39,0.4)" }} />
        </span>

        {/* Model name + meta */}
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span className="text-[7px] font-black tracking-[0.2em] uppercase"
            style={{ color: "rgba(226,18,39,0.55)" }}>
            MODEL
          </span>
          <span className="text-[11px] font-black max-w-[120px] truncate"
            style={{ color: "rgba(255,255,255,0.92)" }}>
            {active.id}
          </span>
        </div>

        {/* Chevron */}
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: "rgba(226,18,39,0.55)" }}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}>
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 mt-2 z-50 rounded-2xl overflow-hidden"
            style={{
              width: 330,
              background: "rgba(5,3,10,0.98)",
              border: "1px solid rgba(226,18,39,0.25)",
              boxShadow: "0 0 50px rgba(226,18,39,0.12), 0 20px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(226,18,39,0.1)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,#e21227,rgba(255,100,100,0.5),transparent)" }} />

            {/* Search */}
            <div className="p-2.5" style={{ borderBottom: "1px solid rgba(226,18,39,0.08)" }}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "rgba(226,18,39,0.5)" }} />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder={t("top.searchModels")}
                  className="w-full rounded-lg pl-7 pr-3 py-1.5 text-[11px] outline-none"
                  style={{
                    background: "rgba(226,18,39,0.06)",
                    border: "1px solid rgba(226,18,39,0.2)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                />
              </div>
            </div>

            {/* Model list */}
            <div className="p-1.5 max-h-[min(72vh,580px)] overflow-y-auto space-y-0.5"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(226,18,39,0.3) transparent" }}>
              {filtered.map(m => {
                const Icon = m.icon;
                const isFree = m.id === "CHAT-GPT Fast";
                const locked = !isFree && !tierAtLeast(state.subscription.tier, "starter");
                const isActive = state.activeModel === m.id;
                return (
                  <motion.button
                    key={m.id}
                    onClick={() => {
                      if (locked) {
                        toast({ description: `${m.id} requires Starter plan.` });
                        setOpen(false); onOpenPricing(); return;
                      }
                      dispatch({ type: "SET_MODEL", model: m.id });
                      setOpen(false);
                    }}
                    className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left relative overflow-hidden"
                    style={{
                      background: isActive ? "rgba(226,18,39,0.1)" : "transparent",
                      border: `1px solid ${isActive ? "rgba(226,18,39,0.3)" : "transparent"}`,
                      opacity: locked ? 0.55 : 1,
                    }}
                    whileHover={{ background: "rgba(226,18,39,0.07)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.2)" }}>
                      {locked ? <Lock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} /> : <Icon className={`w-4 h-4 ${m.color}`} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold truncate" style={{ color: isActive ? "#e21227" : "rgba(255,255,255,0.88)" }}>
                          {m.id}
                        </span>
                        {m.badge && !locked && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(226,18,39,0.18)", color: "#e21227", border: "1px solid rgba(226,18,39,0.3)" }}>
                            {m.badge}
                          </span>
                        )}
                        {locked && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                            STARTER+
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] leading-snug mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {m.desc}
                      </span>
                    </div>
                    {isActive && (
                      <motion.span className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0"
                        style={{ background: "#e21227", boxShadow: "0 0 6px #e21227" }}
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }} />
                    )}
                  </motion.button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center py-6 text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {t("toolsHub.noResults", { q })}
                </p>
              )}
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid rgba(226,18,39,0.1)" }}>
              <motion.button
                onClick={() => { onOpenPricing(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold"
                style={{ color: "#e21227" }}
                whileHover={{ background: "rgba(226,18,39,0.06)" }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t("top.getMoreTokens")}
              </motion.button>
            </div>
            <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.4),transparent)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  hudsVisible,
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
      {/* ── Main row (h-14) ─────────────────────────────────────────── */}
      <div className="h-14 flex items-center justify-between px-2 sm:px-3 relative overflow-hidden">

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

      {/* ── LEFT: menu + model selector ──────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0 relative z-10">
        {/* Hamburger */}
        <motion.button
          onClick={onMenuClick}
          className="p-2 md:hidden rounded-lg"
          style={{ color: "rgba(255,255,255,0.45)" }}
          whileHover={{ color: "#e21227", background: "rgba(226,18,39,0.1)" }}
          whileTap={{ scale: 0.92 }}
          aria-label={t("top.openMenu")}
        >
          <Menu className="w-5 h-5" />
        </motion.button>

        {/* Model selector */}
        <ModelSelector3D onOpenPricing={onOpenPricing} />
      </div>

      {/* ── CENTER: health + auto AI + persona (between model and toolbar) ─ */}
      <div className="flex items-center gap-1.5 flex-shrink-0 relative z-10 mx-1.5" style={{ minWidth: 0, overflow: "visible" }}>
        <ProviderHealthBadge3D />
        <AIQuickSetupButton />
        <QuantumPersona3D onOpenPersonaManager={onOpenPersonaManager} />
      </div>

      {/* ── RIGHT: scrollable toolbar ─────────────────────────────────── */}
      <div className="flex items-center gap-0.5 flex-1 min-w-0 justify-end relative z-10">

        {/* Left scroll arrow */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              onClick={() => scrollBy(-180)}
              className="flex-shrink-0 p-1 rounded-lg"
              style={{ color: "rgba(226,18,39,0.7)", background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)" }}
              whileHover={{ background: "rgba(226,18,39,0.15)" }}
              aria-label="تمرير لليسار"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scrollable zone */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0"
          style={{ scrollbarWidth: "none" }}
        >
          {/* ── GROUP 1 — Core ──────────────────────────────────────────── */}
          <HUDBtn icon={LayoutGrid} label={t("top.toolsHub")} shortLabel={t("top.tools")} color="#10b981" onClick={onOpenToolsHub} />
          <HUDBtn icon={Bot}       label="KaliAgent"  shortLabel="KGT" color="#ff4d4d" onClick={onOpenAgent} />
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
          {(onOpenWarRoom || onOpenDeepSearch || onOpenChainInvestigation || onOpenRedTeam || onOpenCognitiveWarfare || onOpenAutonomousOffense || onOpenAttackGraph) && <VDivider />}

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
          {/* Persona Switcher */}
          <PersonaSwitcher3D onOpenPersonaEditor={onOpenPersonaEditor} onOpenPersonaManager={onOpenPersonaManager} />

          {/* Provider chip */}
          {onOpenProviderSettings && (
            <motion.button
              onClick={onOpenProviderSettings}
              className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
              style={{
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.25)",
                color: "rgba(167,139,250,0.85)",
              }}
              whileHover={{ scale: 1.04, background: "rgba(139,92,246,0.15)", borderColor: "rgba(139,92,246,0.5)" }}
              whileTap={{ scale: 0.96 }}
              title="إعدادات المزوّد"
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(167,139,250,0.9)", boxShadow: "0 0 6px rgba(139,92,246,0.8)" }} />
              <span className="hidden sm:block text-[10px] font-black tracking-wider uppercase">
                {(state.activeProvider ?? "personal").slice(0, 8)}
              </span>
              {state.activeProviderModel && (
                <span className="hidden md:block text-[9px] font-mono"
                  style={{ color: "rgba(167,139,250,0.45)" }}>
                  /{state.activeProviderModel.split("/").pop()?.slice(0, 10)}
                </span>
              )}
            </motion.button>
          )}

          {/* Local Model */}
          <motion.button
            onClick={onOpenLocalModel}
            className="flex-shrink-0 p-2 rounded-lg"
            style={{
              color: state.settings.useLocalModel ? "#22c55e" : "rgba(255,255,255,0.35)",
              background: state.settings.useLocalModel ? "rgba(34,197,94,0.1)" : "transparent",
              border: `1px solid ${state.settings.useLocalModel ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.08)"}`,
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Local Model"
            title={state.settings.useLocalModel ? `Local: ${state.settings.localModel}` : "Ollama / LM Studio"}
          >
            <Server className="w-4 h-4" />
          </motion.button>

          {/* Power Mode */}
          <motion.button
            onClick={togglePower}
            className="flex-shrink-0 flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg"
            style={powerOn ? {
              background: "rgba(226,18,39,0.18)",
              border: "1px solid rgba(226,18,39,0.65)",
              color: "#e21227",
              boxShadow: "0 0 20px rgba(226,18,39,0.5), 0 0 40px rgba(226,18,39,0.18)",
            } : {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(200,210,230,0.65)",
            }}
            whileHover={{ scale: 1.05, y: -0.5 }}
            whileTap={{ scale: 0.94 }}
            aria-label={t("power.title")}
            title={t(powerOn ? "power.tooltipOn" : "power.tooltipOff")}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
          >
            <motion.div
              animate={powerOn ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Zap className={`w-3.5 h-3.5 ${powerOn ? "fill-current" : ""}`} />
            </motion.div>
            <span className="hidden sm:block text-[10px] font-black tracking-widest uppercase">
              {t("power.title")}
            </span>
            {powerOn && (
              <motion.span
                className="text-[7px] font-black px-1 py-0.5 rounded"
                style={{ background: "rgba(226,18,39,0.3)", color: "#ff5577" }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                ON
              </motion.span>
            )}
          </motion.button>

          {/* Buy Tokens */}
          <motion.button
            onClick={onOpenPricing}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-white text-[10px] font-black tracking-wide"
            style={{
              background: "linear-gradient(135deg,#d946ef 0%,#8b5cf6 50%,#6366f1 100%)",
              boxShadow: "0 0 20px rgba(217,70,239,0.35), 0 0 40px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
            whileHover={{ scale: 1.05, y: -0.5, boxShadow: "0 0 28px rgba(217,70,239,0.5), 0 0 50px rgba(139,92,246,0.25)" }}
            whileTap={{ scale: 0.95 }}
            aria-label={t("top.buyTokens")}
            title={t("top.buyTokens")}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="hidden sm:block">{t("top.buyTokens")}</span>
          </motion.button>

          {/* Help */}
          <motion.button
            onClick={onOpenHelp}
            className="flex-shrink-0 hidden sm:flex p-2 rounded-lg"
            style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
            whileHover={{ color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.06)", scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label={t("top.shortcuts")}
            title={t("top.shortcuts")}
          >
            <HelpCircle className="w-4 h-4" />
          </motion.button>

              {/* Compact toggle */}
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

          {/* Utility panels */}
          <NotificationsPanel />
          <ThemePopover />
          <TokensPopover onUpgrade={onOpenPricing} />
        </div>

        {/* Right scroll arrow */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              onClick={() => scrollBy(180)}
              className="flex-shrink-0 p-1 rounded-lg"
              style={{ color: "rgba(226,18,39,0.7)", background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)" }}
              whileHover={{ background: "rgba(226,18,39,0.15)" }}
              aria-label="تمرير لليمين"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
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
