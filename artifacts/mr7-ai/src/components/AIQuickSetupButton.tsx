import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ProviderName } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const KEY_PREFIX = "mr7-ai-p-key-";
const URL_PREFIX = "mr7-ai-p-url-";

interface ProviderDef {
  id: string; name: string; shortName: string; color: string;
  baseURL: string; providerName: ProviderName;
  models: { id: string; label: string; tag: string }[];
  category: string; requiresKey: boolean; badge?: string;
}

const ALL_PROVIDERS: ProviderDef[] = [
  {
    id: "groq", name: "Groq", shortName: "GROQ", color: "#f59e0b",
    baseURL: "https://api.groq.com/openai/v1", providerName: "groq",
    category: "سرعة فائقة", requiresKey: true, badge: "FASTEST",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B",  tag: "BEST" },
      { id: "llama-3.1-8b-instant",    label: "Llama 3.1 8B",   tag: "FAST" },
      { id: "mixtral-8x7b-32768",      label: "Mixtral 8×7B",   tag: "MIX"  },
    ],
  },
  {
    id: "openai", name: "OpenAI", shortName: "OAI", color: "#10b981",
    baseURL: "https://api.openai.com/v1", providerName: "openai",
    category: "متعدد الأغراض", requiresKey: true, badge: "GPT-4o",
    models: [
      { id: "gpt-4o",      label: "GPT-4o",      tag: "BEST" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", tag: "FAST" },
      { id: "o1-mini",     label: "o1-mini",      tag: "THINK"},
    ],
  },
  {
    id: "anthropic", name: "Anthropic", shortName: "CLO", color: "#f97316",
    baseURL: "https://api.anthropic.com/v1", providerName: "anthropic",
    category: "استدلال عميق", requiresKey: true, badge: "Claude",
    models: [
      { id: "claude-sonnet-4-5",       label: "Sonnet 4.5",  tag: "BEST" },
      { id: "claude-3-5-haiku-latest", label: "Haiku 3.5",   tag: "FAST" },
      { id: "claude-opus-4-5",         label: "Opus 4.5",    tag: "MAX"  },
    ],
  },
  {
    id: "gemini", name: "Gemini", shortName: "GEM", color: "#3b82f6",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", providerName: "gemini",
    category: "متعدد الوسائط", requiresKey: true, badge: "2.5",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tag: "BEST" },
      { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro",   tag: "PRO"  },
    ],
  },
  {
    id: "openrouter", name: "OpenRouter", shortName: "OR", color: "#8b5cf6",
    baseURL: "https://openrouter.ai/api/v1", providerName: "openrouter",
    category: "300+ نموذج", requiresKey: true, badge: "300+",
    models: [
      { id: "deepseek/deepseek-chat-v3-0324",  label: "DeepSeek V3",      tag: "BEST" },
      { id: "anthropic/claude-sonnet-4-5",     label: "Claude Sonnet 4.5",tag: "PRO"  },
      { id: "meta-llama/llama-3.3-70b",        label: "Llama 3.3 70B",    tag: "OPEN" },
    ],
  },
  {
    id: "deepseek", name: "DeepSeek", shortName: "DS", color: "#06b6d4",
    baseURL: "https://api.deepseek.com/v1", providerName: "custom",
    category: "استدلال", requiresKey: true,
    models: [
      { id: "deepseek-chat",     label: "DeepSeek V3", tag: "BEST" },
      { id: "deepseek-reasoner", label: "DeepSeek R1", tag: "THINK"},
    ],
  },
  {
    id: "xai", name: "xAI Grok", shortName: "GROK", color: "#22d3ee",
    baseURL: "https://api.x.ai/v1", providerName: "custom",
    category: "X.ai", requiresKey: true,
    models: [
      { id: "grok-3",      label: "Grok 3",      tag: "BEST" },
      { id: "grok-3-mini", label: "Grok 3 Mini", tag: "FAST" },
    ],
  },
  {
    id: "mistral", name: "Mistral AI", shortName: "MIS", color: "#ec4899",
    baseURL: "https://api.mistral.ai/v1", providerName: "custom",
    category: "أوروبي", requiresKey: true,
    models: [
      { id: "mistral-large-latest", label: "Mistral Large", tag: "BEST" },
      { id: "mistral-small-latest", label: "Mistral Small", tag: "FAST" },
    ],
  },
  {
    id: "perplexity", name: "Perplexity", shortName: "PP", color: "#22c55e",
    baseURL: "https://api.perplexity.ai", providerName: "custom",
    category: "بحث ويب", requiresKey: true,
    models: [
      { id: "sonar-pro", label: "Sonar Pro", tag: "BEST" },
      { id: "sonar",     label: "Sonar",     tag: "FAST" },
    ],
  },
  {
    id: "ollama", name: "Ollama", shortName: "OLL", color: "#10b981",
    baseURL: "http://localhost:11434/v1", providerName: "custom",
    category: "محلي", requiresKey: false, badge: "LOCAL",
    models: [
      { id: "llama3.2",    label: "Llama 3.2",   tag: "BEST" },
      { id: "deepseek-r1", label: "DeepSeek R1", tag: "THINK"},
    ],
  },
  {
    id: "lmstudio", name: "LM Studio", shortName: "LMS", color: "#a78bfa",
    baseURL: "http://localhost:1234/v1", providerName: "custom",
    category: "محلي", requiresKey: false, badge: "LOCAL",
    models: [{ id: "local-model", label: "النموذج المحلي", tag: "LOCAL" }],
  },
];

type Phase = "idle" | "scanning" | "done" | "fail";

// ── TRUE 3D QUANTUM ATOM ──────────────────────────────────────────────────────
function QuantumAtom3D({ phase, open }: { phase: Phase; open: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const phaseRef  = useRef<Phase>(phase);
  const openRef   = useRef(open);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { openRef.current  = open;  }, [open]);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const SIZE = 56;
    const DPR  = Math.min(window.devicePixelRatio * 2, 4);
    cv.width   = SIZE * DPR;
    cv.height  = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const [cx, cy] = [SIZE / 2, SIZE / 2];
    const FOV = 160;

    // Ring definitions: local XZ-plane circle, then tilted
    type Ring = { r: number; tX: number; tY: number; speed: number; col: string };
    const RINGS: Ring[] = [
      { r: 12, tX:  0.40, tY:  0.20, speed:  0.016, col: "rgba(0,255,136," },
      { r: 17, tX: -0.55, tY:  0.50, speed: -0.011, col: "rgba(0,229,255," },
      { r: 22, tX:  0.75, tY: -0.58, speed:  0.008, col: "rgba(134,255,0,"  },
    ];

    // Particle state
    type P = { ring: number; angle: number; trail: Array<{ x: number; y: number }> };
    const particles: P[] = RINGS.flatMap((_, ri) =>
      Array.from({ length: 8 }, (_, i) => ({
        ring: ri, angle: (i / 8) * Math.PI * 2 + ri * 0.75, trail: [],
      }))
    );

    // ── 3D math helpers ─────────────────────────────────────────────────
    function rotX(x: number, y: number, z: number, a: number): [number, number, number] {
      const c = Math.cos(a), s = Math.sin(a);
      return [x, y * c - z * s, y * s + z * c];
    }
    function rotY(x: number, y: number, z: number, a: number): [number, number, number] {
      const c = Math.cos(a), s = Math.sin(a);
      return [x * c + z * s, y, -x * s + z * c];
    }
    function rotZ(x: number, y: number, z: number, a: number): [number, number, number] {
      const c = Math.cos(a), s = Math.sin(a);
      return [x * c - y * s, x * s + y * c, z];
    }
    function proj(x: number, y: number, z: number): { px: number; py: number; sc: number } {
      const sc = FOV / (FOV + z + 55);
      return { px: cx + x * sc, py: cy + y * sc, sc };
    }

    // Transform a ring point (in local XZ plane) through ring tilt + global rotation
    function xf(
      x0: number, z0: number, ring: Ring,
      gRX: number, gRY: number, gRZ: number
    ): { px: number; py: number; sc: number; zd: number } {
      // Ring local (y=0 for all ring points)
      let [x, y, z] = rotX(x0, 0, z0, ring.tX);
      [x, y, z] = rotY(x, y, z, ring.tY);
      // Global wobble
      [x, y, z] = rotX(x, y, z, gRX);
      [x, y, z] = rotY(x, y, z, gRY);
      [x, y, z] = rotZ(x, y, z, gRZ);
      const { px, py, sc } = proj(x, y, z);
      return { px, py, sc, zd: z };
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current++;
      const t   = tRef.current;
      const ph  = phaseRef.current;
      const isO = openRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Slow global wobble — gives the illusion of 3D tumbling
      const gRX = Math.sin(t * 0.009) * 0.30 + 0.20;
      const gRY = t * 0.0065;
      const gRZ = Math.sin(t * 0.013) * 0.18;

      // ── Ambient field ──────────────────────────────────────────────────
      const aR  = isO ? 26 : 22;
      const aA  = ph === "scanning" ? 0.24 : isO ? 0.20 : 0.11;
      const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, aR);
      amb.addColorStop(0,   `rgba(0,255,136,${aA * 2.2})`);
      amb.addColorStop(0.4, `rgba(0,229,255,${aA * 0.55})`);
      amb.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, aR, 0, Math.PI * 2);
      ctx.fillStyle = amb; ctx.fill();

      // ── Scan pulse rings ───────────────────────────────────────────────
      if (ph === "scanning") {
        for (let i = 0; i < 3; i++) {
          const p  = ((t * 1.8 + i * 55) % 165) / 165;
          const rr = 7 + p * 23;
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,229,255,${(1 - p) * 0.52})`;
          ctx.lineWidth   = 1.8 * (1 - p);
          ctx.stroke();
        }
        // Rotating sonar ray
        const rayA = (t * 0.055) % (Math.PI * 2);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rayA);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, 24, -0.55, 0.55); ctx.closePath();
        const ray = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
        ray.addColorStop(0, "rgba(0,229,255,0.7)");
        ray.addColorStop(1, "rgba(0,229,255,0)");
        ctx.fillStyle = ray; ctx.fill(); ctx.restore();
      }

      // ── Orbit paths — TRUE 3D: sample 64 pts, project each ────────────
      RINGS.forEach(ring => {
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 64; i++) {
          const a      = (i / 64) * Math.PI * 2;
          const { px, py } = xf(ring.r * Math.cos(a), ring.r * Math.sin(a), ring, gRX, gRY, gRZ);
          if (first) { ctx.moveTo(px, py); first = false; }
          else         ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = `${ring.col}${isO ? 0.38 : 0.22})`;
        ctx.lineWidth   = 0.75;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Update + project all particles ─────────────────────────────────
      const spd = ph === "scanning" ? 2.8 : isO ? 1.45 : 1.0;

      type PP = { px: number; py: number; sc: number; zd: number; p: P };
      const projected: PP[] = particles.map(pp => {
        pp.angle += RINGS[pp.ring].speed * spd;
        const ring = RINGS[pp.ring];
        const a    = pp.angle;
        const { px, py, sc, zd } = xf(ring.r * Math.cos(a), ring.r * Math.sin(a), ring, gRX, gRY, gRZ);
        pp.trail.push({ x: px, y: py });
        if (pp.trail.length > 12) pp.trail.shift();
        return { px, py, sc, zd, p: pp };
      });

      // Sort back → front
      projected.sort((a, b) => a.zd - b.zd);

      // Nucleus draw function (called once when z-sorted position is reached)
      let nucleusDrawn = false;
      const drawNucleus = () => {
        const cR = 5.8 + (ph === "scanning"
          ? Math.sin(t * 0.22) * 2.2
          : isO ? Math.sin(t * 0.07) * 0.8 : 0);

        // Outer halo layers
        const halo1 = ctx.createRadialGradient(cx, cy, cR, cx, cy, cR * 5.5);
        halo1.addColorStop(0, `rgba(0,255,136,${ph === "scanning" ? 0.52 : 0.32})`);
        halo1.addColorStop(0.45, "rgba(0,200,180,0.06)");
        halo1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(cx, cy, cR * 5.5, 0, Math.PI * 2);
        ctx.fillStyle = halo1; ctx.fill();

        // Secondary energy ring
        if (isO || ph === "scanning") {
          const pulse = 0.5 + Math.sin(t * 0.14) * 0.5;
          ctx.beginPath(); ctx.arc(cx, cy, cR * 2.2 + pulse * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,255,136,${0.12 + pulse * 0.08})`;
          ctx.lineWidth = 1; ctx.stroke();
        }

        // Body — PBR-style multi-gradient
        const body = ctx.createRadialGradient(cx - cR * 0.32, cy - cR * 0.38, 0, cx, cy, cR);
        body.addColorStop(0,    "rgba(255,255,255,0.98)");
        body.addColorStop(0.18, "rgba(0,255,136,1)");
        body.addColorStop(0.55, "rgba(0,185,95,0.92)");
        body.addColorStop(0.85, "rgba(0,100,55,0.75)");
        body.addColorStop(1,    "rgba(0,40,20,0.65)");
        ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
        ctx.fillStyle = body; ctx.fill();

        // Specular highlight
        const spec = ctx.createRadialGradient(cx - cR * 0.4, cy - cR * 0.45, 0, cx - cR * 0.1, cy - cR * 0.1, cR);
        spec.addColorStop(0,   "rgba(255,255,255,0.88)");
        spec.addColorStop(0.22,"rgba(255,255,255,0.22)");
        spec.addColorStop(1,   "rgba(255,255,255,0)");
        ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
        ctx.fillStyle = spec; ctx.fill();

        // Surface lines (latitude + meridian)
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.clip();
        ctx.beginPath();
        ctx.ellipse(cx, cy, cR, cR * 0.28, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,255,136,0.28)"; ctx.lineWidth = 0.55; ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy, cR * 0.28, cR, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,229,255,0.18)"; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.restore();

        // Rim light
        const rim = ctx.createRadialGradient(cx + cR * 0.55, cy + cR * 0.42, 0, cx + cR * 0.35, cy + cR * 0.25, cR * 0.85);
        rim.addColorStop(0, "rgba(0,229,255,0.45)");
        rim.addColorStop(1, "rgba(0,229,255,0)");
        ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
        ctx.fillStyle = rim; ctx.fill();

        // Phase overlays
        if (ph === "done") {
          ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
          ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.moveTo(cx - 4.5, cy + 0.5);
          ctx.lineTo(cx - 0.8, cy + 4.5);
          ctx.lineTo(cx + 5.5, cy - 4.5);
          ctx.stroke(); ctx.shadowBlur = 0;
        }
        if (ph === "fail") {
          ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
          ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
          ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
          ctx.stroke(); ctx.shadowBlur = 0;
        }
      };

      // ── Draw particles (depth-sorted, nucleus inserted at z=0) ─────────
      projected.forEach(({ px, py, sc, zd, p: pp }) => {
        if (!nucleusDrawn && zd > 0) { drawNucleus(); nucleusDrawn = true; }

        const ring  = RINGS[pp.ring];
        const depth = Math.max(0.08, Math.min(1, (sc - 0.38) / 0.68));
        const alpha = 0.18 + depth * 0.82;
        const size  = sc * (1.8 + depth * 2.8);

        // Trail (fading)
        pp.trail.forEach((pt, ti) => {
          const ta = alpha * (ti / pp.trail.length) * 0.20;
          const tr = size * (ti / pp.trail.length) * 0.58;
          if (tr < 0.12) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
          ctx.fillStyle = `${ring.col}${ta})`; ctx.fill();
        });

        // Glow corona
        const g = ctx.createRadialGradient(px, py, 0, px, py, size * 3.0);
        g.addColorStop(0,   `${ring.col}${alpha * 0.88})`);
        g.addColorStop(0.4, `${ring.col}${alpha * 0.18})`);
        g.addColorStop(1,   `${ring.col}0)`);
        ctx.beginPath(); ctx.arc(px, py, size * 3.0, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();

        // White hot core
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.4, size * 0.28), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.93})`; ctx.fill();
      });

      if (!nucleusDrawn) drawNucleus();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef}
      style={{ width: 56, height: 56, imageRendering: "pixelated", display: "block", flexShrink: 0 }} />
  );
}

// ── Provider dot ──────────────────────────────────────────────────────────────
function ProviderDot({ color, active }: { color: string; active: boolean }) {
  return (
    <span className="inline-block rounded-full flex-shrink-0"
      style={{
        width: 8, height: 8,
        background: active ? color : `${color}44`,
        boxShadow: active ? `0 0 8px ${color}` : "none",
        transition: "all 0.3s",
      }} />
  );
}

// ── Provider card ─────────────────────────────────────────────────────────────
function ProviderCard({
  prov, isActive, configuredKey, selectedModel,
  onActivate, onModelChange, onKeyChange,
}: {
  prov: ProviderDef; isActive: boolean;
  configuredKey: string; selectedModel: string;
  onActivate: (p: ProviderDef, m: string) => void;
  onModelChange: (id: string, m: string) => void;
  onKeyChange: (id: string, k: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [keyInput, setKeyInput] = useState(configuredKey);
  const hasKey = prov.requiresKey ? configuredKey.length > 10 : true;

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg,${prov.color}18 0%,${prov.color}06 100%)`
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? prov.color + "55" : "rgba(255,255,255,0.06)"}`,
        boxShadow: isActive ? `0 0 16px ${prov.color}14` : "none",
        transition: "all 0.25s",
      }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <ProviderDot color={prov.color} active={hasKey} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black" style={{ color: isActive ? prov.color : "#e2e8f0" }}>
              {prov.name}
            </span>
            {prov.badge && (
              <span className="text-[7px] font-bold px-1 py-px rounded"
                style={{ background: `${prov.color}20`, color: prov.color, border: `1px solid ${prov.color}38` }}>
                {prov.badge}
              </span>
            )}
            {isActive && (
              <span className="text-[7px] font-bold px-1 py-px rounded"
                style={{ background: "rgba(0,255,136,0.14)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.32)" }}>
                ACTIVE
              </span>
            )}
          </div>
          <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>
            {prov.category} · {prov.models.length} نموذج
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button onClick={() => onActivate(prov, selectedModel || prov.models[0].id)}
            className="text-[8px] font-bold px-2 py-1 rounded-lg"
            style={{
              background: isActive ? `${prov.color}22` : "rgba(255,255,255,0.05)",
              border: `1px solid ${isActive ? prov.color + "45" : "rgba(255,255,255,0.09)"}`,
              color: isActive ? prov.color : "rgba(255,255,255,0.55)",
            }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {isActive ? "فعّال" : "تفعيل"}
          </motion.button>
          <motion.button onClick={() => setExpanded(e => !e)}
            className="w-5 h-5 flex items-center justify-center rounded"
            style={{ color: "rgba(255,255,255,0.35)" }}
            animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 3L4 5.5 6.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: `1px solid ${prov.color}14` }}>
              <div className="pt-2">
                <div className="text-[7px] font-bold tracking-widest mb-1.5 uppercase"
                  style={{ color: `${prov.color}80` }}>النماذج</div>
                <div className="grid grid-cols-2 gap-1">
                  {prov.models.map(m => {
                    const isSel = (selectedModel || prov.models[0].id) === m.id;
                    return (
                      <button key={m.id} onClick={() => onModelChange(prov.id, m.id)}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-all"
                        style={{
                          background: isSel ? `${prov.color}1e` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isSel ? prov.color + "48" : "rgba(255,255,255,0.05)"}`,
                        }}>
                        <span className="text-[9px] font-semibold truncate"
                          style={{ color: isSel ? prov.color : "rgba(255,255,255,0.6)" }}>{m.label}</span>
                        <span className="text-[7px] font-black ml-1"
                          style={{ color: isSel ? prov.color : "rgba(255,255,255,0.28)" }}>{m.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {prov.requiresKey && (
                <div>
                  <div className="text-[7px] font-bold tracking-widest mb-1 uppercase"
                    style={{ color: `${prov.color}80` }}>مفتاح API</div>
                  <div className="flex gap-1">
                    <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
                      placeholder={`${prov.id.toUpperCase()}-...`}
                      className="flex-1 rounded-lg px-2 py-1.5 text-[9px] font-mono outline-none"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid ${keyInput.length > 10 ? prov.color + "48" : "rgba(255,255,255,0.07)"}`,
                        color: "rgba(255,255,255,0.8)",
                      }} />
                    <motion.button
                      onClick={() => { onKeyChange(prov.id, keyInput); onActivate(prov, selectedModel || prov.models[0].id); }}
                      className="px-2 rounded-lg text-[8px] font-bold"
                      style={{ background: `${prov.color}1e`, border: `1px solid ${prov.color}38`, color: prov.color }}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      حفظ
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Scan progress bar ─────────────────────────────────────────────────────────
function ScanBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg,${color},${color}88)` }}
        animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      <motion.div className="absolute inset-y-0 w-8"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)" }}
        animate={{ left: ["-10%", "110%"] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AIQuickSetupButton() {
  const { state, dispatch }       = useStore();
  const { toast }                 = useToast();
  const [phase, setPhase]         = useState<Phase>("idle");
  const [open, setOpen]           = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMsg, setScanMsg]     = useState("");
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [keys, setKeys]           = useState<Record<string, string>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved keys on open
  useEffect(() => {
    const loaded: Record<string, string> = {};
    ALL_PROVIDERS.forEach(p => {
      const k = localStorage.getItem(KEY_PREFIX + p.id)?.trim() ?? "";
      if (k) loaded[p.id] = k;
    });
    setKeys(loaded);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Keyboard shortcut Ctrl+Shift+A
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Auto-init once per session
  useEffect(() => {
    if (!sessionStorage.getItem("mr7-autoinit")) {
      sessionStorage.setItem("mr7-autoinit", "1");
      setTimeout(autoScan, 1800);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const autoScan = useCallback(async () => {
    if (phase === "scanning") return;
    setPhase("scanning"); setScanProgress(0); setScanMsg("يتم مسح المفاتيح...");

    for (let i = 0; i < ALL_PROVIDERS.length; i++) {
      const p = ALL_PROVIDERS[i];
      setScanProgress(Math.round((i / ALL_PROVIDERS.length) * 100));
      setScanMsg(`فحص ${p.name}...`);
      await new Promise(r => setTimeout(r, 80));

      if (p.requiresKey) {
        const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
        if (key && key.length > 10) {
          const model = selectedModels[p.id] || p.models[0].id;
          applyProvider(p, model, key);
          setScanProgress(100); setScanMsg(`تم: ${p.name}`);
          setPhase("done");
          toast({ description: `AUTO — ${p.name} · ${p.models.find(m => m.id === model)?.label ?? model}` });
          setTimeout(() => setPhase("idle"), 3500);
          return;
        }
      } else {
        const model = selectedModels[p.id] || p.models[0].id;
        applyProvider(p, model, "");
        setScanProgress(100); setScanMsg(`محلي: ${p.name}`);
        setPhase("done");
        toast({ description: `AUTO — ${p.name} · ${p.models.find(m => m.id === model)?.label ?? model}` });
        setTimeout(() => setPhase("idle"), 3500);
        return;
      }
    }

    if ((state.settings.personalApiKey?.trim().length ?? 0) > 10) {
      dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true } });
      setScanProgress(100); setScanMsg("المفتاح الشخصي");
      setPhase("done"); toast({ description: "AUTO — المفتاح الشخصي" });
      setTimeout(() => setPhase("idle"), 3500);
      return;
    }

    setPhase("fail"); setScanMsg("لم يُعثر على مزوّد");
    toast({ description: "لم يُعثر على مزوّد — أدخل مفتاح API", variant: "destructive" });
    setTimeout(() => setPhase("idle"), 2500);
  }, [phase, state.settings.personalApiKey, selectedModels, dispatch, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyProvider(p: ProviderDef, model: string, key: string) {
    const url = localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL;
    if (key) {
      dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: key, personalApiBaseURL: url, streaming: true, autoTitle: true } });
    }
    if (p.providerName !== "custom") {
      dispatch({ type: "SET_PROVIDER", provider: p.providerName, providerModel: model });
    } else {
      dispatch({ type: "SET_PROVIDER", provider: "custom", providerModel: model });
      dispatch({ type: "SET_SETTINGS", patch: { personalApiBaseURL: url } });
    }
  }

  function handleActivate(prov: ProviderDef, model: string) {
    const key = keys[prov.id] ?? localStorage.getItem(KEY_PREFIX + prov.id)?.trim() ?? "";
    applyProvider(prov, model, key);
    setPhase("done");
    toast({ description: `${prov.name} · ${prov.models.find(m => m.id === model)?.label ?? model}` });
    setTimeout(() => setPhase("idle"), 2500);
  }

  function handleKeyChange(id: string, key: string) {
    localStorage.setItem(KEY_PREFIX + id, key);
    setKeys(k => ({ ...k, [id]: key }));
  }

  function handleModelChange(id: string, model: string) {
    setSelectedModels(s => ({ ...s, [id]: model }));
  }

  const label = phase === "scanning" ? "SCAN" : phase === "done" ? "OK" : phase === "fail" ? "ERR" : "AUTO";
  const cfgCnt = ALL_PROVIDERS.filter(p => p.requiresKey ? (keys[p.id]?.length ?? 0) > 10 : true).length;

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      {/* Main trigger button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        disabled={phase === "scanning"}
        className="relative flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-xl"
        style={{
          background: open
            ? "linear-gradient(135deg,rgba(0,255,136,0.15) 0%,rgba(0,229,255,0.08) 100%)"
            : "linear-gradient(135deg,rgba(0,255,136,0.08) 0%,rgba(0,229,255,0.03) 100%)",
          border: `1px solid rgba(0,255,136,${open ? 0.58 : 0.33})`,
          boxShadow: open
            ? "0 0 32px rgba(0,255,136,0.26), 0 0 12px rgba(0,229,255,0.12), inset 0 1px 0 rgba(0,255,136,0.15)"
            : "0 0 20px rgba(0,255,136,0.15), inset 0 1px 0 rgba(0,255,136,0.08)",
          cursor: phase === "scanning" ? "wait" : "pointer",
        }}
        whileHover={{ scale: 1.03 }}
        aria-label="إعداد الذكاء الاصطناعي تلقائياً"
      >
        {/* HUD corner brackets */}
        <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none"
          style={{ borderColor: "rgba(0,255,136,0.65)" }} />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none"
          style={{ borderColor: "rgba(0,255,136,0.65)" }} />

        {/* Scan line */}
        {phase === "scanning" && (
          <motion.span className="absolute inset-x-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.9),transparent)" }}
            animate={{ top: ["15%", "85%", "15%"] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }} />
        )}

        <QuantumAtom3D phase={phase} open={open} />

        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5 pr-0.5">
          <span className="text-[7px] font-black tracking-widest uppercase"
            style={{ color: "rgba(0,255,136,0.5)" }}>
            {phase === "scanning" ? "SCAN" : "AUTO AI"}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={label}
              initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12 }}
              className="text-[11px] font-black"
              style={{ color: phase === "fail" ? "#ef4444" : phase === "done" ? "#22c55e" : "rgba(0,255,136,0.9)" }}>
              {label}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.button>

      {/* ── POPUP PANEL ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit   ={{ opacity: 0, y: 8,  scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full mt-2.5 left-0 z-[9999]"
            style={{ width: 380 }}
          >
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(4,7,10,0.98)",
                border: "1px solid rgba(0,255,136,0.22)",
                boxShadow: "0 0 60px rgba(0,255,136,0.12), 0 24px 64px rgba(0,0,0,0.92), inset 0 1px 0 rgba(0,255,136,0.1)",
                backdropFilter: "blur(24px)",
              }}>
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,255,136,0.85),rgba(0,229,255,0.5),transparent)" }} />

              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(0,255,136,0.07)" }}>
                <div>
                  <div className="text-[11px] font-black tracking-[0.22em] uppercase font-mono"
                    style={{ color: "rgba(0,255,136,0.9)" }}>AI NEXUS SETUP</div>
                  <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>
                    {cfgCnt} مزوّد مُهيَّأ من {ALL_PROVIDERS.length}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {ALL_PROVIDERS.slice(0, 8).map(p => (
                      <div key={p.id} className="w-1.5 h-3.5 rounded-sm transition-all"
                        style={{
                          background: (keys[p.id]?.length ?? 0) > 10 || !p.requiresKey ? p.color : "rgba(255,255,255,0.07)",
                        }} />
                    ))}
                  </div>
                  <motion.button onClick={() => setOpen(false)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                    whileHover={{ background: "rgba(255,255,255,0.1)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Scan progress */}
              {phase === "scanning" && (
                <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,255,136,0.06)" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-mono" style={{ color: "rgba(0,229,255,0.8)" }}>{scanMsg}</span>
                    <span className="text-[9px] font-black font-mono" style={{ color: "rgba(0,255,136,0.9)" }}>{scanProgress}%</span>
                  </div>
                  <ScanBar progress={scanProgress} color="#00ff88" />
                </div>
              )}

              {/* Auto-scan button */}
              <div className="px-4 pt-3 pb-2">
                <motion.button onClick={autoScan} disabled={phase === "scanning"}
                  className="w-full rounded-xl py-2.5 text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2"
                  style={{
                    background: phase === "scanning"
                      ? "rgba(0,255,136,0.05)"
                      : "linear-gradient(135deg,rgba(0,255,136,0.18) 0%,rgba(0,229,255,0.1) 100%)",
                    border: `1px solid rgba(0,255,136,${phase === "scanning" ? 0.14 : 0.40})`,
                    color: phase === "scanning" ? "rgba(0,255,136,0.38)" : "rgba(0,255,136,0.92)",
                  }}
                  whileHover={phase !== "scanning" ? { scale: 1.01, boxShadow: "0 0 20px rgba(0,255,136,0.2)" } : {}}
                  whileTap  ={phase !== "scanning" ? { scale: 0.98 } : {}}>
                  {phase === "scanning" ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>
                      جارٍ المسح التلقائي...
                    </>
                  ) : (
                    <><span style={{ fontSize: 12 }}>⚡</span>مسح تلقائي وتفعيل أفضل مزوّد</>
                  )}
                </motion.button>
              </div>

              {/* Provider list */}
              <div className="px-4 pb-3 space-y-1.5 max-h-[380px] overflow-y-auto"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,136,0.18) transparent" }}>
                <div className="text-[7px] font-bold tracking-[0.22em] uppercase mb-2 pt-1"
                  style={{ color: "rgba(0,255,136,0.38)" }}>المزوّدون المتاحون</div>
                {ALL_PROVIDERS.map(p => (
                  <ProviderCard key={p.id} prov={p}
                    isActive={state.activeProvider === p.providerName && state.activeProviderModel === (selectedModels[p.id] || p.models[0].id)}
                    configuredKey={keys[p.id] ?? ""}
                    selectedModel={selectedModels[p.id] ?? p.models[0].id}
                    onActivate={handleActivate} onModelChange={handleModelChange} onKeyChange={handleKeyChange} />
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(0,255,136,0.06)" }}>
                <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>
                  النشط: <span style={{ color: "rgba(0,255,136,0.7)" }}>{state.activeProvider.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {["Ctrl", "Shift", "A"].map((k, i) => (
                    <span key={k} className="flex items-center gap-0.5">
                      {i > 0 && <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.18)" }}>+</span>}
                      <kbd className="text-[7px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: "#0a0d10", border: "1px solid rgba(0,255,136,0.18)", color: "rgba(0,255,136,0.6)" }}>
                        {k}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.32),transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
