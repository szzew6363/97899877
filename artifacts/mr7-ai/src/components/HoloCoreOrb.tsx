import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface HoloCoreOrbProps {
  size?: number;
  color?: string;
  stats?: { label: string; value: string }[];
  className?: string;
}

function OrbCanvas({ size, color }: { size: number; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const S = size * window.devicePixelRatio;
    canvas.width = S;
    canvas.height = S;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const cx = S / 2;
    const cy = S / 2;
    const R = S * 0.32;

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    type OrbParticle = { angle: number; speed: number; radius: number; size: number; alpha: number; orbitY: number };
    const particles: OrbParticle[] = Array.from({ length: 60 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: (Math.random() - 0.5) * 0.015,
      radius: R * (0.85 + Math.random() * 0.35),
      size: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.7,
      orbitY: (Math.random() - 0.5) * 0.6,
    }));

    function hslStr(h: number, sat = 1, lit = 0.58): string {
      const hh = ((h % 360) + 360) % 360;
      const k = (n: number) => (n + hh / 30) % 12;
      const a = sat * Math.min(lit, 1 - lit);
      const f = (n: number) => lit - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return `${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)}`;
    }

    // 6 orbital rings with true 3D tilt
    type OrbRing = { tX: number; tY: number; speed: number; hOff: number };
    const ORINGS: OrbRing[] = [
      { tX: 0.28, tY: 0.12, speed: 0.020, hOff:  0 },
      { tX:-0.55, tY: 0.45, speed:-0.014, hOff: 60 },
      { tX: 0.72, tY:-0.55, speed: 0.010, hOff:120 },
      { tX:-0.38, tY: 0.30, speed:-0.008, hOff:180 },
      { tX: 0.50, tY:-0.42, speed: 0.006, hOff:240 },
      { tX:-0.25, tY: 0.58, speed:-0.004, hOff:300 },
    ];

    // Nebula cloud
    type Neb = { x: number; y: number; rx: number; ry: number; hOff: number; angle: number };
    const nebulae: Neb[] = Array.from({ length: 5 }, (_, i) => ({
      x: cx + Math.cos(i * 1.26) * R * 0.6,
      y: cy + Math.sin(i * 1.26) * R * 0.6,
      rx: R * (0.18 + i * 0.04), ry: R * (0.12 + i * 0.03),
      hOff: i * 72, angle: i * 0.8,
    }));

    function draw() {
      timeRef.current += 0.016;
      const t = timeRef.current;
      ctx.clearRect(0, 0, S, S);

      const hue = (t * 30) % 360;
      const pulse = Math.sin(t * 1.5) * 0.5 + 0.5;

      // ── Outer ambient corona ──────────────────────────────────────────────
      for (let ai = 0; ai < 3; ai++) {
        const aR = R * (1.6 + ai * 0.35) + pulse * R * 0.08;
        const aGrd = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, aR);
        aGrd.addColorStop(0, `rgba(${hslStr(hue + ai * 60)},${0.12 - ai * 0.03})`);
        aGrd.addColorStop(0.6, `rgba(${hslStr(hue + ai * 60)},${0.03 - ai * 0.008})`);
        aGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(cx, cy, aR, 0, Math.PI * 2);
        ctx.fillStyle = aGrd; ctx.fill();
      }

      // ── Nebula wisps inside orb ──────────────────────────────────────────
      nebulae.forEach((nb, ni) => {
        const nx = cx + Math.cos(t * 0.05 + nb.angle) * R * 0.28 + Math.sin(t * 0.07 + ni) * R * 0.15;
        const ny = cy + Math.sin(t * 0.06 + nb.angle) * R * 0.24 + Math.cos(t * 0.05 + ni) * R * 0.12;
        const nGrd = ctx.createRadialGradient(nx, ny, 0, nx, ny, nb.rx);
        nGrd.addColorStop(0, `rgba(${hslStr(hue + nb.hOff)},${0.10 + pulse * 0.04})`);
        nGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.translate(nx, ny);
        ctx.scale(1, nb.ry / nb.rx);
        ctx.beginPath(); ctx.arc(0, 0, nb.rx, 0, Math.PI * 2);
        ctx.fillStyle = nGrd; ctx.fill();
        ctx.restore();
      });

      // ── 3D projected orbital rings ──────────────────────────────────────
      const FOV = 300;
      function proj3(x: number, y: number, z: number) {
        const sc = FOV / (FOV + z + R * 2);
        return { px: cx + x * sc, py: cy + y * sc, sc };
      }
      function xf3(rx: number, a: number, ring: OrbRing): { px: number; py: number; sc: number; zd: number } {
        let [x, y, z]: [number,number,number] = [rx * Math.cos(a), 0, rx * Math.sin(a)];
        const c1 = Math.cos(ring.tX), s1 = Math.sin(ring.tX);
        [, y, z] = [x, y * c1 - z * s1, y * s1 + z * c1];
        const c2 = Math.cos(ring.tY), s2 = Math.sin(ring.tY);
        [x, , z] = [x * c2 + z * s2, y, -x * s2 + z * c2];
        const { px, py, sc } = proj3(x, y, z);
        return { px, py, sc, zd: z };
      }

      ORINGS.forEach((ring, ri) => {
        // Ring path
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 80; i++) {
          const a = (i / 80) * Math.PI * 2;
          const { px, py } = xf3(R * (0.85 + ri * 0.08), a, ring);
          if (first) { ctx.moveTo(px, py); first = false; }
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = `rgba(${hslStr(hue + ring.hOff)},${0.22 - ri * 0.025})`;
        ctx.lineWidth = 0.8; ctx.stroke(); ctx.setLineDash([]);
        // Orbiting particle
        const pa = t * ring.speed * 15 + ri * 0.85;
        const { px: dpx, py: dpy } = xf3(R * (0.85 + ri * 0.08), pa, ring);
        const pgrd = ctx.createRadialGradient(dpx, dpy, 0, dpx, dpy, 7);
        pgrd.addColorStop(0, `rgba(255,255,255,0.9)`);
        pgrd.addColorStop(0.4, `rgba(${hslStr(hue + ring.hOff)},0.6)`);
        pgrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(dpx, dpy, 7, 0, Math.PI * 2);
        ctx.fillStyle = pgrd; ctx.fill();
        ctx.beginPath(); ctx.arc(dpx, dpy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fill();
      });

      // ── Quantum entanglement beams between rings ─────────────────────────
      for (let qi = 0; qi < 3; qi++) {
        const r1 = ORINGS[qi], r2 = ORINGS[(qi + 2) % ORINGS.length];
        const a1 = t * r1.speed * 15 + qi * 0.6;
        const a2 = t * r2.speed * 15 + qi * 0.8 + 1.2;
        const p1 = xf3(R * 0.92, a1, r1);
        const p2 = xf3(R * 0.92, a2, r2);
        const mx = (p1.px + p2.px) / 2 + Math.sin(t * 0.3 + qi) * R * 0.1;
        const my = (p1.py + p2.py) / 2 + Math.cos(t * 0.28 + qi) * R * 0.08;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.quadraticCurveTo(mx, my, p2.px, p2.py);
        ctx.strokeStyle = `rgba(${hslStr(hue + qi * 60)},${0.06 + Math.sin(t * 0.8 + qi) * 0.02})`;
        ctx.lineWidth = 0.6; ctx.stroke();
      }

      // ── Core sphere — rainbow spectrum ──────────────────────────────────
      const coreGrd = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.36, 0, cx, cy, R);
      coreGrd.addColorStop(0,    `rgba(255,255,255,${0.95 + pulse * 0.05})`);
      coreGrd.addColorStop(0.12, `rgba(${hslStr(hue, 1, 0.92)},1.0)`);
      coreGrd.addColorStop(0.35, `rgba(${hslStr(hue, 1, 0.68)},0.95)`);
      coreGrd.addColorStop(0.65, `rgba(${hslStr(hue, 1, 0.42)},0.85)`);
      coreGrd.addColorStop(0.85, `rgba(${hslStr(hue, 1, 0.22)},0.75)`);
      coreGrd.addColorStop(1,    `rgba(${r},${g},${b},0.60)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = coreGrd; ctx.fill();

      // Surface plasma swirls
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      for (let sw = 0; sw < 4; sw++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 0.80, R * 0.28, t * 0.03 + sw * 0.78, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hslStr(hue + sw * 45)},${0.14 - sw * 0.025})`;
        ctx.lineWidth = 0.55; ctx.stroke();
      }
      ctx.restore();

      // ── Pulsing energy rings ─────────────────────────────────────────────
      for (let pr = 0; pr < 4; pr++) {
        const prPulse = 0.5 + Math.sin(t * (1.4 + pr * 0.35) + pr * 0.9) * 0.5;
        const prR = R + 2 + pr * 3.5 + prPulse * 5;
        ctx.beginPath(); ctx.arc(cx, cy, prR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hslStr(hue + pr * 60)},${(0.20 - pr * 0.035) * prPulse})`;
        ctx.lineWidth = 0.9 - pr * 0.18; ctx.stroke();
      }

      // ── Outward scan ──────────────────────────────────────────────────────
      const scanY = ((t * 0.42) % 2) - 1;
      const scanSY = cy + scanY * R;
      if (scanSY > cy - R && scanSY < cy + R) {
        const hw = Math.sqrt(Math.max(0, R * R - (scanSY - cy) ** 2));
        const scanGrd = ctx.createLinearGradient(cx - hw, scanSY, cx + hw, scanSY);
        scanGrd.addColorStop(0, "transparent");
        scanGrd.addColorStop(0.3, `rgba(${hslStr(hue)},0.12)`);
        scanGrd.addColorStop(0.5, "rgba(255,255,255,0.38)");
        scanGrd.addColorStop(0.7, `rgba(${hslStr(hue + 60)},0.12)`);
        scanGrd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.moveTo(cx - hw, scanSY); ctx.lineTo(cx + hw, scanSY);
        ctx.strokeStyle = scanGrd; ctx.lineWidth = 1.8; ctx.stroke();
      }

      // Specular highlight
      const spec = ctx.createRadialGradient(cx - R * 0.40, cy - R * 0.44, 0, cx - R * 0.12, cy - R * 0.12, R);
      spec.addColorStop(0, "rgba(255,255,255,0.90)");
      spec.addColorStop(0.2, "rgba(255,255,255,0.22)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [size, color]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

export function HoloCoreOrb({
  size = 280,
  color = "#e21227",
  stats = [],
  className = "",
}: HoloCoreOrbProps) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <motion.div
        animate={{ scale: hovering ? 1.05 : 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ position: "relative" }}
      >
        <OrbCanvas size={size} color={color} />

        {/* Center icon */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          pointerEvents: "none",
        }}>
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.9, 1, 0.9],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              fontFamily: "monospace",
              fontSize: size * 0.085 + "px",
              fontWeight: 900,
              letterSpacing: "-1px",
              color: "rgba(255,255,255,0.95)",
              textShadow: `0 0 20px ${color}, 0 0 40px ${color}80`,
            }}
          >
            KGT
          </motion.div>
          <div style={{
            fontFamily: "monospace",
            fontSize: size * 0.042 + "px",
            color: color,
            letterSpacing: "3px",
            textShadow: `0 0 10px ${color}`,
            opacity: 0.8,
          }}>
            v2.0
          </div>
        </div>
      </motion.div>

      {/* Floating stats around the orb */}
      {stats.map((stat, i) => {
        const angle = (i / stats.length) * Math.PI * 2 - Math.PI / 2;
        const radius = size * 0.58;
        const sx = Math.cos(angle) * radius;
        const sy = Math.sin(angle) * radius;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15, type: "spring" }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${sx}px), calc(-50% + ${sy}px))`,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{
              background: "rgba(8,8,12,0.85)",
              border: `1px solid ${color}30`,
              borderRadius: "8px",
              padding: "4px 10px",
              backdropFilter: "blur(8px)",
              boxShadow: `0 0 12px ${color}15`,
            }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color, fontFamily: "monospace" }}>{stat.value}</div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase" }}>{stat.label}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
