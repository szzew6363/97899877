import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Zap, Radio, Activity } from "lucide-react";

/* ══════════════════════════════════════════════════════
   LIVE THREAT TICKER
   A futuristic floating status bar at the bottom-left
   showing scrolling real-time global threat intelligence.
══════════════════════════════════════════════════════ */

const ATTACK_TYPES = [
  "SQL Injection", "XSS Payload", "RCE Attempt", "SSRF Probe",
  "Brute Force", "Log4Shell", "Buffer Overflow", "Zero-Day",
  "DLL Hijack", "Supply Chain", "Kernel Exploit", "CSRF Bypass",
];
const SOURCES = [
  "103.45.67.12 [CN]", "185.220.101.4 [RU]", "45.142.120.8 [KP]",
  "194.165.16.6 [IR]", "78.43.195.22 [RU]", "37.120.233.14 [CN]",
  "185.56.80.65 [KP]", "181.215.232.3 [BR]", "5.188.10.179 [RU]",
];
const SIDS: { label: string; color: string }[] = [
  { label: "CRITICAL", color: "#e21227" },
  { label: "HIGH", color: "#ff6b35" },
  { label: "MEDIUM", color: "#f59e0b" },
];

function genEvent() {
  const sev = SIDS[Math.floor(Math.random() * SIDS.length)];
  return {
    id: Math.random().toString(36).slice(2),
    sev,
    type: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)],
    src: SOURCES[Math.floor(Math.random() * SOURCES.length)],
    time: new Date().toISOString().slice(11, 19),
  };
}

export function LiveThreatTicker() {
  const [events, setEvents] = useState(() => Array.from({ length: 5 }, genEvent));
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [threats, setThreats] = useState(1847);
  const [blocked, setBlocked] = useState(98.4);

  // Rotate events
  useEffect(() => {
    const id = setInterval(() => {
      setEvents(prev => {
        const next = [...prev.slice(-8), genEvent()];
        return next;
      });
      setIdx(i => (i + 1));
      setThreats(t => t + Math.floor(Math.random() * 3));
      setBlocked(b => Math.max(95, Math.min(99.9, b + (Math.random() - 0.4) * 0.3)));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const current = events[idx % events.length];
  if (!current || !visible) return null;

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 2, type: "spring", damping: 25, stiffness: 200 }}
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid rgba(226,18,39,0.25)",
        background: "linear-gradient(135deg, rgba(6,6,10,0.96) 0%, rgba(12,12,20,0.96) 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 30px rgba(226,18,39,0.08)",
        maxWidth: "680px",
        width: "calc(100vw - 160px)",
      }}
    >
      {/* Top glow line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.6) 30%, rgba(255,255,255,0.3) 50%, rgba(226,18,39,0.6) 70%, transparent)",
        pointerEvents: "none",
      }} />

      {/* Left Status Badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "8px 12px",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(226,18,39,0.08)",
        flexShrink: 0,
      }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#e21227",
          boxShadow: "0 0 8px #e21227",
          animation: "neonFlicker 2s ease infinite",
          flexShrink: 0,
        }} />
        <Radio style={{ width: "10px", height: "10px", color: "#e21227" }} />
        <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 900, color: "#e21227", letterSpacing: "1.5px", whiteSpace: "nowrap" }}>SOC LIVE</span>
      </div>

      {/* Scrolling event */}
      <div style={{ flex: 1, overflow: "hidden", padding: "8px 12px", position: "relative" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span style={{
              fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
              color: current.sev.color, padding: "1px 5px", borderRadius: "3px",
              background: `${current.sev.color}18`, border: `1px solid ${current.sev.color}30`,
              flexShrink: 0, letterSpacing: "0.5px",
            }}>{current.sev.label}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>{current.type}</span>
            <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>from</span>
            <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{current.src}</span>
            <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)", flexShrink: 0, marginLeft: "auto" }}>{current.time}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stats cluster */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ padding: "8px 10px", borderRight: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "4px" }}>
          <AlertTriangle style={{ width: "10px", height: "10px", color: "#e21227" }} />
          <span style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: 700, color: "#e21227" }}>{threats.toLocaleString()}</span>
          <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>threats</span>
        </div>
        <div style={{ padding: "8px 10px", borderRight: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "4px" }}>
          <Shield style={{ width: "10px", height: "10px", color: "#22c55e" }} />
          <span style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e" }}>{blocked.toFixed(1)}%</span>
          <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>blocked</span>
        </div>
        <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "4px" }}>
          <Activity style={{ width: "10px", height: "10px", color: "#3b82f6" }} />
          <span style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: 700, color: "#3b82f6" }}>
            {(Math.random() * 400 + 200 | 0)}/s
          </span>
        </div>
      </div>

      {/* Close */}
      <button
        onClick={() => setVisible(false)}
        style={{
          padding: "8px 10px", borderLeft: "1px solid rgba(255,255,255,0.04)",
          background: "transparent", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.15)", fontSize: "12px", flexShrink: 0,
          transition: "color 0.2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.15)"; }}
      >
        ×
      </button>
    </motion.div>
  );
}
