import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

// ── Provider priority pool ────────────────────────────────────────────────────
const PROVIDER_PRIORITY: Array<{
  id: string;
  name: string;
  color: string;
  baseURL: string;
  bestModel: string;
  bestModelLabel: string;
  requiresKey: boolean;
  category: string;
}> = [
  { id: "groq",       name: "Groq",          color: "#ff6600", baseURL: "https://api.groq.com/openai/v1",                              bestModel: "llama-3.3-70b-versatile",         bestModelLabel: "Llama 3.3 70B",          requiresKey: true,  category: "سرعة فائقة" },
  { id: "openai",     name: "OpenAI",         color: "#00ff41", baseURL: "https://api.openai.com/v1",                                   bestModel: "gpt-4o",                          bestModelLabel: "GPT-4o",                 requiresKey: true,  category: "متعدد الأغراض" },
  { id: "anthropic",  name: "Anthropic",      color: "#00e5ff", baseURL: "https://api.anthropic.com/v1",                                bestModel: "claude-sonnet-4-5",               bestModelLabel: "Claude Sonnet 4.5",      requiresKey: true,  category: "استدلال عميق" },
  { id: "gemini",     name: "Google Gemini",  color: "#00bfff", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",     bestModel: "gemini-2.5-flash",                bestModelLabel: "Gemini 2.5 Flash",       requiresKey: true,  category: "متعدد الوسائط" },
  { id: "openrouter", name: "OpenRouter",     color: "#ff0080", baseURL: "https://openrouter.ai/api/v1",                                bestModel: "deepseek/deepseek-chat-v3-0324",  bestModelLabel: "DeepSeek V3",            requiresKey: true,  category: "300+ نموذج" },
  { id: "deepseek",   name: "DeepSeek",       color: "#00ffcc", baseURL: "https://api.deepseek.com/v1",                                 bestModel: "deepseek-chat",                   bestModelLabel: "DeepSeek V3 Direct",     requiresKey: true,  category: "استدلال" },
  { id: "xai",        name: "xAI Grok",       color: "#ff3333", baseURL: "https://api.x.ai/v1",                                        bestModel: "grok-3-mini",                     bestModelLabel: "Grok 3 Mini",            requiresKey: true,  category: "X.ai" },
  { id: "mistral",    name: "Mistral AI",     color: "#ffcc00", baseURL: "https://api.mistral.ai/v1",                                   bestModel: "mistral-large-latest",            bestModelLabel: "Mistral Large",          requiresKey: true,  category: "أوروبي" },
  { id: "perplexity", name: "Perplexity",     color: "#00ff99", baseURL: "https://api.perplexity.ai",                                   bestModel: "sonar-pro",                       bestModelLabel: "Sonar Pro",              requiresKey: true,  category: "بحث ويب" },
  { id: "together",   name: "Together AI",    color: "#bf00ff", baseURL: "https://api.together.xyz/v1",                                 bestModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", bestModelLabel: "Llama 3.3 70B",  requiresKey: true,  category: "مفتوح المصدر" },
  { id: "fireworks",  name: "Fireworks AI",   color: "#ff9900", baseURL: "https://api.fireworks.ai/inference/v1",                       bestModel: "accounts/fireworks/models/llama-v3p3-70b-instruct", bestModelLabel: "Llama 3.3 70B", requiresKey: true, category: "سرعة عالية" },
  { id: "cohere",     name: "Cohere",         color: "#0099ff", baseURL: "https://api.cohere.com/v1",                                   bestModel: "command-r-plus",                  bestModelLabel: "Command R+",             requiresKey: true,  category: "مؤسسي" },
  { id: "github",     name: "GitHub Models",  color: "#ccff00", baseURL: "https://models.inference.ai.azure.com",                       bestModel: "gpt-4o",                          bestModelLabel: "GPT-4o (مجاني)",         requiresKey: true,  category: "مجاني" },
  { id: "nvidia",     name: "NVIDIA NIM",     color: "#76ff00", baseURL: "https://integrate.api.nvidia.com/v1",                         bestModel: "meta/llama-3.3-70b-instruct",     bestModelLabel: "Llama 3.3 70B NIM",      requiresKey: true,  category: "GPU فائق" },
  { id: "ollama",     name: "Ollama",         color: "#00ff41", baseURL: "http://localhost:11434/v1",                                   bestModel: "llama3.2",                        bestModelLabel: "Llama 3.2 (محلي)",       requiresKey: false, category: "محلي" },
  { id: "lmstudio",   name: "LM Studio",      color: "#ff00cc", baseURL: "http://localhost:1234/v1",                                    bestModel: "local-model",                     bestModelLabel: "نموذج محلي",             requiresKey: false, category: "محلي" },
];

const KEY_PREFIX = "mr7-ai-p-key-";
const URL_PREFIX = "mr7-ai-p-url-";
const INIT_DONE_KEY = "mr7-ai-autoinit-done";
const KEY_POOL_STORAGE = "mr7-ai-key-pool";
const ACTIVE_POOL_IDX  = "mr7-ai-pool-active-idx";

type DetectedProvider = typeof PROVIDER_PRIORITY[0] & { key: string; url: string };

// ── Multi-key pool helpers ────────────────────────────────────────────────────
export function detectAllConfiguredProviders(): DetectedProvider[] {
  const found: DetectedProvider[] = [];
  for (const p of PROVIDER_PRIORITY) {
    if (p.requiresKey) {
      const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
      if (key && key.length > 10) {
        const url = localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL;
        found.push({ ...p, key, url });
      }
    } else {
      found.push({ ...p, key: "", url: p.baseURL });
    }
  }
  return found;
}

export function detectConfiguredProvider(): DetectedProvider | null {
  return detectAllConfiguredProviders()[0] ?? null;
}

export function getKeyPool(): DetectedProvider[] {
  try {
    const raw = localStorage.getItem(KEY_POOL_STORAGE);
    if (!raw) return detectAllConfiguredProviders();
    return JSON.parse(raw) as DetectedProvider[];
  } catch { return []; }
}

export function rotateToNextKey(): DetectedProvider | null {
  const pool = getKeyPool();
  if (pool.length === 0) return null;
  const cur = parseInt(localStorage.getItem(ACTIVE_POOL_IDX) ?? "0", 10);
  const next = (cur + 1) % pool.length;
  localStorage.setItem(ACTIVE_POOL_IDX, String(next));
  return pool[next];
}

// ── 3D Neural Sphere Canvas ───────────────────────────────────────────────────
type Phase = "boot" | "scanning" | "found" | "loading" | "ready" | "no-provider";

function NeuralSphere3D({ phase, providerColor }: { phase: Phase; providerColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.32;

    const isReady    = phase === "ready";
    const isScanning = phase === "scanning" || phase === "found" || phase === "loading";

    const nodeCount = 48;
    const nodes = Array.from({ length: nodeCount }, (_, i) => {
      const phi   = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return { x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi), pulseOffset: Math.random() * Math.PI * 2 };
    });

    const edges: [number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.72) edges.push([i, j]);
      }
    }

    const particles = Array.from({ length: 100 }, () => ({
      angle: Math.random() * Math.PI * 2,
      orbit: R * (0.7 + Math.random() * 0.9),
      speed: (0.003 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1),
      y:     (Math.random() - 0.5) * R * 1.4,
      size:  1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.6,
    }));

    // Data streams (radial lines shooting outward)
    const streams = Array.from({ length: 12 }, () => ({
      angle:    Math.random() * Math.PI * 2,
      speed:    0.004 + Math.random() * 0.008,
      len:      R * (0.3 + Math.random() * 0.4),
      progress: Math.random(),
    }));

    function draw() {
      tRef.current += 0.012;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      const rotY = t * 0.4;
      const rotX = Math.sin(t * 0.15) * 0.3;
      const sinY = Math.sin(rotY), cosY = Math.cos(rotY);
      const sinX = Math.sin(rotX), cosX = Math.cos(rotX);

      const base = isReady ? providerColor : "#e21227";

      const proj = nodes.map(n => {
        let { x, y, z } = n;
        const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
        const scale = R / (1.6 - z2 * 0.4);
        return { sx: cx + x1 * scale, sy: cy + y2 * scale, depth: z2, pulse: Math.sin(t * 2 + n.pulseOffset) * 0.5 + 0.5 };
      });

      // Edges
      edges.forEach(([a, b]) => {
        const pa = proj[a], pb = proj[b];
        const avgD = (pa.depth + pb.depth) / 2;
        const alpha = isScanning
          ? (0.08 + (avgD + 1) * 0.12) * (0.6 + Math.sin(t * 3 + a * 0.5) * 0.3)
          : 0.06 + (avgD + 1) * 0.10;
        ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = base + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 0.8; ctx.stroke();
      });

      // Nodes
      proj.forEach(p => {
        const br = (p.depth + 1) / 2;
        const r  = (isScanning ? 2.5 + p.pulse * 1.5 : 2) * br;
        const al = isReady ? 0.7 + p.pulse * 0.3 : 0.3 + br * 0.5;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = base + Math.floor(al * 255).toString(16).padStart(2, "0"); ctx.fill();
        if (isScanning && p.pulse > 0.8) {
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = base + "22"; ctx.fill();
        }
      });

      // Outer ring
      const ringA = isScanning ? 0.25 + Math.sin(t * 2) * 0.1 : 0.12;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.strokeStyle = base + Math.floor(ringA * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1.2; ctx.stroke();

      // Second ring
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.38, 0, Math.PI * 2);
      ctx.strokeStyle = base + "12"; ctx.lineWidth = 0.5; ctx.stroke();

      // Scan arc
      if (isScanning) {
        const sweep = ((t * 1.2) % (Math.PI * 2));
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, sweep, sweep + 1.2);
        ctx.strokeStyle = base + "cc"; ctx.lineWidth = 2; ctx.stroke();
        // Scan beam fill
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R * 1.18, sweep, sweep + 1.2);
        ctx.closePath();
        ctx.fillStyle = base + "08"; ctx.fill();
      }

      // Data stream lines (scanning only)
      if (isScanning) {
        streams.forEach(s => {
          s.progress = (s.progress + s.speed) % 1;
          const startR = R * 0.3 + s.progress * s.len;
          const endR   = startR + s.len * 0.25;
          const sx1 = cx + Math.cos(s.angle) * startR;
          const sy1 = cy + Math.sin(s.angle) * startR;
          const sx2 = cx + Math.cos(s.angle) * endR;
          const sy2 = cy + Math.sin(s.angle) * endR;
          ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2);
          const streamGrad = ctx.createLinearGradient(sx1, sy1, sx2, sy2);
          streamGrad.addColorStop(0, base + "00");
          streamGrad.addColorStop(0.5, base + "99");
          streamGrad.addColorStop(1, base + "00");
          ctx.strokeStyle = streamGrad; ctx.lineWidth = 1; ctx.stroke();
        });
      }

      // Particles
      particles.forEach(p => {
        p.angle += p.speed;
        const px = cx + Math.cos(p.angle) * Math.sqrt(p.orbit * p.orbit - p.y * p.y * 0.3);
        const py = cy + p.y + Math.sin(p.angle) * p.orbit * 0.18;
        ctx.beginPath(); ctx.arc(px, py, p.size * (isReady ? 1.3 : 0.8), 0, Math.PI * 2);
        ctx.fillStyle = base + Math.floor(p.alpha * (isReady ? 200 : 120)).toString(16).padStart(2, "0");
        ctx.fill();
      });

      // Core glow
      const glowR = R * (0.18 + Math.sin(t * 1.5) * 0.04);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      grd.addColorStop(0, base + "66"); grd.addColorStop(0.6, base + "22"); grd.addColorStop(1, base + "00");
      ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      // Ready pulse rings
      if (isReady) {
        for (let i = 0; i < 3; i++) {
          const pr = R * (0.5 + ((t * 0.7 + i * 0.8) % 1.5));
          const pa = Math.max(0, 0.4 - pr / R * 0.3);
          ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = base + Math.floor(pa * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 1.5; ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, providerColor]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />;
}

// ── Provider Card (in the found list) ────────────────────────────────────────
function ProviderCard({
  provider,
  index,
  isActive,
  onClick,
}: {
  provider: DetectedProvider;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
      style={{
        background: isActive ? provider.color + "18" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? provider.color + "55" : "rgba(255,255,255,0.07)"}`,
        boxShadow: isActive ? `0 0 16px ${provider.color}22` : "none",
      }}
      whileHover={{ scale: 1.01, background: provider.color + "14" }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Color dot */}
      <motion.div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: provider.color, boxShadow: `0 0 8px ${provider.color}` }}
        animate={isActive ? { opacity: [0.7, 1], scale: [0.9, 1.1] } : { opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-bold truncate">{provider.name}</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider"
            style={{ background: provider.color + "22", color: provider.color }}
          >
            {provider.category}
          </span>
        </div>
        <div className="text-[10px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
          {provider.bestModelLabel}
        </div>
      </div>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: provider.color + "33", color: provider.color }}
        >
          نشط
        </motion.div>
      )}
    </motion.button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AIAutoSetup3D({ onComplete }: { onComplete: () => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [phase,             setPhase]             = useState<Phase>("boot");
  const [log,               setLog]               = useState<string[]>([]);
  const [allProviders,      setAllProviders]       = useState<DetectedProvider[]>([]);
  const [activeIdx,         setActiveIdx]          = useState(0);
  const [progress,          setProgress]           = useState(0);
  const [showProviderList,  setShowProviderList]   = useState(false);
  const [poolMode,          setPoolMode]           = useState(false);
  const doneRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-7), msg]);
  }, []);

  const activateProvider = useCallback((p: DetectedProvider, idx: number) => {
    setActiveIdx(idx);
    localStorage.setItem(ACTIVE_POOL_IDX, String(idx));
    dispatch({ type: "SET_PROVIDER", provider: p.id as never, providerModel: p.bestModel });
    dispatch({ type: "SET_MODEL", model: p.bestModelLabel });
  }, [dispatch]);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const run = async () => {
      // Boot
      setPhase("boot");
      addLog("[ KaliGPT ] تهيئة نواة الذكاء الاصطناعي v3.0 ARSENAL MODE PRO...");
      await delay(400);
      addLog("[ SYS ] فحص طبقة التشفير AES-256...");
      await delay(350);
      addLog("[ NET ] فتح قناة البيانات الآمنة...");
      await delay(300);
      setProgress(12);

      // Scanning
      setPhase("scanning");
      addLog("[ SCAN ] البحث الشامل عن مزودي API...");
      await delay(350);
      setProgress(25);

      const ALL_IDS = PROVIDER_PRIORITY.map(p => p.id);
      for (const pid of ALL_IDS) {
        addLog(`[ SCAN ] ${pid}...`);
        await delay(45);
      }
      setProgress(52);

      const found = detectAllConfiguredProviders();

      // Check personal key in store
      const personalKey = state.settings?.personalApiKey?.trim();
      if (personalKey && personalKey.length > 10 && !found.find(f => f.id === "personal")) {
        found.unshift({
          id: "personal", name: "Personal API", color: "#e21227",
          baseURL: state.settings?.personalApiBaseURL || "https://api.openai.com/v1",
          bestModel: "gpt-4o", bestModelLabel: "GPT-4o", requiresKey: false,
          category: "شخصي", key: personalKey,
          url: state.settings?.personalApiBaseURL || "https://api.openai.com/v1",
        });
      }

      if (found.length === 0) {
        setPhase("no-provider");
        addLog("[ WARN ] لم يتم العثور على مفتاح API مضبوط");
        addLog("[ INFO ] افتح إعدادات AI لإضافة مفتاح");
        setProgress(100);
        return;
      }

      // Found providers
      setAllProviders(found);
      setShowProviderList(true);
      setPhase("found");
      addLog(`[ FOUND ] ${found.length} مزود متاح:`);
      found.forEach(p => addLog(`  ✓ ${p.name} — ${p.bestModelLabel}`));
      setProgress(65);
      await delay(500);

      if (found.length > 1) {
        setPoolMode(true);
        // Save to pool
        localStorage.setItem(KEY_POOL_STORAGE, JSON.stringify(found));
        localStorage.setItem(ACTIVE_POOL_IDX, "0");
        addLog(`[ POOL ] تم إنشاء مجموعة دوران: ${found.length} مفاتيح`);
        setProgress(75);
        await delay(300);
      }

      // Use first provider
      const primary = found[0];
      setPhase("loading");
      addLog(`[ MODEL ] تحميل: ${primary.bestModelLabel}...`);
      setProgress(85);
      await delay(300);
      addLog(`[ SYS ] ضبط المعاملات الأمثل...`);
      setProgress(93);
      await delay(200);

      activateProvider(primary, 0);

      addLog(`[ OK ] النظام جاهز — ${primary.name} / ${primary.bestModelLabel}`);
      if (found.length > 1) addLog(`[ POOL ] الدوران التلقائي: ${found.length} مفاتيح نشطة`);
      setProgress(100);
      setPhase("ready");
      await delay(1400);

      toast({
        description: found.length > 1
          ? `تم تفعيل ${found.length} مزودين — الدوران التلقائي نشط`
          : `تم تفعيل ${primary.name} — ${primary.bestModelLabel} تلقائياً`,
      });

      await delay(600);
      onComplete();
    };

    run();
  }, []);

  const activeProv = allProviders[activeIdx];
  const providerColor = activeProv?.color ?? "#e21227";

  const PHASE_LABELS: Record<Phase, string> = {
    boot:          "تشغيل النظام",
    scanning:      "فحص المزودين",
    found:         `تم اكتشاف ${allProviders.length} مزود`,
    loading:       "تحميل النموذج",
    ready:         "النظام جاهز",
    "no-provider": "لا يوجد مزود",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.97)" }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            `linear-gradient(${providerColor}55 1px, transparent 1px),` +
            `linear-gradient(90deg, ${providerColor}55 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
        }}
      />

      {/* Corner HUD decorations */}
      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-16 h-16 pointer-events-none opacity-30`}
          style={{
            borderTop: i < 2 ? `2px solid ${providerColor}` : "none",
            borderBottom: i >= 2 ? `2px solid ${providerColor}` : "none",
            borderLeft: i % 2 === 0 ? `2px solid ${providerColor}` : "none",
            borderRight: i % 2 === 1 ? `2px solid ${providerColor}` : "none",
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-5 w-full max-w-sm px-5">

        {/* 3D Sphere */}
        <motion.div
          className="relative"
          style={{ width: 200, height: 200 }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <NeuralSphere3D phase={phase} providerColor={providerColor} />

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.3 }}
                transition={{ duration: 0.28 }}
                className="text-center"
              >
                {phase === "ready" ? (
                  <motion.div
                    animate={{ boxShadow: [`0 0 20px ${providerColor}66`, `0 0 40px ${providerColor}aa`, `0 0 20px ${providerColor}66`] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{
                      background: `radial-gradient(circle, ${providerColor}44, transparent)`,
                      border: `2px solid ${providerColor}`,
                      color: providerColor,
                    }}
                  >
                    ✓
                  </motion.div>
                ) : phase === "no-provider" ? (
                  <div className="text-3xl" style={{ color: "#f59e0b" }}>⚠</div>
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 rounded-full border-2"
                    style={{ borderColor: providerColor, borderTopColor: "transparent" }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-[10px] font-bold tracking-[0.5em] uppercase mb-1" style={{ color: providerColor }}>
            KaliGPT — NEURAL CORE v3.0
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={phase + allProviders.length}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="text-white text-lg font-bold"
            >
              {PHASE_LABELS[phase]}
            </motion.div>
          </AnimatePresence>

          {/* Pool mode badge */}
          <AnimatePresence>
            {poolMode && allProviders.length > 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold tracking-wider"
                style={{ background: "#10b98118", border: "1px solid #10b98144", color: "#10b981" }}
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                />
                وضع الدوران — {allProviders.length} مفاتيح
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full space-y-1">
          <div className="w-full h-[3px] bg-white/8 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${providerColor}88, ${providerColor})` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>0%</span>
            <span style={{ color: providerColor }}>{progress}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Provider list */}
        <AnimatePresence>
          {showProviderList && allProviders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="w-full space-y-1.5"
            >
              <div className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                المزودون المكتشفون ({allProviders.length})
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {allProviders.map((p, i) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    index={i}
                    isActive={i === activeIdx}
                    onClick={() => {
                      if (phase === "ready") {
                        activateProvider(p, i);
                        toast({ description: `تم التبديل إلى ${p.name}` });
                      }
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terminal log */}
        <div
          className="w-full rounded-xl p-3 font-mono text-[10px] space-y-0.5 min-h-[90px]"
          style={{ background: "#060606", border: "1px solid #1a1a1a", boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center gap-1.5 mb-2 pb-1.5" style={{ borderBottom: "1px solid #1a1a1a" }}>
            <div className="w-2 h-2 rounded-full bg-red-500/60" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
            <div className="w-2 h-2 rounded-full bg-green-500/60" />
            <span className="text-[9px] ml-1" style={{ color: "rgba(255,255,255,0.2)" }}>neural-core — bash</span>
          </div>
          <AnimatePresence>
            {log.map((line, i) => (
              <motion.div
                key={i + line}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
                style={{
                  color: line.includes("FOUND") || line.includes("OK") || line.includes("✓")
                    ? providerColor
                    : line.includes("WARN")
                    ? "#f59e0b"
                    : line.includes("POOL")
                    ? "#10b981"
                    : "#4ade80",
                }}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
          <motion.span
            className="inline-block w-2 h-3 ml-0.5 align-bottom"
            style={{ background: providerColor }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.55, repeat: Infinity }}
          />
        </div>

        {/* No-provider panel */}
        <AnimatePresence>
          {phase === "no-provider" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-xl p-4 text-center space-y-2"
              style={{ background: "#1a1200", border: "1px solid #f59e0b33" }}
            >
              <div className="text-sm text-yellow-400 font-bold">لم يتم العثور على مزود AI</div>
              <div className="text-[11px] text-gray-400 leading-5">
                افتح إعدادات الذكاء الاصطناعي من زر
                <span className="text-white font-bold mx-1">⚙ AI</span>
                في الشريط العلوي، أدخل مفتاح API الخاص بك
              </div>
              <div className="text-[10px] text-gray-500 leading-5">
                يدعم: Groq (مجاني) · OpenAI · Anthropic · Gemini · OpenRouter · DeepSeek و 10+ مزود آخر
              </div>
              <button
                onClick={onComplete}
                className="mt-2 px-5 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: "#e2122218", border: "1px solid #e2122244", color: "#e21227" }}
              >
                متابعة بدون مزود
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
