import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  X, Zap, Brain, Code2, Globe, Rocket, Bug, Users, GitBranch,
  Play, Square, ChevronRight, ChevronDown, Layers, Database,
  Shield, Terminal, Cpu, Network, Sparkles, Bot, Search,
  Workflow, Wand2, FlaskConical, Eye, Target, Activity,
  Loader2, CheckCircle2, XCircle, Radio, Send, Copy, RefreshCw,
  Maximize2, BarChart3, Clock, Star, TrendingUp, Lock,
  Server, Package, Settings2, ArrowRight, Hexagon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Mode = "lite" | "autonomous" | "max" | "power" | "turbo";
type Feature = "build" | "plan" | "parallel" | "search" | "debug" | "deploy" | "autofix" | "collaborate";

const MODES: { id: Mode; label: string; color: string; glow: string; desc: string; speed: string }[] = [
  { id: "lite",       label: "LITE",       color: "#64748b", glow: "rgba(100,116,139,0.4)",  desc: "سريع ومركّز",           speed: "0.5×" },
  { id: "autonomous", label: "AUTO",       color: "#8b5cf6", glow: "rgba(139,92,246,0.4)",   desc: "تنفيذ مستقل",           speed: "1×"   },
  { id: "max",        label: "MAX",        color: "#06b6d4", glow: "rgba(6,182,212,0.4)",    desc: "عمق شامل",              speed: "1.5×" },
  { id: "power",      label: "POWER",      color: "#f59e0b", glow: "rgba(245,158,11,0.4)",   desc: "تفكير موسّع",           speed: "2×"   },
  { id: "turbo",      label: "TURBO",      color: "#e21227", glow: "rgba(226,18,39,0.4)",    desc: "أقصى سرعة",             speed: "2.5×" },
];

const FEATURES: { id: Feature; label: string; icon: typeof Brain; color: string; desc: string; endpoint: string }[] = [
  { id: "build",       label: "بناء التطبيقات",       icon: Code2,     color: "#06b6d4", desc: "بناء تطبيق كامل من وصف نصي",         endpoint: "/api/agent4/build"      },
  { id: "plan",        label: "وضع التخطيط",           icon: Layers,    color: "#8b5cf6", desc: "تخطيط ذكي متعدد المراحل للمشروع",    endpoint: "/api/agent4/plan"       },
  { id: "parallel",    label: "وكلاء متوازية",         icon: Network,   color: "#10b981", desc: "تنفيذ متزامن بواسطة وكلاء متعددة",   endpoint: "/api/agent4/parallel"   },
  { id: "search",      label: "بحث الإنترنت",          icon: Globe,     color: "#f59e0b", desc: "بحث وتحليل المعلومات من الويب",       endpoint: "/api/agent4/search"     },
  { id: "debug",       label: "تحليل الأخطاء",         icon: Bug,       color: "#e21227", desc: "تصحيح الأخطاء بشكل تلقائي ومتعمق",   endpoint: "/api/agent4/debug"      },
  { id: "deploy",      label: "النشر الفوري",           icon: Rocket,    color: "#f97316", desc: "خطة نشر كاملة مع CI/CD وDocker",     endpoint: "/api/agent4/deploy"     },
  { id: "autofix",     label: "إصلاح تلقائي",          icon: Wand2,     color: "#ec4899", desc: "اكتشاف وإصلاح المشكلات أوتوماتيكياً", endpoint: "/api/agent4/autofix"    },
  { id: "collaborate", label: "التعاون الجماعي",       icon: Users,     color: "#a78bfa", desc: "إدارة الفريق وتوزيع المهام والإصدارات", endpoint: "/api/agent4/collaborate"},
];

const FIELD_LABELS: Record<Feature, { label: string; placeholder: string; field: string }> = {
  build:       { label: "وصف التطبيق",       placeholder: "مثال: منصة حجز مواعيد للأطباء مع نظام دفع إلكتروني ولوحة إدارة...",   field: "description" },
  plan:        { label: "فكرة المشروع",       placeholder: "مثال: تطبيق إدارة مشاريع للفرق البعيدة مع تتبع الوقت والمهام...",    field: "idea" },
  parallel:    { label: "المهمة الرئيسية",    placeholder: "مثال: بناء منصة SaaS كاملة مع الواجهة والخادم وقاعدة البيانات...",  field: "task" },
  search:      { label: "استعلام البحث",      placeholder: "مثال: أحدث أطر React 2025 مع مقارنة الأداء وأفضل الممارسات...",     field: "query" },
  debug:       { label: "الكود / الخطأ",      placeholder: "الصق الكود أو رسالة الخطأ هنا...",                                  field: "code" },
  deploy:      { label: "وصف التطبيق",       placeholder: "مثال: تطبيق Node.js مع PostgreSQL وRedis على AWS ECS...",            field: "app" },
  autofix:     { label: "وصف المشكلة",       placeholder: "مثال: التطبيق يتعطل عند تحميل الملفات الكبيرة وتظهر رسالة 503...",  field: "description" },
  collaborate: { label: "سياق المشروع",       placeholder: "مثال: فريق من 5 مطورين على مشروع React + Node مفتوح المصدر...",    field: "context" },
};

/* ─── Neural Network Canvas ───────────────────────────────────── */
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const nodesRef = useRef<{ x: number; y: number; vx: number; vy: number; pulse: number; phase: number }[]>([]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let W = 0, H = 0;

    const resize = () => {
      W = cv.offsetWidth; H = cv.offsetHeight;
      cv.width = W; cv.height = H;
      nodesRef.current = Array.from({ length: 60 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        pulse: Math.random(), phase: Math.random() * Math.PI * 2,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const draw = () => {
      t += 0.01;
      ctx.clearRect(0, 0, W, H);

      const nodes = nodesRef.current;
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.pulse = (Math.sin(t * 2 + n.phase) + 1) / 2;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.35;
            const hue = 210 + Math.sin(t + i * 0.1) * 60;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${hue},80%,60%,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });
      });

      nodes.forEach(n => {
        const r = 3 + n.pulse * 3;
        const hue = 200 + n.pulse * 120;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3);
        grad.addColorStop(0, `hsla(${hue},90%,70%,${0.8 + n.pulse * 0.2})`);
        grad.addColorStop(1, `hsla(${hue},90%,70%,0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},100%,85%,${0.9 + n.pulse * 0.1})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(rafRef.current); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" />;
}

/* ─── 3D Rotating Hex Orb ─────────────────────────────────────── */
function HexOrb({ color, size = 80 }: { color: string; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {[1, 0.82, 0.64, 0.46].map((s, i) => (
        <motion.div key={i} className="absolute"
          style={{ width: size * s, height: size * s }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.04, 1] }}
          transition={{ rotate: { duration: 8 + i * 4, repeat: Infinity, ease: "linear" }, scale: { duration: 2 + i, repeat: Infinity } }}>
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5"
              fill="none" stroke={color} strokeWidth={i === 0 ? 1.5 : 1}
              opacity={0.2 + i * 0.1} />
          </svg>
        </motion.div>
      ))}
      <motion.div className="rounded-full flex items-center justify-center"
        style={{
          width: size * 0.4, height: size * 0.4,
          background: `radial-gradient(circle, ${color}cc 0%, ${color}44 60%, transparent 100%)`,
          boxShadow: `0 0 ${size * 0.3}px ${color}88, 0 0 ${size * 0.6}px ${color}33`,
        }}
        animate={{ opacity: [0.7, 1, 0.7], scale: [0.92, 1.08, 0.92] }}
        transition={{ duration: 2, repeat: Infinity }}>
        <Hexagon size={size * 0.15} color="#fff" />
      </motion.div>
      {[0, 120, 240].map((deg, i) => (
        <motion.div key={i} className="absolute" style={{ width: size, height: size }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: "linear" }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 5, height: 5, borderRadius: "50%",
            background: color, opacity: 0.8,
            transform: `rotate(${deg}deg) translate(${size * 0.44}px, -50%)`,
            boxShadow: `0 0 8px ${color}`,
          }} />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Streaming Output ────────────────────────────────────────── */
function StreamOutput({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [text]);

  const lines = text.split("\n");

  return (
    <div className="h-full overflow-y-auto custom-scrollbar font-mono text-xs leading-relaxed p-4 space-y-0.5">
      {lines.map((line, i) => {
        const isHeader = line.startsWith("===") || line.startsWith("##") || line.startsWith("**");
        const isCode = line.startsWith("```") || line.startsWith("    ") || line.startsWith("\t");
        const isCheckbox = line.includes("[ ]") || line.includes("[x]") || line.includes("[X]");
        const isBullet = line.match(/^[-*]\s/);

        return (
          <div key={i} className={
            isHeader ? "text-cyan-300 font-bold mt-3 mb-1 text-sm" :
            isCode ? "text-green-300 bg-[#0d1f0d] px-2 py-0.5 rounded" :
            isCheckbox ? "text-emerald-400" :
            isBullet ? "text-slate-200 pl-2" :
            "text-slate-300"
          }>{line || "\u00a0"}</div>
        );
      })}
      {isStreaming && (
        <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 align-middle" />
      )}
      <div ref={endRef} />
    </div>
  );
}

/* ─── Parallel Agent Visualizer ───────────────────────────────── */
function ParallelAgentViz({ active }: { active: boolean }) {
  const agents = [
    { name: "Frontend", color: "#06b6d4", icon: Code2 },
    { name: "Backend",  color: "#8b5cf6", icon: Server },
    { name: "Database", color: "#10b981", icon: Database },
    { name: "Security", color: "#e21227", icon: Shield },
    { name: "DevOps",   color: "#f59e0b", icon: Package },
  ];
  return (
    <div className="flex gap-3 p-3 bg-[#0a0a0a] rounded-xl border border-[#1f1f1f]">
      {agents.map((ag, i) => (
        <motion.div key={ag.name} className="flex-1 flex flex-col items-center gap-2 p-2 rounded-lg border"
          style={{ borderColor: active ? `${ag.color}44` : "#1f1f1f", background: active ? `${ag.color}08` : "transparent" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: active ? 1 : 0.4, y: 0 }}
          transition={{ delay: i * 0.1 }}>
          <motion.div className="p-2 rounded-lg"
            style={{ background: `${ag.color}22` }}
            animate={active ? { boxShadow: [`0 0 6px ${ag.color}44`, `0 0 16px ${ag.color}88`, `0 0 6px ${ag.color}44`] } : {}}
            transition={{ duration: 1.5 + i * 0.3, repeat: Infinity }}>
            <ag.icon size={14} color={ag.color} />
          </motion.div>
          <span className="text-[10px] font-bold" style={{ color: ag.color }}>{ag.name}</span>
          {active && (
            <motion.div className="w-full h-1 rounded-full overflow-hidden bg-[#1f1f1f]">
              <motion.div className="h-full rounded-full"
                style={{ background: ag.color }}
                animate={{ width: ["0%", "100%", "0%"] }}
                transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut" }} />
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Main Modal ──────────────────────────────────────────────── */
export default function AgentFourModal({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<Mode>("autonomous");
  const [feature, setFeature] = useState<Feature>("build");
  const [input, setInput] = useState("");
  const [errorInput, setErrorInput] = useState("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [phase, setPhase] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { language } = useStore(s => ({ language: s.language }));

  const activeMode = MODES.find(m => m.id === mode)!;
  const activeFeature = FEATURES.find(f => f.id === feature)!;
  const fieldInfo = FIELD_LABELS[feature];

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setPhase("");
  }, []);

  const run = useCallback(async () => {
    const val = input.trim();
    if (!val && feature !== "debug") return;
    if (feature === "debug" && !val && !errorInput.trim()) return;

    stop();
    setOutput("");
    setIsStreaming(true);
    setPhase("initializing");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const body: Record<string, string> = {
      [fieldInfo.field]: val,
      mode,
      language,
    };
    if (feature === "debug" && errorInput.trim()) body.error = errorInput;

    try {
      const res = await fetch(activeFeature.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        setOutput(`خطأ: ${res.status} — ${txt.slice(0, 200)}`);
        setIsStreaming(false);
        setPhase("");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of block.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            try {
              const payload = JSON.parse(trimmed.slice(5));
              if (payload.text)    setOutput(prev => prev + payload.text);
              if (payload.phase)   setPhase(payload.label ?? payload.phase);
              if (payload.ok)      { setIsStreaming(false); setPhase(""); }
              if (payload.message) { setOutput(prev => prev + `\n\nخطأ: ${payload.message}`); setIsStreaming(false); setPhase(""); }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setOutput(`فشل الاتصال: ${(e as Error)?.message ?? "خطأ غير معروف"}`);
      }
    } finally {
      setIsStreaming(false);
      setPhase("");
    }
  }, [input, errorInput, feature, mode, language, activeFeature, fieldInfo, stop]);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const clearAll = useCallback(() => {
    stop();
    setOutput("");
    setInput("");
    setErrorInput("");
    setPhase("");
  }, [stop]);

  useEffect(() => {
    if (!open) stop();
  }, [open, stop]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>

        <motion.div
          className="relative flex flex-col overflow-hidden"
          style={{
            width: "min(1400px, 97vw)", height: "min(900px, 95vh)",
            background: "linear-gradient(135deg, #080808 0%, #0d0d12 50%, #080808 100%)",
            border: "1px solid rgba(6,182,212,0.2)",
            borderRadius: 20,
            boxShadow: `0 0 80px rgba(6,182,212,0.08), 0 0 200px rgba(6,182,212,0.04), inset 0 0 80px rgba(6,182,212,0.02)`,
          }}
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}>

          {/* Neural Canvas Background */}
          <NeuralCanvas />

          {/* Corner Decorations */}
          {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-20 h-20 pointer-events-none`}
              style={{ opacity: 0.25 }}>
              <svg viewBox="0 0 80 80" fill="none">
                <path d={i === 0 ? "M0,30 L0,0 L30,0" : i === 1 ? "M80,30 L80,0 L50,0" : i === 2 ? "M0,50 L0,80 L30,80" : "M80,50 L80,80 L50,80"}
                  stroke="#06b6d4" strokeWidth="1.5" />
              </svg>
            </div>
          ))}

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4">
              <HexOrb color={activeMode.color} size={52} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-widest text-white">AGENT</span>
                  <motion.span
                    className="text-xl font-black tracking-widest"
                    style={{ color: activeMode.color, textShadow: `0 0 20px ${activeMode.color}` }}
                    animate={{ textShadow: [`0 0 10px ${activeMode.color}88`, `0 0 30px ${activeMode.color}`, `0 0 10px ${activeMode.color}88`] }}
                    transition={{ duration: 2, repeat: Infinity }}>4</motion.span>
                  <motion.div
                    className="px-2 py-0.5 rounded text-xs font-bold tracking-widest border"
                    style={{ color: activeMode.color, borderColor: `${activeMode.color}55`, background: `${activeMode.color}11` }}
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}>
                    {activeMode.label}
                  </motion.div>
                  <motion.div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a]"
                    animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Radio size={10} color="#10b981" />
                    <span className="text-[10px] text-emerald-400 font-bold">ONLINE</span>
                  </motion.div>
                </div>
                <p className="text-[11px] text-slate-500 tracking-wide mt-0.5">
                  نظام الذكاء الاصطناعي المتقدم · {activeMode.desc} · {activeMode.speed}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {[
                  { icon: Activity, color: "#10b981", label: "Active" },
                  { icon: Cpu, color: activeMode.color, label: "AI" },
                  { icon: Network, color: "#8b5cf6", label: "Net" },
                ].map((stat, i) => (
                  <motion.div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#111] border border-[#222]"
                    animate={{ borderColor: [`${stat.color}22`, `${stat.color}55`, `${stat.color}22`] }}
                    transition={{ duration: 2 + i * 0.5, repeat: Infinity }}>
                    <stat.icon size={11} color={stat.color} />
                    <span className="text-[10px] font-bold" style={{ color: stat.color }}>{stat.label}</span>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl border border-[#2a2a2a] bg-[#111] text-slate-400 hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="relative flex items-center gap-2 px-6 py-3 border-b border-[#1a1a1a] flex-shrink-0 overflow-x-auto">
            <span className="text-[11px] text-slate-600 font-bold tracking-widest shrink-0">وضع التشغيل:</span>
            {MODES.map(m => (
              <motion.button key={m.id}
                onClick={() => setMode(m.id)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-widest border transition-all shrink-0"
                style={mode === m.id ? {
                  color: m.color, borderColor: `${m.color}55`,
                  background: `${m.color}15`,
                  boxShadow: `0 0 20px ${m.color}33`,
                } : { color: "#666", borderColor: "#222", background: "transparent" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}>
                {mode === m.id && (
                  <motion.div className="absolute inset-0 rounded-xl"
                    style={{ border: `1px solid ${m.color}`, opacity: 0.4 }}
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity }} />
                )}
                <Zap size={11} />
                {m.label}
                <span className="opacity-60 text-[10px]">{m.speed}</span>
              </motion.button>
            ))}
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: Feature List */}
            <div className="w-56 flex-shrink-0 border-r border-[#1a1a1a] flex flex-col gap-1 p-3 overflow-y-auto">
              <p className="text-[10px] text-slate-600 font-bold tracking-widest px-2 mb-1">الأدوات</p>
              {FEATURES.map(f => (
                <motion.button key={f.id}
                  onClick={() => { setFeature(f.id); setOutput(""); setInput(""); setErrorInput(""); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all w-full"
                  style={feature === f.id ? {
                    background: `${f.color}12`,
                    border: `1px solid ${f.color}33`,
                    boxShadow: `0 0 12px ${f.color}22`,
                  } : { border: "1px solid transparent", background: "transparent" }}
                  whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
                  <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: `${f.color}22` }}>
                    {feature === f.id ? (
                      <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                        <f.icon size={13} color={f.color} />
                      </motion.div>
                    ) : <f.icon size={13} color={f.color} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate" style={{ color: feature === f.id ? f.color : "#aaa" }}>
                      {f.label}
                    </div>
                    <div className="text-[9px] text-slate-600 truncate">{f.desc.slice(0, 22)}...</div>
                  </div>
                  {feature === f.id && (
                    <motion.div className="ml-auto w-1 h-6 rounded-full flex-shrink-0"
                      style={{ background: f.color }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }} />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Center: Input + Controls */}
            <div className="flex flex-col flex-1 overflow-hidden">

              {/* Feature Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1a1a1a] flex-shrink-0">
                <div className="p-2 rounded-xl" style={{ background: `${activeFeature.color}22` }}>
                  <activeFeature.icon size={18} color={activeFeature.color} />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{activeFeature.label}</div>
                  <div className="text-[11px] text-slate-500">{activeFeature.desc}</div>
                </div>
                {feature === "parallel" && (
                  <div className="ml-auto">
                    <ParallelAgentViz active={isStreaming} />
                  </div>
                )}
              </div>

              {/* Phase Indicator */}
              <AnimatePresence>
                {phase && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="px-5 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center gap-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Loader2 size={14} color={activeFeature.color} />
                    </motion.div>
                    <span className="text-xs" style={{ color: activeFeature.color }}>{phase}</span>
                    <motion.div className="flex gap-1 ml-2">
                      {[0, 1, 2, 3, 4].map(i => (
                        <motion.div key={i} className="w-1 h-3 rounded-full"
                          style={{ background: activeFeature.color }}
                          animate={{ scaleY: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Area */}
              <div className="flex flex-col gap-3 p-4 border-b border-[#1a1a1a] flex-shrink-0">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-slate-500 font-bold tracking-widest">{fieldInfo.label}</label>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={fieldInfo.placeholder}
                    rows={feature === "debug" ? 4 : 4}
                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run(); }}
                    className="w-full resize-none rounded-xl bg-[#0d0d0d] border border-[#222] text-slate-200 text-xs px-4 py-3 outline-none placeholder-slate-600 font-mono focus:border-[#333] transition-colors"
                    style={{ minHeight: 90 }}
                    dir="auto"
                  />
                </div>

                {feature === "debug" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] text-slate-500 font-bold tracking-widest">رسالة الخطأ (اختياري)</label>
                    <textarea
                      value={errorInput}
                      onChange={e => setErrorInput(e.target.value)}
                      placeholder="الصق رسالة الخطأ أو Stack Trace هنا..."
                      rows={3}
                      className="w-full resize-none rounded-xl bg-[#0d0d0d] border border-red-500/20 text-red-300 text-xs px-4 py-3 outline-none placeholder-red-900 font-mono focus:border-red-500/40 transition-colors"
                      dir="auto"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={isStreaming ? stop : run}
                    disabled={!isStreaming && !input.trim() && !(feature === "debug" && errorInput.trim())}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                    style={{
                      background: isStreaming
                        ? "rgba(239,68,68,0.15)"
                        : `${activeFeature.color}22`,
                      border: `1px solid ${isStreaming ? "rgba(239,68,68,0.4)" : `${activeFeature.color}44`}`,
                      color: isStreaming ? "#ef4444" : activeFeature.color,
                      boxShadow: isStreaming ? "0 0 20px rgba(239,68,68,0.2)" : `0 0 20px ${activeFeature.color}22`,
                    }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    {isStreaming ? <Square size={14} /> : <Play size={14} />}
                    {isStreaming ? "إيقاف" : "تشغيل"}
                    <span className="text-[10px] opacity-60">Ctrl+Enter</span>
                  </motion.button>

                  <button onClick={clearAll}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-slate-500 border border-[#222] bg-[#111] hover:text-white hover:border-[#333] transition-all">
                    <RefreshCw size={12} />
                    مسح
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <div className="text-[10px] text-slate-600">
                      {input.length > 0 && <span>{input.length} حرف</span>}
                    </div>
                    {output && (
                      <motion.div className="flex items-center gap-1 text-[10px] text-emerald-400"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <CheckCircle2 size={11} />
                        {output.length} حرف ناتج
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Output */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Terminal size={12} color={activeFeature.color} />
                    <span className="text-[11px] font-bold text-slate-500 tracking-widest">الناتج</span>
                    {isStreaming && (
                      <motion.div className="flex items-center gap-1 text-[10px]"
                        style={{ color: activeFeature.color }}
                        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
                        <Loader2 size={10} className="animate-spin" />
                        يعمل...
                      </motion.div>
                    )}
                  </div>
                  {output && (
                    <button onClick={copyOutput}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] text-slate-500 hover:text-white hover:bg-[#1f1f1f] transition-all border border-[#1f1f1f]">
                      {copied ? <><CheckCircle2 size={11} color="#10b981" />تم النسخ</> : <><Copy size={11} />نسخ</>}
                    </button>
                  )}
                </div>

                {output ? (
                  <StreamOutput text={output} isStreaming={isStreaming} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                    <HexOrb color={activeFeature.color} size={100} />
                    <div className="text-center">
                      <div className="text-slate-500 text-sm font-bold mb-1">{activeFeature.label}</div>
                      <div className="text-slate-700 text-xs">{activeFeature.desc}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                      {[
                        { icon: Zap,        label: "معالجة فائقة السرعة" },
                        { icon: Brain,      label: "ذكاء اصطناعي متقدم"  },
                        { icon: Shield,     label: "نتائج دقيقة وموثوقة" },
                        { icon: Sparkles,   label: "إخراج احترافي"       },
                      ].map((item, i) => (
                        <motion.div key={i}
                          className="flex items-center gap-2 p-2 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}>
                          <item.icon size={13} color={activeFeature.color} />
                          <span className="text-[11px] text-slate-500">{item.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Stats & Quick Actions */}
            <div className="w-52 flex-shrink-0 border-l border-[#1a1a1a] flex flex-col gap-3 p-3 overflow-y-auto">

              {/* Mode Stats */}
              <div className="p-3 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
                <div className="text-[10px] text-slate-600 font-bold tracking-widest mb-3">إحصائيات الوضع</div>
                {[
                  { label: "السرعة",   value: activeMode.speed, color: activeMode.color },
                  { label: "العمق",    value: mode === "max" ? "∞" : mode === "power" ? "عالي" : mode === "turbo" ? "سريع" : mode === "autonomous" ? "متوسط" : "أساسي", color: activeMode.color },
                  { label: "الوضع",    value: activeMode.label, color: activeMode.color },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-600">{s.label}</span>
                    <motion.span className="text-[10px] font-bold" style={{ color: s.color }}
                      animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                      {s.value}
                    </motion.span>
                  </div>
                ))}
              </div>

              {/* Quick Templates */}
              <div>
                <div className="text-[10px] text-slate-600 font-bold tracking-widest mb-2">قوالب سريعة</div>
                {[
                  { label: "منصة SaaS",            val: "أنشئ منصة SaaS لإدارة المشاريع مع نظام اشتراك وتعدد المستأجرين" },
                  { label: "تطبيق مبيعات",          val: "تطبيق موبايل للمبيعات مع تتبع العملاء والطلبات ولوحة تحليلات" },
                  { label: "نظام AI Chatbot",       val: "نظام دعم عملاء ذكي بالعربية والإنجليزية مع RAG وقاعدة معرفة" },
                  { label: "متجر إلكتروني",          val: "متجر تجارة إلكترونية مع مخزون ودفع وشحن وتقييمات" },
                ].map((t, i) => (
                  <motion.button key={i}
                    onClick={() => { setInput(t.val); }}
                    className="w-full text-right px-2.5 py-2 rounded-lg text-[10px] text-slate-400 hover:text-white hover:bg-[#1a1a1a] transition-all border border-transparent hover:border-[#2a2a2a] mb-1 block"
                    whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
                    <div className="flex items-center gap-1.5">
                      <ArrowRight size={10} color={activeFeature.color} />
                      {t.label}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* System Status */}
              <div className="p-3 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] mt-auto">
                <div className="text-[10px] text-slate-600 font-bold tracking-widest mb-3">حالة النظام</div>
                {[
                  { label: "نموذج الذكاء",  ok: true  },
                  { label: "خادم API",       ok: true  },
                  { label: "شبكة الاتصال",   ok: true  },
                  { label: "الذاكرة",        ok: true  },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-600">{s.label}</span>
                    <div className="flex items-center gap-1">
                      <motion.div className="w-1.5 h-1.5 rounded-full"
                        style={{ background: s.ok ? "#10b981" : "#e21227" }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }} />
                      <span className="text-[10px]" style={{ color: s.ok ? "#10b981" : "#e21227" }}>
                        {s.ok ? "نشط" : "خطأ"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feature Info */}
              <motion.div className="p-3 rounded-xl border"
                style={{ borderColor: `${activeFeature.color}22`, background: `${activeFeature.color}06` }}
                key={feature}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <activeFeature.icon size={11} color={activeFeature.color} />
                  <span className="text-[10px] font-bold" style={{ color: activeFeature.color }}>{activeFeature.label}</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">{activeFeature.desc}</p>
              </motion.div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between px-5 py-2 border-t border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-3">
              {[
                { icon: Brain,    label: "AI متقدم",         color: "#8b5cf6" },
                { icon: Workflow, label: "متوازي",            color: "#10b981" },
                { icon: Globe,    label: "بحث ويب",           color: "#f59e0b" },
                { icon: Lock,     label: "آمن",               color: "#06b6d4" },
              ].map((tag, i) => (
                <motion.div key={i} className="flex items-center gap-1 text-[10px]"
                  style={{ color: tag.color }}
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}>
                  <tag.icon size={10} />
                  {tag.label}
                </motion.div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <motion.div className="text-[10px] text-slate-700"
                animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity }}>
                AGENT 4 · SYSTEM ONLINE · {new Date().getFullYear()}
              </motion.div>
              <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
