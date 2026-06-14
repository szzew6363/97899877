import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, AlertTriangle, Activity, Cpu, Wifi, Server, Globe, Zap, Eye, Target, Lock, Radio, Network, BarChart3 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function randBetween(a: number, b: number) { return a + Math.random() * (b - a); }

const ATTACK_TYPES = [
  "SQL Injection","XSS Payload","RCE Attempt","SSRF Probe","Path Traversal",
  "Brute Force","CSRF Token Bypass","XXE Injection","IDOR Exploit","Log4Shell",
  "Buffer Overflow","Zero-Day CVE-2024","Supply Chain","DLL Hijack","Kernel Exploit",
];
const COUNTRIES = ["RU","CN","KP","IR","BR","US","DE","UK","AU","IN"];
const SEVERITIES: { label: string; color: string }[] = [
  { label: "CRITICAL", color: "#e21227" },
  { label: "HIGH", color: "#ff6b35" },
  { label: "MEDIUM", color: "#f59e0b" },
  { label: "LOW", color: "#22c55e" },
];

function genAttack() {
  const sev = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
  return {
    id: Math.random().toString(36).slice(2),
    time: new Date().toISOString().slice(11,19),
    type: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)],
    src: `${randBetween(1,254)|0}.${randBetween(1,254)|0}.${randBetween(1,254)|0}.${randBetween(1,254)|0}`,
    country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
    sev, port: [80,443,22,3389,8080,9200,6379][Math.floor(Math.random() * 7)],
  };
}

/* ═══════════════════════════════════════════════
   3D THREAT INTELLIGENCE GLOBE
═══════════════════════════════════════════════ */
const GLOBE_NODES: { lon: number; lat: number; code: string; color: string }[] = [
  { lon: 37,   lat: 55,  code: "RU", color: "#e21227" },
  { lon: 116,  lat: 39,  code: "CN", color: "#e21227" },
  { lon: 125,  lat: 39,  code: "KP", color: "#ff6b35" },
  { lon: 51,   lat: 35,  code: "IR", color: "#ff6b35" },
  { lon: -77,  lat: 38,  code: "US", color: "#22c55e" },
  { lon: 0,    lat: 51,  code: "UK", color: "#3b82f6" },
  { lon: 13,   lat: 52,  code: "DE", color: "#3b82f6" },
  { lon: -47,  lat: -15, code: "BR", color: "#f59e0b" },
  { lon: 72,   lat: 19,  code: "IN", color: "#a855f7" },
  { lon: 151,  lat: -33, code: "AU", color: "#22c55e" },
  { lon: 139,  lat: 35,  code: "JP", color: "#00e5ff" },
  { lon: 2,    lat: 48,  code: "FR", color: "#3b82f6" },
];

interface ArcEntry {
  id: string;
  srcIdx: number;
  dstIdx: number;
  progress: number;
  speed: number;
  color: string;
  width: number;
}

function ThreatGlobe({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef({ y: 0, x: 0.15, drag: false, lastX: 0, lastY: 0 });
  const arcsRef = useRef<ArcEntry[]>([]);
  const frameRef = useRef<number>(0);

  // Spawn initial arcs
  useEffect(() => {
    function spawnArc() {
      const si = Math.floor(Math.random() * GLOBE_NODES.length);
      let di = Math.floor(Math.random() * GLOBE_NODES.length);
      while (di === si) di = Math.floor(Math.random() * GLOBE_NODES.length);
      const sev = Math.random();
      arcsRef.current.push({
        id: Math.random().toString(36).slice(2),
        srcIdx: si, dstIdx: di,
        progress: 0,
        speed: 0.003 + Math.random() * 0.004,
        color: sev > 0.7 ? "#e21227" : sev > 0.4 ? "#f59e0b" : "#22c55e",
        width: sev > 0.7 ? 2.5 : 1.5,
      });
    }
    for (let i = 0; i < 8; i++) spawnArc();
    const id = setInterval(() => { if (arcsRef.current.length < 12) spawnArc(); }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Mouse / drag handlers
    function onMouseDown(e: MouseEvent) {
      rotRef.current.drag = true;
      rotRef.current.lastX = e.clientX;
      rotRef.current.lastY = e.clientY;
    }
    function onMouseMove(e: MouseEvent) {
      if (!rotRef.current.drag) return;
      rotRef.current.y += (e.clientX - rotRef.current.lastX) * 0.005;
      rotRef.current.x += (e.clientY - rotRef.current.lastY) * 0.003;
      rotRef.current.x = Math.max(-1.2, Math.min(1.2, rotRef.current.x));
      rotRef.current.lastX = e.clientX;
      rotRef.current.lastY = e.clientY;
    }
    function onMouseUp() { rotRef.current.drag = false; }

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 3D projection helper
    function project(lon: number, lat: number, R: number, cx: number, cy: number, rotY: number, rotX: number) {
      const phi = (lat * Math.PI) / 180;
      const lam = (lon * Math.PI) / 180 + rotY;

      let x = Math.cos(phi) * Math.sin(lam);
      let y = Math.sin(phi);
      let z = Math.cos(phi) * Math.cos(lam);

      // Rotate around X axis
      const y2 = y * Math.cos(rotX) - z * Math.sin(rotX);
      const z2 = y * Math.sin(rotX) + z * Math.cos(rotX);

      return {
        sx: cx + R * x,
        sy: cy - R * y2,
        z: z2,
        visible: z2 > -0.05,
      };
    }

    function draw() {
      const w = canvas!.width; const h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      const R = Math.min(w, h) * 0.38;
      const cx = w / 2; const cy = h / 2;

      if (!rotRef.current.drag) {
        rotRef.current.y += 0.003;
      }
      const ry = rotRef.current.y;
      const rx = rotRef.current.x;

      // ── Atmosphere glow ──
      const atm = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25);
      atm.addColorStop(0, "rgba(226,18,39,0.12)");
      atm.addColorStop(0.5, "rgba(226,18,39,0.04)");
      atm.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = atm;
      ctx.fill();

      // ── Globe base ──
      const base = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, 0, cx, cy, R);
      base.addColorStop(0, "rgba(20,20,35,1)");
      base.addColorStop(0.6, "rgba(10,10,20,1)");
      base.addColorStop(1, "rgba(4,4,10,1)");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = base;
      ctx.fill();

      // ── Specular highlight ──
      const spec = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, 0, cx - R * 0.35, cy - R * 0.35, R * 0.7);
      spec.addColorStop(0, "rgba(255,255,255,0.06)");
      spec.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      // ── Clip to globe ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // ── Parallels (latitude lines) ──
      for (let lat = -75; lat <= 75; lat += 15) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 3) {
          const p = project(lon, lat, R, cx, cy, ry, rx);
          if (!p.visible) { first = true; continue; }
          const alpha = (p.z + 0.5) * 0.12;
          if (first) {
            ctx.strokeStyle = `rgba(226,18,39,${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(p.sx, p.sy);
            first = false;
          } else {
            ctx.lineTo(p.sx, p.sy);
          }
        }
        ctx.stroke();
      }

      // ── Meridians (longitude lines) ──
      for (let lon = -165; lon <= 180; lon += 15) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = project(lon, lat, R, cx, cy, ry, rx);
          if (!p.visible) { first = true; continue; }
          const alpha = (p.z + 0.5) * 0.12;
          if (first) {
            ctx.strokeStyle = `rgba(226,18,39,${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(p.sx, p.sy);
            first = false;
          } else {
            ctx.lineTo(p.sx, p.sy);
          }
        }
        ctx.stroke();
      }

      ctx.restore();

      // ── Globe border glow ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(226,18,39,0.5)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#e21227";
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();

      // ── Attack arcs ──
      const deadIds: string[] = [];
      for (const arc of arcsRef.current) {
        arc.progress += arc.speed;
        if (arc.progress >= 1) { deadIds.push(arc.id); continue; }

        const src = GLOBE_NODES[arc.srcIdx];
        const dst = GLOBE_NODES[arc.dstIdx];
        const steps = 60;
        const drawTo = Math.floor(arc.progress * steps);
        const tail = Math.max(0, drawTo - 18);

        ctx.save();
        for (let i = tail; i < drawTo - 1; i++) {
          const t0 = i / steps;
          const t1 = (i + 1) / steps;
          const lift0 = 1 + 0.35 * Math.sin(Math.PI * t0);
          const lift1 = 1 + 0.35 * Math.sin(Math.PI * t1);

          const lon0 = src.lon + (dst.lon - src.lon) * t0;
          const lat0 = src.lat + (dst.lat - src.lat) * t0;
          const lon1 = src.lon + (dst.lon - src.lon) * t1;
          const lat1 = src.lat + (dst.lat - src.lat) * t1;

          const p0 = project(lon0, lat0, R * lift0, cx, cy, ry, rx);
          const p1 = project(lon1, lat1, R * lift1, cx, cy, ry, rx);
          if (!p0.visible || !p1.visible) continue;

          const segAlpha = ((i - tail) / 18) * Math.min(1, (drawTo - 1 - i) / 5);
          ctx.beginPath();
          ctx.moveTo(p0.sx, p0.sy);
          ctx.lineTo(p1.sx, p1.sy);
          ctx.strokeStyle = arc.color;
          ctx.globalAlpha = segAlpha * 0.9;
          ctx.lineWidth = arc.width;
          ctx.shadowColor = arc.color;
          ctx.shadowBlur = 10;
          ctx.stroke();
        }
        ctx.restore();

        // ── Traveling dot at tip ──
        const tTip = arc.progress;
        const liftTip = 1 + 0.35 * Math.sin(Math.PI * tTip);
        const lonTip = src.lon + (dst.lon - src.lon) * tTip;
        const latTip = src.lat + (dst.lat - src.lat) * tTip;
        const tip = project(lonTip, latTip, R * liftTip, cx, cy, ry, rx);
        if (tip.visible) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(tip.sx, tip.sy, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = arc.color;
          ctx.shadowColor = arc.color;
          ctx.shadowBlur = 18;
          ctx.fill();
          ctx.restore();
        }
      }
      arcsRef.current = arcsRef.current.filter(a => !deadIds.includes(a.id));

      // ── Country nodes ──
      for (const node of GLOBE_NODES) {
        const p = project(node.lon, node.lat, R, cx, cy, ry, rx);
        if (!p.visible) continue;

        const nodeR = 5 + p.z * 2;

        ctx.save();
        // Glow ring
        const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, nodeR * 3.5);
        grd.addColorStop(0, `${node.color}60`);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, nodeR * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Main dot
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, nodeR * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 14;
        ctx.fill();

        // Pulse ring
        const t = Date.now() / 1000;
        const pulseR = nodeR + Math.sin(t * 2 + node.lon) * 3 + 2;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `${node.color}60`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 6;
        ctx.textAlign = "center";
        ctx.fillText(node.code, p.sx, p.sy - nodeR - 5);
        ctx.restore();
      }

      // ── Equator highlight ──
      ctx.save();
      ctx.beginPath();
      let eFirst = true;
      for (let lon = -180; lon <= 180; lon += 2) {
        const p = project(lon, 0, R, cx, cy, ry, rx);
        if (!p.visible) { eFirst = true; continue; }
        if (eFirst) { ctx.moveTo(p.sx, p.sy); eFirst = false; }
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.strokeStyle = "rgba(226,18,39,0.3)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block", cursor: "grab" }}
    />
  );
}

/* ═══════════════════════════════════════════════
   NETWORK NODE GRAPH CANVAS
═══════════════════════════════════════════════ */
interface Node {
  x: number; y: number; vx: number; vy: number;
  r: number; color: string; label: string; pulse: number; threat: number;
}

function NetworkCanvas({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const labels = ["CORE","DMZ","WEB-01","DB-01","API-GW","PROXY","CDN","MGMT","CI/CD","VPN","MAIL","DNS","BACKUP","EDR","SIEM"];
    const colors = ["#e21227","#ff6b35","#3b82f6","#22c55e","#a855f7","#f59e0b","#00e5ff"];
    nodesRef.current = labels.map((label, i) => ({
      x: randBetween(60, width - 60),
      y: randBetween(60, height - 60),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: i === 0 ? 20 : randBetween(7, 14),
      color: colors[i % colors.length],
      label,
      pulse: Math.random() * Math.PI * 2,
      threat: Math.random(),
    }));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const nodes = nodesRef.current;

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        n.pulse += 0.04;
        if (n.x < n.r || n.x > width - n.r) n.vx *= -1;
        if (n.y < n.r || n.y > height - n.r) n.vy *= -1;
        n.threat = Math.max(0, Math.min(1, n.threat + (Math.random() - 0.5) * 0.02));
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]; const b = nodes[j];
          const dx = a.x - b.x; const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 200) continue;
          const alpha = (1 - dist / 200) * 0.5;
          const threatened = a.threat > 0.7 || b.threat > 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = threatened ? `rgba(226,18,39,${alpha})` : `rgba(255,255,255,${alpha * 0.4})`;
          ctx.lineWidth = threatened ? 1.5 : 0.5;
          ctx.stroke();
        }
      }

      nodes.forEach(n => {
        const isCompromised = n.threat > 0.75;
        const isWarning = n.threat > 0.5;
        const nodeColor = isCompromised ? "#e21227" : isWarning ? "#f59e0b" : n.color;
        const pulseR = n.r + 8 + Math.sin(n.pulse) * 4;
        const pulseAlpha = (Math.sin(n.pulse) * 0.5 + 0.5) * 0.4;

        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${isCompromised ? "226,18,39" : "255,255,255"},${pulseAlpha})`;
        ctx.lineWidth = 1; ctx.stroke();

        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.5);
        grd.addColorStop(0, `${nodeColor}40`); grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(n.x - n.r * 0.3, n.y - n.r * 0.3, 0, n.x, n.y, n.r);
        grad.addColorStop(0, `${nodeColor}ff`); grad.addColorStop(1, `${nodeColor}88`);
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = isCompromised ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)";
        ctx.lineWidth = isCompromised ? 2 : 1; ctx.stroke();

        ctx.font = `bold ${Math.max(9, n.r * 0.7)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = nodeColor; ctx.shadowBlur = 6;
        ctx.fillText(n.label, n.x, n.y + n.r * 0.35);
        ctx.shadowBlur = 0;
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: "block" }} />;
}

/* ═══════════════════════════════════════════════
   ANALYTICS CANVAS — Live charts
═══════════════════════════════════════════════ */
function AnalyticsCanvas({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const histRef = useRef<number[]>(Array.from({ length: 60 }, () => randBetween(10, 90)));
  const netRef = useRef<number[]>(Array.from({ length: 60 }, () => randBetween(5, 60)));
  const frameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const last = histRef.current[histRef.current.length - 1];
      histRef.current = [...histRef.current.slice(1), Math.max(5, Math.min(95, last + (Math.random() - 0.5) * 15))];
      const lastN = netRef.current[netRef.current.length - 1];
      netRef.current = [...netRef.current.slice(1), Math.max(5, Math.min(75, lastN + (Math.random() - 0.5) * 12))];
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function drawChart(data: number[], x0: number, y0: number, w: number, h: number, color: string, label: string) {
      const N = data.length;
      const max = 100;

      // Background
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.roundRect(x0, y0, w, h, 8);
      ctx.fill();

      // Grid lines
      for (let i = 0; i <= 4; i++) {
        const y = y0 + (h * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y);
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1; ctx.stroke();
      }

      // Fill area under chart
      ctx.beginPath();
      ctx.moveTo(x0, y0 + h);
      for (let i = 0; i < N; i++) {
        const px = x0 + (i / (N - 1)) * w;
        const py = y0 + h - (data[i] / max) * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(x0 + w, y0 + h);
      ctx.closePath();
      const fillGrd = ctx.createLinearGradient(0, y0, 0, y0 + h);
      fillGrd.addColorStop(0, `${color}30`);
      fillGrd.addColorStop(1, "transparent");
      ctx.fillStyle = fillGrd;
      ctx.fill();

      // Line
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const px = x0 + (i / (N - 1)) * w;
        const py = y0 + h - (data[i] / max) * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Current value dot
      const lastVal = data[N - 1];
      const lx = x0 + w;
      const ly = y0 + h - (lastVal / max) * h;
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.fill(); ctx.shadowBlur = 0;

      // Labels
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "left";
      ctx.fillText(label, x0 + 8, y0 + 16);
      ctx.fillStyle = color;
      ctx.font = "bold 14px monospace";
      ctx.fillText(`${lastVal.toFixed(0)}%`, x0 + w - 42, y0 + 16);
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const pad = 20;
      const chartH = (height - pad * 3) / 2;
      const chartW = width - pad * 2;

      drawChart(histRef.current, pad, pad, chartW, chartH, "#e21227", "THREAT EVENTS/s");
      drawChart(netRef.current, pad, pad * 2 + chartH, chartW, chartH, "#00e5ff", "NETWORK BANDWIDTH");

      // Radar mini
      const rcx = width / 2;
      const rcy = height / 2;
      const _ = rcy; void _;

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: "block" }} />;
}

/* ═══════════════════════════════════════════════
   UI COMPONENTS
═══════════════════════════════════════════════ */
function MetricBar({ label, value, color, unit = "%" }: { label: string; value: number; color: string; unit?: string }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
        <span style={{ fontSize: "11px", color, fontFamily: "monospace", fontWeight: 700, textShadow: `0 0 8px ${color}` }}>{value.toFixed(1)}{unit}</span>
      </div>
      <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: "4px", background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Shield; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: "12px",
      background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
      border: `1px solid ${color}25`, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <Icon style={{ width: "14px", height: "14px", color }} />
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 900, color, letterSpacing: "-1px", fontFamily: "monospace", textShadow: `0 0 12px ${color}60` }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "2px", fontFamily: "monospace" }}>{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN WAR ROOM MODAL
═══════════════════════════════════════════════ */
type CenterTab = "topology" | "globe" | "analytics";

export function WarRoomModal({ open, onOpenChange }: Props) {
  const [attacks, setAttacks] = useState(() => Array.from({ length: 12 }, genAttack));
  const [metrics, setMetrics] = useState({ cpu: 34, mem: 58, net: 27, disk: 41, threats: 7, blocked: 1847 });
  const [alertLevel, setAlertLevel] = useState<"NORMAL" | "ELEVATED" | "CRITICAL">("ELEVATED");
  const [centerTab, setCenterTab] = useState<CenterTab>("globe");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 340 });
  const feedRef = useRef<HTMLDivElement>(null);

  const updateDims = useCallback(() => {
    const el = containerRef.current;
    if (el) setDims({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDims();
    const ro = new ResizeObserver(updateDims);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [open, updateDims]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setMetrics(m => {
        const next = {
          cpu: Math.max(5, Math.min(98, m.cpu + (Math.random() - 0.5) * 8)),
          mem: Math.max(20, Math.min(95, m.mem + (Math.random() - 0.5) * 4)),
          net: Math.max(1, Math.min(100, m.net + (Math.random() - 0.5) * 12)),
          disk: Math.max(10, Math.min(90, m.disk + (Math.random() - 0.5) * 2)),
          threats: Math.max(0, m.threats + (Math.random() < 0.3 ? Math.floor(Math.random() * 3) : -Math.floor(Math.random() * 2))),
          blocked: m.blocked + Math.floor(Math.random() * 5),
        };
        if (next.threats > 12) setAlertLevel("CRITICAL");
        else if (next.threats > 5) setAlertLevel("ELEVATED");
        else setAlertLevel("NORMAL");
        return next;
      });
      if (Math.random() < 0.6) {
        setAttacks(prev => [genAttack(), ...prev].slice(0, 30));
      }
    }, 1500);
    return () => clearInterval(id);
  }, [open]);

  const alertColors: Record<string, string> = { NORMAL: "#22c55e", ELEVATED: "#f59e0b", CRITICAL: "#e21227" };

  const TAB_DEFS: { id: CenterTab; icon: typeof Globe; label: string }[] = [
    { id: "globe",     icon: Globe,    label: "THREAT GLOBE" },
    { id: "topology",  icon: Network,  label: "TOPOLOGY" },
    { id: "analytics", icon: BarChart3, label: "ANALYTICS" },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.94)", backdropFilter: "blur(20px)", display: "flex" }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            background: "linear-gradient(180deg, #06060a 0%, #080810 100%)",
            border: "1px solid rgba(226,18,39,0.3)", overflow: "hidden", position: "relative",
          }}
        >
          {/* Scanline */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
            backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 4px, transparent 5px)" }} />
          {/* Top glow */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", zIndex: 20,
            background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.8) 30%, rgba(255,255,255,0.5) 50%, rgba(226,18,39,0.8) 70%, transparent)" }} />

          {/* ── HEADER ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 20px", borderBottom: "1px solid rgba(226,18,39,0.15)",
            background: "linear-gradient(180deg, rgba(226,18,39,0.06) 0%, transparent 100%)",
            flexShrink: 0, position: "relative", zIndex: 15,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(226,18,39,0.2), rgba(226,18,39,0.05))",
                border: "1px solid rgba(226,18,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 20px rgba(226,18,39,0.35)", transform: "perspective(100px) rotateX(5deg)",
              }}>
                <Target style={{ width: "20px", height: "20px", color: "#e21227" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h1 style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "-0.5px", fontFamily: "monospace", color: "#fff" }}>WAR ROOM</h1>
                  <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px" }}>KaliGPT SOC v2.0</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: alertColors[alertLevel],
                    padding: "2px 8px", borderRadius: "4px",
                    background: `${alertColors[alertLevel]}15`, border: `1px solid ${alertColors[alertLevel]}40`,
                    textShadow: `0 0 8px ${alertColors[alertLevel]}`, letterSpacing: "1px",
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: alertColors[alertLevel], boxShadow: `0 0 6px ${alertColors[alertLevel]}` }} />
                    ALERT: {alertLevel}
                  </span>
                  <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>{new Date().toLocaleTimeString()} UTC</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {[
                { icon: Shield, label: "IDS", color: "#22c55e" },
                { icon: Lock, label: "WAF", color: "#3b82f6" },
                { icon: Radio, label: "SIEM", color: "#a855f7" },
                { icon: Eye, label: "EDR", color: "#f59e0b" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "4px 10px", borderRadius: "8px",
                  background: `${color}12`, border: `1px solid ${color}35`,
                  fontSize: "10px", fontFamily: "monospace", fontWeight: 700, color,
                }}>
                  <Icon style={{ width: "10px", height: "10px" }} />
                  {label}
                </div>
              ))}
              <button
                onClick={() => onOpenChange(false)}
                style={{
                  marginLeft: "8px", padding: "8px", borderRadius: "10px",
                  background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.3)",
                  color: "#e21227", cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", transition: "all 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.25)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.1)"; }}
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="md:[grid-template-columns:260px_1fr_280px]" style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr", overflow: "hidden", minHeight: 0 }}>

            {/* LEFT — Metrics */}
            <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>SYSTEM VITALS</div>
              <MetricBar label="CPU Usage" value={metrics.cpu} color={metrics.cpu > 80 ? "#e21227" : metrics.cpu > 60 ? "#f59e0b" : "#22c55e"} />
              <MetricBar label="Memory" value={metrics.mem} color={metrics.mem > 85 ? "#e21227" : "#3b82f6"} />
              <MetricBar label="Network I/O" value={metrics.net} color="#00e5ff" unit=" Gbps" />
              <MetricBar label="Disk I/O" value={metrics.disk} color="#a855f7" />
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "8px 0" }} />

              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>THREAT INTEL</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <StatCard icon={AlertTriangle} label="Active" value={String(metrics.threats)} sub="threats" color="#e21227" />
                <StatCard icon={Shield} label="Blocked" value={metrics.blocked.toLocaleString()} sub="today" color="#22c55e" />
                <StatCard icon={Activity} label="Events/s" value={(randBetween(200, 800)|0).toString()} sub="live" color="#3b82f6" />
                <StatCard icon={Globe} label="Sources" value={(randBetween(20, 80)|0).toString()} sub="unique IPs" color="#f59e0b" />
              </div>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "8px 0" }} />

              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>SEVERITY BREAKDOWN</div>
              {SEVERITIES.map(({ label, color }) => {
                const count = Math.floor(randBetween(0, 15));
                return (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                    <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)", flex: 1 }}>{label}</span>
                    <span style={{ fontSize: "11px", fontFamily: "monospace", color, fontWeight: 700 }}>{count}</span>
                    <div style={{ width: "50px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / 15) * 100}%`, background: color, borderRadius: "3px" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "8px 0" }} />

              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>PROTOCOL ANALYSIS</div>
              {[
                { proto: "HTTP/S", pct: 48, color: "#3b82f6" },
                { proto: "SSH",    pct: 21, color: "#22c55e" },
                { proto: "DNS",    pct: 15, color: "#f59e0b" },
                { proto: "SMTP",   pct: 10, color: "#a855f7" },
                { proto: "OTHER",  pct: 6,  color: "#6b7280" },
              ].map(({ proto, pct, color }) => (
                <div key={proto} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                  <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)", width: "40px", flexShrink: 0 }}>{proto}</span>
                  <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "4px" }} />
                  </div>
                  <span style={{ fontSize: "10px", fontFamily: "monospace", color, width: "26px", textAlign: "right" }}>{pct}%</span>
                </div>
              ))}
            </div>

            {/* CENTER — Tabbed View */}
            <div style={{ display: "flex", flexDirection: "column", background: "rgba(6,6,10,0.5)", position: "relative", overflow: "hidden" }}>
              {/* Tab bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: 0,
                borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
                background: "rgba(0,0,0,0.2)",
              }}>
                {TAB_DEFS.map(({ id, icon: Icon, label }) => {
                  const active = centerTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setCenterTab(id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "10px 16px", border: "none", cursor: "pointer",
                        fontFamily: "monospace", fontSize: "9px", fontWeight: 700,
                        letterSpacing: "1.5px", textTransform: "uppercase",
                        background: active ? "rgba(226,18,39,0.1)" : "transparent",
                        color: active ? "#e21227" : "rgba(255,255,255,0.25)",
                        borderBottom: active ? "2px solid #e21227" : "2px solid transparent",
                        transition: "all 0.2s",
                      }}
                    >
                      <Icon style={{ width: "12px", height: "12px" }} />
                      {label}
                    </button>
                  );
                })}
                <div style={{ marginLeft: "auto", padding: "0 16px", fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)" }}>
                  {centerTab === "globe" ? "DRAG TO ROTATE" : centerTab === "topology" ? "15 NODES MONITORED" : "LIVE TELEMETRY"}
                </div>
              </div>

              {/* Canvas area */}
              <div ref={containerRef} style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                {centerTab === "globe" && <ThreatGlobe width={dims.w} height={dims.h} />}
                {centerTab === "topology" && (
                  <>
                    <NetworkCanvas width={dims.w} height={dims.h} />
                    <div style={{
                      position: "absolute", inset: 0, pointerEvents: "none",
                      backgroundImage: `linear-gradient(rgba(226,18,39,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(226,18,39,0.03) 1px, transparent 1px)`,
                      backgroundSize: "40px 40px",
                    }} />
                  </>
                )}
                {centerTab === "analytics" && <AnalyticsCanvas width={dims.w} height={dims.h} />}

                {/* Overlay grid for globe */}
                {centerTab === "globe" && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 40%, rgba(6,6,10,0.5) 100%)" }} />
                )}
              </div>

              {/* Bottom geo-origin bar */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                  GEOGRAPHIC ATTACK ORIGINS — LAST 60s
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {COUNTRIES.map((cc) => {
                    const intensity = Math.random();
                    const color = intensity > 0.7 ? "#e21227" : intensity > 0.4 ? "#f59e0b" : "#22c55e";
                    return (
                      <div key={cc} style={{
                        padding: "4px 8px", borderRadius: "6px",
                        background: `${color}15`, border: `1px solid ${color}30`,
                        fontSize: "10px", fontFamily: "monospace", fontWeight: 700, color,
                      }}>
                        {cc} <span style={{ color: "rgba(255,255,255,0.3)" }}>{Math.floor(intensity * 50)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT — Live Attack Feed */}
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
              }}>
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px" }}>LIVE THREAT FEED</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", fontFamily: "monospace", color: "#22c55e" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e" }} />
                  LIVE
                </div>
              </div>

              <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                <AnimatePresence initial={false}>
                  {attacks.map((atk) => (
                    <motion.div
                      key={atk.id}
                      initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        padding: "8px 10px", borderRadius: "8px", marginBottom: "4px",
                        background: `${atk.sev.color}08`, border: `1px solid ${atk.sev.color}20`,
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "2px", background: atk.sev.color, boxShadow: `0 0 6px ${atk.sev.color}` }} />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color: atk.sev.color, padding: "1px 5px", borderRadius: "3px", background: `${atk.sev.color}20`, letterSpacing: "0.5px" }}>{atk.sev.label}</span>
                        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>{atk.time}</span>
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#fff", marginBottom: "3px" }}>{atk.type}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{atk.src}</span>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)" }}>→</span>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>:{atk.port}</span>
                        <span style={{ marginLeft: "auto", fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: "#3b82f6" }}>[{atk.country}]</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Auto-response panel */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>AUTO-RESPONSE</div>
                {[
                  { action: "Block IP Range",   status: "ACTIVE", color: "#22c55e" },
                  { action: "Rate Limit API",   status: "ACTIVE", color: "#22c55e" },
                  { action: "Honeypot Trap",    status: "ARMED",  color: "#f59e0b" },
                  { action: "Geo-Block RU/CN",  status: "ACTIVE", color: "#22c55e" },
                ].map(({ action, status, color }) => (
                  <div key={action} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{action}</span>
                    <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color, padding: "1px 6px", borderRadius: "3px", background: `${color}15`, border: `1px solid ${color}30` }}>{status}</span>
                  </div>
                ))}
                <button
                  style={{
                    width: "100%", marginTop: "8px", padding: "8px", borderRadius: "8px",
                    background: "linear-gradient(135deg, rgba(226,18,39,0.15), rgba(226,18,39,0.05))",
                    border: "1px solid rgba(226,18,39,0.35)", color: "#e21227", fontSize: "11px", fontWeight: 700,
                    fontFamily: "monospace", cursor: "pointer", transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.25)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(226,18,39,0.15), rgba(226,18,39,0.05))"; }}
                >
                  <Zap style={{ width: "12px", height: "12px" }} />
                  LOCKDOWN MODE
                </button>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "20px",
            padding: "6px 20px", borderTop: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(0,0,0,0.3)", flexShrink: 0,
          }}>
            {[
              { icon: Wifi,     label: "NETWORK",  value: "STABLE",      color: "#22c55e" },
              { icon: Server,   label: "SERVERS",  value: "14/15 UP",    color: "#22c55e" },
              { icon: Cpu,      label: "FIREWALL", value: "ACTIVE",      color: "#3b82f6" },
              { icon: Activity, label: "IDS/IPS",  value: "MONITORING",  color: "#a855f7" },
              { icon: Zap,      label: "UPTIME",   value: "99.97%",      color: "#f59e0b" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Icon style={{ width: "10px", height: "10px", color: "rgba(255,255,255,0.2)" }} />
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.5px" }}>{label}:</span>
                <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.1)" }}>
              KaliGPT WAR ROOM · SOC v2.0 · {new Date().toLocaleDateString()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
