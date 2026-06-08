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

    function draw() {
      timeRef.current += 0.016;
      const t = timeRef.current;
      ctx.clearRect(0, 0, S, S);

      const pulse = Math.sin(t * 1.5) * 0.5 + 0.5;

      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.8);
      grd.addColorStop(0, `rgba(${r},${g},${b},${0.15 + pulse * 0.08})`);
      grd.addColorStop(0.5, `rgba(${r},${g},${b},${0.06 + pulse * 0.04})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      const coreGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      coreGrd.addColorStop(0, `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},${0.18 + pulse * 0.12})`);
      coreGrd.addColorStop(0.4, `rgba(${r},${g},${b},${0.12 + pulse * 0.08})`);
      coreGrd.addColorStop(0.8, `rgba(${r},${g},${b},0.06)`);
      coreGrd.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = coreGrd;
      ctx.fill();

      for (let ring = 0; ring < 3; ring++) {
        const ringAngle = t * (0.4 + ring * 0.2) + (ring * Math.PI / 3);
        const tiltX = Math.sin(ringAngle) * 0.7;
        const tiltY = Math.cos(ringAngle * 0.7) * 0.3;
        const ringR = R * (0.9 + ring * 0.15);
        const scaleY = Math.abs(Math.cos(ringAngle)) * 0.5 + 0.1;
        const ringAlpha = 0.15 + Math.abs(Math.sin(ringAngle)) * 0.3;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1 + tiltX * 0.1, scaleY);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        const dotAngle = t * (1 + ring * 0.5) + ring * Math.PI * 0.67;
        const dotX = Math.cos(dotAngle) * ringR;
        const dotY = Math.sin(dotAngle) * ringR;
        const dotGrd = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 6);
        dotGrd.addColorStop(0, `rgba(255,255,255,${0.8 + Math.sin(t * 3 + ring) * 0.2})`);
        dotGrd.addColorStop(0.5, `rgba(${r},${g},${b},0.6)`);
        dotGrd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = dotGrd;
        ctx.fill();

        ctx.restore();
      }

      particles.forEach(p => {
        p.angle += p.speed;
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius * (0.2 + Math.abs(p.orbitY) * 0.5);
        const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        const visible = d > R * 0.85;
        if (!visible) return;
        const pAlpha = p.alpha * (0.5 + Math.sin(t * 2 + p.angle) * 0.5) * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${pAlpha})`;
        ctx.fill();
      });

      const scanY = ((t * 0.4) % 2) - 1;
      const scanScreenY = cy + scanY * R;
      if (scanScreenY > cy - R && scanScreenY < cy + R) {
        const halfWidth = Math.sqrt(Math.max(0, R * R - (scanScreenY - cy) ** 2));
        const scanGrd = ctx.createLinearGradient(cx - halfWidth, scanScreenY, cx + halfWidth, scanScreenY);
        scanGrd.addColorStop(0, "transparent");
        scanGrd.addColorStop(0.3, `rgba(${r},${g},${b},0.1)`);
        scanGrd.addColorStop(0.5, `rgba(255,255,255,0.3)`);
        scanGrd.addColorStop(0.7, `rgba(${r},${g},${b},0.1)`);
        scanGrd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.moveTo(cx - halfWidth, scanScreenY);
        ctx.lineTo(cx + halfWidth, scanScreenY);
        ctx.strokeStyle = scanGrd;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

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
