import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Network, Activity, Package, BarChart3, X, Monitor,
  Layers, Radar, Wifi, Cpu, Shield, Maximize2, Minimize2,
  ChevronLeft, LayoutGrid, Thermometer, Clock,
} from "lucide-react";
import { CyberGlobeWidget }       from "./CyberGlobeWidget";
import { InteractiveGlobeWidget } from "./InteractiveGlobeWidget";
import { NetworkTopologyWidget }  from "./NetworkTopologyWidget";
import { NetworkTrafficPanel }    from "./NetworkTrafficPanel";
import { NetworkPacketInspector } from "./NetworkPacketInspector";
import { ModelBenchmarkPanel }    from "./ModelBenchmarkPanel";
import { SysMonitorWidget }       from "./SysMonitorWidget";
import { IdleWidget }             from "./IdleWidget";

/* ══════════════════════════════════════════════════════════════════════
   CYBER WIDGETS DOCK v2
   ▸ Draggable 3D orb button (persisted position)
   ▸ 8-panel holographic HUD in 4×2 grid
   ▸ Single-panel focus / expand mode
   ▸ Ctrl+Shift+H toggle · ESC close
══════════════════════════════════════════════════════════════════════ */

const DOCK_POS_KEY = "cyber-hud-dock-pos-v2";

const PANELS = [
  { id: "globe-threat", label: "GLOBAL THREAT MAP", icon: Globe,        color: "#e21227", desc: "Live attack origins"   },
  { id: "globe-map",    label: "GLOBAL MAP",         icon: Radar,        color: "#3b82f6", desc: "Interactive 3D globe"  },
  { id: "topology",     label: "NET TOPOLOGY",        icon: Network,      color: "#a855f7", desc: "3D network graph"      },
  { id: "traffic",      label: "TRAFFIC ANALYZER",   icon: Activity,     color: "#22c55e", desc: "Real-time API calls"   },
  { id: "packets",      label: "PACKET INSPECTOR",   icon: Package,      color: "#f59e0b", desc: "Wireshark-style HUD"   },
  { id: "benchmark",    label: "MODEL BENCHMARK",    icon: BarChart3,    color: "#06b6d4", desc: "LLM leaderboard"       },
  { id: "sysmon",       label: "SYS MONITOR",         icon: Thermometer,  color: "#10b981", desc: "System resources"      },
  { id: "idle",         label: "IDLE / ACTIVITY",     icon: Clock,        color: "#f472b6", desc: "Session tracker"       },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
function getInitialPos(): { x: number; y: number } {
  try {
    const s = localStorage.getItem(DOCK_POS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    x: typeof window !== "undefined" ? window.innerWidth  - 84 : 800,
    y: typeof window !== "undefined" ? window.innerHeight - 84 : 600,
  };
}

/* ── Neon pulse rings ──────────────────────────────────────────────── */
function PulseRing({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <motion.div
      style={{ position: "absolute", inset: "-8px", borderRadius: "50%", border: `1.5px solid ${color}`, pointerEvents: "none" }}
      animate={{ opacity: [0.7, 0, 0.7], scale: [1, 1.3, 1] }}
      transition={{ duration: 2.8, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}
function OrbitRing({ radius = 14, speed = 8, color = "rgba(0,200,255,0.25)" }: { radius?: number; speed?: number; color?: string }) {
  return (
    <motion.div
      style={{ position: "absolute", inset: -radius, borderRadius: "50%", border: `1px dashed ${color}`, pointerEvents: "none" }}
      animate={{ rotate: 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ── Corner brackets ───────────────────────────────────────────────── */
function Brackets({ color, size = 16, thickness = 1.5 }: { color: string; size?: number; thickness?: number }) {
  const s = (pos: React.CSSProperties): React.CSSProperties => ({
    position: "absolute", width: size, height: size,
    border: `${thickness}px solid ${color}50`,
    ...pos, pointerEvents: "none",
  });
  return (
    <>
      <div style={s({ top: 0, left: 0,  borderRight: "none", borderBottom: "none" })} />
      <div style={s({ top: 0, right: 0, borderLeft:  "none", borderBottom: "none" })} />
      <div style={s({ bottom: 0, left: 0,  borderRight: "none", borderTop: "none" })} />
      <div style={s({ bottom: 0, right: 0, borderLeft:  "none", borderTop: "none" })} />
    </>
  );
}

/* ── Holographic shimmer overlay ───────────────────────────────────── */
function HoloShimmer({ color }: { color: string }) {
  return (
    <motion.div
      style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, borderRadius: "inherit",
        background: `linear-gradient(105deg, transparent 40%, ${color}18 50%, transparent 60%)`,
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ── Draggable dock button ─────────────────────────────────────────── */
function DockButton({ onClick }: { onClick: () => void }) {
  const [pos,     setPos]     = useState(getInitialPos);
  const [hovered, setHovered] = useState(false);
  const [tick,    setTick]    = useState(0);
  const [dragging,setDragging]= useState(false);
  const posRef   = useRef(pos);
  const dragRef  = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0, moved: false });

  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = e.clientX; d.sy = e.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - d.sx; const dy = ev.clientY - d.sy;
      if (!d.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) { d.moved = true; setDragging(true); }
      if (d.moved) {
        const nx = Math.max(4, Math.min(window.innerWidth  - 64, d.spx + dx));
        const ny = Math.max(4, Math.min(window.innerHeight - 64, d.spy + dy));
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
    }
    function onUp() {
      d.active = false; setDragging(false);
      localStorage.setItem(DOCK_POS_KEY, JSON.stringify(posRef.current));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // Touch drag support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = touch.clientX; d.sy = touch.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;

    function onMove(ev: TouchEvent) {
      const t = ev.touches[0];
      const dx = t.clientX - d.sx; const dy = t.clientY - d.sy;
      if (!d.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) { d.moved = true; setDragging(true); }
      if (d.moved) {
        const nx = Math.max(4, Math.min(window.innerWidth  - 64, d.spx + dx));
        const ny = Math.max(4, Math.min(window.innerHeight - 64, d.spy + dy));
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
    }
    function onEnd() {
      d.active = false; setDragging(false);
      localStorage.setItem(DOCK_POS_KEY, JSON.stringify(posRef.current));
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, []);

  const handleClick = useCallback(() => {
    if (!dragRef.current.moved) onClick();
  }, [onClick]);

  const ac = PANELS[tick % PANELS.length].color;

  return (
    <div
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 95, cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, boxShadow: hovered && !dragging
          ? `0 0 0 1px rgba(255,255,255,0.08), 0 12px 50px rgba(0,0,0,0.9), 0 0 60px ${ac}50`
          : `0 0 0 1px rgba(255,255,255,0.05), 0 8px 40px rgba(0,0,0,0.8), 0 0 30px ${ac}22`,
        }}
        transition={{ delay: 1.2, type: "spring", damping: 18, stiffness: 200 }}
        whileTap={!dragging ? { scale: 0.93 } : {}}
        style={{
          width: "62px", height: "62px", borderRadius: "50%",
          border: `2px solid ${ac}55`,
          background: "radial-gradient(circle at 33% 33%, rgba(255,255,255,0.09) 0%, rgba(5,5,12,0.98) 65%)",
          backdropFilter: "blur(22px)",
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
          position: "relative", overflow: "visible",
          transition: "border-color 0.7s, box-shadow 0.5s",
        }}
      >
        {/* Rings */}
        <PulseRing color={ac} />
        <PulseRing color={ac} delay={1.4} />
        <OrbitRing radius={14} speed={9} color={`${ac}35`} />
        <OrbitRing radius={20} speed={18} color="rgba(255,255,255,0.08)" />

        {/* Inner glass */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", pointerEvents: "none",
        }}>
          {/* Top sheen */}
          <div style={{
            position: "absolute", top: 0, left: "12%", right: "12%", height: "42%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)",
            borderRadius: "50% 50% 0 0",
          }} />
          {/* Scan line */}
          <motion.div
            style={{ position: "absolute", left: 0, right: 0, height: "1.5px", background: `linear-gradient(90deg, transparent, ${ac}aa, transparent)` }}
            animate={{ top: ["12%", "88%", "12%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Icon cluster */}
        <motion.div
          animate={{ rotateY: hovered && !dragging ? 180 : 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", position: "relative", zIndex: 2 }}
        >
          <Monitor style={{ width: "19px", height: "19px", color: ac, filter: `drop-shadow(0 0 8px ${ac})`, transition: "color 0.6s" }} />
          <span style={{ fontSize: "6px", fontFamily: "monospace", fontWeight: 900, color: ac, letterSpacing: "1.5px", textShadow: `0 0 10px ${ac}`, transition: "color 0.6s" }}>HUD</span>
        </motion.div>

        {/* Panel count badge */}
        <div style={{
          position: "absolute", top: "-4px", right: "-4px",
          width: "16px", height: "16px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${ac}, ${ac}88)`,
          border: "1.5px solid rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "7px", fontFamily: "monospace", fontWeight: 900, color: "#000",
          boxShadow: `0 0 8px ${ac}`,
          zIndex: 3,
        }}>8</div>
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && !dragging && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute", right: "76px", top: "50%", transform: "translateY(-50%)",
              background: "rgba(5,5,12,0.97)", border: `1px solid ${ac}40`,
              borderRadius: "10px", padding: "7px 14px", whiteSpace: "nowrap",
              backdropFilter: "blur(20px)", boxShadow: `0 4px 24px rgba(0,0,0,0.7), 0 0 16px ${ac}18`,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#fff", fontWeight: 800, letterSpacing: "1.5px" }}>CYBER HUD</div>
            <div style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginTop: "1px" }}>8 INTELLIGENCE PANELS</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Widget card wrapper with 3D tilt + expand button ─────────────── */
function WidgetCard({
  id, label, icon: Icon, color, desc, onExpand, children,
}: {
  id: string; label: string; icon: any; color: string; desc: string;
  onExpand: () => void; children: React.ReactNode;
}) {
  const [tilt, setTilt]   = useState({ x: 0, y: 0 });
  const [hov,  setHov]    = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 14,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -14,
    });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHov(false); }}
      onMouseEnter={() => setHov(true)}
      animate={{
        rotateX: tilt.y, rotateY: tilt.x,
        boxShadow: hov
          ? `0 6px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06), 0 0 30px ${color}28`
          : `0 3px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03), 0 0 12px ${color}0a`,
      }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      style={{
        perspective: "900px",
        position: "relative", borderRadius: "12px", overflow: "hidden",
        border: `1px solid ${hov ? color + "35" : color + "18"}`,
        background: `linear-gradient(145deg, rgba(6,6,14,0.99) 0%, rgba(10,10,22,0.97) 100%)`,
        display: "flex", flexDirection: "column",
        transformStyle: "preserve-3d",
        transition: "border-color 0.3s",
        minHeight: 0,
      }}
    >
      {/* Holographic shimmer */}
      {hov && <HoloShimmer color={color} />}

      {/* Top accent */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0.6, scaleX: hov ? 1 : 0.7 }}
        style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${color}cc, transparent)`, flexShrink: 0, transformOrigin: "center" }}
      />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "7px",
        padding: "7px 10px 7px 10px",
        borderBottom: `1px solid ${color}12`,
        background: `${color}08`,
        flexShrink: 0, position: "relative", zIndex: 2,
      }}>
        <motion.div animate={{ filter: hov ? `drop-shadow(0 0 8px ${color})` : `drop-shadow(0 0 3px ${color}88)` }}>
          <Icon style={{ width: "12px", height: "12px", color, flexShrink: 0 }} />
        </motion.div>
        <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 900, color, letterSpacing: "1.5px", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "0.3px", marginRight: "4px" }}>{desc}</span>

        {/* Live dot */}
        <motion.div
          animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }}
        />

        {/* Expand button */}
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          title="Expand"
          style={{
            width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0,
            background: `${color}14`, border: `1px solid ${color}28`,
            color: "rgba(255,255,255,0.4)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}30`; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}14`; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; }}
        >
          <Maximize2 style={{ width: "9px", height: "9px" }} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
        {children}
      </div>

      {/* Corner brackets */}
      <Brackets color={color} size={14} thickness={1.5} />
    </motion.div>
  );
}

/* ── Widget renderer ───────────────────────────────────────────────── */
function RenderWidget({ id, full = false }: { id: string; full?: boolean }) {
  const e = !full;
  switch (id) {
    case "globe-threat": return <CyberGlobeWidget       embedded={e} />;
    case "globe-map":    return <InteractiveGlobeWidget embedded={e} />;
    case "topology":     return <NetworkTopologyWidget  embedded={e} />;
    case "traffic":      return <NetworkTrafficPanel    embedded={e} />;
    case "packets":      return <NetworkPacketInspector embedded={e} />;
    case "benchmark":    return <ModelBenchmarkPanel    embedded={e} />;
    case "sysmon":       return <SysMonitorWidget       embedded={e} />;
    case "idle":         return <IdleWidget             embedded={e} />;
    default: return null;
  }
}

/* ── Animated 3D background canvas for overlay ─────────────────────── */
function HUDBackground() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const tickRef  = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let W = cv.offsetWidth; let H = cv.offsetHeight;
    cv.width = W; cv.height = H;
    const resize = () => { W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W; cv.height = H; };
    window.addEventListener("resize", resize);

    // Particle field
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.4 + 0.1,
      color: ["#00e5ff", "#e21227", "#a855f7", "#22c55e", "#f59e0b"][Math.floor(Math.random() * 5)],
    }));

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      ctx.clearRect(0, 0, W, H);

      // Deep gradient bg
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      bg.addColorStop(0, "rgba(4,4,14,1)"); bg.addColorStop(0.6, "rgba(2,2,8,1)"); bg.addColorStop(1, "rgba(0,0,4,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Corner glows
      const cg1 = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.5);
      cg1.addColorStop(0, "rgba(226,18,39,0.05)"); cg1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg1; ctx.fillRect(0, 0, W, H);
      const cg2 = ctx.createRadialGradient(W, H, 0, W, H, W * 0.5);
      cg2.addColorStop(0, "rgba(59,130,246,0.04)"); cg2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg2; ctx.fillRect(0, 0, W, H);

      // Perspective grid
      const vp = { x: W * 0.5, y: H * 0.5 };
      const gridLines = 14;
      const scroll = (t * 0.4) % (H / gridLines);
      ctx.strokeStyle = "rgba(0,229,255,0.025)"; ctx.lineWidth = 0.5;
      for (let i = -gridLines; i <= gridLines * 2; i++) {
        const gy = scroll + (i / gridLines) * H;
        const persp = Math.abs(gy - vp.y) / H + 0.5;
        ctx.globalAlpha = Math.max(0, 0.5 - persp * 0.4);
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let i = -gridLines; i <= gridLines; i++) {
        const gx = vp.x + (i / gridLines) * W * 0.6;
        ctx.beginPath();
        ctx.moveTo(gx, 0); ctx.lineTo(vp.x, vp.y); ctx.lineTo(gx, H);
        ctx.globalAlpha = 0.015; ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.a * (0.5 + Math.sin(t * 0.02 + p.x) * 0.3);
        ctx.fill(); ctx.globalAlpha = 1;
      });

      // Horizontal scan line
      const scanY = ((t * 0.8) % H);
      const sg = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
      sg.addColorStop(0, "rgba(0,229,255,0)"); sg.addColorStop(0.5, "rgba(0,229,255,0.04)"); sg.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 6, W, 12);
    }
    frame();
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={cvRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />
  );
}

/* ── Main overlay ──────────────────────────────────────────────────── */
function CyberHUDOverlay({ onClose }: { onClose: () => void }) {
  const [loaded,       setLoaded]       = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<string | null>(null);
  const [focusAnim,    setFocusAnim]    = useState(false);

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(t); }, []);

  const handleExpand = useCallback((id: string) => {
    setFocusAnim(false);
    setFocusedPanel(id);
    setTimeout(() => setFocusAnim(true), 30);
  }, []);

  const handleBack = useCallback(() => {
    setFocusAnim(false);
    setTimeout(() => setFocusedPanel(null), 160);
  }, []);

  const focusedMeta = focusedPanel ? PANELS.find(p => p.id === focusedPanel)! : null;

  /* Shared backdrop/wrapper */
  const wrapper = (children: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <HUDBackground />

      {/* CRT scanlines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.011) 2px, rgba(255,255,255,0.011) 4px)",
      }} />

      {children}
    </motion.div>
  );

  /* ── FOCUSED single-panel view ── */
  if (focusedPanel && focusedMeta) {
    const { color, icon: Icon, label, desc } = focusedMeta;
    return wrapper(
      <>
        {/* Header */}
        <div style={{
          position: "relative", zIndex: 10,
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px 20px",
          borderBottom: `1px solid ${color}20`,
          background: `rgba(4,4,14,0.85)`,
          backdropFilter: "blur(16px)",
          flexShrink: 0,
        }}>
          <motion.button
            onClick={handleBack}
            whileHover={{ x: -3 }}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", borderRadius: "8px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "10px",
              fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px",
            }}
          >
            <ChevronLeft style={{ width: "12px", height: "12px" }} />
            BACK TO HUD
          </motion.button>

          <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.08)" }} />

          {/* Panel identity */}
          <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: `${color}18`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${color}25` }}>
            <Icon style={{ width: "16px", height: "16px", color, filter: `drop-shadow(0 0 6px ${color})` }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "2.5px" }}>{label}</span>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            </div>
            <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>{desc} · FULL SCREEN MODE</div>
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={handleBack}
            style={{
              padding: "4px 10px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "9px", fontFamily: "monospace",
            }}
          >
            <LayoutGrid style={{ width: "10px", height: "10px" }} />
            ALL PANELS
          </button>

          <button
            onClick={onClose}
            style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.22)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.08)"; }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>

        {/* Full widget */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: focusAnim ? 1 : 0, scale: focusAnim ? 1 : 0.97 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{
            position: "relative", zIndex: 5, flex: 1,
            margin: "12px", borderRadius: "14px", overflow: "hidden",
            border: `1px solid ${color}28`,
            boxShadow: `0 0 60px ${color}18, 0 0 0 1px rgba(255,255,255,0.04)`,
          }}
        >
          {/* Top accent */}
          <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${color}, transparent)`, flexShrink: 0 }} />
          <div style={{ flex: 1, height: "calc(100% - 2px)", overflow: "hidden" }}>
            <RenderWidget id={focusedPanel} full={false} />
          </div>
          <Brackets color={color} size={20} thickness={2} />
        </motion.div>
      </>
    );
  }

  /* ── 8-panel grid view ── */
  return wrapper(
    <>
      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: "12px",
        padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(4,4,14,0.85)",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <motion.div
          animate={{ boxShadow: ["0 0 20px rgba(226,18,39,0.2)", "0 0 40px rgba(226,18,39,0.4)", "0 0 20px rgba(226,18,39,0.2)"] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(226,18,39,0.25), rgba(59,130,246,0.18))",
            border: "1px solid rgba(226,18,39,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Layers style={{ width: "17px", height: "17px", color: "#e21227", filter: "drop-shadow(0 0 7px #e21227)" }} />
        </motion.div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "3px" }}>CYBER HUD</span>
            <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e", letterSpacing: "1px", padding: "2px 7px", borderRadius: "4px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
              LIVE
            </span>
          </div>
          <div style={{ fontSize: "8.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)", letterSpacing: "1px", marginTop: "1px" }}>
            8 INTELLIGENCE PANELS · REAL-TIME FEED
          </div>
        </div>

        {/* Panel indicators */}
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          {PANELS.map((p, i) => (
            <motion.button
              key={p.id}
              title={p.label}
              onClick={() => handleExpand(p.id)}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.25 }}
              whileHover={{ scale: 1.8 }}
              style={{ width: "7px", height: "7px", borderRadius: "50%", background: p.color, boxShadow: `0 0 7px ${p.color}`, cursor: "pointer", border: "none" }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(226,18,39,0.07)", border: "1px solid rgba(226,18,39,0.2)", color: "rgba(255,255,255,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.22)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.07)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)"; }}
        >
          <X style={{ width: "15px", height: "15px" }} />
        </button>
      </div>

      {/* ── 4×2 panel grid ── */}
      <div style={{
        position: "relative", zIndex: 5,
        flex: 1, display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(2, 1fr)",
        gap: "8px", padding: "10px",
        overflow: "hidden",
      }}>
        {loaded && PANELS.map((panel, i) => (
          <motion.div
            key={panel.id}
            initial={{ opacity: 0, y: 18, scale: 0.94, rotateX: -8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ delay: i * 0.055, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <WidgetCard
              id={panel.id}
              label={panel.label}
              icon={panel.icon}
              color={panel.color}
              desc={panel.desc}
              onExpand={() => handleExpand(panel.id)}
            >
              <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
                <RenderWidget id={panel.id} />
              </div>
            </WidgetCard>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: "16px",
        padding: "7px 20px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(4,4,14,0.75)",
        backdropFilter: "blur(12px)",
        flexShrink: 0,
      }}>
        {[
          { icon: Wifi,    label: "FEEDS",   val: "8/8",    color: "#22c55e" },
          { icon: Cpu,     label: "LATENCY", val: "12ms",   color: "#3b82f6" },
          { icon: Shield,  label: "THREATS", val: "ACTIVE", color: "#e21227" },
          { icon: Monitor, label: "PANELS",  val: "8",      color: "#a855f7" },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Icon style={{ width: "10px", height: "10px", color }} />
            <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)", letterSpacing: "0.8px" }}>{label}</span>
            <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color }}>{val}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.12)", letterSpacing: "1px" }}>
          ESC · CTRL+SHIFT+H TO TOGGLE · CLICK ⊞ TO EXPAND
        </span>
      </div>
    </>
  );
}

/* ── Public export ─────────────────────────────────────────────────── */
export function CyberWidgetsDock() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault(); setOpen(v => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <DockButton onClick={() => setOpen(true)} />
      <AnimatePresence>
        {open && <CyberHUDOverlay onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
