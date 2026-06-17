import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  trail: { x: number; y: number }[];
  type: "spark" | "plasma" | "bit";
}

interface EnergyRing {
  x: number; y: number;
  r: number; maxR: number;
  alpha: number; color: string;
}

interface DataBit {
  x: number; y: number;
  speed: number; alpha: number;
  val: string; color: string;
}

const COLORS = [
  "#e21227", "#ff3d5a", "#00e5ff", "#00ff88",
  "#a78bfa", "#f59e0b", "#22d3ee", "#f97316",
];

const PLASMA_COLORS = ["#e21227", "#ff4466", "#ff0055", "#ff3377"];
const BIT_COLORS   = ["#00e5ff", "#00ff88", "#a78bfa"];

export function ChatInputParticles({
  value,
  containerRef,
}: {
  value: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const particlesRef   = useRef<Particle[]>([]);
  const ringsRef       = useRef<EnergyRing[]>([]);
  const bitsRef        = useRef<DataBit[]>([]);
  const rafRef         = useRef(0);
  const prevLenRef     = useRef(0);
  const spawnXRef      = useRef(0);
  const scanOffRef     = useRef(0);
  const frameRef       = useRef(0);

  /* ── Spawn on keypress ─────────────────────────────────────── */
  useEffect(() => {
    const diff = value.length - prevLenRef.current;
    prevLenRef.current = value.length;
    if (diff <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;

    const charWidth = 8.5;
    const padding   = 28;
    const rawX      = padding + (value.length % Math.floor(Math.max(1, (W - padding * 2) / charWidth))) * charWidth;
    spawnXRef.current = Math.min(rawX, W - 20);
    const spawnY = H * 0.5;

    /* spark particles */
    const count = Math.min(diff * 6 + 5, 22);
    for (let i = 0; i < count; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const isPlasma = Math.random() < 0.3;
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.6;
      const speed = 2.2 + Math.random() * 4.5;
      particlesRef.current.push({
        x: spawnXRef.current + (Math.random() - 0.5) * 14,
        y: spawnY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.45 + Math.random() * 0.9,
        size: isPlasma ? 2.5 + Math.random() * 4 : 1.4 + Math.random() * 3,
        color: isPlasma ? PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)] : color,
        trail: [],
        type: isPlasma ? "plasma" : "spark",
      });
    }

    /* energy ring */
    ringsRef.current.push({
      x: spawnXRef.current,
      y: spawnY,
      r: 0,
      maxR: 22 + Math.random() * 18,
      alpha: 0.7,
      color: PLASMA_COLORS[Math.floor(Math.random() * PLASMA_COLORS.length)],
    });

    /* data bits on fast typing */
    if (diff >= 3) {
      for (let i = 0; i < 4; i++) {
        bitsRef.current.push({
          x: spawnXRef.current + (Math.random() - 0.5) * 60,
          y: spawnY - Math.random() * H * 0.4,
          speed: 0.8 + Math.random() * 1.8,
          alpha: 0.6 + Math.random() * 0.4,
          val: Math.random() > 0.5 ? "1" : "0",
          color: BIT_COLORS[Math.floor(Math.random() * BIT_COLORS.length)],
        });
      }
    }

    /* cap */
    if (particlesRef.current.length > 260) particlesRef.current = particlesRef.current.slice(-260);
    if (bitsRef.current.length > 40)       bitsRef.current = bitsRef.current.slice(-40);
    if (ringsRef.current.length > 8)       ringsRef.current = ringsRef.current.slice(-8);
  }, [value]);

  /* ── Animation loop ─────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const r = container.getBoundingClientRect();
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = r.width  * DPR;
      canvas.height = r.height * DPR;
      canvas.style.width  = r.width  + "px";
      canvas.style.height = r.height + "px";
      ctx.scale(DPR, DPR);
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      frameRef.current++;
      const dpr = DPR();
      const W = canvas!.width  / dpr;
      const H = canvas!.height / dpr;
      ctx.clearRect(0, 0, W, H);

      /* ── Holographic scan beam ──────────────────────────────── */
      scanOffRef.current = (scanOffRef.current + 1.2) % (W + 60);
      const scanX = scanOffRef.current - 30;
      const sg = ctx.createLinearGradient(scanX - 18, 0, scanX + 18, 0);
      sg.addColorStop(0,   "rgba(226,18,39,0)");
      sg.addColorStop(0.4, "rgba(226,18,39,0.09)");
      sg.addColorStop(0.6, "rgba(0,229,255,0.06)");
      sg.addColorStop(1,   "rgba(226,18,39,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(scanX - 18, 0, 36, H);

      /* ── Energy rings ───────────────────────────────────────── */
      ringsRef.current = ringsRef.current.filter(ring => ring.alpha > 0.01);
      ringsRef.current.forEach(ring => {
        ring.r += 1.8;
        ring.alpha = Math.max(0, ring.alpha - 0.028);
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color + Math.round(ring.alpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 1.5;
        ctx.stroke();
        /* inner pulse */
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color + Math.round(ring.alpha * 80).toString(16).padStart(2, "0");
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      /* ── Falling data bits ──────────────────────────────────── */
      bitsRef.current = bitsRef.current.filter(b => b.y < H + 10 && b.alpha > 0.02);
      bitsRef.current.forEach(b => {
        b.y += b.speed;
        b.alpha -= 0.012;
        ctx.font = `bold 9px monospace`;
        ctx.fillStyle = b.color + Math.round(b.alpha * 255).toString(16).padStart(2, "0");
        ctx.fillText(b.val, b.x, b.y);
      });

      /* ── Particles with plasma trails ──────────────────────── */
      const dt = 1 / 60;
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        /* update */
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.08;  /* gravity */
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= dt / p.maxLife;

        const alpha = Math.max(0, p.life);

        /* plasma trail */
        if (p.trail.length > 1) {
          for (let i = 1; i < p.trail.length; i++) {
            const t0 = p.trail[i - 1], t1 = p.trail[i];
            const trailAlpha = alpha * (i / p.trail.length) * (p.type === "plasma" ? 0.55 : 0.28);
            ctx.beginPath();
            ctx.moveTo(t0.x, t0.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.strokeStyle = p.color + Math.round(trailAlpha * 255).toString(16).padStart(2, "0");
            ctx.lineWidth = p.type === "plasma" ? 1.8 * (i / p.trail.length) : 0.9 * (i / p.trail.length);
            ctx.stroke();
          }
        }

        /* glow aura for plasma */
        if (p.type === "plasma") {
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
          grd.addColorStop(0, p.color + Math.round(alpha * 140).toString(16).padStart(2, "0"));
          grd.addColorStop(1, p.color + "00");
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        /* core dot */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();

        /* inner bright core */
        if (p.size > 2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
          ctx.fill();
        }
      });

      /* ── Ambient grid lines (subtle, only when particles present) ── */
      if (particlesRef.current.length > 0) {
        ctx.save();
        ctx.globalAlpha = 0.035;
        ctx.strokeStyle = "#e21227";
        ctx.lineWidth   = 0.5;
        for (let x = 0; x < W; x += 32) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        ctx.restore();
      }
    }

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        zIndex: 1,
      }}
    />
  );
}
