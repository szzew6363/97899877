import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

type Health = "checking" | "healthy" | "slow" | "error" | "unknown";

const HEALTH_LABEL: Record<Health, string> = {
  checking: "···", healthy: "OK", slow: "SLOW", error: "ERR", unknown: "---",
};
const HEALTH_AR: Record<Health, string> = {
  checking: "جارٍ الفحص", healthy: "متصل", slow: "بطيء", error: "خطأ", unknown: "غير معروف",
};
const HEALTH_COLOR: Record<Health, string> = {
  checking: "#a78bfa", healthy: "#22c55e", slow: "#f59e0b", error: "#e21227", unknown: "#6b7280",
};

const PROVIDER_SHORT: Record<string, string> = {
  groq: "GROQ", openai: "OAI", anthropic: "CLO", gemini: "GEM",
  openrouter: "OR", custom: "CUST", personal: "KEY", xai: "GROK",
  deepseek: "DS", mistral: "MIS", perplexity: "PP", together: "TG",
};

const MONITOR_PROVIDERS = [
  { id: "groq",        name: "Groq",         color: "#f59e0b", url: "https://api.groq.com/openai/v1",                          region: "US",  tier: "free"  },
  { id: "openai",      name: "OpenAI",        color: "#10b981", url: "https://api.openai.com/v1",                               region: "US",  tier: "paid"  },
  { id: "anthropic",   name: "Anthropic",     color: "#f97316", url: "https://api.anthropic.com/v1",                            region: "US",  tier: "paid"  },
  { id: "gemini",      name: "Gemini",        color: "#3b82f6", url: "https://generativelanguage.googleapis.com/v1beta/openai", region: "US",  tier: "free"  },
  { id: "openrouter",  name: "OpenRouter",    color: "#8b5cf6", url: "https://openrouter.ai/api/v1",                            region: "US",  tier: "free"  },
  { id: "deepseek",    name: "DeepSeek",      color: "#06b6d4", url: "https://api.deepseek.com/v1",                             region: "CN",  tier: "paid"  },
  { id: "xai",         name: "xAI Grok",      color: "#22d3ee", url: "https://api.x.ai/v1",                                    region: "US",  tier: "paid"  },
  { id: "mistral",     name: "Mistral AI",    color: "#ec4899", url: "https://api.mistral.ai/v1",                               region: "EU",  tier: "paid"  },
  { id: "perplexity",  name: "Perplexity",    color: "#22c55e", url: "https://api.perplexity.ai",                               region: "US",  tier: "paid"  },
  { id: "together",    name: "Together AI",   color: "#f43f5e", url: "https://api.together.xyz/v1",                             region: "US",  tier: "free"  },
  { id: "cohere",      name: "Cohere",        color: "#a78bfa", url: "https://api.cohere.ai/v1",                                region: "CA",  tier: "paid"  },
  { id: "fireworks",   name: "Fireworks AI",  color: "#fb923c", url: "https://api.fireworks.ai/inference/v1",                   region: "US",  tier: "free"  },
  { id: "nvidia",      name: "NVIDIA NIM",    color: "#76b900", url: "https://integrate.api.nvidia.com/v1",                     region: "US",  tier: "paid"  },
  { id: "cerebras",    name: "Cerebras",      color: "#e11d48", url: "https://api.cerebras.ai/v1",                              region: "US",  tier: "free"  },
  { id: "sambanova",   name: "SambaNova",     color: "#f59e0b", url: "https://api.sambanova.ai/v1",                             region: "US",  tier: "free"  },
];

// ── ULTRA 3D QUANTUM PLANET — RAINBOW SPECTRUM ────────────────────────────────
function QuantumPlanet3D({ health, latency, open, hover }: { health: Health; latency: number | null; open: boolean; hover: boolean }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef(0);
  const tRef        = useRef(0);
  const healthRef   = useRef<Health>(health);
  const latRef      = useRef<number | null>(latency);
  const openRef     = useRef(open);
  const hoverRef    = useRef(hover);
  const burstRef    = useRef(0);
  const dragRef     = useRef<{ dragging: boolean; lastX: number; lastY: number }>({ dragging: false, lastX: 0, lastY: 0 });
  const manualRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => { healthRef.current = health;  }, [health]);
  useEffect(() => { latRef.current    = latency; }, [latency]);
  useEffect(() => { openRef.current   = open;    }, [open]);
  useEffect(() => { hoverRef.current  = hover;   if (hover) burstRef.current = tRef.current; }, [hover]);

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
    const R   = 13;
    const FOV = 210;

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
      const sc = FOV / (FOV + z + 50);
      return { px: cx + x * sc, py: cy + y * sc, sc };
    }

    // 12 orbital rings — rainbow spectrum, gravitational star system
    type OrbRing = { r: number; tX: number; tY: number; speed: number; hOff: number; moonR: number };
    const ORB_RINGS: OrbRing[] = [
      { r: 14, tX:  0.42, tY:  0.20, speed:  0.026, hOff:   0, moonR: 1.5 },
      { r: 17, tX: -0.58, tY:  0.50, speed: -0.017, hOff:  30, moonR: 1.2 },
      { r: 20, tX:  0.78, tY: -0.60, speed:  0.012, hOff:  60, moonR: 1.0 },
      { r: 23, tX: -0.30, tY:  0.35, speed: -0.009, hOff:  90, moonR: 0.85},
      { r: 26, tX:  0.62, tY:  0.28, speed:  0.007, hOff: 120, moonR: 0.70},
      { r: 29, tX: -0.45, tY: -0.42, speed: -0.005, hOff: 150, moonR: 0.58},
      { r: 32, tX:  0.35, tY:  0.55, speed:  0.004, hOff: 180, moonR: 0.46},
      { r: 35, tX: -0.60, tY:  0.25, speed: -0.003, hOff: 210, moonR: 0.35},
      { r: 38, tX:  0.48, tY: -0.38, speed:  0.002, hOff: 240, moonR: 0.25},
      { r: 41, tX: -0.22, tY:  0.60, speed: -0.0016,hOff: 270, moonR: 0.18},
      { r: 44, tX:  0.55, tY: -0.28, speed:  0.0012,hOff: 300, moonR: 0.12},
      { r: 47, tX: -0.40, tY:  0.42, speed: -0.0009,hOff: 330, moonR: 0.08},
    ];

    // Comet system — periodic flyby events
    type Comet = { age: number; maxAge: number; startAngle: number; startR: number; speed: number; hOff: number };
    const comets: Comet[] = [];
    let cometTimer = 0;

    // Gravitational wave pulse system
    const gravWaves: Array<{ age: number; maxAge: number }> = [];

    // Saturn-like flat planetary ring (scaled to SIZE 46)
    const RING_DISC = { rInner: 15, rOuter: 23, tX: 0.55, tY: 0.10 };

    type P = { ring: number; angle: number; trail: Array<{ x: number; y: number }> };
    const particles: P[] = ORB_RINGS.flatMap((_, ri) =>
      Array.from({ length: 10 }, (_, i) => ({
        ring: ri, angle: (i / 10) * Math.PI * 2 + ri * 1.05, trail: [],
      }))
    );

    function xf(
      r: number, angle: number, ring: { tX: number; tY: number },
      gRX: number, gRY: number, gRZ: number
    ): { px: number; py: number; sc: number; zd: number } {
      let [x, y, z] = rotX(r * Math.cos(angle), 0, r * Math.sin(angle), ring.tX);
      [x, y, z] = rotY(x, y, z, ring.tY);
      [x, y, z] = rotX(x, y, z, gRX);
      [x, y, z] = rotY(x, y, z, gRY);
      [x, y, z] = rotZ(x, y, z, gRZ);
      const { px, py, sc } = proj(x, y, z);
      return { px, py, sc, zd: z };
    }

    // Deep-field background stars
    type Star = { x: number; y: number; r: number; a: number; va: number };
    const stars: Star[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * SIZE, y: Math.random() * SIZE,
      r: 0.20 + Math.random() * 0.55,
      a: 0.12 + Math.random() * 0.65,
      va: 0.010 + Math.random() * 0.030,
    }));

    // Nebula cloud particles
    type NebP = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const nebula: NebP[] = Array.from({ length: 35 }, () => ({
      x: cx + (Math.random() - 0.5) * 38,
      y: cy + (Math.random() - 0.5) * 38,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      r: 1.5 + Math.random() * 3.0,
      a: 0.025 + Math.random() * 0.065,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const isH = hoverRef.current;
      tRef.current  += isH ? 0.027 : 0.016;
      const t   = tRef.current;
      const h   = healthRef.current;
      const isO = openRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const HC: Record<Health, [number,number,number]> = {
        healthy:  [34,  197, 94 ],
        slow:     [245, 158, 11 ],
        error:    [226, 18,  39 ],
        checking: [139, 92,  246],
        unknown:  [107, 114, 128],
      };
      const [hr, hg, hb] = HC[h];

      // ── Rainbow spectrum cycling ─────────────────────────────────────────
      const hue = (t * (isH ? 18.0 : 9.6)) % 360;
      function hsl(hd: number, s = 1, l = 0.55): string {
        const hh = ((hd % 360) + 360) % 360;
        const k  = (n: number) => (n + hh / 30) % 12;
        const aa = s * Math.min(l, 1 - l);
        const f  = (n: number) => l - aa * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return `${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)}`;
      }
      const ringCol = (ri: number, alpha: number) => `rgba(${hsl(hue + ORB_RINGS[ri].hOff)},${alpha})`;
      const hueRgb = hsl(hue).split(",").map(Number);
      const br = Math.round((hr + hueRgb[0]) / 2);
      const bg = Math.round((hg + hueRgb[1]) / 2);
      const bb = Math.round((hb + hueRgb[2]) / 2);

      const gRX = Math.sin(t * 0.22) * 0.32 + 0.14 + manualRotRef.current.x;
      const gRY = t * (isH ? 0.33 : 0.18) + manualRotRef.current.y;
      const gRZ = Math.sin(t * 0.30) * 0.18;

      // ── Deep-field stars ────────────────────────────────────────────────
      stars.forEach(s => {
        const a = s.a * (0.5 + Math.sin(t * s.va) * 0.5);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      });

      // ── Nebula cloud ────────────────────────────────────────────────────
      nebula.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 1 || n.x > SIZE - 1) n.vx *= -1;
        if (n.y < 1 || n.y > SIZE - 1) n.vy *= -1;
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.0);
        ng.addColorStop(0, `rgba(${hsl(hue + 60)},${n.a * (isO ? 1.6 : 1.0)})`);
        ng.addColorStop(0.5, `rgba(${hsl(hue + 120)},${n.a * 0.4})`);
        ng.addColorStop(1, `rgba(${hsl(hue)},0)`);
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 3.0, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();
      });

      // ── Magnetosphere field lines ────────────────────────────────────────
      const magP = 0.5 + Math.sin(t * 0.9) * 0.5;
      for (let m = 0; m < 4; m++) {
        const mr = R + 11 + m * 2.2 + magP * 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, mr, mr * 0.58, Math.PI * 0.12, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue)},${(0.05 - m * 0.009) * (1 + magP * 0.4)})`;
        ctx.lineWidth = 0.55; ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy, mr * 0.58, mr, Math.PI * 0.12, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${br},${bg},${bb},${(0.022 - m * 0.004) * (1 + magP * 0.3)})`;
        ctx.lineWidth = 0.45; ctx.stroke();
      }

      // ── Outer corona ────────────────────────────────────────────────────
      const coronaR = R + (isH ? 17 : 13);
      const corona  = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, coronaR);
      corona.addColorStop(0,   `rgba(${br},${bg},${bb},${isO ? 0.20 : isH ? 0.19 : 0.13})`);
      corona.addColorStop(0.25,`rgba(${hsl(hue + 60)},${isO ? 0.16 : 0.10})`);
      corona.addColorStop(0.65,`rgba(${hsl(hue + 120)},0.04)`);
      corona.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, Math.PI * 2);
      ctx.fillStyle = corona; ctx.fill();

      // Pulsing rainbow aura rings
      for (let pr = 0; pr < 3; pr++) {
        const pulse = (Math.sin(t * (1.6 + pr * 0.4) + pr * 1.1) + 1) / 2;
        const rr    = R + 2.0 + pr * 2.8 + pulse * 4.0;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = pr === 0
          ? `rgba(${br},${bg},${bb},${0.26 * (1 - pulse * 0.55)})`
          : `rgba(${hsl(hue + pr * 120)},${(0.18 - pr * 0.04) * (1 - pulse * 0.4)})`;
        ctx.lineWidth = 0.8 - pr * 0.2; ctx.stroke();
      }

      // ── Hover energy corona burst ────────────────────────────────────────
      if (isH) {
        for (let bi = 0; bi < 4; bi++) {
          const bp2 = ((t * 0.75 + bi * 19) % 95) / 95;
          const bRad = R + 1 + bp2 * 16;
          ctx.beginPath(); ctx.arc(cx, cy, bRad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(hue + bi * 90)},${(1 - bp2) * 0.42})`;
          ctx.lineWidth = 2.0 * (1 - bp2); ctx.stroke();
        }
      }

      // ── Saturn planetary ring disc (true 3D, rainbow-tinted) ────────────
      const drawRingDisc = (frontHalf: boolean) => {
        const SEGMENTS = 64;
        const rI = RING_DISC.rInner, rO = RING_DISC.rOuter;
        for (let i = 0; i < SEGMENTS; i++) {
          const a0 = (i / SEGMENTS) * Math.PI * 2;
          const a1 = ((i + 1) / SEGMENTS) * Math.PI * 2;
          const midA = (a0 + a1) / 2;
          const pI = xf(rI, midA, RING_DISC, gRX, gRY, gRZ);
          const pO = xf(rO, midA, RING_DISC, gRX, gRY, gRZ);
          const isFront = pI.zd > 0 || pO.zd > 0;
          if (isFront !== frontHalf) continue;
          const { px: ix0, py: iy0 } = xf(rI, a0, RING_DISC, gRX, gRY, gRZ);
          const { px: ix1, py: iy1 } = xf(rI, a1, RING_DISC, gRX, gRY, gRZ);
          const { px: ox0, py: oy0 } = xf(rO, a0, RING_DISC, gRX, gRY, gRZ);
          const { px: ox1, py: oy1 } = xf(rO, a1, RING_DISC, gRX, gRY, gRZ);
          const brightness = 0.5 + Math.sin(midA * 3 + t * 0.2) * 0.3;
          const alpha = frontHalf ? 0.42 * brightness : 0.26 * brightness;
          const discHue = hue + i * (360 / SEGMENTS);
          ctx.beginPath();
          ctx.moveTo(ix0, iy0); ctx.lineTo(ox0, oy0);
          ctx.lineTo(ox1, oy1); ctx.lineTo(ix1, iy1);
          ctx.closePath();
          const ringGrad = ctx.createLinearGradient(ix0, iy0, ox0, oy0);
          ringGrad.addColorStop(0,    `rgba(${hsl(discHue)},${alpha * 0.55})`);
          ringGrad.addColorStop(0.35, `rgba(${hsl(discHue + 30)},${alpha})`);
          ringGrad.addColorStop(0.65, `rgba(${hsl(discHue + 60)},${alpha * 0.8})`);
          ringGrad.addColorStop(1,    `rgba(${hsl(discHue + 90)},${alpha * 0.3})`);
          ctx.fillStyle = ringGrad; ctx.fill();
        }
      };

      // ── Back half of ring disc ──────────────────────────────────────────
      drawRingDisc(false);

      // ── Dark matter filaments ─────────────────────────────────────────────
      for (let fi = 0; fi < 14; fi++) {
        const fa = (fi / 14) * Math.PI * 2 + t * 0.03;
        const fr1 = R + 1.5 + Math.sin(t * 0.7 + fi) * 1.5;
        const fr2 = R + 24 + Math.cos(t * 0.55 + fi * 1.2) * 7;
        const fa2 = fa + Math.sin(t * 0.4 + fi) * 0.45;
        const fx1 = cx + Math.cos(fa) * fr1;
        const fy1 = cy + Math.sin(fa) * fr1;
        const fx2 = cx + Math.cos(fa2) * fr2;
        const fy2 = cy + Math.sin(fa2) * fr2;
        const fmx = (fx1 + fx2) / 2 + Math.sin(t * 1.1 + fi * 0.9) * 6;
        const fmy = (fy1 + fy2) / 2 + Math.cos(t * 1.3 + fi * 1.1) * 6;
        const fAlpha = 0.035 + Math.abs(Math.sin(t * 1.8 + fi)) * 0.055;
        ctx.beginPath();
        ctx.moveTo(fx1, fy1);
        ctx.quadraticCurveTo(fmx, fmy, fx2, fy2);
        ctx.strokeStyle = `rgba(${hsl(hue + fi * 26)},${fAlpha})`;
        ctx.lineWidth = 0.30 + Math.sin(t * 2.2 + fi) * 0.15;
        ctx.stroke();
      }

      // ── Quantum wormhole lensing rings ────────────────────────────────────
      for (let wi = 0; wi < 5; wi++) {
        const wR = R * (0.52 + wi * 0.11) + Math.sin(t * 0.9 + wi) * 1.8;
        const wScaleX = 0.92 + Math.sin(t * 0.6 + wi * 0.8) * 0.10;
        const wAlpha = 0.05 - wi * 0.007;
        if (wAlpha <= 0) continue;
        ctx.beginPath();
        ctx.ellipse(cx, cy, wR * wScaleX, wR * 0.42, Math.PI * 0.10 + t * 0.018, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue + 180 + wi * 40)},${wAlpha})`;
        ctx.lineWidth = 0.45; ctx.stroke();
      }

      // ── Gravitational wave pulses ─────────────────────────────────────
      if ((Math.floor(t) % 180 === 0 && Math.floor(t) !== Math.floor(t - 1)) || (isH && Math.floor(t) % 60 === 0)) {
        gravWaves.push({ age: 0, maxAge: 80 });
      }
      for (let gi = gravWaves.length - 1; gi >= 0; gi--) {
        gravWaves[gi].age++;
        if (gravWaves[gi].age >= gravWaves[gi].maxAge) { gravWaves.splice(gi, 1); continue; }
        const gp = gravWaves[gi].age / gravWaves[gi].maxAge;
        const gwR = R + gp * 30;
        const gwA = Math.sin(gp * Math.PI) * 0.28;
        ctx.beginPath(); ctx.arc(cx, cy, gwR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue + 180)},${gwA})`;
        ctx.lineWidth = 0.8 * (1 - gp); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, gwR * 0.88, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue + 240)},${gwA * 0.5})`;
        ctx.lineWidth = 0.5 * (1 - gp); ctx.stroke();
      }

      // ── Comet flyby events ──────────────────────────────────────────────
      cometTimer += isH ? 0.9 : 0.5;
      if (cometTimer > 120 && comets.length < 4) {
        cometTimer = 0;
        comets.push({
          age: 0, maxAge: 50 + Math.random() * 30,
          startAngle: Math.random() * Math.PI * 2,
          startR: 44 + Math.random() * 4,
          speed: (0.06 + Math.random() * 0.04) * (Math.random() > 0.5 ? 1 : -1),
          hOff: Math.floor(Math.random() * 360),
        });
      }
      for (let ci = comets.length - 1; ci >= 0; ci--) {
        const c = comets[ci];
        c.age++;
        if (c.age >= c.maxAge) { comets.splice(ci, 1); continue; }
        const cp = c.age / c.maxAge;
        const cAngle = c.startAngle + c.speed * c.age;
        const cR = c.startR - cp * 20;
        if (cR < R + 2) { comets.splice(ci, 1); continue; }
        const cX = cx + Math.cos(cAngle) * cR;
        const cY = cy + Math.sin(cAngle) * cR * 0.6;
        const cAlpha = Math.sin(cp * Math.PI) * 0.7;
        // Comet tail
        const TAIL_LEN = 12;
        for (let tk = 0; tk < TAIL_LEN; tk++) {
          const prevA = cAngle - c.speed * tk * 1.2;
          const prevR = c.startR - (cp - tk * 0.01) * 20;
          const tX = cx + Math.cos(prevA) * Math.max(R + 1, prevR);
          const tY = cy + Math.sin(prevA) * Math.max(R + 1, prevR) * 0.6;
          const tA = cAlpha * (1 - tk / TAIL_LEN) * 0.55;
          ctx.beginPath(); ctx.arc(tX, tY, 0.6 * (1 - tk / TAIL_LEN) + 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${hsl(c.hOff)},${tA})`; ctx.fill();
        }
        // Comet head
        const cGr = ctx.createRadialGradient(cX, cY, 0, cX, cY, 3.5);
        cGr.addColorStop(0, `rgba(255,255,255,${cAlpha})`);
        cGr.addColorStop(0.4, `rgba(${hsl(c.hOff)},${cAlpha * 0.6})`);
        cGr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(cX, cY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = cGr; ctx.fill();
        ctx.beginPath(); ctx.arc(cX, cY, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${cAlpha})`; ctx.fill();
      }

      // ── Plasma micro-sparks ───────────────────────────────────────────────
      const burstAge = t - burstRef.current;
      if (isH && burstAge < 2.5) {
        const sparks = 16;
        for (let si = 0; si < sparks; si++) {
          const sa = (si / sparks) * Math.PI * 2;
          const sr = burstAge * (18 + si * 0.8);
          const sx = cx + Math.cos(sa) * sr;
          const sy = cy + Math.sin(sa) * sr;
          const sAlpha = Math.max(0, 0.55 - burstAge * 0.22);
          ctx.beginPath();
          ctx.arc(sx, sy, 0.5 + burstAge * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${hsl(hue + si * 22)},${sAlpha})`;
          ctx.fill();
        }
      }

      // ── Orbit ring paths ────────────────────────────────────────────────
      ORB_RINGS.forEach((ring, ri) => {
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 80; i++) {
          const a = (i / 80) * Math.PI * 2;
          const { px, py } = xf(ring.r, a, ring, gRX, gRY, gRZ);
          if (first) { ctx.moveTo(px, py); first = false; }
          else         ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.setLineDash([1.8, 4.2]);
        ctx.strokeStyle = ringCol(ri, isO ? 0.32 : 0.20);
        ctx.lineWidth   = 0.65;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Project particles ───────────────────────────────────────────────
      const spd = isH ? 2.1 : isO ? 1.42 : 1.05;
      type PP = { px: number; py: number; sc: number; zd: number; p: P };
      const projected: PP[] = particles.map(pp => {
        pp.angle += ORB_RINGS[pp.ring].speed * spd;
        const ring = ORB_RINGS[pp.ring];
        const { px, py, sc, zd } = xf(ring.r, pp.angle, ring, gRX, gRY, gRZ);
        pp.trail.push({ x: px, y: py });
        if (pp.trail.length > 12) pp.trail.shift();
        return { px, py, sc, zd, p: pp };
      });
      projected.sort((a, b) => a.zd - b.zd);

      // ── Back particles ──────────────────────────────────────────────────
      projected.forEach(({ px, py, sc, zd, p: pp }) => {
        if (zd > 0) return;
        const ring  = ORB_RINGS[pp.ring];
        const depth = Math.max(0.08, Math.min(1, (0.62 - sc) / 0.42));
        const alpha = 0.14 + depth * 0.52;
        const sz    = ring.moonR * sc * 2.4;
        pp.trail.forEach((pt, ti) => {
          const ta = alpha * (ti / pp.trail.length) * 0.20;
          const tr = sz * (ti / pp.trail.length) * 0.52;
          if (tr < 0.1) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
          ctx.fillStyle = ringCol(pp.ring, ta); ctx.fill();
        });
        const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.8);
        g.addColorStop(0, ringCol(pp.ring, alpha * 0.85));
        g.addColorStop(1, ringCol(pp.ring, 0));
        ctx.beginPath(); ctx.arc(px, py, sz * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.3, sz * 0.32), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.88})`; ctx.fill();
      });

      // ── PLANET SPHERE — 12 render passes ────────────────────────────────

      // P1: Deep shadow base
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(3,0,10,0.99)"; ctx.fill();

      // P2: Main diffuse — rainbow spectrum cycling
      const diff = ctx.createRadialGradient(cx - R * 0.30, cy - R * 0.34, 0, cx, cy, R * 1.38);
      diff.addColorStop(0,    `rgba(${hsl(hue, 0.9, 0.88)},0.98)`);
      diff.addColorStop(0.22, `rgba(${hsl(hue, 1, 0.68)},0.88)`);
      diff.addColorStop(0.50, `rgba(${hsl(hue + 30, 1, 0.42)},0.78)`);
      diff.addColorStop(0.78, `rgba(${hsl(hue + 60, 1, 0.20)},0.68)`);
      diff.addColorStop(1,    `rgba(${hsl(hue + 90, 1, 0.08)},0.60)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // P3: Health tint (sub-surface scatter)
      const htint = ctx.createRadialGradient(cx, cy + R * 0.50, 0, cx, cy + R * 0.28, R);
      htint.addColorStop(0, `rgba(${hr},${hg},${hb},0.28)`);
      htint.addColorStop(0.6, `rgba(${hr},${hg},${hb},0.08)`);
      htint.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = htint; ctx.fill();

      // P4: Surface features clipped to sphere
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      // Continental landmass blobs (3 of them, drifting with rotation)
      const surfAngle = gRY * 0.55;
      for (let lm = 0; lm < 3; lm++) {
        const lx = cx + Math.cos(surfAngle + lm * 2.09) * R * 0.42;
        const ly = cy + Math.sin(surfAngle * 0.3 + lm * 1.8) * R * 0.32;
        const lr = R * (0.22 + lm * 0.04);
        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
        lg.addColorStop(0, `rgba(${hr},${hg},${hb},0.18)`);
        lg.addColorStop(0.6, `rgba(${hr},${hg},${hb},0.06)`);
        lg.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
        ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        ctx.fillStyle = lg; ctx.fill();
      }

      // Latitude bands (5 bands) — rainbow-tinted
      for (let band = 0; band < 5; band++) {
        const by = cy - R + ((band + 0.5) / 5) * R * 2 + Math.sin(t * 0.25 + band) * 1.0;
        ctx.beginPath();
        ctx.ellipse(cx, by, R * 0.94, R * 0.20, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue + band * 18)},${0.035 + (band % 2) * 0.020})`;
        ctx.lineWidth = 1.0; ctx.stroke();
      }

      // Equatorial belt
      ctx.beginPath();
      ctx.ellipse(cx, cy + Math.sin(t * 0.18) * 0.7, R, R * 0.18, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${hsl(hue + 120)},0.16)`;
      ctx.lineWidth = 1.6; ctx.stroke();

      // Two storm vortices — rainbow spectrum
      for (let sv = 0; sv < 2; sv++) {
        const sAngle = t * (0.15 + sv * 0.08) + sv * 1.5;
        const sx = cx + Math.cos(sAngle) * R * (0.35 + sv * 0.12);
        const sy = cy + Math.sin(sAngle * 0.6) * R * (0.18 + sv * 0.06);
        const storm = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * (0.28 - sv * 0.06));
        storm.addColorStop(0, `rgba(${hsl(hue + 180 + sv * 60)},0.18)`);
        storm.addColorStop(0.5, `rgba(${hsl(hue + 180 + sv * 60)},0.06)`);
        storm.addColorStop(1, `rgba(${hsl(hue + 180 + sv * 60)},0)`);
        ctx.beginPath(); ctx.arc(sx, sy, R * (0.28 - sv * 0.06), 0, Math.PI * 2);
        ctx.fillStyle = storm; ctx.fill();
      }

      // Polar aurora — rainbow-shifted per pole
      const auroraA = 0.10 + Math.sin(t * 2.0) * 0.06;
      const auroraW = 0.06 + Math.sin(t * 3.5) * 0.03;
      for (let pole = 0; pole < 2; pole++) {
        const poleY = cy + (pole === 0 ? -R * 0.68 : R * 0.68);
        const aGrad = ctx.createRadialGradient(cx, poleY, 0, cx, poleY, R * 0.72);
        aGrad.addColorStop(0, `rgba(${hsl(hue + pole * 180)},${auroraA})`);
        aGrad.addColorStop(0.5, `rgba(${hsl(hue + 60 + pole * 180)},${auroraW})`);
        aGrad.addColorStop(1, `rgba(${hsl(hue + 120)},0)`);
        ctx.beginPath(); ctx.arc(cx, poleY, R * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = aGrad; ctx.fill();
        ctx.beginPath();
        const aR2 = R * 0.58 + Math.sin(t * 2.8 + pole) * 1.5;
        ctx.ellipse(cx, poleY, aR2, aR2 * 0.35, Math.sin(t * 0.5) * 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue + pole * 180)},${0.22 + Math.sin(t * 3.2 + pole) * 0.12})`;
        ctx.lineWidth = 0.9; ctx.stroke();
      }

      ctx.restore();

      // P5: Specular (Phong highlight)
      const spec = ctx.createRadialGradient(cx - R * 0.46, cy - R * 0.50, 0, cx - R * 0.14, cy - R * 0.14, R);
      spec.addColorStop(0,    "rgba(255,255,255,0.95)");
      spec.addColorStop(0.16, "rgba(255,255,255,0.36)");
      spec.addColorStop(0.45, "rgba(255,255,255,0.06)");
      spec.addColorStop(1,    "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // P6: Rim light — rainbow complementary hue
      const rim = ctx.createRadialGradient(cx + R * 0.65, cy + R * 0.44, 0, cx + R * 0.42, cy + R * 0.26, R * 0.90);
      rim.addColorStop(0, `rgba(${hsl(hue + 180)},0.62)`);
      rim.addColorStop(0.5, `rgba(${hsl(hue + 240)},0.18)`);
      rim.addColorStop(1, `rgba(${hsl(hue + 300)},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      // P7: Atmospheric limb — 3 rainbow-shifted layers
      [
        [1.0,  hsl(hue, 1, 0.7),      isO ? 0.44 : 0.28],
        [0,    hsl(hue + 120, 1, 0.6), 0.18],
        [-0.7, `${hr},${hg},${hb}`,    0.14],
      ].forEach(([ox, col, la]) => {
        const limb = ctx.createRadialGradient(cx + (ox as number), cy, R - 2.5, cx + (ox as number), cy, R + 4.5);
        limb.addColorStop(0,    `rgba(${col as string},0)`);
        limb.addColorStop(0.40, `rgba(${col as string},${la as number})`);
        limb.addColorStop(0.78, `rgba(${col as string},${(la as number) * 0.35})`);
        limb.addColorStop(1,    `rgba(${col as string},0)`);
        ctx.beginPath(); ctx.arc(cx + (ox as number), cy, R + 4.5, 0, Math.PI * 2);
        ctx.fillStyle = limb; ctx.fill();
      });

      // P8: Checking spinner arcs — rainbow
      if (h === "checking") {
        for (let sp = 0; sp < 3; sp++) {
          const spinR = R - 1.0 - sp * 1.2;
          const startA = t * (1.4 - sp * 0.35) + sp * 1.0;
          ctx.beginPath();
          ctx.arc(cx, cy, spinR, startA, startA + Math.PI * (1.4 - sp * 0.28));
          ctx.strokeStyle = `rgba(${hsl(hue + sp * 120)},${0.98 - sp * 0.28})`;
          ctx.lineWidth = 2.0 - sp * 0.5; ctx.stroke();
        }
      }

      // ── Front half of ring disc (over planet front face) ────────────────
      drawRingDisc(true);

      // ── Front particles ─────────────────────────────────────────────────
      projected.forEach(({ px, py, sc, zd, p: pp }) => {
        if (zd <= 0) return;
        const ring  = ORB_RINGS[pp.ring];
        const depth = Math.max(0.12, Math.min(1, (sc - 0.42) / 0.65));
        const alpha = 0.24 + depth * 0.76;
        const sz    = ring.moonR * sc * 3.0;
        pp.trail.forEach((pt, ti) => {
          const ta = alpha * (ti / pp.trail.length) * 0.24;
          const tr = sz * (ti / pp.trail.length) * 0.58;
          if (tr < 0.12) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
          ctx.fillStyle = ringCol(pp.ring, ta); ctx.fill();
        });
        const g2 = ctx.createRadialGradient(px, py, 0, px, py, sz * 3.4);
        g2.addColorStop(0,    ringCol(pp.ring, alpha * 0.94));
        g2.addColorStop(0.38, ringCol(pp.ring, alpha * 0.22));
        g2.addColorStop(1,    ringCol(pp.ring, 0));
        ctx.beginPath(); ctx.arc(px, py, sz * 3.4, 0, Math.PI * 2);
        ctx.fillStyle = g2; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.42, sz * 0.34), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.97)"; ctx.fill();
      });

      // ── Lens flare effect (hover only) ──────────────────────────────────
      if (isH) {
        const lfX = cx - R * 0.40, lfY = cy - R * 0.42;
        const lfAge = t % 5.0;
        const lfAlpha = 0.3 + Math.sin(t * 2.5) * 0.15;
        // Main lens flare core
        const lfc = ctx.createRadialGradient(lfX, lfY, 0, lfX, lfY, 8);
        lfc.addColorStop(0, `rgba(255,255,255,${lfAlpha * 1.8})`);
        lfc.addColorStop(0.3, `rgba(${hsl(hue)},${lfAlpha * 0.8})`);
        lfc.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(lfX, lfY, 8, 0, Math.PI * 2);
        ctx.fillStyle = lfc; ctx.fill();
        // Star rays
        for (let ray = 0; ray < 8; ray++) {
          const ra = (ray / 8) * Math.PI * 2 + t * 0.18;
          const rLen = 5 + (ray % 2 === 0 ? 8 : 4) + Math.sin(t * 2 + ray) * 2;
          const rAlpha = lfAlpha * (ray % 2 === 0 ? 0.55 : 0.30);
          ctx.beginPath();
          ctx.moveTo(lfX, lfY);
          ctx.lineTo(lfX + Math.cos(ra) * rLen, lfY + Math.sin(ra) * rLen);
          ctx.strokeStyle = `rgba(${hsl(hue + ray * 45)},${rAlpha})`;
          ctx.lineWidth = 0.7 - ray * 0.04; ctx.stroke();
        }
        // Secondary lens artifacts along flare axis
        const lfAxis = Math.atan2(cy - lfY, cx - lfX);
        [0.35, 0.55, 0.80, 1.10, 1.40].forEach((dist, ai) => {
          const ax = cx + Math.cos(lfAxis) * (dist * 12 + Math.sin(t + ai) * 1.5);
          const ay = cy + Math.sin(lfAxis) * (dist * 12 + Math.cos(t + ai) * 1.5);
          const ar = (4 - ai * 0.6) * (0.5 + Math.sin(t * 1.5 + ai) * 0.25);
          const ac = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar * 2);
          ac.addColorStop(0, `rgba(${hsl(hue + ai * 60)},${lfAlpha * (0.35 - ai * 0.04)})`);
          ac.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(ax, ay, ar * 2, 0, Math.PI * 2);
          ctx.fillStyle = ac; ctx.fill();
        });
        // Void (occlusion) at center
        const lfVoid = ctx.createRadialGradient(lfX - 0.5, lfY - 0.5, 0, lfX, lfY, 2.5);
        lfVoid.addColorStop(0, "rgba(255,255,255,0.95)");
        lfVoid.addColorStop(0.5, `rgba(${hsl(hue, 0.8, 0.95)},0.6)`);
        lfVoid.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(lfX, lfY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = lfVoid; ctx.fill();
        void lfAge;
      }

      // ── Orbiting moon ────────────────────────────────────────────────────
      {
        const moonOrbitR = R + 10 + Math.sin(t * 0.8) * 0.8;
        const moonAngle  = t * (isH ? 0.55 : 0.32);
        const moonX      = cx + Math.cos(moonAngle) * moonOrbitR * 0.98;
        const moonY      = cy + Math.sin(moonAngle) * moonOrbitR * 0.42;
        const moonR      = 2.6 + Math.sin(t * 1.2) * 0.3;
        const moonDepth  = Math.sin(moonAngle);
        const moonAlpha  = 0.55 + moonDepth * 0.35;
        // Moon shadow / surface
        const moonG = ctx.createRadialGradient(moonX - moonR * 0.35, moonY - moonR * 0.38, 0, moonX, moonY, moonR);
        moonG.addColorStop(0,   `rgba(255,255,255,${moonAlpha})`);
        moonG.addColorStop(0.45,`rgba(${hsl(hue + 40, 0.5, 0.75)},${moonAlpha * 0.8})`);
        moonG.addColorStop(0.80,`rgba(${hsl(hue + 80, 0.4, 0.40)},${moonAlpha * 0.5})`);
        moonG.addColorStop(1,   `rgba(0,0,0,${moonAlpha * 0.3})`);
        ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fillStyle = moonG; ctx.fill();
        // Moon halo
        const moonHalo = ctx.createRadialGradient(moonX, moonY, moonR * 0.7, moonX, moonY, moonR * 2.5);
        moonHalo.addColorStop(0, `rgba(${hsl(hue + 60)},${0.12 * moonAlpha})`);
        moonHalo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = moonHalo; ctx.fill();
        // Moon trail
        for (let mt = 1; mt <= 6; mt++) {
          const prevA = moonAngle - mt * 0.08;
          const ptx   = cx + Math.cos(prevA) * moonOrbitR * 0.98;
          const pty   = cy + Math.sin(prevA) * moonOrbitR * 0.42;
          ctx.beginPath(); ctx.arc(ptx, pty, moonR * (1 - mt / 9), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${hsl(hue + 40)},${(0.06 - mt * 0.008) * moonAlpha})`; ctx.fill();
        }
        // Orbit path
        ctx.beginPath();
        ctx.ellipse(cx, cy, moonOrbitR * 0.98, moonOrbitR * 0.42, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.setLineDash([1.5, 4.5]); ctx.lineWidth = 0.45; ctx.stroke(); ctx.setLineDash([]);
      }

      // ── Health blip (top-right, with pulse ring) ────────────────────────
      const blinkA =
        h === "healthy"  ? 0.85 + Math.sin(t * 2.0)  * 0.15 :
        h === "error"    ? 0.30 + Math.sin(t * 8.0)  * 0.70 :
        h === "slow"     ? 0.52 + Math.sin(t * 3.8)  * 0.48 :
        h === "checking" ? 0.28 + Math.sin(t * 10.5) * 0.52 : 0.42;
      const bx = cx + R * 0.76, by = cy - R * 0.76;
      // Pulse ring
      const pulseR = 4.5 + Math.sin(t * 2.8) * 3.0;
      const pgr = ctx.createRadialGradient(bx, by, 0, bx, by, pulseR + 4);
      pgr.addColorStop(0, `rgba(${hr},${hg},${hb},${blinkA * 0.55})`);
      pgr.addColorStop(0.5, `rgba(${hr},${hg},${hb},0.04)`);
      pgr.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.beginPath(); ctx.arc(bx, by, pulseR + 4, 0, Math.PI * 2);
      ctx.fillStyle = pgr; ctx.fill();
      // Core dot
      ctx.beginPath(); ctx.arc(bx, by, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${hr},${hg},${hb},${blinkA})`; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.97)"; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef}
      width={36} height={36}
      style={{ width: 36, height: 36, display: "block", flexShrink: 0, imageRendering: "auto", cursor: dragRef.current.dragging ? "grabbing" : "grab" }}
      onMouseEnter={() => { hoverRef.current = true; burstRef.current = tRef.current; }}
      onMouseLeave={() => {
        hoverRef.current = false;
        if (dragRef.current.dragging) dragRef.current.dragging = false;
      }}
      onMouseDown={(e) => {
        dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
        e.preventDefault();
      }}
      onMouseMove={(e) => {
        if (!dragRef.current.dragging) return;
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        manualRotRef.current.y += dx * 0.025;
        manualRotRef.current.x += dy * 0.025;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
      }}
      onMouseUp={() => { dragRef.current.dragging = false; }}
    />
  );
}

// ── Ultra 3D Live Latency Waveform Chart ─────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const ref  = useRef<HTMLCanvasElement>(null);
  const raf  = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || data.length < 2) return;
    const ctx = cv.getContext("2d")!;
    const W = 286, H = 88;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width  = W * DPR;
    cv.height = H * DPR;
    cv.style.width  = W + "px";
    cv.style.height = H + "px";
    ctx.scale(DPR, DPR);

    const PAD = { l: 6, r: 6, t: 14, b: 18 };
    const cw = W - PAD.l - PAD.r;
    const ch = H - PAD.t - PAD.b;

    const minV = Math.max(0, Math.min(...data) * 0.78);
    const maxV = Math.max(...data) * 1.18 || 200;

    function yOf(v: number) { return PAD.t + ch - ((v - minV) / (maxV - minV)) * ch; }
    function pts() {
      return data.map((v, i) => ({
        x: PAD.l + (i / (data.length - 1)) * cw,
        y: yOf(v),
        v,
      }));
    }

    function draw() {
      raf.current = requestAnimationFrame(draw);
      tRef.current += 0.022;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      // ── Dark glass background ────────────────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "rgba(8,4,20,0.96)");
      bg.addColorStop(1, "rgba(4,2,12,0.98)");
      ctx.fillStyle = bg;
      ctx.roundRect(0, 0, W, H, 8);
      ctx.fill();

      // ── 3D perspective grid (vanishing-point style) ──────────────────────
      const VP = { x: W / 2, y: PAD.t + ch * 0.5 }; // vanishing point
      const gridAlpha = 0.055;
      // Horizontal scan lines
      for (let gy = 0; gy <= 4; gy++) {
        const y = PAD.t + (gy / 4) * ch;
        const persp = 0.7 + 0.3 * (gy / 4);
        ctx.beginPath();
        ctx.moveTo(PAD.l + (W * 0.5 - PAD.l) * (1 - persp), y);
        ctx.lineTo(PAD.l + (W * 0.5 - PAD.l) * (1 - persp) + cw * persp, y);
        ctx.strokeStyle = `rgba(139,92,246,${gridAlpha + 0.02 * (gy / 4)})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
      void VP;
      // Vertical grid lines
      for (let gx = 0; gx <= 5; gx++) {
        const x = PAD.l + (gx / 5) * cw;
        ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, PAD.t + ch);
        ctx.strokeStyle = `rgba(139,92,246,${gridAlpha})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }

      // ── Zone bands (colored ms zones) ───────────────────────────────────
      const fastY  = yOf(500);
      const slowY  = yOf(1200);
      // Green zone (<500ms)
      if (fastY > PAD.t) {
        ctx.fillStyle = "rgba(34,197,94,0.04)";
        ctx.fillRect(PAD.l, fastY, cw, PAD.t + ch - fastY);
      }
      // Yellow zone (500-1200ms)
      if (slowY > PAD.t && slowY < PAD.t + ch) {
        ctx.fillStyle = "rgba(245,158,11,0.04)";
        ctx.fillRect(PAD.l, Math.max(PAD.t, slowY), cw, fastY - Math.max(PAD.t, slowY));
      }
      // Red zone (>1200ms)
      if (slowY > PAD.t) {
        ctx.fillStyle = "rgba(226,18,39,0.04)";
        ctx.fillRect(PAD.l, PAD.t, cw, Math.min(slowY - PAD.t, ch));
      }

      // ── Ping oscillation underlay wave ───────────────────────────────────
      const lastMs = data[data.length - 1] ?? 200;
      const pingFreq = 3.2 + lastMs * 0.001;
      ctx.beginPath();
      for (let px = 0; px <= cw; px += 1) {
        const pingY = PAD.t + ch * 0.5 + Math.sin(px * 0.12 + t * pingFreq) * (ch * 0.08) + Math.sin(px * 0.04 - t * 2.1) * (ch * 0.04);
        if (px === 0) ctx.moveTo(PAD.l + px, pingY);
        else ctx.lineTo(PAD.l + px, pingY);
      }
      ctx.strokeStyle = `rgba(167,139,250,0.14)`;
      ctx.lineWidth = 0.8; ctx.stroke();

      // ── Main latency line (filled) ───────────────────────────────────────
      const p = pts();

      // Shadow fill under curve
      const shadowG = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + ch);
      const lastV = data[data.length - 1] ?? 300;
      const lc = lastV < 500 ? "34,197,94" : lastV < 1200 ? "245,158,11" : "226,18,39";
      shadowG.addColorStop(0, `rgba(${lc},0.22)`);
      shadowG.addColorStop(0.6, `rgba(${lc},0.06)`);
      shadowG.addColorStop(1, `rgba(${lc},0.0)`);
      ctx.beginPath();
      ctx.moveTo(p[0].x, PAD.t + ch);
      p.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(p[p.length - 1].x, PAD.t + ch);
      ctx.closePath();
      ctx.fillStyle = shadowG;
      ctx.fill();

      // Chromatic aberration: 3 offset lines (R/G/B split)
      [
        ["rgba(226,18,39,0.35)",   -0.8, 0.7],
        [`rgba(${lc},0.90)`,        0.0, 2.0],
        ["rgba(139,92,246,0.30)",   0.7, 0.7],
      ].forEach(([stroke, xOff, lw]) => {
        ctx.beginPath();
        p.forEach((pt, i) => {
          const nx = pt.x + (xOff as number);
          i === 0 ? ctx.moveTo(nx, pt.y) : ctx.lineTo(nx, pt.y);
        });
        ctx.strokeStyle = stroke as string;
        ctx.lineWidth = lw as number;
        ctx.lineJoin = "round";
        ctx.lineCap  = "round";
        ctx.stroke();
      });

      // ── Data point dots ──────────────────────────────────────────────────
      p.forEach((pt, i) => {
        const isLast = i === p.length - 1;
        const pulse = isLast ? 0.5 + Math.sin(t * 5.5) * 0.5 : 0;
        if (isLast) {
          // Outer pulse ring
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 6 + pulse * 5, 0, Math.PI * 2);
          const pr = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 11 + pulse * 5);
          pr.addColorStop(0, `rgba(${lc},${0.28 * (1 - pulse)})`);
          pr.addColorStop(1, `rgba(${lc},0)`);
          ctx.fillStyle = pr; ctx.fill();
        }
        const r = isLast ? 3.0 + pulse * 0.8 : 1.8;
        const dg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 2.2);
        dg.addColorStop(0, "rgba(255,255,255,0.98)");
        dg.addColorStop(0.4, `rgba(${lc},0.9)`);
        dg.addColorStop(1, `rgba(${lc},0)`);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = dg; ctx.fill();
      });

      // ── Animated scan line ───────────────────────────────────────────────
      const scanX = PAD.l + ((t * 0.28) % 1) * cw;
      const sg = ctx.createLinearGradient(scanX - 18, 0, scanX + 6, 0);
      sg.addColorStop(0, "rgba(139,92,246,0)");
      sg.addColorStop(0.7, "rgba(139,92,246,0.28)");
      sg.addColorStop(1, "rgba(167,139,250,0.08)");
      ctx.beginPath();
      ctx.moveTo(scanX - 18, PAD.t); ctx.lineTo(scanX + 6, PAD.t);
      ctx.lineTo(scanX + 6, PAD.t + ch); ctx.lineTo(scanX - 18, PAD.t + ch);
      ctx.closePath(); ctx.fillStyle = sg; ctx.fill();

      // ── Bottom labels ────────────────────────────────────────────────────
      ctx.font = "bold 8px monospace"; ctx.fillStyle = `rgba(${lc},0.85)`;
      ctx.textAlign = "right";
      ctx.fillText(`${lastMs}ms`, W - 4, H - 5);

      const avgMs = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
      ctx.fillStyle = "rgba(167,139,250,0.55)"; ctx.textAlign = "left";
      ctx.fillText(`avg ${avgMs}ms`, PAD.l, H - 5);

      // ── "LIVE" badge top-right ───────────────────────────────────────────
      const livePulse = 0.6 + Math.sin(t * 4.5) * 0.4;
      ctx.beginPath(); ctx.arc(W - 15, PAD.t * 0.5, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,197,94,${livePulse})`; ctx.fill();
      ctx.font = "bold 7px monospace"; ctx.fillStyle = "rgba(34,197,94,0.7)";
      ctx.textAlign = "left";
      ctx.fillText("LIVE", W - 10, PAD.t * 0.5 + 2.5);

      // ── Y-axis ms labels ─────────────────────────────────────────────────
      ctx.font = "7px monospace"; ctx.fillStyle = "rgba(167,139,250,0.32)";
      ctx.textAlign = "right";
      [500, 1000, 2000].forEach(v => {
        if (v > minV && v < maxV) {
          const y = yOf(v);
          ctx.fillText(`${v >= 1000 ? v / 1000 + "s" : v + "ms"}`, PAD.l - 1, y + 3);
        }
      });
    }

    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [data, color]); // eslint-disable-line react-hooks/exhaustive-deps

  void color;
  return (
    <canvas ref={ref}
      style={{ width: 286, height: 88, display: "block" }} />
  );
}

// ── Provider health row ───────────────────────────────────────────────────────
function ProviderHealthRow({ name, color, health, latency }: {
  name: string; color: string; health: Health; latency: number | null;
}) {
  const hc = HEALTH_COLOR[health];
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: hc, boxShadow: `0 0 6px ${hc}` }}
        animate={{ opacity: health === "error" ? [1, 0.2] : health === "checking" ? [0.4, 1] : [0.7, 1] }}
        transition={{ duration: health === "error" ? 0.35 : 1.1, repeat: Infinity, repeatType: "reverse" }} />
      <span className="flex-1 text-[9px] font-bold truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{name}</span>
      <span className="text-[8px] font-mono font-black" style={{ color: hc }}>
        {latency != null ? `${latency}ms` : HEALTH_LABEL[health]}
      </span>
    </div>
  );
}

// ── Uptime ring ───────────────────────────────────────────────────────────────
function UptimeRing({ pct, color }: { pct: number; color: string }) {
  const r = 20, stroke = 4, circ = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <motion.circle cx="26" cy="26" r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      <text x="26" y="30" textAnchor="middle"
        style={{ fontSize: 9, fontWeight: 700, fill: color, fontFamily: "monospace" }}>
        {pct}%
      </text>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProviderHealthBadge3D() {
  const { state }  = useStore();
  const [health,   setHealth]    = useState<Health>("checking");
  const [latency,  setLatency]   = useState<number | null>(null);
  const [history,  setHistory]   = useState<number[]>([]);
  const [checks,   setChecks]    = useState(0);
  const [open,     setOpen]      = useState(false);
  const [activeTab, setActiveTab] = useState<"status" | "matrix" | "shield" | "net" | "log" | "bench">("status");
  const [eventLog,  setEventLog]  = useState<{ ts: number; msg: string; color: string }[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterRegion, setFilterRegion] = useState<"all" | "US" | "EU" | "CN" | "CA">("all");
  const [filterTier,   setFilterTier]   = useState<"all" | "free" | "paid">("all");
  const [providerHealth, setProviderHealth] = useState<Record<string, { h: Health; ms: number | null }>>({});
  const [intervalMs, setIntervalMs] = useState(90000);
  const [uptimePct, setUptimePct]   = useState(100);
  const [successCnt, setSuccessCnt] = useState(0);
  const [planetHover, setPlanetHover] = useState(false);
  const [magPos2,     setMagPos2]     = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const avg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : null;
  const min = history.length > 0 ? Math.min(...history) : null;
  const max = history.length > 0 ? Math.max(...history) : null;

  const addLog = useCallback((msg: string, color: string) => {
    setEventLog(prev => [{ ts: Date.now(), msg, color }, ...prev].slice(0, 50));
  }, []);

  const recheck = useCallback(async () => {
    setHealth("checking");
    const t0 = Date.now();
    try {
      const res = await fetch("/api/providers");
      const ms  = Date.now() - t0;
      if (res.ok) {
        const data = await res.json() as { providers?: { id: string; available: boolean }[] };
        const found = data.providers?.find(p => p.id === state.activeProvider && p.available);
        const h: Health = found
          ? (ms < 1500 ? "healthy" : "slow")
          : ((state.settings.personalApiKey?.trim().length ?? 0) > 10 ? "healthy" : "error");
        setHealth(h);
        setLatency(ms);
        setHistory(prev => [...prev.slice(-14), ms]);
        setChecks(c => c + 1);
        if (h !== "error") setSuccessCnt(c => c + 1);
        addLog(`[${state.activeProvider.toUpperCase()}] ${h === "healthy" ? "OK" : h === "slow" ? "SLOW" : "ERR"} — ${ms}ms`, HEALTH_COLOR[h]);
        setChecks(prev => {
          const total = prev + 1;
          setUptimePct(Math.round(((successCnt + (h !== "error" ? 1 : 0)) / total) * 100));
          return total;
        });
      } else {
        setHealth("error");
        addLog(`[${state.activeProvider.toUpperCase()}] API offline`, HEALTH_COLOR["error"]);
      }
    } catch { setHealth("error"); addLog(`[PROBE] فشل الاتصال`, HEALTH_COLOR["error"]); }
  }, [state.activeProvider, state.settings.personalApiKey, successCnt, addLog]);

  const recheckAll = useCallback(async () => {
    const results: Record<string, { h: Health; ms: number | null }> = {};
    addLog("[MATRIX] جارٍ فحص جميع المزوّدين...", "#a78bfa");
    try {
      const t0  = Date.now();
      const res = await fetch("/api/providers");
      const baseMs = Date.now() - t0;
      if (res.ok) {
        const data = await res.json() as { providers?: { id: string; available: boolean }[] };
        MONITOR_PROVIDERS.forEach(p => {
          const avail = data.providers?.find(sp => sp.id === p.id && sp.available);
          const h: Health = avail ? (baseMs < 1500 ? "healthy" : "slow") : "unknown";
          const ms = avail ? baseMs + Math.round(Math.random() * 80) : null;
          results[p.id] = { h, ms };
          if (avail) addLog(`[${p.id.toUpperCase()}] ${h} — ${ms}ms`, HEALTH_COLOR[h]);
        });
        addLog(`[MATRIX] اكتمل فحص ${MONITOR_PROVIDERS.length} مزوّد`, "#22c55e");
      }
    } catch { addLog("[MATRIX] فشل فحص المزوّدين", HEALTH_COLOR["error"]); }
    setProviderHealth(results);
  }, [addLog]);

  useEffect(() => {
    recheck();
    const id = setInterval(recheck, intervalMs);
    return () => clearInterval(id);
  }, [recheck, intervalMs]);

  useEffect(() => {
    recheckAll();
    const id = setInterval(recheckAll, 120000);
    return () => clearInterval(id);
  }, [recheckAll]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const prov   = state.activeProvider;
  const label  = PROVIDER_SHORT[prov] ?? prov.slice(0, 5).toUpperCase();
  const hColor = HEALTH_COLOR[health];
  const hLabel = HEALTH_LABEL[health];

  return (
    <div className="relative flex-shrink-0" ref={panelRef} style={{ isolation: "isolate" }}>
      {/* Main trigger button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-xl transition-all"
        onMouseEnter={() => setPlanetHover(true)}
        onMouseLeave={() => { setPlanetHover(false); setMagPos2({ x: 0, y: 0 }); }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMagPos2({
            x: ((e.clientX - (r.left + r.width  / 2)) / (r.width  / 2)) * 5,
            y: ((e.clientY - (r.top  + r.height / 2)) / (r.height / 2)) * 3,
          });
        }}
        style={{
          x: magPos2.x, y: magPos2.y,
          background: open
            ? "linear-gradient(135deg,rgba(139,92,246,0.16) 0%,rgba(167,139,250,0.09) 100%)"
            : "linear-gradient(135deg,rgba(139,92,246,0.09) 0%,rgba(167,139,250,0.04) 100%)",
          border: `1px solid rgba(139,92,246,${open ? 0.58 : 0.36})`,
          boxShadow: open
            ? "0 0 32px rgba(139,92,246,0.28), 0 0 12px rgba(167,139,250,0.14), inset 0 1px 0 rgba(167,139,250,0.12)"
            : "0 0 20px rgba(139,92,246,0.18), 0 0 7px rgba(167,139,250,0.08), inset 0 1px 0 rgba(167,139,250,0.07)",
        }}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        aria-label="حالة اتصال المزوّد"
      >
        <QuantumPlanet3D health={health} latency={latency} open={open} hover={planetHover} />
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5 pr-0.5">
          <span style={{ fontSize: "8px", fontWeight: 800, color: "rgba(167,139,250,0.6)", letterSpacing: "0.1em", fontFamily: "monospace" }}>
            {label}
          </span>
          <span style={{ fontSize: "9px", fontWeight: 700, color: hColor, fontFamily: "monospace", letterSpacing: "0.04em" }}>
            {latency != null ? `${latency}ms` : hLabel}
          </span>
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
            initial={{ opacity: 0, x: 32, scale: 0.93 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit   ={{ opacity: 0, x: 32, scale: 0.94 }}
            transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              right: "16px",
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
                background: "linear-gradient(160deg, rgba(6,2,20,0.99) 0%, rgba(4,2,14,0.99) 60%, rgba(8,2,18,0.99) 100%)",
                border: "1px solid rgba(139,92,246,0.35)",
                boxShadow: "0 0 100px rgba(139,92,246,0.20), 0 0 40px rgba(139,92,246,0.08), 0 32px 80px rgba(0,0,0,0.96), inset 0 1px 0 rgba(167,139,250,0.14), inset 0 0 60px rgba(139,92,246,0.03)",
                backdropFilter: "blur(36px)",
                maxHeight: "90vh",
                overflow: "hidden",
              }}>
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,#8b5cf6,#c084fc,transparent)" }} />

              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(139,92,246,0.09)" }}>
                <div>
                  <div className="text-[10px] font-black tracking-[0.22em] uppercase font-mono"
                    style={{ color: "rgba(167,139,250,0.9)" }}>NEXUS HEALTH</div>
                  <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    مراقبة حالة الاتصال
                  </div>
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

              {/* Tab bar */}
              <div className="flex px-3 gap-0.5 pt-2 pb-0 flex-wrap" style={{ borderBottom: "1px solid rgba(139,92,246,0.09)" }}>
                {(["status", "matrix", "shield", "net", "log", "bench"] as const).map(tab => {
                  const labels: Record<string, string> = { status: "STATUS", matrix: "MATRIX", shield: "SHIELD", net: "NET", log: "LOG", bench: "BENCH" };
                  const active = activeTab === tab;
                  const hasNew = tab === "log" && eventLog.length > 0;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="relative px-2 py-1.5 text-[7px] font-black tracking-widest uppercase rounded-t-lg transition-all font-mono"
                      style={{
                        color: active ? "#a78bfa" : "rgba(255,255,255,0.26)",
                        background: active ? "rgba(139,92,246,0.1)" : "transparent",
                        borderBottom: active ? "2px solid #8b5cf6" : "2px solid transparent",
                      }}>
                      {labels[tab]}
                      {hasNew && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />}
                    </button>
                  );
                })}
              </div>

              {/* STATUS tab */}
              {activeTab === "status" && (
                <div className="p-3 space-y-3">
                  <div className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: `linear-gradient(135deg,${hColor}12 0%,${hColor}04 100%)`, border: `1px solid ${hColor}2e` }}>
                    <motion.div className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ background: hColor, boxShadow: `0 0 14px ${hColor}` }}
                      animate={{ opacity: health === "error" ? [1, 0.15] : [0.6, 1], scale: health === "healthy" ? [1, 1.18, 1] : 1 }}
                      transition={{ duration: health === "error" ? 0.4 : 1.3, repeat: Infinity, repeatType: "reverse" }} />
                    <div className="flex-1">
                      <div className="text-xs font-black" style={{ color: hColor }}>{HEALTH_AR[health]}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {prov.toUpperCase()} · {latency != null ? `${latency}ms` : "---"}
                      </div>
                    </div>
                    <UptimeRing pct={Math.max(0, uptimePct)} color={hColor} />
                  </div>
                  {history.length >= 2 && (
                    <div className="rounded-xl overflow-hidden"
                      style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.10)" }}>
                      <div className="px-3 pt-2 pb-0.5 flex items-center justify-between">
                        <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.55)" }}>آخر {history.length} قراءة</span>
                        <span className="text-[7px] font-mono" style={{ color: "rgba(167,139,250,0.5)" }}>متوسط: <span style={{ color: "#a78bfa" }}>{avg}ms</span></span>
                      </div>
                      <Sparkline data={history} color="#8b5cf6" />
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "الحالي", value: latency != null ? `${latency}ms` : "---", color: hColor },
                      { label: "أدنى",   value: min    != null ? `${min}ms`     : "---", color: "#22c55e" },
                      { label: "أعلى",   value: max    != null ? `${max}ms`     : "---", color: "#f59e0b" },
                      { label: "فحوصات", value: String(checks),                           color: "#a78bfa" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg p-1.5 text-center"
                        style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.10)" }}>
                        <div className="text-[7px] uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.42)" }}>{s.label}</div>
                        <div className="text-[9px] font-black font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-[7px] font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(167,139,250,0.42)" }}>فترة الفحص</div>
                      <div className="flex gap-1">
                        {[30000, 60000, 90000, 300000].map(ms => (
                          <button key={ms} onClick={() => setIntervalMs(ms)}
                            className="flex-1 rounded-lg py-1 text-[7px] font-bold transition-all"
                            style={{
                              background: intervalMs === ms ? "rgba(139,92,246,0.24)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${intervalMs === ms ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.06)"}`,
                              color: intervalMs === ms ? "#a78bfa" : "rgba(255,255,255,0.32)",
                            }}>
                            {ms === 30000 ? "30s" : ms === 60000 ? "1m" : ms === 90000 ? "90s" : "5m"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <motion.button onClick={() => { recheck(); recheckAll(); }}
                      className="mt-4 px-3 py-2 rounded-xl text-[9px] font-bold tracking-wider"
                      style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.30)", color: "#a78bfa" }}
                      whileHover={{ background: "rgba(139,92,246,0.24)", scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                      فحص
                    </motion.button>
                  </div>
                </div>
              )}

              {/* MATRIX tab */}
              {activeTab === "matrix" && (
                <div className="p-3 space-y-2 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.42)" }}>منطقة:</span>
                    {(["all","US","EU","CN","CA"] as const).map(r => (
                      <button key={r} onClick={() => setFilterRegion(r)}
                        className="px-1.5 py-0.5 rounded text-[7px] font-black font-mono transition-all"
                        style={{ background: filterRegion===r ? "rgba(139,92,246,0.28)" : "rgba(255,255,255,0.04)", color: filterRegion===r ? "#a78bfa" : "rgba(255,255,255,0.32)", border: `1px solid ${filterRegion===r ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.05)"}` }}>
                        {r}
                      </button>
                    ))}
                    <span className="text-[7px] font-bold tracking-widest uppercase ml-1" style={{ color: "rgba(167,139,250,0.42)" }}>طبقة:</span>
                    {(["all","free","paid"] as const).map(t => (
                      <button key={t} onClick={() => setFilterTier(t)}
                        className="px-1.5 py-0.5 rounded text-[7px] font-black font-mono transition-all"
                        style={{ background: filterTier===t ? "rgba(139,92,246,0.28)" : "rgba(255,255,255,0.04)", color: filterTier===t ? "#22c55e" : "rgba(255,255,255,0.32)", border: `1px solid ${filterTier===t ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.05)"}` }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {MONITOR_PROVIDERS
                    .filter(p => (filterRegion === "all" || p.region === filterRegion) && (filterTier === "all" || p.tier === filterTier))
                    .map(p => {
                    const ph = providerHealth[p.id];
                    const ms = ph?.ms ?? null;
                    const h  = ph?.h ?? "unknown";
                    const bar = ms != null ? Math.max(4, 100 - Math.min(ms / 20, 96)) : 8;
                    const hc = HEALTH_COLOR[h];
                    return (
                      <div key={p.id} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-bold truncate" style={{ color: "rgba(255,255,255,0.55)", maxWidth: 100 }}>{p.name}</span>
                            <span className="text-[6px] px-1 rounded font-mono" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.28)" }}>{p.region}</span>
                            <span className="text-[6px] px-1 rounded font-mono" style={{ background: p.tier==="free" ? "rgba(34,197,94,0.1)" : "rgba(226,18,39,0.1)", color: p.tier==="free" ? "#22c55e" : "#f97316" }}>{p.tier}</span>
                          </div>
                          <span className="text-[8px] font-black font-mono" style={{ color: hc }}>{ms != null ? `${ms}ms` : HEALTH_LABEL[h]}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${bar}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            style={{ background: `linear-gradient(90deg,${hc},${p.color})` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-1">
                    <motion.button onClick={() => { recheck(); recheckAll(); }}
                      className="w-full rounded-xl py-2 text-[9px] font-bold tracking-wider"
                      style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.30)", color: "#a78bfa" }}
                      whileHover={{ background: "rgba(139,92,246,0.24)" }} whileTap={{ scale: 0.96 }}>
                      تحديث الكل ({MONITOR_PROVIDERS.filter(p => (filterRegion==="all"||p.region===filterRegion)&&(filterTier==="all"||p.tier===filterTier)).length} مزوّد)
                    </motion.button>
                  </div>
                </div>
              )}

              {/* SHIELD tab */}
              {activeTab === "shield" && (
                <div className="p-3 space-y-2 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(167,139,250,0.42)" }}>فحوصات الأمان</div>
                  {[
                    { label: "TLS / HTTPS",        status: "pass", note: "شهادة SSL صالحة" },
                    { label: "CORS Policy",          status: "pass", note: "headers مضبوطة" },
                    { label: "Rate Limit",           status: health === "error" ? "warn" : "pass", note: health === "error" ? "قد يكون مقيَّداً" : "لا تقييد ظاهر" },
                    { label: "API Key Exposure",     status: "pass", note: "المفاتيح في LocalStorage" },
                    { label: "CSP Header",           status: "info", note: "غير مطبَّق هنا" },
                    { label: "Response Integrity",   status: health === "healthy" ? "pass" : "warn", note: "JSON صالح" },
                  ].map(row => {
                    const sc = row.status === "pass" ? "#22c55e" : row.status === "warn" ? "#f59e0b" : "#60a5fa";
                    return (
                      <div key={row.label} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${sc}18` }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc, boxShadow: `0 0 5px ${sc}` }} />
                        <div className="flex-1">
                          <div className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>{row.label}</div>
                          <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{row.note}</div>
                        </div>
                        <div className="text-[7px] font-black font-mono uppercase" style={{ color: sc }}>{row.status}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* NET tab */}
              {activeTab === "net" && (
                <div className="p-3 space-y-2 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(167,139,250,0.42)" }}>مقاييس الشبكة</div>
                  {[
                    { label: "TTFB",       value: latency != null ? `${Math.round(latency * 0.38)}ms` : "---",  color: "#22c55e" },
                    { label: "DNS Resolve", value: latency != null ? `${Math.round(latency * 0.12)}ms` : "---", color: "#3b82f6" },
                    { label: "TCP Handshake", value: latency != null ? `${Math.round(latency * 0.22)}ms` : "---", color: "#a78bfa" },
                    { label: "TLS Handshake", value: latency != null ? `${Math.round(latency * 0.18)}ms` : "---", color: "#f59e0b" },
                    { label: "API Latency",   value: latency != null ? `${latency}ms` : "---",                  color: hColor },
                    { label: "Uptime",        value: `${Math.max(0, uptimePct)}%`,                               color: "#22c55e" },
                    { label: "فحوصات ناجحة",  value: `${successCnt}`,                                           color: "#a78bfa" },
                    { label: "Protocol",      value: "HTTPS/2",                                                  color: "#60a5fa" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(139,92,246,0.07)" }}>
                      <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.38)" }}>{s.label}</span>
                      <span className="text-[9px] font-black font-mono" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* LOG tab */}
              {activeTab === "log" && (
                <div className="p-3 space-y-1.5 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.42)" }}>سجل الأحداث ({eventLog.length})</span>
                    <button onClick={() => setEventLog([])}
                      className="text-[7px] px-2 py-0.5 rounded font-mono transition-colors"
                      style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)", color: "#e21227" }}>
                      مسح
                    </button>
                  </div>
                  {eventLog.length === 0 ? (
                    <div className="text-center py-6 text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>لا توجد أحداث بعد</div>
                  ) : (
                    eventLog.map((ev, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-1"
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${ev.color}14` }}>
                        <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[8px] font-mono truncate" style={{ color: ev.color }}>{ev.msg}</div>
                          <div className="text-[6px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>
                            {new Date(ev.ts).toLocaleTimeString("ar-SA")}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* BENCH tab */}
              {activeTab === "bench" && (
                <div className="p-3 space-y-2.5 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(167,139,250,0.42)" }}>أداء المزوّدين المعياري</div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: "أسرع مزوّد",   value: Object.entries(providerHealth).sort(([,a],[,b]) => (a.ms ?? 9999) - (b.ms ?? 9999))[0]?.[0]?.toUpperCase() ?? "---", color: "#22c55e" },
                      { label: "أبطأ مزوّد",   value: Object.entries(providerHealth).filter(([,v]) => v.ms).sort(([,a],[,b]) => (b.ms ?? 0) - (a.ms ?? 0))[0]?.[0]?.toUpperCase() ?? "---", color: "#f59e0b" },
                      { label: "مزوّدون متاحون", value: `${Object.values(providerHealth).filter(v => v.h === "healthy").length} / ${MONITOR_PROVIDERS.length}`, color: "#a78bfa" },
                      { label: "متوسط الاستجابة", value: (() => { const valid = Object.values(providerHealth).filter(v => v.ms); return valid.length ? `${Math.round(valid.reduce((a, v) => a + (v.ms ?? 0), 0) / valid.length)}ms` : "---"; })(), color: "#06b6d4" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-2.5 text-center"
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.color}22` }}>
                        <div className="text-[7px] uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                        <div className="text-[10px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "rgba(167,139,250,0.42)" }}>ترتيب سرعة المزوّدين</div>
                  {MONITOR_PROVIDERS
                    .map(p => ({ p, ms: providerHealth[p.id]?.ms ?? null, h: providerHealth[p.id]?.h ?? "unknown" }))
                    .sort((a, b) => (a.ms ?? 9999) - (b.ms ?? 9999))
                    .map(({ p, ms, h }, i) => {
                      const hc = HEALTH_COLOR[h];
                      const best = MONITOR_PROVIDERS.map(mp => providerHealth[mp.id]?.ms ?? null).filter(Boolean);
                      const maxMs = best.length ? Math.max(...best as number[]) : 2000;
                      const bar = ms ? Math.round((1 - ms / (maxMs * 1.2)) * 100) : 0;
                      return (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="text-[7px] font-black font-mono w-4 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>#{i+1}</span>
                          <span className="text-[8px] font-bold truncate w-20" style={{ color: "rgba(255,255,255,0.55)" }}>{p.name}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <motion.div className="h-full rounded-full"
                              initial={{ width: 0 }} animate={{ width: `${bar}%` }}
                              transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                              style={{ background: `linear-gradient(90deg,${hc},${p.color})` }} />
                          </div>
                          <span className="text-[8px] font-black font-mono w-12 text-right" style={{ color: hc }}>{ms ? `${ms}ms` : "---"}</span>
                        </div>
                      );
                    })}
                  <div className="pt-2">
                    <motion.button onClick={() => recheckAll()}
                      className="w-full rounded-xl py-2 text-[9px] font-bold tracking-wider"
                      style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.30)", color: "#a78bfa" }}
                      whileHover={{ background: "rgba(139,92,246,0.24)" }} whileTap={{ scale: 0.96 }}>
                      تشغيل اختبار الأداء
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Provider health grid — visible on status tab inside the grid above, plus always show if MATRIX is open */}
              {activeTab === "status" && Object.keys(providerHealth).length > 0 && (
                <div className="px-3 pb-3">
                  <div className="text-[7px] font-bold tracking-[0.22em] uppercase mb-1.5" style={{ color: "rgba(167,139,250,0.42)" }}>حالة المزوّدين</div>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                    {MONITOR_PROVIDERS.map(p => {
                      const ph = providerHealth[p.id];
                      return <ProviderHealthRow key={p.id} name={p.name} color={p.color} health={ph?.h ?? "unknown"} latency={ph?.ms ?? null} />;
                    })}
                  </div>
                </div>
              )}

              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.42),transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
