import { useEffect, useRef, useState } from "react";
import { trafficBus } from "@/lib/trafficBus";

/* ═══════════════════════════════════════════════════════════════════════
   SYS MONITOR — Ultra 3D Holographic System Resource Monitor v1
   Arc gauges · Animated waveform · Process list · Thermal readout
═══════════════════════════════════════════════════════════════════════ */

const W = 340; const H = 190;
const PI2 = Math.PI * 2;

const PROCS = [
  { name: "kali-ai-core",   base: 38, color: "#e21227" },
  { name: "neural-engine",  base: 24, color: "#00e5ff" },
  { name: "threat-daemon",  base: 16, color: "#a855f7" },
  { name: "packet-sniffer", base: 11, color: "#22c55e" },
  { name: "crypto-worker",  base: 7,  color: "#f59e0b" },
  { name: "rag-indexer",    base: 5,  color: "#3b82f6" },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* Simulated system metrics with realistic noise */
function useSystemMetrics() {
  const [metrics, setMetrics] = useState({ cpu: 34, mem: 61, disk: 44, net: 28, temp: 52, queries: 0 });
  const t = useRef(0);
  const cpu = useRef(34);
  const mem = useRef(61);
  const disk = useRef(44);
  const net = useRef(28);
  const temp = useRef(52);
  useEffect(() => {
    const iv = setInterval(() => {
      t.current += 1;
      const noise = () => (Math.random() - 0.5) * 8;
      cpu.current  = clamp(lerp(cpu.current,  clamp(cpu.current + noise() + Math.sin(t.current * 0.07) * 12, 8, 95), 0.18), 8, 95);
      mem.current  = clamp(lerp(mem.current,  clamp(mem.current + (Math.random() - 0.48) * 2, 40, 88), 0.05), 40, 88);
      net.current  = clamp(lerp(net.current,  clamp(Math.random() * 80 + 10, 5, 99), 0.3), 5, 99);
      temp.current = clamp(lerp(temp.current, clamp(temp.current + (cpu.current > 70 ? 1 : -0.5) + noise() * 0.3, 38, 92), 0.08), 38, 92);
      setMetrics({ cpu: cpu.current, mem: mem.current, disk: disk.current, net: net.current, temp: temp.current, queries: trafficBus.history.length });
    }, 400);
    return () => clearInterval(iv);
  }, []);
  return metrics;
}

/* Arc gauge draw helper */
function drawGauge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, value: number, color: string, label: string, t: number) {
  const startAngle = Math.PI * 0.75;
  const sweepTotal = Math.PI * 1.5;
  const fillAngle  = startAngle + sweepTotal * (value / 100);

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, startAngle + sweepTotal);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.stroke();

  // Fill gradient arc
  const g = ctx.createConicGradient ? ctx.createConicGradient(0, cx, cy) : null;
  if (g) {
    g.addColorStop(0, color + "00");
    g.addColorStop(value / 100, color);
    g.addColorStop(1, color + "00");
    ctx.strokeStyle = g;
  } else {
    ctx.strokeStyle = color;
  }
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, fillAngle);
  ctx.stroke();

  // Glow overlay
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, fillAngle - 0.15, fillAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, r - 10, 0, PI2);
  ctx.strokeStyle = `${color}12`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tick marks
  for (let i = 0; i <= 10; i++) {
    const a = startAngle + sweepTotal * (i / 10);
    const is = r - 14; const os = r - 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * is, cy + Math.sin(a) * is);
    ctx.lineTo(cx + Math.cos(a) * os, cy + Math.sin(a) * os);
    ctx.strokeStyle = i * 10 <= value ? `${color}80` : "rgba(255,255,255,0.1)";
    ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
    ctx.stroke();
  }

  // Pulse dot at fill end
  const px = cx + Math.cos(fillAngle) * r;
  const py = cy + Math.sin(fillAngle) * r;
  const pulse = (Math.sin(t * 0.07) + 1) / 2;
  ctx.beginPath();
  ctx.arc(px, py, 4 + pulse * 2, 0, PI2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9 + pulse * 0.1;
  ctx.fill();
  ctx.globalAlpha = pulse * 0.4;
  ctx.beginPath();
  ctx.arc(px, py, 8 + pulse * 4, 0, PI2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Value text
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${r > 34 ? 14 : 11}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${Math.round(value)}%`, cx, cy - 3);

  // Label
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.font = `bold 7px monospace`;
  ctx.letterSpacing = "1px";
  ctx.fillText(label, cx, cy + r + 10);
  ctx.globalAlpha = 1;
}

export function SysMonitorWidget({ embedded = false }: { embedded?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const tickRef   = useRef(0);
  const metricsRef = useRef({ cpu: 34, mem: 61, disk: 44, net: 28, temp: 52, queries: 0 });
  const metrics = useSystemMetrics();
  metricsRef.current = metrics;

  // History sparklines (for waveform at bottom)
  const histRef = useRef<{ cpu: number[]; net: number[] }>({ cpu: Array(60).fill(34), net: Array(60).fill(28) });
  const histTick = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      histRef.current.cpu.push(metricsRef.current.cpu);
      histRef.current.net.push(metricsRef.current.net);
      if (histRef.current.cpu.length > 60) histRef.current.cpu.shift();
      if (histRef.current.net.length > 60) histRef.current.net.shift();
      histTick.current++;
    }, 400);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      const m = metricsRef.current;
      ctx.clearRect(0, 0, W, H);

      // ── Background ──
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, W * 0.7);
      bg.addColorStop(0, "rgba(3,8,20,1)");
      bg.addColorStop(1, "rgba(0,2,8,1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "rgba(0,229,255,0.03)"; ctx.lineWidth = 0.5;
      for (let gx = 0; gx < W; gx += 34) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += 24) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      // Nebula patches
      const nb1 = ctx.createRadialGradient(80, 60, 0, 80, 60, 70);
      nb1.addColorStop(0, "rgba(0,100,200,0.06)"); nb1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nb1; ctx.fillRect(0, 0, W, H);
      const nb2 = ctx.createRadialGradient(260, 120, 0, 260, 120, 60);
      nb2.addColorStop(0, "rgba(226,18,39,0.05)"); nb2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nb2; ctx.fillRect(0, 0, W, H);

      // ── 4 Gauges in 2×2 layout ──
      const gaugeConfigs = [
        { cx: 60,  cy: 68, r: 40, val: m.cpu,  color: "#00e5ff", label: "CPU" },
        { cx: 170, cy: 68, r: 40, val: m.mem,  color: "#a855f7", label: "RAM" },
        { cx: 280, cy: 68, r: 40, val: m.disk, color: "#22c55e", label: "DISK" },
        { cx: 170, cy: 68, r: 0,  val: 0,      color: "",        label: "" }, // placeholder — temp drawn separately
      ];
      drawGauge(ctx, 60,  66, 40, m.cpu,  "#00e5ff", "CPU",  t);
      drawGauge(ctx, 170, 66, 40, m.mem,  "#a855f7", "RAM",  t);
      drawGauge(ctx, 280, 66, 40, m.disk, "#22c55e", "DISK", t);

      // Temp badge (small, bottom-center area as 4th metric)
      const tempColor = m.temp < 60 ? "#22c55e" : m.temp < 75 ? "#f59e0b" : "#e21227";
      const tx4 = 60; const ty4 = 148;
      // Thermal icon
      ctx.fillStyle = tempColor; ctx.globalAlpha = 0.9;
      ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      ctx.fillText("TEMP", tx4, ty4 - 2);
      ctx.font = "bold 14px monospace";
      ctx.fillText(`${Math.round(m.temp)}°C`, tx4, ty4 + 12);
      ctx.globalAlpha = 1;

      // NET badge
      ctx.fillStyle = "#f59e0b"; ctx.globalAlpha = 0.85;
      ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      ctx.fillText("NET  I/O", 280, ty4 - 2);
      ctx.font = "bold 12px monospace";
      ctx.fillText(`${Math.round(m.net)}%`, 280, ty4 + 12);
      ctx.globalAlpha = 1;

      // Queries badge
      ctx.fillStyle = "#e21227"; ctx.globalAlpha = 0.9;
      ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      ctx.fillText("AI QUERIES", 170, ty4 - 2);
      ctx.font = "bold 14px monospace";
      ctx.fillText(String(m.queries), 170, ty4 + 12);
      ctx.globalAlpha = 1;

      // ── Waveform at bottom ──
      const waveY = H - 20;
      const wh = 16;
      const ww = W - 20;
      const cpuHist = histRef.current.cpu;
      const netHist = histRef.current.net;

      // CPU waveform
      ctx.beginPath();
      ctx.strokeStyle = "#00e5ff80"; ctx.lineWidth = 1.2;
      cpuHist.forEach((v, i) => {
        const x = 10 + (i / (cpuHist.length - 1)) * ww;
        const y = waveY - (v / 100) * wh;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // NET waveform
      ctx.beginPath();
      ctx.strokeStyle = "#f59e0b60"; ctx.lineWidth = 0.8;
      netHist.forEach((v, i) => {
        const x = 10 + (i / (netHist.length - 1)) * ww;
        const y = waveY - (v / 100) * wh;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Waveform baseline
      ctx.beginPath(); ctx.moveTo(10, waveY); ctx.lineTo(W - 10, waveY);
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 0.5; ctx.stroke();

      // Scan line
      const scanY = ((t * 0.5) % H);
      const sg = ctx.createLinearGradient(0, scanY - 4, 0, scanY + 4);
      sg.addColorStop(0, "rgba(0,229,255,0)");
      sg.addColorStop(0.5, "rgba(0,229,255,0.06)");
      sg.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 4, W, 8);
    }

    frame();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const content = (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(3,8,20,0.98)" }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", display: "block", flexShrink: 0 }} />
      {/* Process table */}
      <div style={{ flex: 1, overflow: "hidden", padding: "2px 0" }}>
        {PROCS.map((p, i) => {
          const usage = Math.round(clamp(p.base + (Math.sin(Date.now() / 3000 + i) * 6), 1, 60));
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "2px 8px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: "7.5px", fontFamily: "monospace", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <div style={{ width: "50px", height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden", flexShrink: 0 }}>
                <div style={{ width: `${p.base}%`, height: "100%", background: p.color, borderRadius: "2px", boxShadow: `0 0 4px ${p.color}` }} />
              </div>
              <span style={{ fontSize: "7px", fontFamily: "monospace", color: p.color, width: "22px", textAlign: "right", flexShrink: 0 }}>{p.base}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div style={{ width: W, background: "rgba(3,8,20,0.98)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,229,255,0.15)" }}>
      {content}
    </div>
  );
}
