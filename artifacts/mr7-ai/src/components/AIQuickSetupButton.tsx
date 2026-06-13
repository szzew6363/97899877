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

// ── Ultra-Advanced 3D Orbital Canvas ──────────────────────────────────────────
function OrbitalCanvas({ phase, color }: { phase: Phase; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const frameRef  = useRef(0);
  const lastRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const DPR = Math.min((window.devicePixelRatio || 1) * 2, 4);
    const W = 52, H = 52;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    const cx = W / 2, cy = H / 2;
    const [pr, pg, pb] = hexToRgb(color);
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    const rgba  = (a: number) => `#${toHex(pr)}${toHex(pg)}${toHex(pb)}${toHex(Math.min(255, a * 255))}`;
    const rgbaS = (a: number) => `rgba(${pr},${pg},${pb},${a})`;

    // Orbital particles — 3 rings, many particles
    const orbs = Array.from({ length: 16 }, (_, i) => ({
      angle: (i / 16) * Math.PI * 2,
      speed: 0.014 + (i % 4) * 0.004,
      radius: i < 5 ? 16 : i < 11 ? 19 : 22,
      tiltX: 0.22 + (i / 16) * 0.85,
      size: 0.9 + (i % 3) * 0.55,
      trail: [] as { x: number; y: number }[],
    }));

    // Data stream lines
    const streams = Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      len: 3 + Math.random() * 7,
      speed: 0.03 + Math.random() * 0.025,
      phase: Math.random() * Math.PI * 2,
    }));

    // Hexagonal grid dots (background)
    const hexDots: { x: number; y: number }[] = [];
    for (let hx = -1; hx <= 2; hx++) {
      for (let hy = -1; hy <= 2; hy++) {
        hexDots.push({ x: cx + (hx - 0.5) * 12 + (hy % 2) * 6, y: cy + (hy - 0.5) * 10 });
      }
    }

    function draw(now: number) {
      rafRef.current = requestAnimationFrame(draw);
      frameRef.current++;
      const f = frameRef.current;
      ctx.clearRect(0, 0, W, H);

      const scanning = phase === "scanning";
      const done     = phase === "done";
      const fail     = phase === "fail";
      const speedMult = scanning ? 1.8 : 1;

      // Deep space background glow
      const bgG = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.72);
      bgG.addColorStop(0,   rgbaS(0.14));
      bgG.addColorStop(0.5, rgbaS(0.05));
      bgG.addColorStop(1,   rgbaS(0));
      ctx.beginPath(); ctx.arc(cx, cy, W * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = bgG; ctx.fill();

      // Hex grid dots (very subtle)
      hexDots.forEach(d => {
        const dist = Math.hypot(d.x - cx, d.y - cy);
        if (dist > 22) return;
        const a = 0.06 + 0.04 * Math.sin(f * 0.04 + dist * 0.3);
        ctx.beginPath(); ctx.arc(d.x, d.y, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = rgbaS(a); ctx.fill();
      });

      // Outer pulse ring
      const pulseR = 22 + Math.sin(f * 0.06) * 2.5;
      const pulseA = 0.15 + Math.sin(f * 0.04) * 0.08;
      ctx.beginPath(); ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = rgbaS(pulseA); ctx.lineWidth = 0.8; ctx.stroke();
      // Second pulse ring
      ctx.beginPath(); ctx.arc(cx, cy, pulseR * 0.75, 0, Math.PI * 2);
      ctx.strokeStyle = rgbaS(pulseA * 0.5); ctx.lineWidth = 0.5; ctx.stroke();

      // Orbit ellipses — 3 tilted rings
      const rings = [
        { rx: 20, ry: 5.5, rot: f * 0.010 * speedMult,  alpha: 0.32 },
        { rx: 17, ry: 7.8, rot: -f * 0.014 * speedMult, alpha: 0.22 },
        { rx: 13, ry: 10.5, rot: f * 0.008 * speedMult, alpha: 0.16 },
      ];
      rings.forEach(ring => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.rot);
        // Dashed orbit ring for depth
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgbaS(ring.alpha);
        ctx.lineWidth = 0.8; ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // Scanning beam + data streams
      if (scanning) {
        const beamAngle = (f * 0.055) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(beamAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 20, -0.45, 0.45);
        ctx.closePath();
        const sweepG = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        sweepG.addColorStop(0, rgba(0.6));
        sweepG.addColorStop(1, rgba(0.04));
        ctx.fillStyle = sweepG; ctx.fill();
        ctx.restore();

        streams.forEach(s => {
          const a = s.angle + f * s.speed;
          const pulse = (Math.sin(f * 0.09 + s.phase) + 1) / 2;
          const startR = 5 + pulse * 2.5;
          const endR   = startR + s.len * pulse;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * startR, cy + Math.sin(a) * startR * 0.52);
          ctx.lineTo(cx + Math.cos(a) * endR,   cy + Math.sin(a) * endR * 0.52);
          ctx.strokeStyle = rgba(0.55 * pulse);
          ctx.lineWidth = 0.9; ctx.stroke();
        });
      }

      // Orbital particles with trails
      orbs.forEach(orb => {
        orb.angle += orb.speed * speedMult;
        const rx = orb.radius;
        const ry = orb.radius * orb.tiltX * 0.38;
        const px = cx + Math.cos(orb.angle) * rx;
        const py = cy + Math.sin(orb.angle) * ry;
        const depth = (Math.sin(orb.angle) + 1) / 2;
        const alpha = 0.3 + depth * 0.7;
        const r     = orb.size * (0.45 + depth * 0.65);

        // Trail history
        orb.trail.push({ x: px, y: py });
        if (orb.trail.length > 5) orb.trail.shift();

        orb.trail.forEach((pt, ti) => {
          const ta = (alpha * 0.25) * (ti / orb.trail.length);
          const tr = r * 0.45 * (ti / orb.trail.length);
          ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(0.1, tr), 0, Math.PI * 2);
          ctx.fillStyle = rgba(ta); ctx.fill();
        });

        // Particle glow
        const pgrd = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2);
        pgrd.addColorStop(0, rgba(alpha));
        pgrd.addColorStop(0.5, rgba(alpha * 0.4));
        pgrd.addColorStop(1, rgba(0));
        ctx.beginPath(); ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = pgrd; ctx.fill();

        // Particle core
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.3, r * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`; ctx.fill();
      });

      // Core sphere
      const coreR = scanning ? 7 + Math.sin(f * 0.13) * 1.8 : 6;
      // Core body
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = rgbaS(0.12); ctx.fill();
      // Core gradient
      const coreG = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.35, 0, cx, cy, coreR);
      coreG.addColorStop(0,   `rgba(255,255,255,0.95)`);
      coreG.addColorStop(0.25, rgba(1));
      coreG.addColorStop(0.65, rgba(0.75));
      coreG.addColorStop(1,   rgba(0.35));
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreG; ctx.fill();
      // Core halo
      const haloG = ctx.createRadialGradient(cx, cy, coreR * 0.8, cx, cy, coreR * 3);
      haloG.addColorStop(0, rgba(0.45));
      haloG.addColorStop(0.5, rgba(0.12));
      haloG.addColorStop(1, rgba(0));
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2);
      ctx.fillStyle = haloG; ctx.fill();

      // Equatorial grid on core
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.clip();
      ctx.beginPath(); ctx.ellipse(cx, cy, coreR, coreR * 0.28, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(0.18); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, coreR * Math.abs(Math.cos(f * 0.035)) + 0.3, coreR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(0.12); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();

      // Done checkmark
      if (done) {
        ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy); ctx.lineTo(cx - 1, cy + 3.5); ctx.lineTo(cx + 5, cy - 4);
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      // Fail X
      if (fail) {
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
        ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [phase, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 52, height: 52, imageRendering: "crisp-edges", flexShrink: 0 }}
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

  useEffect(() => {
    if (!sessionStorage.getItem("mr7-auto-setup-done")) {
      sessionStorage.setItem("mr7-auto-setup-done", "1");
      const t = setTimeout(() => run(), 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        className="relative flex items-center gap-0.5 pl-0.5 pr-2 py-0.5 rounded-xl transition-all active:scale-95"
        style={{
          background:  `linear-gradient(135deg, ${activeColor}12 0%, ${activeColor}06 100%)`,
          border:      `1px solid ${activeColor}45`,
          boxShadow:   `0 0 20px ${activeColor}22, 0 0 6px ${activeColor}14, inset 0 1px 0 ${activeColor}15`,
          cursor:      phase === "scanning" ? "wait" : "pointer",
        }}
        aria-label="إعداد الذكاء الاصطناعي تلقائياً"
        title="AUTO — Ctrl+Shift+A"
      >
        {/* HUD corners */}
        <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none"
          style={{ borderColor: activeColor + "88" }} />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none"
          style={{ borderColor: activeColor + "88" }} />

        {/* Scan line animation */}
        {phase === "scanning" && (
          <motion.span
            className="absolute inset-x-0 h-px pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${activeColor}cc, transparent)`, top: "50%" }}
            animate={{ top: ["20%", "80%", "20%"] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }}
          />
        )}

        <OrbitalCanvas phase={phase} color={activeColor} />

        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span className="text-[7px] font-black tracking-widest uppercase opacity-50"
            style={{ color: activeColor }}>
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
                <kbd className="text-[8px] font-mono px-1 py-0.5 rounded"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: activeColor }}>Ctrl</kbd>
                <span className="text-[8px] text-muted-foreground">+</span>
                <kbd className="text-[8px] font-mono px-1 py-0.5 rounded"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: activeColor }}>Shift</kbd>
                <span className="text-[8px] text-muted-foreground">+</span>
                <kbd className="text-[8px] font-mono px-1 py-0.5 rounded"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: activeColor }}>A</kbd>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
