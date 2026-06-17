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
  {
    id: "together", name: "Together AI", shortName: "TG", color: "#f43f5e",
    baseURL: "https://api.together.xyz/v1", providerName: "custom",
    category: "مجاني", requiresKey: true, badge: "FREE",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",      label: "Llama 3.3 70B Turbo",  tag: "FAST" },
      { id: "deepseek-ai/DeepSeek-R1",                        label: "DeepSeek R1",           tag: "THINK"},
      { id: "mistralai/Mixtral-8x22B-Instruct-v0.1",          label: "Mixtral 8×22B",         tag: "BIG"  },
    ],
  },
  {
    id: "cohere", name: "Cohere", shortName: "COH", color: "#a78bfa",
    baseURL: "https://api.cohere.ai/compatibility/v1", providerName: "custom",
    category: "استدلال عميق", requiresKey: true,
    models: [
      { id: "command-r-plus-08-2024", label: "Command R+ 08-2024", tag: "BEST" },
      { id: "command-r-08-2024",      label: "Command R 08-2024",  tag: "FAST" },
    ],
  },
  {
    id: "fireworks", name: "Fireworks AI", shortName: "FW", color: "#fb923c",
    baseURL: "https://api.fireworks.ai/inference/v1", providerName: "custom",
    category: "سرعة فائقة", requiresKey: true, badge: "FAST",
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct",  label: "Llama 3.3 70B",    tag: "BEST" },
      { id: "accounts/fireworks/models/deepseek-r1",               label: "DeepSeek R1",       tag: "THINK"},
      { id: "accounts/fireworks/models/mixtral-8x22b-instruct",    label: "Mixtral 8×22B",    tag: "BIG"  },
    ],
  },
  {
    id: "nvidia", name: "NVIDIA NIM", shortName: "NIM", color: "#76b900",
    baseURL: "https://integrate.api.nvidia.com/v1", providerName: "custom",
    category: "GPU محلي", requiresKey: true, badge: "GPU",
    models: [
      { id: "meta/llama-3.3-70b-instruct",  label: "Llama 3.3 70B",   tag: "BEST" },
      { id: "deepseek-ai/deepseek-r1",       label: "DeepSeek R1",      tag: "THINK"},
      { id: "nvidia/nemotron-4-340b-instruct", label: "Nemotron 340B", tag: "HUGE" },
    ],
  },
  {
    id: "cerebras", name: "Cerebras", shortName: "CBS", color: "#e11d48",
    baseURL: "https://api.cerebras.ai/v1", providerName: "custom",
    category: "سرعة قياسية", requiresKey: true, badge: "1600 t/s",
    models: [
      { id: "llama3.3-70b",  label: "Llama 3.3 70B",  tag: "FAST" },
      { id: "llama3.1-8b",   label: "Llama 3.1 8B",   tag: "TURBO"},
    ],
  },
  {
    id: "sambanova", name: "SambaNova", shortName: "SNV", color: "#f59e0b",
    baseURL: "https://api.sambanova.ai/v1", providerName: "custom",
    category: "سرعة", requiresKey: true,
    models: [
      { id: "Meta-Llama-3.3-70B-Instruct", label: "Llama 3.3 70B",  tag: "BEST" },
      { id: "DeepSeek-R1-Distill-Llama-70B", label: "DeepSeek R1 70B", tag: "THINK"},
    ],
  },
  {
    id: "hyperbolic", name: "Hyperbolic", shortName: "HYP", color: "#818cf8",
    baseURL: "https://api.hyperbolic.xyz/v1", providerName: "custom",
    category: "مفتوح المصدر", requiresKey: true,
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct", label: "Llama 3.3 70B",  tag: "BEST" },
      { id: "deepseek-ai/DeepSeek-R1",             label: "DeepSeek R1",    tag: "THINK"},
    ],
  },
];

type Phase = "idle" | "scanning" | "done" | "fail";

// ── ULTRA 3D QUANTUM ATOM — RAINBOW SPECTRUM ──────────────────────────────────
function QuantumAtom3D({ phase, open, hover }: { phase: Phase; open: boolean; hover: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const phaseRef  = useRef<Phase>(phase);
  const openRef   = useRef(open);
  const hoverRef  = useRef(hover);
  const mouseRef  = useRef({ x: -1, y: -1 });
  const burstRef  = useRef(0);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { openRef.current  = open;  }, [open]);
  useEffect(() => { hoverRef.current = hover; if (hover) burstRef.current = tRef.current; }, [hover]);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const SIZE = 46;
    const DPR  = Math.min(window.devicePixelRatio * 2, 4);
    cv.width   = SIZE * DPR;
    cv.height  = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const [cx, cy] = [SIZE / 2, SIZE / 2];
    const FOV = 190;

    // 4 rings — rainbow spectrum, hOff staggers hue 90° per ring
    type Ring = { r: number; tX: number; tY: number; speed: number; hOff: number; eCount: number };
    const RINGS: Ring[] = [
      { r:  6, tX:  0.22, tY:  0.10, speed:  0.030, hOff:   0, eCount: 8  },
      { r:  9, tX:  0.40, tY:  0.20, speed:  0.020, hOff:  40, eCount: 10 },
      { r: 12, tX: -0.55, tY:  0.50, speed: -0.014, hOff:  80, eCount: 12 },
      { r: 15, tX:  0.75, tY: -0.58, speed:  0.009, hOff: 120, eCount: 14 },
      { r: 18, tX: -0.38, tY:  0.32, speed: -0.007, hOff: 160, eCount: 11 },
      { r: 21, tX:  0.52, tY: -0.45, speed:  0.005, hOff: 200, eCount: 9  },
      { r: 24, tX: -0.28, tY:  0.62, speed: -0.004, hOff: 240, eCount: 8  },
      { r: 27, tX:  0.68, tY:  0.18, speed:  0.003, hOff: 280, eCount: 7  },
      { r: 30, tX: -0.52, tY: -0.35, speed: -0.002, hOff: 320, eCount: 5  },
    ];

    // Quantum foam — micro background dots
    type Foam = { x: number; y: number; r: number; a: number; va: number };
    const foam: Foam[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * SIZE, y: Math.random() * SIZE,
      r: 0.3 + Math.random() * 0.5,
      a: 0.02 + Math.random() * 0.06,
      va: 0.018 + Math.random() * 0.032,
    }));

    type P = { ring: number; angle: number; trail: Array<{ x: number; y: number }> };
    const particles: P[] = RINGS.flatMap((ring, ri) =>
      Array.from({ length: ring.eCount }, (_, i) => ({
        ring: ri, angle: (i / ring.eCount) * Math.PI * 2 + ri * 0.85, trail: [],
      }))
    );

    // ── 3D math ──────────────────────────────────────────────────────────
    function rotX(x: number, y: number, z: number, a: number): [number,number,number] {
      const c = Math.cos(a), s = Math.sin(a);
      return [x, y*c - z*s, y*s + z*c];
    }
    function rotY(x: number, y: number, z: number, a: number): [number,number,number] {
      const c = Math.cos(a), s = Math.sin(a);
      return [x*c + z*s, y, -x*s + z*c];
    }
    function rotZ(x: number, y: number, z: number, a: number): [number,number,number] {
      const c = Math.cos(a), s = Math.sin(a);
      return [x*c - y*s, x*s + y*c, z];
    }
    function proj(x: number, y: number, z: number): { px: number; py: number; sc: number } {
      const sc = FOV / (FOV + z + 55);
      return { px: cx + x * sc, py: cy + y * sc, sc };
    }
    function xf(
      x0: number, z0: number, ring: Ring,
      gRX: number, gRY: number, gRZ: number
    ): { px: number; py: number; sc: number; zd: number } {
      let [x, y, z] = rotX(x0, 0, z0, ring.tX);
      [x, y, z] = rotY(x, y, z, ring.tY);
      [x, y, z] = rotX(x, y, z, gRX);
      [x, y, z] = rotY(x, y, z, gRY);
      [x, y, z] = rotZ(x, y, z, gRZ);
      const { px, py, sc } = proj(x, y, z);
      return { px, py, sc, zd: z };
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const isH = hoverRef.current;
      tRef.current += isH ? 0.88 : 0.5;
      const t   = tRef.current;
      const ph  = phaseRef.current;
      const isO = openRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      // ── Rainbow spectrum cycling ────────────────────────────────────────
      const hue = (t * (isH ? 1.55 : 0.6)) % 360;
      function hsl(h: number, s = 1, l = 0.58): string {
        const hh = ((h % 360) + 360) % 360;
        const k  = (n: number) => (n + hh / 30) % 12;
        const aa = s * Math.min(l, 1 - l);
        const f  = (n: number) => l - aa * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return `${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)}`;
      }
      const ringCol = (ri: number, alpha: number) => `rgba(${hsl(hue + RINGS[ri].hOff)},${alpha})`;

      const gRX = Math.sin(t * 0.0045) * 0.35 + 0.18;
      const gRY = t * 0.0055;
      const gRZ = Math.sin(t * 0.0065) * 0.20;

      // ── Quantum foam background ─────────────────────────────────────────
      foam.forEach(f => {
        const a = Math.abs(Math.sin(t * f.va)) * f.a;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hsl(hue + 60)},${a})`; ctx.fill();
      });

      // ── Deep ambient field ──────────────────────────────────────────────
      const aR = isO ? 22 : isH ? 21 : 20;
      const aA = ph === "scanning" ? 0.28 : isO ? 0.22 : isH ? 0.20 : 0.13;
      const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, aR);
      amb.addColorStop(0,   `rgba(${hsl(hue)},${aA * 2.4})`);
      amb.addColorStop(0.3, `rgba(${hsl(hue + 120)},${aA * 0.7})`);
      amb.addColorStop(0.6, `rgba(${hsl(hue + 240)},${aA * 0.2})`);
      amb.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, aR, 0, Math.PI * 2);
      ctx.fillStyle = amb; ctx.fill();

      // ── Magnetosphere outer field lines ────────────────────────────────
      const magPulse = 0.5 + Math.sin(t * 0.022) * 0.5;
      for (let m = 0; m < 3; m++) {
        const mr = 20 + m * 2.0 + magPulse * 1.0;
        ctx.beginPath();
        ctx.ellipse(cx, cy, mr, mr * 0.62, Math.PI * 0.15, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue + 60)},${0.04 + m * 0.015 - magPulse * 0.012})`;
        ctx.lineWidth = 0.6; ctx.stroke();
      }

      // ── Holographic hex grid overlay ───────────────────────────────────
      const hexAlpha = 0.04 + Math.sin(t * 0.016) * 0.02;
      const HEX_R = 4.5;
      const hexCenters = [
        [cx, cy - HEX_R * 2],
        [cx + HEX_R * 1.73, cy - HEX_R],
        [cx + HEX_R * 1.73, cy + HEX_R],
        [cx, cy + HEX_R * 2],
        [cx - HEX_R * 1.73, cy + HEX_R],
        [cx - HEX_R * 1.73, cy - HEX_R],
        [cx, cy],
      ];
      ctx.setLineDash([1.5, 3]);
      ctx.lineWidth = 0.4;
      hexCenters.forEach(([hx, hy]) => {
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = (s / 6) * Math.PI * 2 - Math.PI / 6;
          s === 0 ? ctx.moveTo(hx + HEX_R * Math.cos(a), hy + HEX_R * Math.sin(a))
                  : ctx.lineTo(hx + HEX_R * Math.cos(a), hy + HEX_R * Math.sin(a));
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${hsl(hue + 180)},${hexAlpha})`;
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // ── Hover energy burst rings ───────────────────────────────────────
      if (isH) {
        for (let bi = 0; bi < 5; bi++) {
          const bp = ((t * 1.1 + bi * 25) % 125) / 125;
          const bRad = 4 + bp * 22;
          ctx.beginPath(); ctx.arc(cx, cy, bRad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(hue + bi * 72)},${(1 - bp) * 0.38})`;
          ctx.lineWidth = 1.8 * (1 - bp); ctx.stroke();
        }
      }

      // ── Scan pulse rings ───────────────────────────────────────────────
      if (ph === "scanning") {
        for (let i = 0; i < 4; i++) {
          const p  = ((t * 1.5 + i * 42) % 168) / 168;
          const rr = 5 + p * 20;
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(hue + 120)},${(1 - p) * 0.60})`;
          ctx.lineWidth   = 2.0 * (1 - p);
          ctx.stroke();
        }
        const rayA = (t * 0.065) % (Math.PI * 2);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rayA);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, 22, -0.60, 0.60); ctx.closePath();
        const ray = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
        ray.addColorStop(0, `rgba(${hsl(hue)},0.80)`);
        ray.addColorStop(0.6, `rgba(${hsl(hue)},0.18)`);
        ray.addColorStop(1, `rgba(${hsl(hue)},0)`);
        ctx.fillStyle = ray; ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-rayA * 0.62 + 1.2);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, 13, -0.40, 0.40); ctx.closePath();
        const ray2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 13);
        ray2.addColorStop(0, `rgba(${hsl(hue + 180)},0.55)`);
        ray2.addColorStop(1, `rgba(${hsl(hue + 180)},0)`);
        ctx.fillStyle = ray2; ctx.fill(); ctx.restore();
      }

      // ── Orbit paths (true 3D projected, 80 samples each) ──────────────
      RINGS.forEach((ring, ri) => {
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 80; i++) {
          const a = (i / 80) * Math.PI * 2;
          const { px, py } = xf(ring.r * Math.cos(a), ring.r * Math.sin(a), ring, gRX, gRY, gRZ);
          if (first) { ctx.moveTo(px, py); first = false; }
          else         ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.setLineDash([1.8, 4.5]);
        ctx.strokeStyle = ringCol(ri, isO ? 0.42 : 0.26);
        ctx.lineWidth   = 0.65;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Higgs field — probability cloud around nucleus ─────────────────
      {
        const higgsPulse = 0.5 + Math.sin(t * 0.065) * 0.5;
        const higgsRipples = isH ? 6 : 4;
        for (let hi = 0; hi < higgsRipples; hi++) {
          const hR  = 7 + hi * 3.8 + higgsPulse * 2.5 + Math.sin(t * 0.04 + hi * 0.8) * 1.5;
          const hA  = (0.045 - hi * 0.006) * (1 - higgsPulse * 0.4);
          if (hA <= 0) continue;
          ctx.beginPath();
          ctx.ellipse(cx, cy, hR, hR * (0.72 + Math.sin(t * 0.03 + hi) * 0.12),
                      t * 0.01 + hi * 0.35, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(hue + hi * 60)},${hA})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
        // Quantum wave function radial glow (blurred probability cloud)
        const wfG = ctx.createRadialGradient(cx, cy, 4, cx, cy, 26);
        wfG.addColorStop(0,   `rgba(${hsl(hue)},${0.10 * (1 + higgsPulse * 0.3)})`);
        wfG.addColorStop(0.35,`rgba(${hsl(hue + 120)},0.04)`);
        wfG.addColorStop(0.70,`rgba(${hsl(hue + 240)},0.02)`);
        wfG.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fillStyle = wfG; ctx.fill();
      }

      // ── Dark energy tendrils from nucleus ──────────────────────────────
      for (let di = 0; di < 10; di++) {
        const da = (di / 10) * Math.PI * 2 + t * 0.022;
        const dr1 = 3.5 + Math.sin(t * 0.8 + di) * 1.0;
        const dr2 = 18 + Math.cos(t * 0.6 + di * 1.4) * 5;
        const dx1 = cx + Math.cos(da) * dr1;
        const dy1 = cy + Math.sin(da) * dr1;
        const dx2 = cx + Math.cos(da + Math.sin(t * 0.3 + di) * 0.4) * dr2;
        const dy2 = cy + Math.sin(da + Math.cos(t * 0.35 + di) * 0.4) * dr2;
        const dmx = (dx1 + dx2) / 2 + Math.sin(t * 1.2 + di) * 4;
        const dmy = (dy1 + dy2) / 2 + Math.cos(t * 1.4 + di) * 4;
        const dAlpha = 0.03 + Math.abs(Math.sin(t * 2.0 + di)) * 0.04;
        ctx.beginPath();
        ctx.moveTo(dx1, dy1);
        ctx.quadraticCurveTo(dmx, dmy, dx2, dy2);
        ctx.strokeStyle = `rgba(${hsl(hue + di * 36 + 180)},${dAlpha})`;
        ctx.lineWidth = 0.28 + Math.sin(t * 2.5 + di) * 0.14;
        ctx.stroke();
      }

      // ── Plasma neural inter-ring connections ────────────────────────────
      if (isO || ph === "scanning" || isH) {
        const pAlpha = ph === "scanning" ? 0.12 : 0.06;
        for (let ni = 0; ni < RINGS.length; ni += 2) {
          for (let nj = ni + 3; nj < RINGS.length; nj += 2) {
            const a1 = t * RINGS[ni].speed * 10 + ni * 0.85;
            const a2 = t * RINGS[nj].speed * 10 + nj * 0.85;
            const r1 = xf(RINGS[ni].r * Math.cos(a1), RINGS[ni].r * Math.sin(a1), RINGS[ni], gRX, gRY, gRZ);
            const r2 = xf(RINGS[nj].r * Math.cos(a2), RINGS[nj].r * Math.sin(a2), RINGS[nj], gRX, gRY, gRZ);
            const mx = (r1.px + r2.px) / 2 + Math.sin(t * 0.07 + ni + nj) * 3;
            const my = (r1.py + r2.py) / 2 + Math.cos(t * 0.08 + ni * nj) * 3;
            ctx.beginPath();
            ctx.moveTo(r1.px, r1.py);
            ctx.quadraticCurveTo(mx, my, r2.px, r2.py);
            ctx.strokeStyle = `rgba(${hsl(hue + ni * 45)},${pAlpha})`;
            ctx.lineWidth = 0.35; ctx.stroke();
          }
        }
      }

      // ── Holographic hex grid overlay ────────────────────────────────────
      if (isH) {
        const hexR = 4.5;
        const hexA = isH ? 0.04 : 0.015;
        ctx.strokeStyle = `rgba(${hsl(hue + 120)},${hexA})`;
        ctx.lineWidth = 0.25;
        for (let hxi = -3; hxi <= 3; hxi++) {
          for (let hyi = -3; hyi <= 3; hyi++) {
            const hx = cx + hxi * hexR * 1.73;
            const hy = cy + hyi * hexR * 2 + (hxi % 2) * hexR;
            ctx.beginPath();
            for (let hk = 0; hk < 6; hk++) {
              const hka = (hk / 6) * Math.PI * 2 + t * 0.015;
              const hpx = hx + Math.cos(hka) * hexR;
              const hpy = hy + Math.sin(hka) * hexR;
              hk === 0 ? ctx.moveTo(hpx, hpy) : ctx.lineTo(hpx, hpy);
            }
            ctx.closePath(); ctx.stroke();
          }
        }
      }

      // ── Project + advance particles ────────────────────────────────────
      const spd = ph === "scanning" ? 3.2 : isO ? 1.55 : isH ? 2.6 : 1.05;
      type PP = { px: number; py: number; sc: number; zd: number; p: P };
      const projected: PP[] = particles.map(pp => {
        pp.angle += RINGS[pp.ring].speed * spd;
        const ring = RINGS[pp.ring];
        const a    = pp.angle;
        const { px, py, sc, zd } = xf(ring.r * Math.cos(a), ring.r * Math.sin(a), ring, gRX, gRY, gRZ);
        pp.trail.push({ x: px, y: py });
        if (pp.trail.length > 14) pp.trail.shift();
        return { px, py, sc, zd, p: pp };
      });
      projected.sort((a, b) => a.zd - b.zd);

      // ── Energy tendrils between nearby electrons ───────────────────────
      if (isO || ph === "scanning") {
        for (let i = 0; i < projected.length; i += 3) {
          for (let j = i + 1; j < projected.length; j += 4) {
            const dx = projected[j].px - projected[i].px;
            const dy = projected[j].py - projected[i].py;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 12 && dist > 2) {
              const a = (1 - dist / 12) * 0.12;
              const mx = (projected[i].px + projected[j].px) / 2 + Math.sin(t * 0.03 + i) * 2.5;
              const my = (projected[i].py + projected[j].py) / 2 + Math.cos(t * 0.025 + j) * 2.5;
              ctx.beginPath();
              ctx.moveTo(projected[i].px, projected[i].py);
              ctx.quadraticCurveTo(mx, my, projected[j].px, projected[j].py);
              ctx.strokeStyle = `rgba(${hsl(hue + 60)},${a})`;
              ctx.lineWidth = 0.5; ctx.stroke();
            }
          }
        }
      }

      // ── Nucleus (depth-sorted between particles) ───────────────────────
      let nucleusDrawn = false;
      const drawNucleus = () => {
        const cR = (isH ? 6.2 : 5.5) + (ph === "scanning"
          ? Math.sin(t * 0.18) * 2.0
          : isO ? Math.sin(t * 0.055) * 0.8 : isH ? Math.sin(t * 0.12) * 1.2 : 0);

        // Chromatic aberration — 3 offset halo passes, rainbow-shifted
        const chromOffset = isH ? 1.4 : 1.0;
        [
          [chromOffset,  0,           hsl(hue)],
          [0,            chromOffset, hsl(hue + 120)],
          [-chromOffset, 0,           hsl(hue + 240)],
        ].forEach(([ox, oy, col]) => {
          const haloR = cR * (isH ? 7.0 : 5.8);
          const hc = ctx.createRadialGradient(cx + (ox as number), cy + (oy as number), cR, cx + (ox as number), cy + (oy as number), haloR);
          hc.addColorStop(0,   `rgba(${col},${ph === "scanning" ? 0.30 : isH ? 0.28 : 0.18})`);
          hc.addColorStop(0.5, `rgba(${col},0.03)`);
          hc.addColorStop(1,   `rgba(${col},0)`);
          ctx.beginPath(); ctx.arc(cx + (ox as number), cy + (oy as number), haloR, 0, Math.PI * 2);
          ctx.fillStyle = hc; ctx.fill();
        });

        // Pulsing energy rings — each offset 120° in hue
        for (let r = 0; r < (isH ? 4 : 3); r++) {
          const pulse = 0.5 + Math.sin(t * (isH ? 0.14 : 0.08) + r * 1.2) * 0.5;
          ctx.beginPath(); ctx.arc(cx, cy, cR * (1.8 + r * 0.6) + pulse * 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(hue + r * 90)},${(0.22 - r * 0.04) * pulse})`;
          ctx.lineWidth = (isH ? 1.3 : 1.0) - r * 0.25; ctx.stroke();
        }

        // Body — full rainbow spectrum sphere
        const body = ctx.createRadialGradient(cx - cR * 0.34, cy - cR * 0.40, 0, cx, cy, cR);
        body.addColorStop(0,    "rgba(255,255,255,1.0)");
        body.addColorStop(0.12, `rgba(${hsl(hue, 1, 0.92)},1.0)`);
        body.addColorStop(0.30, `rgba(${hsl(hue, 1, 0.72)},1.0)`);
        body.addColorStop(0.58, `rgba(${hsl(hue, 1, 0.52)},0.95)`);
        body.addColorStop(0.82, `rgba(${hsl(hue, 1, 0.30)},0.80)`);
        body.addColorStop(1,    `rgba(${hsl(hue, 1, 0.12)},0.70)`);
        ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
        ctx.fillStyle = body; ctx.fill();

        // Surface plasma swirl — cascading hue offsets
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.clip();
        const swAngle = t * 0.04;
        for (let sw = 0; sw < 3; sw++) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, cR * 0.85, cR * 0.32, swAngle + sw * 1.05, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(hue + sw * 60)},${0.14 - sw * 0.03})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(cx, cy, cR * 0.30, cR * 0.90, -swAngle * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue + 180)},0.14)`; ctx.lineWidth = 0.45; ctx.stroke();
        ctx.restore();

        // ── Quarks orbiting inside nucleus ──────────────────────────────────
        const QUARKS = [
          { hOff: 0,   speed: 0.10, r: cR * 0.55, qOff: 0.00 },
          { hOff: 120, speed: 0.08, r: cR * 0.45, qOff: 2.09 },
          { hOff: 240, speed: 0.12, r: cR * 0.40, qOff: 4.19 },
        ];
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.clip();
        QUARKS.forEach(q => {
          const qa = t * 0.09 * q.speed * 10 + q.qOff;
          const qx = cx + Math.cos(qa) * q.r;
          const qy = cy + Math.sin(qa * 0.7) * q.r * 0.6;
          const qColor = hsl(hue + q.hOff, 1, 0.8);
          // Gluon trail
          const qPrev: [number, number][] = [];
          for (let qti = 0; qti < 5; qti++) {
            const prevA = qa - qti * 0.15;
            qPrev.push([cx + Math.cos(prevA) * q.r, cy + Math.sin(prevA * 0.7) * q.r * 0.6]);
          }
          qPrev.forEach(([ptx, pty], qi) => {
            const qta = (1 - qi / 5) * 0.35;
            ctx.beginPath(); ctx.arc(ptx, pty, 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${qColor},${qta})`; ctx.fill();
          });
          // Quark glow
          const qg = ctx.createRadialGradient(qx, qy, 0, qx, qy, 2.5);
          qg.addColorStop(0, `rgba(${qColor},0.95)`);
          qg.addColorStop(1, `rgba(${qColor},0)`);
          ctx.beginPath(); ctx.arc(qx, qy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = qg; ctx.fill();
          ctx.beginPath(); ctx.arc(qx, qy, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.98)"; ctx.fill();
        });
        // Gluon connections (color strings) between quarks
        const qPositions = QUARKS.map(q => {
          const qa = t * 0.09 * q.speed * 10 + q.qOff;
          return [cx + Math.cos(qa) * q.r, cy + Math.sin(qa * 0.7) * q.r * 0.6];
        });
        for (let qi = 0; qi < 3; qi++) {
          for (let qj = qi + 1; qj < 3; qj++) {
            ctx.beginPath();
            ctx.moveTo(qPositions[qi][0], qPositions[qi][1]);
            ctx.lineTo(qPositions[qj][0], qPositions[qj][1]);
            ctx.strokeStyle = `rgba(${hsl(hue + qi * 60)},${0.2 + Math.sin(t * 0.15 + qi) * 0.08})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
        ctx.restore();

        // Crystalline facets — 6 subtle highlight lines
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.clip();
        for (let f = 0; f < 6; f++) {
          const fa = (f / 6) * Math.PI + t * 0.012;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(fa) * cR * 0.1, cy + Math.sin(fa) * cR * 0.1);
          ctx.lineTo(cx + Math.cos(fa) * cR * 0.88, cy + Math.sin(fa) * cR * 0.88);
          ctx.strokeStyle = `rgba(255,255,255,${0.06 + Math.abs(Math.sin(fa + t * 0.02)) * 0.05})`;
          ctx.lineWidth = 0.35; ctx.stroke();
        }
        ctx.restore();

        // Specular highlight
        const spec = ctx.createRadialGradient(cx - cR * 0.42, cy - cR * 0.48, 0, cx - cR * 0.12, cy - cR * 0.12, cR);
        spec.addColorStop(0,    "rgba(255,255,255,0.95)");
        spec.addColorStop(0.18, "rgba(255,255,255,0.28)");
        spec.addColorStop(0.55, "rgba(255,255,255,0.05)");
        spec.addColorStop(1,    "rgba(255,255,255,0)");
        ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
        ctx.fillStyle = spec; ctx.fill();

        // Rim light — complementary hue
        const rim = ctx.createRadialGradient(cx + cR * 0.58, cy + cR * 0.44, 0, cx + cR * 0.36, cy + cR * 0.26, cR * 0.88);
        rim.addColorStop(0, `rgba(${hsl(hue + 180)},0.55)`);
        rim.addColorStop(1, `rgba(${hsl(hue + 180)},0)`);
        ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2);
        ctx.fillStyle = rim; ctx.fill();

        // Phase overlays
        if (ph === "done") {
          ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
          ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(cx - 4.5, cy + 0.5);
          ctx.lineTo(cx - 0.8, cy + 4.5);
          ctx.lineTo(cx + 5.5, cy - 4.5);
          ctx.stroke(); ctx.shadowBlur = 0;
        }
        if (ph === "fail") {
          ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
          ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
          ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
          ctx.stroke(); ctx.shadowBlur = 0;
        }
      };

      // ── Draw particles depth-sorted, nucleus at z=0 ────────────────────
      projected.forEach(({ px, py, sc, zd, p: pp }) => {
        if (!nucleusDrawn && zd > 0) { drawNucleus(); nucleusDrawn = true; }
        const depth = Math.max(0.08, Math.min(1, (sc - 0.36) / 0.70));
        const alpha = 0.16 + depth * 0.84;
        const size  = sc * (2.0 + depth * 3.0);

        pp.trail.forEach((pt, ti) => {
          const ta = alpha * (ti / pp.trail.length) * 0.22;
          const tr = size * (ti / pp.trail.length) * 0.60;
          if (tr < 0.10) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
          ctx.fillStyle = ringCol(pp.ring, ta); ctx.fill();
        });

        const g = ctx.createRadialGradient(px, py, 0, px, py, size * 3.2);
        g.addColorStop(0,    ringCol(pp.ring, alpha * 0.90));
        g.addColorStop(0.38, ringCol(pp.ring, alpha * 0.20));
        g.addColorStop(1,    ringCol(pp.ring, 0));
        ctx.beginPath(); ctx.arc(px, py, size * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();

        ctx.beginPath(); ctx.arc(px, py, Math.max(0.45, size * 0.30), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`; ctx.fill();
      });

      if (!nucleusDrawn) drawNucleus();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef}
      width={38} height={38}
      style={{ width: 38, height: 38, display: "block", flexShrink: 0, imageRendering: "auto", cursor: "crosshair" }}
      onMouseEnter={() => { hoverRef.current = true; burstRef.current = tRef.current; }}
      onMouseLeave={() => { hoverRef.current = false; mouseRef.current = { x: -1, y: -1 }; }}
      onMouseMove={(e) => {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        mouseRef.current = {
          x: (e.clientX - rect.left) * (38 / rect.width),
          y: (e.clientY - rect.top)  * (38 / rect.height),
        };
      }}
    />
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
  const [providerSearch, setProviderSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"nexus" | "metrics" | "arsenal">("nexus");
  const [atomHover, setAtomHover] = useState(false);
  const [magPos,    setMagPos]    = useState({ x: 0, y: 0 });
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
        onMouseEnter={() => setAtomHover(true)}
        onMouseLeave={() => { setAtomHover(false); setMagPos({ x: 0, y: 0 }); }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMagPos({
            x: ((e.clientX - (r.left + r.width  / 2)) / (r.width  / 2)) * 5,
            y: ((e.clientY - (r.top  + r.height / 2)) / (r.height / 2)) * 3,
          });
        }}
        style={{
          minWidth: 0, overflow: "visible",
          x: magPos.x, y: magPos.y,
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

        <QuantumAtom3D phase={phase} open={open} hover={atomHover} />

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
      {open && (
        <div
          className="fixed inset-0 z-[9990]"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}
        />
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -32, scale: 0.93 }}
            animate={{ opacity: 1, x: 0,   scale: 1    }}
            exit   ={{ opacity: 0, x: -32, scale: 0.94 }}
            transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              left: "16px",
              top: "5vh",
              zIndex: 9999,
              width: "clamp(340px, 44vw, 560px)",
              maxHeight: "90vh",
              perspective: "1400px",
              transformStyle: "preserve-3d",
              pointerEvents: "auto",
            }}
          >
            <div className="rounded-2xl flex flex-col"
              style={{
                background: "linear-gradient(160deg, rgba(0,12,8,0.99) 0%, rgba(2,8,6,0.99) 60%, rgba(0,10,6,0.99) 100%)",
                border: "1px solid rgba(0,255,136,0.30)",
                boxShadow: "0 0 100px rgba(0,255,136,0.14), 0 0 40px rgba(0,229,255,0.06), 0 32px 80px rgba(0,0,0,0.96), inset 0 1px 0 rgba(0,255,136,0.14), inset 0 0 60px rgba(0,255,136,0.02)",
                backdropFilter: "blur(36px)",
                maxHeight: "90vh",
                overflow: "hidden",
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

              {/* Tab bar */}
              <div className="flex px-4 gap-1 pt-2 pb-0" style={{ borderBottom: "1px solid rgba(0,255,136,0.08)" }}>
                {(["nexus", "metrics", "arsenal"] as const).map(tab => {
                  const labels: Record<string, string> = { nexus: "NEXUS", metrics: "METRICS", arsenal: "ARSENAL" };
                  const active = activeTab === tab;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="px-3 py-1.5 text-[8px] font-black tracking-widest uppercase rounded-t-lg transition-all font-mono"
                      style={{
                        color: active ? "rgba(0,255,136,0.95)" : "rgba(255,255,255,0.28)",
                        background: active ? "rgba(0,255,136,0.08)" : "transparent",
                        borderBottom: active ? "2px solid rgba(0,255,136,0.85)" : "2px solid transparent",
                      }}>
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* NEXUS tab */}
              {activeTab === "nexus" && (<>
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
                      <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>جارٍ المسح التلقائي...</>
                    ) : (
                      <><span style={{ fontSize: 12 }}>⚡</span>مسح تلقائي وتفعيل أفضل مزوّد</>
                    )}
                  </motion.button>
                </div>
                <div className="px-4 pb-2">
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                      style={{ color: "rgba(0,255,136,0.45)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" value={providerSearch} onChange={e => setProviderSearch(e.target.value)}
                      placeholder="بحث عن مزوّد..."
                      className="w-full pl-7 pr-2 py-1.5 text-[9px] font-mono rounded-lg outline-none"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid rgba(0,255,136,${providerSearch ? 0.38 : 0.15})`,
                        color: "rgba(255,255,255,0.8)",
                      }} dir="rtl" />
                    {providerSearch && (
                      <button onClick={() => setProviderSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px]"
                        style={{ color: "rgba(255,255,255,0.35)" }}>✕</button>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-3 space-y-1.5 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,136,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-[0.22em] uppercase mb-2 pt-1"
                    style={{ color: "rgba(0,255,136,0.38)" }}>
                    {providerSearch
                      ? `${ALL_PROVIDERS.filter(p => p.name.toLowerCase().includes(providerSearch.toLowerCase())).length} نتيجة`
                      : "المزوّدون المتاحون"}
                  </div>
                  {ALL_PROVIDERS.filter(p => !providerSearch || p.name.toLowerCase().includes(providerSearch.toLowerCase())).map(p => (
                    <ProviderCard key={p.id} prov={p}
                      isActive={state.activeProvider === p.providerName && state.activeProviderModel === (selectedModels[p.id] || p.models[0].id)}
                      configuredKey={keys[p.id] ?? ""}
                      selectedModel={selectedModels[p.id] ?? p.models[0].id}
                      onActivate={handleActivate} onModelChange={handleModelChange} onKeyChange={handleKeyChange} />
                  ))}
                </div>
              </>)}

              {/* METRICS tab */}
              {activeTab === "metrics" && (
                <div className="px-4 py-3 space-y-3 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,136,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>تصنيف سرعة النماذج</div>
                  {ALL_PROVIDERS.slice(0, 8).map((p, i) => {
                    const bar = 100 - i * 11;
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="w-16 text-[8px] font-mono truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{p.name}</div>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${bar}%` }}
                            transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                            style={{ background: `linear-gradient(90deg,${p.color},rgba(0,229,255,0.7))` }} />
                        </div>
                        <div className="w-8 text-[8px] font-black font-mono text-right" style={{ color: p.color }}>{bar}%</div>
                      </div>
                    );
                  })}
                  <div className="h-px" style={{ background: "rgba(0,255,136,0.08)" }} />
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>احصاءات الجلسة</div>
                  {[
                    { label: "الجلسة الحالية",  value: state.activeProvider.toUpperCase(), color: "rgba(0,255,136,0.9)" },
                    { label: "النموذج النشط",    value: (state.activeProviderModel ?? "---").split("/").pop()?.slice(0, 18) ?? "---", color: "rgba(0,229,255,0.8)" },
                    { label: "المفاتيح المُهيَّأة", value: `${cfgCnt} / ${ALL_PROVIDERS.length}`, color: "#a78bfa" },
                    { label: "الاستدامة",         value: `${Math.round((cfgCnt / ALL_PROVIDERS.length) * 100)}%`, color: "#22c55e" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,255,136,0.06)" }}>
                      <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.38)" }}>{s.label}</span>
                      <span className="text-[9px] font-black font-mono" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ARSENAL tab */}
              {activeTab === "arsenal" && (
                <div className="px-4 py-3 space-y-3 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,136,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>اختصارات لوحة المفاتيح</div>
                  {[
                    { keys: ["Ctrl", "Shift", "A"], desc: "فتح / إغلاق لوحة AI" },
                    { keys: ["Ctrl", "Enter"],      desc: "إرسال الرسالة" },
                    { keys: ["Ctrl", "K"],           desc: "البحث السريع" },
                    { keys: ["Esc"],                 desc: "إلغاء / إغلاق" },
                  ].map(row => (
                    <div key={row.desc} className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,255,136,0.06)" }}>
                      <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.45)" }}>{row.desc}</span>
                      <div className="flex items-center gap-0.5">
                        {row.keys.map((k, i) => (
                          <span key={k} className="flex items-center gap-0.5">
                            {i > 0 && <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.18)" }}>+</span>}
                            <kbd className="text-[7px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: "#0a0d10", border: "1px solid rgba(0,255,136,0.18)", color: "rgba(0,255,136,0.6)" }}>{k}</kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="h-px" style={{ background: "rgba(0,255,136,0.08)" }} />
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>أدوار سريعة</div>
                  {[
                    { role: "محلل أمني", desc: "خبير في تحليل الثغرات والهجمات",    color: "#ef4444" },
                    { role: "مطوّر",      desc: "مساعد برمجي متخصص في الكود",        color: "#3b82f6" },
                    { role: "باحث OSINT", desc: "جمع المعلومات من مصادر مفتوحة",     color: "#f59e0b" },
                    { role: "محلل CTF",   desc: "حل تحديات Capture The Flag",         color: "#8b5cf6" },
                    { role: "عام",        desc: "مساعد ذكاء اصطناعي عام",             color: "#22c55e" },
                  ].map(r => (
                    <motion.button key={r.role} onClick={() => {
                      const active = ALL_PROVIDERS.find(p => p.providerName === state.activeProvider);
                      if (active) { applyProvider(active, selectedModels[active.id] || active.models[0].id, keys[active.id] ?? ""); }
                      toast({ description: `دور نشط: ${r.role}` });
                    }}
                      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${r.color}22` }}
                      whileHover={{ background: `${r.color}0d`, borderColor: `${r.color}44` }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                      <div className="flex-1 text-left">
                        <div className="text-[9px] font-black" style={{ color: r.color }}>{r.role}</div>
                        <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{r.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

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
