import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Globe, Shield, Crosshair, X, Minimize2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   CYBER GLOBE — 3D rotating Earth with live attack arcs
   Canvas-based orthographic projection, zero dependencies.
   Shows simulated global cyberattack origin/target nodes.
═══════════════════════════════════════════════════════════════ */

const GLOBE_R = 105;
const W = 260;
const H = 260;
const CX = W / 2;
const CY = H / 2;

interface GeoNode {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: "attacker" | "target" | "relay";
  color: string;
}

interface AttackArc {
  srcId: string;
  dstId: string;
  progress: number;
  speed: number;
  color: string;
  active: boolean;
}

const NODES: GeoNode[] = [
  { id: "ru",  name: "Russia",      lat: 55.75, lon:  37.62, type: "attacker", color: "#e21227" },
  { id: "cn",  name: "China",       lat: 39.93, lon: 116.39, type: "attacker", color: "#e21227" },
  { id: "ir",  name: "Iran",        lat: 35.69, lon:  51.39, type: "attacker", color: "#f59e0b" },
  { id: "kp",  name: "N.Korea",     lat: 39.02, lon: 125.75, type: "attacker", color: "#e21227" },
  { id: "br",  name: "Brazil",      lat:-15.78, lon: -47.93, type: "relay",    color: "#a78bfa" },
  { id: "in",  name: "India",       lat: 28.61, lon:  77.21, type: "relay",    color: "#a78bfa" },
  { id: "us",  name: "USA",         lat: 38.90, lon: -77.04, type: "target",   color: "#00e5ff" },
  { id: "gb",  name: "UK",          lat: 51.51, lon:  -0.13, type: "target",   color: "#00e5ff" },
  { id: "de",  name: "Germany",     lat: 52.52, lon:  13.41, type: "target",   color: "#22c55e" },
  { id: "ua",  name: "Ukraine",     lat: 50.45, lon:  30.52, type: "target",   color: "#22c55e" },
  { id: "jp",  name: "Japan",       lat: 35.68, lon: 139.69, type: "target",   color: "#22c55e" },
  { id: "sa",  name: "KSA",         lat: 24.68, lon:  46.72, type: "relay",    color: "#a78bfa" },
  { id: "sg",  name: "Singapore",   lat:  1.35, lon: 103.82, type: "relay",    color: "#a78bfa" },
];

const INITIAL_ARCS: Omit<AttackArc, "progress">[] = [
  { srcId: "ru", dstId: "us", speed: 0.0018, color: "#e21227", active: true },
  { srcId: "cn", dstId: "gb", speed: 0.0022, color: "#e21227", active: true },
  { srcId: "ir", dstId: "de", speed: 0.0015, color: "#f59e0b", active: true },
  { srcId: "kp", dstId: "jp", speed: 0.0020, color: "#e21227", active: true },
  { srcId: "ru", dstId: "ua", speed: 0.0025, color: "#ff4d4d", active: true },
  { srcId: "cn", dstId: "us", speed: 0.0014, color: "#f59e0b", active: true },
  { srcId: "br", dstId: "us", speed: 0.0019, color: "#a78bfa", active: true },
  { srcId: "in", dstId: "gb", speed: 0.0016, color: "#a78bfa", active: true },
];

const STOR_KEY = "cyber-globe-pos";

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function project(lat: number, lon: number, rotLon: number): { x: number; y: number; z: number } {
  const la = toRad(lat);
  const lo = toRad(lon + rotLon);
  return {
    x: CX + GLOBE_R * Math.cos(la) * Math.sin(lo),
    y: CY - GLOBE_R * Math.sin(la),
    z: Math.cos(la) * Math.cos(lo), // z>0 = visible
  };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function quadBezier(
  x1: number, y1: number,
  cx: number, cy: number,
  x2: number, y2: number,
  t: number
) {
  const mt = 1 - t;
  return {
    x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
    y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
  };
}

export function CyberGlobeWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const rotRef = useRef(0);
  const arcsRef = useRef<AttackArc[]>(INITIAL_ARCS.map(a => ({ ...a, progress: Math.random() })));
  const tickRef = useRef(0);
  const [attackCount, setAttackCount] = useState(0);
  const [topAttacker, setTopAttacker] = useState("Russia");
  const [minimized, setMinimized] = useState(false);

  const savedPos = (() => {
    try { return JSON.parse(localStorage.getItem(STOR_KEY) ?? "null"); } catch { return null; }
  })();
  const [pos, setPos] = useState<{ x: number; y: number }>(savedPos ?? { x: 12, y: 120 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = (e.currentTarget as HTMLElement);
    el.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y };
  }, [pos]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { startX, startY, ox, oy } = dragRef.current;
    const nx = Math.max(0, Math.min(window.innerWidth - 280, ox + e.clientX - startX));
    const ny = Math.max(0, Math.min(window.innerHeight - 320, oy + e.clientY - startY));
    setPos({ x: nx, y: ny });
    localStorage.setItem(STOR_KEY, JSON.stringify({ x: nx, y: ny }));
  }, []);
  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let attackTotal = 0;
    const attackers = ["Russia", "China", "Iran", "N.Korea", "Brazil"];

    function drawGlobe() {
      ctx.clearRect(0, 0, W, H);

      // ── Atmosphere glow ──
      const atmos = ctx.createRadialGradient(CX, CY, GLOBE_R * 0.8, CX, CY, GLOBE_R * 1.2);
      atmos.addColorStop(0, "rgba(226,18,39,0.0)");
      atmos.addColorStop(0.7, "rgba(226,18,39,0.03)");
      atmos.addColorStop(1, "rgba(0,229,255,0.06)");
      ctx.beginPath();
      ctx.arc(CX, CY, GLOBE_R * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = atmos;
      ctx.fill();

      // ── Globe sphere ──
      const sphereGrad = ctx.createRadialGradient(CX - 30, CY - 30, 0, CX, CY, GLOBE_R);
      sphereGrad.addColorStop(0, "rgba(12,16,28,0.95)");
      sphereGrad.addColorStop(0.6, "rgba(6,8,16,0.97)");
      sphereGrad.addColorStop(1, "rgba(2,3,8,0.98)");
      ctx.beginPath();
      ctx.arc(CX, CY, GLOBE_R, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // ── Globe border ──
      ctx.beginPath();
      ctx.arc(CX, CY, GLOBE_R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(226,18,39,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const rot = rotRef.current;

      // ── Latitude lines ──
      [-60, -30, 0, 30, 60].forEach(lat => {
        const la = toRad(lat);
        const r2 = GLOBE_R * Math.cos(la);
        const yc = CY - GLOBE_R * Math.sin(la);
        if (r2 < 1) return;
        ctx.beginPath();
        ctx.ellipse(CX, yc, r2, r2 * 0.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = lat === 0 ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.04)";
        ctx.lineWidth = lat === 0 ? 0.8 : 0.4;
        ctx.stroke();
      });

      // ── Longitude lines ──
      for (let lon = 0; lon < 360; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 4) {
          const p = project(lat, lon, rot);
          if (p.z < 0) { started = false; continue; }
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.035)";
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // ── Terminator line (day/night boundary) ──
      ctx.beginPath();
      let tStarted = false;
      for (let lat = -90; lat <= 90; lat += 3) {
        const p = project(lat, 90, rot); // 90° offset for terminator
        if (p.z < -0.1) { tStarted = false; continue; }
        if (!tStarted) { ctx.moveTo(p.x, p.y); tStarted = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(255,200,100,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Attack Arcs ──
      arcsRef.current.forEach(arc => {
        arc.progress += arc.speed;
        if (arc.progress > 1) {
          arc.progress = 0;
          attackTotal++;
          if (attackTotal % 4 === 0) {
            setTopAttacker(attackers[Math.floor(Math.random() * attackers.length)]);
          }
        }

        const src = NODES.find(n => n.id === arc.srcId)!;
        const dst = NODES.find(n => n.id === arc.dstId)!;
        const ps = project(src.lat, src.lon, rot);
        const pd = project(dst.lat, dst.lon, rot);

        // Skip if both endpoints are hidden
        if (ps.z < -0.2 && pd.z < -0.2) return;

        // Lifted control point for arc height
        const ctrlX = (ps.x + pd.x) / 2;
        const ctrlY = (ps.y + pd.y) / 2 - GLOBE_R * 0.45;

        // Draw arc trail
        const segments = 40;
        const gradAlpha = ps.z > 0 && pd.z > 0 ? 0.25 : 0.08;
        for (let i = 0; i < segments; i++) {
          const t0 = i / segments;
          const t1 = (i + 1) / segments;
          const p0 = quadBezier(ps.x, ps.y, ctrlX, ctrlY, pd.x, pd.y, t0);
          const p1 = quadBezier(ps.x, ps.y, ctrlX, ctrlY, pd.x, pd.y, t1);
          const alpha = gradAlpha * (i / segments) * 0.7;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = arc.color.replace(")", `, ${alpha})`).replace("rgb", "rgba").replace("#", "rgba(") || `rgba(226,18,39,${alpha})`;
          ctx.strokeStyle = `${arc.color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Draw traveling packet
        const pkt = quadBezier(ps.x, ps.y, ctrlX, ctrlY, pd.x, pd.y, arc.progress);
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = arc.color;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Glow trail behind packet
        for (let t = 0; t < 5; t++) {
          const tp = Math.max(0, arc.progress - t * 0.012);
          const gp = quadBezier(ps.x, ps.y, ctrlX, ctrlY, pd.x, pd.y, tp);
          ctx.beginPath();
          ctx.arc(gp.x, gp.y, 1, 0, Math.PI * 2);
          ctx.fillStyle = arc.color + Math.floor((1 - t / 5) * 100).toString(16).padStart(2, "0");
          ctx.fill();
        }
      });

      // ── Geo Nodes ──
      NODES.forEach(node => {
        const p = project(node.lat, node.lon, rot);
        if (p.z < 0) return; // behind globe

        // Pulse ring (animate with tick)
        const pulse = (Math.sin(tickRef.current * 0.06 + node.lon * 0.05) + 1) / 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = node.color + "40";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label (only for visible nodes near front)
        if (p.z > 0.3) {
          ctx.font = "bold 7px 'SF Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = node.type === "attacker" ? "rgba(226,18,39,0.9)" :
                          node.type === "target" ? "rgba(0,229,255,0.9)" : "rgba(167,139,250,0.8)";
          ctx.fillText(node.name, p.x, p.y - 7);
        }
      });

      // ── Crosshair at target ──
      ctx.textAlign = "left";
    }

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      tickRef.current++;
      rotRef.current -= 0.12; // slow rotation
      drawGlobe();
      if (tickRef.current % 30 === 0) {
        setAttackCount(c => c + Math.floor(Math.random() * 3 + 1));
      }
    }

    frame();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 35,
        width: "264px",
        userSelect: "none",
      }}
    >
      {/* Header — drag handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "7px 10px",
          background: "linear-gradient(90deg, rgba(8,8,16,0.98), rgba(12,12,24,0.96))",
          borderTop: "1px solid rgba(226,18,39,0.25)",
          borderLeft: "1px solid rgba(226,18,39,0.12)",
          borderRight: "1px solid rgba(226,18,39,0.12)",
          borderRadius: "12px 12px 0 0",
          cursor: "grab",
        }}
      >
        <Globe style={{ width: "11px", height: "11px", color: "#e21227", flexShrink: 0 }} />
        <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 800, color: "#e21227", letterSpacing: "1.5px" }}>
          GLOBAL THREAT MAP
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "8px", fontFamily: "monospace", color: "#22c55e" }}>LIVE</span>
          <button
            onClick={() => setMinimized(v => !v)}
            onPointerDown={e => e.stopPropagation()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", padding: 0 }}
          >
            <Minimize2 style={{ width: "10px", height: "10px" }} />
          </button>
        </div>
      </div>

      {/* Canvas globe */}
      {!minimized && (
        <div style={{
          background: "rgba(4,4,10,0.97)",
          border: "1px solid rgba(226,18,39,0.1)",
          borderTop: "none",
          overflow: "hidden",
          position: "relative",
        }}>
          <canvas ref={canvasRef} width={W} height={H} style={{ display: "block" }} />

          {/* Corner HUD decorations */}
          <div style={{ position: "absolute", top: "6px", left: "6px", width: "12px", height: "12px", borderTop: "1.5px solid rgba(226,18,39,0.6)", borderLeft: "1.5px solid rgba(226,18,39,0.6)" }} />
          <div style={{ position: "absolute", top: "6px", right: "6px", width: "12px", height: "12px", borderTop: "1.5px solid rgba(0,229,255,0.4)", borderRight: "1.5px solid rgba(0,229,255,0.4)" }} />
          <div style={{ position: "absolute", bottom: "36px", left: "6px", width: "12px", height: "12px", borderBottom: "1.5px solid rgba(0,229,255,0.4)", borderLeft: "1.5px solid rgba(0,229,255,0.4)" }} />
          <div style={{ position: "absolute", bottom: "36px", right: "6px", width: "12px", height: "12px", borderBottom: "1.5px solid rgba(226,18,39,0.6)", borderRight: "1.5px solid rgba(226,18,39,0.6)" }} />

          {/* Stats bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "5px 10px",
            background: "rgba(8,8,16,0.96)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            height: "34px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Crosshair style={{ width: "9px", height: "9px", color: "#e21227" }} />
              <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>
                ATTACKS:
              </span>
              <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: "#e21227" }}>
                {(247812 + attackCount).toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Shield style={{ width: "9px", height: "9px", color: "#22c55e" }} />
              <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>
                TOP:
              </span>
              <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: "#f59e0b" }}>
                {topAttacker}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {!minimized && (
        <div style={{
          display: "flex", gap: "12px", padding: "5px 10px",
          background: "rgba(6,6,14,0.97)",
          border: "1px solid rgba(226,18,39,0.1)",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
        }}>
          {[
            { color: "#e21227", label: "Attacker" },
            { color: "#00e5ff", label: "Target" },
            { color: "#a78bfa", label: "Relay" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
              <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
