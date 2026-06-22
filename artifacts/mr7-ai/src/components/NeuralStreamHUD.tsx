import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════
   NEURAL.AI STREAM HUD v3.0
   Holographic floating panel — CORTEX / MEMORY / OUTPUT bars
   Live TPS · TTFT · Token Count · Confidence · Phase cycling
   Canvas radar background — particle trail — neon glow
═══════════════════════════════════════════════════════════════ */

const PHASES = [
  { label: "PARSE",     sub: "Parsing neural context",   color: "#e21227", hex: [226, 18, 39]  },
  { label: "DECODE",    sub: "Decoding intent vectors",  color: "#a78bfa", hex: [167, 139, 250] },
  { label: "GENERATE",  sub: "Generating token stream",  color: "#00e5ff", hex: [0, 229, 255]  },
  { label: "FORMULATE", sub: "Formulating response",     color: "#22c55e", hex: [34, 197, 94]  },
  { label: "OUTPUT",    sub: "Streaming to surface",     color: "#f59e0b", hex: [245, 158, 11] },
];

/* ── Radar / Neural Canvas Background ── */
function RadarCanvas({ color, tps }: { color: string; tps: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t   = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = 88, H = 88;
    cv.width = W; cv.height = H;

    const draw = () => {
      raf.current = requestAnimationFrame(draw);
      t.current += 0.022;
      const tc = t.current;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;

      // Concentric rings
      [0.28, 0.44, 0.62, 0.82].forEach((f, i) => {
        const r = f * W * 0.5;
        const alpha = 0.06 + (Math.sin(tc * 1.5 + i) * 0.03);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 0.8; ctx.stroke();
      });

      // Rotating radar sweep
      const sweepAngle = tc * 1.2;
      const sweepR = W * 0.41;
      const grad = ctx.createConicalGradient
        ? null // not in all browsers
        : null;
      void grad;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweepAngle);
      const g = ctx.createLinearGradient(0, 0, sweepR, 0);
      g.addColorStop(0, `${color}28`);
      g.addColorStop(0.6, `${color}10`);
      g.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, sweepR, -0.35, 0.35);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();

      // Cross-hairs
      ctx.strokeStyle = `${color}18`;
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

      // Blip dots — more blips when higher TPS
      const blipCount = Math.min(8, 2 + Math.floor(tps / 3));
      for (let i = 0; i < blipCount; i++) {
        const a = ((i / blipCount) * Math.PI * 2) + tc * 0.3 + i * 1.1;
        const dist = (0.22 + (Math.sin(tc * 2.1 + i * 0.7) * 0.5 + 0.5) * 0.35) * W * 0.5;
        const bx = cx + Math.cos(a) * dist;
        const by = cy + Math.sin(a) * dist;
        const alpha2 = 0.4 + Math.sin(tc * 3 + i) * 0.4;
        ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.round(alpha2 * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      }

      // Center orb
      const orbG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 7);
      orbG.addColorStop(0, `${color}CC`);
      orbG.addColorStop(0.4, `${color}44`);
      orbG.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = orbG; ctx.fill();
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [color, tps]);

  return <canvas ref={ref} width={88} height={88} style={{ display: "block", borderRadius: "50%" }} />;
}

/* ── Animated Bar: CORTEX / MEMORY / OUTPUT ── */
function NeuralBar({
  label, pct, color, dotTrail, waveform, mode,
}: {
  label: string;
  pct: number;
  color: string;
  dotTrail?: boolean;
  waveform?: boolean;
  mode?: "fill" | "wave";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t   = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = 130, H = 10;
    cv.width = W; cv.height = H;

    const draw = () => {
      raf.current = requestAnimationFrame(draw);
      t.current += 0.04;
      const tc = t.current;
      ctx.clearRect(0, 0, W, H);

      // Track background
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.roundRect(0, H * 0.3, W, H * 0.4, 2);
      ctx.fill();

      const fillW = Math.max(4, pct * W);

      if (mode === "wave" || waveform) {
        // Waveform style
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, fillW, H);
        ctx.clip();
        ctx.beginPath();
        for (let x = 0; x <= fillW; x += 2) {
          const y = H / 2 + Math.sin(x * 0.3 + tc * 4) * (H * 0.3) + Math.sin(x * 0.7 + tc * 2.5) * (H * 0.15);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
      } else {
        // Solid bar
        const g = ctx.createLinearGradient(0, 0, fillW, 0);
        g.addColorStop(0, `${color}99`);
        g.addColorStop(0.7, color);
        g.addColorStop(1, color);
        ctx.fillStyle = g;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(0, H * 0.25, fillW, H * 0.5, 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Dot trail (scattered dots at the end)
      if (dotTrail) {
        for (let i = 0; i < 6; i++) {
          const dx = fillW + 2 + i * 4 + Math.sin(tc * 5 + i) * 3;
          if (dx > W) break;
          const dy = H / 2 + (Math.random() - 0.5) * H * 0.6;
          const alpha = (1 - i / 6) * (0.4 + Math.sin(tc * 8 + i) * 0.3);
          ctx.beginPath();
          ctx.arc(dx, dy, 1 + Math.random(), 0, Math.PI * 2);
          ctx.fillStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.fill();
        }
      }

      // Leading edge glow
      if (fillW > 6) {
        const edgeG = ctx.createRadialGradient(fillW, H / 2, 0, fillW, H / 2, 8);
        edgeG.addColorStop(0, `${color}BB`);
        edgeG.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(fillW, H / 2, 8, 0, Math.PI * 2);
        ctx.fillStyle = edgeG; ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [color, pct, dotTrail, waveform, mode]);

  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 800, color, letterSpacing: "0.6px", minWidth: 46, opacity: 0.9 }}>{label}</span>
      <canvas ref={ref} width={130} height={10} style={{ display: "block", flex: 1 }} />
    </div>
  );
}

/* ── Confidence Spark ── */
function ConfidenceBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <span style={{ fontSize: 7, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px" }}>∿ CONFIDENCE</span>
      <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ height: "100%", background: color, boxShadow: `0 0 4px ${color}` }}
        />
      </div>
      <span style={{ fontSize: 7, fontFamily: "monospace", fontWeight: 800, color, minWidth: 24, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

/* ══════════ MAIN COMPONENT ══════════ */
interface Props {
  streaming?: boolean;
  tps?: number;
  tokenCount?: number;
  peakTps?: number;
  ttft?: number | null;
  quality?: "idle" | "slow" | "normal" | "fast" | "ultra";
  mode?: string;
  agentMode?: boolean;
}

export function NeuralStreamHUD({
  streaming = false,
  tps = 0,
  tokenCount = 0,
  peakTps = 0,
  ttft = null,
  quality = "normal",
  mode: chatMode = "chat",
  agentMode = false,
}: Props) {
  const [phase, setPhase] = useState(0);
  const [confidence, setConfidence] = useState(7);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startRef = useRef<number | null>(null);

  /* Phase cycling */
  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => setPhase(p => (p + 1) % PHASES.length), 1600);
    return () => clearInterval(id);
  }, [streaming]);

  /* Confidence ramps up with TPS */
  useEffect(() => {
    if (!streaming) { setConfidence(7); return; }
    const target = Math.min(97, 7 + tps * 3.5 + tokenCount * 0.08);
    setConfidence(Math.round(target));
  }, [tps, tokenCount, streaming]);

  /* Elapsed timer */
  useEffect(() => {
    if (streaming) {
      startRef.current = Date.now();
      const id = setInterval(() => {
        setElapsedSec(((Date.now() - (startRef.current ?? Date.now())) / 1000));
      }, 100);
      return () => clearInterval(id);
    } else {
      setElapsedSec(0);
    }
  }, [streaming]);

  const cur = PHASES[phase];
  const [cr, cg, cb] = cur.hex;

  /* Bar values (0..1) — simulate neural activity */
  const cortexPct  = Math.min(1, 0.45 + tps * 0.025 + Math.sin(Date.now() / 400) * 0.08);
  const memoryPct  = Math.min(1, 0.60 + tokenCount * 0.0003);
  const outputPct  = Math.min(1, (tps / Math.max(peakTps, 10)));

  const modeLabel = agentMode ? "EXEC" : chatMode === "council" ? "COUNCIL" : chatMode === "godmode" ? "GODMODE" : "NEURAL.AI";

  return (
    <AnimatePresence>
      {streaming && (
        <motion.div
          key="neural-hud"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0,   scale: 1    }}
          exit={{    opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 12px 7px 8px",
            borderRadius: 12,
            background: "rgba(4,4,10,0.94)",
            border: `1px solid rgba(${cr},${cg},${cb},0.30)`,
            boxShadow: `0 0 24px rgba(${cr},${cg},${cb},0.14), 0 4px 24px rgba(0,0,0,0.7), inset 0 0 12px rgba(0,0,0,0.5)`,
            backdropFilter: "blur(20px)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {/* Sweep shimmer */}
          <motion.div
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "25%",
              background: `linear-gradient(90deg, transparent, rgba(${cr},${cg},${cb},0.10), transparent)`,
              borderRadius: 12, pointerEvents: "none",
            }}
          />

          {/* Left: Radar canvas */}
          <div style={{ width: 52, height: 52, flexShrink: 0, position: "relative" }}>
            <div style={{ transform: "scale(0.59)", transformOrigin: "top left", width: 88, height: 88 }}>
              <RadarCanvas color={cur.color} tps={tps} />
            </div>
            {/* Pulsing center dot overlay */}
            <motion.div
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
              transition={{ duration: 0.65, repeat: Infinity }}
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                width: 5, height: 5,
                borderRadius: "50%",
                background: cur.color,
                boxShadow: `0 0 8px ${cur.color}`,
                transform: "translate(-50%,-50%)",
              }}
            />
          </div>

          {/* Right: Stats panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 180 }}>

            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
              {/* Mode badge */}
              <div style={{
                fontSize: 7.5, fontFamily: "monospace", fontWeight: 900,
                color: cur.color, letterSpacing: "0.9px",
              }}>
                {modeLabel}
              </div>
              <div style={{ width: 1, height: 8, background: "rgba(255,255,255,0.08)" }} />
              {/* Phase */}
              <AnimatePresence mode="wait">
                <motion.span key={phase}
                  initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }}
                  transition={{ duration: 0.15 }}
                  style={{ fontSize: 7, fontFamily: "monospace", fontWeight: 800, color: cur.color, opacity: 0.8 }}>
                  {cur.label}
                </motion.span>
              </AnimatePresence>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                {/* TPS */}
                <span style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 800, color: cur.color }}>
                  {tps}<span style={{ fontSize: 6, opacity: 0.5 }}>t/s</span>
                </span>
                {/* Elapsed */}
                {elapsedSec > 0.1 && (
                  <span style={{ fontSize: 7, fontFamily: "monospace", color: "rgba(255,255,255,0.30)" }}>
                    {elapsedSec.toFixed(1)}s
                  </span>
                )}
                {/* TTFT */}
                {ttft != null && (
                  <span style={{ fontSize: 6.5, fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>
                    TTFT {ttft}ms
                  </span>
                )}
              </div>
            </div>

            {/* Phase subtitle */}
            <AnimatePresence mode="wait">
              <motion.div key={`sub-${phase}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: 7.5, fontFamily: "monospace", color: "rgba(255,255,255,0.40)", marginBottom: 2 }}>
                ⊕ {cur.sub}
              </motion.div>
            </AnimatePresence>

            {/* Neural Bars */}
            <NeuralBar label="CORTEX"  pct={cortexPct}  color="#e21227" dotTrail />
            <NeuralBar label="MEMORY"  pct={memoryPct}  color="#00e5ff" />
            <NeuralBar label="OUTPUT"  pct={outputPct}  color="#22c55e" waveform />

            {/* Confidence */}
            <ConfidenceBar pct={confidence} color={cur.color} />

            {/* Tokens */}
            {tokenCount > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 1 }}>
                <span style={{ fontSize: 6.5, fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>
                  {tokenCount >= 1000 ? `${(tokenCount / 1000).toFixed(1)}K` : tokenCount} tokens
                </span>
                {peakTps > 0 && (
                  <span style={{ fontSize: 6.5, fontFamily: "monospace", color: "rgba(255,255,255,0.18)" }}>
                    peak {peakTps}t/s
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
