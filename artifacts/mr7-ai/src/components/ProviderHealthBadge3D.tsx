import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

type Health = "checking" | "healthy" | "slow" | "error" | "unknown";

const HEALTH_RGB: Record<Health, [number, number, number]> = {
  checking: [6,   182, 212],
  healthy:  [34,  197, 94 ],
  slow:     [245, 158, 11 ],
  error:    [226, 18,  39 ],
  unknown:  [107, 114, 128],
};

const PROVIDER_LABELS: Record<string, string> = {
  groq:       "GROQ",
  openai:     "OPENAI",
  anthropic:  "CLAUDE",
  gemini:     "GEMINI",
  openrouter: "OR",
  custom:     "CUSTOM",
  personal:   "KEY",
  xai:        "GROK",
  deepseek:   "DSEEK",
  mistral:    "MISTRAL",
  perplexity: "PERPLX",
  together:   "TGETH",
  fireworks:  "FIRWK",
};

// ── Sparkline Canvas ──────────────────────────────────────────────────────────
function SparklineCanvas({
  data, color, width = 120, height = 40,
}: {
  data: number[]; color: [number, number, number]; width?: number; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext("2d")!;
    const DPR = window.devicePixelRatio || 1;
    canvas.width  = width * DPR;
    canvas.height = height * DPR;
    ctx.scale(DPR, DPR);

    const [cr, cg, cb] = color;
    const pad = 6;
    const W = width - pad * 2;
    const H = height - pad * 2;
    const minV = Math.min(...data) * 0.9;
    const maxV = Math.max(...data) * 1.1 || 1;

    function draw() {
      tRef.current += 0.04;
      const t = tRef.current;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i <= 3; i++) {
        const y = pad + (H / 3) * i;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + W, y);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.07)`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }

      const pts = data.map((v, i) => ({
        x: pad + (i / (data.length - 1)) * W,
        y: pad + H - ((v - minV) / (maxV - minV)) * H,
      }));

      const grad = ctx.createLinearGradient(0, pad, 0, pad + H);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pad + H);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, pad + H);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
      ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();

      pts.forEach((p, i) => {
        const isLast = i === pts.length - 1;
        const pulse  = isLast ? (Math.sin(t * 4) + 1) * 0.5 : 0;
        const r      = isLast ? 2.5 + pulse * 1.5 : 2;
        if (isLast) {
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 4 + pulse * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.15 * (1 - pulse)})`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isLast ? `rgba(255,255,255,${0.85 + pulse * 0.15})` : `rgba(${cr},${cg},${cb},0.7)`;
        ctx.fill();
      });

      const last    = pts[pts.length - 1];
      const lastVal = data[data.length - 1];
      ctx.font = `bold 8px monospace`;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.95)`;
      ctx.textAlign = "right";
      ctx.fillText(`${lastVal}ms`, width - 2, last.y - 4);

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, color, width, height]);

  return (
    <canvas ref={canvasRef} style={{ width, height, imageRendering: "crisp-edges", display: "block" }} />
  );
}

// ── 3D Tooltip Overlay ────────────────────────────────────────────────────────
function HealthTooltip({
  health, latency, latencyHistory, activeProvider, checkCount,
  avgLatency, minLatency, maxLatency, onRecheck,
}: {
  health: Health; latency: number | null; latencyHistory: number[];
  activeProvider: string; checkCount: number;
  avgLatency: number | null; minLatency: number | null; maxLatency: number | null;
  onRecheck: () => void;
}) {
  const [cr, cg, cb] = HEALTH_RGB[health];
  const colorStr   = `rgb(${cr},${cg},${cb})`;
  const colorAlpha = (a: number) => `rgba(${cr},${cg},${cb},${a})`;

  const statusLabel =
    health === "checking" ? "جارٍ الفحص" :
    health === "healthy"  ? "متصل بصحة جيدة" :
    health === "slow"     ? "بطيء" :
    health === "error"    ? "خطأ في الاتصال" : "غير معروف";

  const trend = latencyHistory.length >= 3
    ? latencyHistory[latencyHistory.length - 1] > latencyHistory[latencyHistory.length - 2]
      ? "↑ تصاعد" : "↓ تحسن"
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.94 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
      style={{
        width: 240,
        background: "rgba(8,8,8,0.97)",
        border: `1px solid ${colorAlpha(0.3)}`,
        borderRadius: 14,
        boxShadow: `0 0 32px ${colorAlpha(0.18)}, 0 4px 24px rgba(0,0,0,0.8), inset 0 1px 0 ${colorAlpha(0.12)}`,
        backdropFilter: "blur(16px)",
        overflow: "hidden",
      }}
    >
      <div className="w-full h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${colorStr}, transparent)` }} />

      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: colorStr }}>
              {activeProvider.toUpperCase()}
            </div>
            <div className="text-white text-xs font-semibold mt-0.5">{statusLabel}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: colorStr, boxShadow: `0 0 8px ${colorStr}` }}
              animate={{ opacity: health === "error" ? [1, 0.2] : [0.6, 1] }}
              transition={{ duration: health === "error" ? 0.4 : 1.2, repeat: Infinity, repeatType: "reverse" }}
            />
            {trend && (
              <span className="text-[9px] font-bold"
                style={{ color: trend.startsWith("↑") ? "#f59e0b" : "#22c55e" }}>
                {trend}
              </span>
            )}
          </div>
        </div>

        {latencyHistory.length >= 2 ? (
          <div className="rounded-lg overflow-hidden"
            style={{ background: colorAlpha(0.04), border: `1px solid ${colorAlpha(0.12)}` }}>
            <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
              <span className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: colorAlpha(0.7) }}>
                آخر {latencyHistory.length} قراءات
              </span>
              <span className="text-[9px] font-mono" style={{ color: colorAlpha(0.7) }}>
                زمن الاستجابة (ms)
              </span>
            </div>
            <SparklineCanvas data={latencyHistory} color={HEALTH_RGB[health]} width={216} height={52} />
          </div>
        ) : (
          <div className="rounded-lg flex items-center justify-center h-14 text-[10px]"
            style={{ background: colorAlpha(0.04), border: `1px solid ${colorAlpha(0.12)}`, color: colorAlpha(0.5) }}>
            في انتظار بيانات كافية...
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "الحالي", value: latency != null ? `${latency}ms` : "---" },
            { label: "الأدنى", value: minLatency != null ? `${minLatency}ms` : "---" },
            { label: "الأعلى", value: maxLatency != null ? `${maxLatency}ms` : "---" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-1.5 text-center"
              style={{ background: colorAlpha(0.06), border: `1px solid ${colorAlpha(0.1)}` }}>
              <div className="text-[8px] uppercase tracking-widest" style={{ color: colorAlpha(0.55) }}>{label}</div>
              <div className="text-[10px] font-bold font-mono mt-0.5" style={{ color: colorStr }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[9px]">
          <span style={{ color: colorAlpha(0.55) }}>
            متوسط: <span className="font-mono font-bold" style={{ color: colorAlpha(0.85) }}>
              {avgLatency != null ? `${avgLatency}ms` : "---"}
            </span>
          </span>
          <span style={{ color: colorAlpha(0.55) }}>
            عمليات الفحص: <span className="font-bold" style={{ color: colorAlpha(0.85) }}>{checkCount}</span>
          </span>
        </div>

        <motion.button onClick={onRecheck}
          className="w-full rounded-lg py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all"
          style={{ background: colorAlpha(0.1), border: `1px solid ${colorAlpha(0.2)}`, color: colorStr }}
          whileHover={{ background: colorAlpha(0.18) }}
          whileTap={{ scale: 0.97 }}>
          إعادة الفحص
        </motion.button>
      </div>

      <div className="w-full h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${colorAlpha(0.15)}, transparent)` }} />
    </motion.div>
  );
}

// ── Ultra-Advanced 3D Sphere Canvas ───────────────────────────────────────────
function HealthSphere({ health }: { health: Health }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef(0);
  const lastFRef   = useRef(0);
  const tRef       = useRef(0);
  const healthRef  = useRef<Health>(health);

  useEffect(() => { healthRef.current = health; }, [health]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR  = window.devicePixelRatio || 1;
    const SIZE = 38;
    cv.width  = SIZE * DPR;
    cv.height = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const cx = SIZE / 2, cy = SIZE / 2;
    const SR  = 10;
    const ORX = SR + 7;
    const ORY = ORX * 0.3;

    // Particle system
    const particles = Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      speed: 0.8 + (i % 3) * 0.25,
    }));

    function draw(now: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFRef.current < 28) return; // ~35fps max
      lastFRef.current = now;
      tRef.current += 0.048;
      const t  = tRef.current;
      const h  = healthRef.current;
      const [cr, cg, cb] = HEALTH_RGB[h];

      ctx.clearRect(0, 0, SIZE, SIZE);

      // Deep ambient glow
      const halo = ctx.createRadialGradient(cx, cy, SR * 0.4, cx, cy, SR + 14);
      halo.addColorStop(0,   `rgba(${cr},${cg},${cb},0.22)`);
      halo.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.09)`);
      halo.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, SR + 14, 0, Math.PI * 2);
      ctx.fillStyle = halo; ctx.fill();

      // Pulsing outer ring (double)
      const pulse  = (Math.sin(t * 2.2) + 1) * 0.5;
      const pulse2 = (Math.sin(t * 1.4 + 1) + 1) * 0.5;
      const pr1    = SR + 3.5 + pulse * 5.5;
      const pr2    = SR + 1.5 + pulse2 * 3;
      ctx.beginPath(); ctx.arc(cx, cy, pr1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.28 * (1 - pulse * 0.55)})`;
      ctx.lineWidth = 0.9; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, pr2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.18 * (1 - pulse2 * 0.45)})`;
      ctx.lineWidth = 0.6; ctx.stroke();

      // Orbit ring (tilted)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.25);
      ctx.beginPath(); ctx.ellipse(0, 0, ORX, ORY, 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.32)`;
      ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();

      // Second orbit ring (opposite tilt)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.18 + Math.PI / 4);
      ctx.beginPath(); ctx.ellipse(0, 0, ORX * 0.8, ORY * 1.4, 0.9, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.18)`;
      ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();

      // Back-half particles
      particles.forEach((p, i) => {
        const ang   = t * p.speed * 0.9 + (i * Math.PI * 2) / 8;
        const depth = Math.sin(ang + 0.35);
        if (depth > 0) return;
        const px   = cx + Math.cos(ang) * ORX;
        const py   = cy + Math.sin(ang) * ORY;
        const sz   = 0.8 + (depth + 1) * 0.4;
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.22 + (depth + 1) * 0.18})`; ctx.fill();
      });

      // Sphere body
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(cr*0.07)},${Math.round(cg*0.07)},${Math.round(cb*0.07)},0.97)`;
      ctx.fill();

      // Diffuse lighting
      const diff = ctx.createRadialGradient(cx - SR * 0.27, cy - SR * 0.28, 0, cx, cy, SR);
      diff.addColorStop(0,    `rgba(${cr},${cg},${cb},0.7)`);
      diff.addColorStop(0.5,  `rgba(${cr},${cg},${cb},0.42)`);
      diff.addColorStop(1,    `rgba(${Math.round(cr*0.3)},${Math.round(cg*0.3)},${Math.round(cb*0.3)},0.55)`);
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // Specular highlight
      const spec = ctx.createRadialGradient(cx - SR * 0.4, cy - SR * 0.44, 0, cx - SR * 0.1, cy - SR * 0.1, SR * 0.92);
      spec.addColorStop(0,   "rgba(255,255,255,0.85)");
      spec.addColorStop(0.18, "rgba(255,255,255,0.25)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // Rim light
      const rim = ctx.createRadialGradient(cx + SR * 0.58, cy + SR * 0.42, 0, cx + SR * 0.48, cy + SR * 0.38, SR * 0.75);
      rim.addColorStop(0, `rgba(${cr},${cg},${cb},0.45)`);
      rim.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      // Checking spinner
      if (h === "checking") {
        ctx.beginPath(); ctx.arc(cx, cy, SR - 1.5, t, t + Math.PI * 1.25);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.88)`;
        ctx.lineWidth = 2.2; ctx.stroke();
      }

      // Equator lines
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2); ctx.clip();
      ctx.beginPath(); ctx.ellipse(cx, cy, SR, SR * 0.28, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.14)`; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, SR * Math.abs(Math.cos(t * 0.38)) + 0.3, SR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.10)`; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();

      // Front-half particles (with glow)
      particles.forEach((p, i) => {
        const ang   = t * p.speed * 0.9 + (i * Math.PI * 2) / 8;
        const depth = Math.sin(ang + 0.35);
        if (depth <= 0) return;
        const px    = cx + Math.cos(ang) * ORX;
        const py    = cy + Math.sin(ang) * ORY;
        const sz    = 1 + depth * 1.3;
        const glw   = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.8);
        glw.addColorStop(0, `rgba(${cr},${cg},${cb},0.95)`);
        glw.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath(); ctx.arc(px, py, sz * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = glw; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,0.92)`; ctx.fill();
      });

      // Status blip
      const blinkA =
        h === "healthy" ? 0.82 + Math.sin(t * 2.6) * 0.18 :
        h === "error"   ? 0.5  + Math.sin(t * 8.5) * 0.5  :
        h === "slow"    ? 0.6  + Math.sin(t * 4.2) * 0.4  : 0.5;
      const bx = cx + SR * 0.7, by = cy - SR * 0.7;
      ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${blinkA})`; ctx.fill();
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 5.5);
      bg.addColorStop(0, `rgba(${cr},${cg},${cb},${blinkA * 0.55})`);
      bg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = bg; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas ref={canvasRef} style={{ width: 38, height: 38, imageRendering: "crisp-edges", flexShrink: 0 }} />
  );
}

// ── Main Badge ────────────────────────────────────────────────────────────────
export function ProviderHealthBadge3D() {
  const { state }  = useStore();
  const [health,          setHealth]          = useState<Health>("checking");
  const [latency,         setLatency]         = useState<number | null>(null);
  const [latencyHistory,  setLatencyHistory]  = useState<number[]>([]);
  const [checkCount,      setCheckCount]      = useState(0);
  const [showTooltip,     setShowTooltip]     = useState(false);

  const avgLatency = latencyHistory.length > 0 ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length) : null;
  const minLatency = latencyHistory.length > 0 ? Math.min(...latencyHistory) : null;
  const maxLatency = latencyHistory.length > 0 ? Math.max(...latencyHistory) : null;

  const runCheck = useCallback(async () => {
    setHealth("checking");
    const t0 = Date.now();
    try {
      const res = await fetch("/api/providers");
      const ms  = Date.now() - t0;
      if (res.ok) {
        const data   = await res.json() as { providers?: { id: string; available: boolean }[] };
        const active = state.activeProvider;
        const found  = data.providers?.find(p => p.id === active && p.available);
        const h: Health = found ? (ms < 1200 ? "healthy" : "slow") :
          ((state.settings.personalApiKey?.trim()?.length ?? 0) > 10 ||
           (localStorage.getItem(`mr7-ai-p-key-${active}`)?.trim()?.length ?? 0) > 10)
            ? "healthy" : "error";
        setHealth(h);
        setLatency(ms);
        setLatencyHistory(prev => [...prev.slice(-9), ms]);
        setCheckCount(c => c + 1);
      } else {
        setHealth("error");
      }
    } catch {
      setHealth("error");
    }
  }, [state.activeProvider, state.settings.personalApiKey]);

  useEffect(() => {
    runCheck();
    const id = setInterval(runCheck, 90_000);
    return () => clearInterval(id);
  }, [runCheck]);

  const activeProvider = state.activeProvider;
  const label = PROVIDER_LABELS[activeProvider] ?? activeProvider.toUpperCase().slice(0, 6);
  const [cr, cg, cb] = HEALTH_RGB[health];
  const statusText =
    health === "checking" ? "···" :
    health === "healthy"  ? (latency != null ? `${latency}ms` : "OK") :
    health === "slow"     ? "SLOW" :
    health === "error"    ? "ERR" : "---";

  return (
    <div className="relative flex-shrink-0" style={{ isolation: "isolate" }}>
      <motion.button
        onClick={runCheck}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="flex items-center gap-1 px-1 sm:gap-1.5 sm:px-1.5 py-0.5 rounded-xl cursor-pointer transition-all"
        style={{
          background: `rgba(${cr},${cg},${cb},0.06)`,
          border: `1px solid rgba(${cr},${cg},${cb},0.22)`,
          boxShadow: `0 0 18px rgba(${cr},${cg},${cb},0.1), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-label="فحص صحة المزود"
      >
        <HealthSphere health={health} />
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", fontFamily: "monospace" }}>
            {label}
          </span>
          <span style={{ fontSize: "9px", fontWeight: 700, color: `rgba(${cr},${cg},${cb},0.9)`, fontFamily: "monospace", letterSpacing: "0.05em" }}>
            {statusText}
          </span>
        </div>
      </motion.button>

      <AnimatePresence>
        {showTooltip && (
          <HealthTooltip
            health={health} latency={latency} latencyHistory={latencyHistory}
            activeProvider={activeProvider} checkCount={checkCount}
            avgLatency={avgLatency} minLatency={minLatency} maxLatency={maxLatency}
            onRecheck={() => { runCheck(); setShowTooltip(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
