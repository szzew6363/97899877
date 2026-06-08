import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, AlertTriangle, Zap, Activity, Eye, Target, Brain, Radio, Network, Lock, Flame, Search, RefreshCw, ChevronRight, TrendingUp, Globe, Bug } from "lucide-react";
import { useStore } from "@/lib/store";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const THREATS = [
  { id: 1, type: "APT-44 Sandworm", severity: "CRITICAL", confidence: 97, vector: "Network Intrusion", status: "ACTIVE", time: "00:02:14", color: "#ff0040", geo: "UA → US" },
  { id: 2, type: "Polymorphic Ransomware", severity: "HIGH", confidence: 91, vector: "Endpoint", status: "DETECTED", time: "00:08:31", color: "#f97316", geo: "RU → EU" },
  { id: 3, type: "Supply Chain Poisoning", severity: "CRITICAL", confidence: 88, vector: "CI/CD Pipeline", status: "QUARANTINED", time: "00:15:07", color: "#ff0040", geo: "CN → GLOBAL" },
  { id: 4, type: "Zero-Day Exploit CVE-2026-1337", severity: "CRITICAL", confidence: 94, vector: "Browser RCE", status: "ACTIVE", time: "00:23:45", color: "#ff0040", geo: "Unknown" },
  { id: 5, type: "AI-Generated Phishing Campaign", severity: "HIGH", confidence: 86, vector: "Email / Social", status: "MITIGATED", time: "01:02:18", color: "#f97316", geo: "Distributed" },
  { id: 6, type: "Quantum Decrypt Attempt", severity: "MEDIUM", confidence: 72, vector: "Crypto Layer", status: "MONITORING", time: "02:14:53", color: "#fbbf24", geo: "APAC" },
  { id: 7, type: "Neural Network Poisoning", severity: "HIGH", confidence: 83, vector: "AI Model API", status: "INVESTIGATING", time: "03:41:22", color: "#f97316", geo: "Distributed" },
  { id: 8, type: "Firmware Implant Detection", severity: "CRITICAL", confidence: 96, vector: "Hardware Layer", status: "ACTIVE", time: "04:07:11", color: "#ff0040", geo: "CN → US" },
];

const PATTERNS = [
  { name: "Lateral Movement Pattern", match: 94, trend: "+12%", icon: Network, color: "#00e5ff" },
  { name: "Data Exfiltration Sequence", match: 88, trend: "+7%", icon: Target, color: "#ff0040" },
  { name: "Command & Control Beacon", match: 76, trend: "+3%", icon: Radio, color: "#fbbf24" },
  { name: "Privilege Escalation Chain", match: 91, trend: "+18%", icon: Lock, color: "#a78bfa" },
  { name: "AI Evasion Techniques", match: 69, trend: "+24%", icon: Brain, color: "#10b981" },
];

export function ThreatDetectionModal({ open, onOpenChange }: Props) {
  const { state } = useStore();
  const [tab, setTab] = useState<"live" | "patterns" | "heatmap" | "predict">("live");
  const [scanning, setScanning] = useState(true);
  const [threatCount, setThreatCount] = useState(8);
  const [pulseRing, setPulseRing] = useState(0);
  const [particles, setParticles] = useState<{ x: number; y: number; r: number; speed: number; angle: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const accent = state.accent?.value ?? "#e21227";

  useEffect(() => {
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * 800, y: Math.random() * 400,
      r: Math.random() * 2 + 0.5, speed: Math.random() * 0.8 + 0.2,
      angle: Math.random() * Math.PI * 2,
    }));
    setParticles(pts);
  }, []);

  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => setPulseRing(p => (p + 1) % 3), 600);
    return () => clearInterval(id);
  }, [scanning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let frame = 0;
    const pts = particles.slice();

    function draw() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = "rgba(226,18,39,0.06)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Particles
      pts.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${0.3 + Math.sin(frame * 0.05) * 0.2})`;
        ctx.fill();
      });

      // Radar sweep
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const maxR = Math.min(cx, cy) * 0.8;
      const sweep = (frame * 0.02) % (Math.PI * 2);
      const grad = ctx.createConicalGradient ? null : null;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - 0.6, sweep);
      ctx.fillStyle = "rgba(226,18,39,0.08)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR);
      ctx.strokeStyle = "rgba(226,18,39,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Radar rings
      [0.3, 0.55, 0.8].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(226,18,39,0.12)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Threat blips
      THREATS.slice(0, 6).forEach((t, i) => {
        const angle = (i / 6) * Math.PI * 2 + frame * 0.005;
        const radius = maxR * (0.3 + (i % 3) * 0.25);
        const bx = cx + Math.cos(angle) * radius;
        const by = cy + Math.sin(angle) * radius;
        const pulse = Math.sin(frame * 0.1 + i) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(bx, by, 4 + pulse * 3, 0, Math.PI * 2);
        ctx.fillStyle = t.color + "cc";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, 8 + pulse * 6, 0, Math.PI * 2);
        ctx.strokeStyle = t.color + "44";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      frame++;
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [particles]);

  if (!open) return null;

  const severityColor = (s: string) => s === "CRITICAL" ? "#ff0040" : s === "HIGH" ? "#f97316" : "#fbbf24";
  const statusColor = (s: string) => ({ ACTIVE: "#ff0040", DETECTED: "#fbbf24", QUARANTINED: "#10b981", MITIGATED: "#3b82f6", MONITORING: "#a78bfa", INVESTIGATING: "#f97316" }[s] ?? "#888");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}
      >
        <motion.div
          initial={{ scale: 0.92, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 30 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a0002 0%, #080000 50%, #0a0205 100%)",
            border: "1px solid rgba(255,0,64,0.25)",
            borderRadius: 16,
            boxShadow: "0 0 120px rgba(255,0,64,0.12), 0 0 400px rgba(226,18,39,0.06), inset 0 0 60px rgba(255,0,64,0.03)",
          }}
        >
          {/* Animated scan line */}
          <motion.div
            className="absolute inset-x-0 h-px z-10 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,0,64,0.6), transparent)" }}
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(255,0,64,0.15)", background: "rgba(255,0,64,0.04)" }}>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,0,64,0.15)", border: "1px solid rgba(255,0,64,0.4)", boxShadow: "0 0 20px rgba(255,0,64,0.3)" }}>
                <Shield className="w-5 h-5" style={{ color: "#ff0040" }} />
              </div>
              <motion.div className="absolute inset-0 rounded-xl" style={{ border: "1px solid rgba(255,0,64,0.6)" }} animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#ff0040", textShadow: "0 0 20px rgba(255,0,64,0.8)" }}>THREAT DETECTION ENGINE</div>
              <div className="text-[10px] font-mono" style={{ color: "#ff004066" }}>ADVANCED BEHAVIORAL ANOMALY SYSTEM · v9.3.1 · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-6">
              <div className="flex items-center gap-2">
                <motion.div className="w-2 h-2 rounded-full" style={{ background: "#ff0040" }} animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                <span className="text-[10px] font-mono font-bold" style={{ color: "#ff0040" }}>LIVE SCAN</span>
              </div>
              <div className="text-center">
                <div className="text-[22px] font-black" style={{ color: "#ff0040", textShadow: "0 0 15px rgba(255,0,64,0.6)" }}>{threatCount}</div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004088" }}>ACTIVE THREATS</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg transition-colors hover:bg-white/5">
                <X className="w-4 h-4" style={{ color: "#444" }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[
              { id: "live", label: "LIVE THREATS", icon: Flame },
              { id: "patterns", label: "BEHAVIOR PATTERNS", icon: Brain },
              { id: "heatmap", label: "RADAR SCAN", icon: Target },
              { id: "predict", label: "PREDICTION ENGINE", icon: TrendingUp },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all"
                style={{
                  color: tab === t.id ? "#ff0040" : "#444",
                  background: tab === t.id ? "rgba(255,0,64,0.12)" : "transparent",
                  border: `1px solid ${tab === t.id ? "rgba(255,0,64,0.35)" : "rgba(255,255,255,0.05)"}`,
                  boxShadow: tab === t.id ? "0 0 12px rgba(255,0,64,0.2)" : "none",
                }}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-6 pt-4">
            {tab === "live" && (
              <div className="h-full flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: "calc(100% - 10px)" }}>
                {THREATS.map((threat, i) => (
                  <motion.div
                    key={threat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                    style={{
                      background: `linear-gradient(135deg, rgba(255,0,64,0.04), rgba(0,0,0,0))`,
                      border: `1px solid ${threat.color}22`,
                      boxShadow: `0 0 20px ${threat.color}08, inset 0 0 20px rgba(0,0,0,0.3)`,
                    }}
                  >
                    <div className="relative w-10 h-10 shrink-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${threat.color}15`, border: `1px solid ${threat.color}35` }}>
                        <AlertTriangle className="w-5 h-5" style={{ color: threat.color }} />
                      </div>
                      {threat.status === "ACTIVE" && (
                        <motion.div className="absolute inset-0 rounded-xl" style={{ border: `1px solid ${threat.color}` }} animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-bold text-white truncate">{threat.type}</span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${severityColor(threat.severity)}20`, color: severityColor(threat.severity), border: `1px solid ${severityColor(threat.severity)}40` }}>{threat.severity}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-mono" style={{ color: "#555" }}>
                        <span>{threat.vector}</span>
                        <span>·</span>
                        <Globe className="w-2.5 h-2.5" />
                        <span>{threat.geo}</span>
                        <span>·</span>
                        <span>{threat.time} ago</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-black mb-1" style={{ color: threat.color }}>{threat.confidence}%</div>
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${threat.color}, ${threat.color}88)` }} initial={{ width: 0 }} animate={{ width: `${threat.confidence}%` }} transition={{ duration: 1, delay: i * 0.06 }} />
                      </div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "#444" }}>CONFIDENCE</div>
                    </div>
                    <div className="shrink-0">
                      <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg" style={{ background: `${statusColor(threat.status)}15`, color: statusColor(threat.status), border: `1px solid ${statusColor(threat.status)}30` }}>{threat.status}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {tab === "patterns" && (
              <div className="h-full flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#ff004088" }}>ANOMALY BEHAVIOR PATTERNS — REAL-TIME CORRELATION ENGINE</div>
                {PATTERNS.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${p.color}20` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                        <p.icon className="w-4 h-4" style={{ color: p.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-bold text-white">{p.name}</div>
                        <div className="text-[9px] font-mono" style={{ color: "#444" }}>PATTERN MATCH CONFIDENCE</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] font-black" style={{ color: p.color }}>{p.match}%</div>
                        <div className="text-[9px] font-mono font-bold" style={{ color: "#10b981" }}>{p.trend}</div>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}66)`, boxShadow: `0 0 8px ${p.color}` }} initial={{ width: 0 }} animate={{ width: `${p.match}%` }} transition={{ duration: 1.2, delay: i * 0.08 }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {tab === "heatmap" && (
              <div className="h-full flex flex-col">
                <div className="text-[10px] font-mono font-bold mb-3" style={{ color: "#ff004088" }}>GLOBAL THREAT RADAR — 360° PERIMETER SCAN</div>
                <div className="flex-1 relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,0,64,0.15)", background: "rgba(0,0,0,0.5)" }}>
                  <canvas ref={canvasRef} className="w-full h-full" />
                  <div className="absolute top-4 left-4 flex flex-col gap-1">
                    {THREATS.slice(0, 4).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px] font-mono">
                        <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                        <span style={{ color: "#666" }}>{t.type.slice(0, 24)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "predict" && (
              <div className="h-full flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#ff004088" }}>PREDICTIVE THREAT ENGINE — TEMPORAL ANALYSIS ACTIVE</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Next 1H Threat Score", val: "87/100", color: "#ff0040", icon: Flame },
                    { label: "Attack Vector Probability", val: "Network 64%", color: "#f97316", icon: Network },
                    { label: "Zero-Day Likelihood", val: "32%", color: "#fbbf24", icon: Bug },
                    { label: "AI-Powered Attacks", val: "+340%", color: "#a78bfa", icon: Brain },
                    { label: "Critical Asset Risk", val: "ELEVATED", color: "#ff0040", icon: AlertTriangle },
                    { label: "Threat Actor Activity", val: "9 APTs LIVE", color: "#00e5ff", icon: Eye },
                  ].map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}25`, boxShadow: `0 0 20px ${m.color}08` }}>
                      <m.icon className="w-6 h-6 mx-auto mb-2" style={{ color: m.color }} />
                      <div className="text-[14px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex-1 p-4 rounded-xl" style={{ background: "rgba(255,0,64,0.03)", border: "1px solid rgba(255,0,64,0.12)" }}>
                  <div className="text-[10px] font-mono font-bold mb-3" style={{ color: "#ff004088" }}>PREDICTED ATTACK TIMELINE</div>
                  <div className="space-y-2">
                    {["Spear-phishing wave targeting C-suite (12h)", "Supply chain compromise attempt (24h)", "Critical infrastructure probe (48h)", "Coordinated DDoS + Exfiltration (72h)"].map((e, i) => (
                      <div key={i} className="flex items-center gap-3 text-[10px] font-mono">
                        <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#ff0040" }} />
                        <span className="text-white/60">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
