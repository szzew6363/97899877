import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, MemoryStick, Wifi, Shield, ChevronUp, ChevronDown } from "lucide-react";

/* ══════════════════════════════════════════════════════
   SYSTEM STATUS WIDGET
   Collapsible floating HUD widget — top-right corner.
   Shows live (simulated) CPU, memory, network, threat
   metrics in a compact futuristic readout.
══════════════════════════════════════════════════════ */

function useAnimatedValue(target: number, speed = 0.06) {
  const [value, setValue] = useState(target);
  const valRef = useRef(value);
  useEffect(() => {
    valRef.current = value;
    let frame: number;
    function tick() {
      const diff = target - valRef.current;
      if (Math.abs(diff) < 0.1) { setValue(target); return; }
      valRef.current += diff * speed;
      setValue(valRef.current);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{
      width: "60px", height: "3px",
      borderRadius: "2px", background: "rgba(255,255,255,0.07)",
      overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{
        height: "100%",
        width: `${Math.min(100, value)}%`,
        background: `linear-gradient(90deg, ${color}60, ${color})`,
        borderRadius: "2px",
        transition: "width 0.4s ease",
        boxShadow: `0 0 4px ${color}80`,
      }} />
    </div>
  );
}

interface StatRow {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  color: string;
}

export function SystemStatusWidget() {
  const [collapsed, setCollapsed] = useState(true);
  const [cpu, setCpu] = useState(34);
  const [mem, setMem] = useState(61);
  const [net, setNet] = useState(22);
  const [shield, setShield] = useState(98.4);

  useEffect(() => {
    const id = setInterval(() => {
      setCpu(c => Math.max(5, Math.min(95, c + (Math.random() - 0.45) * 12)));
      setMem(m => Math.max(40, Math.min(90, m + (Math.random() - 0.48) * 6)));
      setNet(n => Math.max(5, Math.min(100, n + (Math.random() - 0.4) * 20)));
      setShield(s => Math.max(95, Math.min(99.9, s + (Math.random() - 0.5) * 0.4)));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const cpuSmooth = useAnimatedValue(cpu);
  const memSmooth = useAnimatedValue(mem);
  const netSmooth = useAnimatedValue(net);
  const shieldSmooth = useAnimatedValue(shield);

  const stats: StatRow[] = [
    { icon: <Cpu style={{ width: "9px", height: "9px" }} />, label: "CPU", value: cpuSmooth, unit: "%", color: cpu > 75 ? "#e21227" : "#3b82f6" },
    { icon: <MemoryStick style={{ width: "9px", height: "9px" }} />, label: "MEM", value: memSmooth, unit: "%", color: mem > 80 ? "#f59e0b" : "#a78bfa" },
    { icon: <Wifi style={{ width: "9px", height: "9px" }} />, label: "NET", value: netSmooth, unit: "%", color: "#22c55e" },
    { icon: <Shield style={{ width: "9px", height: "9px" }} />, label: "IDS", value: shieldSmooth, unit: "%", color: "#00e5ff" },
  ];

  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 1.5, type: "spring", damping: 22 }}
      style={{
        position: "fixed",
        top: "70px",
        right: "12px",
        zIndex: 85,
        minWidth: "140px",
      }}
    >
      {/* Header pill */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "6px",
          padding: "5px 10px",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: collapsed ? "1px solid rgba(255,255,255,0.08)" : "none",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          background: "linear-gradient(135deg, rgba(10,10,16,0.97), rgba(14,14,22,0.97))",
          backdropFilter: "blur(20px)",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        {/* Live dot */}
        <span style={{
          width: "5px", height: "5px", borderRadius: "50%",
          background: "#22c55e", boxShadow: "0 0 6px #22c55e", flexShrink: 0,
        }} className="neon-pulse" />
        <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "1.5px", flex: 1, textAlign: "left" }}>
          SYS MONITOR
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>
          {collapsed ? <ChevronDown style={{ width: "10px", height: "10px" }} /> : <ChevronUp style={{ width: "10px", height: "10px" }} />}
        </span>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,0.08)",
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
              background: "linear-gradient(135deg, rgba(10,10,16,0.97), rgba(14,14,22,0.97))",
              backdropFilter: "blur(20px)",
              display: "flex", flexDirection: "column", gap: "6px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}>
              {/* Top glow line */}
              <div style={{
                height: "1px",
                background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.3) 50%, transparent)",
                marginBottom: "2px",
              }} />

              {stats.map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ color: s.color, flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", width: "22px", flexShrink: 0 }}>{s.label}</span>
                  <MiniBar value={s.value} color={s.color} />
                  <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: s.color, width: "34px", textAlign: "right", flexShrink: 0 }}>
                    {s.value.toFixed(s.label === "IDS" ? 1 : 0)}{s.unit}
                  </span>
                </div>
              ))}

              {/* Bottom decorative line */}
              <div style={{
                marginTop: "2px", height: "1px",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)",
              }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.12)", letterSpacing: "0.5px" }}>
                  KALI.AI v4.1
                </span>
                <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(226,18,39,0.3)" }}>
                  {new Date().toISOString().slice(11, 19)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
