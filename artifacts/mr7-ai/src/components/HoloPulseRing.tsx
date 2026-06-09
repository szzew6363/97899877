import { motion } from "framer-motion";

/* ════════════════════════════════════════════
   HOLO PULSE RING
   Decorative concentric pulsing rings for
   ambient 3D depth — wraps any element.
════════════════════════════════════════════ */

interface HoloPulseRingProps {
  size?: number;
  color?: string;
  rings?: number;
  speed?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function HoloPulseRing({
  size = 40,
  color = "#e21227",
  rings = 3,
  speed = 2.5,
  children,
  style,
  className,
}: HoloPulseRingProps) {
  return (
    <div
      className={className}
      style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", ...style }}
    >
      {/* Pulse rings */}
      {Array.from({ length: rings }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 2.2 + i * 0.4],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: speed + i * 0.4,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * (speed / rings),
          }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1px solid ${color}`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Center content */}
      {children}
    </div>
  );
}

/* Standalone spinner ring variant */
export function CyberSpinnerRing({
  size = 32,
  color = "#e21227",
  thickness = 2,
}: { size?: number; color?: string; thickness?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Static track */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `${thickness}px solid ${color}10`,
      }} />
      {/* Spinning arc */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `${thickness}px solid transparent`,
          borderTopColor: color,
          borderRightColor: `${color}55`,
        }}
      />
      {/* Reverse spinning arc */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: thickness * 2,
          borderRadius: "50%",
          border: `${thickness * 0.75}px solid transparent`,
          borderBottomColor: `${color}60`,
          borderLeftColor: `${color}30`,
        }}
      />
      {/* Center dot */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: thickness * 2, height: thickness * 2,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 ${thickness * 4}px ${color}`,
      }} />
    </div>
  );
}
