import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Crosshair, Zap, Search, Database, Code2, Shield, Network, Activity } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   NEURAL THINKING INDICATOR — EEG-style brainwave visualizer
   Shows live canvas waveforms during AI streaming.
   3 channels: CORTEX · MEMORY · SYNTHESIS
═══════════════════════════════════════════════════════════ */

const AGENT_PHASES = [
  { icon: Search,   text: "Scanning attack surface",    color: "#e21227", label: "RECON"     },
  { icon: Database, text: "Querying intel database",     color: "#a78bfa", label: "RETRIEVE"  },
  { icon: Crosshair,text: "Identifying vulnerabilities", color: "#f59e0b", label: "ANALYZE"   },
  { icon: Code2,    text: "Generating exploit chain",    color: "#10b981", label: "GENERATE"  },
  { icon: Shield,   text: "Running stealth checks",      color: "#06b6d4", label: "VALIDATE"  },
  { icon: Network,  text: "Synthesizing intelligence",   color: "#e21227", label: "SYNTHESIZE"},
];

const CHAT_PHASES = [
  { icon: Brain,    text: "Parsing neural context",      color: "#e21227", label: "PARSE"     },
  { icon: Database, text: "Retrieving memory vectors",    color: "#a78bfa", label: "RETRIEVE"  },
  { icon: Zap,      text: "Processing neural matrix",     color: "#f59e0b", label: "COMPUTE"   },
  { icon: Code2,    text: "Formulating response",         color: "#10b981", label: "GENERATE"  },
  { icon: Search,   text: "Cross-referencing knowledge",  color: "#06b6d4", label: "VERIFY"    },
  { icon: Shield,   text: "Applying security protocols",  color: "#e21227", label: "FINALIZE"  },
];

const EEG_W = 190;
const EEG_H = 48;
const CHANNELS = 3;

const CHANNEL_CONFIG = [
  { name: "CORTEX", color: "#e21227", freq: 0.18, amp: 0.38, noiseAmp: 0.12, baseY: 8  },
  { name: "MEMORY", color: "#00e5ff", freq: 0.10, amp: 0.55, noiseAmp: 0.15, baseY: 24 },
  { name: "OUTPUT", color: "#22c55e", freq: 0.06, amp: 0.72, noiseAmp: 0.08, baseY: 40 },
];

function gaussianNoise() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function EEGCanvas({ phaseColor, active }: { phaseColor: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const tickRef = useRef(0);
  const dataRef = useRef<Float32Array[]>(
    Array.from({ length: CHANNELS }, () => new Float32Array(EEG_W).fill(0))
  );
  const spikeRef = useRef<{ ch: number; pos: number; amp: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Occasional spike events (neural firing)
    const spikeId = setInterval(() => {
      if (Math.random() > 0.55) {
        spikeRef.current.push({
          ch: Math.floor(Math.random() * CHANNELS),
          pos: 0,
          amp: 0.8 + Math.random() * 1.2,
        });
      }
    }, 600);

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;

      ctx.clearRect(0, 0, EEG_W, EEG_H);

      // Dark background
      ctx.fillStyle = "rgba(4,4,8,0.95)";
      ctx.fillRect(0, 0, EEG_W, EEG_H);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < EEG_W; gx += 20) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, EEG_H); ctx.stroke();
      }

      // Channel separator lines
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      [16, 32].forEach(y => {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(EEG_W, y); ctx.stroke();
      });

      // Update spike positions
      spikeRef.current = spikeRef.current.map(s => ({ ...s, pos: s.pos + 1 })).filter(s => s.pos < EEG_W);

      // Draw each channel
      CHANNEL_CONFIG.forEach((cfg, ci) => {
        const data = dataRef.current[ci];

        // Shift data left
        data.copyWithin(0, 1);

        // Generate new rightmost value
        const sineVal = Math.sin(cfg.freq * t) * cfg.amp;
        const noiseVal = gaussianNoise() * cfg.noiseAmp;
        // Add spike influence
        const spike = spikeRef.current.find(s => s.ch === ci);
        const spikeVal = spike ? Math.sin((spike.pos / 6)) * spike.amp * Math.exp(-spike.pos / 15) : 0;
        data[EEG_W - 1] = sineVal + noiseVal + spikeVal * 0.4;

        // Draw waveform line
        const baseY = cfg.baseY;
        const amplitude = 6;
        ctx.beginPath();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = cfg.color;

        let started = false;
        for (let x = 0; x < EEG_W; x++) {
          const y = baseY + data[x] * amplitude;
          const alpha = x / EEG_W; // fade in from left
          ctx.globalAlpha = 0.2 + alpha * 0.8;
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 1;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Glow dot at the live tip (rightmost point)
        const tipY = baseY + data[EEG_W - 1] * amplitude;
        ctx.beginPath();
        ctx.arc(EEG_W - 2, tipY, 2, 0, Math.PI * 2);
        ctx.fillStyle = cfg.color;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Right-edge vertical line (live cursor)
      ctx.beginPath();
      ctx.strokeStyle = `${phaseColor}50`;
      ctx.lineWidth = 1;
      ctx.moveTo(EEG_W - 1, 0);
      ctx.lineTo(EEG_W - 1, EEG_H);
      ctx.stroke();
    }

    draw();
    return () => {
      clearInterval(spikeId);
      cancelAnimationFrame(frameRef.current);
    };
  }, [phaseColor]);

  return (
    <canvas
      ref={canvasRef}
      width={EEG_W}
      height={EEG_H}
      style={{
        display: "block",
        borderRadius: "6px",
        border: `1px solid ${phaseColor}18`,
        boxShadow: `0 0 12px ${phaseColor}12, inset 0 0 8px rgba(0,0,0,0.5)`,
      }}
    />
  );
}

/* Neural activity dot matrix */
function NeuralDotMatrix({ color, active }: { color: string; active: boolean }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 120);
    return () => clearInterval(id);
  }, []);

  const ROWS = 4; const COLS = 6;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: "3px", padding: "3px" }}>
      {Array.from({ length: ROWS * COLS }).map((_, i) => {
        const on = Math.sin(frame * 0.3 + i * 0.7 + Math.random() * 0.1) > 0.2;
        return (
          <div key={i} style={{
            width: "4px", height: "4px", borderRadius: "50%",
            background: on ? color : "rgba(255,255,255,0.04)",
            boxShadow: on ? `0 0 4px ${color}` : "none",
            transition: "all 0.15s ease",
          }} />
        );
      })}
    </div>
  );
}

interface ThinkingIndicatorProps {
  agentMode?: boolean;
}

export function ThinkingIndicator({ agentMode = false }: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState(0);
  const [tps, setTps] = useState(0);
  const startRef = useRef(Date.now());

  const phases = agentMode ? AGENT_PHASES : CHAT_PHASES;
  const currentPhase = phases[phase % phases.length];
  const PhaseIcon = currentPhase.icon;

  useEffect(() => {
    startRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
      // Simulate TPS (tokens per second) ramping up then stabilizing
      setTps(prev => {
        const target = 18 + Math.random() * 24;
        return Math.round(prev + (target - prev) * 0.3);
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhase(p => p + 1);
    }, 2400);
    return () => clearInterval(phaseTimer);
  }, []);

  const confidencePct = Math.min(100, Math.round((elapsed / 0.12)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{ display: "inline-block", maxWidth: "380px", width: "100%" }}
    >
      <div style={{
        borderRadius: "14px",
        background: "linear-gradient(135deg, rgba(12,12,20,0.98) 0%, rgba(8,8,14,0.99) 100%)",
        border: `1px solid ${currentPhase.color}22`,
        boxShadow: `0 0 0 1px ${currentPhase.color}08, 0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${currentPhase.color}06`,
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Top accent bar */}
        <div style={{
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${currentPhase.color}80 30%, ${currentPhase.color} 50%, ${currentPhase.color}80 70%, transparent)`,
          animation: "energy-flow 2s linear infinite",
          backgroundSize: "200% auto",
        }} />

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px 6px" }}>
          {/* Animated brain orb */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              style={{
                position: "absolute", inset: "-5px", borderRadius: "50%",
                background: currentPhase.color, opacity: 0.3,
              }}
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: "-3px", borderRadius: "50%",
                border: `1.5px solid transparent`,
                borderTopColor: currentPhase.color,
                borderRightColor: `${currentPhase.color}44`,
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                width: "30px", height: "30px", borderRadius: "50%",
                background: `radial-gradient(circle, ${currentPhase.color}20 0%, ${currentPhase.color}06 100%)`,
                border: `1px solid ${currentPhase.color}35`,
                boxShadow: `0 0 12px ${currentPhase.color}30, inset 0 0 6px ${currentPhase.color}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <motion.div key={phase} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
                <Brain style={{ width: "14px", height: "14px", color: currentPhase.color }} />
              </motion.div>
            </motion.div>
          </div>

          {/* Labels */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1px" }}>
              <span style={{
                fontSize: "10px", fontFamily: "monospace", fontWeight: 800,
                color: currentPhase.color, letterSpacing: "1.5px",
              }}>
                {agentMode ? "AGENT.EXE" : "NEURAL.AI"}
              </span>
              <span style={{
                fontSize: "8px", fontFamily: "monospace",
                color: "rgba(255,255,255,0.2)", letterSpacing: "0.5px",
              }}>
                ·
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={phase}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: currentPhase.color, letterSpacing: "0.8px" }}
                >
                  {currentPhase.label}
                </motion.span>
              </AnimatePresence>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "8px", fontFamily: "monospace", color: "#22c55e" }}>{tps}<span style={{ color: "rgba(255,255,255,0.2)" }}>t/s</span></span>
                <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{elapsed.toFixed(1)}s</span>
              </div>
            </div>
            {/* Phase text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <PhaseIcon style={{ width: "9px", height: "9px", color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.45)" }}>
                  {currentPhase.text}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* EEG section */}
        <div style={{ display: "flex", alignItems: "stretch", gap: "0", padding: "0 10px 8px" }}>
          {/* Channel labels */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", paddingRight: "6px", paddingBottom: "2px" }}>
            {CHANNEL_CONFIG.map(cfg => (
              <div key={cfg.name} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: cfg.color, boxShadow: `0 0 4px ${cfg.color}`, flexShrink: 0 }} />
                <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: cfg.color, opacity: 0.7, letterSpacing: "0.3px", fontWeight: 700 }}>
                  {cfg.name}
                </span>
              </div>
            ))}
          </div>

          {/* Canvas waveform */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <EEGCanvas phaseColor={currentPhase.color} active={true} />
          </div>

          {/* Neural dot matrix */}
          <div style={{ paddingLeft: "6px" }}>
            <NeuralDotMatrix color={currentPhase.color} active={true} />
          </div>
        </div>

        {/* Bottom confidence bar */}
        <div style={{ padding: "0 10px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Activity style={{ width: "8px", height: "8px", color: "rgba(255,255,255,0.2)" }} />
              <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.5px" }}>
                CONFIDENCE
              </span>
            </div>
            <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: currentPhase.color, fontWeight: 700 }}>
              {Math.min(confidencePct, 94)}%
            </span>
          </div>
          <div style={{ height: "2px", borderRadius: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                height: "100%", width: "40%", borderRadius: "2px",
                background: `linear-gradient(90deg, transparent, ${currentPhase.color}, transparent)`,
              }}
            />
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${currentPhase.color}20 50%, transparent)` }} />
      </div>
    </motion.div>
  );
}
