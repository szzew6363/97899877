import { useEffect, useRef, useCallback, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion } from "framer-motion";
import { Globe, Shield, Crosshair, Minimize2, Maximize2, Radio } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   GLOBAL THREAT MAP — Ultra 3D Holographic Earth v2
   Continental dots · Dual orbital rings · Volumetric atmosphere
   Gradient arc trails · Hex pulse · Deep space nebula
═══════════════════════════════════════════════════════════════════════ */

const GLOBE_R = 108;
const W = 300; const H = 300;
const CX = W / 2; const CY = H / 2;
const STOR_KEY = "cyber-globe-pos";

interface GeoNode { id: string; name: string; lat: number; lon: number; type: "attacker"|"target"|"relay"; color: string }
interface AttackArc { srcId: string; dstId: string; progress: number; speed: number; color: string; trail: number[] }
interface Star { x: number; y: number; r: number; alpha: number; twinkle: number; color: string }
interface OrbParticle { angle: number; radius: number; speed: number; size: number; alpha: number; color: string }
interface Explosion { x: number; y: number; r: number; alpha: number; color: string }

const NODES: GeoNode[] = [
  { id:"ru", name:"Russia",    lat: 55.75, lon:  37.62, type:"attacker", color:"#e21227" },
  { id:"cn", name:"China",     lat: 39.93, lon: 116.39, type:"attacker", color:"#e21227" },
  { id:"ir", name:"Iran",      lat: 35.69, lon:  51.39, type:"attacker", color:"#f59e0b" },
  { id:"kp", name:"N.Korea",   lat: 39.02, lon: 125.75, type:"attacker", color:"#e21227" },
  { id:"br", name:"Brazil",    lat:-15.78, lon: -47.93, type:"relay",    color:"#a78bfa" },
  { id:"in", name:"India",     lat: 28.61, lon:  77.21, type:"relay",    color:"#a78bfa" },
  { id:"us", name:"USA",       lat: 38.90, lon: -77.04, type:"target",   color:"#00e5ff" },
  { id:"gb", name:"UK",        lat: 51.51, lon:  -0.13, type:"target",   color:"#00e5ff" },
  { id:"de", name:"Germany",   lat: 52.52, lon:  13.41, type:"target",   color:"#22c55e" },
  { id:"ua", name:"Ukraine",   lat: 50.45, lon:  30.52, type:"target",   color:"#22c55e" },
  { id:"jp", name:"Japan",     lat: 35.68, lon: 139.69, type:"target",   color:"#22c55e" },
  { id:"sa", name:"KSA",       lat: 24.68, lon:  46.72, type:"relay",    color:"#a78bfa" },
  { id:"sg", name:"Singapore", lat:  1.35, lon: 103.82, type:"relay",    color:"#a78bfa" },
  { id:"au", name:"Australia", lat:-33.87, lon: 151.21, type:"target",   color:"#22c55e" },
  { id:"ca", name:"Canada",    lat: 45.42, lon: -75.70, type:"target",   color:"#00e5ff" },
  { id:"fr", name:"France",    lat: 48.85, lon:   2.35, type:"target",   color:"#22c55e" },
  { id:"nl", name:"Nether.",   lat: 52.37, lon:   4.90, type:"target",   color:"#22c55e" },
  { id:"tw", name:"Taiwan",    lat: 25.03, lon: 121.56, type:"target",   color:"#00e5ff" },
];

const ARCS_INIT = [
  { srcId:"ru", dstId:"us", speed:0.0016, color:"#e21227" },
  { srcId:"cn", dstId:"gb", speed:0.0020, color:"#e21227" },
  { srcId:"ir", dstId:"de", speed:0.0013, color:"#f59e0b" },
  { srcId:"kp", dstId:"jp", speed:0.0018, color:"#e21227" },
  { srcId:"ru", dstId:"ua", speed:0.0022, color:"#ff4d4d" },
  { srcId:"cn", dstId:"us", speed:0.0012, color:"#f59e0b" },
  { srcId:"br", dstId:"us", speed:0.0017, color:"#a78bfa" },
  { srcId:"in", dstId:"gb", speed:0.0014, color:"#a78bfa" },
  { srcId:"ru", dstId:"ca", speed:0.0011, color:"#e21227" },
  { srcId:"cn", dstId:"au", speed:0.0015, color:"#f59e0b" },
  { srcId:"kp", dstId:"tw", speed:0.0019, color:"#e21227" },
  { srcId:"ir", dstId:"sa", speed:0.0013, color:"#f59e0b" },
];

// Continental dot clouds — simplified land mass simulation
const CONTINENT_DOTS: [number,number][] = [
  // North America
  [70,-140],[68,-120],[65,-100],[60,-95],[55,-80],[50,-85],[48,-70],[45,-75],[42,-83],[38,-77],[35,-78],
  [30,-90],[25,-100],[20,-100],[60,-140],[58,-130],[55,-110],[50,-120],[47,-90],[35,-95],[32,-97],[28,-82],
  // South America
  [10,-75],[5,-60],[0,-50],[-5,-35],[-10,-37],[-15,-47],[-20,-43],[-25,-48],[-30,-52],[-35,-58],[-40,-63],
  [-50,-68],[3,-60],[8,-65],[12,-72],[-8,-78],[-3,-44],[-22,-46],
  // Europe
  [60,10],[58,5],[55,10],[52,13],[50,8],[48,2],[46,7],[44,12],[40,22],[38,15],[36,14],
  [54,18],[62,15],[65,25],[68,28],[58,24],[56,21],[52,21],[50,18],[46,14],[43,16],
  // Africa
  [37,10],[35,5],[30,-5],[25,-15],[20,-16],[15,-14],[10,-13],[5,-3],[0,12],[5,8],
  [-5,12],[-10,15],[-15,14],[-20,14],[-25,15],[-30,18],[-34,18],[-28,22],[0,30],
  [5,35],[10,40],[15,38],[20,33],[25,30],[30,30],[22,40],[12,44],
  // Asia
  [60,90],[55,82],[50,80],[45,72],[40,68],[35,62],[30,50],[25,45],[20,58],[15,44],
  [10,77],[5,100],[0,104],[28,77],[32,74],[35,105],[40,116],[45,130],[50,128],[55,90],
  [60,105],[65,95],[70,85],[25,121],[38,140],[35,136],[30,130],[25,110],[20,100],
  // Australia
  [-20,120],[-25,115],[-30,115],[-35,118],[-38,145],[-35,139],[-30,130],[-25,130],
  [-20,138],[-15,130],[-15,145],[-22,150],[-28,152],[-32,150],[-35,148],
  // Antarctica
  [-70,0],[-72,30],[-75,60],[-72,90],[-70,150],[-70,-60],[-72,-90],[-72,-150],
];

const STARS: Star[] = Array.from({ length: 280 }, () => {
  const palettes = ["#ffffff","#00e5ff","#a78bfa","#e21227","#22c55e"];
  return {
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.4 + 0.2,
    alpha: Math.random() * 0.8 + 0.1,
    twinkle: Math.random() * Math.PI * 2,
    color: palettes[Math.floor(Math.random() * palettes.length)],
  };
});

const ORBT1: OrbParticle[] = Array.from({ length: 100 }, (_, i) => ({
  angle: (i / 100) * Math.PI * 2,
  radius: GLOBE_R + 10 + Math.random() * 12,
  speed: 0.003 + Math.random() * 0.002,
  size: Math.random() * 1.8 + 0.4,
  alpha: Math.random() * 0.7 + 0.2,
  color: Math.random() > 0.5 ? "#e21227" : "#00e5ff",
}));

const ORBT2: OrbParticle[] = Array.from({ length: 60 }, (_, i) => ({
  angle: (i / 60) * Math.PI * 2,
  radius: GLOBE_R + 22 + Math.random() * 8,
  speed: 0.0018 + Math.random() * 0.0015,
  size: Math.random() * 1.2 + 0.3,
  alpha: Math.random() * 0.5 + 0.1,
  color: "#a78bfa",
}));

function toRad(d: number) { return d * Math.PI / 180; }

function project(lat: number, lon: number, rotLon: number, rotX = 0) {
  const la = toRad(lat); const lo = toRad(lon + rotLon);
  const x0 = Math.cos(la) * Math.sin(lo);
  const y0 = Math.sin(la);
  const z0 = Math.cos(la) * Math.cos(lo);
  const rx = toRad(rotX);
  const y  = y0 * Math.cos(rx) - z0 * Math.sin(rx);
  const z  = y0 * Math.sin(rx) + z0 * Math.cos(rx);
  return { x: CX + GLOBE_R * x0, y: CY - GLOBE_R * y, z };
}

function getArcPoint(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  t: number, lift: number
) {
  const mx = (ax + bx) / 2; const my = (ay + by) / 2; const mz = (az + bz) / 2;
  const len = Math.sqrt(mx*mx + my*my + mz*mz);
  const scale = (1 + lift) / len;
  const cx3 = mx * scale; const cy3 = my * scale; const cz3 = mz * scale;
  const mt = 1 - t;
  const px = mt*mt*ax + 2*mt*t*cx3 + t*t*bx;
  const py = mt*mt*ay + 2*mt*t*cy3 + t*t*by;
  const pz = mt*mt*az + 2*mt*t*cz3 + t*t*bz;
  const len2 = Math.sqrt(px*px + py*py + pz*pz);
  const ns = 1 / len2;
  return { x: CX + GLOBE_R * px * ns, y: CY - GLOBE_R * py * ns, z: pz * ns };
}

export function CyberGlobeWidget() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const frameRef     = useRef<number>(0);
  const rotRef       = useRef(0);
  const rotXRef      = useRef(15);
  const velYRef      = useRef(-0.10);
  const velXRef      = useRef(0);
  const dragRef      = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const arcsRef      = useRef<AttackArc[]>(ARCS_INIT.map(a => ({ ...a, progress: Math.random(), trail: [] as number[] })));
  const tickRef      = useRef(0);
  const o1Ref        = useRef(ORBT1.map(p => ({ ...p })));
  const o2Ref        = useRef(ORBT2.map(p => ({ ...p })));
  const exploRef     = useRef<Explosion[]>([]);

  const [minimized, setMinimized] = useState(false);
  const [threatLevel] = useState(92);
  const [attackCount, setAttackCount] = useState(0);

  const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable(STOR_KEY, { x: 12, y: 110 });

  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    let lastX = e.clientX; let lastY = e.clientY;
    dragRef.current = { dragging: true, lastX, lastY };
    velYRef.current = 0; velXRef.current = 0;
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - lastX; const dy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      velYRef.current = dx * 0.5; velXRef.current = dy * 0.4;
      rotRef.current  += dx * 0.5;
      rotXRef.current  = Math.max(-60, Math.min(60, rotXRef.current + dy * 0.4));
    };
    const up = () => {
      dragRef.current.dragging = false;
      setTimeout(() => { velYRef.current = -0.10; velXRef.current = 0; }, 2000);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let atkTotal = 0;

    function drawFrame() {
      ctx.clearRect(0, 0, W, H);
      const t = tickRef.current++;
      if (!dragRef.current.dragging) {
        rotRef.current  += velYRef.current * 0.18;
        rotXRef.current = Math.max(-60, Math.min(60, rotXRef.current + velXRef.current * 0.12));
        velYRef.current += (-0.10 - velYRef.current) * 0.004;
        velXRef.current *= 0.97;
      }

      // ── Deep space nebula ──
      const bg = ctx.createRadialGradient(CX*0.3, CY*0.3, 0, CX, CY, W);
      bg.addColorStop(0,   "rgba(4,2,16,1)");
      bg.addColorStop(0.4, "rgba(2,4,14,1)");
      bg.addColorStop(0.8, "rgba(1,2,8,1)");
      bg.addColorStop(1,   "rgba(0,1,4,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // nebula patches
      [[CX*0.4,CY*0.3,"rgba(60,0,120,0.06)"],[CX*1.6,CY*1.5,"rgba(0,60,100,0.05)"],[CX*0.2,CY*1.4,"rgba(120,0,60,0.04)"]].forEach(([nx,ny,nc]) => {
        const ng = ctx.createRadialGradient(nx as number,ny as number,0,nx as number,ny as number,80);
        ng.addColorStop(0, nc as string); ng.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle = ng; ctx.fillRect(0,0,W,H);
      });

      // ── Stars ──
      STARS.forEach(s => {
        const tw = (Math.sin(t * 0.015 + s.twinkle) + 1) / 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = s.color.replace(")", `,${s.alpha * (0.3 + tw * 0.7)})`).replace("rgb(","rgba(").replace("rgba(rgba(","rgba(");
        ctx.globalAlpha = s.alpha * (0.3 + tw * 0.7);
        ctx.fillStyle = s.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // ── Outer atmosphere (8 rings) ──
      const atmosConfigs: [number, string, string, string][] = [
        [1.65, "rgba(0,30,60,0)",    "rgba(0,30,60,0.008)",  "rgba(0,80,160,0.02)"],
        [1.5,  "rgba(0,229,255,0)",  "rgba(0,229,255,0.01)", "rgba(0,229,255,0.04)"],
        [1.38, "rgba(226,18,39,0)",  "rgba(226,18,39,0.01)", "rgba(226,18,39,0.03)"],
        [1.28, "rgba(0,160,220,0)",  "rgba(0,160,220,0.02)", "rgba(0,160,220,0.06)"],
        [1.18, "rgba(226,18,39,0)",  "rgba(226,18,39,0.03)", "rgba(226,18,39,0.08)"],
        [1.10, "rgba(0,229,255,0)",  "rgba(0,229,255,0.04)", "rgba(0,229,255,0.10)"],
        [1.05, "rgba(0,100,200,0)",  "rgba(0,100,200,0.05)", "rgba(0,100,200,0.12)"],
        [1.02, "rgba(0,60,120,0)",   "rgba(0,60,120,0.08)",  "rgba(0,80,180,0.18)"],
      ];
      atmosConfigs.forEach(([rm, c0, c1, c2]) => {
        const inner = GLOBE_R * (rm - 0.08);
        const atm = ctx.createRadialGradient(CX, CY, inner, CX, CY, GLOBE_R * rm);
        atm.addColorStop(0, c0); atm.addColorStop(0.5, c1); atm.addColorStop(1, c2);
        ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R * rm, 0, Math.PI*2);
        ctx.fillStyle = atm; ctx.fill();
      });

      // ── Globe sphere ──
      const sph = ctx.createRadialGradient(CX-38, CY-38, 0, CX, CY, GLOBE_R);
      sph.addColorStop(0,    "rgba(10,20,40,0.97)");
      sph.addColorStop(0.4,  "rgba(5,10,24,0.97)");
      sph.addColorStop(0.75, "rgba(2,4,12,0.98)");
      sph.addColorStop(1,    "rgba(0,1,6,0.99)");
      ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R, 0, Math.PI*2);
      ctx.fillStyle = sph; ctx.fill();

      // ── Lat/lon grid ──
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "rgba(0,229,255,0.05)";
      ctx.lineWidth = 0.4;
      for (let la = -80; la <= 80; la += 20) {
        ctx.beginPath();
        let first = true;
        for (let lo = 0; lo <= 360; lo += 4) {
          const p = project(la, lo, rotRef.current, rotXRef.current);
          if (p.z > 0) { first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); first = false; }
          else first = true;
        }
        ctx.stroke();
      }
      for (let lo = 0; lo < 360; lo += 20) {
        ctx.beginPath();
        let first = true;
        for (let la = -85; la <= 85; la += 4) {
          const p = project(la, lo, rotRef.current, rotXRef.current);
          if (p.z > 0) { first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); first = false; }
          else first = true;
        }
        ctx.stroke();
      }
      ctx.restore();

      // ── Continental dots ──
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R, 0, Math.PI*2); ctx.clip();
      CONTINENT_DOTS.forEach(([lat, lon]) => {
        const p = project(lat, lon, rotRef.current, rotXRef.current);
        if (p.z > 0.05) {
          const brightness = 0.3 + p.z * 0.7;
          const size = 0.8 + p.z * 0.6;
          ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI*2);
          ctx.fillStyle = `rgba(40,180,120,${brightness * 0.55})`;
          ctx.fill();
          if (p.z > 0.6) {
            ctx.beginPath(); ctx.arc(p.x, p.y, size * 1.8, 0, Math.PI*2);
            ctx.fillStyle = `rgba(60,220,140,${brightness * 0.12})`;
            ctx.fill();
          }
        }
      });
      ctx.restore();

      // ── Nodes (back-facing, dim) ──
      const nodeProj = NODES.map(n => ({
        ...n, p: project(n.lat, n.lon, rotRef.current, rotXRef.current)
      }));

      nodeProj.filter(n => n.p.z <= 0).forEach(n => {
        const alpha = 0.15 + (1 - n.p.z) * 0.1;
        ctx.beginPath(); ctx.arc(n.p.x, n.p.y, 2, 0, Math.PI*2);
        ctx.fillStyle = n.color.replace("rgb(","rgba(").replace(")",`,${alpha})`);
        ctx.fill();
      });

      // ── Attack arcs ──
      arcsRef.current.forEach(arc => {
        const src = NODES.find(n => n.id === arc.srcId)!;
        const dst = NODES.find(n => n.id === arc.dstId)!;
        if (!src || !dst) return;

        // store trail
        arc.trail.unshift(arc.progress);
        if (arc.trail.length > 18) arc.trail.pop();

        // draw trail
        arc.trail.forEach((tp, ti) => {
          const alpha = (1 - ti / arc.trail.length) * 0.5;
          const srcR = toRad(90 - src.lat); const srcL = toRad(src.lon + rotRef.current);
          const dstR = toRad(90 - dst.lat); const dstL = toRad(dst.lon + rotRef.current);
          const ax = Math.sin(srcR)*Math.cos(srcL); const ay = Math.cos(srcR); const az = Math.sin(srcR)*Math.sin(srcL);
          const bx = Math.sin(dstR)*Math.cos(dstL); const by = Math.cos(dstR); const bz = Math.sin(dstR)*Math.sin(dstL);
          const [axR, ayR, azR] = [ax, ay * Math.cos(toRad(rotXRef.current)) - az * Math.sin(toRad(rotXRef.current)), ay * Math.sin(toRad(rotXRef.current)) + az * Math.cos(toRad(rotXRef.current))];
          const [bxR, byR, bzR] = [bx, by * Math.cos(toRad(rotXRef.current)) - bz * Math.sin(toRad(rotXRef.current)), by * Math.sin(toRad(rotXRef.current)) + bz * Math.cos(toRad(rotXRef.current))];
          const pp = getArcPoint(axR, ayR, azR, bxR, byR, bzR, tp, 0.45);
          if (pp.z > -0.1) {
            ctx.beginPath(); ctx.arc(pp.x, pp.y, 1.2 * (1 - ti/arc.trail.length), 0, Math.PI*2);
            ctx.fillStyle = arc.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
          }
        });
        ctx.globalAlpha = 1;

        // draw arc head
        const srcR = toRad(90 - src.lat); const srcL = toRad(src.lon + rotRef.current);
        const dstR = toRad(90 - dst.lat); const dstL = toRad(dst.lon + rotRef.current);
        const ax = Math.sin(srcR)*Math.cos(srcL); const ay = Math.cos(srcR); const az = Math.sin(srcR)*Math.sin(srcL);
        const bx = Math.sin(dstR)*Math.cos(dstL); const by = Math.cos(dstR); const bz = Math.sin(dstR)*Math.sin(dstL);
        const rotRad = toRad(rotXRef.current);
        const axR = ax; const ayR = ay * Math.cos(rotRad) - az * Math.sin(rotRad); const azR = ay * Math.sin(rotRad) + az * Math.cos(rotRad);
        const bxR = bx; const byR = by * Math.cos(rotRad) - bz * Math.sin(rotRad); const bzR = by * Math.sin(rotRad) + bz * Math.cos(rotRad);

        const pp = getArcPoint(axR, ayR, azR, bxR, byR, bzR, arc.progress, 0.45);
        if (pp.z > -0.1) {
          const grd = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 6);
          grd.addColorStop(0, arc.color);
          grd.addColorStop(0.4, arc.color.replace("rgb(","rgba(").replace(")",",0.6)"));
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(pp.x, pp.y, 6, 0, Math.PI*2);
          ctx.fill();
          ctx.beginPath(); ctx.arc(pp.x, pp.y, 2.5, 0, Math.PI*2);
          ctx.fillStyle = "#fff";
          ctx.globalAlpha = 0.9;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // advance
        arc.progress += arc.speed;
        if (arc.progress >= 1) {
          arc.progress = 0; arc.trail = [];
          atkTotal++;
          if (atkTotal % 8 === 0) setAttackCount(atkTotal);
          // explosion
          const dstP = project(dst.lat, dst.lon, rotRef.current, rotXRef.current);
          if (dstP.z > 0) {
            exploRef.current.push({ x: dstP.x, y: dstP.y, r: 1, alpha: 0.9, color: arc.color });
          }
        }
      });

      // ── Explosions ──
      exploRef.current = exploRef.current.filter(ex => ex.alpha > 0.02);
      exploRef.current.forEach(ex => {
        ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2);
        ctx.strokeStyle = ex.color;
        ctx.globalAlpha = ex.alpha;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ex.r += 1.5; ex.alpha *= 0.84;
      });
      ctx.globalAlpha = 1;

      // ── Front-facing nodes ──
      nodeProj.filter(n => n.p.z > 0).sort((a,b) => a.p.z - b.p.z).forEach(n => {
        const sc = 0.5 + n.p.z * 0.9;
        const r  = 4 * sc;

        // outer glow ring
        const glw = ctx.createRadialGradient(n.p.x, n.p.y, 0, n.p.x, n.p.y, r * 4.5);
        glw.addColorStop(0, n.color + "55");
        glw.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glw;
        ctx.beginPath(); ctx.arc(n.p.x, n.p.y, r * 4.5, 0, Math.PI*2);
        ctx.fill();

        // pulse ring
        const pulse = (Math.sin(t * 0.04 + n.p.z * 3) + 1) / 2;
        ctx.beginPath(); ctx.arc(n.p.x, n.p.y, r + 3 + pulse * 4, 0, Math.PI*2);
        ctx.strokeStyle = n.color;
        ctx.globalAlpha = 0.3 * pulse;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // crosshair
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 0.7;
        ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(n.p.x - r*1.8, n.p.y); ctx.lineTo(n.p.x - r*0.7, n.p.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(n.p.x + r*0.7, n.p.y); ctx.lineTo(n.p.x + r*1.8, n.p.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(n.p.x, n.p.y - r*1.8); ctx.lineTo(n.p.x, n.p.y - r*0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(n.p.x, n.p.y + r*0.7); ctx.lineTo(n.p.x, n.p.y + r*1.8); ctx.stroke();
        ctx.globalAlpha = 1;

        // core
        const cg = ctx.createRadialGradient(n.p.x - r*0.3, n.p.y - r*0.3, 0, n.p.x, n.p.y, r * 1.2);
        cg.addColorStop(0, "#ffffff");
        cg.addColorStop(0.4, n.color);
        cg.addColorStop(1, n.color + "88");
        ctx.beginPath(); ctx.arc(n.p.x, n.p.y, r, 0, Math.PI*2);
        ctx.fillStyle = cg; ctx.fill();

        // label
        if (n.p.z > 0.3) {
          ctx.fillStyle = n.color;
          ctx.globalAlpha = Math.min(1, (n.p.z - 0.3) * 2.5);
          ctx.font = `bold ${Math.round(7 + sc * 2)}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText(n.name, n.p.x, n.p.y + r + 8);
          ctx.globalAlpha = 1;
        }
      });

      // ── Orbital rings ──
      const ringTilt1 = 20; const ringTilt2 = 65;
      [o1Ref.current, o2Ref.current].forEach((ring, ri) => {
        const tilt = ri === 0 ? ringTilt1 : ringTilt2;
        const tiltR = toRad(tilt);
        ring.forEach(p => {
          p.angle += p.speed;
          const rx = p.radius * Math.cos(p.angle);
          const ry = p.radius * Math.sin(p.angle) * Math.cos(tiltR);
          const rz = p.radius * Math.sin(p.angle) * Math.sin(tiltR);
          if (rz + GLOBE_R * 0.3 > 0) {
            const sc = 0.6 + rz / (p.radius * 2);
            ctx.beginPath();
            ctx.arc(CX + rx, CY - ry, p.size * sc, 0, Math.PI*2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha * sc;
            ctx.fill();
          }
        });
        ctx.globalAlpha = 1;
      });

      // ── Specular highlight ──
      const spec1 = ctx.createRadialGradient(CX - 36, CY - 36, 0, CX - 36, CY - 36, 55);
      spec1.addColorStop(0, "rgba(255,255,255,0.08)");
      spec1.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = spec1;
      ctx.beginPath(); ctx.arc(CX, CY, GLOBE_R, 0, Math.PI*2); ctx.clip();
      ctx.fillRect(0, 0, W, H);

      // ── Scan line ──
      const scanY = ((t * 0.7) % H);
      const scanG = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
      scanG.addColorStop(0, "rgba(0,229,255,0)");
      scanG.addColorStop(0.5, "rgba(0,229,255,0.08)");
      scanG.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = scanG;
      ctx.fillRect(0, scanY - 6, W, 12);

      frameRef.current = requestAnimationFrame(drawFrame);
    }

    drawFrame();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div ref={rootRef} style={{ left: pos.x, top: pos.y }} className="fixed z-[96] select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[#1f1f1f] overflow-hidden shadow-[0_0_40px_rgba(226,18,39,0.2),0_0_80px_rgba(0,0,0,0.8)]"
        style={{ background: "rgba(4,2,12,0.97)", backdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 cursor-grab border-b border-[#1f1f1f]"
          onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}
        >
          <Globe size={11} className="text-[#e21227]" />
          <span className="text-[10px] font-mono font-bold tracking-[2px] text-[#e21227]">GLOBAL THREAT MAP</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1">
              <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ duration:1.4, repeat:Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#e21227]" />
              <span className="text-[9px] font-mono text-[#e21227]">LIVE</span>
            </div>
            <span className="text-[9px] font-mono text-[#555]">TL:{threatLevel}%</span>
            <button onClick={() => setMinimized(m => !m)} className="text-[#555] hover:text-white">
              {minimized ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
            </button>
          </div>
        </div>

        {!minimized && (
          <>
            <canvas
              ref={canvasRef} width={W} height={H}
              className="block cursor-crosshair"
              onMouseDown={onCanvasMouseDown}
            />
            {/* Footer stats */}
            <div className="flex items-center gap-4 px-3 py-1 border-t border-[#1f1f1f]">
              <div className="flex items-center gap-1">
                <Shield size={9} className="text-[#e21227]" />
                <span className="text-[9px] font-mono text-[#e21227]">{attackCount} ATTACKS</span>
              </div>
              <div className="flex items-center gap-1">
                <Crosshair size={9} className="text-[#00e5ff]" />
                <span className="text-[9px] font-mono text-[#00e5ff]">{NODES.filter(n=>n.type==="target").length} TARGETS</span>
              </div>
              <div className="flex items-center gap-1">
                <Radio size={9} className="text-[#a78bfa]" />
                <span className="text-[9px] font-mono text-[#555]">DRAG TO ROTATE</span>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
