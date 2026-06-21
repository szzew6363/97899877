import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, TrendingUp, RefreshCw, Zap, Activity, Eye, Shield, ChevronRight, Cpu, GitBranch } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const CYCLES = [
  { id: "CYCLE-8841", phase: "ANALYSIS", finding: "Detection latency 12ms above optimal", action: "Rewriting priority queue algorithm", delta: "-9ms", status: "APPLIED" },
  { id: "CYCLE-8842", phase: "SYNTHESIS", finding: "False positive rate increased 0.2% after last update", action: "Rolling back threshold change + retuning", delta: "-0.18%", status: "APPLIED" },
  { id: "CYCLE-8843", phase: "EVALUATION", finding: "New attack vector not covered by ruleset", action: "Generating synthetic training samples", delta: "+4.1% coverage", status: "IN PROGRESS" },
  { id: "CYCLE-8844", phase: "PLANNING", finding: "Memory usage 8% above baseline", action: "Analyzing allocation hotspots", delta: "TBD", status: "QUEUED" },
];

const METRICS_HISTORY = Array.from({ length: 30 }, (_, i) => 80 + i * 0.4 + Math.sin(i * 0.5) * 3);

export function SelfImprovingModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"cycles" | "intelligence" | "weaknesses" | "upgrades">("cycles");
  const [iq, setIq] = useState(94.7);
  const [cycleCount, setCycleCount] = useState(8843);

  useEffect(() => {
    const id = setInterval(() => {
      setIq(i => Math.min(100, i + 0.003));
      setCycleCount(c => c + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030508 0%, #030a12 100%)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(251,191,36,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(251,191,36,0.12)", background: "rgba(251,191,36,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)" }}>
              <Brain className="w-5 h-5" style={{ color: "#fbbf24" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#fbbf24", textShadow: "0 0 20px rgba(251,191,36,0.8)" }}>RECURSIVE SELF-IMPROVING CYBER DEFENSE CORE</div>
              <div className="text-[10px] font-mono" style={{ color: "#fbbf2444" }}>AUTONOMOUS INTELLIGENCE UPGRADE · CONTINUOUS SELF-ANALYSIS · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <motion.div className="text-[22px] font-black" style={{ color: "#fbbf24" }} animate={{ opacity: [1, 0.8, 1] }} transition={{ duration: 2, repeat: Infinity }}>{iq.toFixed(3)}%</motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#fbbf2455" }}>INTELLIGENCE QUOTIENT</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-mono font-black" style={{ color: "#10b981" }}>{cycleCount.toLocaleString()}</div>
                <div className="text-[8px] font-mono" style={{ color: "#10b98155" }}>IMPROVEMENT CYCLES</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "cycles", label: "IMPROVEMENT CYCLES", icon: RefreshCw }, { id: "intelligence", label: "INTELLIGENCE GROWTH", icon: TrendingUp }, { id: "weaknesses", label: "WEAKNESS DETECTION", icon: Eye }, { id: "upgrades", label: "APPLIED UPGRADES", icon: Zap }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#fbbf24" : "#444", background: tab === t.id ? "rgba(251,191,36,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "cycles" && (
              <div className="flex flex-col gap-3">
                {CYCLES.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: c.status === "APPLIED" ? "rgba(16,185,129,0.06)" : c.status === "IN PROGRESS" ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${c.status === "APPLIED" ? "rgba(16,185,129,0.2)" : c.status === "IN PROGRESS" ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-mono" style={{ color: "#555" }}>{c.id}</span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>{c.phase}</span>
                      <span className="ml-auto text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: c.status === "APPLIED" ? "rgba(16,185,129,0.15)" : c.status === "IN PROGRESS" ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)", color: c.status === "APPLIED" ? "#10b981" : c.status === "IN PROGRESS" ? "#fbbf24" : "#555" }}>{c.status}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-white/80 mb-1">{c.finding}</div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <ChevronRight className="w-3 h-3" style={{ color: "#fbbf24" }} />
                      <span style={{ color: "#777" }}>{c.action}</span>
                      {c.delta !== "TBD" && <span className="ml-auto font-bold" style={{ color: "#10b981" }}>{c.delta}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "intelligence" && (
              <div className="flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#fbbf2455" }}>INTELLIGENCE QUOTIENT GROWTH CURVE</div>
                <div className="flex items-end gap-1 p-4 rounded-xl h-40" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(251,191,36,0.12)" }}>
                  {METRICS_HISTORY.map((v, i) => (
                    <motion.div key={i} className="flex-1 rounded-t-sm" style={{ background: `rgba(251,191,36,${0.3 + i / 60})` }} initial={{ height: 0 }} animate={{ height: `${(v - 79) * 5}%` }} transition={{ duration: 0.5, delay: i * 0.02 }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: "Current IQ", val: `${iq.toFixed(3)}%`, color: "#fbbf24" }, { label: "Growth Rate", val: "+0.003%/s", color: "#10b981" }, { label: "Time to 100%", val: "~28 days", color: "#a78bfa" }].map((m, i) => (
                    <div key={i} className="p-4 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                      <div className="text-[18px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "#444" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "weaknesses" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#fbbf2455" }}>SELF-IDENTIFIED WEAKNESSES — AUTONOMOUS DETECTION</div>
                {["Detection blind spot: encrypted DNS tunneling (mitigation: 72% ready)", "Response latency spike under 1000+ concurrent events (fix: in testing)", "Coverage gap: IoT device firmware exploits (training: scheduled)", "Memory leak in long-running analysis threads (patch: v9.3.2-hotfix)", "Suboptimal heuristic weights for polymorphic malware detection"].map((w, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,0,64,0.05)", border: "1px solid rgba(255,0,64,0.15)" }}>
                    <Eye className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#ff0040" }} />
                    <span className="text-[10px] font-mono text-white/60">{w}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "upgrades" && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-mono font-bold mb-1" style={{ color: "#fbbf2455" }}>APPLIED INTELLIGENCE UPGRADES LOG</div>
                {Array.from({ length: 10 }).map((_, i) => {
                  const upgrades = ["Algorithm rewrite: priority queue", "Neural weight adjustment: threat scoring", "Coverage expansion: cloud-native attacks", "Latency optimization: parallel processing", "Threshold retuning: false positive reduction", "New threat family encoded: AI-generated phishing", "Memory optimization: 8% reduction achieved", "Response playbook update: ransomware v4", "Coverage expansion: quantum-resistant crypto attacks", "Self-diagnostic accuracy improved: +2.1%"];
                  const deltas = ["-9ms", "+0.3% accuracy", "+4.2% coverage", "-15ms", "-0.18% FP rate", "+1.9% recall", "-8% memory", "+12% MTTR", "+3.4% coverage", "+2.1% accuracy"];
                  return (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                      <RefreshCw className="w-3 h-3 shrink-0" style={{ color: "#10b981" }} />
                      <span className="flex-1 text-[10px] font-mono text-white/60">{upgrades[i]}</span>
                      <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: "#10b981" }}>{deltas[i]}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
