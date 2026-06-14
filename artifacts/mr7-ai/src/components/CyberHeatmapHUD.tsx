import { useEffect, useRef } from "react";

interface Hotspot {
  x: number;
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

interface LineDot {
  si: number;
  di: number;
  progress: number;
  speed: number;
}

interface Shockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
  startTime: number;
}

const HOTSPOTS_DEF: Omit<Hotspot, "rings" | "lastRing">[] = [
  { x: 0.62, y: 0.28, baseIntensity: 0.9,  intensity: 0.9,  pulsePhase: 0,   pulseSpeed: 0.012, radius: 110, color: "#e21227", label: "RU", ringInterval: 1800 },
  { x: 0.78, y: 0.38, baseIntensity: 0.85, intensity: 0.85, pulsePhase: 1.2, pulseSpeed: 0.014, radius: 100, color: "#e21227", label: "CN", ringInterval: 1600 },
  { x: 0.64, y: 0.44, baseIntensity: 0.7,  intensity: 0.7,  pulsePhase: 2.1, pulseSpeed: 0.010, radius: 80,  color: "#ff6b35", label: "IR", ringInterval: 2200 },
  { x: 0.80, y: 0.35, baseIntensity: 0.6,  intensity: 0.6,  pulsePhase: 0.5, pulseSpeed: 0.016, radius: 65,  color: "#ff6b35", label: "KP", ringInterval: 2600 },
  { x: 0.34, y: 0.62, baseIntensity: 0.55, intensity: 0.55, pulsePhase: 3.0, pulseSpeed: 0.009, radius: 75,  color: "#f59e0b", label: "BR", ringInterval: 3000 },
  { x: 0.52, y: 0.55, baseIntensity: 0.5,  intensity: 0.5,  pulsePhase: 1.7, pulseSpeed: 0.011, radius: 70,  color: "#f59e0b", label: "NG", ringInterval: 2800 },
  { x: 0.20, y: 0.38, baseIntensity: 0.4,  intensity: 0.4,  pulsePhase: 0.8, pulseSpeed: 0.008, radius: 85,  color: "#22c55e", label: "US", ringInterval: 4000 },
  { x: 0.84, y: 0.56, baseIntensity: 0.45, intensity: 0.45, pulsePhase: 2.5, pulseSpeed: 0.013, radius: 60,  color: "#f59e0b", label: "AU", ringInterval: 3400 },
  { x: 0.50, y: 0.32, baseIntensity: 0.6,  intensity: 0.6,  pulsePhase: 1.0, pulseSpeed: 0.011, radius: 72,  color: "#ff6b35", label: "EU", ringInterval: 2400 },
  { x: 0.72, y: 0.46, baseIntensity: 0.65, intensity: 0.65, pulsePhase: 2.8, pulseSpeed: 0.015, radius: 78,  color: "#e21227", label: "IN", ringInterval: 2000 },
];

export function CyberHeatmapHUD() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotspotsRef = useRef<Hotspot[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lineDotsRef = useRef<LineDot[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const frameRef = useRef<number>(0);
  const sizeRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  const lastShockwaveRef = useRef(0);
  const nextShockwaveDelayRef = useRef(4000 + Math.random() * 4000);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const lastFrameRef = { current: 0 };
    const attackCounterRef = { current: 847392, lastUpdate: 0 };

    hotspotsRef.current = HOTSPOTS_DEF.map(h => ({
      ...h,
      rings: [],
      lastRing: Date.now() + Math.random() * 2000,
    }));

    // Init 15 line dots
    const hs = hotspotsRef.current;
    lineDotsRef.current = Array.from({ length: 15 }, () => {
      const si = Math.floor(Math.random() * hs.length);
      let di = Math.floor(Math.random() * hs.length);
      while (di === si) di = Math.floor(Math.random() * hs.length);
      return { si, di, progress: Math.random(), speed: 0.003 + Math.random() * 0.005 };
    });

    function spawnParticle() {
      const spots = hotspotsRef.current;
      if (spots.length < 2) return;
      const si = Math.floor(Math.random() * spots.length);
      let di = Math.floor(Math.random() * spots.length);
      while (di === si) di = Math.floor(Math.random() * spots.length);
      const src = spots[si]; const dst = spots[di];
      const { w, h: h2 } = sizeRef.current;
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

    function bezierPoint(p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, tt: number) {
      const u = 1 - tt;
      return {
        x: u*u*u*p0x + 3*u*u*tt*p1x + 3*u*tt*tt*p2x + tt*tt*tt*p3x,
        y: u*u*u*p0y + 3*u*u*tt*p1y + 3*u*tt*tt*p2y + tt*tt*tt*p3y,
      };
    }

    function draw(timestamp: number) {
      const now2 = performance.now();
      const delta = lastFrameRef.current
        ? Math.min((now2 - lastFrameRef.current) / 16.67, 4)
        : 1;
      lastFrameRef.current = now2;

      t++;
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      // Attack counter
      if (now2 - attackCounterRef.lastUpdate > 2000) {
        attackCounterRef.current += Math.floor(Math.random() * 8) + 1;
        attackCounterRef.lastUpdate = now2;
      }
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "rgba(226,18,39,0.5)";
      ctx.textAlign = "left";
      ctx.fillText("▲ LIVE THREATS: " + attackCounterRef.current.toLocaleString(), 12, 20);

      const spots = hotspotsRef.current;
      const now = Date.now();

      // Shockwave spawning
      if (now2 - lastShockwaveRef.current > nextShockwaveDelayRef.current) {
        const hs2 = spots[Math.floor(Math.random() * spots.length)];
        shockwavesRef.current.push({
          x: hs2.x * w, y: hs2.y * h,
          r: 0, maxR: 400,
          alpha: 0.4,
          color: hs2.color,
          startTime: now2,
        });
        lastShockwaveRef.current = now2;
        nextShockwaveDelayRef.current = 4000 + Math.random() * 4000;
      }

      // Draw shockwaves
      shockwavesRef.current = shockwavesRef.current.filter(sw => sw.alpha > 0.01);
      shockwavesRef.current.forEach(sw => {
        sw.r += 3.5 * delta;
        sw.alpha = 0.4 * (1 - sw.r / sw.maxR);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        const hexA = Math.round(sw.alpha * 255).toString(16).padStart(2, "0");
        ctx.strokeStyle = sw.color + hexA;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = sw.color;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Update hotspots
      spots.forEach(spot => {
        spot.pulsePhase += spot.pulseSpeed * delta;
        spot.intensity = spot.baseIntensity * (0.7 + 0.3 * Math.sin(spot.pulsePhase));
        if (now - spot.lastRing > spot.ringInterval) {
          spot.rings.push({ r: 5, maxR: spot.radius * 2.2, alpha: 0.5, color: spot.color });
          spot.lastRing = now;
        }
        spot.rings = spot.rings.filter(r => r.alpha > 0.01);
        spot.rings.forEach(r => {
          r.r += 1.2 * delta;
          r.alpha = 0.5 * (1 - r.r / r.maxR);
        });
      });

      // Connection lines
      ctx.save();
      for (let i = 0; i < spots.length; i++) {
        for (let j = i + 1; j < spots.length; j++) {
          const a = spots[i]; const b = spots[j];
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

      // Animated connection line dots
      lineDotsRef.current.forEach(ld => {
        ld.progress += ld.speed * delta;
        if (ld.progress >= 1) {
          ld.progress = 0;
          const si = Math.floor(Math.random() * spots.length);
          let di = Math.floor(Math.random() * spots.length);
          while (di === si) di = Math.floor(Math.random() * spots.length);
          ld.si = si; ld.di = di;
        }
        const src = spots[ld.si]; const dst = spots[ld.di];
        const p0x = src.x * w; const p0y = src.y * h;
        const p3x = dst.x * w; const p3y = dst.y * h;
        const midX = (p0x + p3x) / 2;
        const midY = (p0y + p3y) / 2 - 60;
        const p1x = p0x + (midX - p0x) * 0.5; const p1y = p0y + (midY - p0y) * 0.5;
        const p2x = midX + (p3x - midX) * 0.5; const p2y = midY + (p3y - midY) * 0.5;
        const pos0 = bezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, ld.progress);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 10;
        ctx.shadowColor = src.color;
        ctx.beginPath();
        ctx.arc(pos0.x, pos0.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = src.color;
        ctx.fill();
        const ghosts = [0.01, 0.02, 0.03] as const;
        ghosts.forEach((offset, gi) => {
          const gp = Math.max(0, ld.progress - offset);
          const gpos = bezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, gp);
          ctx.globalAlpha = 0.5 - gi * 0.15;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(gpos.x, gpos.y, 1.5 - gi * 0.3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      });

      // Hotspot glows
      spots.forEach(spot => {
        const sx = spot.x * w; const sy = spot.y * h;
        const R = spot.radius * spot.intensity;
        const outerGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 2.5);
        outerGrd.addColorStop(0, `${spot.color}00`);
        outerGrd.addColorStop(0.3, `${spot.color}08`);
        outerGrd.addColorStop(0.7, `${spot.color}04`);
        outerGrd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(sx, sy, R * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = outerGrd;
        ctx.fill();
        const coreGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        coreGrd.addColorStop(0, `${spot.color}20`);
        coreGrd.addColorStop(0.5, `${spot.color}10`);
        coreGrd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(sx, sy, R, 0, Math.PI * 2);
        ctx.fillStyle = coreGrd;
        ctx.fill();
        spot.rings.forEach(ring => {
          const hexA = Math.round(ring.alpha * 255).toString(16).padStart(2, "0");
          ctx.beginPath();
          ctx.arc(sx, sy, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = `${ring.color}${hexA}`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
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
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = `${spot.color}60`;
        ctx.textAlign = "center";
        ctx.fillText(spot.label, sx, sy - dotR - 6);
      });

      // Particles
      const dead: number[] = [];
      particlesRef.current.forEach((p, idx) => {
        p.progress += p.speed * delta;
        if (p.progress >= 1) { dead.push(idx); return; }
        const tt = p.progress;
        const midX = (p.x + p.tx) / 2 + (Math.random() - 0.5) * 30;
        const midY = (p.y + p.ty) / 2 - 60 * Math.sin(Math.PI * tt);
        const cx1 = p.x + (midX - p.x) * 0.5; const cy1 = p.y + (midY - p.y) * 0.5;
        const cx2 = midX + (p.tx - midX) * 0.5; const cy2 = midY + (p.ty - midY) * 0.5;
        const bx = (1-tt)**3*p.x + 3*(1-tt)**2*tt*cx1 + 3*(1-tt)*tt**2*cx2 + tt**3*p.tx;
        const by = (1-tt)**3*p.y + 3*(1-tt)**2*tt*cy1 + 3*(1-tt)*tt**2*cy2 + tt**3*p.ty;
        const fadeIn = Math.min(1, tt * 8);
        const fadeOut = Math.min(1, (1 - tt) * 8);
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * fadeIn * fadeOut;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      });
      for (let i = dead.length - 1; i >= 0; i--) particlesRef.current.splice(dead[i], 1);

      // Animated hex grid (desktop only at full fps)
      if (!isMobile) {
        const hexSize = 48;
        const gridOffset = (t * 0.15 * delta) % (hexSize * 1.732);
        const cols = Math.ceil(w / (hexSize * 1.732)) + 2;
        const rows = Math.ceil(h / (hexSize * 1.5)) + 1;
        ctx.save();
        ctx.lineWidth = 0.5;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const hx = col * hexSize * 1.732 + (row % 2 ? hexSize * 0.866 : 0) + gridOffset - hexSize * 1.732;
            const hy = row * hexSize * 1.5;
            ctx.strokeStyle = (row * cols + col) % 5 === 0
              ? "rgba(226,18,39,0.075)"
              : "rgba(226,18,39,0.025)";
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

      // Vignette
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

  const isMobile = window.innerWidth < 768;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: isMobile ? 0.35 : 1,
        mixBlendMode: "screen",
        willChange: "transform",
        transform: "translateZ(0)",
      }}
    />
  );
}
