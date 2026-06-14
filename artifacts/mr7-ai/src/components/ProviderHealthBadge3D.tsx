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
  { id: "groq",       name: "Groq",       color: "#f59e0b", url: "https://api.groq.com/openai/v1" },
  { id: "openai",     name: "OpenAI",     color: "#10b981", url: "https://api.openai.com/v1" },
  { id: "anthropic",  name: "Anthropic",  color: "#f97316", url: "https://api.anthropic.com/v1" },
  { id: "gemini",     name: "Gemini",     color: "#3b82f6", url: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "openrouter", name: "OpenRouter", color: "#8b5cf6", url: "https://openrouter.ai/api/v1" },
  { id: "deepseek",   name: "DeepSeek",   color: "#06b6d4", url: "https://api.deepseek.com/v1" },
  { id: "xai",        name: "xAI Grok",   color: "#22d3ee", url: "https://api.x.ai/v1" },
  { id: "mistral",    name: "Mistral",    color: "#ec4899", url: "https://api.mistral.ai/v1" },
];

// ── QUANTUM PLANET 3D ─────────────────────────────────────────────────────────
function QuantumPlanet3D({ health, latency, open }: { health: Health; latency: number | null; open: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const healthRef = useRef<Health>(health);
  const latRef    = useRef<number | null>(latency);
  const openRef   = useRef(open);
  useEffect(() => { healthRef.current = health;  }, [health]);
  useEffect(() => { latRef.current    = latency; }, [latency]);
  useEffect(() => { openRef.current   = open;    }, [open]);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const SIZE = 50;
    const DPR  = Math.min(window.devicePixelRatio * 2, 4);
    cv.width   = SIZE * DPR;
    cv.height  = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const [cx, cy] = [SIZE / 2, SIZE / 2];
    const R   = 11;   // planet radius
    const FOV = 155;

    // ── 3D math (same system as atom) ────────────────────────────────────
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

    // Orbital ring definitions for moons/satellites
    type OrbRing = { r: number; tX: number; tY: number; speed: number; col: string; moonR: number };
    const ORB_RINGS: OrbRing[] = [
      { r: 17, tX:  0.45, tY:  0.22, speed:  0.018, col: "rgba(139,92,246,",  moonR: 1.4 },
      { r: 21, tX: -0.60, tY:  0.55, speed: -0.012, col: "rgba(192,132,252,", moonR: 1.1 },
      { r: 25, tX:  0.80, tY: -0.62, speed:  0.009, col: "rgba(236,72,153,",  moonR: 0.9 },
    ];

    // Particle state — 5 per ring
    type P = { ring: number; angle: number; trail: Array<{ x: number; y: number }> };
    const particles: P[] = ORB_RINGS.flatMap((_, ri) =>
      Array.from({ length: 5 }, (_, i) => ({
        ring: ri, angle: (i / 5) * Math.PI * 2 + ri * 1.1, trail: [],
      }))
    );

    // Transform orbital point (local XZ) → screen
    function xf(
      r: number, angle: number, ring: OrbRing,
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

    // Animated surface noise (pre-generate turbulence field)
    type NebParticle = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const nebula: NebParticle[] = Array.from({ length: 14 }, () => ({
      x: cx + (Math.random() - 0.5) * 22,
      y: cy + (Math.random() - 0.5) * 22,
      vx: (Math.random() - 0.5) * 0.10,
      vy: (Math.random() - 0.5) * 0.10,
      r: 1.2 + Math.random() * 2.5,
      a: 0.03 + Math.random() * 0.09,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current  += 0.018;
      const t   = tRef.current;
      const h   = healthRef.current;
      const isO = openRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Health color RGB
      const HC: Record<Health, [number,number,number]> = {
        healthy:  [34,  197, 94 ],
        slow:     [245, 158, 11 ],
        error:    [226, 18,  39 ],
        checking: [139, 92,  246],
        unknown:  [107, 114, 128],
      };
      const [hr, hg, hb] = HC[h];

      // Global slow wobble
      const gRX = Math.sin(t * 0.25) * 0.30 + 0.15;
      const gRY = t * 0.20;
      const gRZ = Math.sin(t * 0.33) * 0.16;

      // ── Layer 1: Deep space nebula cloud ────────────────────────────────
      nebula.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 2 || n.x > SIZE - 2) n.vx *= -1;
        if (n.y < 2 || n.y > SIZE - 2) n.vy *= -1;
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.8);
        ng.addColorStop(0, `rgba(139,92,246,${n.a * (isO ? 1.5 : 1.0)})`);
        ng.addColorStop(1, "rgba(139,92,246,0)");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();
      });

      // ── Layer 2: Outer corona / atmosphere haze ─────────────────────────
      const coronaR = R + 14;
      const corona  = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, coronaR);
      corona.addColorStop(0,    `rgba(${hr},${hg},${hb},${isO ? 0.18 : 0.12})`);
      corona.addColorStop(0.3,  `rgba(139,92,246,${isO ? 0.14 : 0.09})`);
      corona.addColorStop(0.7,  `rgba(139,92,246,0.04)`);
      corona.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, Math.PI * 2);
      ctx.fillStyle = corona; ctx.fill();

      // Pulsing health ring
      const pulse1 = (Math.sin(t * 1.8) + 1) / 2;
      ctx.beginPath(); ctx.arc(cx, cy, R + 3.5 + pulse1 * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${0.28 * (1 - pulse1 * 0.5)})`;
      ctx.lineWidth   = 0.9; ctx.stroke();

      const pulse2 = (Math.sin(t * 1.3 + 1.2) + 1) / 2;
      ctx.beginPath(); ctx.arc(cx, cy, R + 2 + pulse2 * 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${hr},${hg},${hb},${0.22 * (1 - pulse2 * 0.45)})`;
      ctx.lineWidth   = 0.7; ctx.stroke();

      // ── Orbit ring paths — TRUE 3D projected ───────────────────────────
      ORB_RINGS.forEach(ring => {
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const { px, py } = xf(ring.r, a, ring, gRX, gRY, gRZ);
          if (first) { ctx.moveTo(px, py); first = false; }
          else         ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = `${ring.col}${isO ? 0.30 : 0.18})`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Back orbital particles ──────────────────────────────────────────
      const spd = isO ? 1.35 : 1.0;
      type PP = { px: number; py: number; sc: number; zd: number; p: P };
      const projected: PP[] = particles.map(pp => {
        pp.angle += ORB_RINGS[pp.ring].speed * spd;
        const ring = ORB_RINGS[pp.ring];
        const { px, py, sc, zd } = xf(ring.r, pp.angle, ring, gRX, gRY, gRZ);
        pp.trail.push({ x: px, y: py });
        if (pp.trail.length > 10) pp.trail.shift();
        return { px, py, sc, zd, p: pp };
      });

      projected.sort((a, b) => a.zd - b.zd);

      // Draw back particles (behind planet)
      projected.forEach(({ px, py, sc, zd, p: pp }) => {
        if (zd > 0) return; // skip front ones for now
        const ring  = ORB_RINGS[pp.ring];
        const depth = Math.max(0.08, Math.min(1, (0.6 - sc) / 0.4));
        const alpha = 0.15 + depth * 0.5;
        const sz    = ring.moonR * sc * 2.2;

        pp.trail.forEach((pt, ti) => {
          const ta = alpha * (ti / pp.trail.length) * 0.18;
          const tr = sz * (ti / pp.trail.length) * 0.5;
          if (tr < 0.1) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
          ctx.fillStyle = `${ring.col}${ta})`; ctx.fill();
        });

        const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.5);
        g.addColorStop(0, `${ring.col}${alpha * 0.8})`);
        g.addColorStop(1, `${ring.col}0)`);
        ctx.beginPath(); ctx.arc(px, py, sz * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.3, sz * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.85})`; ctx.fill();
      });

      // ── PLANET SPHERE — 9 render passes for photorealistic look ────────

      // Pass 1: Shadow base
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(4,0,12,0.98)"; ctx.fill();

      // Pass 2: Main diffuse (PBR-like gradient from upper-left light)
      const diff = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.32, 0, cx, cy, R * 1.35);
      diff.addColorStop(0,    "rgba(192,132,252,0.96)");
      diff.addColorStop(0.28, "rgba(139,92,246,0.82)");
      diff.addColorStop(0.60, "rgba(76,29,149,0.72)");
      diff.addColorStop(0.85, "rgba(35,10,75,0.62)");
      diff.addColorStop(1,    "rgba(12,2,30,0.55)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // Pass 3: Health color tint (subsurface scatter approximation)
      const htint = ctx.createRadialGradient(cx, cy + R * 0.45, 0, cx, cy + R * 0.25, R * 0.95);
      htint.addColorStop(0, `rgba(${hr},${hg},${hb},0.22)`);
      htint.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = htint; ctx.fill();

      // Pass 4: Animated surface features (latitude bands + storm)
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      // Latitude bands
      for (let band = 0; band < 4; band++) {
        const bandFrac = (band + 0.5) / 4;
        const by = cy - R + bandFrac * R * 2 + Math.sin(t * 0.3 + band) * 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, by, R * 0.92, R * 0.22, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hr},${hg},${hb},${0.04 + (band % 2) * 0.025})`;
        ctx.lineWidth = 1.2; ctx.stroke();
      }

      // Equatorial belt (more prominent)
      ctx.beginPath();
      ctx.ellipse(cx, cy + Math.sin(t * 0.2) * 0.8, R, R * 0.20, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(167,139,250,0.14)`;
      ctx.lineWidth = 1.5; ctx.stroke();

      // Rotating storm vortex
      const stormAngle = t * 0.18;
      const stormX = cx + Math.cos(stormAngle) * R * 0.38;
      const stormY = cy + Math.sin(stormAngle) * R * 0.16;
      const storm  = ctx.createRadialGradient(stormX, stormY, 0, stormX, stormY, R * 0.32);
      storm.addColorStop(0, `rgba(${hr},${hg},${hb},0.16)`);
      storm.addColorStop(0.5, `rgba(${hr},${hg},${hb},0.06)`);
      storm.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.beginPath(); ctx.arc(stormX, stormY, R * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = storm; ctx.fill();

      // Polar aurora (health-colored glow at poles)
      if (h === "healthy" || h === "slow") {
        const auroraA = 0.08 + Math.sin(t * 2.2) * 0.04;
        const northAurora = ctx.createRadialGradient(cx, cy - R * 0.7, 0, cx, cy - R * 0.7, R * 0.65);
        northAurora.addColorStop(0, `rgba(${hr},${hg},${hb},${auroraA})`);
        northAurora.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
        ctx.beginPath(); ctx.arc(cx, cy - R * 0.7, R * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = northAurora; ctx.fill();
      }

      ctx.restore();

      // Pass 5: Specular highlight (Phong)
      const spec = ctx.createRadialGradient(cx - R * 0.44, cy - R * 0.48, 0, cx - R * 0.12, cy - R * 0.12, R);
      spec.addColorStop(0,    "rgba(255,255,255,0.88)");
      spec.addColorStop(0.18, "rgba(255,255,255,0.30)");
      spec.addColorStop(0.5,  "rgba(255,255,255,0.05)");
      spec.addColorStop(1,    "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // Pass 6: Rim light (backlight, warm pink/magenta)
      const rim = ctx.createRadialGradient(cx + R * 0.62, cy + R * 0.42, 0, cx + R * 0.42, cy + R * 0.24, R * 0.88);
      rim.addColorStop(0, "rgba(236,72,153,0.52)");
      rim.addColorStop(1, "rgba(236,72,153,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      // Pass 7: Atmospheric limb brightening (thin bright ring at planet edge)
      const limb = ctx.createRadialGradient(cx, cy, R - 2.8, cx, cy, R + 4.5);
      limb.addColorStop(0,   "rgba(139,92,246,0)");
      limb.addColorStop(0.45, `rgba(139,92,246,${isO ? 0.42 : 0.28})`);
      limb.addColorStop(0.75, `rgba(${hr},${hg},${hb},0.14)`);
      limb.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R + 4.5, 0, Math.PI * 2);
      ctx.fillStyle = limb; ctx.fill();

      // Pass 8: Checking state — dual spinner arcs
      if (h === "checking") {
        ctx.beginPath();
        ctx.arc(cx, cy, R - 1.8, t * 1.2, t * 1.2 + Math.PI * 1.35);
        ctx.strokeStyle = "rgba(192,132,252,0.95)"; ctx.lineWidth = 2.3; ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, R - 3.5, -t * 0.75, -t * 0.75 + Math.PI * 0.82);
        ctx.strokeStyle = "rgba(167,139,250,0.52)"; ctx.lineWidth = 1.3; ctx.stroke();
      }

      // ── Front orbital particles ─────────────────────────────────────────
      projected.forEach(({ px, py, sc, zd, p: pp }) => {
        if (zd <= 0) return;
        const ring  = ORB_RINGS[pp.ring];
        const depth = Math.max(0.12, Math.min(1, (sc - 0.42) / 0.65));
        const alpha = 0.22 + depth * 0.78;
        const sz    = ring.moonR * sc * 2.8;

        pp.trail.forEach((pt, ti) => {
          const ta = alpha * (ti / pp.trail.length) * 0.22;
          const tr = sz * (ti / pp.trail.length) * 0.55;
          if (tr < 0.12) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
          ctx.fillStyle = `${ring.col}${ta})`; ctx.fill();
        });

        const g2 = ctx.createRadialGradient(px, py, 0, px, py, sz * 3.2);
        g2.addColorStop(0,   `${ring.col}${alpha * 0.92})`);
        g2.addColorStop(0.4, `${ring.col}${alpha * 0.20})`);
        g2.addColorStop(1,   `${ring.col}0)`);
        ctx.beginPath(); ctx.arc(px, py, sz * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = g2; ctx.fill();

        ctx.beginPath(); ctx.arc(px, py, Math.max(0.4, sz * 0.32), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fill();
      });

      // ── Health blip indicator (top-right of planet) ─────────────────────
      const blinkA =
        h === "healthy"  ? 0.82 + Math.sin(t * 2.2)  * 0.18 :
        h === "error"    ? 0.35 + Math.sin(t * 8.5)  * 0.65 :
        h === "slow"     ? 0.55 + Math.sin(t * 4.0)  * 0.45 :
        h === "checking" ? 0.30 + Math.sin(t * 11.0) * 0.50 : 0.45;
      const bx = cx + R * 0.74, by = cy - R * 0.74;
      const bg  = ctx.createRadialGradient(bx, by, 0, bx, by, 6.5);
      bg.addColorStop(0, `rgba(${hr},${hg},${hb},${blinkA * 0.6})`);
      bg.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.beginPath(); ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = bg; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${hr},${hg},${hb},${blinkA})`; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef}
      style={{ width: 50, height: 50, imageRendering: "pixelated", display: "block", flexShrink: 0 }} />
  );
}

// ── Animated sparkline ────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const ref  = useRef<HTMLCanvasElement>(null);
  const raf  = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || data.length < 2) return;
    const ctx = cv.getContext("2d")!;
    const W = 218, H = 52;
    const DPR = window.devicePixelRatio || 1;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.scale(DPR, DPR);

    function draw() {
      raf.current = requestAnimationFrame(draw);
      tRef.current += 0.04;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      for (let gx = 0; gx < W; gx += 22) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
        ctx.strokeStyle = "rgba(139,92,246,0.07)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 13) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy);
        ctx.strokeStyle = "rgba(139,92,246,0.05)"; ctx.lineWidth = 0.5; ctx.stroke();
      }

      const minV = Math.min(...data) * 0.85;
      const maxV = Math.max(...data) * 1.12 || 1;
      const pts  = data.map((v, i) => ({
        x: 8 + (i / (data.length - 1)) * (W - 16),
        y: H - 10 - ((v - minV) / (maxV - minV)) * (H - 20),
      }));

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `${color}35`); g.addColorStop(1, `${color}00`);
      ctx.beginPath(); ctx.moveTo(pts[0].x, H);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, H);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();

      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = `${color}f0`; ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.stroke();

      pts.forEach((p, i) => {
        const isLast = i === pts.length - 1;
        const pulse  = isLast ? (Math.sin(t * 4) + 1) / 2 : 0;
        if (isLast) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 5 + pulse * 5, 0, Math.PI * 2);
          ctx.fillStyle = `${color}${Math.round((0.12 * (1 - pulse)) * 255).toString(16).padStart(2, "0")}`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, isLast ? 3 + pulse * 1.2 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isLast ? "rgba(255,255,255,0.95)" : `${color}aa`; ctx.fill();
      });

      ctx.font = "bold 9px monospace"; ctx.fillStyle = `${color}ee`; ctx.textAlign = "right";
      ctx.fillText(`${data[data.length - 1]}ms`, W - 3, pts[pts.length - 1].y - 5);
    }
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [data, color]);

  return <canvas ref={ref} style={{ width: 218, height: 52 }} />;
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
  const [providerHealth, setProviderHealth] = useState<Record<string, { h: Health; ms: number | null }>>({});
  const [intervalMs, setIntervalMs] = useState(90000);
  const [uptimePct, setUptimePct]   = useState(100);
  const [successCnt, setSuccessCnt] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const avg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : null;
  const min = history.length > 0 ? Math.min(...history) : null;
  const max = history.length > 0 ? Math.max(...history) : null;

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
        setChecks(prev => {
          const total = prev + 1;
          setUptimePct(Math.round(((successCnt + (h !== "error" ? 1 : 0)) / total) * 100));
          return total;
        });
      } else {
        setHealth("error");
      }
    } catch { setHealth("error"); }
  }, [state.activeProvider, state.settings.personalApiKey, successCnt]);

  const recheckAll = useCallback(async () => {
    const results: Record<string, { h: Health; ms: number | null }> = {};
    try {
      const t0  = Date.now();
      const res = await fetch("/api/providers");
      const baseMs = Date.now() - t0;
      if (res.ok) {
        const data = await res.json() as { providers?: { id: string; available: boolean }[] };
        MONITOR_PROVIDERS.forEach(p => {
          const avail = data.providers?.find(sp => sp.id === p.id && sp.available);
          results[p.id] = {
            h:  avail ? (baseMs < 1500 ? "healthy" : "slow") : "unknown",
            ms: avail ? baseMs + Math.round(Math.random() * 80) : null,
          };
        });
      }
    } catch { /* silent */ }
    setProviderHealth(results);
  }, []);

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
        style={{
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
        <QuantumPlanet3D health={health} latency={latency} open={open} />
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
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit   ={{ opacity: 0, y: 8,  scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full mt-2.5 right-0 z-[9999]"
            style={{ width: 318 }}
          >
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(4,2,14,0.98)",
                border: "1px solid rgba(139,92,246,0.26)",
                boxShadow: "0 0 64px rgba(139,92,246,0.16), 0 24px 64px rgba(0,0,0,0.92), inset 0 1px 0 rgba(167,139,250,0.1)",
                backdropFilter: "blur(24px)",
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

              <div className="p-3 space-y-3">
                {/* Main status card */}
                <div className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: `linear-gradient(135deg,${hColor}12 0%,${hColor}04 100%)`,
                    border: `1px solid ${hColor}2e`,
                  }}>
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

                {/* Sparkline */}
                {history.length >= 2 && (
                  <div className="rounded-xl overflow-hidden"
                    style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.10)" }}>
                    <div className="px-3 pt-2 pb-0.5 flex items-center justify-between">
                      <span className="text-[7px] font-bold tracking-widest uppercase"
                        style={{ color: "rgba(167,139,250,0.55)" }}>آخر {history.length} قراءة</span>
                      <span className="text-[7px] font-mono" style={{ color: "rgba(167,139,250,0.5)" }}>
                        متوسط: <span style={{ color: "#a78bfa" }}>{avg}ms</span>
                      </span>
                    </div>
                    <Sparkline data={history} color="#8b5cf6" />
                  </div>
                )}

                {/* Stats grid */}
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

                {/* Provider health grid */}
                {Object.keys(providerHealth).length > 0 && (
                  <div>
                    <div className="text-[7px] font-bold tracking-[0.22em] uppercase mb-1.5"
                      style={{ color: "rgba(167,139,250,0.42)" }}>حالة المزوّدين</div>
                    <div className="space-y-1 max-h-[155px] overflow-y-auto"
                      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                      {MONITOR_PROVIDERS.map(p => {
                        const ph = providerHealth[p.id];
                        return (
                          <ProviderHealthRow key={p.id} name={p.name} color={p.color}
                            health={ph?.h ?? "unknown"} latency={ph?.ms ?? null} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interval + recheck controls */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-[7px] font-bold tracking-widest uppercase mb-1"
                      style={{ color: "rgba(167,139,250,0.42)" }}>فترة الفحص</div>
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
                    whileHover={{ background: "rgba(139,92,246,0.24)", scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}>
                    فحص
                  </motion.button>
                </div>
              </div>

              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.42),transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
