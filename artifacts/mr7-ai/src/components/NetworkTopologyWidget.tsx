import { useCallback, useEffect, useRef, useState } from "react";
import { GripHorizontal, ChevronUp, ChevronDown, Radio, AlertTriangle, Activity, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════
   LIVE NETWORK TOPOLOGY WIDGET
   3D-projected canvas node graph — draggable overlay.
   Shows simulated network nodes, live data packets,
   and real-time attack arcs with threat detection.
═══════════════════════════════════════════════════════ */

const W = 310; const H = 230;

interface NetNode {
  id: string; label: string; sublabel?: string;
  x: number; y: number;
  color: string; alertColor?: string;
  shape: "circle" | "diamond" | "hexagon" | "square";
  external?: boolean; size?: number;
}

interface NetLink { a: string; b: string; bandwidth?: number }
interface Packet { linkIdx: number; progress: number; speed: number; color: string; size: number }
interface AttackArc { src: string; dst: string; progress: number; speed: number; color: string; trail: { p: number; o: number }[] }
interface NodeState { status: "ok" | "warn" | "compromised"; pulsePhase: number; alertTimer: number }

const NODES: NetNode[] = [
  { id: "inet",  label: "INTERNET",  x: 155, y: 18,  color: "#444", shape: "diamond", external: true, size: 7 },
  { id: "fw",    label: "FIREWALL",  sublabel: "PFSense v2.7", x: 155, y: 60, color: "#22c55e", shape: "diamond", size: 11 },
  { id: "rt",    label: "ROUTER",    sublabel: "10.0.0.1", x: 155, y: 115, color: "#00e5ff", shape: "circle",  size: 10 },
  { id: "h1",    label: "HOST-01",   sublabel: "10.0.1.10", x: 52,  y: 175, color: "#3b82f6", shape: "square", size: 8 },
  { id: "h2",    label: "HOST-02",   sublabel: "10.0.1.11", x: 110, y: 192, color: "#3b82f6", shape: "square", size: 8 },
  { id: "h3",    label: "HOST-03",   sublabel: "10.0.1.12", x: 200, y: 192, color: "#3b82f6", shape: "square", size: 8 },
  { id: "h4",    label: "HOST-04",   sublabel: "10.0.1.13", x: 258, y: 175, color: "#3b82f6", shape: "square", size: 8 },
  { id: "db",    label: "DB-SRV",    sublabel: "PostgreSQL", x: 155, y: 205, color: "#a78bfa", shape: "hexagon", size: 10 },
  { id: "atk",   label: "ATTACKER",  x: 18,  y: 28,  color: "#e21227", shape: "diamond", external: true, size: 9 },
  { id: "c2",    label: "C2-SERVER", x: 292, y: 28,  color: "#ff6b35", shape: "diamond", external: true, size: 9 },
];

const LINKS: NetLink[] = [
  { a: "inet", b: "fw", bandwidth: 2 },
  { a: "fw",   b: "rt", bandwidth: 3 },
  { a: "rt",   b: "h1", bandwidth: 1 },
  { a: "rt",   b: "h2", bandwidth: 1 },
  { a: "rt",   b: "h3", bandwidth: 1 },
  { a: "rt",   b: "h4", bandwidth: 1 },
  { a: "rt",   b: "db", bandwidth: 2 },
];

const ATTACK_TARGETS = ["h1","h2","h3","h4","db","fw","rt"];

function getNode(id: string) { return NODES.find(n => n.id === id)!; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
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
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
  ctx.closePath();
}

function expandHex(color: string, alpha: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color + alpha;
  return color;
}

function loadPos(): { x: number; y: number } {
  try { const r = localStorage.getItem("net-topo-pos"); if (r) return JSON.parse(r); } catch {}
  return { x: 8, y: window.innerHeight - 300 };
}

export function NetworkTopologyWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos);
  const [threatCount, setThreatCount] = useState(0);
  const [pps, setPps] = useState(0);
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const packetsRef = useRef<Packet[]>([]);
  const arcsRef = useRef<AttackArc[]>([]);
  const nodeStateRef = useRef<Record<string, NodeState>>({});
  const tickRef = useRef(0);
  const ppsRef = useRef(0);

  // Init node states
  useEffect(() => {
    NODES.forEach(n => {
      nodeStateRef.current[n.id] = { status: "ok", pulsePhase: Math.random() * Math.PI * 2, alertTimer: 0 };
    });
  }, []);

  // Spawn attack events
  useEffect(() => {
    function spawnAttack() {
      const from = Math.random() > 0.6 ? "c2" : "atk";
      const dst = ATTACK_TARGETS[Math.floor(Math.random() * ATTACK_TARGETS.length)];
      arcsRef.current.push({
        src: from, dst,
        progress: 0,
        speed: 0.003 + Math.random() * 0.003,
        color: from === "atk" ? "#e21227" : "#ff6b35",
        trail: [],
      });
      setThreatCount(c => c + 1);
    }
    const id = setInterval(spawnAttack, 4000 + Math.random() * 4000);
    spawnAttack();
    return () => clearInterval(id);
  }, []);

  // PPS counter
  useEffect(() => {
    const id = setInterval(() => { setPps(ppsRef.current); ppsRef.current = 0; }, 1000);
    return () => clearInterval(id);
  }, []);

  // Canvas draw loop
  useEffect(() => {
    if (collapsed) { cancelAnimationFrame(frameRef.current); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Spawn initial packets
    if (packetsRef.current.length === 0) {
      LINKS.forEach((_, li) => {
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
          packetsRef.current.push({ linkIdx: li, progress: Math.random(), speed: 0.003 + Math.random() * 0.005, color: "#00e5ff", size: 1.5 + Math.random() });
        }
      });
    }

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;

      ctx.clearRect(0, 0, W, H);

      // ── Background ──
      ctx.fillStyle = "rgba(6,6,10,0.96)";
      ctx.fillRect(0, 0, W, H);

      // Grid dots
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let gx = 10; gx < W; gx += 24) {
        for (let gy = 10; gy < H; gy += 24) {
          ctx.beginPath(); ctx.arc(gx, gy, 0.8, 0, Math.PI * 2); ctx.fill();
        }
      }

      // ── Links ──
      LINKS.forEach((link) => {
        const na = getNode(link.a); const nb = getNode(link.b);
        const nsA = nodeStateRef.current[link.a];
        const nsB = nodeStateRef.current[link.b];
        const alert = nsA?.status !== "ok" || nsB?.status !== "ok";
        const lColor = alert ? "#e21227" : "#00e5ff";
        const lAlpha = alert ? 0.35 : 0.15;

        ctx.beginPath();
        ctx.strokeStyle = lColor;
        ctx.globalAlpha = lAlpha;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 6]);
        ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });

      // ── Packets ──
      packetsRef.current.forEach((pkt, i) => {
        pkt.progress += pkt.speed;
        if (pkt.progress > 1) { pkt.progress = 0; ppsRef.current++; }
        const link = LINKS[pkt.linkIdx];
        const na = getNode(link.a); const nb = getNode(link.b);
        const px = lerp(na.x, nb.x, pkt.progress);
        const py = lerp(na.y, nb.y, pkt.progress);
        const ns = nodeStateRef.current[link.a];
        const pColor = ns?.status === "compromised" ? "#e21227" : pkt.color;
        ctx.beginPath(); ctx.arc(px, py, pkt.size, 0, Math.PI * 2);
        ctx.fillStyle = pColor;
        ctx.shadowColor = pColor; ctx.shadowBlur = 6;
        ctx.fill(); ctx.shadowBlur = 0;
        packetsRef.current[i] = pkt;
      });

      // ── Attack arcs ──
      arcsRef.current = arcsRef.current.filter(arc => arc.progress <= 1.05);
      arcsRef.current.forEach((arc) => {
        arc.progress += arc.speed;
        arc.trail.push({ p: arc.progress, o: 1 });
        arc.trail = arc.trail.map(tr => ({ ...tr, o: tr.o * 0.88 })).filter(tr => tr.o > 0.02);

        const ns = getNode(arc.src); const nd = getNode(arc.dst);
        const mx = (ns.x + nd.x) / 2; const my = (ns.y + nd.y) / 2 - 60;

        // Draw trail
        arc.trail.forEach(tr => {
          const tp = tr.p;
          const tx = (1-tp)*(1-tp)*ns.x + 2*(1-tp)*tp*mx + tp*tp*nd.x;
          const ty = (1-tp)*(1-tp)*ns.y + 2*(1-tp)*tp*my + tp*tp*nd.y;
          ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI * 2);
          ctx.fillStyle = arc.color;
          ctx.globalAlpha = tr.o * 0.8;
          ctx.shadowColor = arc.color; ctx.shadowBlur = 8;
          ctx.fill(); ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        });

        // Draw head
        const tp = Math.min(arc.progress, 1);
        const hx = (1-tp)*(1-tp)*ns.x + 2*(1-tp)*tp*mx + tp*tp*nd.x;
        const hy = (1-tp)*(1-tp)*ns.y + 2*(1-tp)*tp*my + tp*tp*nd.y;
        ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = arc.color;
        ctx.shadowColor = arc.color; ctx.shadowBlur = 14;
        ctx.fill(); ctx.shadowBlur = 0;

        // Impact
        if (arc.progress >= 1) {
          const ns2 = nodeStateRef.current[arc.dst];
          if (ns2 && ns2.status === "ok") {
            ns2.status = "compromised"; ns2.alertTimer = 180;
          }
        }
      });

      // ── Update node alert timers ──
      Object.keys(nodeStateRef.current).forEach(id => {
        const ns = nodeStateRef.current[id];
        if (ns.alertTimer > 0) {
          ns.alertTimer--;
          if (ns.alertTimer === 0) ns.status = "ok";
        }
        ns.pulsePhase += 0.06;
      });

      // ── Nodes ──
      NODES.forEach(node => {
        const ns = nodeStateRef.current[node.id];
        const status = ns?.status ?? "ok";
        let baseColor = node.color;
        if (status === "compromised") baseColor = "#e21227";
        else if (status === "warn") baseColor = "#f59e0b";

        const sz = node.size ?? 9;
        const pulse = ns ? Math.sin(ns.pulsePhase) * 0.3 + 0.7 : 0.8;
        const glowR = status === "compromised" ? 18 : (status === "warn" ? 12 : 8);

        // Outer glow ring
        if (status === "compromised") {
          ctx.beginPath(); ctx.arc(node.x, node.y, sz + 5 + Math.sin(ns?.pulsePhase ?? 0) * 2, 0, Math.PI * 2);
          ctx.strokeStyle = baseColor; ctx.lineWidth = 1; ctx.globalAlpha = 0.4 * pulse;
          ctx.stroke(); ctx.globalAlpha = 1;
        }

        // Glow fill
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, sz * 2.5);
        grd.addColorStop(0, expandHex(baseColor, "40"));
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(node.x, node.y, sz * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Node body
        ctx.shadowColor = baseColor; ctx.shadowBlur = glowR * pulse;
        ctx.fillStyle = expandHex(baseColor, "22");
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = status === "compromised" ? 2 : 1.2;
        ctx.globalAlpha = node.external ? 0.7 : 1;

        if (node.shape === "diamond") drawDiamond(ctx, node.x, node.y, sz);
        else if (node.shape === "hexagon") drawHexagon(ctx, node.x, node.y, sz);
        else if (node.shape === "square") {
          ctx.beginPath(); ctx.rect(node.x - sz * 0.85, node.y - sz * 0.85, sz * 1.7, sz * 1.7);
        } else {
          ctx.beginPath(); ctx.arc(node.x, node.y, sz, 0, Math.PI * 2);
        }
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // Label
        ctx.font = `bold 7px "SF Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = node.external ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)";
        ctx.fillText(node.label, node.x, node.y + sz + 10);

        // Status dot
        if (status === "compromised") {
          ctx.beginPath(); ctx.arc(node.x + sz * 0.7, node.y - sz * 0.7, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#e21227";
          ctx.shadowColor = "#e21227"; ctx.shadowBlur = 8;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      });

      // ── Legend ──
      ctx.font = "6px monospace"; ctx.textAlign = "left";
      [
        { color: "#22c55e", label: "SECURE" },
        { color: "#e21227", label: "BREACH" },
        { color: "#00e5ff", label: "ACTIVE" },
      ].forEach((item, i) => {
        ctx.fillStyle = item.color;
        ctx.beginPath(); ctx.arc(8, H - 12 + i * -8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillText(item.label, 14, H - 10 + i * -8);
      });
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [collapsed]);

  // Drag handlers
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
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const criticalNodes = Object.values(nodeStateRef.current).filter(n => n.status === "compromised").length;

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 84, userSelect: "none" }}>
      {/* Header */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "5px 8px",
          border: "1px solid rgba(255,255,255,0.09)",
          borderBottom: collapsed ? "1px solid rgba(255,255,255,0.09)" : "none",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          background: "linear-gradient(135deg, rgba(8,8,16,0.97), rgba(12,12,24,0.98))",
          backdropFilter: "blur(20px)",
          cursor: "grab", minWidth: "170px",
          boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${criticalNodes > 0 ? "rgba(226,18,39,0.15)" : "rgba(0,229,255,0.06)"}`,
        }}
      >
        <GripHorizontal style={{ width: "10px", height: "10px", color: "rgba(255,255,255,0.18)", flexShrink: 0 }} />
        <Radio style={{ width: "9px", height: "9px", color: "#00e5ff", flexShrink: 0 }} />
        <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "1.4px", flex: 1 }}>
          NET TOPOLOGY
        </span>
        {threatCount > 0 && (
          <span style={{
            fontSize: "7.5px", fontFamily: "monospace", fontWeight: 800,
            color: "#e21227", background: "rgba(226,18,39,0.12)",
            border: "1px solid rgba(226,18,39,0.25)",
            borderRadius: "4px", padding: "0 4px",
          }}>
            {threatCount} THR
          </span>
        )}
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setCollapsed(c => !c)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: 0, lineHeight: 1 }}>
          {collapsed ? <ChevronDown style={{ width: "10px", height: "10px" }} /> : <ChevronUp style={{ width: "10px", height: "10px" }} />}
        </button>
      </div>

      {/* Canvas panel */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              border: "1px solid rgba(255,255,255,0.09)", borderTop: "none", borderRadius: "0 0 10px 10px",
              background: "rgba(6,6,10,0.97)", backdropFilter: "blur(20px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.05)",
              overflow: "hidden",
            }}>
              {/* Scan line accent */}
              <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.35) 50%, transparent)" }} />

              <canvas ref={canvasRef} width={W} height={H} style={{ display: "block" }} />

              {/* Stats footer */}
              <div style={{
                display: "flex", gap: "0", borderTop: "1px solid rgba(255,255,255,0.05)",
              }}>
                {[
                  { icon: <Activity style={{ width: "7px", height: "7px" }} />, label: "NODES", val: NODES.filter(n => !n.external).length, color: "#00e5ff" },
                  { icon: <Wifi style={{ width: "7px", height: "7px" }} />, label: "PPS", val: pps, color: "#22c55e" },
                  { icon: <AlertTriangle style={{ width: "7px", height: "7px" }} />, label: "THREATS", val: threatCount, color: "#e21227" },
                ].map((stat, i) => (
                  <div key={i} style={{
                    flex: 1, padding: "5px 0", textAlign: "center",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", color: stat.color, marginBottom: "1px" }}>
                      {stat.icon}
                    </div>
                    <div style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: 800, color: stat.color }}>{stat.val}</div>
                    <div style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.5px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
