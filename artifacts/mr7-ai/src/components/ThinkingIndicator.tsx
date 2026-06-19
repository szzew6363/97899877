import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Crosshair, Zap, Search, Database, Code2, Shield, Network, Activity } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   NEURAL.AI — PARSE HUD  v3
   Exact match to screenshot: CORTEX · MEMORY · OUTPUT horizontal bars
   with animated particle scatter at the live frontier edge.
   Plus 3D perspective card, holographic corners, scan-line sweep.
═══════════════════════════════════════════════════════════════════════ */

const AGENT_PHASES = [
  { icon: Search,    text: "Scanning attack surface",     color: "#e21227", label: "RECON"     },
  { icon: Database,  text: "Querying intel database",      color: "#a78bfa", label: "RETRIEVE"  },
  { icon: Crosshair, text: "Identifying vulnerabilities",  color: "#f59e0b", label: "ANALYZE"   },
  { icon: Code2,     text: "Generating exploit chain",     color: "#10b981", label: "GENERATE"  },
  { icon: Shield,    text: "Running stealth checks",       color: "#06b6d4", label: "VALIDATE"  },
  { icon: Network,   text: "Synthesizing intelligence",    color: "#e21227", label: "SYNTHESIZE"},
];

const CHAT_PHASES = [
  { icon: Brain,    text: "Parsing neural context",       color: "#e21227", label: "PARSE"     },
  { icon: Database, text: "Retrieving memory vectors",     color: "#a78bfa", label: "RETRIEVE"  },
  { icon: Zap,      text: "Processing neural matrix",      color: "#f59e0b", label: "COMPUTE"   },
  { icon: Code2,    text: "Formulating response",          color: "#10b981", label: "GENERATE"  },
  { icon: Search,   text: "Cross-referencing knowledge",   color: "#06b6d4", label: "VERIFY"    },
  { icon: Shield,   text: "Applying security protocols",   color: "#e21227", label: "FINALIZE"  },
];

/* ── Channel config ─────────────────────────────── */
const CH = [
  { name: "CORTEX", color: "#e21227", cy: 15,  particleCount: 80, spread: 13 },
  { name: "MEMORY", color: "#00e5ff", cy: 42,  particleCount: 66, spread: 11 },
  { name: "OUTPUT", color: "#22c55e", cy: 69,  particleCount: 72, spread: 13 },
];
const BAR_W = 300;
const BAR_H = 84;

/* particle state per channel */
type Pt = { x: number; y: number; vy: number; size: number; alpha: number; phase: number };
function makePt(): Pt {
  return {
    x: 0.62 + Math.random() * 0.38,
    y: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 0.5,
    size: 1.2 + Math.random() * 2.2,
    alpha: 0.45 + Math.random() * 0.55,
    phase: Math.random() * Math.PI * 2,
  };
}

/* ── Neural bar canvas — matches screenshot exactly ─────────────────── */
function NeuralBarCanvas({ phaseColor, active }: { phaseColor: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const tickRef   = useRef(0);
  const ptsRef    = useRef<Pt[][]>(CH.map(c => Array.from({ length: c.particleCount }, makePt)));
  const scanRef   = useRef(0); // scan-line X position

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const t = ++tickRef.current;
      scanRef.current = (scanRef.current + 1.4) % (BAR_W + 60);

      ctx.clearRect(0, 0, BAR_W, BAR_H);

      // Faint grid
      ctx.strokeStyle = "rgba(255,255,255,0.028)";
      ctx.lineWidth = 0.4;
      for (let gx = 0; gx < BAR_W; gx += 28) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, BAR_H); ctx.stroke();
      }
      for (let gy = 0; gy < BAR_H; gy += 25) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(BAR_W, gy); ctx.stroke();
      }

      CH.forEach((ch, ci) => {
        const cy   = ch.cy;
        const pts  = ptsRef.current[ci];

        /* update particles */
        pts.forEach(p => {
          p.y  += p.vy;
          p.vy += (Math.random() - 0.5) * 0.18;
          p.vy *= 0.89;
          if (Math.abs(p.y) > ch.spread) p.vy *= -0.7;
          if (Math.random() < 0.025) {
            p.x     = 0.6 + Math.random() * 0.4;
            p.y     = (Math.random() - 0.5) * ch.spread;
            p.vy    = (Math.random() - 0.5) * 0.55;
            p.alpha = 0.5 + Math.random() * 0.5;
          }
        });

        /* dim track line */
        ctx.beginPath();
        ctx.moveTo(0, cy); ctx.lineTo(BAR_W, cy);
        ctx.strokeStyle = `${ch.color}12`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        /* glowing fill bar */
        const grd = ctx.createLinearGradient(0, 0, BAR_W, 0);
        grd.addColorStop(0,    `${ch.color}05`);
        grd.addColorStop(0.45, `${ch.color}25`);
        grd.addColorStop(0.75, `${ch.color}65`);
        grd.addColorStop(0.92, `${ch.color}90`);
        grd.addColorStop(1,    `${ch.color}20`);
        ctx.beginPath();
        ctx.moveTo(0, cy); ctx.lineTo(BAR_W, cy);
        ctx.strokeStyle = grd;
        ctx.lineWidth   = active ? 1.8 : 1.2;
        ctx.shadowColor = ch.color;
        ctx.shadowBlur  = active ? 14 : 4;
        ctx.stroke();
        ctx.shadowBlur  = 0;

        /* bottom glow ribbon */
        const rib = ctx.createLinearGradient(0, 0, BAR_W, 0);
        rib.addColorStop(0,   "transparent");
        rib.addColorStop(0.7, `${ch.color}08`);
        rib.addColorStop(1,   "transparent");
        ctx.fillStyle = rib;
        ctx.fillRect(0, cy - 3, BAR_W, 6);

        /* particles */
        pts.forEach(p => {
          const px = p.x * BAR_W;
          const py = cy + p.y;
          const pulse = 0.5 + 0.5 * Math.sin(t * 0.06 + p.phase);
          const sz = p.size * (0.85 + 0.15 * pulse);
          /* outer glow halo */
          ctx.beginPath();
          ctx.arc(px, py, sz * 3.5, 0, Math.PI * 2);
          ctx.fillStyle   = ch.color;
          ctx.globalAlpha = p.alpha * 0.06 * (active ? 1 : 0.3);
          ctx.fill();
          /* core particle */
          ctx.beginPath();
          ctx.arc(px, py, sz, 0, Math.PI * 2);
          ctx.fillStyle   = ch.color;
          ctx.globalAlpha = p.alpha * (active ? 1 : 0.45);
          ctx.shadowColor = ch.color;
          ctx.shadowBlur  = active ? 22 : 6;
          ctx.fill();
          ctx.shadowBlur  = 0;
          /* bright core */
          ctx.beginPath();
          ctx.arc(px, py, sz * 0.35, 0, Math.PI * 2);
          ctx.fillStyle   = "rgba(255,255,255,0.9)";
          ctx.globalAlpha = p.alpha * 0.5;
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        /* frontier vertical cursor */
        const curX = BAR_W - 4 + Math.sin(t * 0.08 + ci) * 3;
        ctx.beginPath();
        ctx.moveTo(curX, cy - 6); ctx.lineTo(curX, cy + 6);
        ctx.strokeStyle = `${ch.color}70`;
        ctx.lineWidth   = 1;
        ctx.shadowColor = ch.color;
        ctx.shadowBlur  = 6;
        ctx.stroke();
        ctx.shadowBlur  = 0;
      });

      /* scan-line sweep */
      const sx = scanRef.current - 45;
      const sg = ctx.createLinearGradient(sx, 0, sx + 90, 0);
      sg.addColorStop(0,   "transparent");
      sg.addColorStop(0.35, `${phaseColor}18`);
      sg.addColorStop(0.5, `${phaseColor}42`);
      sg.addColorStop(0.65, `${phaseColor}18`);
      sg.addColorStop(1,   "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(sx, 0, 90, BAR_H);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [phaseColor, active]);

  return (
    <canvas
      ref={canvasRef}
      width={BAR_W}
      height={BAR_H}
      style={{ display: "block", borderRadius: "4px" }}
    />
  );
}

/* ── Corner bracket decorations ─────────────────────────────────────── */
function CornerBrackets({ color }: { color: string }) {
  const s: React.CSSProperties = { position: "absolute", width: 10, height: 10 };
  const b = `1.5px solid ${color}`;
  return (
    <>
      <div style={{ ...s, top: 4, left: 4,   borderTop: b, borderLeft: b  }} />
      <div style={{ ...s, top: 4, right: 4,  borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 4, left: 4,  borderBottom: b, borderLeft:  b }} />
      <div style={{ ...s, bottom: 4, right: 4, borderBottom: b, borderRight: b }} />
    </>
  );
}

/* ── Neural Sphere Canvas ───────────────────────────────────────────── */
function NeuralSphereCanvas({ col }: { col: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const SZ = 58; const R = 22; const CX = 29; const CY = 29;
    let raf = 0; let t = 0;
    const N = 30;
    const baseNodes: [number, number, number][] = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = (i * 2.399963) % (Math.PI * 2);
      return [r * Math.cos(th), y, r * Math.sin(th)];
    });
    function draw() {
      raf = requestAnimationFrame(draw); t++;
      ctx.clearRect(0, 0, SZ, SZ);
      const ry = t * 0.02;
      const cos = Math.cos(ry), sin = Math.sin(ry);
      const proj = baseNodes.map(([x, y, z]) => {
        const x1 = x * cos - z * sin;
        const z1 = x * sin + z * cos;
        const sc  = 110 / (110 + z1 * R);
        return { px: CX + x1 * R * sc, py: CY - y * R * sc, z: z1 };
      }).sort((a, b) => a.z - b.z);
      proj.forEach((p1, i) => proj.forEach((p2, j) => {
        if (j <= i) return;
        const d = Math.hypot(p1.px - p2.px, p1.py - p2.py);
        if (d > R * 0.95) return;
        const a = (1 - d / (R * 0.95)) * ((p1.z + p2.z) / 2 + 1) * 0.38;
        ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py);
        ctx.strokeStyle = col + Math.floor(Math.min(255, a * 255)).toString(16).padStart(2, "0");
        ctx.lineWidth = 0.7; ctx.stroke();
      }));
      proj.forEach(p => {
        const v = Math.min(1, (p.z + 1) * 0.5 + 0.1);
        ctx.beginPath(); ctx.arc(p.px, p.py, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.globalAlpha = v;
        ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
    }
    draw(); return () => cancelAnimationFrame(raf);
  }, [col]);
  return <canvas ref={ref} width={58} height={58} style={{ display: "block", borderRadius: "50%", width: 58, height: 58 }} />;
}

/* ── Main component ─────────────────────────────────────────────────── */
interface ThinkingIndicatorProps { agentMode?: boolean }

export function ThinkingIndicator({ agentMode = false }: ThinkingIndicatorProps) {
  const [elapsed, setElapsed]   = useState(0);
  const [phase,   setPhase]     = useState(0);
  const [tps,     setTps]       = useState(0);
  const [confidence, setConf]   = useState(7);
  const [metrics, setMetrics]   = useState({ entropy: 0.78, latency: 142, sync: 97, bw: 38 });
  const startRef = useRef(Date.now());

  const phases       = agentMode ? AGENT_PHASES : CHAT_PHASES;
  const currentPhase = phases[phase % phases.length];
  const PhaseIcon    = currentPhase.icon;
  const col          = currentPhase.color;

  /* elapsed / tps / metrics ticker */
  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      const sec = (Date.now() - startRef.current) / 1000;
      setElapsed(sec);
      setTps(prev => Math.round(prev + (18 + Math.random() * 24 - prev) * 0.28));
      setConf(prev => Math.min(97, prev + (Math.random() > 0.6 ? 1 : 0)));
      setMetrics(prev => ({
        entropy: Math.round((prev.entropy + (Math.random() * 0.04 - 0.02)) * 100) / 100,
        latency: Math.round(prev.latency + (Math.random() * 20 - 10)),
        sync: Math.min(100, prev.sync + (Math.random() > 0.7 ? 1 : 0)),
        bw: Math.round(prev.bw + (Math.random() * 8 - 4)),
      }));
    }, 400);
    return () => clearInterval(id);
  }, []);

  /* phase cycle */
  useEffect(() => {
    const id = setInterval(() => setPhase(p => p + 1), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96, rotateX: 8 }}
      animate={{ opacity: 1, y: 0,  scale: 1,    rotateX: 0 }}
      exit={{    opacity: 0, y: -8, scale: 0.96, rotateX: -6 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "inline-block",
        maxWidth: "440px",
        width: "100%",
        perspective: "900px",
      }}
    >
      {/* 3-D card shell */}
      <div
        style={{
          borderRadius: "14px",
          background: "linear-gradient(145deg, rgba(8,8,18,1) 0%, rgba(4,4,12,0.99) 60%, rgba(6,4,16,1) 100%)",
          border: `1px solid ${col}38`,
          boxShadow: `0 0 0 1px ${col}12, 0 16px 60px rgba(0,0,0,0.85), 0 0 80px ${col}14, 0 0 30px ${col}10, inset 0 1px 0 ${col}18, inset 0 0 40px ${col}04`,
          overflow: "hidden",
          position: "relative",
          transform: "rotateX(3deg) rotateY(-1deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Corner brackets */}
        <CornerBrackets color={col} />

        {/* Top energy bar — CSS shimmer */}
        <div className="btn-shimmer-inner" style={{
            height: "2px",
            background: `linear-gradient(90deg, transparent 0%, ${col}00 10%, ${col}cc 40%, ${col} 50%, ${col}cc 60%, ${col}00 90%, transparent 100%)`,
            backgroundSize: "300% auto",
            animationDuration: "2.2s",
          }}
        />

        {/* ── Header ─────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px 6px" }}>
          {/* Brain orb */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div className="ring-pulse"
              style={{ position: "absolute", inset: "-6px", borderRadius: "50%", background: col, animationDuration: "1.9s" }}
            />
            <div className="spin-fast"
              style={{
                position: "absolute", inset: "-4px", borderRadius: "50%",
                border: "1.5px solid transparent",
                borderTopColor: col,
                borderRightColor: `${col}40`,
                animationDuration: "2.8s",
              }}
            />
            <div className="spin-slow-rev"
              style={{
                position: "absolute", inset: "-7px", borderRadius: "50%",
                border: "1px solid transparent",
                borderBottomColor: `${col}30`,
                borderLeftColor: `${col}18`,
                animationDuration: "5s",
              }}
            />
            <div style={{
              width: "46px", height: "46px", borderRadius: "50%",
              border: `1px solid ${col}28`,
              boxShadow: `0 0 16px ${col}20, inset 0 0 10px ${col}08`,
              background: `radial-gradient(circle, ${col}10 0%, transparent 70%)`,
              overflow: "hidden", flexShrink: 0,
            }}>
              <NeuralSphereCanvas col={col} />
            </div>
          </div>

          {/* Title row */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <span style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 900, color: col, letterSpacing: "1.8px" }}>
                {agentMode ? "AGENT.EXE" : "NEURAL.AI"}
              </span>
              <span style={{ fontSize: "9px", color: `${col}50`, fontFamily: "monospace" }}>·</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={phase}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{    opacity: 0, y:  5 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: 800, color: col, letterSpacing: "1px" }}
                >
                  {currentPhase.label}
                </motion.span>
              </AnimatePresence>
              {/* Live stats */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#22c55e", letterSpacing: "0.3px" }}>
                  {tps}<span style={{ color: "rgba(255,255,255,0.25)" }}>t/s</span>
                </span>
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)" }}>
                  {elapsed.toFixed(1)}s
                </span>
              </div>
            </div>
            {/* Phase description */}
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0  }}
                exit={{    opacity: 0, x:  8 }}
                transition={{ duration: 0.22 }}
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <PhaseIcon style={{ width: "10px", height: "10px", color: `${col}80`, flexShrink: 0 }} />
                <span style={{ fontSize: "10.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.5)", letterSpacing: "0.2px" }}>
                  {currentPhase.text}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Channel bars (canvas) ──────────────────── */}
        <div style={{ display: "flex", alignItems: "stretch", padding: "2px 12px 6px", gap: "8px" }}>
          {/* Channel labels column */}
          <div style={{
            display: "flex", flexDirection: "column", justifyContent: "space-around",
            paddingRight: "2px", minWidth: "46px",
          }}>
            {CH.map(c => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div
                  className="pulse-dot"
                  style={{
                    width: "5px", height: "5px", borderRadius: "50%",
                    background: c.color,
                    boxShadow: `0 0 6px ${c.color}`,
                    flexShrink: 0,
                    animationDuration: "1.4s",
                  }}
                />
                <span style={{
                  fontSize: "7px", fontFamily: "monospace", fontWeight: 800,
                  color: c.color, opacity: 0.85, letterSpacing: "0.5px",
                }}>
                  {c.name}
                </span>
              </div>
            ))}
          </div>

          {/* The canvas */}
          <div style={{ flex: 1, minWidth: 0, borderRadius: "6px", overflow: "hidden",
            background: "rgba(4,4,8,0.92)",
            border: `1px solid ${col}12`,
            boxShadow: `inset 0 0 12px rgba(0,0,0,0.5)`,
          }}>
            <NeuralBarCanvas phaseColor={col} active={true} />
          </div>
        </div>

        {/* ── Live metrics row ──────────────────────── */}
        <div style={{ display: "flex", padding: "0 12px 8px", gap: "4px" }}>
          {[
            { label: "ENTROPY", val: metrics.entropy.toFixed(2) },
            { label: "LATENCY", val: `${Math.max(50, metrics.latency)}ms` },
            { label: "SYNC",    val: `${metrics.sync}%` },
            { label: "B/W",     val: `${Math.max(10, Math.abs(metrics.bw))}Mb` },
          ].map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "5px 2px", border: `1px solid ${col}10`, borderRadius: 5, background: `${col}05` }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 800, color: col, letterSpacing: "0.2px" }}>{m.val}</div>
              <div style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)", letterSpacing: "0.3px", marginTop: 1 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* ── Confidence footer ─────────────────────── */}
        <div style={{ padding: "2px 14px 10px" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "4px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Activity style={{ width: "9px", height: "9px", color: "rgba(255,255,255,0.22)" }} />
              <span style={{
                fontSize: "8px", fontFamily: "monospace",
                color: "rgba(255,255,255,0.22)", letterSpacing: "0.8px",
              }}>
                CONFIDENCE
              </span>
            </div>
            <motion.span
              key={confidence}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: "9px", fontFamily: "monospace",
                color: col, fontWeight: 800, letterSpacing: "0.5px",
              }}
            >
              {confidence}%
            </motion.span>
          </div>

          {/* Confidence track */}
          <div style={{
            height: "3px", borderRadius: "3px",
            background: "rgba(255,255,255,0.05)",
            overflow: "hidden", position: "relative",
          }}>
            {/* Fill */}
            <motion.div
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                position: "absolute", left: 0, top: 0, height: "100%",
                borderRadius: "3px",
                background: `linear-gradient(90deg, ${col}40, ${col})`,
                boxShadow: `0 0 8px ${col}80`,
              }}
            />
            {/* Scan pulse — CSS */}
            <span className="btn-shimmer-inner"
              style={{
                width: "35%",
                background: `linear-gradient(90deg, transparent, ${col}cc, transparent)`,
                borderRadius: "3px",
                animationDuration: "1.8s",
              }}
            />
          </div>
        </div>

        {/* Bottom accent line */}
        <div style={{
          height: "1px",
          background: `linear-gradient(90deg, transparent, ${col}30 50%, transparent)`,
        }} />

        {/* Subtle inner glow */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "12px",
          background: `radial-gradient(ellipse at 50% 0%, ${col}04 0%, transparent 60%)`,
          pointerEvents: "none",
        }} />
      </div>
    </motion.div>
  );
}
