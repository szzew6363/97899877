import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, GripHorizontal, ChevronDown, ChevronUp, Crosshair, AlertTriangle, Wifi, Radio, Zap } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   GLOBAL MAP — Ultra 3D Holographic Globe Widget
   Stars · True 3D bezier arcs · Holographic grid · Scan sweeps
═══════════════════════════════════════════════════════════════════ */

const W = 320; const H = 260;
const R = 100; const CX = 160; const CY = 132;
const FOV = 520;

interface City { name: string; lat: number; lng: number; color: string; threat: boolean; size: number }
interface Arc { src: number; dst: number; progress: number; speed: number; active: boolean }
interface StarDot { x: number; y: number; r: number; a: number; t: number }

const CITIES: City[] = [
  { name: "MOSCOW",     lat:  55.75, lng:  37.62, color: "#e21227", threat: true,  size: 4.0 },
  { name: "BEIJING",    lat:  39.90, lng: 116.40, color: "#f59e0b", threat: true,  size: 3.8 },
  { name: "PYONGYANG",  lat:  39.02, lng: 125.70, color: "#ff6b35", threat: true,  size: 3.0 },
  { name: "TEHRAN",     lat:  35.69, lng:  51.39, color: "#e21227", threat: true,  size: 3.2 },
  { name: "NYC",        lat:  40.71, lng: -74.00, color: "#00e5ff", threat: false, size: 3.5 },
  { name: "LONDON",     lat:  51.51, lng:  -0.13, color: "#00e5ff", threat: false, size: 3.2 },
  { name: "BERLIN",     lat:  52.52, lng:  13.40, color: "#22c55e", threat: false, size: 2.8 },
  { name: "TOKYO",      lat:  35.68, lng: 139.70, color: "#00e5ff", threat: false, size: 3.4 },
  { name: "SINGAPORE",  lat:   1.35, lng: 103.80, color: "#22c55e", threat: false, size: 2.6 },
  { name: "SYDNEY",     lat: -33.87, lng: 151.21, color: "#22c55e", threat: false, size: 2.8 },
  { name: "PARIS",      lat:  48.85, lng:   2.35, color: "#22c55e", threat: false, size: 3.0 },
  { name: "DUBAI",      lat:  25.20, lng:  55.27, color: "#a78bfa", threat: false, size: 2.6 },
  { name: "SAO PAULO",  lat: -23.55, lng: -46.63, color: "#00e5ff", threat: false, size: 2.8 },
  { name: "MUMBAI",     lat:  19.07, lng:  72.87, color: "#22c55e", threat: false, size: 2.6 },
  { name: "TORONTO",    lat:  43.65, lng: -79.38, color: "#00e5ff", threat: false, size: 2.6 },
  { name: "SEOUL",      lat:  37.57, lng: 127.00, color: "#22c55e", threat: false, size: 2.8 },
];

const ATTACK_ROUTES = [
  { src: 0, dst: 4 }, { src: 1, dst: 5 }, { src: 3, dst: 6 },
  { src: 2, dst: 7 }, { src: 1, dst: 12 }, { src: 0, dst: 10 },
  { src: 0, dst: 14 }, { src: 1, dst: 15 },
];

const STARS: StarDot[] = Array.from({ length: 260 }, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: Math.random() * 1.1 + 0.2,
  a: Math.random() * 0.8 + 0.1,
  t: Math.random() * Math.PI * 2,
}));

function latLngTo3D(lat: number, lng: number): [number, number, number] {
  const phi = (90 - lat) * Math.PI / 180;
  const th  = (lng + 180) * Math.PI / 180;
  return [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
}

function rotateY(x: number, y: number, z: number, a: number): [number, number, number] {
  return [x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a)];
}

function rotateX(x: number, y: number, z: number, a: number): [number, number, number] {
  return [x, y * Math.cos(a) + z * Math.sin(a), -y * Math.sin(a) + z * Math.cos(a)];
}

function project(x: number, y: number, z: number): [number, number, number] {
  const scale = FOV / (FOV + z * R);
  return [CX + x * R * scale, CY - y * R * scale, z];
}

function applyRot(lx: number, ly: number, lz: number, rx: number, ry: number): [number, number, number] {
  const [ax, ay, az] = rotateY(lx, ly, lz, ry);
  return rotateX(ax, ay, az, rx);
}

function lerp3D(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  t: number, lift: number
): [number, number, number] {
  const mx = (ax + bx) / 2; const my = (ay + by) / 2; const mz = (az + bz) / 2;
  const len = Math.sqrt(mx*mx + my*my + mz*mz);
  const cmx = mx / len * (1 + lift);
  const cmy = my / len * (1 + lift);
  const cmz = mz / len * (1 + lift);
  const t2 = 1 - t;
  return [
    t2*t2*ax + 2*t2*t*cmx + t*t*bx,
    t2*t2*ay + 2*t2*t*cmy + t*t*by,
    t2*t2*az + 2*t2*t*cmz + t*t*bz,
  ];
}

function loadPos(): { x: number; y: number } {
  try { const r = localStorage.getItem("globe-widget-pos"); if (r) return JSON.parse(r); } catch {}
  return { x: window.innerWidth - 340, y: window.innerHeight - 400 };
}

export function InteractiveGlobeWidget() {
  const [collapsed, setCollapsed]   = useState(false);
  const [pos, setPos]               = useState<{ x: number; y: number }>(loadPos);
  const [threatCount, setThreatCount] = useState(0);
  const [attacksBlocked, setAttacksBlocked] = useState(4821);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const rotRef    = useRef({ rx: 0.22, ry: 0.0 });
  const spinRef   = useRef(true);
  const dragRef   = useRef({ dragging: false, ox: 0, oy: 0, vrx: 0, vry: 0 });
  const arcsRef   = useRef<Arc[]>(ATTACK_ROUTES.map(r => ({
    ...r, progress: Math.random(), speed: 0.0016 + Math.random() * 0.0012, active: true,
  })));
  const tickRef   = useRef(0);
  const posWidgetDrag = useRef({ dragging: false, ox: 0, oy: 0, px: 0, py: 0 });

  useEffect(() => { setThreatCount(CITIES.filter(c => c.threat).length); }, []);

  useEffect(() => {
    const id = setInterval(() => setAttacksBlocked(n => n + Math.floor(Math.random() * 5)), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (collapsed) { cancelAnimationFrame(frameRef.current); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;

      if (spinRef.current && !dragRef.current.dragging) rotRef.current.ry += 0.0025;
      if (!dragRef.current.dragging) {
        rotRef.current.ry += dragRef.current.vry;
        rotRef.current.rx += dragRef.current.vrx;
        dragRef.current.vry *= 0.92;
        dragRef.current.vrx *= 0.92;
        rotRef.current.rx = Math.max(-0.9, Math.min(0.9, rotRef.current.rx));
      }

      const { rx, ry } = rotRef.current;
      ctx.clearRect(0, 0, W, H);

      // ── Deep space ──
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, W * 0.75);
      bg.addColorStop(0, "rgba(2,5,16,0.98)");
      bg.addColorStop(0.6, "rgba(1,3,10,0.99)");
      bg.addColorStop(1, "rgba(0,1,5,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // ── Stars ──
      STARS.forEach(s => {
        const tw = (Math.sin(t * 0.018 + s.t) + 1) / 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a * (0.3 + tw * 0.7)})`; ctx.fill();
      });

      // ── Multi-layer atmosphere ──
      [1.55, 1.38, 1.22, 1.10].forEach((rm, ri) => {
        const colors = [
          ["rgba(0,100,200,0.0)", "rgba(0,100,200,0.008)", "rgba(0,100,200,0.02)"],
          ["rgba(0,180,255,0.0)", "rgba(0,180,255,0.015)", "rgba(0,180,255,0.04)"],
          ["rgba(0,229,255,0.0)", "rgba(0,229,255,0.02)", "rgba(0,229,255,0.06)"],
          ["rgba(0,229,255,0.0)", "rgba(0,229,255,0.04)", "rgba(0,229,255,0.14)"],
        ][ri];
        const atmos = ctx.createRadialGradient(CX, CY, R * (rm - 0.12), CX, CY, R * rm);
        atmos.addColorStop(0, colors[0]); atmos.addColorStop(0.5, colors[1]); atmos.addColorStop(1, colors[2]);
        ctx.beginPath(); ctx.arc(CX, CY, R * rm, 0, Math.PI * 2);
        ctx.fillStyle = atmos; ctx.fill();
      });

      // ── Globe body ──
      const sph = ctx.createRadialGradient(CX - 24, CY - 24, R * 0.08, CX, CY, R);
      sph.addColorStop(0,   "rgba(0,22,44,0.52)");
      sph.addColorStop(0.4, "rgba(0,12,28,0.38)");
      sph.addColorStop(0.8, "rgba(0,5,15,0.25)");
      sph.addColorStop(1,   "rgba(0,229,255,0.03)");
      ctx.fillStyle = sph;
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();

      // Specular
      const spec = ctx.createRadialGradient(CX - 30, CY - 30, 0, CX - 22, CY - 22, R * 0.55);
      spec.addColorStop(0, "rgba(0,229,255,0.06)"); spec.addColorStop(1, "transparent");
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();

      // ── Lat/Lng holographic grid ──
      const STEPS = 64;
      for (let latDeg = -75; latDeg <= 75; latDeg += 15) {
        let first = true;
        ctx.beginPath();
        for (let i = 0; i <= STEPS; i++) {
          const lngDeg = (i / STEPS) * 360 - 180;
          const [lx, ly, lz] = latLngTo3D(latDeg, lngDeg);
          const [arx, ary, arz] = applyRot(lx, ly, lz, rx, ry);
          if (arz < -0.12) { first = true; continue; }
          const [px, py] = project(arx, ary, arz);
          const alpha = (0.03 + (arz + 1) * 0.04) * (latDeg === 0 ? 4 : 1);
          ctx.strokeStyle = latDeg === 0 ? `rgba(0,229,255,${alpha * 2.5})` : `rgba(0,180,220,${alpha})`;
          ctx.lineWidth = latDeg === 0 ? 0.9 : 0.4;
          if (first) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(px, py); first = false; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      for (let lngDeg = -180; lngDeg < 180; lngDeg += 20) {
        let first = true;
        ctx.beginPath();
        for (let i = 0; i <= STEPS; i++) {
          const latDeg = (i / STEPS) * 180 - 90;
          const [lx, ly, lz] = latLngTo3D(latDeg, lngDeg);
          const [arx, ary, arz] = applyRot(lx, ly, lz, rx, ry);
          if (arz < -0.12) { first = true; continue; }
          const [px, py] = project(arx, ary, arz);
          const alpha = 0.025 + (arz + 1) * 0.025;
          ctx.strokeStyle = `rgba(0,180,220,${alpha})`;
          ctx.lineWidth = 0.35;
          if (first) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(px, py); first = false; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // ── Scan sweep ──
      const sweepX = CX + Math.sin(t * 0.015) * R * 1.05;
      const sg = ctx.createLinearGradient(sweepX - 55, 0, sweepX + 55, 0);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.5, "rgba(0,229,255,0.055)");
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(sweepX - 55, CY - R, 110, R * 2);

      // ── Horizontal scan line ──
      const scanY = CY + Math.sin(t * 0.01) * R * 0.85;
      const hsg = ctx.createLinearGradient(CX - R, scanY, CX + R, scanY);
      hsg.addColorStop(0, "transparent");
      hsg.addColorStop(0.5, "rgba(0,229,255,0.04)");
      hsg.addColorStop(1, "transparent");
      ctx.fillStyle = hsg;
      ctx.fillRect(CX - R, scanY, R * 2, 1.5);

      // ── Attack arcs ──
      arcsRef.current.forEach(arc => {
        arc.progress += arc.speed;
        if (arc.progress > 1.18) arc.progress = 0;
        const [ax, ay, az] = latLngTo3D(CITIES[arc.src].lat, CITIES[arc.src].lng);
        const [bx, by, bz] = latLngTo3D(CITIES[arc.dst].lat, CITIES[arc.dst].lng);
        const srcColor = CITIES[arc.src].color;
        const TRAIL = 32;
        for (let i = 0; i <= TRAIL; i++) {
          const tp = Math.max(0, Math.min(1, arc.progress - (TRAIL - i) * 0.007));
          if (tp <= 0) continue;
          const [ix, iy, iz] = lerp3D(ax, ay, az, bx, by, bz, tp, 0.5);
          const [arx, ary, arz] = applyRot(ix, iy, iz, rx, ry);
          if (arz < -0.35) continue;
          const [px, py] = project(arx, ary, arz);
          const alpha = (i / TRAIL) * 0.85 * Math.max(0, arz + 1) * 0.55;
          const sz = i === TRAIL ? 3.0 : 1.0 + (i / TRAIL) * 1.0;
          ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
          ctx.fillStyle = `${srcColor}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.shadowColor = srcColor; ctx.shadowBlur = i === TRAIL ? 14 : 5;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      });

      // ── City nodes ──
      const sorted = CITIES.map((c, i) => {
        const [lx, ly, lz] = latLngTo3D(c.lat, c.lng);
        const [arx, ary, arz] = applyRot(lx, ly, lz, rx, ry);
        return { c, i, arx, ary, arz };
      }).sort((a, b) => a.arz - b.arz);

      sorted.forEach(({ c, arz, arx, ary }) => {
        if (arz < -0.18) return;
        const [px, py] = project(arx, ary, arz);
        const vis = Math.max(0, (arz + 1) * 0.75);
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.048 + CITIES.indexOf(c));
        const sz = c.size;

        // Threat rings
        if (c.threat) {
          [sz + 5 + pulse * 5, sz + 10 + pulse * 3].forEach((r, ri) => {
            ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.strokeStyle = `${c.color}${Math.floor(vis * (ri === 0 ? 0.35 : 0.12) * 255).toString(16).padStart(2, "0")}`;
            ctx.lineWidth = ri === 0 ? 1 : 0.5; ctx.stroke();
          });
        }

        // Glow halo
        const halo = ctx.createRadialGradient(px, py, 0, px, py, sz * 3.5);
        halo.addColorStop(0, `${c.color}${Math.floor(vis * 0.55 * 255).toString(16).padStart(2, "0")}`);
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(px, py, sz * 3.5, 0, Math.PI * 2); ctx.fill();

        // Node
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = c.color; ctx.globalAlpha = vis;
        ctx.shadowColor = c.color; ctx.shadowBlur = 12;
        ctx.fill(); ctx.shadowBlur = 0;

        // Core
        ctx.beginPath(); ctx.arc(px, py, sz * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#fff"; ctx.fill();
        ctx.globalAlpha = 1;

        // Label
        if (arz > 0.22) {
          ctx.font = "5.5px 'SF Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = `rgba(255,255,255,${vis * 0.6})`;
          ctx.shadowColor = c.color; ctx.shadowBlur = 4;
          ctx.fillText(c.name, px, py - sz - 3); ctx.shadowBlur = 0;
        }
      });

      // ── Rim atmosphere ──
      const rim = ctx.createRadialGradient(CX, CY, R * 0.9, CX, CY, R * 1.06);
      rim.addColorStop(0, "transparent");
      rim.addColorStop(0.5, "rgba(0,229,255,0.03)");
      rim.addColorStop(1, "rgba(0,229,255,0.14)");
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(CX, CY, R * 1.06, 0, Math.PI * 2);
      ctx.arc(CX, CY, R * 0.9, 0, Math.PI * 2, true); ctx.fill();

      // Globe border
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,229,255,0.22)"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,229,255,0.05)"; ctx.lineWidth = 4; ctx.stroke();

      // ── HUD corners ──
      const bColor = "rgba(0,229,255,0.3)"; const bSize = 12;
      ctx.strokeStyle = bColor; ctx.lineWidth = 1.5;
      [[2,2,1,1],[W-2-bSize,2,-1,1],[2,H-2-bSize,1,-1],[W-2-bSize,H-2-bSize,-1,-1]].forEach(([x,y,dx,dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * bSize); ctx.lineTo(x, y); ctx.lineTo(x + dx * bSize, y);
        ctx.stroke();
      });
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [collapsed]);

  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); spinRef.current = false;
    dragRef.current = { ...dragRef.current, dragging: true, ox: e.clientX, oy: e.clientY, vrx: 0, vry: 0 };
    let lastX = e.clientX, lastY = e.clientY;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - lastX; const dy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      dragRef.current.vry = dx * 0.0065; dragRef.current.vrx = dy * 0.0065;
      rotRef.current.ry += dx * 0.0065;
      rotRef.current.rx = Math.max(-0.9, Math.min(0.9, rotRef.current.rx + dy * 0.0065));
    }
    function onUp() {
      dragRef.current.dragging = false;
      setTimeout(() => { spinRef.current = true; }, 2800);
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, []);

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    posWidgetDrag.current = { dragging: true, ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
    function onMove(ev: MouseEvent) {
      if (!posWidgetDrag.current.dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth - W - 4, posWidgetDrag.current.px + (ev.clientX - posWidgetDrag.current.ox)));
      const ny = Math.max(0, Math.min(window.innerHeight - 40, posWidgetDrag.current.py + (ev.clientY - posWidgetDrag.current.oy)));
      setPos({ x: nx, y: ny });
    }
    function onUp() {
      posWidgetDrag.current.dragging = false;
      setPos(p => { try { localStorage.setItem("globe-widget-pos", JSON.stringify(p)); } catch {} return p; });
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, [pos]);

  const threatCities = CITIES.filter(c => c.threat).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 84, userSelect: "none" }}
    >
      {/* Header */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "6px 9px",
          border: "1px solid rgba(0,229,255,0.22)",
          borderBottom: collapsed ? "1px solid rgba(0,229,255,0.22)" : "1px solid rgba(0,229,255,0.06)",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          background: "linear-gradient(135deg, rgba(0,8,20,0.98), rgba(0,12,30,0.99))",
          backdropFilter: "blur(20px)",
          cursor: "grab", minWidth: "200px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,229,255,0.06), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <GripHorizontal style={{ width: 10, height: 10, color: "rgba(0,229,255,0.3)", flexShrink: 0 }} />
        <Globe style={{ width: 9, height: 9, color: "#00e5ff", flexShrink: 0 }} />
        <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(0,229,255,0.7)", letterSpacing: "1.6px", flex: 1 }}>
          GLOBAL MAP
        </span>
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: "7px", fontFamily: "monospace", color: "#22c55e", letterSpacing: "0.5px" }}
        >
          ● LIVE
        </motion.span>
        <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "#e21227", fontWeight: 800, background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)", borderRadius: 4, padding: "1px 5px", marginLeft: 4 }}>
          {threatCities} THR
        </span>
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setCollapsed(c => !c)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 0, lineHeight: 1, marginLeft: 4 }}>
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
              border: "1px solid rgba(0,229,255,0.14)", borderTop: "none", borderRadius: "0 0 10px 10px",
              background: "rgba(2,4,14,0.98)", backdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,229,255,0.04)",
              overflow: "hidden",
            }}>
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.5) 50%, transparent)" }} />

              <div style={{ position: "relative" }}>
                <canvas ref={canvasRef} width={W} height={H}
                  onMouseDown={onCanvasMouseDown}
                  style={{ display: "block", cursor: "grab" }}
                />
                <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: "6px", fontFamily: "monospace", color: "rgba(0,229,255,0.2)", pointerEvents: "none" }}>
                  DRAG TO ROTATE
                </div>
                {/* Attacks blocked badge */}
                <div style={{ position: "absolute", top: 6, left: 8, fontSize: "6.5px", fontFamily: "monospace" }}>
                  <span style={{ color: "rgba(0,229,255,0.3)" }}>BLOCKED: </span>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>{attacksBlocked.toLocaleString()}</span>
                </div>
              </div>

              {/* Stats footer */}
              <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {[
                  { icon: <Crosshair style={{ width: 7, height: 7 }} />, label: "NODES",   val: CITIES.length,          color: "#00e5ff" },
                  { icon: <AlertTriangle style={{ width: 7, height: 7 }} />, label: "THREATS", val: threatCities,         color: "#e21227" },
                  { icon: <Radio style={{ width: 7, height: 7 }} />,   label: "ATTACKS", val: ATTACK_ROUTES.length,     color: "#f59e0b" },
                  { icon: <Wifi style={{ width: 7, height: 7 }} />,    label: "ONLINE",  val: CITIES.length - threatCities, color: "#22c55e" },
                  { icon: <Zap style={{ width: 7, height: 7 }} />,     label: "BLOCKED", val: attacksBlocked > 9999 ? "10K+" : attacksBlocked, color: "#a78bfa" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, padding: "5px 0", textAlign: "center", borderRight: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: s.color, marginBottom: 1 }}>{s.icon}</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "0.4px" }}>{s.label}</div>
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
