import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

// ── QUANTUM PERSONA 3D — Neural Brain Orb ─────────────────────────────────────
// 46px button that shows a 3D rotating neural brain network
// Opens PersonaManagerModal when clicked

function QuantumBrain3D({ open, hover, activeColor }: { open: boolean; hover: boolean; activeColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const openRef   = useRef(open);
  const hoverRef  = useRef(hover);
  const colorRef  = useRef(activeColor);
  const burstRef  = useRef(0);

  useEffect(() => { openRef.current  = open;        }, [open]);
  useEffect(() => { hoverRef.current = hover;       if (hover) burstRef.current = tRef.current; }, [hover]);
  useEffect(() => { colorRef.current = activeColor; }, [activeColor]);

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
    const cx = SIZE / 2, cy = SIZE / 2;
    const FOV = 200;
    const R_BRAIN = 10;

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
      const sc = FOV / (FOV + z + 60);
      return { px: cx + x * sc, py: cy + y * sc, sc };
    }

    // HSL helper
    function hsl(hd: number, s = 1, l = 0.58): string {
      const hh = ((hd % 360) + 360) % 360;
      const k  = (n: number) => (n + hh / 30) % 12;
      const aa = s * Math.min(l, 1 - l);
      const f  = (n: number) => l - aa * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return `${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)}`;
    }

    // ── Neural nodes on a sphere ─────────────────────────────────────────
    // Fibonacci sphere distribution for even coverage
    type NNode = {
      x0: number; y0: number; z0: number;  // base unit sphere coords
      r: number;   // node radius
      hOff: number;
      connections: number[];
    };
    const NODE_COUNT = 28;
    const nodes: NNode[] = Array.from({ length: NODE_COUNT }, (_, i) => {
      const phi   = Math.acos(1 - 2 * (i + 0.5) / NODE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        x0: Math.sin(phi) * Math.cos(theta),
        y0: Math.cos(phi),
        z0: Math.sin(phi) * Math.sin(theta),
        r:  0.55 + Math.random() * 0.8,
        hOff: (i / NODE_COUNT) * 360,
        connections: [],
      };
    });

    // Connect nearby nodes
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = nodes[i].x0 - nodes[j].x0;
        const dy = nodes[i].y0 - nodes[j].y0;
        const dz = nodes[i].z0 - nodes[j].z0;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 0.9 && nodes[i].connections.length < 4) {
          nodes[i].connections.push(j);
        }
      }
    }

    // ── Orbiting persona rings (3 rings) ─────────────────────────────────
    type OrbRing = { r: number; tX: number; tY: number; speed: number; hOff: number; nodeCount: number };
    const ORB_RINGS: OrbRing[] = [
      { r: 15, tX:  0.30, tY:  0.15, speed:  0.022, hOff:   0, nodeCount: 5 },
      { r: 19, tX: -0.50, tY:  0.45, speed: -0.015, hOff: 120, nodeCount: 6 },
      { r: 23, tX:  0.70, tY: -0.55, speed:  0.010, hOff: 240, nodeCount: 7 },
    ];

    type OrbP = { ring: number; angle: number; trail: Array<{ x: number; y: number }> };
    const orbParticles: OrbP[] = ORB_RINGS.flatMap((ring, ri) =>
      Array.from({ length: ring.nodeCount }, (_, i) => ({
        ring: ri, angle: (i / ring.nodeCount) * Math.PI * 2 + ri * 1.1, trail: [],
      }))
    );

    function xfOrb(r: number, angle: number, ring: OrbRing, gRX: number, gRY: number, gRZ: number) {
      let [x, y, z] = rotX(r * Math.cos(angle), 0, r * Math.sin(angle), ring.tX);
      [x, y, z] = rotY(x, y, z, ring.tY);
      [x, y, z] = rotX(x, y, z, gRX);
      [x, y, z] = rotY(x, y, z, gRY);
      [x, y, z] = rotZ(x, y, z, gRZ);
      const { px, py, sc } = proj(x, y, z);
      return { px, py, sc, zd: z };
    }

    // ── Background stars ─────────────────────────────────────────────────
    type Star = { x: number; y: number; r: number; a: number; va: number };
    const stars: Star[] = Array.from({ length: 45 }, () => ({
      x: Math.random() * SIZE, y: Math.random() * SIZE,
      r: 0.18 + Math.random() * 0.45,
      a: 0.10 + Math.random() * 0.55,
      va: 0.012 + Math.random() * 0.028,
    }));

    // ── Signal pulses along brain connections ─────────────────────────────
    type Signal = { nodeI: number; nodeJ: number; t: number; speed: number; hOff: number };
    const signals: Signal[] = [];
    function spawnSignal() {
      for (let i = 0; i < NODE_COUNT; i++) {
        if (nodes[i].connections.length > 0 && Math.random() < 0.04) {
          const j = nodes[i].connections[Math.floor(Math.random() * nodes[i].connections.length)];
          signals.push({ nodeI: i, nodeJ: j, t: 0, speed: 0.012 + Math.random() * 0.018, hOff: Math.random() * 360 });
        }
      }
      if (signals.length > 20) signals.splice(0, signals.length - 20);
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const isH = hoverRef.current;
      const isO = openRef.current;
      tRef.current += isH ? 0.028 : 0.016;
      const t = tRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const hue = (t * (isH ? 22 : 11)) % 360;
      const gRX = Math.sin(t * 0.23) * 0.30 + 0.12;
      const gRY = t * (isH ? 0.36 : 0.20);
      const gRZ = Math.sin(t * 0.31) * 0.15;

      // ── Background stars ───────────────────────────────────────────────
      stars.forEach(s => {
        const a = s.a * (0.5 + Math.sin(t * s.va) * 0.5);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      });

      // ── Outer corona / aura ────────────────────────────────────────────
      const coronaR = R_BRAIN + (isH ? 17 : 13);
      const corona = ctx.createRadialGradient(cx, cy, R_BRAIN * 0.7, cx, cy, coronaR);
      corona.addColorStop(0,    `rgba(${hsl(hue)},${isO ? 0.22 : isH ? 0.18 : 0.11})`);
      corona.addColorStop(0.35, `rgba(${hsl(hue + 60)},${isO ? 0.12 : 0.07})`);
      corona.addColorStop(0.7,  `rgba(${hsl(hue + 120)},0.03)`);
      corona.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, Math.PI * 2);
      ctx.fillStyle = corona; ctx.fill();

      // ── Pulsing aura rings ─────────────────────────────────────────────
      for (let pr = 0; pr < 3; pr++) {
        const pulse = (Math.sin(t * (1.8 + pr * 0.5) + pr * 1.2) + 1) / 2;
        const rr = R_BRAIN + 1.5 + pr * 2.5 + pulse * 4;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hsl(hue + pr * 120)},${(0.22 - pr * 0.05) * (1 - pulse * 0.4)})`;
        ctx.lineWidth = 0.75 - pr * 0.18; ctx.stroke();
      }

      // ── Hover burst ────────────────────────────────────────────────────
      const burstAge = t - burstRef.current;
      if (isH && burstAge < 2.5) {
        for (let bi = 0; bi < 12; bi++) {
          const bp = ((t * 0.7 + bi * 17) % 80) / 80;
          const bRad = R_BRAIN + 1 + bp * 14;
          ctx.beginPath(); ctx.arc(cx, cy, bRad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(hue + bi * 30)},${(1 - bp) * 0.38})`;
          ctx.lineWidth = 1.8 * (1 - bp); ctx.stroke();
        }
      }

      // ── Project all brain nodes ────────────────────────────────────────
      const projected: Array<{ px: number; py: number; sc: number; zd: number; ni: number }> = [];
      nodes.forEach((n, ni) => {
        let [x, y, z] = rotX(n.x0 * R_BRAIN, n.y0 * R_BRAIN, n.z0 * R_BRAIN, gRX);
        [x, y, z] = rotY(x, y, z, gRY);
        [x, y, z] = rotZ(x, y, z, gRZ);
        const { px, py, sc } = proj(x, y, z);
        projected.push({ px, py, sc, zd: z, ni });
      });

      // ── Draw neural connections (back to front) ────────────────────────
      const sortedNodes = [...projected].sort((a, b) => a.zd - b.zd);
      sortedNodes.forEach(({ px, py, sc, zd, ni }) => {
        const n = nodes[ni];
        n.connections.forEach(j => {
          const pj = projected[j];
          // Only draw if both visible (not behind camera)
          const alpha = (0.12 + sc * 0.1) * (0.5 + zd * 0.04) * (isH ? 1.4 : 1.0);
          if (alpha <= 0) return;
          ctx.beginPath();
          ctx.moveTo(px, py); ctx.lineTo(pj.px, pj.py);
          const linGrad = ctx.createLinearGradient(px, py, pj.px, pj.py);
          linGrad.addColorStop(0, `rgba(${hsl(hue + n.hOff)},${Math.min(alpha, 0.45)})`);
          linGrad.addColorStop(1, `rgba(${hsl(hue + nodes[j].hOff)},${Math.min(alpha * 0.6, 0.28)})`);
          ctx.strokeStyle = linGrad;
          ctx.lineWidth = 0.3 + sc * 0.2; ctx.stroke();
        });
      });

      // ── Spawn and draw signals ─────────────────────────────────────────
      spawnSignal();
      signals.forEach(sig => {
        sig.t += sig.speed;
        if (sig.t > 1) { sig.t = 0; }
        const pI = projected[sig.nodeI];
        const pJ = projected[sig.nodeJ];
        const sx = pI.px + (pJ.px - pI.px) * sig.t;
        const sy = pI.py + (pJ.py - pI.py) * sig.t;
        const sAlpha = 0.8 * Math.sin(sig.t * Math.PI);
        ctx.beginPath(); ctx.arc(sx, sy, 1.0 + sig.t * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hsl(hue + sig.hOff)},${sAlpha})`; ctx.fill();
        // Glow
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 3);
        grd.addColorStop(0, `rgba(${hsl(hue + sig.hOff)},${sAlpha * 0.4})`);
        grd.addColorStop(1, `rgba(${hsl(hue + sig.hOff)},0)`);
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      });

      // ── Draw neural nodes (back to front) ─────────────────────────────
      sortedNodes.forEach(({ px, py, sc, zd, ni }) => {
        const n = nodes[ni];
        const pulse = (Math.sin(t * 2.5 + ni * 0.7) + 1) / 2;
        const nr = (n.r * sc + pulse * 0.3) * (isH ? 1.2 : 1.0);
        const alpha = 0.5 + (zd / R_BRAIN) * 0.4;

        // Node glow
        if (alpha > 0.6 || isH) {
          const ng = ctx.createRadialGradient(px, py, 0, px, py, nr * 3);
          ng.addColorStop(0, `rgba(${hsl(hue + n.hOff)},${alpha * 0.55 * (1 + pulse * 0.3)})`);
          ng.addColorStop(1, `rgba(${hsl(hue + n.hOff)},0)`);
          ctx.beginPath(); ctx.arc(px, py, nr * 3, 0, Math.PI * 2);
          ctx.fillStyle = ng; ctx.fill();
        }

        // Node body
        const nGrad = ctx.createRadialGradient(px, py - nr * 0.3, 0, px, py, nr);
        nGrad.addColorStop(0, `rgba(${hsl(hue + n.hOff, 0.8, 0.85)},${alpha * 0.95})`);
        nGrad.addColorStop(0.6, `rgba(${hsl(hue + n.hOff)},${alpha * 0.75})`);
        nGrad.addColorStop(1, `rgba(${hsl(hue + n.hOff, 1, 0.3)},${alpha * 0.5})`);
        ctx.beginPath(); ctx.arc(px, py, nr, 0, Math.PI * 2);
        ctx.fillStyle = nGrad; ctx.fill();
      });

      // ── Orbiting persona rings ─────────────────────────────────────────
      ORB_RINGS.forEach((ring, ri) => {
        // Draw ring orbit path
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const { px, py } = xfOrb(ring.r, a, ring, gRX, gRY, gRZ);
          if (first) { ctx.moveTo(px, py); first = false; }
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.setLineDash([1.5, 3.5]);
        ctx.strokeStyle = `rgba(${hsl(hue + ring.hOff)},${0.12 + ri * 0.02})`;
        ctx.lineWidth = 0.4; ctx.stroke();
        ctx.setLineDash([]);

        // Advance particles
        orbParticles.filter(p => p.ring === ri).forEach(p => {
          p.angle += ring.speed;
          const { px, py, sc } = xfOrb(ring.r, p.angle, ring, gRX, gRY, gRZ);

          // Trail
          p.trail.push({ x: px, y: py });
          if (p.trail.length > 8) p.trail.shift();
          p.trail.forEach((pt, ti) => {
            if (ti === 0) return;
            const ta = (ti / p.trail.length) * 0.4;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, sc * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${hsl(hue + ring.hOff)},${ta})`; ctx.fill();
          });

          // Electron node
          const nodeR = 1.2 * sc;
          const eGrad = ctx.createRadialGradient(px, py, 0, px, py, nodeR * 3);
          eGrad.addColorStop(0, `rgba(${hsl(hue + ring.hOff, 1, 0.9)},0.9)`);
          eGrad.addColorStop(1, `rgba(${hsl(hue + ring.hOff)},0)`);
          ctx.beginPath(); ctx.arc(px, py, nodeR * 3, 0, Math.PI * 2);
          ctx.fillStyle = eGrad; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, nodeR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,0.95)`; ctx.fill();
        });
      });

      // ── Brain core sphere ──────────────────────────────────────────────
      const coreGrad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, R_BRAIN);
      coreGrad.addColorStop(0,   `rgba(${hsl(hue, 0.5, 0.85)},0.92)`);
      coreGrad.addColorStop(0.4, `rgba(${hsl(hue + 90, 0.8, 0.6)},0.78)`);
      coreGrad.addColorStop(0.75,`rgba(${hsl(hue + 180, 1, 0.45)},0.60)`);
      coreGrad.addColorStop(1,   `rgba(${hsl(hue + 270, 1, 0.3)},0.35)`);
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad; ctx.fill();

      // Core border
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${hsl(hue)},${isH ? 0.7 : 0.45})`;
      ctx.lineWidth = isH ? 1.2 : 0.8;
      ctx.shadowColor = `rgba(${hsl(hue)},0.8)`;
      ctx.shadowBlur = isH ? 8 : 4;
      ctx.stroke(); ctx.shadowBlur = 0;

      // Center text label
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `bold 5px monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(isH ? "PERSONA" : "P·AI", cx, cy);
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 46, height: 46, display: "block", cursor: "pointer" }}
    />
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
interface QuantumPersona3DProps {
  onOpenPersonaManager?: () => void;
}

export function QuantumPersona3D({ onOpenPersonaManager }: QuantumPersona3DProps) {
  const { state } = useStore();
  const [open, setOpen]   = useState(false);
  const [hover, setHover] = useState(false);

  // Color based on active persona category
  const activePersona = state.activePersona ?? "default";
  const PERSONA_COLORS: Record<string, string> = {
    general:    "#22c55e",
    uncensored: "#f59e0b",
    security:   "#e21227",
    specialist: "#6366f1",
  };
  const activeColor = PERSONA_COLORS[activePersona] ?? "#a78bfa";

  function handleClick() {
    if (onOpenPersonaManager) {
      onOpenPersonaManager();
    }
  }

  return (
    <motion.div
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex-shrink-0 rounded-full cursor-pointer select-none"
      style={{
        width: 46,
        height: 46,
        boxShadow: hover || open
          ? `0 0 18px ${activeColor}55, 0 0 36px ${activeColor}22`
          : `0 0 8px ${activeColor}22`,
        border: `1px solid ${hover || open ? activeColor + "66" : activeColor + "28"}`,
        borderRadius: "50%",
        background: "rgba(4,4,12,0.85)",
        transition: "box-shadow 0.25s, border-color 0.25s",
      }}
      whileHover={{ scale: 1.08, y: -1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      title={`مدير الشخصيات — ${activePersona}`}
      aria-label="مدير الشخصيات"
    >
      <QuantumBrain3D open={open} hover={hover} activeColor={activeColor} />

      {/* Active indicator dot */}
      <motion.div
        className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full"
        style={{ background: activeColor, boxShadow: `0 0 6px ${activeColor}` }}
        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />

      {/* Tooltip label on hover */}
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.9 }}
        animate={{ opacity: hover ? 1 : 0, y: hover ? 0 : 4, scale: hover ? 1 : 0.9 }}
        transition={{ duration: 0.18 }}
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap text-center"
        style={{
          fontSize: 8,
          fontWeight: 900,
          color: activeColor,
          letterSpacing: "0.1em",
          textShadow: `0 0 8px ${activeColor}`,
        }}
      >
        PERSONA
      </motion.div>
    </motion.div>
  );
}
