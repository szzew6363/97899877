import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Network, Activity, Package, BarChart3, X, Monitor,
  Layers, Radar, Wifi, Cpu, Shield, Maximize2,
  ChevronLeft, ChevronUp, ChevronDown, LayoutGrid, Thermometer, Clock, Zap,
  AlertTriangle, Keyboard, Radio, Square, FileJson, Download, Printer,
  Eye, ArrowUpDown, TerminalSquare,
} from "lucide-react";
import { CyberGlobeWidget }       from "./CyberGlobeWidget";
import { InteractiveGlobeWidget } from "./InteractiveGlobeWidget";
import { NetworkTopologyWidget }  from "./NetworkTopologyWidget";
import { NetworkTrafficPanel }    from "./NetworkTrafficPanel";
import { NetworkPacketInspector } from "./NetworkPacketInspector";
import { ModelBenchmarkPanel }    from "./ModelBenchmarkPanel";
import { SysMonitorWidget }       from "./SysMonitorWidget";
import { IdleWidget }             from "./IdleWidget";
import { NetworkActivityPage }    from "./NetworkActivityPage";
import { trafficBus }             from "@/lib/trafficBus";
import type { TrafficEvent }      from "@/lib/trafficBus";
import { sessionRecorder }        from "@/lib/sessionRecorder";
import type { SessionEvent }      from "@/lib/sessionRecorder";

/* ══════════════════════════════════════════════════════════════════════
   CYBER WIDGETS DOCK  v5  — ULTRA 3D FUTURISTIC
   ▸ 6-panel grid (Panel 7 & 8 removed from grid)
   ▸ SYS MONITOR + IDLE embedded as satellite mini-panels around orb
   ▸ Keyboard shortcut glow indicator on button press
   ▸ Threat spike alert flash animation
   ▸ Draggable anywhere · Ctrl+Shift+H toggle · ESC close
══════════════════════════════════════════════════════════════════════ */

const DOCK_POS_KEY = "cyber-hud-dock-pos-v5";

/* 6 core intelligence panels (Panel 7+8 removed from grid) */
const PANELS = [
  { id: "globe-threat", label: "GLOBAL THREAT MAP", icon: Globe,        color: "#e21227", desc: "Live attack origins"   },
  { id: "globe-map",    label: "GLOBAL MAP",         icon: Radar,        color: "#3b82f6", desc: "Interactive 3D globe"  },
  { id: "topology",     label: "NET TOPOLOGY",        icon: Network,      color: "#a855f7", desc: "3D network graph"      },
  { id: "traffic",      label: "TRAFFIC ANALYZER",   icon: Activity,     color: "#22c55e", desc: "Real-time API calls"   },
  { id: "packets",      label: "PACKET INSPECTOR",   icon: Package,      color: "#f59e0b", desc: "Wireshark-style HUD"   },
  { id: "benchmark",    label: "MODEL BENCHMARK",    icon: BarChart3,    color: "#06b6d4", desc: "LLM leaderboard"       },
];

/* ── Position persistence ───────────────────────────────────────── */
function getInitialPos(): { x: number; y: number } {
  try {
    const s = localStorage.getItem(DOCK_POS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    x: typeof window !== "undefined" ? window.innerWidth  - 96 : 900,
    y: typeof window !== "undefined" ? window.innerHeight - 96 : 600,
  };
}

/* ── Live stats hook — CPU · API calls · Threat count ───────────── */
function useLiveStats() {
  const cpuRef   = useRef(34);
  const memRef   = useRef(61);
  const tRef     = useRef(0);
  const prevThr  = useRef(3);
  const [stats, setStats] = useState({ cpu: 34, mem: 61, api: 0, thr: 3, thrSpike: false });
  useEffect(() => {
    const iv = setInterval(() => {
      tRef.current += 1;
      const noise = () => (Math.random() - 0.5) * 8;
      cpuRef.current = Math.max(8, Math.min(95,
        cpuRef.current + noise() + Math.sin(tRef.current * 0.07) * 10
      ));
      memRef.current = Math.max(35, Math.min(92,
        memRef.current + (Math.random() - 0.48) * 1.5
      ));
      const thr = Math.floor(2 + Math.sin(tRef.current * 0.05) * 2 + Math.random() * 2);
      const thrSpike = thr > prevThr.current + 2;
      prevThr.current = thr;
      setStats({ cpu: Math.round(cpuRef.current), mem: Math.round(memRef.current), api: trafficBus.history.length, thr, thrSpike });
    }, 900);
    return () => clearInterval(iv);
  }, []);
  return stats;
}

/* ── Corner brackets ─────────────────────────────────────────────── */
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

/* ── Holographic shimmer ─────────────────────────────────────────── */
function HoloShimmer({ color }: { color: string }) {
  return (
    <motion.div
      style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, borderRadius: "inherit",
        background: `linear-gradient(108deg, transparent 35%, ${color}18 50%, transparent 65%)`,
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   ORB CANVAS  — subtle radar background (icon stays visible)
══════════════════════════════════════════════════════════════════ */
function OrbCanvas({ cpu, thr }: { cpu: number; thr: number }) {
  const cvRef  = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tkRef  = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = 76; cv.width = S; cv.height = S;
    const CX = S / 2, CY = S / 2, R = S / 2 - 1;

    const radarData = Array.from({ length: 48 }, () => Math.random() * 0.55 + 0.28);
    const blips = Array.from({ length: 5 }, (_, i) => ({
      angle: (i / 5) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const t = (tkRef.current += 0.018);
      ctx.clearRect(0, 0, S, S);

      ctx.save();
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();

      const bg = ctx.createRadialGradient(CX - 6, CY - 8, 0, CX, CY, R);
      bg.addColorStop(0,   "rgba(14,14,30,1)");
      bg.addColorStop(0.5, "rgba(6,6,18,1)");
      bg.addColorStop(1,   "rgba(2,2,8,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);

      ctx.strokeStyle = "rgba(0,229,255,0.07)";
      ctx.lineWidth = 0.5;
      [0.28, 0.5, 0.72, 0.92].forEach(f => {
        ctx.beginPath(); ctx.arc(CX, CY, R * f, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.strokeStyle = "rgba(0,229,255,0.04)";
      ctx.lineWidth = 0.4;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(CX, CY);
        ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); ctx.stroke();
      }

      const sweepA = t * 0.6;
      ctx.save(); ctx.translate(CX, CY); ctx.rotate(sweepA);
      const swg = ctx.createLinearGradient(0, 0, R, 0);
      swg.addColorStop(0, "rgba(0,229,255,0.28)");
      swg.addColorStop(0.5, "rgba(0,229,255,0.06)");
      swg.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = swg;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -0.3, 0.3); ctx.closePath(); ctx.fill();
      ctx.restore();

      const cpuFrac = cpu / 100;
      ctx.beginPath();
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2 - Math.PI / 2;
        const pulse = radarData[i] + Math.sin(t * 2 + i * 0.4) * 0.08 + cpuFrac * 0.12;
        const rr = R * 0.62 * pulse + R * 0.06;
        const x = CX + Math.cos(a) * rr;
        const y = CY + Math.sin(a) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      const waveAlpha = 0.25 + cpuFrac * 0.25;
      ctx.strokeStyle = `rgba(0,229,255,${waveAlpha})`; ctx.lineWidth = 1.0; ctx.stroke();

      if (thr > 0) {
        const thrAlpha = Math.min(0.18, thr * 0.04) + Math.sin(t * 2) * 0.03;
        const tg = ctx.createRadialGradient(CX + R * 0.5, CY - R * 0.5, 0, CX, CY, R);
        tg.addColorStop(0, `rgba(226,18,39,${thrAlpha})`);
        tg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = tg; ctx.fillRect(0, 0, S, S);
      }

      const scanY = ((t * 18) % S);
      const sl = ctx.createLinearGradient(0, scanY - 5, 0, scanY + 5);
      sl.addColorStop(0, "rgba(0,229,255,0)");
      sl.addColorStop(0.5, "rgba(0,229,255,0.07)");
      sl.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sl; ctx.fillRect(0, scanY - 5, S, 10);

      blips.forEach(b => {
        const alpha = 0.4 + Math.sin(t * 3 + b.phase) * 0.4;
        const bx = CX + Math.cos(b.angle) * R * 0.78;
        const by = CY + Math.sin(b.angle) * R * 0.78;
        ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${alpha * 0.25})`; ctx.lineWidth = 0.8; ctx.stroke();
      });

      const sheen = ctx.createLinearGradient(0, 0, 0, CY * 0.7);
      sheen.addColorStop(0, "rgba(255,255,255,0.08)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.ellipse(CX, CY * 0.3, R * 0.55, R * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [cpu, thr]);

  return (
    <canvas
      ref={cvRef} width={76} height={76}
      style={{ width: "76px", height: "76px", borderRadius: "50%", display: "block", pointerEvents: "none" }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   DATA ARC  — rotating live-data ring drawn on separate canvas
══════════════════════════════════════════════════════════════════ */
function DataArcCanvas({ cpu, api, thr }: { cpu: number; api: number; thr: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tkRef  = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = 116; cv.width = S; cv.height = S;
    const CX = S / 2, CY = S / 2;
    const R = S / 2 - 2;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const t = (tkRef.current += 0.012);
      ctx.clearRect(0, 0, S, S);

      const cpuFrac = cpu / 100;
      const cpuStart = Math.PI * 0.62;
      const cpuEnd   = cpuStart + Math.PI * 0.7 * cpuFrac;
      ctx.beginPath();
      ctx.arc(CX, CY, R - 2, Math.PI * 0.62, Math.PI * 0.62 + Math.PI * 0.7);
      ctx.strokeStyle = "rgba(0,229,255,0.1)"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(CX, CY, R - 2, cpuStart, cpuEnd);
      ctx.strokeStyle = `rgba(0,229,255,${0.6 + Math.sin(t * 3) * 0.15})`; ctx.lineWidth = 3;
      ctx.lineCap = "round"; ctx.stroke();

      const thrFrac = Math.min(1, thr / 10);
      const thrStart = Math.PI * 1.68;
      const thrEnd   = thrStart + Math.PI * 0.7 * thrFrac;
      ctx.beginPath();
      ctx.arc(CX, CY, R - 2, Math.PI * 1.68, Math.PI * 1.68 + Math.PI * 0.7);
      ctx.strokeStyle = "rgba(226,18,39,0.1)"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(CX, CY, R - 2, thrStart, thrEnd);
      ctx.strokeStyle = `rgba(226,18,39,${0.6 + Math.sin(t * 2.5) * 0.15})`; ctx.lineWidth = 3;
      ctx.lineCap = "round"; ctx.stroke();

      const apiAngle = t * 1.4 + Math.PI * 1.5;
      const apiR = R - 6;
      const ax = CX + Math.cos(apiAngle) * apiR;
      const ay = CY + Math.sin(apiAngle) * apiR;
      ctx.beginPath(); ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,197,94,${0.7 + Math.sin(t * 4) * 0.25})`; ctx.fill();
      ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34,197,94,0.25)"; ctx.lineWidth = 0.8; ctx.stroke();

      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";

      const clx = CX + Math.cos(cpuStart + Math.PI * 0.35) * (R + 7);
      const cly = CY + Math.sin(cpuStart + Math.PI * 0.35) * (R + 7);
      ctx.fillStyle = "rgba(0,229,255,0.8)";
      ctx.fillText(`${cpu}%`, clx, cly);

      const tlx = CX + Math.cos(Math.PI * 1.68 + Math.PI * 0.35) * (R + 7);
      const tly = CY + Math.sin(Math.PI * 1.68 + Math.PI * 0.35) * (R + 7);
      ctx.fillStyle = thr > 4 ? "rgba(226,18,39,0.9)" : "rgba(226,18,39,0.6)";
      ctx.fillText(`T${thr}`, tlx, tly);

      ctx.fillStyle = "rgba(34,197,94,0.8)";
      ctx.fillText(`${api}`, ax + Math.cos(apiAngle) * 10, ay + Math.sin(apiAngle) * 10);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [cpu, api, thr]);

  return (
    <canvas
      ref={cvRef} width={116} height={116}
      style={{ position: "absolute", inset: "-20px", width: "116px", height: "116px", pointerEvents: "none" }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   SATELLITE PANEL  — combined SYS MONITOR + IDLE TRACK + NET TOPOLOGY
   All three sections visible simultaneously, stacked vertically
══════════════════════════════════════════════════════════════════ */
function SatellitePanel({ onExpandRec, onExpandPacket }: { onExpandRec?: () => void; onExpandPacket?: () => void }) {
  /* NET TOPO live stats */
  const [topoStats, setTopoStats] = useState({ nodes: 20, active: 14, packets: 8421, threats: 6 });

  /* Session Recorder state */
  const [recording, setRecording] = useState(false);
  const [events,    setEvents]    = useState<SessionEvent[]>([]);
  const [elapsed,   setElapsed]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsub = sessionRecorder.subscribe((evs: SessionEvent[]) => {
      setEvents(evs.slice(0, 12));
      setRecording(sessionRecorder.isRecording);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - sessionRecorder.sessionStart);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  useEffect(() => {
    const iv = setInterval(() => {
      setTopoStats(p => ({
        nodes:   p.nodes,
        active:  Math.max(8,  Math.min(20, p.active  + Math.round((Math.random() - 0.4) * 2))),
        packets: p.packets + Math.round(Math.random() * 150 + 50),
        threats: Math.max(0,  Math.min(10, p.threats + Math.round((Math.random() - 0.45)))),
      }));
    }, 1200);
    return () => clearInterval(iv);
  }, []);

  /* IDLE / activity tracking */
  const [idleMs,   setIdleMs]   = useState(0);
  const [isIdle,   setIsIdle]   = useState(false);
  const [actLevel, setActLevel] = useState(50);
  const idleStartRef = useRef(Date.now());
  const lastActRef2  = useRef(Date.now());
  const actCurRef    = useRef(0);

  useEffect(() => {
    const onAct = (d: number) => { actCurRef.current += d; lastActRef2.current = Date.now(); };
    const mm = () => onAct(1), kd = () => onAct(3), cl = () => onAct(2);
    document.addEventListener("mousemove", mm);
    document.addEventListener("keydown",   kd);
    document.addEventListener("click",     cl);
    return () => {
      document.removeEventListener("mousemove", mm);
      document.removeEventListener("keydown",   kd);
      document.removeEventListener("click",     cl);
    };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setIdleMs(Date.now() - idleStartRef.current);
      setIsIdle(Date.now() - lastActRef2.current > 5000);
      setActLevel(p => {
        const target = Math.min(100, actCurRef.current * 8);
        actCurRef.current = 0;
        return Math.max(2, Math.min(100, p + (target - p) * 0.3));
      });
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const idleStr = (() => {
    const s = Math.floor(idleMs / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  })();

  const EV_LABEL: Record<string, string> = {
    message_sent: "TX", message_received: "RX", model_switch: "MDL",
    mode_switch: "MOD", tool_use: "TOOL", error: "ERR",
    session_start: "START", session_stop: "STOP",
  };
  const EV_COLOR: Record<string, string> = {
    message_sent: "#00e5ff", message_received: "#22c55e", model_switch: "#a78bfa",
    mode_switch: "#f59e0b", tool_use: "#fb923c", error: "#e21227",
    session_start: "#10b981", session_stop: "#666666",
  };

  void trafficBus; /* keep import live */

  const msgCount = events.filter(e => e.type === "message_received").length;
  const errCount = events.filter(e => e.type === "error").length;
  const evCount  = sessionRecorder.eventCount;
  const fmtElapsed = (() => {
    const s = Math.floor(elapsed / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  })();

  function dlBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  function handleToggle() {
    if (recording) sessionRecorder.stop();
    else { sessionRecorder.start(); setElapsed(0); }
  }
  function handleJSON() {
    dlBlob(new Blob([sessionRecorder.exportJSON()], { type: "application/json" }), `kaligpt-${sessionRecorder.sessionId}.json`);
  }
  function handleLog() {
    dlBlob(sessionRecorder.exportHTMLBlob(), `kaligpt-${sessionRecorder.sessionId}.html`);
  }
  function handlePdf() {
    const url = URL.createObjectURL(sessionRecorder.exportHTMLBlob());
    const w = window.open(url, "_blank");
    if (w) { w.onload = () => { w.print(); URL.revokeObjectURL(url); }; }
  }

  const SectionHead = ({ label, color, icon: Icon }: { label: string; color: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ width: "4px", height: "4px", borderRadius: "50%", background: color, boxShadow: `0 0 7px ${color}`, flexShrink: 0 }}
      />
      <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 900, color, letterSpacing: "1.8px", textShadow: `0 0 10px ${color}70`, flex: 1 }}>
        {label}
      </span>
      <Icon style={{ width: "8px", height: "8px", color, opacity: 0.7, flexShrink: 0 }} />
      <motion.span
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{ fontSize: "5px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e", letterSpacing: "0.8px", padding: "1px 3px", borderRadius: "2px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", flexShrink: 0 }}
      >LIVE</motion.span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.88 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.88 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute", right: "94px", bottom: "-6px",
        width: "180px", zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {/* Connection wire to orb */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{
          position: "absolute", right: "-18px",
          top: "50%", transform: "translateY(-50%)",
          width: "18px", height: "1px",
          background: "linear-gradient(90deg, rgba(0,229,255,0), rgba(0,229,255,0.4), rgba(0,229,255,0.8))",
          pointerEvents: "none",
        }}
      />
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.2, 0.85] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          position: "absolute", right: "-22px",
          top: "50%", transform: "translateY(-50%)",
          width: "5px", height: "5px", borderRadius: "50%",
          background: "#00e5ff", boxShadow: "0 0 8px #00e5ff",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div style={{
        background: "linear-gradient(148deg, rgba(4,4,16,0.99) 0%, rgba(8,6,20,0.99) 100%)",
        border: "1px solid rgba(0,229,255,0.14)",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 6px 48px rgba(0,0,0,0.94), 0 0 28px rgba(0,229,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
        pointerEvents: "auto",
      }}>
        {/* Top accent stripe */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{ height: "1.5px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.7), rgba(168,85,247,0.5), transparent)" }}
        />
        <HoloShimmer color="#00e5ff" />

        <div style={{ padding: "7px 9px 7px" }}>

          {/* ════ NET TOPOLOGY ════ */}
          <SectionHead label="NET TOPOLOGY" color="#a855f7" icon={Network} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "6px" }}>
            {[
              { label: "NODES",   val: topoStats.nodes,                  color: "#a855f7" },
              { label: "ACTIVE",  val: topoStats.active,                  color: "#22c55e" },
              { label: "PACKETS", val: topoStats.packets.toLocaleString(), color: "#00e5ff" },
              { label: "THREATS", val: topoStats.threats,                  color: topoStats.threats > 3 ? "#e21227" : "#f59e0b" },
            ].map(({ label, val, color: c }) => (
              <div key={label} style={{ padding: "4px 6px", borderRadius: "6px", background: `${c}0a`, border: `1px solid ${c}16` }}>
                <div style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)", letterSpacing: "0.8px", marginBottom: "2px" }}>{label}</div>
                <motion.div
                  key={String(val)}
                  initial={{ opacity: 0.5, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: c, textShadow: `0 0 8px ${c}` }}
                >{val}</motion.div>
              </div>
            ))}
          </div>

          {/* Mini animated waveform */}
          <div style={{ height: "22px", position: "relative", overflow: "hidden", borderRadius: "5px", background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.12)", marginBottom: "7px" }}>
            <span style={{ position: "absolute", bottom: 2, left: 4, fontSize: "5.5px", fontFamily: "monospace", color: "rgba(168,85,247,0.5)", letterSpacing: "0.8px", zIndex: 2 }}>TRAFFIC</span>
            {Array.from({ length: 20 }, (_, i) => (
              <motion.div key={i}
                animate={{ height: [`${15 + Math.random() * 70}%`, `${22 + Math.random() * 65}%`, `${15 + Math.random() * 70}%`] }}
                transition={{ duration: 0.65 + i * 0.07, repeat: Infinity, ease: "easeInOut", delay: i * 0.03 }}
                style={{
                  position: "absolute", bottom: 0,
                  left: `${2 + i * 4.9}%`, width: "3.8%",
                  background: i % 4 === 0
                    ? `rgba(226,18,39,${0.4 + (i % 3) * 0.1})`
                    : `rgba(168,85,247,${0.3 + (i % 3) * 0.12})`,
                  borderRadius: "2px 2px 0 0",
                }}
              />
            ))}
          </div>

          {/* ── IDLE / Activity row ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
            {isIdle ? (
              <motion.div animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.2, repeat: Infinity }}
                style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
            ) : (
              <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 0.7, repeat: Infinity }}
                style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: "6.5px", fontFamily: "monospace", fontWeight: 700, color: isIdle ? "#f59e0b" : "#22c55e", letterSpacing: "1px" }}>
              {isIdle ? "IDLE" : "ACTIVE"}
            </span>
            <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)", letterSpacing: "0.5px", flex: 1, textAlign: "right" }}>
              {idleStr}
            </span>
            <div style={{ width: "40px", height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden", flexShrink: 0 }}>
              <motion.div animate={{ width: `${actLevel}%` }} transition={{ duration: 0.45 }}
                style={{ height: "100%", borderRadius: "2px", background: isIdle ? "#f59e0b" : "linear-gradient(90deg, #10b98188, #22c55e)" }} />
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.2), transparent)", margin: "3px 0 5px" }} />

          {/* ── REC / IDLE header ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
            {recording ? (
              <motion.div animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 0.85, repeat: Infinity }}
                style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#e21227", boxShadow: "0 0 8px #e21227", flexShrink: 0 }} />
            ) : (
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", border: "1px solid #555", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 900, color: "#e21227", letterSpacing: "1.8px", flex: 1, textShadow: "0 0 10px rgba(226,18,39,0.5)" }}>
              {recording ? "● REC" : "○ IDLE"}
            </span>
            <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: recording ? "#e21227" : "#444", letterSpacing: "1px" }}>{fmtElapsed}</span>
            <span style={{ fontSize: "6px", fontFamily: "monospace", color: "#333", marginLeft: "2px" }}>{evCount} EV</span>
            {/* Expand button */}
            <button
              onClick={e => { e.stopPropagation(); onExpandRec?.(); }}
              title="Expand Session Recorder"
              style={{
                width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
                background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.25)",
                color: "#e21227", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.22)"; b.style.boxShadow = "0 0 8px rgba(226,18,39,0.35)"; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.08)"; b.style.boxShadow = "none"; }}
            >
              <ChevronUp style={{ width: "9px", height: "9px" }} />
            </button>
          </div>

          {/* ── RESP / ERR / EV / SESSION ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
            {[
              { label: "RESP", val: msgCount, color: "#22c55e" },
              { label: "ERR",  val: errCount, color: "#e21227" },
              { label: "EV",   val: evCount,  color: "#00e5ff" },
            ].map(({ label, val, color: c }) => (
              <div key={label} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: "5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.3px" }}>{label}</div>
                <motion.div key={val} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                  style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: c, textShadow: `0 0 6px ${c}` }}>
                  {val}
                </motion.div>
              </div>
            ))}
            <div style={{ flex: 2, overflow: "hidden" }}>
              <div style={{ fontSize: "5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>SESSION</div>
              <div style={{ fontSize: "5.5px", fontFamily: "monospace", color: "#444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {sessionRecorder.sessionId || "--"}
              </div>
            </div>
          </div>

          {/* ── Live event log mini-list ── */}
          {events.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "5px" }}>
              <AnimatePresence mode="popLayout">
                {events.slice(0, 3).map((ev, i) => (
                  <motion.div key={ev.id}
                    initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4, height: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.18 }}
                    style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 4px", borderRadius: "3px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                  >
                    <span style={{ fontSize: "6px", fontFamily: "monospace", fontWeight: 700, color: EV_COLOR[ev.type] ?? "#666", padding: "0px 2px", background: `${EV_COLOR[ev.type] ?? "#66666618"}18`, borderRadius: "2px", flexShrink: 0 }}>
                      {EV_LABEL[ev.type] ?? "EVT"}
                    </span>
                    <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.data["model"] ? String(ev.data["model"]).slice(0, 14)
                        : ev.data["content"] ? String(ev.data["content"]).slice(0, 18)
                        : ev.data["mode"] ? String(ev.data["mode"]) : "—"}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* ── REC / JSON / LOG / PDF buttons ── */}
          <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
            <button
              onClick={handleToggle}
              style={{
                display: "flex", alignItems: "center", gap: "3px",
                padding: "3px 7px", borderRadius: "5px", cursor: "pointer",
                fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
                letterSpacing: "1px", transition: "all 0.15s",
                background: recording ? "rgba(26,0,0,0.9)" : "#e21227",
                border: recording ? "1px solid #e21227" : "none",
                color: recording ? "#e21227" : "#fff",
              }}
            >
              {recording
                ? <><Square style={{ width: "7px", height: "7px" }} />STOP</>
                : <><Radio style={{ width: "7px", height: "7px" }} />REC</>}
            </button>
            {[
              { label: "JSON", fn: handleJSON, icon: FileJson,  hoverC: "#00e5ff" },
              { label: "LOG",  fn: handleLog,  icon: Download,  hoverC: "#a78bfa" },
              { label: "PDF",  fn: handlePdf,  icon: Printer,   hoverC: "#22c55e" },
            ].map(({ label, fn, icon: Ic, hoverC }) => (
              <button
                key={label}
                onClick={fn}
                disabled={evCount === 0}
                style={{
                  display: "flex", alignItems: "center", gap: "2px",
                  padding: "3px 5px", borderRadius: "5px", cursor: evCount === 0 ? "not-allowed" : "pointer",
                  fontSize: "7px", fontFamily: "monospace", letterSpacing: "0.5px",
                  background: "transparent", border: "1px solid #333",
                  color: "#555", opacity: evCount === 0 ? 0.3 : 1, transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (evCount > 0) { (e.currentTarget as HTMLButtonElement).style.borderColor = hoverC; (e.currentTarget as HTMLButtonElement).style.color = hoverC; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#333"; (e.currentTarget as HTMLButtonElement).style.color = "#555"; }}
              >
                <Ic style={{ width: "7px", height: "7px" }} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom accent line */}
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.8, repeat: Infinity }}
          style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.5), rgba(226,18,39,0.4), transparent)" }}
        />

        {/* Corner brackets */}
        <div style={{ position: "absolute", top: 5, left: 5, width: 8, height: 8, borderTop: "1px solid rgba(0,229,255,0.35)", borderLeft: "1px solid rgba(0,229,255,0.35)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 5, right: 5, width: 8, height: 8, borderBottom: "1px solid rgba(168,85,247,0.35)", borderRight: "1px solid rgba(168,85,247,0.35)", pointerEvents: "none" }} />
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SESSION RECORDER FULL VIEW  — expanded overlay matching screenshot
   3D holographic · fixed floating · IDLE/REC · stats · event log
══════════════════════════════════════════════════════════════════ */
function SessionRecorderFullView({ onClose }: { onClose: () => void }) {
  const [recording, setRecording] = useState(false);
  const [events,    setEvents]    = useState<SessionEvent[]>([]);
  const [elapsed,   setElapsed]   = useState(0);
  const [scanY,     setScanY]     = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsub = sessionRecorder.subscribe((evs: SessionEvent[]) => {
      setEvents(evs);
      setRecording(sessionRecorder.isRecording);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed(Date.now() - sessionRecorder.sessionStart), 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  useEffect(() => {
    const iv = setInterval(() => setScanY(p => (p + 1.2) % 100), 18);
    return () => clearInterval(iv);
  }, []);

  const fmtT = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  const msgCount = events.filter(e => e.type === "message_received").length;
  const errCount = events.filter(e => e.type === "error").length;
  const evCount  = sessionRecorder.eventCount;

  function dlBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }
  function handleToggle() { if (recording) sessionRecorder.stop(); else { sessionRecorder.start(); setElapsed(0); } }
  function handleJSON()   { dlBlob(new Blob([sessionRecorder.exportJSON()], { type: "application/json" }), `kaligpt-${sessionRecorder.sessionId}.json`); }
  function handleLog()    { dlBlob(sessionRecorder.exportHTMLBlob(), `kaligpt-${sessionRecorder.sessionId}.html`); }
  function handlePdf()    { const url = URL.createObjectURL(sessionRecorder.exportHTMLBlob()); const w = window.open(url, "_blank"); if (w) { w.onload = () => { w.print(); URL.revokeObjectURL(url); }; } }

  const EV_LABEL: Record<string, string> = { message_sent: "TX", message_received: "RX", model_switch: "MDL", mode_switch: "MOD", tool_use: "TOOL", error: "ERR", session_start: "START", session_stop: "STOP" };
  const EV_COLOR: Record<string, string> = { message_sent: "#00e5ff", message_received: "#22c55e", model_switch: "#a78bfa", mode_switch: "#f59e0b", tool_use: "#fb923c", error: "#e21227", session_start: "#10b981", session_stop: "#666666" };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 14 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "fixed", right: "110px", bottom: "110px", zIndex: 300, width: "348px", pointerEvents: "auto", perspective: "700px" }}
    >
      <motion.div
        animate={{ rotateX: [0, 0.6, 0, -0.6, 0], rotateY: [-0.4, 0.4, -0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Outer glow ring */}
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{ position: "absolute", inset: "-4px", borderRadius: "18px", border: "1px solid rgba(226,18,39,0.3)", pointerEvents: "none", zIndex: -1, boxShadow: "0 0 40px rgba(226,18,39,0.12)" }}
        />

        <div style={{
          background: "linear-gradient(160deg, rgba(10,2,4,0.99) 0%, rgba(16,3,6,0.99) 50%, rgba(8,2,4,0.99) 100%)",
          border: "1px solid rgba(226,18,39,0.3)",
          borderRadius: "16px", overflow: "hidden",
          boxShadow: "0 16px 80px rgba(0,0,0,0.97), 0 0 50px rgba(226,18,39,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
          position: "relative",
        }}>
          {/* Scan line */}
          <div style={{ position: "absolute", left: 0, right: 0, top: `${scanY}%`, height: "1px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.22), transparent)", pointerEvents: "none", zIndex: 1 }} />
          {/* Hex grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(226,18,39,0.03) 1px, transparent 1px)", backgroundSize: "12px 12px", pointerEvents: "none", zIndex: 0 }} />

          {/* Top stripe */}
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.9), rgba(255,80,60,0.5), transparent)" }} />

          {/* ── TOP BAR ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px 8px", borderBottom: "1px solid rgba(226,18,39,0.12)", position: "relative", zIndex: 2 }}>
            {/* Grip dots */}
            <div style={{ display: "grid", gridTemplateColumns: "3px 3px 3px", gap: "2px", opacity: 0.3, flexShrink: 0 }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} style={{ width: "2px", height: "2px", borderRadius: "50%", background: "#e21227" }} />
              ))}
            </div>

            {/* IDLE / REC indicator */}
            {recording ? (
              <motion.div animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 0.85, repeat: Infinity }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#e21227", boxShadow: "0 0 10px #e21227", flexShrink: 0 }} />
            ) : (
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", border: "1.5px solid #555", flexShrink: 0 }} />
            )}

            <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 900, color: "#e21227", letterSpacing: "2.5px", textShadow: "0 0 16px rgba(226,18,39,0.7)" }}>
              {recording ? "REC" : "IDLE"}
            </span>

            <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 700, color: recording ? "#e21227" : "#555", letterSpacing: "2px", flex: 1 }}>
              {fmtT(elapsed)}
            </span>

            <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#444", letterSpacing: "1px" }}>{evCount} EV</span>

            {/* Close ^ */}
            <button
              onClick={onClose}
              style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.35)", color: "#e21227", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.25)"; b.style.boxShadow = "0 0 10px rgba(226,18,39,0.4)"; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.1)"; b.style.boxShadow = "none"; }}
            >
              <ChevronDown style={{ width: "12px", height: "12px" }} />
            </button>
          </div>

          {/* ── STATS ROW ── */}
          <div style={{ display: "flex", gap: "0", borderBottom: "1px solid rgba(226,18,39,0.1)", position: "relative", zIndex: 2 }}>
            {[
              { label: "RESPONSES", val: msgCount, color: "#22c55e" },
              { label: "ERRORS",    val: errCount, color: "#e21227" },
              { label: "EVENTS",    val: evCount,  color: "#00e5ff" },
            ].map(({ label, val, color: c }, i) => (
              <div key={label} style={{ flex: 1, textAlign: "center", padding: "10px 4px", borderRight: i < 2 ? "1px solid rgba(226,18,39,0.08)" : "none" }}>
                <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", letterSpacing: "0.8px", marginBottom: "5px" }}>{label}</div>
                <motion.div
                  key={val}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "28px", height: "28px", borderRadius: "8px",
                    border: `1.5px solid ${c}55`, background: `${c}12`,
                    fontSize: "14px", fontFamily: "monospace", fontWeight: 900,
                    color: c, textShadow: `0 0 10px ${c}`,
                  }}
                >{val}</motion.div>
              </div>
            ))}
            <div style={{ flex: 1.5, padding: "10px 10px", borderLeft: "1px solid rgba(226,18,39,0.08)" }}>
              <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", letterSpacing: "0.8px", marginBottom: "5px" }}>SESSION</div>
              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {sessionRecorder.sessionId || "—"}
              </div>
            </div>
          </div>

          {/* ── EVENT LOG / EMPTY STATE ── */}
          <div style={{ minHeight: "140px", maxHeight: "200px", overflow: "hidden auto", padding: "10px 14px", position: "relative", zIndex: 2 }}>
            {events.length === 0 ? (
              <motion.div
                animate={{ opacity: [0.3, 0.55, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "120px", flexDirection: "column", gap: "8px" }}
              >
                <motion.div
                  animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1.5px solid rgba(226,18,39,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Radio style={{ width: "14px", height: "14px", color: "rgba(226,18,39,0.4)" }} />
                </motion.div>
                <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "2px" }}>PRESS REC TO START</span>
              </motion.div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <AnimatePresence mode="popLayout">
                  {events.slice(0, 20).map((ev, i) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: i * 0.02 }}
                      style={{ display: "flex", alignItems: "center", gap: "7px", padding: "4px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color: EV_COLOR[ev.type] ?? "#666", padding: "1px 4px", background: `${EV_COLOR[ev.type] ?? "#666"}18`, borderRadius: "3px", flexShrink: 0 }}>
                        {EV_LABEL[ev.type] ?? "EVT"}
                      </span>
                      <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ev.data["model"] ? String(ev.data["model"]).slice(0, 24)
                          : ev.data["content"] ? String(ev.data["content"]).slice(0, 28)
                          : ev.data["mode"] ? String(ev.data["mode"]) : "—"}
                      </span>
                      <span style={{ fontSize: "7px", fontFamily: "monospace", color: "#333", flexShrink: 0 }}>
                        {new Date(ev.ts).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── BUTTONS ── */}
          <div style={{ display: "flex", gap: "6px", padding: "8px 14px 12px", borderTop: "1px solid rgba(226,18,39,0.1)", position: "relative", zIndex: 2 }}>
            <motion.button
              onClick={handleToggle}
              whileTap={{ scale: 0.94 }}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "8px", cursor: "pointer", flex: 1.5,
                fontSize: "11px", fontFamily: "monospace", fontWeight: 900, letterSpacing: "1.5px",
                background: recording ? "rgba(18,0,0,0.95)" : "linear-gradient(135deg, #e21227, #c00018)",
                border: recording ? "1px solid #e21227" : "none",
                color: recording ? "#e21227" : "#fff",
                boxShadow: recording ? "0 0 16px rgba(226,18,39,0.3)" : "0 4px 20px rgba(226,18,39,0.45)",
                transition: "all 0.15s",
              }}
            >
              {recording
                ? <><Square style={{ width: "10px", height: "10px" }} />STOP</>
                : <><Radio style={{ width: "10px", height: "10px" }} />REC</>}
            </motion.button>
            {[
              { label: "JSON", fn: handleJSON, icon: FileJson,  hoverC: "#00e5ff" },
              { label: "LOG",  fn: handleLog,  icon: Download,  hoverC: "#a78bfa" },
              { label: "PDF",  fn: handlePdf,  icon: Printer,   hoverC: "#22c55e" },
            ].map(({ label, fn, icon: Ic, hoverC }) => (
              <button
                key={label}
                onClick={fn}
                disabled={evCount === 0}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "8px 10px", borderRadius: "8px", cursor: evCount === 0 ? "not-allowed" : "pointer", flex: 1,
                  fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.8px",
                  background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.35)", opacity: evCount === 0 ? 0.25 : 1, transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (evCount > 0) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = hoverC; b.style.color = hoverC; b.style.boxShadow = `0 0 12px ${hoverC}30`; } }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(255,255,255,0.08)"; b.style.color = "rgba(255,255,255,0.35)"; b.style.boxShadow = "none"; }}
              >
                <Ic style={{ width: "9px", height: "9px" }} />{label}
              </button>
            ))}
          </div>

          {/* Corner brackets */}
          <div style={{ position: "absolute", top: 6, left: 6, width: 10, height: 10, borderTop: "1.5px solid rgba(226,18,39,0.5)", borderLeft: "1.5px solid rgba(226,18,39,0.5)", pointerEvents: "none", zIndex: 3 }} />
          <div style={{ position: "absolute", bottom: 6, right: 6, width: 10, height: 10, borderBottom: "1.5px solid rgba(226,18,39,0.5)", borderRight: "1.5px solid rgba(226,18,39,0.5)", pointerEvents: "none", zIndex: 3 }} />

          {/* Bottom stripe */}
          <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ height: "1.5px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.7), rgba(255,80,60,0.4), transparent)" }} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PACKET INSPECTOR FULL VIEW  — 3D holographic AI call inspector
   Real-time request/response viewer · syntax highlighted · 3D tilt
══════════════════════════════════════════════════════════════════ */
function PacketInspectorFullView({ onClose }: { onClose: () => void }) {
  const [calls,     setCalls]     = useState<TrafficEvent[]>([]);
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const [tab,       setTab]       = useState<"response" | "request">("response");
  const [scanY,     setScanY]     = useState(0);

  useEffect(() => {
    const hist = trafficBus.history.filter(e => e.status === "success" || e.status === "error" || e.status === "streaming");
    setCalls(hist.slice(0, 15));
    if (hist.length > 0) setActiveId(hist[0].id);
    const unsub = trafficBus.subscribe(ev => {
      if (ev.status === "success" || ev.status === "error") {
        setCalls(prev => { const d = prev.filter(c => c.id !== ev.id); return [ev, ...d].slice(0, 15); });
        setActiveId(ev.id);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setScanY(p => (p + 1.4) % 100), 18);
    return () => clearInterval(iv);
  }, []);

  const active = calls.find(c => c.id === activeId) ?? calls[0] ?? null;

  /* Simple JSON/text color tokenizer */
  function colorText(txt: string): { text: string; color: string }[] {
    if (!txt) return [{ text: "— no data —", color: "rgba(255,255,255,0.2)" }];
    return txt.split(/(\{|\}|\[|\]|"[^"]*"|-?\d+\.?\d*|true|false|null|,|:)/).filter(Boolean).map(tok => {
      if (/^"/.test(tok)) return { text: tok, color: "#a78bfa" };
      if (/^-?\d/.test(tok)) return { text: tok, color: "#f59e0b" };
      if (/^(true|false)$/.test(tok)) return { text: tok, color: "#22c55e" };
      if (tok === "null") return { text: tok, color: "#e21227" };
      if (/[{}[\]]/.test(tok)) return { text: tok, color: "#00e5ff" };
      if (tok === ":") return { text: tok, color: "rgba(255,255,255,0.4)" };
      return { text: tok, color: "rgba(255,255,255,0.55)" };
    });
  }

  const STATUS_COLOR: Record<string, string> = { success: "#22c55e", error: "#e21227", pending: "#f59e0b", streaming: "#00e5ff" };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 14 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
      style={{ position: "fixed", right: "470px", bottom: "110px", zIndex: 300, width: "380px", pointerEvents: "auto", perspective: "700px" }}
    >
      <motion.div
        animate={{ rotateX: [0, 0.5, 0, -0.5, 0], rotateY: [0.3, -0.3, 0.3] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Outer glow */}
        <motion.div animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 2.5, repeat: Infinity }}
          style={{ position: "absolute", inset: "-4px", borderRadius: "18px", border: "1px solid rgba(0,229,255,0.25)", pointerEvents: "none", zIndex: -1, boxShadow: "0 0 40px rgba(0,229,255,0.08)" }} />

        <div style={{
          background: "linear-gradient(160deg, rgba(2,6,14,0.99) 0%, rgba(4,10,20,0.99) 50%, rgba(2,6,12,0.99) 100%)",
          border: "1px solid rgba(0,229,255,0.22)",
          borderRadius: "16px", overflow: "hidden",
          boxShadow: "0 16px 80px rgba(0,0,0,0.97), 0 0 50px rgba(0,229,255,0.07), inset 0 1px 0 rgba(255,255,255,0.04)",
          position: "relative",
        }}>
          {/* Scan line */}
          <div style={{ position: "absolute", left: 0, right: 0, top: `${scanY}%`, height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.18), transparent)", pointerEvents: "none", zIndex: 1 }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(0,229,255,0.025) 1px, transparent 1px)", backgroundSize: "12px 12px", pointerEvents: "none", zIndex: 0 }} />

          {/* Top stripe */}
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.9, repeat: Infinity }}
            style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.8), rgba(168,85,247,0.5), transparent)" }} />

          {/* ── TOP BAR ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,229,255,0.1)", position: "relative", zIndex: 2 }}>
            <Eye style={{ width: "11px", height: "11px", color: "#00e5ff", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 900, color: "#00e5ff", letterSpacing: "2px", textShadow: "0 0 14px rgba(0,229,255,0.7)", flex: 1 }}>
              PACKET INSPECTOR
            </span>
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity }}
              style={{ fontSize: "7px", fontFamily: "monospace", color: "#00e5ff", padding: "1px 5px", borderRadius: "3px", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)" }}>
              LIVE
            </motion.span>
            <span style={{ fontSize: "8px", fontFamily: "monospace", color: "#333" }}>{calls.length} calls</span>
            <button
              onClick={onClose}
              style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(0,229,255,0.2)"; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(0,229,255,0.08)"; }}
            >
              <X style={{ width: "10px", height: "10px" }} />
            </button>
          </div>

          <div style={{ display: "flex", height: "320px", position: "relative", zIndex: 2 }}>
            {/* ── Call list sidebar ── */}
            <div style={{ width: "110px", flexShrink: 0, borderRight: "1px solid rgba(0,229,255,0.08)", overflow: "hidden auto", padding: "6px 4px" }}>
              {calls.length === 0 ? (
                <div style={{ padding: "12px 8px", fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>No calls yet</div>
              ) : calls.map(c => (
                <motion.div
                  key={c.id}
                  onClick={() => { setActiveId(c.id); setTab("response"); }}
                  whileHover={{ x: 2 }}
                  style={{
                    padding: "5px 7px", borderRadius: "6px", cursor: "pointer", marginBottom: "3px",
                    background: activeId === c.id ? "rgba(0,229,255,0.1)" : "transparent",
                    border: `1px solid ${activeId === c.id ? "rgba(0,229,255,0.25)" : "transparent"}`,
                    transition: "all 0.14s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: STATUS_COLOR[c.status] ?? "#666", flexShrink: 0 }} />
                    <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.model.slice(0, 12)}
                    </span>
                  </div>
                  <div style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
                    {c.latency ? `${c.latency}ms` : "—"}
                    {c.tokens ? ` · ${c.tokens}tk` : ""}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Detail panel ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {active ? (
                <>
                  {/* Metadata */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "7px 10px", borderBottom: "1px solid rgba(0,229,255,0.07)" }}>
                    {[
                      { label: "MODEL",    val: active.model.slice(0, 16) },
                      { label: "STATUS",   val: active.status.toUpperCase(), color: STATUS_COLOR[active.status] },
                      { label: "LATENCY",  val: active.latency ? `${active.latency}ms` : "—" },
                      { label: "TOKENS",   val: active.tokens ? String(active.tokens) : "—" },
                    ].map(({ label, val, color: c }) => (
                      <div key={label} style={{ padding: "2px 6px", borderRadius: "4px", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.1)" }}>
                        <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{label} </span>
                        <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 700, color: c ?? "#00e5ff" }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(0,229,255,0.07)", flexShrink: 0 }}>
                    {(["response", "request"] as const).map(t => (
                      <button key={t} onClick={() => setTab(t)}
                        style={{
                          padding: "5px 12px", cursor: "pointer", background: "transparent",
                          border: "none", borderBottom: tab === t ? "2px solid #00e5ff" : "2px solid transparent",
                          fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
                          color: tab === t ? "#00e5ff" : "rgba(255,255,255,0.25)",
                          letterSpacing: "1.2px", transition: "all 0.14s",
                        }}
                      >
                        {t === "response" ? "RESPONSE" : "REQUEST"}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, overflow: "hidden auto", padding: "8px 10px" }}>
                    <div style={{ fontSize: "8.5px", fontFamily: "monospace", lineHeight: "1.65", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {colorText(tab === "response" ? (active.responsePreview ?? "") : (active.payloadPreview ?? "")).map((tok, i) => (
                        <span key={i} style={{ color: tok.color }}>{tok.text}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: "8px" }}>
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1.5px solid rgba(0,229,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ArrowUpDown style={{ width: "14px", height: "14px", color: "rgba(0,229,255,0.4)" }} />
                  </motion.div>
                  <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "1.5px" }}>AWAITING AI CALLS</span>
                </div>
              )}
            </div>
          </div>

          {/* Corner brackets */}
          <div style={{ position: "absolute", top: 6, left: 6, width: 10, height: 10, borderTop: "1.5px solid rgba(0,229,255,0.45)", borderLeft: "1.5px solid rgba(0,229,255,0.45)", pointerEvents: "none", zIndex: 3 }} />
          <div style={{ position: "absolute", bottom: 6, right: 6, width: 10, height: 10, borderBottom: "1.5px solid rgba(0,229,255,0.45)", borderRight: "1.5px solid rgba(0,229,255,0.45)", pointerEvents: "none", zIndex: 3 }} />

          {/* Bottom stripe */}
          <motion.div animate={{ opacity: [0.25, 0.7, 0.25] }} transition={{ duration: 2.3, repeat: Infinity }}
            style={{ height: "1.5px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.65), rgba(168,85,247,0.4), transparent)" }} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   THREAT FEED PANEL  — live AI-generated security alert stream
   Ultra-3D holographic design · auto-detects threats from trafficBus
══════════════════════════════════════════════════════════════════ */
const THREAT_RULES = [
  { re: /\bCVE-\d{4}-\d+\b/i,          label: "CVE DETECTED",  sev: "CRIT", color: "#e21227" },
  { re: /\bexploit\b/i,                 label: "EXPLOIT CODE",  sev: "CRIT", color: "#e21227" },
  { re: /reverse.?shell|revshell/i,     label: "REV SHELL",     sev: "CRIT", color: "#e21227" },
  { re: /\b0.?day\b/i,                  label: "ZERO-DAY",      sev: "CRIT", color: "#e21227" },
  { re: /sql.?inject|sqlmap/i,          label: "SQLi ATTACK",   sev: "HIGH", color: "#f97316" },
  { re: /\bpayload\b/i,                 label: "PAYLOAD DROP",  sev: "HIGH", color: "#f97316" },
  { re: /privilege.?escal/i,            label: "PRIVESC",       sev: "HIGH", color: "#f97316" },
  { re: /\bmalware\b/i,                 label: "MALWARE SIG",   sev: "HIGH", color: "#f97316" },
  { re: /\bbotnet\b/i,                  label: "BOTNET NODE",   sev: "HIGH", color: "#f97316" },
  { re: /code.?inject|\binjection\b/i,  label: "CODE INJECT",   sev: "HIGH", color: "#f97316" },
  { re: /data.?exfil/i,                 label: "DATA EXFIL",    sev: "HIGH", color: "#f97316" },
  { re: /\bphish/i,                     label: "PHISHING",      sev: "MED",  color: "#f59e0b" },
  { re: /\brecon\b/i,                   label: "RECON OPS",     sev: "MED",  color: "#f59e0b" },
  { re: /auth.?bypass|\bbypass\b/i,     label: "AUTH BYPASS",   sev: "MED",  color: "#f59e0b" },
  { re: /port.?scan|nmap/i,             label: "PORT SCAN",     sev: "LOW",  color: "#a855f7" },
  { re: /\bxss\b|\bcross.?site/i,       label: "XSS VECTOR",    sev: "MED",  color: "#f59e0b" },
];
const DEMO_THREATS = [
  { id: "d1", label: "RECON OPS",   sev: "MED",  color: "#f59e0b", model: "CHAT-GPT" },
  { id: "d2", label: "PORT SCAN",   sev: "LOW",  color: "#a855f7", model: "CHAT-GPT" },
  { id: "d3", label: "PAYLOAD DROP",sev: "HIGH", color: "#f97316", model: "CHAT-GPT" },
  { id: "d4", label: "AUTH BYPASS", sev: "MED",  color: "#f59e0b", model: "CHAT-GPT" },
];
interface ThreatItem { id: string; label: string; sev: string; color: string; model: string; ts: number; }

function ThreatFeedPanel() {
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [scan, setScan]       = useState(0);
  const [glitch, setGlitch]   = useState(false);

  /* Subscribe to trafficBus — detect threats in AI responses */
  useEffect(() => {
    const unsub = trafficBus.subscribe(ev => {
      if (ev.status !== "success" && ev.status !== "streaming") return;
      const txt = (ev.responsePreview ?? "") + " " + (ev.payloadPreview ?? "");
      THREAT_RULES.forEach(rule => {
        if (!rule.re.test(txt)) return;
        const item: ThreatItem = {
          id: `${ev.id}-${rule.label}`,
          label: rule.label, sev: rule.sev, color: rule.color,
          model: ev.model.slice(0, 12), ts: Date.now(),
        };
        setThreats(prev => {
          const filtered = prev.filter(t => !(t.label === item.label && Date.now() - t.ts < 15000));
          return [item, ...filtered].slice(0, 8);
        });
        /* glitch flash on new critical */
        if (rule.sev === "CRIT") { setGlitch(true); setTimeout(() => setGlitch(false), 380); }
      });
    });
    return unsub;
  }, []);

  /* Animated vertical scan line */
  useEffect(() => {
    const iv = setInterval(() => setScan(p => (p + 2) % 104), 20);
    return () => clearInterval(iv);
  }, []);

  const display = threats.length > 0 ? threats : DEMO_THREATS;
  const critCount = display.filter(t => t.sev === "CRIT").length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.86 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.86 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      style={{
        position: "absolute", right: "290px", bottom: "-6px",
        width: "178px", zIndex: 10, pointerEvents: "none",
        perspective: "600px",
      }}
    >
      {/* 3D tilt wrapper */}
      <motion.div
        animate={{ rotateX: [0, 0.8, 0, -0.8, 0], rotateY: [-0.5, 0.5, -0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Connection wire to SatellitePanel */}
        <motion.div
          animate={{ opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: "absolute", right: "-18px", top: "50%",
            transform: "translateY(-50%)",
            width: "18px", height: "1px",
            background: "linear-gradient(90deg, rgba(226,18,39,0), rgba(226,18,39,0.5), rgba(226,18,39,0.9))",
            pointerEvents: "none",
          }}
        />
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.15, 0.8] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{
            position: "absolute", right: "-22px", top: "50%",
            transform: "translateY(-50%)",
            width: "4px", height: "4px", borderRadius: "50%",
            background: "#e21227", boxShadow: "0 0 8px #e21227",
            pointerEvents: "none",
          }}
        />

        {/* Card body */}
        <motion.div
          animate={glitch ? { x: [0, -2, 3, -1, 0], opacity: [1, 0.7, 1] } : {}}
          transition={{ duration: 0.35 }}
          style={{
            background: "linear-gradient(148deg, rgba(12,3,5,0.99) 0%, rgba(18,4,8,0.99) 60%, rgba(8,2,4,0.99) 100%)",
            border: `1px solid ${critCount > 0 ? "rgba(226,18,39,0.35)" : "rgba(226,18,39,0.18)"}`,
            borderRadius: "14px", overflow: "hidden",
            boxShadow: critCount > 0
              ? "0 6px 48px rgba(0,0,0,0.95), 0 0 40px rgba(226,18,39,0.14), inset 0 1px 0 rgba(255,255,255,0.03)"
              : "0 6px 40px rgba(0,0,0,0.93), 0 0 20px rgba(226,18,39,0.07), inset 0 1px 0 rgba(255,255,255,0.02)",
            position: "relative",
          }}
        >
          {/* Vertical scan line */}
          <div style={{
            position: "absolute", left: 0, right: 0,
            top: `${scan}%`, height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.25), rgba(255,80,80,0.18), transparent)",
            pointerEvents: "none", zIndex: 1,
          }} />

          {/* Hex grid overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(226,18,39,0.04) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
            pointerEvents: "none", zIndex: 0,
          }} />

          {/* Top accent stripe */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.8, 1, 0.8] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ height: "2px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.9), rgba(255,80,60,0.6), transparent)", transformOrigin: "center" }}
          />
          <HoloShimmer color="#e21227" />

          <div style={{ padding: "7px 9px", position: "relative", zIndex: 2 }}>

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px" }}>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1.2, 0.85], boxShadow: ["0 0 5px #e21227", "0 0 14px #e21227", "0 0 5px #e21227"] }}
                transition={{ duration: 1.1, repeat: Infinity }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#e21227", flexShrink: 0 }}
              />
              <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 900, color: "#e21227", letterSpacing: "2px", textShadow: "0 0 14px rgba(226,18,39,0.75)", flex: 1 }}>
                THREAT FEED
              </span>
              <AlertTriangle style={{ width: "8px", height: "8px", color: "#e21227", opacity: 0.85, flexShrink: 0 }} />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.75, repeat: Infinity }}
                style={{ fontSize: "5px", fontFamily: "monospace", fontWeight: 700, color: "#e21227", letterSpacing: "0.8px", padding: "1px 3px", borderRadius: "2px", background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)", flexShrink: 0 }}
              >LIVE</motion.span>
            </div>

            {/* ── Threat items ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" }}>
              <AnimatePresence mode="popLayout">
                {display.slice(0, 5).map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: 10, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, x: -8, height: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.04 }}
                    style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 6px", borderRadius: "6px", background: `${t.color}09`, border: `1px solid ${t.color}20` }}
                  >
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }}
                      transition={{ duration: 1.3 + i * 0.2, repeat: Infinity }}
                      style={{ width: "3px", height: "3px", borderRadius: "50%", background: t.color, boxShadow: `0 0 6px ${t.color}`, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 700, color: t.color, letterSpacing: "0.8px", flex: 1, textShadow: `0 0 8px ${t.color}55` }}>
                      {t.label}
                    </span>
                    <span style={{ fontSize: "5px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", padding: "1px 3px", borderRadius: "2px", background: `${t.color}18`, border: `1px solid ${t.color}22`, letterSpacing: "0.5px", flexShrink: 0 }}>
                      {t.sev}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ── Count + severity breakdown ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <div style={{ display: "flex", gap: "5px" }}>
                {[
                  { label: "CRIT", color: "#e21227", count: display.filter(t => t.sev === "CRIT").length },
                  { label: "HIGH", color: "#f97316", count: display.filter(t => t.sev === "HIGH").length },
                  { label: "MED",  color: "#f59e0b", count: display.filter(t => t.sev === "MED").length },
                ].map(({ label, color: c, count }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>{label}</div>
                    <motion.div key={count} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                      style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color: c, textShadow: `0 0 7px ${c}` }}>
                      {count}
                    </motion.div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>TOTAL</div>
                <motion.div key={display.length} initial={{ scale: 1.4 }} animate={{ scale: 1 }}
                  style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 900, color: "#e21227", textShadow: "0 0 12px rgba(226,18,39,0.8)" }}>
                  {display.length}
                </motion.div>
              </div>
            </div>

            {/* ── Mini threat waveform ── */}
            <div style={{ height: "18px", position: "relative", overflow: "hidden", borderRadius: "5px", background: "rgba(226,18,39,0.03)", border: "1px solid rgba(226,18,39,0.12)" }}>
              <span style={{ position: "absolute", bottom: 2, left: 4, fontSize: "5px", fontFamily: "monospace", color: "rgba(226,18,39,0.4)", letterSpacing: "0.8px", zIndex: 2 }}>ACTIVITY</span>
              {Array.from({ length: 24 }, (_, i) => (
                <motion.div key={i}
                  animate={{ height: [`${8 + Math.random() * 82}%`, `${12 + Math.random() * 78}%`, `${8 + Math.random() * 82}%`] }}
                  transition={{ duration: 0.38 + i * 0.045, repeat: Infinity, ease: "easeInOut", delay: i * 0.018 }}
                  style={{
                    position: "absolute", bottom: 0,
                    left: `${1 + i * 4.1}%`, width: "3.4%",
                    background: i % 6 === 0 ? `rgba(226,18,39,0.85)` : i % 3 === 0 ? `rgba(255,80,50,0.55)` : `rgba(226,18,39,0.22)`,
                    borderRadius: "1px 1px 0 0",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Bottom accent */}
          <motion.div
            animate={{ opacity: [0.25, 0.75, 0.25] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ height: "1.5px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.7), rgba(255,80,60,0.45), transparent)" }}
          />

          {/* Corner brackets */}
          <div style={{ position: "absolute", top: 5, left: 5, width: 8, height: 8, borderTop: "1px solid rgba(226,18,39,0.45)", borderLeft: "1px solid rgba(226,18,39,0.45)", pointerEvents: "none", zIndex: 3 }} />
          <div style={{ position: "absolute", bottom: 5, right: 5, width: 8, height: 8, borderBottom: "1px solid rgba(226,18,39,0.45)", borderRight: "1px solid rgba(226,18,39,0.45)", pointerEvents: "none", zIndex: 3 }} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   THREAT SPIKE FLASH  — full-screen alert overlay
══════════════════════════════════════════════════════════════════ */
function ThreatSpikeFlash({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.18, 0.08, 0.22, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 999, pointerEvents: "none",
            background: "radial-gradient(ellipse at center, rgba(226,18,39,0.28) 0%, rgba(226,18,39,0.12) 50%, transparent 80%)",
            border: "2px solid rgba(226,18,39,0)",
          }}
        >
          {/* Corner flash beams */}
          {[
            { top: 0, left: 0, origin: "top left" },
            { top: 0, right: 0, origin: "top right" },
            { bottom: 0, left: 0, origin: "bottom left" },
            { bottom: 0, right: 0, origin: "bottom right" },
          ].map((pos, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.7, 0], scale: [0, 1.4, 0] }}
              transition={{ duration: 0.7, delay: i * 0.06 }}
              style={{
                position: "absolute",
                width: "120px", height: "120px",
                ...pos,
                background: "radial-gradient(circle, rgba(226,18,39,0.5) 0%, transparent 70%)",
                transformOrigin: pos.origin,
                pointerEvents: "none",
              }}
            />
          ))}
          {/* Alert text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: [0, 1, 0.8, 0], scale: [0.8, 1.05, 1, 0.9], y: [-20, 0, 0, 10] }}
            transition={{ duration: 0.9 }}
            style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: "monospace", fontWeight: 900,
              fontSize: "clamp(14px, 2vw, 22px)",
              color: "#e21227", letterSpacing: "6px",
              textShadow: "0 0 30px rgba(226,18,39,0.9), 0 0 60px rgba(226,18,39,0.5)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            THREAT SPIKE DETECTED
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUT GLOW  — animated ring on Ctrl+Shift+H
══════════════════════════════════════════════════════════════════ */
function KeyGlowRing({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0.6, 0], scale: [0.8, 1.6, 2.0, 2.4] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          style={{
            position: "absolute", inset: "-16px", borderRadius: "50%",
            border: "2px solid rgba(0,229,255,0.85)",
            boxShadow: "0 0 24px rgba(0,229,255,0.7), 0 0 48px rgba(0,229,255,0.35)",
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KEYBOARD INDICATOR BADGE  — glows when hotkey used recently
══════════════════════════════════════════════════════════════════ */
function KeyIndicatorBadge({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.7 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "absolute", top: "-28px", left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,229,255,0.12)",
            border: "1px solid rgba(0,229,255,0.5)",
            borderRadius: "6px",
            padding: "3px 7px",
            display: "flex", alignItems: "center", gap: "4px",
            whiteSpace: "nowrap",
            boxShadow: "0 0 14px rgba(0,229,255,0.35)",
            backdropFilter: "blur(12px)",
            zIndex: 20,
          }}
        >
          <Keyboard style={{ width: "8px", height: "8px", color: "#00e5ff" }} />
          <span style={{ fontSize: "6.5px", fontFamily: "monospace", fontWeight: 700, color: "#00e5ff", letterSpacing: "1.5px" }}>
            CTRL+SHIFT+H
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DOCK BUTTON  — Monitor icon + HUD text + live data + 3D rings
══════════════════════════════════════════════════════════════════ */
function DockButton({
  onClick,
  keyGlow,
  showSatellites,
  stats,
}: {
  onClick: () => void;
  keyGlow: boolean;
  showSatellites: boolean;
  stats: { cpu: number; mem: number; api: number; thr: number };
}) {
  const [pos,      setPos]      = useState(getInitialPos);
  const [hovered,          setHovered]          = useState(false);
  const [dragging,         setDragging]         = useState(false);
  const [tilt,             setTilt]             = useState({ x: 0, y: 0 });
  const [showFullRec,      setShowFullRec]      = useState(false);
  const [showPacketInsp,   setShowPacketInsp]   = useState(false);
  const posRef  = useRef(pos);
  const dragRef = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0, moved: false });
  const btnRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { posRef.current = pos; }, [pos]);

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
        const nx = Math.max(4, Math.min(window.innerWidth  - 96, d.spx + dx));
        const ny = Math.max(4, Math.min(window.innerHeight - 96, d.spy + dy));
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

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = touch.clientX; d.sy = touch.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;
    function onMove(ev: TouchEvent) {
      const tt = ev.touches[0];
      const dx = tt.clientX - d.sx; const dy = tt.clientY - d.sy;
      if (!d.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) { d.moved = true; setDragging(true); }
      if (d.moved) {
        const nx = Math.max(4, Math.min(window.innerWidth - 96, d.spx + dx));
        const ny = Math.max(4, Math.min(window.innerHeight - 96, d.spy + dy));
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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = btnRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 20,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -20,
    });
  }, []);

  const cpuHot = stats.cpu > 70;
  const thrHot = stats.thr > 4;

  return (
    <div
      ref={btnRef}
      style={{
        position: "fixed", left: pos.x, top: pos.y, zIndex: 95,
        cursor: dragging ? "grabbing" : "grab", userSelect: "none",
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      onMouseMove={handleMouseMove}
    >
      {/* Full view overlays (fixed, outside orb positioning) */}
      <AnimatePresence>
        {showFullRec && <SessionRecorderFullView onClose={() => setShowFullRec(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showPacketInsp && <PacketInspectorFullView onClose={() => setShowPacketInsp(false)} />}
      </AnimatePresence>

      {/* Satellite panels */}
      <AnimatePresence>
        {(hovered || showSatellites) && !dragging && (
          <>
            <ThreatFeedPanel />
            <SatellitePanel
              onExpandRec={() => setShowFullRec(v => !v)}
              onExpandPacket={() => setShowPacketInsp(v => !v)}
            />
          </>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1, opacity: 1,
          rotateX: tilt.y, rotateY: tilt.x,
        }}
        transition={{ delay: 0.6, type: "spring", damping: 18, stiffness: 190 }}
        whileTap={!dragging ? { scale: 0.91 } : {}}
        style={{
          width: "76px", height: "76px",
          position: "relative",
          transformStyle: "preserve-3d",
          perspective: "350px",
        }}
      >
        {/* Keyboard glow ring */}
        <KeyGlowRing active={keyGlow} />

        {/* Keyboard indicator badge */}
        <KeyIndicatorBadge active={keyGlow} />

        {/* ══ Layer 1: Outermost dashed blue ring ══ */}
        <motion.div
          style={{
            position: "absolute",
            inset: "-16px",
            borderRadius: "50%",
            border: "1px dashed rgba(0,229,255,0.38)",
            pointerEvents: "none",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        />

        {/* ══ Layer 1b: Counter-rotating dashed ring ══ */}
        <motion.div
          style={{
            position: "absolute",
            inset: "-10px",
            borderRadius: "50%",
            border: "1px dashed rgba(244,114,182,0.22)",
            pointerEvents: "none",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />

        {/* ══ Layer 2: Pulsing outer red ring ══ */}
        <motion.div
          style={{
            position: "absolute", inset: "-5px",
            borderRadius: "50%",
            border: "2px solid rgba(226,18,39,0.82)",
            pointerEvents: "none",
            boxShadow: "0 0 14px rgba(226,18,39,0.35), inset 0 0 8px rgba(226,18,39,0.08)",
          }}
          animate={{
            opacity: [0.85, 1, 0.85],
            boxShadow: cpuHot
              ? ["0 0 18px rgba(226,18,39,0.5)", "0 0 32px rgba(226,18,39,0.75)", "0 0 18px rgba(226,18,39,0.5)"]
              : ["0 0 10px rgba(226,18,39,0.3)", "0 0 20px rgba(226,18,39,0.45)", "0 0 10px rgba(226,18,39,0.3)"],
          }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />

        {/* ══ Layer 3: Inner blue ring ══ */}
        <motion.div
          style={{
            position: "absolute", inset: "-2px",
            borderRadius: "50%",
            border: "1.5px solid rgba(0,229,255,0.55)",
            pointerEvents: "none",
            boxShadow: "0 0 10px rgba(0,229,255,0.2)",
          }}
          animate={{ opacity: [0.6, 0.95, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />

        {/* ══ Layer 4: Threat pulse ring ══ */}
        <AnimatePresence>
          {thrHot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.35, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                position: "absolute", inset: "-8px", borderRadius: "50%",
                border: "1px solid rgba(226,18,39,0.55)", pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>

        {/* ══ Layer 5: Live data arc canvas ══ */}
        <DataArcCanvas cpu={stats.cpu} api={stats.api} thr={stats.thr} />

        {/* ══ Layer 6: Main orb + canvas background ══ */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden",
          background: "radial-gradient(circle at 38% 35%, rgba(22,22,42,1) 0%, rgba(6,6,18,1) 55%, rgba(2,2,10,1) 100%)",
          boxShadow: hovered
            ? `0 0 0 0px transparent, 0 0 40px rgba(0,229,255,0.25), 0 16px 50px rgba(0,0,0,0.95)`
            : `0 0 0 0px transparent, 0 8px 36px rgba(0,0,0,0.88)`,
          transition: "box-shadow 0.35s ease",
        }}>
          <OrbCanvas cpu={stats.cpu} thr={stats.thr} />
        </div>

        {/* ══ Layer 7: Monitor icon + HUD text + live numbers ══ */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "3px", zIndex: 4, pointerEvents: "none",
        }}>
          <motion.div
            style={{ filter: "drop-shadow(0 0 9px #00e5ff)" }}
            animate={{ opacity: [0.88, 1, 0.88] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Monitor style={{ width: "21px", height: "21px", color: "#00e5ff" }} />
          </motion.div>

          <span style={{
            fontSize: "7px", fontFamily: "monospace", fontWeight: 900,
            color: "#00e5ff", letterSpacing: "2.5px",
            textShadow: "0 0 12px rgba(0,229,255,0.8), 0 0 24px rgba(0,229,255,0.4)",
          }}>HUD</span>

          <div style={{ display: "flex", gap: "3px", alignItems: "center", marginTop: "1px" }}>
            <motion.span
              key={stats.cpu}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{
                fontSize: "5.5px", fontFamily: "monospace", fontWeight: 700,
                color: cpuHot ? "#e21227" : "rgba(0,229,255,0.75)",
                letterSpacing: "0.5px",
                textShadow: cpuHot ? "0 0 6px #e21227" : "0 0 6px rgba(0,229,255,0.5)",
              }}
            >
              {stats.cpu}%
            </motion.span>
            <span style={{ width: "1px", height: "5px", background: "rgba(255,255,255,0.15)", borderRadius: "1px" }} />
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ width: "3.5px", height: "3.5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" }}
            />
          </div>
        </div>

        {/* ══ Layer 8: Panel count badge ══ */}
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            position: "absolute", top: "-4px", right: "-4px",
            width: "18px", height: "18px", borderRadius: "50%",
            background: "linear-gradient(135deg, #e21227, #b0101f)",
            border: "1.5px solid rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "7.5px", fontFamily: "monospace", fontWeight: 900, color: "#fff",
            boxShadow: "0 0 10px rgba(226,18,39,0.7)",
            zIndex: 5,
          }}
        >6</motion.div>

        {/* ══ Layer 9: Threat warning badge ══ */}
        <AnimatePresence>
          {thrHot && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                position: "absolute", bottom: "-4px", left: "-4px",
                width: "16px", height: "16px", borderRadius: "50%",
                background: "linear-gradient(135deg, #e21227, #7f0000)",
                border: "1px solid rgba(226,18,39,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 5,
              }}
            >
              <AlertTriangle style={{ width: "8px", height: "8px", color: "#fff" }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ Indicator dots (bottom row) ══ */}
        <div style={{
          position: "absolute", bottom: "-14px", left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: "4px", alignItems: "center", zIndex: 5,
        }}>
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }}
            title="NET TOPOLOGY" style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 5px #a855f7" }} />
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.25 }}
            title="SESSION REC" style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 5px #00e5ff" }} />
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }}
            title="IDLE TRACK" style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }} />
          <motion.div animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.0, repeat: Infinity, delay: 0.1 }}
            title="THREAT FEED" style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#e21227", boxShadow: "0 0 7px #e21227" }} />
        </div>
      </motion.div>

      {/* ══ Tooltip ══ */}
      <AnimatePresence>
        {hovered && !dragging && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.88 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.88 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", right: "88px", top: "50%", transform: "translateY(-50%)",
              background: "rgba(3,3,12,0.97)",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: "12px", padding: "10px 14px",
              whiteSpace: "nowrap", backdropFilter: "blur(24px)",
              boxShadow: "0 4px 30px rgba(0,0,0,0.85), 0 0 18px rgba(0,229,255,0.1)",
              pointerEvents: "none",
            }}
          >
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)", marginBottom: "8px" }} />
            <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "2.5px" }}>CYBER HUD</div>
            <div style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginTop: "2px" }}>
              6 PANELS · SYS + IDLE + NET TOPO
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: "CPU", val: `${stats.cpu}%`, color: stats.cpu > 70 ? "#e21227" : "#00e5ff" },
                { label: "API", val: `${stats.api}`,  color: "#22c55e" },
                { label: "THR", val: `${stats.thr}`,  color: stats.thr > 4 ? "#e21227" : "#f59e0b" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.5px" }}>{label}</span>
                  <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "7px" }}>
              {PANELS.map(p => (
                <motion.div key={p.id}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: Math.random() * 1.5 }}
                  style={{ width: "5px", height: "5px", borderRadius: "50%", background: p.color, boxShadow: `0 0 5px ${p.color}` }}
                />
              ))}
              {/* SYS + IDLE dots */}
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.8 }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, delay: 1.1 }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f472b6", boxShadow: "0 0 5px #f472b6" }} />
            </div>
            <div style={{ position: "absolute", top: 4, left: 4, width: 6, height: 6, borderTop: "1px solid rgba(0,229,255,0.4)", borderLeft: "1px solid rgba(0,229,255,0.4)" }} />
            <div style={{ position: "absolute", bottom: 4, right: 4, width: 6, height: 6, borderBottom: "1px solid rgba(0,229,255,0.4)", borderRight: "1px solid rgba(0,229,255,0.4)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WIDGET CARD  — deep 3D glass with tilt
══════════════════════════════════════════════════════════════════ */
function WidgetCard({
  label, icon: Icon, color, desc, onExpand, children,
}: {
  id: string; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string; desc: string;
  onExpand: () => void; children: React.ReactNode;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hov,  setHov]  = useState(false);
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
          ? `0 8px 48px rgba(0,0,0,0.9), 0 0 0 1px ${color}38, 0 0 36px ${color}22, inset 0 1px 0 rgba(255,255,255,0.05)`
          : `0 3px 18px rgba(0,0,0,0.7), 0 0 0 1px ${color}12`,
      }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      style={{
        perspective: "800px",
        position: "relative", borderRadius: "14px", overflow: "hidden",
        border: `1px solid ${hov ? color + "38" : color + "15"}`,
        background: `linear-gradient(148deg, rgba(6,6,16,0.99) 0%, rgba(10,8,22,0.98) 60%, rgba(4,8,18,0.99) 100%)`,
        display: "flex", flexDirection: "column",
        transformStyle: "preserve-3d",
        transition: "border-color 0.3s",
        minHeight: 0,
      }}
    >
      {hov && <HoloShimmer color={color} />}

      <motion.div
        animate={{ opacity: hov ? 1 : 0.5, scaleX: hov ? 1 : 0.6 }}
        style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${color}dd, ${color}, transparent)`, flexShrink: 0, transformOrigin: "center" }}
      />

      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "6px 9px",
        borderBottom: `1px solid ${color}10`,
        background: `linear-gradient(90deg, ${color}0e, transparent)`,
        flexShrink: 0, position: "relative", zIndex: 2,
      }}>
        <motion.div animate={{ filter: hov ? `drop-shadow(0 0 10px ${color})` : `drop-shadow(0 0 4px ${color}88)` }}>
          <Icon style={{ width: "11px", height: "11px", color, flexShrink: 0 }} />
        </motion.div>
        <span style={{
          fontSize: "8px", fontFamily: "monospace", fontWeight: 900,
          color, letterSpacing: "1.8px", flex: 1,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          textShadow: hov ? `0 0 10px ${color}` : "none", transition: "text-shadow 0.3s",
        }}>{label}</span>
        <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)", marginRight: "3px" }}>{desc}</span>
        <motion.div
          animate={{ opacity: [1, 0.2, 1], scale: [1, 0.75, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ width: "4px", height: "4px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }}
        />
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          style={{
            width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0,
            background: `${color}12`, border: `1px solid ${color}22`,
            color: "rgba(255,255,255,0.35)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
          }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${color}28`; b.style.color = "#fff"; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${color}12`; b.style.color = "rgba(255,255,255,0.35)"; }}
        >
          <Maximize2 style={{ width: "8px", height: "8px" }} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
        {children}
      </div>

      <Brackets color={color} size={12} thickness={1.2} />
    </motion.div>
  );
}

/* ── Widget renderer ─────────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════════
   HUD BACKGROUND  — 3D canvas scene
══════════════════════════════════════════════════════════════════ */
function HUDBackground() {
  const cvRef   = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const tkRef   = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let W = cv.offsetWidth, H = cv.offsetHeight;
    cv.width = W; cv.height = H;
    const cvEl = cv;
    function resize() { W = cvEl.offsetWidth; H = cvEl.offsetHeight; cvEl.width = W; cvEl.height = H; }
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 1.2 + 0.3,
      color: ["#00e5ff", "#e21227", "#a855f7", "#22c55e", "#f59e0b", "#f472b6"][Math.floor(Math.random() * 6)],
    }));

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      const t = (tkRef.current += 0.013);
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
      bg.addColorStop(0, "rgba(5,4,18,1)"); bg.addColorStop(0.5, "rgba(2,2,10,1)"); bg.addColorStop(1, "rgba(0,0,5,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      [
        { x: 0,   y: 0,   c: "rgba(226,18,39,0.055)"  },
        { x: W,   y: 0,   c: "rgba(59,130,246,0.04)"  },
        { x: 0,   y: H,   c: "rgba(168,85,247,0.04)"  },
        { x: W,   y: H,   c: "rgba(34,197,94,0.04)"   },
      ].forEach(({ x, y, c }) => {
        const cg = ctx.createRadialGradient(x, y, 0, x, y, W * 0.55);
        cg.addColorStop(0, c); cg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
      });

      const vp = { x: W * 0.5, y: H * 0.42 };
      const gScroll = (t * 20) % (H / 14);
      for (let i = -16; i <= 16; i++) {
        const t2 = (i + 16) / 32;
        const center = Math.abs(i) / 16;
        ctx.strokeStyle = `rgba(0,229,255,${0.038 - center * 0.026})`;
        ctx.lineWidth = i % 4 === 0 ? 0.7 : 0.35;
        ctx.beginPath(); ctx.moveTo(W * t2, H); ctx.lineTo(vp.x, vp.y); ctx.stroke();
      }
      for (let j = -2; j <= 18; j++) {
        const gy = vp.y + gScroll + (j / 16) * (H - vp.y);
        if (gy < vp.y || gy > H + 2) continue;
        const frac = (gy - vp.y) / (H - vp.y);
        const halfW2 = frac * (W * 0.52);
        ctx.strokeStyle = j % 4 === 0 ? `rgba(59,130,246,${frac * 0.065})` : `rgba(0,229,255,${frac * 0.09})`;
        ctx.lineWidth = j % 4 === 0 ? 0.8 : 0.4;
        ctx.beginPath(); ctx.moveTo(vp.x - halfW2, gy); ctx.lineTo(vp.x + halfW2, gy); ctx.stroke();
      }

      const vpg = ctx.createRadialGradient(vp.x, vp.y, 0, vp.x, vp.y, 140);
      vpg.addColorStop(0, "rgba(226,18,39,0.12)"); vpg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vpg; ctx.fillRect(vp.x - 140, vp.y - 90, 280, 200);

      [0.06, 0.94].forEach(cx2 => {
        const hx = cx2 * W;
        const amp = 11, freq = 0.044, nodeCount = 26;
        for (let j = 0; j < nodeCount; j++) {
          const fy = (j / nodeCount) * H;
          const p1 = fy * freq + t * 1.1;
          const p2 = p1 + Math.PI;
          const x1 = hx + Math.cos(p1) * amp, x2 = hx + Math.cos(p2) * amp;
          if (j > 0) {
            const pfy = ((j - 1) / nodeCount) * H;
            const pp1 = pfy * freq + t * 1.1, pp2 = pp1 + Math.PI;
            ctx.strokeStyle = "rgba(226,18,39,0.18)"; ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(hx + Math.cos(pp1) * amp, pfy); ctx.lineTo(x1, fy); ctx.stroke();
            ctx.strokeStyle = "rgba(0,229,255,0.18)";
            ctx.beginPath(); ctx.moveTo(hx + Math.cos(pp2) * amp, pfy); ctx.lineTo(x2, fy); ctx.stroke();
          }
          if (j % 3 === 0) {
            ctx.strokeStyle = "rgba(168,85,247,0.16)"; ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(x1, fy); ctx.lineTo(x2, fy); ctx.stroke();
          }
          const alpha = 0.5 + Math.sin(p1 * 2) * 0.3;
          ctx.beginPath(); ctx.arc(x1, fy, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(226,18,39,${alpha})`; ctx.fill();
          ctx.beginPath(); ctx.arc(x2, fy, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,229,255,${alpha})`; ctx.fill();
        }
      });

      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.3; ctx.fill();
      });
      pts.forEach((a, i) => {
        pts.slice(i + 1, i + 5).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 70) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = a.color; ctx.globalAlpha = (1 - d / 70) * 0.1;
            ctx.lineWidth = 0.4; ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;

      const scanY = (t * 50) % H;
      const sg = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
      sg.addColorStop(0, "rgba(0,229,255,0)"); sg.addColorStop(0.5, "rgba(0,229,255,0.045)"); sg.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 8, W, 16);
    }

    frame();
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={cvRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />
  );
}

/* ── Live HUD clock ──────────────────────────────────────────────── */
function HUDClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-US", { hour12: false }));
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toLocaleTimeString("en-US", { hour12: false })), 1000);
    return () => clearInterval(iv);
  }, []);
  return <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(0,229,255,0.55)", letterSpacing: "1.5px" }}>{time}</span>;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN HUD OVERLAY  — 6-panel grid (Panel 7+8 in orb)
══════════════════════════════════════════════════════════════════ */
function CyberHUDOverlay({ onClose }: { onClose: () => void }) {
  const [loaded,           setLoaded]           = useState(false);
  const [focusedPanel,     setFocusedPanel]     = useState<string | null>(null);
  const [focusAnim,        setFocusAnim]        = useState(false);
  const [showNetActivity,  setShowNetActivity]  = useState(false);

  useEffect(() => { const tt = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(tt); }, []);

  const handleExpand = useCallback((id: string) => {
    if (id === "topology") {
      setShowNetActivity(true);
      return;
    }
    setFocusAnim(false); setFocusedPanel(id);
    setTimeout(() => setFocusAnim(true), 30);
  }, []);
  const handleBack = useCallback(() => {
    setFocusAnim(false);
    setTimeout(() => setFocusedPanel(null), 150);
  }, []);

  const focusedMeta = focusedPanel ? [...PANELS,
    { id: "sysmon", label: "SYS MONITOR", icon: Thermometer, color: "#10b981", desc: "System resources" },
    { id: "idle",   label: "IDLE / ACTIVITY", icon: Clock, color: "#f472b6", desc: "Session tracker" },
  ].find(p => p.id === focusedPanel)! : null;

  const wrapper = (children: React.ReactNode) => (
    <>
      <AnimatePresence>
        {showNetActivity && <NetworkActivityPage onClose={() => setShowNetActivity(false)} />}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <HUDBackground />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.007) 2px, rgba(255,255,255,0.007) 4px)" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
        {children}
      </motion.div>
    </>
  );

  /* ── Focused single panel ── */
  if (focusedPanel && focusedMeta) {
    const { color, icon: Icon, label, desc } = focusedMeta;
    return wrapper(
      <>
        <div style={{
          position: "relative", zIndex: 10,
          display: "flex", alignItems: "center", gap: "12px",
          padding: "10px 18px",
          borderBottom: `1px solid ${color}20`,
          background: "rgba(3,3,12,0.9)", backdropFilter: "blur(22px)", flexShrink: 0,
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />

          <motion.button onClick={handleBack} whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "8px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: "9px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px" }}
          >
            <ChevronLeft style={{ width: "11px", height: "11px" }} /> BACK TO HUD
          </motion.button>

          <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.07)" }} />

          <div style={{ width: "34px", height: "34px", borderRadius: "10px",
            background: `radial-gradient(circle, ${color}20, rgba(0,0,0,0.8))`,
            border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 22px ${color}22` }}>
            <Icon style={{ width: "16px", height: "16px", color, filter: `drop-shadow(0 0 8px ${color})` }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "2.5px", textShadow: `0 0 16px ${color}80` }}>{label}</span>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
            </div>
            <div style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "1px" }}>{desc} · FULL SCREEN</div>
          </div>

          <div style={{ flex: 1 }} />
          <HUDClock />

          <button onClick={handleBack}
            style={{ padding: "4px 10px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "8.5px", fontFamily: "monospace" }}>
            <LayoutGrid style={{ width: "9px", height: "9px" }} /> ALL PANELS
          </button>

          <button onClick={onClose}
            style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(226,18,39,0.07)",
              border: "1px solid rgba(226,18,39,0.2)", color: "rgba(255,255,255,0.45)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.24)"; b.style.color = "#fff"; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.07)"; b.style.color = "rgba(255,255,255,0.45)"; }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: focusAnim ? 1 : 0, scale: focusAnim ? 1 : 0.97, y: focusAnim ? 0 : 10 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ position: "relative", zIndex: 5, flex: 1,
            margin: "10px", borderRadius: "16px", overflow: "hidden",
            border: `1px solid ${color}25`,
            boxShadow: `0 0 70px ${color}15, 0 0 0 1px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.04)` }}
        >
          <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${color}dd, ${color}, transparent)` }} />
          <div style={{ flex: 1, height: "calc(100% - 2px)", overflow: "hidden" }}>
            <RenderWidget id={focusedPanel} full={false} />
          </div>
          <Brackets color={color} size={20} thickness={1.8} />
        </motion.div>
      </>
    );
  }

  /* ── 6-panel grid ── */
  return wrapper(
    <>
      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: "12px",
        padding: "10px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(3,3,12,0.9)", backdropFilter: "blur(24px)", flexShrink: 0,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.5), rgba(0,229,255,0.3), rgba(226,18,39,0.5), transparent)" }} />

        <motion.div
          animate={{ boxShadow: ["0 0 16px rgba(226,18,39,0.2)", "0 0 32px rgba(226,18,39,0.42)", "0 0 16px rgba(226,18,39,0.2)"] }}
          transition={{ duration: 2.8, repeat: Infinity }}
          style={{ width: "36px", height: "36px", borderRadius: "11px", flexShrink: 0,
            background: "radial-gradient(circle at 35% 35%, rgba(226,18,39,0.25), rgba(59,130,246,0.12), rgba(0,0,0,0.9))",
            border: "1px solid rgba(226,18,39,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Layers style={{ width: "17px", height: "17px", color: "#e21227", filter: "drop-shadow(0 0 8px #e21227)" }} />
        </motion.div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "3.5px", textShadow: "0 0 20px rgba(226,18,39,0.45)" }}>CYBER HUD</span>
            <motion.span animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e", letterSpacing: "1px", padding: "2px 7px", borderRadius: "4px",
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.28)", boxShadow: "0 0 8px rgba(34,197,94,0.2)" }}>LIVE</motion.span>
            <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(0,229,255,0.4)" }}>v5.0</span>
          </div>
          <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "1.2px", marginTop: "2px" }}>
            6 INTELLIGENCE PANELS · SYS + IDLE LIVE IN ORB
          </div>
        </div>

        {/* Panel dots + SYS/IDLE quick-launch */}
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {PANELS.map((p, i) => (
            <motion.button key={p.id} title={p.label}
              onClick={() => handleExpand(p.id)}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.0, repeat: Infinity, delay: i * 0.2 }}
              whileHover={{ scale: 2.0 }}
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}`, cursor: "pointer", border: "none" }}
            />
          ))}
          <div style={{ width: "1px", height: "12px", background: "rgba(255,255,255,0.1)" }} />
          <motion.button title="SYS MONITOR"
            onClick={() => handleExpand("sysmon")}
            whileHover={{ scale: 2 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", cursor: "pointer", border: "none" }}
          />
          <motion.button title="IDLE / ACTIVITY"
            onClick={() => handleExpand("idle")}
            whileHover={{ scale: 2 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
            style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f472b6", boxShadow: "0 0 6px #f472b6", cursor: "pointer", border: "none" }}
          />
        </div>

        <HUDClock />

        <button onClick={onClose}
          style={{ width: "34px", height: "34px", borderRadius: "9px", background: "rgba(226,18,39,0.07)",
            border: "1px solid rgba(226,18,39,0.2)", color: "rgba(255,255,255,0.4)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.22s" }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.24)"; b.style.color = "#fff"; b.style.boxShadow = "0 0 14px rgba(226,18,39,0.4)"; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.07)"; b.style.color = "rgba(255,255,255,0.4)"; b.style.boxShadow = ""; }}
        >
          <X style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* 3×2 panel grid (6 panels) */}
      <div style={{
        position: "relative", zIndex: 5, flex: 1, display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(2, 1fr)",
        gap: "8px", padding: "10px", overflow: "hidden",
      }}>
        {loaded && PANELS.map((panel, i) => (
          <motion.div key={panel.id}
            initial={{ opacity: 0, y: 20, scale: 0.92, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <WidgetCard id={panel.id} label={panel.label} icon={panel.icon} color={panel.color} desc={panel.desc}
              onExpand={() => handleExpand(panel.id)}>
              <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
                <RenderWidget id={panel.id} />
              </div>
            </WidgetCard>
          </motion.div>
        ))}
      </div>

      {/* Footer — includes SYS + IDLE status */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: "14px",
        padding: "7px 18px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(3,3,12,0.82)", backdropFilter: "blur(14px)", flexShrink: 0,
        overflowX: "auto",
      }}>
        {[
          { icon: Wifi,        label: "FEEDS",    val: "6/6",    color: "#22c55e" },
          { icon: Cpu,         label: "LATENCY",  val: "12ms",   color: "#3b82f6" },
          { icon: Shield,      label: "THREATS",  val: "ACTIVE", color: "#e21227" },
          { icon: Monitor,     label: "PANELS",   val: "6 LIVE", color: "#a855f7" },
          { icon: Zap,         label: "NEURAL",   val: "ONLINE", color: "#f59e0b" },
          { icon: Thermometer, label: "SYS MON",  val: "IN ORB", color: "#10b981" },
          { icon: Clock,       label: "IDLE TRK", val: "IN ORB", color: "#f472b6" },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8 + Math.random(), repeat: Infinity }}>
              <Icon style={{ width: "9px", height: "9px", color }} />
            </motion.div>
            <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "0.7px" }}>{label}</span>
            <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color, textShadow: `0 0 6px ${color}` }}>{val}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.1)", letterSpacing: "1px", flexShrink: 0 }}>
          ESC · CTRL+SHIFT+H · ⊞ EXPAND
        </span>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PUBLIC EXPORT
══════════════════════════════════════════════════════════════════ */
export function CyberWidgetsDock() {
  const [open,          setOpen]          = useState(false);
  const [keyGlow,       setKeyGlow]       = useState(false);
  const [showSatellites, setShowSatellites] = useState(false);
  const [threatFlash,   setThreatFlash]   = useState(false);
  const stats = useLiveStats();

  /* Threat spike flash */
  useEffect(() => {
    if (!stats.thrSpike) return;
    setThreatFlash(true);
    const t = setTimeout(() => setThreatFlash(false), 1000);
    return () => clearTimeout(t);
  }, [stats.thrSpike]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        /* Keyboard glow flash */
        setKeyGlow(true);
        setShowSatellites(true);
        setTimeout(() => setKeyGlow(false), 750);
        setTimeout(() => setShowSatellites(false), 3000);
        setOpen(v => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <ThreatSpikeFlash active={threatFlash} />
      <DockButton
        onClick={() => setOpen(true)}
        keyGlow={keyGlow}
        showSatellites={showSatellites}
        stats={stats}
      />
      <AnimatePresence>
        {open && <CyberHUDOverlay onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
