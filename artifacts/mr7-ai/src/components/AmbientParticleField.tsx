import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   AMBIENT PARTICLE FIELD  v2
   Mouse-reactive + tab-pause support.
   Canvas-based — zero DOM overhead, 60fps.
═══════════════════════════════════════════════════ */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; opacity: number; color: string;
  life: number; maxLife: number; type: "dot" | "cross" | "ring";
}

const COLORS = ["#e21227", "#00e5ff", "#a78bfa", "#22c55e", "#f59e0b", "#ec4899", "#f97316", "#38bdf8"];
function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
function hexToRgb(hex: string): [number,number,number] {
  const h = hex.replace("#","");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

export function AmbientParticleField({
  density = 0.35,
  paused  = false,
  enabled = true,
}: {
  density?: number;
  paused?:  boolean;
  enabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const partsRef  = useRef<Particle[]>([]);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const pausedRef = useRef(paused);

  // Keep paused ref in sync without restarting the effect
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0;
    const COUNT = Math.floor(38 * density);

    function resize() {
      W = canvas!.offsetWidth; H = canvas!.offsetHeight;
      canvas!.width = W; canvas!.height = H;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function spawn(): Particle {
      const types: Particle["type"][] = ["dot","dot","dot","cross","ring"];
      return {
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 0.38,
        vy: -(0.08 + Math.random() * 0.38),
        r: 1 + Math.random() * 2.8,
        opacity: 0,
        color: randColor(),
        life: 0,
        maxLife: 280 + Math.random() * 420,
        type: types[Math.floor(Math.random() * types.length)],
      };
    }

    // Initial scatter
    for (let i = 0; i < COUNT; i++) {
      const p = spawn();
      p.y = Math.random() * H;
      p.opacity = Math.random() * 0.4;
      partsRef.current.push(p);
    }

    function drawParticle(p: Particle) {
      const phase = p.life / p.maxLife;
      const fade = phase < 0.12 ? phase / 0.12 : (phase > 0.82 ? 1 - (phase - 0.82) / 0.18 : 1);
      p.opacity = fade * 0.38;
      ctx.globalAlpha = p.opacity;

      const [cr, cg, cb] = hexToRgb(p.color);
      ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillStyle   = `rgb(${cr},${cg},${cb})`;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 5 * fade;

      if (p.type === "dot") {
        // Dot with glow halo
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grd.addColorStop(0,   `rgba(${cr},${cg},${cb},${fade * 0.9})`);
        grd.addColorStop(0.45,`rgba(${cr},${cg},${cb},${fade * 0.15})`);
        grd.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${fade * 0.80})`; ctx.fill();
      } else if (p.type === "cross") {
        const s = p.r * 2.4; ctx.lineWidth = 0.9;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${fade * 0.8})`;
        ctx.beginPath(); ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y);
        ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y + s); ctx.stroke();
        // Diagonal faint lines for asterisk effect
        const d = s * 0.65;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${fade * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(p.x - d, p.y - d); ctx.lineTo(p.x + d, p.y + d);
        ctx.moveTo(p.x + d, p.y - d); ctx.lineTo(p.x - d, p.y + d);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${fade * 0.7})`; ctx.fill();
      } else {
        // Ring with double-stroke and inner pulse
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${fade * 0.55})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 0.35;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${fade * 0.22})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${fade * 0.6})`; ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    function tick() {
      frameRef.current = requestAnimationFrame(tick);
      if (pausedRef.current) return;                  // tab hidden — stop drawing
      ctx.clearRect(0, 0, W, H);

      const mx = mouseRef.current.x, my = mouseRef.current.y;

      while (partsRef.current.length < COUNT) partsRef.current.push(spawn());

      partsRef.current = partsRef.current.filter(p => {
        // Mouse repulsion
        const dx = p.x - mx, dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90 && dist > 0) {
          const force = (90 - dist) / 90 * 0.6;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
        // Dampen
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.life++;
        if (p.life > p.maxLife || p.y < -20) return false;
        drawParticle(p);
        return true;
      });
    }

    tick();

    // Mouse tracking
    function onMouse(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onLeave() { mouseRef.current = { x: -9999, y: -9999 }; }
    canvas.addEventListener("mousemove", onMouse, { passive: true });
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(frameRef.current); ro.disconnect();
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("mouseleave", onLeave);
      partsRef.current = [];
    };
  }, [density, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
        willChange: "transform",
      }}
    />
  );
}
