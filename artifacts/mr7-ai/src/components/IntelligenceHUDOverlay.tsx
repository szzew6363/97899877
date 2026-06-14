/*
  INTELLIGENCE HUD OVERLAY
  Always-visible floating panel — bottom-right corner.
  Shows AI brain state, scores, threat level, recent events.
  Click OPEN INTEL to launch the full CyberIntelCenter.
*/
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Shield, Activity, Wifi, ChevronUp, ChevronDown, Zap, AlertTriangle } from "lucide-react";
import { cyberBrain, type BrainScores, type BrainDecision, type ThreatLevel } from "@/lib/cyberBrain";

interface IntelligenceHUDOverlayProps {
  onOpenCommandCenter: () => void;
}

const THREAT_COLORS: Record<ThreatLevel, string> = {
  NOMINAL:  "#22c55e",
  ELEVATED: "#f59e0b",
  HIGH:     "#f97316",
  CRITICAL: "#e21227",
};

function BrainOrbCanvas({ threatLevel, scores, size = 72 }: {
  threatLevel: ThreatLevel;
  scores: BrainScores;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    cv.width  = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const baseColor = THREAT_COLORS[threatLevel];
    const cx = size / 2, cy = size / 2;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.025;
      const t = tRef.current;
      ctx.clearRect(0, 0, size, size);

      /* Outer atmosphere glow */
      const atmo = ctx.createRadialGradient(cx, cy, size * 0.25, cx, cy, size * 0.48);
      atmo.addColorStop(0, baseColor + "22");
      atmo.addColorStop(1, "transparent");
      ctx.fillStyle = atmo;
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2); ctx.fill();

      /* Scanning ring */
      const sweep = ((t * 0.6) % (Math.PI * 2));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      const rg = ctx.createLinearGradient(-size * 0.45, 0, size * 0.45, 0);
      rg.addColorStop(0, "transparent");
      rg.addColorStop(0.7, baseColor + "44");
      rg.addColorStop(1, baseColor + "aa");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, size * 0.45, -0.4, 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      /* Concentric rings */
      [0.45, 0.32, 0.20].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, size * r, 0, Math.PI * 2);
        ctx.strokeStyle = baseColor + (i === 0 ? "55" : i === 1 ? "44" : "33");
        ctx.lineWidth = i === 0 ? 1 : 0.5;
        ctx.stroke();
      });

      /* Score arcs — 4 segments */
      const scoreVals = [
        scores.systemHealth / 100,
        scores.networkStability / 100,
        1 - scores.threatLevel / 100,
        scores.userEngagement / 100,
      ];
      const arcColors = ["#22c55e", "#00e5ff", "#e21227", "#f59e0b"];
      scoreVals.forEach((val, i) => {
        const startAngle = -Math.PI / 2 + (Math.PI * 2 / 4) * i;
        const span       = (Math.PI * 2 / 4) * 0.85;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.41, startAngle, startAngle + span * val);
        ctx.strokeStyle = arcColors[i] + "cc";
        ctx.lineWidth   = 2;
        ctx.lineCap     = "round";
        ctx.stroke();
      });

      /* Core orb */
      const pulse = 0.88 + Math.sin(t * 2.5) * 0.12;
      const coreR = size * 0.14 * pulse;
      const core  = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, "#ffffff");
      core.addColorStop(0.35, baseColor + "ee");
      core.addColorStop(1, baseColor + "22");
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      /* Orbiting particles */
      for (let i = 0; i < 6; i++) {
        const angle = t * 1.2 + (Math.PI * 2 / 6) * i;
        const r     = size * 0.28;
        const px    = cx + Math.cos(angle) * r;
        const py    = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = baseColor + "cc";
        ctx.fill();
      }

      /* Counter-rotating particles */
      for (let i = 0; i < 4; i++) {
        const angle = -t * 0.9 + (Math.PI * 2 / 4) * i;
        const r     = size * 0.36;
        const px    = cx + Math.cos(angle) * r;
        const py    = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff44";
        ctx.fill();
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [threatLevel, scores, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded-full"
    />
  );
}

function ScoreBar({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={10} style={{ color }} className="shrink-0" />
      <span className="text-[9px] font-mono text-white/50 w-[52px] shrink-0">{label}</span>
      <div className="flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-[9px] font-mono w-6 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export function IntelligenceHUDOverlay({ onOpenCommandCenter }: IntelligenceHUDOverlayProps) {
  const [scores,      setScores]      = useState<BrainScores>(() => cyberBrain.getScores());
  const [decisions,   setDecisions]   = useState<BrainDecision[]>(() => cyberBrain.getDecisions());
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>(() => cyberBrain.getThreatLevel());
  const [collapsed,   setCollapsed]   = useState(false);
  const [pulse,       setPulse]       = useState(false);
  const [simActive,   setSimActive]   = useState(false);

  useEffect(() => {
    return cyberBrain.subscribe((ev) => {
      if (ev.type === 'scores_update') {
        const s = ev.payload as BrainScores;
        setScores(s);
        setThreatLevel(cyberBrain.getThreatLevel());
      }
      if (ev.type === 'decision' || ev.type === 'threat_detected') {
        setDecisions(cyberBrain.getDecisions());
        setPulse(true);
        setTimeout(() => setPulse(false), 1500);
      }
      if (ev.type === 'simulation_start') { setSimActive(true);  setPulse(true); }
      if (ev.type === 'simulation_end')   { setSimActive(false); }
    });
  }, []);

  const threatColor = THREAT_COLORS[threatLevel];
  const recent      = decisions.slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
      className="fixed bottom-[72px] right-3 z-[200] select-none"
      style={{ width: 268 }}
    >
      <div
        className="rounded-xl overflow-hidden border"
        style={{
          background: "rgba(6,6,10,0.92)",
          backdropFilter: "blur(16px)",
          borderColor: pulse ? threatColor + "88" : "#1f1f2e",
          boxShadow: pulse
            ? `0 0 24px ${threatColor}44, 0 8px 32px rgba(0,0,0,0.6)`
            : "0 8px 32px rgba(0,0,0,0.5)",
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          style={{ borderBottom: collapsed ? "none" : "1px solid #1a1a28" }}
          onClick={() => setCollapsed(v => !v)}
        >
          <div className="relative">
            <motion.div
              animate={{ scale: pulse ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.5 }}
            >
              <Brain size={14} style={{ color: threatColor }} />
            </motion.div>
            {simActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>

          <span className="text-[10px] font-mono font-bold tracking-widest text-white/80 uppercase">
            AI Intel
          </span>

          <div className="flex items-center gap-1 ml-auto">
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[8px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ color: threatColor, background: threatColor + "20", border: `1px solid ${threatColor}44` }}
            >
              {threatLevel}
            </motion.span>
            {collapsed ? <ChevronUp size={10} className="text-white/40" /> : <ChevronDown size={10} className="text-white/40" />}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 py-2 flex gap-3 items-center">
                <BrainOrbCanvas threatLevel={threatLevel} scores={scores} size={72} />

                <div className="flex-1 flex flex-col gap-1.5">
                  <ScoreBar label="HEALTH" value={scores.systemHealth}     color="#22c55e" icon={Activity} />
                  <ScoreBar label="NETWORK" value={scores.networkStability} color="#00e5ff" icon={Wifi} />
                  <ScoreBar label="THREAT"  value={scores.threatLevel}      color="#e21227" icon={AlertTriangle} />
                  <ScoreBar label="ENGAGE"  value={scores.userEngagement}   color="#f59e0b" icon={Zap} />
                </div>
              </div>

              {/* Recent decisions */}
              {recent.length > 0 && (
                <div className="px-3 pb-2 flex flex-col gap-1">
                  {recent.map((d) => (
                    <div key={d.id} className="flex items-start gap-1.5">
                      <div
                        className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                        style={{
                          backgroundColor: d.severity === 'critical' ? '#e21227' : d.severity === 'warn' ? '#f59e0b' : '#22c55e',
                        }}
                      />
                      <span className="text-[9px] font-mono text-white/45 leading-tight line-clamp-1">
                        {d.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action */}
              <div className="px-3 pb-3">
                <button
                  onClick={onOpenCommandCenter}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all hover:opacity-90 active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${threatColor}22, ${threatColor}11)`,
                    border: `1px solid ${threatColor}55`,
                    color: threatColor,
                  }}
                >
                  <Shield size={9} />
                  Open Command Center
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
