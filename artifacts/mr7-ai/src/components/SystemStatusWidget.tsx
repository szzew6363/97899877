import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, MemoryStick, Wifi, Shield, ChevronUp, ChevronDown, GripHorizontal, Thermometer, Activity, Zap } from "lucide-react";

function useAnimatedValue(target: number, speed = 0.06) {
  const [value, setValue] = useState(target);
  const valRef = useRef(value);
  useEffect(() => {
    valRef.current = value;
    let frame: number;
    let lastT = 0;
    function tick(timestamp: number) {
      const delta = lastT ? Math.min((timestamp - lastT) / 16.67, 4) : 1;
      lastT = timestamp;
      const diff = target - valRef.current;
      if (Math.abs(diff) < 0.1) { setValue(target); return; }
      valRef.current += diff * speed * delta;
      setValue(valRef.current);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

function CanvasSparkLine({ values, color }: { values: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 64; const H = 20;
    ctx.clearRect(0, 0, W, H);
    if (values.length < 2) return;
    const max = Math.max(...values, 1);
    const min = Math.min(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: H - ((v - min) / range) * (H - 2) - 1,
    }));
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + "4d");
    grad.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H);
    ctx.lineTo(pts[0].x, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color + "33";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [values, color]);
  return <canvas ref={canvasRef} width={64} height={20} style={{ flexShrink: 0 }} />;
}

function CpuRingGauge({ value, color }: { value: number; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valRef = useRef(value);
  valRef.current = value;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame: number;
    let lastT = 0;
    function draw(timestamp: number) {
      const delta = lastT ? Math.min((timestamp - lastT) / 16.67, 4) : 1;
      lastT = timestamp;
      void delta;
      const W = 48; const H = 48; const cx = W / 2; const cy = H / 2; const R = 20;
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,10,18,0.9)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 4;
      ctx.stroke();
      const v = valRef.current;
      const arcColor = v > 75 ? "#e21227" : v > 55 ? "#f59e0b" : "#3b82f6";
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (v / 100) * Math.PI * 2;
      const arcGrad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
      arcGrad.addColorStop(0, arcColor + "aa");
      arcGrad.addColorStop(1, arcColor);
      ctx.beginPath();
      ctx.arc(cx, cy, R, startAngle, endAngle);
      ctx.strokeStyle = arcGrad;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.shadowBlur = 10;
      ctx.shadowColor = arcColor;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(v.toFixed(0) + "%", cx, cy);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  void color;
  return <canvas ref={canvasRef} width={48} height={48} style={{ flexShrink: 0 }} />;
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
  return { x: window.innerWidth - 170, y: 70 };
}

function clampPos(x: number, y: number, w = 160, h = 240) {
  return {
    x: Math.max(0, Math.min(window.innerWidth - w, x)),
    y: Math.max(0, Math.min(window.innerHeight - 48, y)),
  };
}

export function SystemStatusWidget() {
  const isMobile = window.innerWidth < 768;
  const [collapsed, setCollapsed] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos);
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0, px: 0, py: 0 });

  const [fps, setFps] = useState(0);
  const fpsCountRef = useRef({ count: 0, last: performance.now() });
  useEffect(() => {
    let frame: number;
    function countFPS(ts: number) {
      fpsCountRef.current.count++;
      if (ts - fpsCountRef.current.last >= 500) {
        setFps(Math.round(fpsCountRef.current.count * 2));
        fpsCountRef.current = { count: 0, last: ts };
      }
      frame = requestAnimationFrame(countFPS);
    }
    frame = requestAnimationFrame(countFPS);
    return () => cancelAnimationFrame(frame);
  }, []);

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
      setPos(clampPos(nx, ny));
    }
    function onUp() {
      dragRef.current.dragging = false;
      setPos(p => { try { localStorage.setItem("sys-monitor-pos", JSON.stringify(p)); } catch {} return p; });
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
      setPos(clampPos(dragRef.current.px + (touch.clientX - dragRef.current.ox), dragRef.current.py + (touch.clientY - dragRef.current.oy)));
    }
    function onEnd() {
      dragRef.current.dragging = false;
      setPos(p => { try { localStorage.setItem("sys-monitor-pos", JSON.stringify(p)); } catch {} return p; });
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [pos]);

  const cpuColor = cpu > 75 ? "#e21227" : cpu > 55 ? "#f59e0b" : "#3b82f6";
  const memColor = mem > 80 ? "#f59e0b" : "#a78bfa";
  const tempColor = temp > 70 ? "#e21227" : temp > 60 ? "#f59e0b" : "#22c55e";
  const threat = (cpu > 70 || mem > 80) ? "HIGH" : (cpu > 50 || mem > 65) ? "MED" : "LOW";
  const threatColor = threat === "HIGH" ? "#e21227" : threat === "MED" ? "#f59e0b" : "#22c55e";

  if (isMobile && collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        style={{
          position: "fixed",
          right: 8,
          bottom: 60,
          zIndex: 85,
          width: 36,
          height: 18,
          borderRadius: 9,
          background: "rgba(10,10,18,0.95)",
          border: "1px solid rgba(226,18,39,0.4)",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 6px",
          cursor: "pointer",
          boxShadow: `0 0 8px ${threatColor}40`,
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: threatColor, boxShadow: `0 0 4px ${threatColor}`, flexShrink: 0 }} />
        <span style={{ fontSize: 6, fontFamily: "monospace", color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>SYS</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: isMobile ? "auto" : pos.x,
        top: isMobile ? "auto" : pos.y,
        right: isMobile ? 8 : "auto",
        bottom: isMobile ? 60 : "auto",
        zIndex: 85,
        minWidth: "162px",
        maxWidth: "210px",
        userSelect: "none",
        touchAction: "none",
        willChange: "transform",
        transform: "translateZ(0)",
      }}
    >
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "5px 8px 5px 6px",
          animation: "borderPulse 4s ease-in-out infinite",
          border: "1px solid rgba(226,18,39,0.6)",
          borderBottom: collapsed ? undefined : "none",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          background: "linear-gradient(135deg, rgba(10,10,18,0.97), rgba(14,14,24,0.98))",
          backdropFilter: "blur(20px)",
          cursor: "grab",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(226,18,39,0.06)",
        }}
      >
        <GripHorizontal style={{ width: "10px", height: "10px", color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", flexShrink: 0, animation: "neonFlicker 3s ease-in-out infinite" }} />
        <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "#00e5ff", letterSpacing: "1.5px", flex: 1 }}>◈ SYS·HUD</span>
        <span style={{ fontSize: "7px", fontFamily: "monospace", color: fps >= 200 ? "#22c55e" : fps >= 100 ? "#f59e0b" : "#e21227", letterSpacing: "0.3px" }}>{fps}fps</span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setCollapsed(c => !c)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: "0", lineHeight: 1 }}
        >
          {collapsed ? <ChevronDown style={{ width: "10px", height: "10px" }} /> : <ChevronUp style={{ width: "10px", height: "10px" }} />}
        </button>
      </div>

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
              border: "1px solid rgba(226,18,39,0.3)",
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
              background: "linear-gradient(180deg, rgba(10,10,18,0.97) 0%, rgba(12,12,20,0.98) 100%)",
              backgroundImage: "linear-gradient(rgba(226,18,39,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(226,18,39,0.03) 1px, transparent 1px)",
              backgroundSize: "8px 8px",
              backdropFilter: "blur(20px)",
              display: "flex", flexDirection: "column", gap: "5px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(226,18,39,0.06)",
            }}>
              <div style={{ height: "1px", marginBottom: "1px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.4) 50%, transparent)" }} />

              {/* 3D Ring Gauge + CPU sparkline */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <CpuRingGauge value={cpuSmooth} color={cpuColor} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Cpu style={{ width: "9px", height: "9px", color: cpuColor, flexShrink: 0 }} />
                    <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>CPU</span>
                    <CanvasSparkLine values={cpuHist} color={cpuColor} />
                  </div>
                </div>
              </div>

              {/* MEM */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <MemoryStick style={{ width: "9px", height: "9px", color: memColor, flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>MEM</span>
                <MiniBar value={memSmooth} color={memColor} />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: memColor, width: "30px", textAlign: "right", flexShrink: 0 }}>{memSmooth.toFixed(0)}%</span>
              </div>

              {/* NET */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Wifi style={{ width: "9px", height: "9px", color: "#22c55e", flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>NET</span>
                <CanvasSparkLine values={netHist} color="#22c55e" />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e", width: "30px", textAlign: "right", flexShrink: 0 }}>{netSmooth.toFixed(0)}%</span>
              </div>

              {/* TEMP */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Thermometer style={{ width: "9px", height: "9px", color: tempColor, flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>TMP</span>
                <MiniBar value={(tempSmooth - 40) / 45 * 100} color={tempColor} />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: tempColor, width: "30px", textAlign: "right", flexShrink: 0 }}>{tempSmooth.toFixed(0)}°C</span>
              </div>

              {/* IDS */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Shield style={{ width: "9px", height: "9px", color: "#00e5ff", flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>IDS</span>
                <MiniBar value={shieldSmooth} color="#00e5ff" />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "#00e5ff", width: "30px", textAlign: "right", flexShrink: 0 }}>{shieldSmooth.toFixed(1)}%</span>
              </div>

              {/* LAT */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Zap style={{ width: "9px", height: "9px", color: "#f59e0b", flexShrink: 0 }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", width: "21px", flexShrink: 0 }}>LAT</span>
                <MiniBar value={latSmooth / 80 * 100} color="#f59e0b" />
                <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "#f59e0b", width: "30px", textAlign: "right", flexShrink: 0 }}>{latSmooth.toFixed(0)}ms</span>
              </div>

              {/* THREAT */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>THREAT</span>
                <span style={{
                  fontSize: "7px", fontFamily: "monospace", fontWeight: 700,
                  color: threatColor, letterSpacing: "1px",
                  padding: "1px 5px", borderRadius: "4px",
                  background: threatColor + "20",
                  border: "1px solid " + threatColor + "60",
                  boxShadow: "0 0 8px " + threatColor + "40",
                }}>{threat}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1px" }}>
                <Activity style={{ width: "9px", height: "9px", color: "rgba(226,18,39,0.4)", flexShrink: 0 }} />
                <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.2) 50%, transparent)" }} />
              </div>

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
