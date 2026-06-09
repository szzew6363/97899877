import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Globe, Shield, Crosshair, Minimize2, Maximize2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   GLOBAL THREAT MAP — Ultra 3D holographic Earth
   Stars · Deep atmosphere · Volumetric arcs · Particle rings
═══════════════════════════════════════════════════════════════ */

const GLOBE_R = 108;
const W = 280; const H = 280;
const CX = W / 2; const CY = H / 2;
const STOR_KEY = "cyber-globe-pos";

interface GeoNode { id: string; name: string; lat: number; lon: number; type: "attacker" | "target" | "relay"; color: string }
interface AttackArc { srcId: string; dstId: string; progress: number; speed: number; color: string }
interface Star { x: number; y: number; r: number; alpha: number; twinkle: number }
interface Particle { angle: number; radius: number; speed: number; size: number; alpha: number; color: string }

const NODES: GeoNode[] = [
  { id: "ru", name: "Russia",    lat: 55.75, lon:  37.62, type: "attacker", color: "#e21227" },
  { id: "cn", name: "China",     lat: 39.93, lon: 116.39, type: "attacker", color: "#e21227" },
  { id: "ir", name: "Iran",      lat: 35.69, lon:  51.39, type: "attacker", color: "#f59e0b" },
  { id: "kp", name: "N.Korea",   lat: 39.02, lon: 125.75, type: "attacker", color: "#e21227" },
  { id: "br", name: "Brazil",    lat:-15.78, lon: -47.93, type: "relay",    color: "#a78bfa" },
  { id: "in", name: "India",     lat: 28.61, lon:  77.21, type: "relay",    color: "#a78bfa" },
  { id: "us", name: "USA",       lat: 38.90, lon: -77.04, type: "target",   color: "#00e5ff" },
  { id: "gb", name: "UK",        lat: 51.51, lon:  -0.13, type: "target",   color: "#00e5ff" },
  { id: "de", name: "Germany",   lat: 52.52, lon:  13.41, type: "target",   color: "#22c55e" },
  { id: "ua", name: "Ukraine",   lat: 50.45, lon:  30.52, type: "target",   color: "#22c55e" },
  { id: "jp", name: "Japan",     lat: 35.68, lon: 139.69, type: "target",   color: "#22c55e" },
  { id: "sa", name: "KSA",       lat: 24.68, lon:  46.72, type: "relay",    color: "#a78bfa" },
  { id: "sg", name: "Singapore", lat:  1.35, lon: 103.82, type: "relay",    color: "#a78bfa" },
  { id: "au", name: "Australia", lat:-33.87, lon: 151.21, type: "target",   color: "#22c55e" },
  { id: "ca", name: "Canada",    lat: 45.42, lon: -75.70, type: "target",   color: "#00e5ff" },
];

const ARCS_INIT = [
  { srcId: "ru", dstId: "us", speed: 0.0016, color: "#e21227" },
  { srcId: "cn", dstId: "gb", speed: 0.0020, color: "#e21227" },
  { srcId: "ir", dstId: "de", speed: 0.0013, color: "#f59e0b" },
  { srcId: "kp", dstId: "jp", speed: 0.0018, color: "#e21227" },
  { srcId: "ru", dstId: "ua", speed: 0.0022, color: "#ff4d4d" },
  { srcId: "cn", dstId: "us", speed: 0.0012, color: "#f59e0b" },
  { srcId: "br", dstId: "us", speed: 0.0017, color: "#a78bfa" },
  { srcId: "in", dstId: "gb", speed: 0.0014, color: "#a78bfa" },
  { srcId: "ru", dstId: "ca", speed: 0.0011, color: "#e21227" },
  { srcId: "cn", dstId: "au", speed: 0.0015, color: "#f59e0b" },
];

function toRad(d: number) { return d * Math.PI / 180; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function project(lat: number, lon: number, rotLon: number, rotX = 0) {
  const la = toRad(lat), lo = toRad(lon + rotLon);
  const x0 = Math.cos(la) * Math.sin(lo);
  const y0 = Math.sin(la);
  const z0 = Math.cos(la) * Math.cos(lo);
  const rx = toRad(rotX);
  const y = y0 * Math.cos(rx) - z0 * Math.sin(rx);
  const z = y0 * Math.sin(rx) + z0 * Math.cos(rx);
  return { x: CX + GLOBE_R * x0, y: CY - GLOBE_R * y, z };
}

function qBez(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, t: number) {
  const mt = 1 - t;
  return { x: mt*mt*x1 + 2*mt*t*cx + t*t*x2, y: mt*mt*y1 + 2*mt*t*cy + t*t*y2 };
}

// Generate stars once
const STARS: Star[] = Array.from({ length: 220 }, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: Math.random() * 1.2 + 0.2,
  alpha: Math.random() * 0.7 + 0.1,
  twinkle: Math.random() * Math.PI * 2,
}));

// Equatorial particle ring
const PARTICLES: Particle[] = Array.from({ length: 80 }, (_, i) => ({
  angle: (i / 80) * Math.PI * 2,
  radius: GLOBE_R + 8 + Math.random() * 14,
  speed: 0.002 + Math.random() * 0.003,
  size: Math.random() * 1.5 + 0.5,
  alpha: Math.random() * 0.6 + 0.2,
  color: Math.random() > 0.5 ? "#e21227" : "#00e5ff",
}));

export function CyberGlobeWidget() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const frameRef      = useRef<number>(0);
  const rotRef        = useRef(0);
  const rotXRef       = useRef(15);
  const velYRef       = useRef(-0.10);
  const velXRef       = useRef(0);
  const globeDragRef  = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const arcsRef       = useRef<AttackArc[]>(ARCS_INIT.map(a => ({ ...a, progress: Math.random() })));
  const tickRef       = useRef(0);
  const particlesRef  = useRef<Particle[]>(PARTICLES.map(p => ({ ...p })));

  const [attackCount, setAttackCount] = useState(0);
  const [topAttacker, setTopAttacker] = useState("Russia");
  const [minimized, setMinimized]     = useState(false);
  const [threatLevel, setThreatLevel] = useState(87);

  const savedPos = (() => { try { return JSON.parse(localStorage.getItem(STOR_KEY) ?? "null"); } catch { return null; } })();
  const [pos, setPos] = useState<{ x: number; y: number }>(savedPos ?? { x: 12, y: 110 });
  const widgetDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    widgetDragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y };
  }, [pos]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!widgetDragRef.current) return;
    const { startX, startY, ox, oy } = widgetDragRef.current;
    const nx = Math.max(0, Math.min(window.innerWidth - 300, ox + e.clientX - startX));
    const ny = Math.max(0, Math.min(window.innerHeight - 340, oy + e.clientY - startY));
    setPos({ x: nx, y: ny });
    localStorage.setItem(STOR_KEY, JSON.stringify({ x: nx, y: ny }));
  }, []);
  const onPointerUp = useCallback(() => { widgetDragRef.current = null; }, []);

  const onCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    globeDragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    velYRef.current = 0; velXRef.current = 0;
    e.stopPropagation();
  }, []);
  const onCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!globeDragRef.current.dragging) return;
    const dx = e.clientX - globeDragRef.current.lastX;
    const dy = e.clientY - globeDragRef.current.lastY;
    velYRef.current = dx * 0.45;
    velXRef.current = dy * 0.35;
    rotRef.current  += dx * 0.45;
    rotXRef.current  = Math.max(-55, Math.min(55, rotXRef.current + dy * 0.35));
    globeDragRef.current.lastX = e.clientX;
    globeDragRef.current.lastY = e.clientY;
  }, []);
  const onCanvasPointerUp = useCallback(() => {
    globeDragRef.current.dragging = false;
    setTimeout(() => { velYRef.current = -0.10; velXRef.current = 0; }, 2200);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let attackTotal = 0;
    const attackers = ["Russia", "China", "Iran", "N.Korea"];

    function drawFrame() {
      ctx.clearRect(0, 0, W, H);
      const t = tickRef.current;

      // ── Deep space background ──
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, W * 0.8);
      bg.addColorStop(0, "rgba(2,4,12,0.97)");
      bg.addColorStop(0.5, "rgba(1,2,8,0.98)");
      bg.addColorStop(1, "rgba(0,1,4,0.99)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── Stars ──
      STARS.forEach(s => {
        const tw = (Math.sin(t * 0.02 + s.twinkle) + 1) / 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * (0.4 + tw * 0.6)})`;
        ctx.fill();
      });

      // ── Outer atmosphere (multi-ring) ──
      [1.5, 1.35, 1.22, 1.12].forEach((rm, ri) => {
        const atmos = ctx.createRadialGradient(CX, CY, GLOBE_R * (rm - 0.1), CX, CY, GLOBE_R * rm);
        const colors = [
          ["rgba(226,18,39,0.0)", "rgba(226,18,39,0.0)", "rgba(226,18,39,0.015)"],
          ["rgba(0,229,255,0.0)", "rgba(0,229,255,0.012)", "rgba(0,229,255,0.03)"],
          ["rgba(226,18,39,0.0)", "rgba(226,18,39,0.025)", "rgba(226,18,39,0.05)"],
          ["rgba(0,180,255,0.0)", "rgba(0,180,255,0.03)", "rgba(0,180,255,0.08)"],
        ][ri];
        atmos.addColorStop(0, colors[0]); atmos.addColorStop(0.5, colors[1]); atmos.addColorStop(1, colors[2]);
        ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R * rm, 0, Math.PI * 2);
        ctx.fillStyle = atmos; ctx.fill();
      });

      // ── Globe sphere — deep dark ──
      const sph = ctx.createRadialGradient(CX - 32, CY - 32, 0, CX, CY, GLOBE_R);
      sph.addColorStop(0, "rgba(8,14,30,0.96)");
      sph.addColorStop(0.5, "rgba(4,6,16,0.97)");
      sph.addColorStop(0.85, "rgba(1,2,8,0.98)");
      sph.addColorStop(1, "rgba(0,1,4,0.99)");
      ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R, 0, Math.PI * 2);
      ctx.fillStyle = sph; ctx.fill();

      // ── Globe rim highlight ──
      const rim = ctx.createRadialGradient(CX, CY, GLOBE_R * 0.88, CX, CY, GLOBE_R);
      rim.addColorStop(0, "transparent");
      rim.addColorStop(0.7, "rgba(226,18,39,0.04)");
      rim.addColorStop(1, "rgba(226,18,39,0.12)");
      ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      // ── Specular highlight ──
      const spec = ctx.createRadialGradient(CX - 38, CY - 38, 0, CX - 28, CY - 28, GLOBE_R * 0.6);
      spec.addColorStop(0, "rgba(255,255,255,0.04)");
      spec.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      const rot = rotRef.current, rotX = rotXRef.current;

      // ── Grid lines ──
      // Latitude
      for (let lat = -75; lat <= 75; lat += 15) {
        const la = toRad(lat);
        const r2 = GLOBE_R * Math.cos(la);
        const yc = CY - GLOBE_R * Math.sin(la);
        if (r2 < 2) continue;
        ctx.beginPath();
        ctx.ellipse(CX, yc, r2, r2 * 0.12, 0, 0, Math.PI * 2);
        ctx.strokeStyle = lat === 0 ? "rgba(0,229,255,0.2)" : lat % 30 === 0 ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.025)";
        ctx.lineWidth = lat === 0 ? 0.9 : 0.35;
        ctx.stroke();
      }
      // Longitude
      for (let lon = 0; lon < 360; lon += 20) {
        ctx.beginPath(); let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = project(lat, lon, rot, rotX);
          if (p.z < 0) { started = false; continue; }
          if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(0,229,255,0.04)";
        ctx.lineWidth = 0.35; ctx.stroke();
      }

      // ── Equatorial ring glow ──
      ctx.beginPath();
      ctx.ellipse(CX, CY, GLOBE_R + 2, (GLOBE_R + 2) * 0.12, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,229,255,0.2)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(CX, CY, GLOBE_R + 2, (GLOBE_R + 2) * 0.12, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,229,255,0.06)"; ctx.lineWidth = 4; ctx.stroke();

      // ── Orbiting particles ──
      particlesRef.current.forEach(p => {
        p.angle += p.speed;
        const px = CX + p.radius * Math.cos(p.angle);
        const py = CY + p.radius * Math.sin(p.angle) * 0.22;
        const depthAlpha = (Math.sin(p.angle) + 1) / 2;
        ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * depthAlpha;
        ctx.shadowColor = p.color; ctx.shadowBlur = 6;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      // ── Terminator (day/night boundary) ──
      ctx.beginPath(); let ts = false;
      for (let lat = -90; lat <= 90; lat += 3) {
        const p = project(lat, 90 + t * 0.03, rot, rotX);
        if (p.z < -0.1) { ts = false; continue; }
        if (!ts) { ctx.moveTo(p.x, p.y); ts = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(255,180,60,0.1)"; ctx.lineWidth = 1.2; ctx.stroke();

      // ── Attack Arcs ──
      arcsRef.current.forEach(arc => {
        arc.progress += arc.speed;
        if (arc.progress > 1) {
          arc.progress = 0; attackTotal++;
          if (attackTotal % 3 === 0) setTopAttacker(attackers[Math.floor(Math.random() * attackers.length)]);
        }
        const src = NODES.find(n => n.id === arc.srcId)!;
        const dst = NODES.find(n => n.id === arc.dstId)!;
        const ps = project(src.lat, src.lon, rot, rotX);
        const pd = project(dst.lat, dst.lon, rot, rotX);
        if (ps.z < -0.3 && pd.z < -0.3) return;

        const ctrlX = (ps.x + pd.x) / 2;
        const ctrlY = (ps.y + pd.y) / 2 - GLOBE_R * 0.52;

        // Arc trail (gradient fade)
        const segs = 50;
        const visible = ps.z > 0 && pd.z > 0;
        for (let i = 0; i < segs; i++) {
          const t0 = i / segs, t1 = (i + 1) / segs;
          const p0 = qBez(ps.x, ps.y, ctrlX, ctrlY, pd.x, pd.y, t0);
          const p1 = qBez(ps.x, ps.y, ctrlX, ctrlY, pd.x, pd.y, t1);
          const fade = (i / segs) * (visible ? 0.22 : 0.07);
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = arc.color + Math.floor(fade * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 0.8; ctx.stroke();
        }

        // Glowing head packet
        const pkt = qBez(ps.x, ps.y, ctrlX, ctrlY, pd.x, pd.y, arc.progress);
        for (let trail = 0; trail < 8; trail++) {
          const tp = Math.max(0, arc.progress - trail * 0.015);
          const gp = qBez(ps.x, ps.y, ctrlX, ctrlY, pd.x, pd.y, tp);
          const sz = trail === 0 ? 3 : 1.5 - trail * 0.15;
          ctx.beginPath(); ctx.arc(gp.x, gp.y, Math.max(0.3, sz), 0, Math.PI * 2);
          ctx.fillStyle = arc.color + Math.floor((1 - trail / 8) * 220).toString(16).padStart(2, "0");
          ctx.shadowColor = arc.color; ctx.shadowBlur = trail === 0 ? 14 : 4;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      });

      // ── Geo Nodes ──
      NODES.forEach(node => {
        const p = project(node.lat, node.lon, rot, rotX);
        if (p.z < 0) return;
        const pulse = (Math.sin(t * 0.05 + node.lon * 0.04) + 1) / 2;

        // Outer pulse rings (attacker nodes only)
        if (node.type === "attacker") {
          [8, 14].forEach((r, ri) => {
            ctx.beginPath(); ctx.arc(p.x, p.y, r + pulse * 4, 0, Math.PI * 2);
            ctx.strokeStyle = node.color + (ri === 0 ? "30" : "18");
            ctx.lineWidth = ri === 0 ? 1 : 0.5; ctx.stroke();
          });
        }

        // Glow halo
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
        halo.addColorStop(0, node.color + "60");
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();

        // Node dot
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color; ctx.shadowBlur = 14;
        ctx.fill(); ctx.shadowBlur = 0;

        // Inner bright core
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff"; ctx.fill();

        // Label
        if (p.z > 0.25) {
          ctx.font = "bold 7px 'SF Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = node.type === "attacker" ? "rgba(226,18,39,0.95)" :
                          node.type === "target" ? "rgba(0,229,255,0.9)" : "rgba(167,139,250,0.85)";
          ctx.shadowColor = node.color; ctx.shadowBlur = 6;
          ctx.fillText(node.name, p.x, p.y - 8); ctx.shadowBlur = 0;
        }
      });

      // ── Globe border with glow ──
      ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(226,18,39,0.3)"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(226,18,39,0.08)"; ctx.lineWidth = 3; ctx.stroke();

      // ── Rotating scanner sweep ──
      const sweepAngle = (t * 0.018) % (Math.PI * 2);
      const sweepGrad = ctx.createLinearGradient(CX, CY, CX + Math.cos(sweepAngle) * GLOBE_R, CY + Math.sin(sweepAngle) * GLOBE_R);
      sweepGrad.addColorStop(0, "rgba(0,229,255,0.0)");
      sweepGrad.addColorStop(1, "rgba(0,229,255,0.04)");
      ctx.save();
      ctx.beginPath(); ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, GLOBE_R, sweepAngle, sweepAngle + 0.6);
      ctx.closePath();
      ctx.fillStyle = sweepGrad; ctx.globalAlpha = 0.4; ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;

      ctx.textAlign = "left";
    }

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      tickRef.current++;
      if (!globeDragRef.current.dragging) {
        rotRef.current  += velYRef.current;
        rotXRef.current += velXRef.current;
        rotXRef.current  = Math.max(-55, Math.min(55, rotXRef.current));
        velYRef.current  += (-0.10 - velYRef.current) * 0.035;
        velXRef.current  *= 0.92;
      }
      drawFrame();
      if (tickRef.current % 28 === 0) {
        setAttackCount(c => c + Math.floor(Math.random() * 4 + 1));
        setThreatLevel(l => Math.max(60, Math.min(99, l + Math.floor(Math.random() * 6 - 2))));
      }
    }

    frame();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const threatColor = threatLevel > 90 ? "#e21227" : threatLevel > 75 ? "#f59e0b" : "#22c55e";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 35, width: W + 4, userSelect: "none" }}
    >
      {/* ── Header ── */}
      <div
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "7px 10px",
          background: "linear-gradient(135deg, rgba(6,2,12,0.99), rgba(10,4,18,0.98))",
          borderTop: "1px solid rgba(226,18,39,0.4)",
          borderLeft: "1px solid rgba(226,18,39,0.15)",
          borderRight: "1px solid rgba(226,18,39,0.15)",
          borderRadius: "12px 12px 0 0", cursor: "grab",
          boxShadow: "0 0 20px rgba(226,18,39,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Blinking threat dot */}
        <motion.div
          animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 8px #e21227", flexShrink: 0 }}
        />
        <Globe style={{ width: 10, height: 10, color: "#e21227", flexShrink: 0 }} />
        <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 800, color: "#e21227", letterSpacing: "1.8px", flex: 1 }}>
          GLOBAL THREAT MAP
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "7px", fontFamily: "monospace", color: "#22c55e", letterSpacing: "1px" }}>● LIVE</span>
          <button
            onClick={() => setMinimized(v => !v)} onPointerDown={e => e.stopPropagation()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0 }}
          >
            {minimized ? <Maximize2 style={{ width: 10, height: 10 }} /> : <Minimize2 style={{ width: 10, height: 10 }} />}
          </button>
        </div>
      </div>

      {/* ── Globe canvas ── */}
      {!minimized && (
        <div style={{
          background: "rgba(2,2,8,0.99)",
          border: "1px solid rgba(226,18,39,0.12)",
          borderTop: "none", position: "relative", overflow: "hidden",
        }}>
          {/* Top scan line accent */}
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.6) 50%, transparent)" }} />

          <canvas
            ref={canvasRef} width={W} height={H} style={{ display: "block", cursor: "grab" }}
            onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp} onPointerLeave={onCanvasPointerUp}
          />

          {/* HUD corners */}
          <div style={{ position: "absolute", top: 5, left: 5, width: 14, height: 14, borderTop: "2px solid rgba(226,18,39,0.7)", borderLeft: "2px solid rgba(226,18,39,0.7)" }} />
          <div style={{ position: "absolute", top: 5, right: 5, width: 14, height: 14, borderTop: "2px solid rgba(0,229,255,0.5)", borderRight: "2px solid rgba(0,229,255,0.5)" }} />
          <div style={{ position: "absolute", bottom: 38, left: 5, width: 14, height: 14, borderBottom: "2px solid rgba(0,229,255,0.5)", borderLeft: "2px solid rgba(0,229,255,0.5)" }} />
          <div style={{ position: "absolute", bottom: 38, right: 5, width: 14, height: 14, borderBottom: "2px solid rgba(226,18,39,0.7)", borderRight: "2px solid rgba(226,18,39,0.7)" }} />

          {/* Drag hint */}
          <div style={{ position: "absolute", bottom: 40, right: 8, fontSize: "6px", fontFamily: "monospace", color: "rgba(0,229,255,0.2)", letterSpacing: "0.5px", pointerEvents: "none" }}>
            DRAG TO ROTATE
          </div>

          {/* Threat level bar */}
          <div style={{ position: "absolute", top: 10, left: 10, right: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.8px" }}>THREAT LEVEL</span>
              <span style={{ fontSize: "7px", fontFamily: "monospace", color: threatColor, fontWeight: 700 }}>{threatLevel}%</span>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${threatLevel}%` }} transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{ height: "100%", background: `linear-gradient(90deg, #22c55e, ${threatColor})`, boxShadow: `0 0 6px ${threatColor}` }}
              />
            </div>
          </div>

          {/* Stats bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 10px", background: "rgba(4,4,12,0.98)",
            borderTop: "1px solid rgba(255,255,255,0.04)", height: 36,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Crosshair style={{ width: 9, height: 9, color: "#e21227" }} />
              <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>ATTACKS:</span>
              <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 800, color: "#e21227" }}>
                {(247812 + attackCount).toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Shield style={{ width: 9, height: 9, color: "#22c55e" }} />
              <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>TOP:</span>
              <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 800, color: "#f59e0b" }}>{topAttacker}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {!minimized && (
        <div style={{
          display: "flex", gap: "14px", padding: "6px 10px",
          background: "rgba(4,4,12,0.98)",
          border: "1px solid rgba(226,18,39,0.1)", borderTop: "none",
          borderRadius: "0 0 12px 12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
        }}>
          {[{ color: "#e21227", label: "Attacker" }, { color: "#00e5ff", label: "Target" }, { color: "#a78bfa", label: "Relay" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
              <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{l.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)" }}>
            {NODES.length} NODES
          </div>
        </div>
      )}
    </motion.div>
  );
}
