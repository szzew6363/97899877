import { useEffect, useRef } from "react";

/* ================================================================
   CYBER ATTACK HEATMAP HUD
   Fixed canvas behind entire app — simulates global attack density
   as pulsing red/orange glowing zones with flowing particles.
   Extremely GPU-cheap: pure 2D canvas, requestAnimationFrame.
================================================================ */

interface Hotspot {
  x: number;          // 0-1 relative to viewport
  y: number;
  baseIntensity: number;
  intensity: number;
  pulsePhase: number;
  pulseSpeed: number;
  radius: number;
  color: string;
  label: string;
  rings: Ring[];
  lastRing: number;
  ringInterval: number;
}

interface Ring {
  r: number;
  maxR: number;
  alpha: number;
  color: string;
}

interface Particle {
  x: number; y: number;
  tx: number; ty: number;
  progress: number;
  speed: number;
  alpha: number;
  color: string;
  size: number;
}

const HOTSPOTS_DEF: Omit<Hotspot, "rings" | "lastRing">[] = [
  { x: 0.62, y: 0.28, baseIntensity: 0.9, intensity: 0.9, pulsePhase: 0,    pulseSpeed: 0.012, radius: 110, color: "#e21227", label: "RU",  ringInterval: 1800 },
  { x: 0.78, y: 0.38, baseIntensity: 0.85, intensity: 0.85, pulsePhase: 1.2, pulseSpeed: 0.014, radius: 100, color: "#e21227", label: "CN",  ringInterval: 1600 },
  { x: 0.64, y: 0.44, baseIntensity: 0.7, intensity: 0.7,  pulsePhase: 2.1, pulseSpeed: 0.010, radius: 80,  color: "#ff6b35", label: "IR",  ringInterval: 2200 },
  { x: 0.80, y: 0.35, baseIntensity: 0.6, intensity: 0.6,  pulsePhase: 0.5, pulseSpeed: 0.016, radius: 65,  color: "#ff6b35", label: "KP",  ringInterval: 2600 },
  { x: 0.34, y: 0.62, baseIntensity: 0.55, intensity: 0.55, pulsePhase: 3.0, pulseSpeed: 0.009, radius: 75, color: "#f59e0b", label: "BR",  ringInterval: 3000 },
  { x: 0.52, y: 0.55, baseIntensity: 0.5, intensity: 0.5,  pulsePhase: 1.7, pulseSpeed: 0.011, radius: 70,  color: "#f59e0b", label: "NG",  ringInterval: 2800 },
  { x: 0.20, y: 0.38, baseIntensity: 0.4, intensity: 0.4,  pulsePhase: 0.8, pulseSpeed: 0.008, radius: 85,  color: "#22c55e", label: "US",  ringInterval: 4000 },
  { x: 0.84, y: 0.56, baseIntensity: 0.45, intensity: 0.45, pulsePhase: 2.5, pulseSpeed: 0.013, radius: 60, color: "#f59e0b", label: "AU",  ringInterval: 3400 },
  { x: 0.50, y: 0.32, baseIntensity: 0.6, intensity: 0.6,  pulsePhase: 1.0, pulseSpeed: 0.011, radius: 72,  color: "#ff6b35", label: "EU",  ringInterval: 2400 },
  { x: 0.72, y: 0.46, baseIntensity: 0.65, intensity: 0.65, pulsePhase: 2.8, pulseSpeed: 0.015, radius: 78, color: "#e21227", label: "IN",  ringInterval: 2000 },
];

export function CyberHeatmapHUD() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotspotsRef = useRef<Hotspot[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const sizeRef = useRef({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    // Init hotspots
    hotspotsRef.current = HOTSPOTS_DEF.map(h => ({
      ...h,
      rings: [],
      lastRing: Date.now() + Math.random() * 2000,
    }));

    // Init particles
    function spawnParticle() {
      const hs = hotspotsRef.current;
      if (hs.length < 2) return;
      const si = Math.floor(Math.random() * hs.length);
      let di = Math.floor(Math.random() * hs.length);
      while (di === si) di = Math.floor(Math.random() * hs.length);
      const src = hs[si]; const dst = hs[di];
      const w = sizeRef.current.w; const h2 = sizeRef.current.h;
      particlesRef.current.push({
        x: src.x * w, y: src.y * h2,
        tx: dst.x * w, ty: dst.y * h2,
        progress: 0,
        speed: 0.002 + Math.random() * 0.003,
        alpha: 0.4 + Math.random() * 0.5,
        color: src.color,
        size: 1.5 + Math.random() * 2,
      });
    }
    for (let i = 0; i < 20; i++) spawnParticle();
    const spawnId = setInterval(spawnParticle, 600);

    // Canvas setup
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    function resize() {
      sizeRef.current = { w: window.innerWidth, h: window.innerHeight };
      canvas!.width = sizeRef.current.w;
      canvas!.height = sizeRef.current.h;
    }
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    function draw() {
      t++;
      const w = sizeRef.current.w; const h = sizeRef.current.h;
      ctx.clearRect(0, 0, w, h);

      const now = Date.now();
      const hs = hotspotsRef.current;

      // ── Spawn rings ──
      hs.forEach(spot => {
        spot.pulsePhase += spot.pulseSpeed;
        spot.intensity = spot.baseIntensity * (0.7 + 0.3 * Math.sin(spot.pulsePhase));
        if (now - spot.lastRing > spot.ringInterval) {
          spot.rings.push({ r: 5, maxR: spot.radius * 2.2, alpha: 0.5, color: spot.color });
          spot.lastRing = now;
        }
        spot.rings = spot.rings.filter(r => r.alpha > 0.01);
        spot.rings.forEach(r => {
          r.r += 1.2;
          r.alpha = 0.5 * (1 - r.r / r.maxR);
        });
      });

      // ── Draw inter-hotspot connection lines ──
      ctx.save();
      for (let i = 0; i < hs.length; i++) {
        for (let j = i + 1; j < hs.length; j++) {
          const a = hs[i]; const b = hs[j];
          const ax = a.x * w; const ay = a.y * h;
          const bx = b.x * w; const by = b.y * h;
          const dist = Math.sqrt((ax-bx)**2 + (ay-by)**2);
          if (dist > 500) continue;
          const alpha = (1 - dist / 500) * 0.08 * a.intensity;
          const grd = ctx.createLinearGradient(ax, ay, bx, by);
          grd.addColorStop(0, `${a.color}${Math.round(alpha*255).toString(16).padStart(2,"0")}`);
          grd.addColorStop(1, `${b.color}${Math.round(alpha*255).toString(16).padStart(2,"0")}`);
          ctx.beginPath();
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
          ctx.strokeStyle = grd;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      ctx.restore();

      // ── Draw hotspot glows ──
      hs.forEach(spot => {
        const sx = spot.x * w; const sy = spot.y * h;
        const R = spot.radius * spot.intensity;

        // Outer halo
        const outerGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 2.5);
        outerGrd.addColorStop(0, `${spot.color}00`);
        outerGrd.addColorStop(0.3, `${spot.color}08`);
        outerGrd.addColorStop(0.7, `${spot.color}04`);
        outerGrd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(sx, sy, R * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = outerGrd;
        ctx.fill();

        // Core glow
        const coreGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        coreGrd.addColorStop(0, `${spot.color}20`);
        coreGrd.addColorStop(0.5, `${spot.color}10`);
        coreGrd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(sx, sy, R, 0, Math.PI * 2);
        ctx.fillStyle = coreGrd;
        ctx.fill();

        // Draw rings
        spot.rings.forEach(ring => {
          const hexA = Math.round(ring.alpha * 255).toString(16).padStart(2, "0");
          ctx.beginPath();
          ctx.arc(sx, sy, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = `${ring.color}${hexA}`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Center dot
        const dotR = 3 + Math.sin(spot.pulsePhase * 2) * 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = spot.color;
        ctx.shadowColor = spot.color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = spot.intensity * 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Label
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = `${spot.color}60`;
        ctx.textAlign = "center";
        ctx.fillText(spot.label, sx, sy - dotR - 6);
      });

      // ── Draw particles ──
      const deadParticles: number[] = [];
      particlesRef.current.forEach((p, idx) => {
        p.progress += p.speed;
        if (p.progress >= 1) { deadParticles.push(idx); return; }

        // Bezier curve path (slight arc)
        const t = p.progress;
        const midX = (p.x + p.tx) / 2 + (Math.random() - 0.5) * 30;
        const midY = (p.y + p.ty) / 2 - 60 * Math.sin(Math.PI * t);
        const cx1 = p.x + (midX - p.x) * 0.5;
        const cy1 = p.y + (midY - p.y) * 0.5;
        const cx2 = midX + (p.tx - midX) * 0.5;
        const cy2 = midY + (p.ty - midY) * 0.5;

        // Current position on cubic bezier
        const bx = (1-t)**3*p.x + 3*(1-t)**2*t*cx1 + 3*(1-t)*t**2*cx2 + t**3*p.tx;
        const by = (1-t)**3*p.y + 3*(1-t)**2*t*cy1 + 3*(1-t)*t**2*cy2 + t**3*p.ty;

        const fadeIn = Math.min(1, t * 8);
        const fadeOut = Math.min(1, (1 - t) * 8);
        const alpha = p.alpha * fadeIn * fadeOut;

        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      });
      // Remove dead particles
      for (let i = deadParticles.length - 1; i >= 0; i--) {
        particlesRef.current.splice(deadParticles[i], 1);
      }

      // ── Subtle hex grid overlay ──
      if (t % 2 === 0) { // draw every other frame for performance
        const hexSize = 48;
        const cols = Math.ceil(w / (hexSize * 1.732)) + 1;
        const rows = Math.ceil(h / (hexSize * 1.5)) + 1;
        ctx.save();
        ctx.strokeStyle = "rgba(226,18,39,0.025)";
        ctx.lineWidth = 0.5;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const hx = col * hexSize * 1.732 + (row % 2 ? hexSize * 0.866 : 0);
            const hy = row * hexSize * 1.5;
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
              const angle = (Math.PI / 3) * v - Math.PI / 6;
              const px = hx + hexSize * Math.cos(angle);
              const py = hy + hexSize * Math.sin(angle);
              v === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // ── Vignette darkening at edges ──
      const vig = ctx.createRadialGradient(w/2, h/2, h * 0.3, w/2, h/2, h * 0.9);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, "rgba(6,6,10,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(spawnId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: 1,
        mixBlendMode: "screen",
      }}
    />
  );
}
