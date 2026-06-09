import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, GripHorizontal, ChevronDown, ChevronUp, Crosshair, AlertTriangle, Wifi, Radio } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   GLOBAL MAP — Interactive 3D Globe Widget
   Canvas-based 3D globe with drag-to-rotate, auto-spin,
   city threat nodes, animated attack arcs, and threat stats.
═══════════════════════════════════════════════════════════════════ */

const W = 310; const H = 250;
const R = 96;  const CX = 155; const CY = 128;
const FOV = 500;

interface City { name: string; lat: number; lng: number; color: string; threat: boolean; size: number }
interface Arc { src: number; dst: number; progress: number; speed: number; active: boolean }

const CITIES: City[] = [
  { name: "MOSCOW",     lat:  55.75, lng:  37.62, color: "#e21227", threat: true,  size: 3.8 },
  { name: "BEIJING",    lat:  39.90, lng: 116.40, color: "#f59e0b", threat: true,  size: 3.6 },
  { name: "PYONGYANG",  lat:  39.02, lng: 125.70, color: "#ff6b35", threat: true,  size: 2.8 },
  { name: "TEHRAN",     lat:  35.69, lng:  51.39, color: "#e21227", threat: true,  size: 3.0 },
  { name: "NYC",        lat:  40.71, lng: -74.00, color: "#00e5ff", threat: false, size: 3.2 },
  { name: "LONDON",     lat:  51.51, lng:  -0.13, color: "#00e5ff", threat: false, size: 3.0 },
  { name: "BERLIN",     lat:  52.52, lng:  13.40, color: "#22c55e", threat: false, size: 2.6 },
  { name: "TOKYO",      lat:  35.68, lng: 139.70, color: "#00e5ff", threat: false, size: 3.2 },
  { name: "SINGAPORE",  lat:   1.35, lng: 103.80, color: "#22c55e", threat: false, size: 2.4 },
  { name: "SYDNEY",     lat: -33.87, lng: 151.21, color: "#22c55e", threat: false, size: 2.6 },
  { name: "PARIS",      lat:  48.85, lng:   2.35, color: "#22c55e", threat: false, size: 2.8 },
  { name: "DUBAI",      lat:  25.20, lng:  55.27, color: "#a78bfa", threat: false, size: 2.4 },
  { name: "SAO PAULO",  lat: -23.55, lng: -46.63, color: "#00e5ff", threat: false, size: 2.6 },
  { name: "MUMBAI",     lat:  19.07, lng:  72.87, color: "#22c55e", threat: false, size: 2.4 },
];

const ATTACK_ROUTES = [
  { src: 0, dst: 4 },  // Moscow -> NYC
  { src: 1, dst: 5 },  // Beijing -> London
  { src: 3, dst: 6 },  // Tehran -> Berlin
  { src: 2, dst: 7 },  // Pyongyang -> Tokyo
  { src: 1, dst: 12 }, // Beijing -> Sao Paulo
  { src: 0, dst: 10 }, // Moscow -> Paris
];

function latLngTo3D(lat: number, lng: number): [number, number, number] {
  const phi = (90 - lat) * Math.PI / 180;
  const th  = (lng + 180) * Math.PI / 180;
  return [
    Math.sin(phi) * Math.cos(th),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(th),
  ];
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
  t: number,
  lift: number
): [number, number, number] {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const mz = (az + bz) / 2;
  const len = Math.sqrt(mx * mx + my * my + mz * mz);
  const cmx = mx / len * (1 + lift);
  const cmy = my / len * (1 + lift);
  const cmz = mz / len * (1 + lift);
  const t2 = 1 - t;
  return [
    t2 * t2 * ax + 2 * t2 * t * cmx + t * t * bx,
    t2 * t2 * ay + 2 * t2 * t * cmy + t * t * by,
    t2 * t2 * az + 2 * t2 * t * cmz + t * t * bz,
  ];
}

function loadPos(): { x: number; y: number } {
  try { const r = localStorage.getItem("globe-widget-pos"); if (r) return JSON.parse(r); } catch {}
  return { x: window.innerWidth - 330, y: window.innerHeight - 380 };
}

export function InteractiveGlobeWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(loadPos);
  const [threatCount, setThreatCount] = useState(0);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const frameRef   = useRef<number>(0);
  const rotRef     = useRef({ rx: 0.28, ry: 0.0 });
  const spinRef    = useRef(true);
  const dragRef    = useRef({ dragging: false, ox: 0, oy: 0, vrx: 0, vry: 0 });
  const arcsRef    = useRef<Arc[]>(ATTACK_ROUTES.map(r => ({
    ...r, progress: Math.random(), speed: 0.0018 + Math.random() * 0.001, active: true,
  })));
  const tickRef    = useRef(0);
  const posWidgetDrag = useRef({ dragging: false, ox: 0, oy: 0, px: 0, py: 0 });

  useEffect(() => { setThreatCount(CITIES.filter(c => c.threat).length); }, []);

  useEffect(() => {
    if (collapsed) { cancelAnimationFrame(frameRef.current); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;

      if (spinRef.current && !dragRef.current.dragging) {
        rotRef.current.ry += 0.003;
      }
      // Apply velocity inertia when not dragging
      if (!dragRef.current.dragging) {
        rotRef.current.ry += dragRef.current.vry;
        rotRef.current.rx += dragRef.current.vrx;
        dragRef.current.vry *= 0.93;
        dragRef.current.vrx *= 0.93;
        // Clamp tilt
        rotRef.current.rx = Math.max(-0.8, Math.min(0.8, rotRef.current.rx));
      }

      const { rx, ry } = rotRef.current;

      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "rgba(4,4,10,0.97)";
      ctx.fillRect(0, 0, W, H);

      // Radial glow behind globe
      const glow = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.5);
      glow.addColorStop(0,   "rgba(0,229,255,0.04)");
      glow.addColorStop(0.5, "rgba(0,229,255,0.015)");
      glow.addColorStop(1,   "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(CX, CY, R * 1.5, 0, Math.PI * 2); ctx.fill();

      // ── Globe silhouette ──────────────────────────────────
      const sphereGrd = ctx.createRadialGradient(CX - 20, CY - 20, R * 0.1, CX, CY, R);
      sphereGrd.addColorStop(0,   "rgba(0,20,35,0.5)");
      sphereGrd.addColorStop(0.5, "rgba(0,10,20,0.35)");
      sphereGrd.addColorStop(1,   "rgba(0,229,255,0.04)");
      ctx.fillStyle = sphereGrd;
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();

      // ── Lat/Lng grid ──────────────────────────────────────
      const STEPS = 60;
      function drawGridLine(pts: [number, number, number, number][]) {
        let first = true;
        ctx.beginPath();
        pts.forEach(([lx, ly, lz]) => {
          const [rx2, ry2, rz2] = applyRot(lx, ly, lz, rx, ry);
          if (rz2 < -0.15) { first = true; return; }
          const [px, py] = project(rx2, ry2, rz2);
          const alpha = 0.04 + (rz2 + 1) * 0.05;
          ctx.strokeStyle = `rgba(0,180,220,${alpha})`;
          if (first) { ctx.beginPath(); first = false; }
          if (first === false) ctx.moveTo(px, py);
          // Small dots for grid
          ctx.fillStyle = `rgba(0,180,220,${alpha * 0.6})`;
          ctx.fillRect(px - 0.4, py - 0.4, 0.8, 0.8);
        });
      }

      // Latitude rings
      for (let latDeg = -75; latDeg <= 75; latDeg += 30) {
        const pts: [number, number, number, number][] = [];
        for (let i = 0; i <= STEPS; i++) {
          const lngDeg = (i / STEPS) * 360 - 180;
          const [lx, ly, lz] = latLngTo3D(latDeg, lngDeg);
          pts.push([lx, ly, lz, 0]);
        }
        drawGridLine(pts);
      }

      // Longitude meridians
      for (let lngDeg = -180; lngDeg < 180; lngDeg += 30) {
        const pts: [number, number, number, number][] = [];
        for (let i = 0; i <= STEPS; i++) {
          const latDeg = (i / STEPS) * 180 - 90;
          const [lx, ly, lz] = latLngTo3D(latDeg, lngDeg);
          pts.push([lx, ly, lz, 0]);
        }
        drawGridLine(pts);
      }

      // ── Attack arcs ───────────────────────────────────────
      arcsRef.current.forEach(arc => {
        arc.progress += arc.speed;
        if (arc.progress > 1.15) arc.progress = 0;

        const [ax, ay, az] = latLngTo3D(CITIES[arc.src].lat, CITIES[arc.src].lng);
        const [bx, by, bz] = latLngTo3D(CITIES[arc.dst].lat, CITIES[arc.dst].lng);
        const srcColor = CITIES[arc.src].color;

        const TRAIL = 28;
        for (let i = 0; i <= TRAIL; i++) {
          const tp = Math.max(0, Math.min(1, arc.progress - (TRAIL - i) * 0.008));
          if (tp <= 0) continue;
          const [ix, iy, iz] = lerp3D(ax, ay, az, bx, by, bz, tp, 0.45);
          const [rx2, ry2, rz2] = applyRot(ix, iy, iz, rx, ry);
          if (rz2 < -0.3) continue;
          const [px, py] = project(rx2, ry2, rz2);
          const alpha = (i / TRAIL) * 0.8 * (rz2 + 1) * 0.6;
          const sz = i === TRAIL ? 2.5 : 1.2;
          ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
          ctx.fillStyle = `${srcColor}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.shadowColor = srcColor; ctx.shadowBlur = i === TRAIL ? 10 : 4;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      });

      // ── City nodes ────────────────────────────────────────
      const sortedCities = CITIES.map((c, i) => {
        const [lx, ly, lz] = latLngTo3D(c.lat, c.lng);
        const [rx2, ry2, rz2] = applyRot(lx, ly, lz, rx, ry);
        return { c, i, rx2, ry2, rz2 };
      }).sort((a, b) => a.rz2 - b.rz2);

      sortedCities.forEach(({ c, rz2, rx2, ry2 }) => {
        if (rz2 < -0.15) return;
        const [px, py] = project(rx2, ry2, rz2);
        const vis = (rz2 + 1) * 0.7;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.05 + CITIES.indexOf(c));
        const sz = c.size;

        // Outer pulse ring (threat nodes only)
        if (c.threat) {
          ctx.beginPath(); ctx.arc(px, py, sz + 4 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `${c.color}${Math.floor(vis * 0.25 * 255).toString(16).padStart(2, "0")}`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Glow halo
        const halo = ctx.createRadialGradient(px, py, 0, px, py, sz * 3);
        halo.addColorStop(0, `${c.color}${Math.floor(vis * 0.5 * 255).toString(16).padStart(2, "0")}`);
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(px, py, sz * 3, 0, Math.PI * 2); ctx.fill();

        // Node dot
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = vis;
        ctx.shadowColor = c.color; ctx.shadowBlur = 8;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Label (only front-facing and large enough)
        if (rz2 > 0.25) {
          ctx.font = "5.5px 'SF Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = `rgba(255,255,255,${vis * 0.55})`;
          ctx.fillText(c.name, px, py - sz - 3);
        }
      });

      // ── Edge atmosphere ring ──────────────────────────────
      const rim = ctx.createRadialGradient(CX, CY, R * 0.92, CX, CY, R * 1.05);
      rim.addColorStop(0,   "transparent");
      rim.addColorStop(0.6, "rgba(0,229,255,0.04)");
      rim.addColorStop(1,   "rgba(0,229,255,0.12)");
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(CX, CY, R * 1.05, 0, Math.PI * 2);
      ctx.arc(CX, CY, R * 0.92, 0, Math.PI * 2, true);
      ctx.fill();

      // ── Scan line sweep ───────────────────────────────────
      const scanX = CX + Math.sin(t * 0.012) * R * 1.05;
      const sg = ctx.createLinearGradient(scanX - 60, 0, scanX + 60, 0);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.5, "rgba(0,229,255,0.06)");
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(scanX - 60, CY - R, 120, R * 2);

      // ── HUD corners ───────────────────────────────────────
      const b = "rgba(0,229,255,0.25)"; const bs = 10;
      ctx.strokeStyle = b; ctx.lineWidth = 1;
      [[2, 2, 1, 1], [W - 2 - bs, 2, -1, 1], [2, H - 2 - bs, 1, -1], [W - 2 - bs, H - 2 - bs, -1, -1]].forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * bs); ctx.lineTo(x, y); ctx.lineTo(x + dx * bs, y);
        ctx.stroke();
      });
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [collapsed]);

  // Canvas mouse drag (globe rotation)
  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    spinRef.current = false;
    dragRef.current = { ...dragRef.current, dragging: true, ox: e.clientX, oy: e.clientY, vrx: 0, vry: 0 };
    let lastX = e.clientX, lastY = e.clientY;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      dragRef.current.vry = dx * 0.007;
      dragRef.current.vrx = dy * 0.007;
      rotRef.current.ry += dx * 0.007;
      rotRef.current.rx = Math.max(-0.8, Math.min(0.8, rotRef.current.rx + dy * 0.007));
    }
    function onUp() {
      dragRef.current.dragging = false;
      setTimeout(() => { spinRef.current = true; }, 2500);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // Widget drag (header)
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
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const threatCities = CITIES.filter(c => c.threat).length;

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 84, userSelect: "none" }}>
      {/* Header */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "5px 8px",
          border: "1px solid rgba(0,229,255,0.15)",
          borderBottom: collapsed ? "1px solid rgba(0,229,255,0.15)" : "none",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          background: "linear-gradient(135deg, rgba(0,10,20,0.97), rgba(0,15,28,0.98))",
          backdropFilter: "blur(20px)",
          cursor: "grab", minWidth: "180px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.06)",
        }}
      >
        <GripHorizontal style={{ width: 10, height: 10, color: "rgba(255,255,255,0.18)", flexShrink: 0 }} />
        <Globe style={{ width: 9, height: 9, color: "#00e5ff", flexShrink: 0 }} />
        <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "1.4px", flex: 1 }}>
          GLOBAL MAP
        </span>
        <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "#e21227", fontWeight: 800, background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)", borderRadius: 4, padding: "0 4px" }}>
          {threatCities} THR
        </span>
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setCollapsed(c => !c)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: 0, lineHeight: 1 }}>
          {collapsed ? <ChevronDown style={{ width: 10, height: 10 }} /> : <ChevronUp style={{ width: 10, height: 10 }} />}
        </button>
      </div>

      {/* Globe panel */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              border: "1px solid rgba(0,229,255,0.12)", borderTop: "none", borderRadius: "0 0 10px 10px",
              background: "rgba(4,4,10,0.97)", backdropFilter: "blur(20px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,229,255,0.04)",
              overflow: "hidden",
            }}>
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.4) 50%, transparent)" }} />

              <div style={{ position: "relative" }}>
                <canvas
                  ref={canvasRef}
                  width={W} height={H}
                  onMouseDown={onCanvasMouseDown}
                  style={{ display: "block", cursor: "grab" }}
                />
                {/* Drag hint */}
                <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: "6px", fontFamily: "monospace", color: "rgba(0,229,255,0.2)", letterSpacing: "0.4px", pointerEvents: "none" }}>
                  DRAG TO ROTATE
                </div>
              </div>

              {/* Stats footer */}
              <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {[
                  { icon: <Crosshair style={{ width: 7, height: 7 }} />, label: "NODES",   val: CITIES.length,         color: "#00e5ff" },
                  { icon: <AlertTriangle style={{ width: 7, height: 7 }} />, label: "THREATS", val: threatCities,          color: "#e21227" },
                  { icon: <Radio style={{ width: 7, height: 7 }} />,   label: "ATTACKS", val: ATTACK_ROUTES.length,    color: "#f59e0b" },
                  { icon: <Wifi style={{ width: 7, height: 7 }} />,    label: "ONLINE",  val: CITIES.length - threatCities, color: "#22c55e" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, padding: "5px 0", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: s.color, marginBottom: 1 }}>{s.icon}</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.4px" }}>{s.label}</div>
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
