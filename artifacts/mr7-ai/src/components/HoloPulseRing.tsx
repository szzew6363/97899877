/* ════════════════════════════════════════════
   HOLO PULSE RING  — CSS-only (zero Framer Motion)
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
      {/* Pulse rings — CSS keyframe animations */}
      {Array.from({ length: rings }).map((_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1px solid ${color}`,
            pointerEvents: "none",
            animation: `holo-pulse-${(i % 3) + 1} ${speed + i * 0.4}s ease-out infinite`,
            animationDelay: `${i * (speed / rings)}s`,
          }}
        />
      ))}

      {/* Center content */}
      {children}
    </div>
  );
}

/* Standalone spinner ring variant — CSS-only */
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
      {/* Spinning arc — CSS */}
      <div
        className="spin-fast"
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `${thickness}px solid transparent`,
          borderTopColor: color,
          borderRightColor: `${color}55`,
          animationDuration: "1.5s",
        }}
      />
      {/* Reverse spinning arc — CSS */}
      <div
        className="spin-slow-rev"
        style={{
          position: "absolute",
          inset: thickness * 2,
          borderRadius: "50%",
          border: `${thickness * 0.75}px solid transparent`,
          borderBottomColor: `${color}60`,
          borderLeftColor: `${color}30`,
          animationDuration: "2.5s",
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
