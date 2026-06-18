import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Metric = { label: string; short: string; value: number; color: string; unit: string };

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function useMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "CPU",     short: "CPU", value: 34, color: "#e21227", unit: "%" },
    { label: "Memory",  short: "MEM", value: 61, color: "#8b5cf6", unit: "%" },
    { label: "Network", short: "NET", value: 22, color: "#00e5ff", unit: "KB/s" },
    { label: "Threats", short: "THR", value: 3,  color: "#f97316", unit: "" },
  ]);
  const targetRef = useRef([34, 61, 22, 3]);
  const timerRef  = useRef(0);

  useEffect(() => {
    function tick() {
      targetRef.current = [
        Math.max(5, Math.min(98, targetRef.current[0] + (Math.random() - 0.48) * 14)),
        Math.max(30, Math.min(95, targetRef.current[1] + (Math.random() - 0.50) * 8)),
        Math.max(0,  Math.min(180, targetRef.current[2] + (Math.random() - 0.50) * 30)),
        Math.round(Math.max(0, Math.min(12, targetRef.current[3] + (Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0)))),
      ];
    }
    function smooth() {
      setMetrics(prev => prev.map((m, i) => ({
        ...m,
        value: i === 3 ? targetRef.current[i] : Math.round(lerp(m.value, targetRef.current[i], 0.12) * 10) / 10,
      })));
    }
    const tickId = setInterval(tick, 2200);
    const smoothId = setInterval(smooth, 80);
    timerRef.current = tickId as unknown as number;
    return () => { clearInterval(tickId); clearInterval(smoothId); };
  }, []);

  return metrics;
}

function SparklineCanvas({ values, color }: { values: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    if (values.length < 2) return;
    const mn = Math.min(...values), mx = Math.max(...values);
    const range = mx - mn || 1;
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: H - ((v - mn) / range) * (H - 2) - 1,
    }));
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, color + "40");
    grad.addColorStop(1, color + "cc");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    const areaGrad = ctx.createLinearGradient(0, 0, 0, H);
    areaGrad.addColorStop(0, color + "20");
    areaGrad.addColorStop(1, color + "04");
    ctx.fillStyle = areaGrad;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H);
    ctx.closePath();
    ctx.fill();
  }, [values, color]);
  return <canvas ref={canvasRef} width={80} height={24} style={{ width: "100%", height: 24 }} />;
}

function MetricBar({ metric, history }: { metric: Metric; history: number[] }) {
  const pct = metric.unit === "" ? (metric.value / 12) * 100 : Math.min(100, metric.value);
  const danger = pct > 80;
  const warn   = pct > 55;
  const barColor = danger ? "#e21227" : warn ? "#f59e0b" : metric.color;

  return (
    <div className="relative flex flex-col gap-1 p-2 rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${metric.color}18` }}>
      {/* Subtle glow bg */}
      <div className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${metric.color}08 0%, transparent 70%)` }} />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[8px] font-black tracking-[0.3em] uppercase" style={{ color: metric.color + "cc" }}>{metric.short}</span>
        <span className="text-[10px] font-black font-mono" style={{ color: barColor, textShadow: `0 0 8px ${barColor}60` }}>
          {metric.unit === "" ? String(Math.round(metric.value)) : metric.value.toFixed(0)}{metric.unit && <span style={{ fontSize: 7, opacity: 0.6, marginLeft: 1 }}>{metric.unit}</span>}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${barColor}99, ${barColor})`, boxShadow: `0 0 6px ${barColor}60` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }} />
      </div>

      {/* Sparkline */}
      <SparklineCanvas values={history} color={barColor} />
    </div>
  );
}

function TelemetryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cvEl = canvasRef.current; if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const W = cv.parentElement?.offsetWidth ?? 200;
      cv.width = W * DPR; cv.height = 36 * DPR;
      cv.style.width = W + "px"; cv.style.height = "36px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);

    type Node = { x: number; y: number; vx: number; vy: number };
    const W0 = cv.parentElement?.offsetWidth ?? 200;
    const nodes: Node[] = Array.from({ length: 14 }, () => ({
      x: Math.random() * W0, y: Math.random() * 36,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.25,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.01;
      const t = tRef.current;
      const W = cv.parentElement?.offsetWidth ?? W0;
      const H = 36;
      ctx.clearRect(0, 0, W, H);

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 55) {
            ctx.strokeStyle = `rgba(226,18,39,${0.08 * (1 - d / 55)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
        const pulse = Math.sin(t * 2 + i) * 0.4 + 0.6;
        ctx.fillStyle = `rgba(226,18,39,${0.25 * pulse})`;
        ctx.beginPath(); ctx.arc(nodes[i].x, nodes[i].y, 1.2, 0, Math.PI * 2); ctx.fill();
      }

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "rgba(226,18,39,0.5)");
      grad.addColorStop(0.5, "rgba(255,100,100,0.3)");
      grad.addColorStop(1, "rgba(226,18,39,0.5)");
      ctx.strokeStyle = grad; ctx.lineWidth = 0.5;
      const waveY = 30;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = waveY + Math.sin((x / W) * Math.PI * 4 + t * 3) * 2.5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="w-full pointer-events-none" style={{ height: 36 }} />;
}

export function SidebarTelemetryHUD() {
  const metrics = useMetrics();
  const [open, setOpen] = useState(true);
  const historyRef = useRef<Record<string, number[]>>({
    CPU: [], Memory: [], Network: [], Threats: [],
  });

  useEffect(() => {
    metrics.forEach(m => {
      const h = historyRef.current[m.label] ?? [];
      h.push(m.value);
      if (h.length > 32) h.shift();
      historyRef.current[m.label] = h;
    });
  }, [metrics]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  void tick;

  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);
  const cpu     = metrics.find(m => m.label === "CPU")!;
  const mem     = metrics.find(m => m.label === "Memory")!;
  const net     = metrics.find(m => m.label === "Network")!;
  const thr     = metrics.find(m => m.label === "Threats")!;

  const systemOk = cpu.value < 85 && mem.value < 88 && thr.value === 0;
  const statusColor = systemOk ? "#00e5cc" : thr.value > 0 ? "#e21227" : "#f59e0b";
  const statusLabel = systemOk ? "NOMINAL" : thr.value > 0 ? "THREAT" : "ELEVATED";

  return (
    <div className="relative">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center justify-center w-4 h-4">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/60 transition-colors">
            System Telemetry
          </h3>
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: statusColor + "18", color: statusColor, border: `1px solid ${statusColor}30` }}>
            {statusLabel}
          </span>
        </div>
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
          animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-2 flex flex-col gap-1.5 relative rounded-2xl overflow-hidden p-2"
              style={{
                background: "linear-gradient(160deg, rgba(8,6,16,0.95) 0%, rgba(4,3,10,0.98) 100%)",
                border: "1px solid rgba(226,18,39,0.12)",
                boxShadow: "0 0 20px rgba(226,18,39,0.05), inset 0 1px 0 rgba(255,255,255,0.03)",
              }}>

              {/* Neural net canvas header */}
              <TelemetryCanvas />

              {/* HUD header strip */}
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[7px] font-black tracking-[0.4em] uppercase" style={{ color: "rgba(226,18,39,0.6)" }}>SYS·HUD</span>
                  <motion.div className="w-1 h-1 rounded-full" style={{ background: "#e21227" }}
                    animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                </div>
                <span className="text-[7px] font-mono tabular-nums" style={{ color: "rgba(255,255,255,0.2)" }}>{timeStr}</span>
              </div>

              {/* 4 metrics in 2×2 grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {[cpu, mem, net, thr].map(m => (
                  <MetricBar key={m.label} metric={m} history={historyRef.current[m.label] ?? []} />
                ))}
              </div>

              {/* Status footer */}
              <div className="flex items-center justify-between px-1 pt-0.5">
                <div className="flex items-center gap-3">
                  {[
                    { lbl: "CPU",  val: cpu.value.toFixed(0) + "%",   col: cpu.value > 80 ? "#e21227" : "#888888" },
                    { lbl: "MEM",  val: mem.value.toFixed(0) + "%",   col: mem.value > 80 ? "#f59e0b" : "#888888" },
                    { lbl: "CONN", val: String(Math.round(14 + net.value / 15)), col: "#888888" },
                  ].map(({ lbl, val, col }) => (
                    <div key={lbl} className="flex items-center gap-1">
                      <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{lbl}</span>
                      <span className="text-[8px] font-black font-mono" style={{ color: col }}>{val}</span>
                    </div>
                  ))}
                </div>
                <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }}
                  animate={{ opacity: [1, 0.2, 1], scale: [1, 1.5, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }} />
              </div>

              {/* Corner accents */}
              <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.35)" }} />
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.25)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
