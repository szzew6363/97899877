import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, MemoryStick, Wifi, Shield, ChevronUp, ChevronDown, GripHorizontal, Thermometer, Activity, Zap } from "lucide-react";

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

function SparkLine({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 60; const H = 18;
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`
  ).join(" ");
  return (
    <svg width={W} height={H} style={{ flexShrink: 0, overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        opacity="0.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={(values.length - 1) / (values.length - 1) * W}
        cy={H - ((values[values.length - 1] - min) / range) * H}
        r="2"
        fill={color}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: "48px", height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden", flexShrink: 0 }}>
      <div style={{
        height: "100%", width: `${Math.min(100, value)}%`,
        background: `linear-gradient(90deg, ${color}50, ${color})`,
        borderRadius: "2px", transition: "width 0.5s ease",
        boxShadow: `0 0 5px ${color}80`,
      }} />
    </div>
  );
}

function loadPos(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem("sys-monitor-pos");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { x: window.innerWidth - 160, y: 70 };
}

function clampPos(x: number, y: number, w = 160, h = 240) {
  return {
    x: Math.max(0, Math.min(window.innerWidth - w, x)),
    y: Math.max(0, Math.min(window.innerHeight - 48, y)),
  };
}

export function SystemStatusWidget() {
  const [collapsed, setCollapsed] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos);
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0, px: 0, py: 0 });

  const [cpu, setCpu] = useState(34);
  const [mem, setMem] = useState(61);
  const [net, setNet] = useState(22);
  const [shield, setShield] = useState(98.4);
  const [temp, setTemp] = useState(52);
  const [latency, setLatency] = useState(18);

  const [cpuHist, setCpuHist] = useState<number[]>(() => Array.from({ length: 20 }, () => 20 + Math.random() * 40));
  const [netHist, setNetHist] = useState<number[]>(() => Array.from({ length: 20 }, () => 10 + Math.random() * 30));
  const [clock, setClock] = useState(() => new Date().toISOString().slice(11, 19));

  const cpuSmooth = useAnimatedValue(cpu);
  const memSmooth = useAnimatedValue(mem);
  const netSmooth = useAnimatedValue(net);
  const shieldSmooth = useAnimatedValue(shield);
  const tempSmooth = useAnimatedValue(temp);
  const latSmooth = useAnimatedValue(latency);

  useEffect(() => {
    const id = setInterval(() => {
      const nc = Math.max(5, Math.min(95, cpu + (Math.random() - 0.45) * 12));
      const nn = Math.max(5, Math.min(100, net + (Math.random() - 0.4) * 20));
      setCpu(nc);
      setMem(m => Math.max(40, Math.min(90, m + (Math.random() - 0.48) * 5)));
      setNet(nn);
      setShield(s => Math.max(95, Math.min(99.9, s + (Math.random() - 0.5) * 0.3)));
      setTemp(t => Math.max(40, Math.min(85, t + (Math.random() - 0.5) * 4)));
      setLatency(l => Math.max(5, Math.min(80, l + (Math.random() - 0.5) * 8)));
      setCpuHist(h => [...h.slice(-19), nc]);
      setNetHist(h => [...h.slice(-19), nn]);
      setClock(new Date().toISOString().slice(11, 19));
    }, 1400);
    return () => clearInterval(id);
  }, [cpu, net]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { dragging: true, ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current.dragging) return;
      const nx = dragRef.current.px + (ev.clientX - dragRef.current.ox);
      const ny = dragRef.current.py + (ev.clientY - dragRef.current.oy);
      const clamped = clampPos(nx, ny);
      setPos(clamped);
    }
    function onUp() {
      dragRef.current.dragging = false;
      setPos(p => {
        try { localStorage.setItem("sys-monitor-pos", JSON.stringify(p)); } catch {}
        return p;
      });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragRef.current = { dragging: true, ox: t.clientX, oy: t.clientY, px: pos.x, py: pos.y };

    function onMove(ev: TouchEvent) {
      if (!dragRef.current.dragging) return;
      const touch = ev.touches[0];
      const nx = dragRef.current.px + (touch.clientX - dragRef.current.ox);
      const ny = dragRef.current.py + (touch.clientY - dragRef.current.oy);
      const clamped = clampPos(nx, ny);
      setPos(clamped);
    }
    function onEnd() {
      dragRef.current.dragging = false;
      setPos(p => {
        try { localStorage.setItem("sys-monitor-pos", JSON.stringify(p)); } catch {}
        return p;
      });
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [pos]);

  const cpuColor = cpu > 75 ? "#e21227" : cpu > 55 ? "#f59e0b" : "#3b82f6";
  const memColor = mem > 80 ? "#f59e0b" : "#a78bfa";
  const tempColor = temp > 70 ? "#e21227" : temp > 60 ? "#f59e0b" : "#22c55e";

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 85,
        minWidth: "158px",
        maxWidth: "200px",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* ── Drag handle + header ── */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "5px 8px 5px 6px",
          border: "1px solid rgba(255,255,255,0.09)",
          borderBottom: collapsed ? "1px solid rgba(255,255,255,0.09)" : "none",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          background: "linear-gradient(135deg, rgba(10,10,18,0.97), rgba(14,14,24,0.98))",
          backdropFilter: "blur(20px)",
          cursor: "grab",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(226,18,39,0.06)",
          transition: "box-shadow 0.2s ease",
        }}
      >
        {/* Grip icon */}
        <GripHorizontal
          style={{ width: "10px", height: "10px", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}
        />

        {/* Live dot */}
        <span style={{
          width: "5px", height: "5px", borderRadius: "50%",
          background: "#22c55e", boxShadow: "0 0 6px #22c55e", flexShrink: 0,
          animation: "neonFlicker 3s ease-in-out infinite",
        }} />

        <span style={{
          fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700,
          color: "rgba(255,255,255,0.45)", letterSpacing: "1.5px", flex: 1,
        }}>
          SYS MONITOR
        </span>

        {/* Collapse toggle */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.2)", padding: "0", lineHeight: 1,
          }}
        >
          {collapsed
            ? <ChevronDown style={{ width: "10px", height: "10px" }} />
            : <ChevronUp style={{ width: "10px", height: "10px" }} />}
        </button>
      </div>

      {/* ── Expanded panel ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              padding: "8px 9px 9px",
              border: "1px solid rgba(255,255,255,0.09)",
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
              background: "linear-gradient(180deg, rgba(10,10,18,0.97) 0%, rgba(12,12,20,0.98) 100%)",
              backdropFilter: "blur(20px)",
              display: "flex", flexDirection: "column", gap: "5px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(226,18,39,0.06)",
            }}>

              {/* Red scan line */}
              <div style={{
                height: "1px", marginBottom: "1px",
                background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.4) 50%, transparent)",
              }} />

              {/* CPU row with sparkline */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Cpu style={{ width: "9px", height: "9px", color: cpuColor, flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>CPU</span>
                <SparkLine values={cpuHist} color={cpuColor} />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: cpuColor, width: "30px", textAlign: "right", flexShrink: 0 }}>{cpuSmooth.toFixed(0)}%</span>
              </div>

              {/* MEM */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <MemoryStick style={{ width: "9px", height: "9px", color: memColor, flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>MEM</span>
                <MiniBar value={memSmooth} color={memColor} />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: memColor, width: "30px", textAlign: "right", flexShrink: 0 }}>{memSmooth.toFixed(0)}%</span>
              </div>

              {/* NET with sparkline */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Wifi style={{ width: "9px", height: "9px", color: "#22c55e", flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>NET</span>
                <SparkLine values={netHist} color="#22c55e" />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e", width: "30px", textAlign: "right", flexShrink: 0 }}>{netSmooth.toFixed(0)}%</span>
              </div>

              {/* TEMP */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Thermometer style={{ width: "9px", height: "9px", color: tempColor, flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>TMP</span>
                <MiniBar value={(tempSmooth - 40) / 45 * 100} color={tempColor} />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: tempColor, width: "30px", textAlign: "right", flexShrink: 0 }}>{tempSmooth.toFixed(0)}°C</span>
              </div>

              {/* IDS Shield */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Shield style={{ width: "9px", height: "9px", color: "#00e5ff", flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>IDS</span>
                <MiniBar value={shieldSmooth} color="#00e5ff" />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "#00e5ff", width: "30px", textAlign: "right", flexShrink: 0 }}>{shieldSmooth.toFixed(1)}%</span>
              </div>

              {/* Latency */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Zap style={{ width: "9px", height: "9px", color: "#f59e0b", flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>LAT</span>
                <MiniBar value={latSmooth / 80 * 100} color="#f59e0b" />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "#f59e0b", width: "30px", textAlign: "right", flexShrink: 0 }}>{latSmooth.toFixed(0)}ms</span>
              </div>

              {/* Activity pulse line */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1px" }}>
                <Activity style={{ width: "9px", height: "9px", color: "rgba(226,18,39,0.4)", flexShrink: 0 }} />
                <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.2) 50%, transparent)" }} />
              </div>

              {/* Footer row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1px" }}>
                <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.1)", letterSpacing: "0.5px" }}>KGT v4.1</span>
                <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(226,18,39,0.35)", letterSpacing: "0.3px" }}>{clock}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
