import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ProviderName } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const KEY_PREFIX = "mr7-ai-p-key-";
const URL_PREFIX = "mr7-ai-p-url-";

interface ProviderConfig {
  id: string; name: string; baseURL: string; bestModel: string;
  bestModelLabel: string; providerName: ProviderName; color: string;
}

const PROVIDER_PRIORITY: ProviderConfig[] = [
  { id:"groq",       name:"Groq",       color:"#f59e0b", baseURL:"https://api.groq.com/openai/v1",                          bestModel:"llama-3.3-70b-versatile",        bestModelLabel:"Llama 3.3 70B",     providerName:"groq"       },
  { id:"openai",     name:"OpenAI",     color:"#10b981", baseURL:"https://api.openai.com/v1",                               bestModel:"gpt-4o",                         bestModelLabel:"GPT-4o",            providerName:"openai"     },
  { id:"anthropic",  name:"Anthropic",  color:"#f97316", baseURL:"https://api.anthropic.com/v1",                            bestModel:"claude-sonnet-4-5",              bestModelLabel:"Claude Sonnet 4.5", providerName:"anthropic"  },
  { id:"gemini",     name:"Gemini",     color:"#3b82f6", baseURL:"https://generativelanguage.googleapis.com/v1beta/openai", bestModel:"gemini-2.5-flash",               bestModelLabel:"Gemini 2.5 Flash",  providerName:"gemini"     },
  { id:"openrouter", name:"OpenRouter", color:"#8b5cf6", baseURL:"https://openrouter.ai/api/v1",                            bestModel:"deepseek/deepseek-chat-v3-0324", bestModelLabel:"DeepSeek V3",       providerName:"openrouter" },
  { id:"deepseek",   name:"DeepSeek",   color:"#06b6d4", baseURL:"https://api.deepseek.com/v1",                             bestModel:"deepseek-chat",                  bestModelLabel:"DeepSeek V3",       providerName:"personal"   },
  { id:"xai",        name:"xAI Grok",   color:"#6b7280", baseURL:"https://api.x.ai/v1",                                    bestModel:"grok-3-mini",                    bestModelLabel:"Grok 3 Mini",       providerName:"personal"   },
  { id:"mistral",    name:"Mistral",    color:"#ec4899", baseURL:"https://api.mistral.ai/v1",                               bestModel:"mistral-large-latest",           bestModelLabel:"Mistral Large",     providerName:"personal"   },
];

type Phase = "idle" | "scanning" | "done" | "fail";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ── Full 3D Orbital Canvas ──────────────────────────────────────────────────
function OrbitalCanvas({ phase, color }: { phase: Phase; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const frameRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = 52, H = 52;
    canvas.width = W; canvas.height = H;
    const cx = W / 2, cy = H / 2;
    const [pr, pg, pb] = hexToRgb(color);
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    const rgba = (a: number) => `#${toHex(pr)}${toHex(pg)}${toHex(pb)}${toHex(a * 255)}`;

    // Orbital particles (3 rings, bigger)
    const orbs = Array.from({ length: 11 }, (_, i) => ({
      angle: (i / 11) * Math.PI * 2,
      speed: 0.018 + (i % 3) * 0.005,
      radius: i < 4 ? 17 : i < 8 ? 20 : 23,
      tiltX: 0.25 + (i / 11) * 0.9,
      size: 1.0 + (i % 3) * 0.5,
    }));

    // Data stream lines (scanning)
    const streams = Array.from({ length: 10 }, (_, i) => ({
      angle: (i / 10) * Math.PI * 2,
      len: 4 + Math.random() * 6,
      speed: 0.035 + Math.random() * 0.03,
      phase: Math.random() * Math.PI * 2,
    }));

    function draw() {
      frameRef.current++;
      const f = frameRef.current;
      ctx.clearRect(0, 0, W, H);

      const scanning = phase === "scanning";
      const done     = phase === "done";
      const fail     = phase === "fail";

      // Outer glow ring
      const glowR = 22 + Math.sin(f * 0.05) * 1.5;
      const outerG = ctx.createRadialGradient(cx, cy, glowR * 0.7, cx, cy, glowR * 1.4);
      outerG.addColorStop(0, rgba(0.22));
      outerG.addColorStop(1, rgba(0));
      ctx.beginPath();
      ctx.arc(cx, cy, glowR * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = outerG;
      ctx.fill();

      // Orbit ellipses (3 rings, bigger)
      const rings = [
        { rx: 19, ry: 5.5, rot: f * 0.011,  alpha: 0.28 },
        { rx: 16, ry: 7.5, rot: -f * 0.015, alpha: 0.20 },
        { rx: 12, ry: 10,  rot: f * 0.009,  alpha: 0.15 },
      ];
      rings.forEach(ring => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ring.alpha);
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
      });

      // Scanning beam
      if (scanning) {
        const beamAngle = (f * 0.05) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(beamAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 18, -0.35, 0.35);
        ctx.closePath();
        const sweepG = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
        sweepG.addColorStop(0, rgba(0.55));
        sweepG.addColorStop(1, rgba(0.08));
        ctx.fillStyle = sweepG;
        ctx.fill();
        ctx.restore();

        // Data stream lines
        streams.forEach(s => {
          const a = s.angle + f * s.speed;
          const pulse = (Math.sin(f * 0.08 + s.phase) + 1) / 2;
          const startR = 6 + pulse * 2;
          const endR = startR + s.len * pulse;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * startR, cy + Math.sin(a) * startR * 0.5);
          ctx.lineTo(cx + Math.cos(a) * endR,   cy + Math.sin(a) * endR * 0.5);
          ctx.strokeStyle = rgba(0.5 * pulse);
          ctx.lineWidth = 0.8;
          ctx.stroke();
        });
      }

      // Orbital particles
      orbs.forEach(orb => {
        orb.angle += orb.speed * (scanning ? 1.6 : 1);
        const rx = orb.radius;
        const ry = orb.radius * orb.tiltX * 0.4;
        const px = cx + Math.cos(orb.angle) * rx;
        const py = cy + Math.sin(orb.angle) * ry;
        const depth = (Math.sin(orb.angle) + 1) / 2;
        const alpha = 0.35 + depth * 0.65;
        const r = orb.size * (0.5 + depth * 0.6);

        // Trail
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(orb.angle - 0.4) * rx,
          cy + Math.sin(orb.angle - 0.4) * ry,
          r * 0.5, 0, Math.PI * 2
        );
        ctx.fillStyle = rgba(alpha * 0.3);
        ctx.fill();

        // Particle
        const pg2 = ctx.createRadialGradient(px, py, 0, px, py, r * 1.5);
        pg2.addColorStop(0, rgba(alpha));
        pg2.addColorStop(1, rgba(0));
        ctx.beginPath();
        ctx.arc(px, py, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = pg2;
        ctx.fill();
      });

      // Core sphere
      const coreR = scanning ? 6.5 + Math.sin(f * 0.12) * 1.5 : 5.5;
      const coreG = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, coreR);
      coreG.addColorStop(0, "#ffffff");
      coreG.addColorStop(0.3, rgba(1));
      coreG.addColorStop(0.7, rgba(0.8));
      coreG.addColorStop(1, rgba(0.4));
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreG;
      ctx.fill();

      // Core halo
      const haloG = ctx.createRadialGradient(cx, cy, coreR, cx, cy, coreR * 2.5);
      haloG.addColorStop(0, rgba(0.4));
      haloG.addColorStop(1, rgba(0));
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = haloG;
      ctx.fill();

      // Done checkmark
      if (done) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(cx - 3.5, cy);
        ctx.lineTo(cx - 1, cy + 3);
        ctx.lineTo(cx + 4.5, cy - 3.5);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Fail X
      if (fail) {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(cx - 3.5, cy - 3.5);
        ctx.lineTo(cx + 3.5, cy + 3.5);
        ctx.moveTo(cx + 3.5, cy - 3.5);
        ctx.lineTo(cx - 3.5, cy + 3.5);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [phase, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[52px] h-[52px] shrink-0"
      style={{ imageRendering: "crisp-edges" }}
    />
  );
}

export function AIQuickSetupButton() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [phase, setPhase]             = useState<Phase>("idle");
  const [matchedColor, setMatchedColor] = useState("#e21227");
  const [matchedName, setMatchedName]   = useState("");
  const [showTip, setShowTip]           = useState(false);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async () => {
    if (phase === "scanning") return;
    setPhase("scanning");

    try {
      let matched: ProviderConfig | null = null;

      try {
        const res = await fetch("/api/providers");
        if (res.ok) {
          const data = (await res.json()) as { providers?: { id: string; available: boolean }[] };
          for (const p of PROVIDER_PRIORITY) {
            if (data.providers?.find(sp => sp.id === p.id && sp.available)) { matched = p; break; }
          }
        }
      } catch { /* continue */ }

      if (matched) { applyProvider(matched); return; }

      const existingKey = state.settings.personalApiKey?.trim();
      if (existingKey && existingKey.length > 10) {
        dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true, showTokenMeter: true } });
        dispatch({ type: "SET_PROVIDER", provider: "personal", providerModel: "gpt-4o" });
        setMatchedColor("#e21227"); setMatchedName("Personal");
        setPhase("done");
        toast({ description: "تم الإعداد التلقائي — مفتاحك الشخصي المحفوظ" });
        setTimeout(() => setPhase("idle"), 3000);
        return;
      }

      let localMatch: (ProviderConfig & { key: string; url: string }) | null = null;
      for (const p of PROVIDER_PRIORITY) {
        const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
        if (key && key.length > 10) {
          localMatch = { ...p, key, url: localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL };
          break;
        }
      }

      if (localMatch) {
        const lm = localMatch;
        dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: lm.key, personalApiBaseURL: lm.url, streaming: true, autoTitle: true, showTokenMeter: true } });
        dispatch({ type: "SET_PROVIDER", provider: lm.providerName, providerModel: lm.bestModel });
        setMatchedColor(lm.color); setMatchedName(lm.name);
        setPhase("done");
        toast({ description: `تم الإعداد التلقائي — ${lm.name} · ${lm.bestModelLabel}` });
        setTimeout(() => setPhase("idle"), 3000);
        return;
      }

      setPhase("fail");
      setTimeout(() => setPhase("idle"), 2500);
      toast({ description: "لم يُعثر على مزوّد — أدخل مفتاح API من إعدادات المزود", variant: "destructive" });
    } catch {
      setPhase("fail");
      setTimeout(() => setPhase("idle"), 2500);
    }

    function applyProvider(p: ProviderConfig) {
      dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true, showTokenMeter: true } });
      dispatch({ type: "SET_PROVIDER", provider: p.providerName, providerModel: p.bestModel });
      setMatchedColor(p.color); setMatchedName(p.name);
      setPhase("done");
      toast({ description: `تم الإعداد التلقائي — ${p.name} · ${p.bestModelLabel}` });
      setTimeout(() => setPhase("idle"), 3000);
    }
  }, [phase, state.settings.personalApiKey, dispatch, toast]);

  // Auto-trigger on first app entry per session
  useEffect(() => {
    if (!sessionStorage.getItem("mr7-auto-setup-done")) {
      sessionStorage.setItem("mr7-auto-setup-done", "1");
      const t = setTimeout(() => run(), 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut Ctrl+Shift+A
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); run(); } };
    const onEv  = () => run();
    window.addEventListener("keydown", onKey);
    window.addEventListener("kali:trigger-auto-setup", onEv);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("kali:trigger-auto-setup", onEv); };
  }, [run]);

  const activeColor =
    phase === "done"     ? "#22c55e" :
    phase === "fail"     ? "#ef4444" :
    phase === "scanning" ? "#60a5fa" :
    matchedColor || "#e21227";

  const label =
    phase === "scanning" ? "مسح..." :
    phase === "done"     ? (matchedName || "جاهز") :
    phase === "fail"     ? "فشل" : "AUTO";

  return (
    <div
      className="relative flex-shrink-0"
      onMouseEnter={() => { tipTimer.current && clearTimeout(tipTimer.current); setShowTip(true); }}
      onMouseLeave={() => { tipTimer.current = setTimeout(() => setShowTip(false), 150); }}
    >
      <button
        onClick={run}
        disabled={phase === "scanning"}
        className="relative flex items-center gap-0.5 pl-0.5 pr-2.5 py-0.5 rounded-xl transition-all active:scale-95"
        style={{
          background:  `linear-gradient(135deg, ${activeColor}0e 0%, ${activeColor}07 100%)`,
          border:      `1px solid ${activeColor}40`,
          boxShadow:   `0 0 14px ${activeColor}1a, 0 0 4px ${activeColor}12, inset 0 1px 0 ${activeColor}12`,
          cursor:      phase === "scanning" ? "wait" : "pointer",
          minWidth: 72,
        }}
        aria-label="إعداد الذكاء الاصطناعي تلقائياً"
        title="AUTO — Ctrl+Shift+A"
      >
        {/* HUD corners */}
        <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none opacity-60" style={{ borderColor: activeColor }} />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none opacity-60" style={{ borderColor: activeColor }} />

        {/* Scan line animation */}
        {phase === "scanning" && (
          <motion.span
            className="absolute inset-x-0 h-px pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${activeColor}cc, transparent)`, top: "50%" }}
            animate={{ top: ["20%", "80%", "20%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        )}

        <OrbitalCanvas phase={phase} color={activeColor} />

        <div className="flex flex-col items-start leading-none gap-0.5 hidden sm:flex">
          <span className="text-[7px] font-black tracking-widest uppercase opacity-50" style={{ color: activeColor }}>
            {phase === "scanning" ? "SCAN" : "AUTO AI"}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-[11px] font-black tracking-wide"
              style={{ color: activeColor }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </div>
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTip && phase === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 z-50 pointer-events-none"
          >
            <div className="rounded-xl px-3.5 py-2.5 text-center whitespace-nowrap"
              style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", boxShadow: "0 10px 40px rgba(0,0,0,0.7), 0 0 0 1px #0f0f0f" }}>
              <p className="text-[11px] font-black text-white mb-0.5">إعداد تلقائي للذكاء الاصطناعي</p>
              <p className="text-[9px] text-muted-foreground leading-relaxed">يكتشف أفضل مزوّد ونموذج ويفعّله تلقائياً</p>
              <div className="mt-1.5 flex items-center justify-center gap-1">
                <kbd className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: activeColor }}>Ctrl</kbd>
                <span className="text-[8px] text-muted-foreground">+</span>
                <kbd className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: activeColor }}>Shift</kbd>
                <span className="text-[8px] text-muted-foreground">+</span>
                <kbd className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: activeColor }}>A</kbd>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
