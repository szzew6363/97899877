import { useCallback, useEffect, useRef, useState } from "react";
import { GripHorizontal, ChevronUp, ChevronDown, Radio, AlertTriangle, Activity, Wifi, Cpu } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════
   NET TOPOLOGY — True 3D Holographic Node Graph
   Real perspective projection · Floating nodes · Depth glow
═══════════════════════════════════════════════════════════════════ */

const W = 320; const H = 240;
const FOV = 380; const VIEWER_Z = 350;

interface NetNode3D {
  id: string; label: string; sublabel?: string;
  x: number; y: number; z: number;
  color: string;
  shape: "circle" | "diamond" | "hexagon" | "square";
  external?: boolean; size?: number;
  floatPhase: number; floatAmp: number;
}

interface NetLink { a: string; b: string }
interface Packet { linkIdx: number; progress: number; speed: number; dir: number }
interface AttackArc { src: string; dst: string; progress: number; speed: number; color: string; trail: { p: number; o: number }[] }
interface NodeState { status: "ok" | "warn" | "compromised"; pulsePhase: number; alertTimer: number }

// 3D node positions — spread in XYZ space
const NODES: NetNode3D[] = [
  { id: "inet", label: "INTERNET",  x:  0,   y: -80,  z: -30, color: "#555555", shape: "diamond", external: true, size: 7,  floatPhase: 0,    floatAmp: 3 },
  { id: "fw",   label: "FIREWALL",  x:  0,   y: -40,  z:  0,  color: "#22c55e", shape: "diamond", size: 12, floatPhase: 0.5, floatAmp: 4 },
  { id: "rt",   label: "ROUTER",    x:  0,   y:  0,   z: 10,  color: "#00e5ff", shape: "circle",  size: 11, floatPhase: 1.0, floatAmp: 5 },
  { id: "h1",   label: "HOST-01",   x: -80,  y:  50,  z: -20, color: "#3b82f6", shape: "square",  size: 8,  floatPhase: 1.5, floatAmp: 3 },
  { id: "h2",   label: "HOST-02",   x: -28,  y:  65,  z:  20, color: "#3b82f6", shape: "square",  size: 8,  floatPhase: 2.0, floatAmp: 4 },
  { id: "h3",   label: "HOST-03",   x:  28,  y:  65,  z:  20, color: "#3b82f6", shape: "square",  size: 8,  floatPhase: 2.5, floatAmp: 4 },
  { id: "h4",   label: "HOST-04",   x:  80,  y:  50,  z: -20, color: "#3b82f6", shape: "square",  size: 8,  floatPhase: 3.0, floatAmp: 3 },
  { id: "db",   label: "DB-SRV",    x:  0,   y:  80,  z: -10, color: "#a78bfa", shape: "hexagon", size: 11, floatPhase: 3.5, floatAmp: 5 },
  { id: "atk",  label: "ATTACKER",  x: -120, y: -70,  z: -40, color: "#e21227", shape: "diamond", external: true, size: 9, floatPhase: 0.8, floatAmp: 6 },
  { id: "c2",   label: "C2-SERVER", x:  120, y: -70,  z: -40, color: "#ff6b35", shape: "diamond", external: true, size: 9, floatPhase: 1.4, floatAmp: 6 },
];

const LINKS: NetLink[] = [
  { a: "inet", b: "fw" }, { a: "fw", b: "rt" },
  { a: "rt", b: "h1" }, { a: "rt", b: "h2" }, { a: "rt", b: "h3" }, { a: "rt", b: "h4" },
  { a: "rt", b: "db" },
];

const ATTACK_TARGETS = ["h1","h2","h3","h4","db","fw","rt"];
const GRID_STARS = Array.from({ length: 40 }, () => ({
  x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.9 + 0.2, a: Math.random() * 0.5,
}));

function getNode(id: string) { return NODES.find(n => n.id === id)!; }

function project3D(x: number, y: number, z: number, t: number) {
  const node = { x, y, z };
  // Apply slow global rotation
  const angle = t * 0.003;
  const rx = node.x * Math.cos(angle) - node.z * Math.sin(angle);
  const rz = node.x * Math.sin(angle) + node.z * Math.cos(angle);
  const scale = FOV / (FOV + rz + VIEWER_Z);
  return {
    sx: W / 2 + rx * scale,
    sy: H / 2 + node.y * scale,
    scale,
    depth: rz,
  };
}

function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
            : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
  ctx.closePath();
}

function loadPos(): { x: number; y: number } {
  try { const r = localStorage.getItem("net-topo-pos"); if (r) return JSON.parse(r); } catch {}
  return { x: 8, y: window.innerHeight - 320 };
}

export function NetworkTopologyWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos]             = useState<{ x: number; y: number }>(loadPos);
  const [threatCount, setThreatCount] = useState(0);
  const [pps, setPps]             = useState(0);
  const dragRef   = useRef({ dragging: false, ox: 0, oy: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const packetsRef  = useRef<Packet[]>([]);
  const arcsRef     = useRef<AttackArc[]>([]);
  const nodeStateRef = useRef<Record<string, NodeState>>({});
  const tickRef   = useRef(0);
  const ppsRef    = useRef(0);
  const manualRotRef = useRef({ ry: 0, dragging: false, lastX: 0, lastY: 0, vy: 0 });

  useEffect(() => {
    NODES.forEach(n => {
      nodeStateRef.current[n.id] = { status: "ok", pulsePhase: Math.random() * Math.PI * 2, alertTimer: 0 };
    });
  }, []);

  useEffect(() => {
    function spawnAttack() {
      const from = Math.random() > 0.55 ? "c2" : "atk";
      const dst = ATTACK_TARGETS[Math.floor(Math.random() * ATTACK_TARGETS.length)];
      arcsRef.current.push({
        src: from, dst, progress: 0,
        speed: 0.0025 + Math.random() * 0.003,
        color: from === "atk" ? "#e21227" : "#ff6b35", trail: [],
      });
      setThreatCount(c => c + 1);
    }
    spawnAttack();
    const id = setInterval(spawnAttack, 3500 + Math.random() * 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => { setPps(ppsRef.current); ppsRef.current = 0; }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (collapsed) { cancelAnimationFrame(frameRef.current); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    if (packetsRef.current.length === 0) {
      LINKS.forEach((_, li) => {
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
          packetsRef.current.push({ linkIdx: li, progress: Math.random(), speed: 0.004 + Math.random() * 0.005, dir: 1 });
        }
      });
    }

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;
      const mr = manualRotRef.current;
      if (!mr.dragging) { mr.ry += mr.vy; mr.vy *= 0.93; }

      ctx.clearRect(0, 0, W, H);

      // ── Background ──
      const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
      bg.addColorStop(0, "rgba(2,4,14,0.98)");
      bg.addColorStop(1, "rgba(0,1,6,0.99)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Background stars
      GRID_STARS.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill();
      });

      // Grid (perspective) — floor
      ctx.save();
      ctx.strokeStyle = "rgba(0,229,255,0.04)"; ctx.lineWidth = 0.5;
      for (let gx = -160; gx <= 160; gx += 40) {
        const p1 = project3D(gx, 110, -80, t + mr.ry * 300);
        const p2 = project3D(gx, 110, 80, t + mr.ry * 300);
        ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke();
      }
      for (let gz = -80; gz <= 80; gz += 40) {
        const p1 = project3D(-160, 110, gz, t + mr.ry * 300);
        const p2 = project3D(160, 110, gz, t + mr.ry * 300);
        ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke();
      }
      ctx.restore();

      // Get projected node positions
      const projNodes: Record<string, { sx: number; sy: number; scale: number; depth: number; fy: number }> = {};
      NODES.forEach(node => {
        const floatY = Math.sin(t * 0.04 + node.floatPhase) * node.floatAmp;
        const p = project3D(node.x, node.y + floatY, node.z, t + mr.ry * 300);
        projNodes[node.id] = { ...p, fy: floatY };
      });

      // ── Links (with depth fade) ──
      LINKS.forEach(link => {
        const pa = projNodes[link.a]; const pb = projNodes[link.b];
        const ns = nodeStateRef.current[link.a]; const nd = nodeStateRef.current[link.b];
        const alert = ns?.status !== "ok" || nd?.status !== "ok";
        const lColor = alert ? "#e21227" : "#00e5ff";
        const avgDepth = (pa.depth + pb.depth) / 2;
        const depthAlpha = Math.max(0.03, 0.18 - avgDepth * 0.0008);

        ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = alert ? `rgba(226,18,39,${depthAlpha * 2})` : `rgba(0,229,255,${depthAlpha})`;
        ctx.lineWidth = alert ? 1 : 0.8;
        ctx.setLineDash([4, 8]); ctx.stroke(); ctx.setLineDash([]);

        // Link glow
        if (alert) {
          ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy);
          ctx.strokeStyle = `rgba(226,18,39,0.06)`; ctx.lineWidth = 4; ctx.stroke();
        }
      });

      // ── Packets ──
      packetsRef.current.forEach((pkt, i) => {
        pkt.progress += pkt.speed;
        if (pkt.progress > 1) { pkt.progress = 0; ppsRef.current++; }
        const link = LINKS[pkt.linkIdx];
        const pa = projNodes[link.a]; const pb = projNodes[link.b];
        const px = pa.sx + (pb.sx - pa.sx) * pkt.progress;
        const py = pa.sy + (pb.sy - pa.sy) * pkt.progress;
        const sc = pa.scale + (pb.scale - pa.scale) * pkt.progress;
        const ns = nodeStateRef.current[link.a];
        const pColor = ns?.status === "compromised" ? "#e21227" : "#00e5ff";
        ctx.beginPath(); ctx.arc(px, py, sc * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pColor; ctx.shadowColor = pColor; ctx.shadowBlur = 8;
        ctx.fill(); ctx.shadowBlur = 0;
        packetsRef.current[i] = pkt;
      });

      // ── Attack arcs ──
      arcsRef.current = arcsRef.current.filter(arc => arc.progress <= 1.1);
      arcsRef.current.forEach(arc => {
        arc.progress += arc.speed;
        arc.trail.push({ p: arc.progress, o: 1 });
        arc.trail = arc.trail.map(tr => ({ ...tr, o: tr.o * 0.85 })).filter(tr => tr.o > 0.02);

        const pn = projNodes[arc.src]; const pd = projNodes[arc.dst];
        const mx = (pn.sx + pd.sx) / 2; const my = Math.min(pn.sy, pd.sy) - 55;

        arc.trail.forEach(tr => {
          const tp = tr.p;
          const tx = (1-tp)*(1-tp)*pn.sx + 2*(1-tp)*tp*mx + tp*tp*pd.sx;
          const ty = (1-tp)*(1-tp)*pn.sy + 2*(1-tp)*tp*my + tp*tp*pd.sy;
          ctx.beginPath(); ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = arc.color; ctx.globalAlpha = tr.o * 0.9;
          ctx.shadowColor = arc.color; ctx.shadowBlur = 10;
          ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        });

        const tp = Math.min(arc.progress, 1);
        const hx = (1-tp)*(1-tp)*pn.sx + 2*(1-tp)*tp*mx + tp*tp*pd.sx;
        const hy = (1-tp)*(1-tp)*pn.sy + 2*(1-tp)*tp*my + tp*tp*pd.sy;
        ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fillStyle = arc.color; ctx.shadowColor = arc.color; ctx.shadowBlur = 18;
        ctx.fill(); ctx.shadowBlur = 0;

        if (arc.progress >= 1) {
          const ns2 = nodeStateRef.current[arc.dst];
          if (ns2 && ns2.status === "ok") { ns2.status = "compromised"; ns2.alertTimer = 200; }
        }
      });

      // Update alert timers
      Object.values(nodeStateRef.current).forEach(ns => {
        ns.pulsePhase += 0.055;
        if (ns.alertTimer > 0) { ns.alertTimer--; if (ns.alertTimer === 0) ns.status = "ok"; }
      });

      // ── Nodes (sorted by depth — far first) ──
      const sortedNodes = NODES.map(n => ({ n, p: projNodes[n.id] }))
        .sort((a, b) => b.p.depth - a.p.depth);

      sortedNodes.forEach(({ n: node, p }) => {
        const ns = nodeStateRef.current[node.id];
        const status = ns?.status ?? "ok";
        let baseColor = node.color;
        if (status === "compromised") baseColor = "#e21227";
        else if (status === "warn") baseColor = "#f59e0b";

        const sz = (node.size ?? 9) * p.scale;
        const pulse = ns ? (Math.sin(ns.pulsePhase) * 0.35 + 0.65) : 0.8;
        const depthAlpha = Math.max(0.3, Math.min(1, 0.7 + p.depth * -0.004));

        // Shadow under node (3D ground effect)
        if (!node.external) {
          const shadow = ctx.createRadialGradient(p.sx, p.sy + sz * 2, 0, p.sx, p.sy + sz * 2, sz * 4);
          shadow.addColorStop(0, `rgba(0,0,0,0.4)`); shadow.addColorStop(1, "transparent");
          ctx.fillStyle = shadow;
          ctx.beginPath(); ctx.ellipse(p.sx, p.sy + sz * 2.5, sz * 3, sz * 1.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Compromised outer ring
        if (status === "compromised") {
          const cr = sz + 6 + Math.sin(ns?.pulsePhase ?? 0) * 3;
          ctx.beginPath(); ctx.arc(p.sx, p.sy, cr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(226,18,39,${0.4 * pulse})`; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.sx, p.sy, cr + 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(226,18,39,${0.15 * pulse})`; ctx.lineWidth = 1; ctx.stroke();
        }

        // 3D depth glow
        const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, sz * 3.5);
        grd.addColorStop(0, baseColor + "50"); grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, sz * 3.5, 0, Math.PI * 2); ctx.fill();

        // Node body
        ctx.globalAlpha = depthAlpha * (node.external ? 0.65 : 1);
        ctx.shadowColor = baseColor; ctx.shadowBlur = (status === "compromised" ? 22 : 10) * pulse;
        ctx.fillStyle = baseColor + "28"; ctx.strokeStyle = baseColor;
        ctx.lineWidth = status === "compromised" ? 2.5 : 1.5;

        if (node.shape === "diamond") drawDiamond(ctx, p.sx, p.sy, sz);
        else if (node.shape === "hexagon") drawHex(ctx, p.sx, p.sy, sz);
        else if (node.shape === "square") {
          ctx.beginPath(); ctx.rect(p.sx - sz * 0.82, p.sy - sz * 0.82, sz * 1.65, sz * 1.65);
        } else {
          ctx.beginPath(); ctx.arc(p.sx, p.sy, sz, 0, Math.PI * 2);
        }
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // Inner core glow
        ctx.beginPath(); ctx.arc(p.sx, p.sy, sz * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = baseColor; ctx.shadowColor = baseColor; ctx.shadowBlur = 8;
        ctx.globalAlpha = depthAlpha;
        ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // Label
        ctx.font = `bold ${6 + p.scale * 1.5}px "SF Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,255,255,${depthAlpha * (node.external ? 0.3 : 0.85)})`;
        ctx.shadowColor = baseColor; ctx.shadowBlur = 4;
        ctx.fillText(node.label, p.sx, p.sy + sz + 9 * p.scale); ctx.shadowBlur = 0;

        if (node.sublabel && p.scale > 0.85) {
          ctx.font = `5px "SF Mono", monospace`;
          ctx.fillStyle = `rgba(255,255,255,${depthAlpha * 0.3})`;
          ctx.fillText(node.sublabel, p.sx, p.sy + sz + 17 * p.scale);
        }

        // Status dot
        if (status === "compromised") {
          ctx.beginPath(); ctx.arc(p.sx + sz * 0.75, p.sy - sz * 0.75, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#e21227"; ctx.shadowColor = "#e21227"; ctx.shadowBlur = 10;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      });

      // ── HUD corners ──
      const bc = "rgba(0,229,255,0.22)"; const bs = 11;
      ctx.strokeStyle = bc; ctx.lineWidth = 1.5;
      [[2,2,1,1],[W-2-bs,2,-1,1],[2,H-2-bs,1,-1],[W-2-bs,H-2-bs,-1,-1]].forEach(([x,y,dx,dy]) => {
        ctx.beginPath(); ctx.moveTo(x, y+dy*bs); ctx.lineTo(x,y); ctx.lineTo(x+dx*bs,y); ctx.stroke();
      });

      // Legend
      ctx.font = "5.5px monospace"; ctx.textAlign = "left";
      [{ color: "#22c55e", label: "SECURE" }, { color: "#e21227", label: "BREACH" }, { color: "#00e5ff", label: "ACTIVE" }]
        .forEach((item, i) => {
          ctx.beginPath(); ctx.arc(8, H - 10 + i * -9, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = item.color; ctx.shadowColor = item.color; ctx.shadowBlur = 4;
          ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          ctx.fillText(item.label, 15, H - 8 + i * -9);
        });
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [collapsed]);

  // Header drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { dragging: true, ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
    function onMove(ev: MouseEvent) {
      if (!dragRef.current.dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth - W - 4, dragRef.current.px + (ev.clientX - dragRef.current.ox)));
      const ny = Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.py + (ev.clientY - dragRef.current.oy)));
      setPos({ x: nx, y: ny });
    }
    function onUp() {
      dragRef.current.dragging = false;
      setPos(p => { try { localStorage.setItem("net-topo-pos", JSON.stringify(p)); } catch {} return p; });
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, [pos]);

  // Canvas rotation drag
  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const mr = manualRotRef.current;
    mr.dragging = true; mr.lastX = e.clientX; mr.vy = 0;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - mr.lastX;
      mr.lastX = ev.clientX; mr.vy = dx * 0.003; mr.ry += dx * 0.003;
    }
    function onUp() {
      mr.dragging = false;
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, []);

  const criticalNodes = Object.values(nodeStateRef.current).filter(n => n.status === "compromised").length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 84, userSelect: "none" }}
    >
      {/* Header */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: "5px", padding: "6px 9px",
          border: `1px solid ${criticalNodes > 0 ? "rgba(226,18,39,0.35)" : "rgba(0,229,255,0.16)"}`,
          borderBottom: collapsed ? undefined : `1px solid ${criticalNodes > 0 ? "rgba(226,18,39,0.12)" : "rgba(0,229,255,0.06)"}`,
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          background: "linear-gradient(135deg, rgba(4,6,18,0.98), rgba(6,8,22,0.99))",
          backdropFilter: "blur(20px)", cursor: "grab", minWidth: "180px",
          boxShadow: `0 4px 24px rgba(0,0,0,0.8), 0 0 0 1px ${criticalNodes > 0 ? "rgba(226,18,39,0.08)" : "rgba(0,229,255,0.04)"}`,
          transition: "border-color 0.4s",
        }}
      >
        <GripHorizontal style={{ width: 10, height: 10, color: "rgba(0,229,255,0.25)", flexShrink: 0 }} />
        <Radio style={{ width: 9, height: 9, color: criticalNodes > 0 ? "#e21227" : "#00e5ff", flexShrink: 0 }} />
        <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: criticalNodes > 0 ? "rgba(226,18,39,0.8)" : "rgba(0,229,255,0.6)", letterSpacing: "1.5px", flex: 1 }}>
          NET TOPOLOGY
        </span>
        <Cpu style={{ width: 7, height: 7, color: "rgba(255,255,255,0.2)" }} />
        <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", marginRight: 4 }}>3D</span>
        {threatCount > 0 && (
          <motion.span
            animate={{ opacity: criticalNodes > 0 ? [1, 0.4, 1] : 1 }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 800, color: "#e21227", background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)", borderRadius: 4, padding: "1px 4px" }}
          >
            {threatCount} THR
          </motion.span>
        )}
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setCollapsed(c => !c)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: 0, lineHeight: 1 }}>
          {collapsed ? <ChevronDown style={{ width: 10, height: 10 }} /> : <ChevronUp style={{ width: 10, height: 10 }} />}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              border: "1px solid rgba(0,229,255,0.1)", borderTop: "none", borderRadius: "0 0 10px 10px",
              background: "rgba(2,4,14,0.98)", backdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,229,255,0.03)",
              overflow: "hidden",
            }}>
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${criticalNodes > 0 ? "rgba(226,18,39,0.5)" : "rgba(0,229,255,0.35)"} 50%, transparent)` }} />

              <canvas
                ref={canvasRef} width={W} height={H}
                onMouseDown={onCanvasMouseDown}
                style={{ display: "block", cursor: "grab" }}
              />

              <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {[
                  { icon: <Activity style={{ width: 7, height: 7 }} />, label: "NODES",   val: NODES.filter(n => !n.external).length, color: "#00e5ff" },
                  { icon: <Wifi style={{ width: 7, height: 7 }} />,    label: "PPS",     val: pps,         color: "#22c55e" },
                  { icon: <AlertTriangle style={{ width: 7, height: 7 }} />, label: "THREATS", val: threatCount, color: "#e21227" },
                  { icon: <Cpu style={{ width: 7, height: 7 }} />,     label: "BREACH",  val: criticalNodes, color: criticalNodes > 0 ? "#e21227" : "#22c55e" },
                ].map((stat, i) => (
                  <div key={i} style={{ flex: 1, padding: "5px 0", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, color: stat.color, marginBottom: 1 }}>{stat.icon}</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 800, color: stat.color }}>{stat.val}</div>
                    <div style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "0.5px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
