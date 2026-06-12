import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, RotateCcw, Copy, CheckCheck, ChevronDown, Loader2,
  Columns3, Zap, Brain, Cpu, Globe, FlaskConical, Bot, Server,
  Check, Sparkles, Trophy, Download, Activity, Timer, Hash,
  TrendingUp, Layers, Shield, Code2, Eye, Search,
} from "lucide-react";
import { streamChat, type ChatRequest } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface ModelCompareModalProps {
  open: boolean;
  onClose: () => void;
}

const COMPARE_MODELS = [
  { id: "CHAT-GPT Fast",       label: "CHAT-GPT Fast",       icon: Zap,         color: "#10b981", group: "OpenAI",     badge: "FAST" },
  { id: "CHAT-GPT Pro",        label: "CHAT-GPT Pro",        icon: Brain,       color: "#6366f1", group: "OpenAI",     badge: "PRO" },
  { id: "CHAT-GPT Vision",     label: "CHAT-GPT Vision",     icon: Eye,         color: "#3b82f6", group: "OpenAI",     badge: "VISION" },
  { id: "CHAT-GPT Reasoning",  label: "CHAT-GPT Reasoning",  icon: FlaskConical,color: "#a78bfa", group: "OpenAI",     badge: "REASON" },
  { id: "CHAT-GPT Code",       label: "CHAT-GPT Code",       icon: Code2,       color: "#f59e0b", group: "OpenAI",     badge: "CODE" },
  { id: "CHAT-GPT Ultra",      label: "CHAT-GPT Ultra",      icon: Trophy,      color: "#e21227", group: "OpenAI",     badge: "ULTRA" },
  { id: "CHAT-GPT Research",   label: "CHAT-GPT Research",   icon: Globe,       color: "#06b6d4", group: "OpenAI",     badge: "RES" },
  { id: "CHAT-GPT Agent",      label: "CHAT-GPT Agent",      icon: Bot,         color: "#8b5cf6", group: "OpenAI",     badge: "AGENT" },
  { id: "Claude Opus",         label: "Claude Opus",         icon: FlaskConical,color: "#f97316", group: "Anthropic",  badge: "OPUS" },
  { id: "Claude Sonnet",       label: "Claude Sonnet",       icon: FlaskConical,color: "#fb923c", group: "Anthropic",  badge: "SONNET" },
  { id: "Claude Haiku",        label: "Claude Haiku",        icon: FlaskConical,color: "#fdba74", group: "Anthropic",  badge: "HAIKU" },
  { id: "Gemini Pro",          label: "Gemini Pro",          icon: Globe,       color: "#4285f4", group: "Google",     badge: "PRO" },
  { id: "Gemini Ultra",        label: "Gemini Ultra",        icon: Globe,       color: "#34a853", group: "Google",     badge: "ULTRA" },
  { id: "Gemini Flash",        label: "Gemini Flash",        icon: Zap,         color: "#fbbc04", group: "Google",     badge: "FLASH" },
  { id: "Llama 4 Scout",       label: "Llama 4 Scout",       icon: Server,      color: "#00ff41", group: "Meta",       badge: "SCOUT" },
  { id: "Llama 4 Maverick",    label: "Llama 4 Maverick",   icon: Server,      color: "#00e5ff", group: "Meta",       badge: "MAVR" },
  { id: "Mistral Large",       label: "Mistral Large",       icon: Brain,       color: "#ff6b35", group: "Mistral",    badge: "LG" },
  { id: "DeepSeek R2",         label: "DeepSeek R2",         icon: Brain,       color: "#60a5fa", group: "DeepSeek",   badge: "R2" },
  { id: "Grok 3",              label: "Grok 3",              icon: Zap,         color: "#1d9bf0", group: "xAI",        badge: "GROK" },
  { id: "Qwen2.5 Max",         label: "Qwen2.5 Max",         icon: Globe,       color: "#f43f5e", group: "Alibaba",    badge: "MAX" },
  { id: "CHAT-GPT Security",   label: "CHAT-GPT Security",   icon: Shield,      color: "#ef4444", group: "OpenAI",     badge: "SEC" },
  { id: "Phi-4",               label: "Phi-4",               icon: Cpu,         color: "#8b5cf6", group: "Microsoft",  badge: "PHI4" },
];

const SLOT_THEMES = [
  { border: "#00e5ff", bg: "rgba(0,229,255,0.04)", glow: "#00e5ff33", text: "#00e5ff", label: "نموذج A", id: "A" },
  { border: "#a78bfa", bg: "rgba(167,139,250,0.04)", glow: "#a78bfa33", text: "#a78bfa", label: "نموذج B", id: "B" },
  { border: "#10b981", bg: "rgba(16,185,129,0.04)", glow: "#10b98133", text: "#10b981", label: "نموذج C", id: "C" },
];

type SlotState = {
  modelId: string;
  streaming: boolean;
  content: string;
  done: boolean;
  error: string | null;
  timeMs: number | null;
  tokens: number;
  tps: number;
};

function makeSlot(modelId: string): SlotState {
  return { modelId, streaming: false, content: "", done: false, error: null, timeMs: null, tokens: 0, tps: 0 };
}

// ── 3D Particle Field Background ─────────────────────────────────────────────
function ParticleField({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = canvas.parentElement?.clientWidth ?? 800;
    let H = canvas.parentElement?.clientHeight ?? 600;
    canvas.width = W; canvas.height = H;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: 0.5 + Math.random() * 1.5,
      alpha: 0.1 + Math.random() * 0.3,
      color: ["#00e5ff", "#a78bfa", "#10b981", "#e21227"][Math.floor(Math.random() * 4)],
    }));

    const nodes = Array.from({ length: 8 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    function draw() {
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.018)";
      ctx.lineWidth = 0.5;
      const gs = 40;
      for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Neural nodes & connections
      nodes.forEach((n, i) => {
        n.x += n.vx * (running ? 1.5 : 1);
        n.y += n.vy * (running ? 1.5 : 1);
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse += 0.03;
        const pulse = (Math.sin(n.pulse) + 1) / 2;

        nodes.slice(i + 1).forEach(n2 => {
          const dx = n2.x - n.x, dy = n2.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const alpha = (1 - dist / 200) * 0.12 * (running ? 1.6 : 1);
            ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        });

        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 8 + pulse * 6);
        gr.addColorStop(0, `rgba(0,229,255,${0.4 + pulse * 0.3})`);
        gr.addColorStop(1, "rgba(0,229,255,0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, 8 + pulse * 6, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${0.8 + pulse * 0.2})`;
        ctx.fill();
      });

      // Particles
      particles.forEach(p => {
        p.x += p.vx * (running ? 2 : 1);
        p.y += p.vy * (running ? 2 : 1);
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });

      // Scanning line when running
      if (running) {
        const scanY = (frame * 1.5) % H;
        const sg = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
        sg.addColorStop(0, "rgba(0,229,255,0)");
        sg.addColorStop(0.5, "rgba(0,229,255,0.04)");
        sg.addColorStop(1, "rgba(0,229,255,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(0, scanY - 40, W, 80);
        ctx.strokeStyle = "rgba(0,229,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(W, scanY);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(() => {
      W = canvas.parentElement?.clientWidth ?? 800;
      H = canvas.parentElement?.clientHeight ?? 600;
      canvas.width = W; canvas.height = H;
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [running]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ── Holographic Header Canvas ─────────────────────────────────────────────────
function HoloHeader({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 320; canvas.height = 60;
    const W = 320, H = 60;
    let f = 0;
    function draw() {
      f++;
      ctx.clearRect(0, 0, W, H);
      const beamX = (f * 1.5) % (W + 40) - 20;
      const bg = ctx.createLinearGradient(beamX - 40, 0, beamX + 40, 0);
      bg.addColorStop(0, "rgba(0,229,255,0)");
      bg.addColorStop(0.5, `rgba(0,229,255,${running ? 0.12 : 0.06})`);
      bg.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      // Bottom border glow
      const borderG = ctx.createLinearGradient(0, 0, W, 0);
      borderG.addColorStop(0, "rgba(0,229,255,0)");
      borderG.addColorStop(0.3, `rgba(0,229,255,${running ? 0.6 : 0.3})`);
      borderG.addColorStop(0.7, `rgba(167,139,250,${running ? 0.6 : 0.3})`);
      borderG.addColorStop(1, "rgba(167,139,250,0)");
      ctx.fillStyle = borderG;
      ctx.fillRect(0, H - 1.5, W, 1.5);
      // Corner accents
      const ca = running ? 0.7 : 0.35;
      ctx.strokeStyle = `rgba(0,229,255,${ca})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, 0); ctx.lineTo(16, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W, 16); ctx.lineTo(W, 0); ctx.lineTo(W - 16, 0); ctx.stroke();
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80" style={{ width: "100%", height: "100%" }} />;
}

// ── Performance Metric Bar ────────────────────────────────────────────────────
function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px] font-mono">
        <span style={{ color }}>{label}</span>
        <span className="text-white/50">{value.toFixed(0)}</span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── 3D Response Card ──────────────────────────────────────────────────────────
function ResponseCard3D({ slot, idx, isWinner }: { slot: SlotState; idx: number; isWinner: boolean }) {
  const [copied, setCopied] = useState(false);
  const theme = SLOT_THEMES[idx % 3];
  const model = COMPARE_MODELS.find(m => m.id === slot.modelId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [slot.content]);

  async function copy() {
    await navigator.clipboard.writeText(slot.content);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  const tokensPerSec = slot.timeMs && slot.tokens > 0 ? ((slot.tokens / slot.timeMs) * 1000).toFixed(1) : "—";
  const qualityScore = slot.content.length > 0 ? Math.min(100, Math.round((slot.content.length / 50) + (slot.tokens * 0.5))) : 0;

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden h-full"
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}${isWinner ? "cc" : "44"}`,
        boxShadow: isWinner
          ? `0 0 30px ${theme.glow}, 0 0 60px ${theme.glow.replace("33", "15")}, inset 0 1px 0 ${theme.border}22`
          : `0 0 12px ${theme.glow.replace("33", "15")}, inset 0 1px 0 ${theme.border}12`,
      }}
    >
      {/* Neon corner accents */}
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg pointer-events-none" style={{ borderColor: theme.border + "cc" }} />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-lg pointer-events-none" style={{ borderColor: theme.border + "88" }} />

      {/* Winner glow */}
      {isWinner && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ boxShadow: `inset 0 0 40px ${theme.glow}` }}
        />
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: theme.border + "20" }}>
        {/* Slot label badge */}
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${theme.border}22, ${theme.border}0a)`, border: `1px solid ${theme.border}44` }}>
            <span className="text-[12px] font-black" style={{ color: theme.border }}>{theme.id}</span>
            {isWinner && (
              <motion.div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "#f59e0b", boxShadow: "0 0 8px #f59e0b88" }}
                animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <Trophy className="w-2.5 h-2.5 text-black" />
              </motion.div>
            )}
          </div>
          <div>
            <div className="text-[12px] font-bold truncate max-w-[120px]" style={{ color: theme.text }}>{slot.modelId}</div>
            <div className="text-[9px] font-mono" style={{ color: theme.border + "80" }}>
              {slot.streaming ? (
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                  مباشر...
                </motion.span>
              ) : slot.done ? (
                <span>{slot.timeMs}ms · {slot.tokens} رمز · {tokensPerSec} rps</span>
              ) : <span className="opacity-30">انتظار...</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {model?.badge && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded border" style={{ color: model.color, borderColor: model.color + "44", background: model.color + "11" }}>
              {model.badge}
            </span>
          )}
          {slot.done && slot.content && (
            <button onClick={copy} className="p-1 rounded hover:bg-white/5 transition-colors" style={{ color: theme.border + "80" }}>
              {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 min-h-0 text-[12.5px] leading-relaxed scrollbar-thin" style={{ color: "rgba(255,255,255,0.85)" }}>
        {slot.error ? (
          <div className="flex items-start gap-2 text-red-400 text-[11px] bg-red-500/5 border border-red-500/20 rounded-lg p-2">
            <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {slot.error}
          </div>
        ) : slot.content ? (
          <ColoredText text={slot.content} />
        ) : !slot.streaming ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <Layers className="w-8 h-8" style={{ color: theme.border }} />
            <span className="text-[11px]">أرسل رسالة للبدء</span>
          </div>
        ) : null}
        {slot.streaming && (
          <motion.span
            className="inline-block w-1.5 h-4 ml-0.5 rounded-sm align-middle"
            style={{ background: theme.border }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          />
        )}
      </div>

      {/* Metrics footer */}
      {(slot.done && slot.content) || slot.streaming ? (
        <div className="px-3 py-2 border-t space-y-1.5 flex-shrink-0" style={{ borderColor: theme.border + "18" }}>
          <MetricBar label="جودة" value={qualityScore} max={100} color={theme.border} />
          {slot.done && (
            <div className="flex items-center justify-between text-[9px] font-mono opacity-60">
              <span style={{ color: theme.border }}>~{Math.ceil(slot.content.length / 4)} رمز</span>
              <span style={{ color: theme.border }}>{model?.group}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Inline colored text renderer ─────────────────────────────────────────────
function ColoredText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5 font-sans">
      {lines.map((line, i) => {
        if (/^#{1,3}\s/.test(line)) {
          const level = (line.match(/^#+/) ?? [""])[0].length;
          const content = line.replace(/^#+\s/, "");
          const sizes = ["text-[15px]", "text-[13px]", "text-[12px]"];
          return (
            <div key={i} className={`font-black ${sizes[level - 1] ?? "text-[12px]"}`}
              style={{ color: "#00e5ff", textShadow: "0 0 12px #00e5ff44" }}>
              {content}
            </div>
          );
        }
        if (/^[-*]\s/.test(line)) {
          return (
            <div key={i} className="flex items-start gap-1.5 text-[12px]">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#a78bfa" }} />
              <span className="text-white/80">{renderInline(line.replace(/^[-*]\s/, ""))}</span>
            </div>
          );
        }
        if (/^>\s/.test(line)) {
          return (
            <div key={i} className="border-l-2 pl-2 italic text-[11px] text-white/50"
              style={{ borderColor: "#a78bfa66" }}>
              {line.replace(/^>\s/, "")}
            </div>
          );
        }
        return <p key={i} className="whitespace-pre-wrap text-[12.5px]">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\b\d+\.?\d*\b)|(https?:\/\/\S+)/g;
  let last = 0, i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={i++} className="text-white/80">{text.slice(last, m.index)}</span>);
    if (m[1]) parts.push(<code key={i++} className="font-mono text-[11px] px-1 rounded" style={{ color: "#10b981", background: "#10b98112" }}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) parts.push(<strong key={i++} style={{ color: "#fbbf24" }}>{m[2].slice(2, -2)}</strong>);
    else if (m[3]) parts.push(<em key={i++} style={{ color: "#a78bfa" }}>{m[3].slice(1, -1)}</em>);
    else if (m[4]) parts.push(<span key={i++} style={{ color: "#00e5ff" }}>{m[4]}</span>);
    else if (m[5]) parts.push(<a key={i++} href={m[5]} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#60a5fa" }}>{m[5]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={i++} className="text-white/80">{text.slice(last)}</span>);
  return parts;
}

// ── Model Picker (3D card style) ──────────────────────────────────────────────
function ModelPicker3D({
  value, onChange, disabled, theme, exclude,
}: { value: string; onChange: (v: string) => void; disabled: boolean; theme: typeof SLOT_THEMES[0]; exclude: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const model = COMPARE_MODELS.find(m => m.id === value);
  const filtered = useMemo(() =>
    COMPARE_MODELS.filter(m => (!exclude.includes(m.id) || m.id === value) &&
      (m.label.toLowerCase().includes(q.toLowerCase()) || m.group.toLowerCase().includes(q.toLowerCase()))
    ), [exclude, value, q]);
  const groups = useMemo(() => Array.from(new Set(filtered.map(m => m.group))), [filtered]);

  if (disabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl opacity-70" style={{ border: `1px solid ${theme.border}30`, background: theme.bg }}>
        {model && <model.icon className="w-3.5 h-3.5" style={{ color: model.color }} />}
        <span className="text-[12px] font-bold truncate" style={{ color: theme.text }}>{model?.label}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-[1.01]"
        style={{ border: `1px solid ${theme.border}44`, background: theme.bg, boxShadow: `0 0 10px ${theme.glow.replace("33","15")}` }}
      >
        {model && (
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: model.color + "22", border: `1px solid ${model.color}44` }}>
            <model.icon className="w-3.5 h-3.5" style={{ color: model.color }} />
          </span>
        )}
        <span className="flex-1 text-[12px] font-bold truncate text-left" style={{ color: theme.text }}>{model?.label ?? "اختر..."}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-40" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQ(""); }} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 right-0 mt-1.5 rounded-xl z-50 overflow-hidden"
              style={{ background: "#090909", border: `1px solid ${theme.border}33`, boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 20px ${theme.glow}` }}
            >
              <div className="p-1.5 border-b" style={{ borderColor: theme.border + "20" }}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: theme.border + "80" }} />
                  <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                    placeholder="بحث..."
                    className="w-full bg-[#111] rounded-lg pl-7 pr-3 py-1.5 text-[11px] outline-none text-white placeholder:text-white/20"
                    style={{ border: `1px solid ${theme.border}22` }}
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto p-1.5 space-y-2">
                {groups.map(grp => (
                  <div key={grp}>
                    <div className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 opacity-40" style={{ color: theme.border }}>{grp}</div>
                    {filtered.filter(m => m.group === grp).map(m => (
                      <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); setQ(""); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all hover:scale-[1.01]"
                        style={{
                          background: m.id === value ? m.color + "15" : "transparent",
                          border: m.id === value ? `1px solid ${m.color}33` : "1px solid transparent",
                        }}>
                        <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: m.color + "22" }}>
                          <m.icon className="w-3 h-3" style={{ color: m.color }} />
                        </span>
                        <span className="text-[11px] font-medium flex-1 text-white/80">{m.label}</span>
                        {m.id === value && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export function ModelCompareModal({ open, onClose }: ModelCompareModalProps) {
  const { state } = useStore();
  const { toast } = useToast();
  const lang = state.settings.language;
  const abortRefs = useRef<(AbortController | null)[]>([null, null, null]);

  const [slots, setSlots] = useState<[SlotState, SlotState, SlotState]>([
    makeSlot("CHAT-GPT Fast"),
    makeSlot("CHAT-GPT Pro"),
    makeSlot("CHAT-GPT Reasoning"),
  ]);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<{ q: string; responses: string[] }[]>([]);
  const [winnerIdx, setWinnerIdx] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function setSlot(idx: number, patch: Partial<SlotState>) {
    setSlots(prev => {
      const copy = [...prev] as [SlotState, SlotState, SlotState];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }

  function setModel(idx: number, modelId: string) {
    if (running) return;
    setSlot(idx, makeSlot(modelId));
  }

  const stopAll = useCallback(() => {
    abortRefs.current.forEach(ac => ac?.abort());
    abortRefs.current = [null, null, null];
    setRunning(false);
    setSlots(prev => {
      const copy = [...prev] as [SlotState, SlotState, SlotState];
      copy.forEach((s, i) => { if (s.streaming) copy[i] = { ...s, streaming: false, done: true }; });
      return copy;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    if (!message.trim() || running) return;
    const q = message.trim();
    setMessage("");
    setRunning(true);
    setWinnerIdx(-1);
    setSlots(prev => prev.map(s => ({ ...s, content: "", done: false, error: null, streaming: true, timeMs: null, tokens: 0, tps: 0 })) as [SlotState, SlotState, SlotState]);

    const results = ["", "", ""];
    const doneTimes: (number | null)[] = [null, null, null];

    await Promise.all(slots.map(async (slot, idx) => {
      const ac = new AbortController();
      abortRefs.current[idx] = ac;
      const t0 = Date.now();
      try {
        const req: ChatRequest = {
          model: slot.modelId, persona: state.activePersona,
          customInstructions: state.customInstructions ?? "",
          language: lang, memory: state.memory,
          messages: [{ role: "user", content: q }],
          mode: "chat",
        };
        await streamChat(req, (chunk) => {
          results[idx] += chunk;
          const elapsed = Date.now() - t0;
          const toks = Math.ceil(results[idx].length / 4);
          const tps = elapsed > 0 ? (toks / elapsed) * 1000 : 0;
          setSlot(idx, { content: results[idx], streaming: true, tokens: toks, tps });
        }, ac.signal);
        const elapsed = Date.now() - t0;
        doneTimes[idx] = elapsed;
        const tokens = Math.ceil(results[idx].length / 4);
        setSlot(idx, { streaming: false, done: true, timeMs: elapsed, tokens, tps: (tokens / elapsed) * 1000 });
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setSlot(idx, { streaming: false, done: true, error: e instanceof Error ? e.message : "خطأ غير متوقع" });
      }
    }));

    // Find winner (fastest without error)
    let best = -1, bestTime = Infinity;
    doneTimes.forEach((t, i) => { if (t !== null && t < bestTime && !results[i].includes("error")) { bestTime = t; best = i; } });
    setWinnerIdx(best);
    setHistory(h => [...h, { q, responses: results }]);
    setRunning(false);
  }, [message, running, slots, state, lang]);

  function reset() {
    stopAll();
    setSlots(prev => prev.map(s => makeSlot(s.modelId)) as [SlotState, SlotState, SlotState]);
    setMessage("");
    setWinnerIdx(-1);
  }

  function exportComparison() {
    if (!history.length) return;
    const last = history[history.length - 1];
    const md = `# مقارنة النماذج\n\n**سؤال:** ${last.q}\n\n${slots.map((s, i) => `## ${s.modelId}\n\n${last.responses[i]}`).join("\n\n---\n\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "model-comparison.md"; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "تم تصدير المقارنة" });
  }

  // Auto-focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  if (!open) return null;

  const allDone = slots.every(s => s.done);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ background: "#080808" }}
        >
          {/* Particle field background */}
          <div className="absolute inset-0">
            <ParticleField running={running} />
          </div>

          {/* Header */}
          <div className="relative flex-shrink-0 flex items-center justify-between px-5 py-3 overflow-hidden" style={{ borderBottom: "1px solid rgba(0,229,255,0.12)", background: "rgba(8,8,8,0.9)" }}>
            <div className="absolute inset-0 pointer-events-none">
              <HoloHeader running={running} />
            </div>
            <div className="relative flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                style={{ background: "linear-gradient(135deg, #00e5ff15, #a78bfa10)", border: "1px solid #00e5ff33", boxShadow: "0 0 20px #00e5ff22" }}>
                <Columns3 className="w-4.5 h-4.5 text-cyan-400" />
                {running && (
                  <motion.div className="absolute inset-0 rounded-xl border border-cyan-400"
                    animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }} />
                )}
              </div>
              <div>
                <h2 className="text-[15px] font-black" style={{ color: "#00e5ff", textShadow: "0 0 12px #00e5ff44" }}>
                  مقارنة النماذج 3D
                </h2>
                <p className="text-[10px] font-mono" style={{ color: "rgba(0,229,255,0.5)" }}>
                  3 نماذج بالتوازي · تحليل فوري · مقاييس حية
                </p>
              </div>
              {/* Slot badges */}
              <div className="hidden md:flex items-center gap-1.5 ml-2">
                {slots.map((s, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black"
                    style={{ background: SLOT_THEMES[i].border + "12", border: `1px solid ${SLOT_THEMES[i].border}33`, color: SLOT_THEMES[i].border }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLOT_THEMES[i].border }} />
                    {s.modelId.split(" ").slice(-1)[0]}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative flex items-center gap-1.5">
              {/* Metrics strip */}
              {running && (
                <div className="flex items-center gap-2 mr-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-cyan-400/60">مباشر</span>
                </div>
              )}
              {history.length > 0 && (
                <button onClick={exportComparison} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition-all hover:scale-105"
                  style={{ background: "#00e5ff0a", border: "1px solid #00e5ff22", color: "#00e5ff80" }}>
                  <Download className="w-3.5 h-3.5" /> تصدير
                </button>
              )}
              <button onClick={reset} className="p-2 rounded-lg transition-all hover:scale-105"
                style={{ background: "#ffffff08", border: "1px solid #ffffff12", color: "#ffffff60" }}>
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 rounded-lg transition-all hover:scale-105"
                style={{ background: "#e2122708", border: "1px solid #e2122730", color: "#e21227" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Model selectors */}
          <div className="relative flex-shrink-0 grid grid-cols-3 gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,8,8,0.7)" }}>
            {slots.map((slot, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest" style={{ color: SLOT_THEMES[idx].border }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLOT_THEMES[idx].border }} />
                  {SLOT_THEMES[idx].label}
                  {slot.done && !slot.error && (
                    <span className="flex items-center gap-1 ml-auto" style={{ color: SLOT_THEMES[idx].border + "80" }}>
                      <Timer className="w-2.5 h-2.5" />{slot.timeMs}ms
                    </span>
                  )}
                </div>
                <ModelPicker3D
                  value={slot.modelId}
                  onChange={(v) => setModel(idx, v)}
                  disabled={running}
                  theme={SLOT_THEMES[idx]}
                  exclude={slots.filter((_, i) => i !== idx).map(s => s.modelId)}
                />
              </div>
            ))}
          </div>

          {/* Response grid */}
          <div className="relative flex-1 grid grid-cols-3 gap-3 p-4 min-h-0 overflow-hidden">
            {slots.map((slot, idx) => (
              <ResponseCard3D key={idx} slot={slot} idx={idx} isWinner={winnerIdx === idx} />
            ))}
          </div>

          {/* Winner banner */}
          <AnimatePresence>
            {allDone && winnerIdx >= 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="relative mx-4 mb-2 rounded-xl px-4 py-2.5 flex items-center gap-3"
                style={{
                  background: "linear-gradient(90deg, #f59e0b0a, #f59e0b15, #f59e0b0a)",
                  border: "1px solid #f59e0b33",
                  boxShadow: "0 0 20px #f59e0b18",
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#f59e0b22", border: "1px solid #f59e0b44" }}>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-[12px] font-black text-amber-400">
                    {slots[winnerIdx]?.modelId} — الأسرع استجابةً
                  </div>
                  <div className="text-[10px] font-mono text-amber-400/60">
                    {slots[winnerIdx]?.timeMs}ms · {slots[winnerIdx]?.tokens} رمز · {((slots[winnerIdx]?.tokens ?? 0) / (slots[winnerIdx]?.timeMs ?? 1) * 1000).toFixed(1)} rps
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  {slots.map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="text-[8px] font-mono opacity-50" style={{ color: SLOT_THEMES[i].border }}>#{i + 1}</div>
                      <div className="text-[11px] font-black" style={{ color: SLOT_THEMES[i].border }}>{s.timeMs ?? "—"}ms</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar */}
          <div className="relative flex-shrink-0 px-4 pb-4">
            <div className="relative flex gap-2 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(8,8,8,0.95)",
                border: running ? "1px solid rgba(0,229,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: running ? "0 0 20px rgba(0,229,255,0.1)" : "none",
                transition: "all 0.3s",
              }}>
              {/* HUD corners */}
              <span className="absolute top-0.5 left-0.5 w-3 h-3 border-t border-l pointer-events-none" style={{ borderColor: "#00e5ff44" }} />
              <span className="absolute bottom-0.5 right-0.5 w-3 h-3 border-b border-r pointer-events-none" style={{ borderColor: "#a78bfa44" }} />

              <textarea
                ref={inputRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={lang === "ar" ? "اكتب رسالتك لمقارنة 3 نماذج في آنٍ واحد..." : "Compare 3 models simultaneously..."}
                rows={2}
                className="flex-1 bg-transparent px-4 py-3 text-[13px] text-white placeholder:text-white/20 outline-none resize-none font-sans"
                disabled={running}
              />
              <div className="flex items-end gap-1.5 px-3 py-2">
                {running ? (
                  <button onClick={stopAll} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all hover:scale-105"
                    style={{ background: "#e2122712", border: "1px solid #e2122740", color: "#e21227" }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> إيقاف
                  </button>
                ) : (
                  <button onClick={sendMessage} disabled={!message.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all hover:scale-105 disabled:opacity-30 disabled:scale-100"
                    style={{ background: "linear-gradient(135deg, #00e5ff18, #a78bfa15)", border: "1px solid #00e5ff44", color: "#00e5ff", boxShadow: message.trim() ? "0 0 16px #00e5ff22" : "none" }}>
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إرسال للكل</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <div className="flex items-center gap-1 text-[9px] font-mono text-white/20">
                <Sparkles className="w-2.5 h-2.5" />
                Enter لإرسال · Shift+Enter لسطر جديد
              </div>
              <div className="flex items-center gap-3 text-[9px] font-mono">
                {slots.map((s, i) => (
                  <span key={i} className="flex items-center gap-1" style={{ color: SLOT_THEMES[i].border + "60" }}>
                    <Hash className="w-2 h-2" />{s.tokens > 0 ? s.tokens : "—"}
                  </span>
                ))}
                {history.length > 0 && (
                  <span className="flex items-center gap-1 text-white/20">
                    <TrendingUp className="w-2.5 h-2.5" />{history.length} مقارنة
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
