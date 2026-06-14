/*
  ╔══════════════════════════════════════════════════════════════╗
  ║  NEURAL PARTICLE BACKGROUND  —  WebGL-class Canvas 2D        ║
  ║  Full-screen living neural network that reacts in real-time  ║
  ║  to cyberBrain metrics: threat level, system health, network ║
  ║  stability, and user engagement.                             ║
  ║  Mouse creates a gravity well — particles orbit the cursor.  ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { useEffect, useRef } from "react";
import { cyberBrain, type ThreatLevel } from "@/lib/cyberBrain";

const THREAT_COL: Record<ThreatLevel, string> = {
  NOMINAL:  "#22c55e",
  ELEVATED: "#f59e0b",
  HIGH:     "#f97316",
  CRITICAL: "#e21227",
};

const PARTICLE_COUNT = 420;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;      /* base radius */
  life: number;   /* 0..1 */
  speed: number;  /* individual speed multiplier */
  hue: number;    /* degrees offset */
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function NeuralParticleBackground() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const mouseRef   = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const rafRef     = useRef(0);
  const stateRef   = useRef({
    threat:  'NOMINAL' as ThreatLevel,
    health:  90,
    network: 90,
    engage:  50,
  });

  useEffect(() => {
    /* Subscribe to brain to update visual state */
    const unsub = cyberBrain.subscribe((ev) => {
      if (ev.type === 'scores_update') {
        const s = ev.payload as { systemHealth: number; networkStability: number; threatLevel: number; userEngagement: number };
        stateRef.current.health  = s.systemHealth;
        stateRef.current.network = s.networkStability;
        stateRef.current.engage  = s.userEngagement;
        stateRef.current.threat  = cyberBrain.getThreatLevel();
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;

    /* DPR — cap at 1.5 for performance on large screens */
    const dpr = Math.min(window.devicePixelRatio ?? 1, 1.5);

    const resize = () => {
      cv.width  = window.innerWidth  * dpr;
      cv.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const ctx = cv.getContext("2d", { alpha: true })!;

    /* Init particles */
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      vx:    (Math.random() - 0.5) * 0.6,
      vy:    (Math.random() - 0.5) * 0.6,
      r:     Math.random() * 1.6 + 0.4,
      life:  Math.random(),
      speed: Math.random() * 0.8 + 0.4,
      hue:   Math.random() * 60 - 30,
    }));

    /* Current visual target values — smoothly interpolated */
    const visual = {
      targetColor: [34, 197, 94] as [number, number, number],
      currentColor:[34, 197, 94] as [number, number, number],
      speed:        0.5,
      targetSpeed:  0.5,
      density:      1.0,
      connectionDist: 80,
      brightness:   0.7,
    };

    let t = 0;
    let lastFrameTime = 0;

    function draw(timestamp: number) {
      rafRef.current = requestAnimationFrame(draw);
      const dt = Math.min((timestamp - lastFrameTime) / 16.67, 3);
      lastFrameTime = timestamp;
      t += 0.008 * dt;

      const W = cv.width, H = cv.height;
      const WS = W / dpr, HS = H / dpr;
      const st = stateRef.current;

      /* Update visual targets from brain state */
      const [tr, tg, tb] = hexToRgb(THREAT_COL[st.threat]);
      visual.targetColor    = [tr, tg, tb];
      visual.targetSpeed    = lerp(0.2, 1.8, st.engage / 100) * (st.threat === 'CRITICAL' ? 2.2 : st.threat === 'HIGH' ? 1.6 : 1.0);
      visual.connectionDist = lerp(55, 110, st.network / 100);
      visual.brightness     = lerp(0.35, 0.9, st.health / 100);

      /* Smooth interpolation */
      for (let i = 0; i < 3; i++) {
        visual.currentColor[i] = lerp(visual.currentColor[i], visual.targetColor[i], 0.04 * dt);
      }
      visual.speed = lerp(visual.speed, visual.targetSpeed, 0.03 * dt);

      const [cr, cg, cb] = visual.currentColor;
      const alpha = visual.brightness;

      /* Clear with slight trail effect for motion blur */
      ctx.fillStyle = `rgba(4,3,9,0.22)`;
      ctx.fillRect(0, 0, W, H);

      /* Mouse gravity well */
      const mx = mouseRef.current.x * dpr;
      const my = mouseRef.current.y * dpr;
      const gravRadius  = 140 * dpr;
      const gravRadius2 = gravRadius * gravRadius;

      /* Update + draw particles */
      ctx.save();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        /* Scale to canvas coords */
        const px = p.x * dpr;
        const py = p.y * dpr;

        /* Mouse gravity */
        const dx = mx - px, dy = my - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < gravRadius2 && d2 > 1) {
          const d    = Math.sqrt(d2);
          const force = (gravRadius - d) / gravRadius * 0.3 * dt;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }

        /* Integration */
        p.x  += p.vx * p.speed * visual.speed * dt;
        p.y  += p.vy * p.speed * visual.speed * dt;

        /* Boundary wrap */
        if (p.x < 0)   p.x = WS;
        if (p.x > WS)  p.x = 0;
        if (p.y < 0)   p.y = HS;
        if (p.y > HS)  p.y = 0;

        /* Damping */
        p.vx *= 0.995;
        p.vy *= 0.995;

        /* Life pulse */
        p.life = (p.life + 0.004 * dt) % 1;
        const lifePulse  = 0.6 + Math.sin(p.life * Math.PI * 2) * 0.4;
        const timePulse  = 0.7 + Math.sin(t * 1.8 + i * 0.31) * 0.3;
        const finalAlpha = alpha * lifePulse * timePulse;

        /* Draw particle */
        const r = (p.r + (d2 < gravRadius2 ? Math.max(0, 1 - Math.sqrt(d2) / gravRadius) * 2.5 : 0)) * dpr;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${finalAlpha})`);
        grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${finalAlpha * 0.4})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath();
        ctx.arc(px, py, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();

      /* Neural connections */
      const connDist  = visual.connectionDist * dpr;
      const connDist2 = connDist * connDist;
      ctx.save();
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        const pix = pi.x * dpr, piy = pi.y * dpr;
        for (let j = i + 1; j < particles.length; j++) {
          const pj  = particles[j];
          const pjx = pj.x * dpr, pjy = pj.y * dpr;
          const dx  = pix - pjx, dy = piy - pjy;
          const d2  = dx * dx + dy * dy;
          if (d2 < connDist2) {
            const strength = (1 - Math.sqrt(d2) / connDist);
            ctx.beginPath();
            ctx.moveTo(pix, piy);
            ctx.lineTo(pjx, pjy);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${strength * alpha * 0.35})`;
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      /* Pulse rings from origin points (world-space neural "hubs") */
      const hubCount = 4;
      for (let h = 0; h < hubCount; h++) {
        const hubAngle = t * 0.12 + (Math.PI * 2 / hubCount) * h;
        const hubR     = Math.min(WS, HS) * 0.3;
        const hx       = WS * 0.5 + Math.cos(hubAngle) * hubR;
        const hy       = HS * 0.5 + Math.sin(hubAngle) * hubR * 0.5;
        const pulse    = ((t * 0.6 + h * 0.25) % 1);
        const pR       = pulse * connDist * 1.5;
        const pAlpha   = (1 - pulse) * alpha * 0.12;
        ctx.beginPath();
        ctx.arc(hx * dpr, hy * dpr, pR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${pAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* Cursor glow field */
      if (mx > 0 && mx < W) {
        const grd = ctx.createRadialGradient(mx, my, 0, mx, my, gravRadius);
        grd.addColorStop(0,   `rgba(${cr},${cg},${cb},0.08)`);
        grd.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.03)`);
        grd.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath();
        ctx.arc(mx, my, gravRadius, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(draw);

    /* Mouse tracking */
    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    window.addEventListener("mousemove", onMove,  { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        width: "100vw", height: "100vh",
        zIndex: 0,
        opacity: 0.72,
      }}
      aria-hidden
    />
  );
}
