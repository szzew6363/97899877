import { type ReactNode } from "react";
import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════
   HOLOGRAPHIC PANEL — Reusable 3D futuristic card shell.
   Used throughout the app for any major panel/widget.
══════════════════════════════════════════════════════ */

interface HolographicPanelProps {
  children: ReactNode;
  title?: string;
  badge?: string;
  badgeColor?: string;
  liveIndicator?: boolean;
  className?: string;
  style?: React.CSSProperties;
  glowColor?: string;
  noPadding?: boolean;
  animate?: boolean;
  delay?: number;
}

export function HolographicPanel({
  children,
  title,
  badge,
  badgeColor = "#e21227",
  liveIndicator,
  className = "",
  style = {},
  glowColor = "#e21227",
  noPadding,
  animate = true,
  delay = 0,
}: HolographicPanelProps) {
  const Wrapper = animate ? motion.div : "div";
  const animProps = animate ? {
    initial: { opacity: 0, y: 20, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { delay, type: "spring", damping: 25, stiffness: 220 },
  } : {};

  return (
    // @ts-expect-error motion div props are compatible
    <Wrapper
      className={className}
      style={{
        position: "relative",
        borderRadius: "14px",
        border: `1px solid rgba(255,255,255,0.06)`,
        background: "linear-gradient(135deg, rgba(16,16,22,0.95) 0%, rgba(10,10,16,0.98) 100%)",
        backdropFilter: "blur(24px)",
        boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${glowColor}08`,
        overflow: "hidden",
        transformStyle: "preserve-3d",
        ...style,
      }}
      {...animProps}
    >
      {/* Top shimmer line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1px",
        background: `linear-gradient(90deg, transparent, ${glowColor}50 30%, rgba(255,255,255,0.25) 50%, ${glowColor}50 70%, transparent)`,
        pointerEvents: "none",
        zIndex: 1,
      }} />

      {/* Corner brackets — top-left */}
      <div style={{
        position: "absolute", top: "8px", left: "8px",
        width: "12px", height: "12px",
        borderTop: `1px solid ${glowColor}60`,
        borderLeft: `1px solid ${glowColor}60`,
        borderRadius: "2px 0 0 0",
        pointerEvents: "none",
        zIndex: 1,
      }} />
      {/* Corner brackets — top-right */}
      <div style={{
        position: "absolute", top: "8px", right: "8px",
        width: "12px", height: "12px",
        borderTop: `1px solid ${glowColor}60`,
        borderRight: `1px solid ${glowColor}60`,
        borderRadius: "0 2px 0 0",
        pointerEvents: "none",
        zIndex: 1,
      }} />
      {/* Corner brackets — bottom-left */}
      <div style={{
        position: "absolute", bottom: "8px", left: "8px",
        width: "12px", height: "12px",
        borderBottom: `1px solid ${glowColor}40`,
        borderLeft: `1px solid ${glowColor}40`,
        borderRadius: "0 0 0 2px",
        pointerEvents: "none",
        zIndex: 1,
      }} />
      {/* Corner brackets — bottom-right */}
      <div style={{
        position: "absolute", bottom: "8px", right: "8px",
        width: "12px", height: "12px",
        borderBottom: `1px solid ${glowColor}40`,
        borderRight: `1px solid ${glowColor}40`,
        borderRadius: "0 0 2px 0",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      {/* Header */}
      {(title || badge || liveIndicator) && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.02)",
        }}>
          {liveIndicator && (
            <span style={{
              display: "inline-flex", width: "6px", height: "6px",
              borderRadius: "50%", background: glowColor,
              boxShadow: `0 0 8px ${glowColor}`,
              flexShrink: 0,
            }} className="neon-pulse" />
          )}
          {title && (
            <span style={{
              fontSize: "10px", fontFamily: "monospace", fontWeight: 700,
              color: "rgba(255,255,255,0.55)", letterSpacing: "1.5px", textTransform: "uppercase",
            }}>{title}</span>
          )}
          {badge && (
            <span style={{
              marginLeft: "auto", fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
              color: badgeColor, padding: "2px 6px", borderRadius: "4px",
              background: `${badgeColor}18`, border: `1px solid ${badgeColor}30`,
              letterSpacing: "0.5px",
            }}>{badge}</span>
          )}
        </div>
      )}

      {/* Content */}
      <div style={noPadding ? {} : { padding: "16px" }}>
        {children}
      </div>
    </Wrapper>
  );
}
