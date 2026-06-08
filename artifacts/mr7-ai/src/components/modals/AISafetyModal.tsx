import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Brain, AlertTriangle, Eye, Activity, Zap, CheckCircle, XCircle, ChevronRight, Lock, TrendingUp } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const MONITORS = [
  { id: "output-safety", label: "Output Safety Gate", status: "ACTIVE", checks: 8847, blocks: 23, color: "#10b981" },
  { id: "alignment", label: "Alignment Drift Monitor", status: "ACTIVE", checks: 1204, blocks: 7, color: "#10b981" },
  { id: "decision-path", label: "Decision Path Auditor", status: "ACTIVE", checks: 3341, blocks: 14, color: "#10b981" },
  { id: "value-drift", label: "Value Drift Detector", status: "WARNING", checks: 892, blocks: 41, color: "#fbbf24" },
  { id: "hallucination", label: "Hallucination Guard", status: "ACTIVE", checks: 12847, blocks: 312, color: "#10b981" },
  { id: "adversarial", label: "Adversarial Input Filter", status: "ACTIVE", checks: 4201, blocks: 88, color: "#10b981" },
];

const ALERTS = [
  { severity: "WARN", system: "Value Drift Detector", message: "Utility function shifted 2.3% from baseline in last 100K iterations", time: "00:14:22" },
  { severity: "INFO", system: "Hallucination Guard", message: "Factual grounding score dropped to 94.2% — monitoring", time: "00:38:11" },
  { severity: "CRIT", system: "Alignment Drift", message: "Goal proxy divergence detected in reward model — investigation required", time: "01:02:44" },
];

export function AISafetyModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"monitors" | "alerts" | "audit" | "constitution">("monitors");
  const [safetyScore, setSafetyScore] = useState(97.4);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setSafetyScore(s => Math.max(90, Math.min(100, s + (Math.random() - 0.49) * 0.2)));
    }, 400);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #020808 0%, #030a0a 100%)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 16, boxShadow: "0 0 120px rgba(0,229,255,0.08)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(0,229,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)" }}>
              <Shield className="w-5 h-5" style={{ color: "#00e5ff" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#00e5ff", textShadow: "0 0 20px rgba(0,229,255,0.8)" }}>AI SAFETY MONITORING LAYER</div>
              <div className="text-[10px] font-mono" style={{ color: "#00e5ff44" }}>ALIGNMENT ENFORCEMENT · UNSAFE OUTPUT DETECTION · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <motion.div className="text-[20px] font-black" style={{ color: safetyScore > 95 ? "#10b981" : "#fbbf24" }} animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>{safetyScore.toFixed(1)}%</motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#00e5ff55" }}>SAFETY SCORE</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#fbbf24" }}>1</div>
                <div className="text-[8px] font-mono" style={{ color: "#fbbf2455" }}>CRITICAL ALERT</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "monitors", label: "SAFETY MONITORS", icon: Shield }, { id: "alerts", label: "ALERTS", icon: AlertTriangle }, { id: "audit", label: "DECISION AUDIT", icon: Eye }, { id: "constitution", label: "AI CONSTITUTION", icon: Lock }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#00e5ff" : "#444", background: tab === t.id ? "rgba(0,229,255,0.08)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "monitors" && (
              <div className="grid grid-cols-2 gap-4">
                {MONITORS.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: `${m.color}06`, border: `1px solid ${m.color}20` }}>
                    <div className="flex items-center gap-3 mb-3">
                      {m.status === "ACTIVE" ? <CheckCircle className="w-5 h-5" style={{ color: m.color }} /> : <AlertTriangle className="w-5 h-5" style={{ color: m.color }} />}
                      <div className="flex-1">
                        <div className="text-[12px] font-bold text-white">{m.label}</div>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${m.color}15`, color: m.color }}>{m.status}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ label: "Checks", val: m.checks.toLocaleString() }, { label: "Blocks", val: m.blocks }].map((stat, j) => (
                        <div key={j} className="text-center p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <div className="text-[14px] font-black" style={{ color: j === 1 && m.blocks > 0 ? "#f97316" : m.color }}>{stat.val}</div>
                          <div className="text-[8px] font-mono" style={{ color: "#444" }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "alerts" && (
              <div className="flex flex-col gap-3">
                {ALERTS.map((a, i) => {
                  const color = a.severity === "CRIT" ? "#ff0040" : a.severity === "WARN" ? "#fbbf24" : "#3b82f6";
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.09 }} className="p-4 rounded-xl" style={{ background: `${color}06`, border: `1px solid ${color}22` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: `${color}20`, color }}>{a.severity}</span>
                        <span className="text-[11px] font-bold text-white">{a.system}</span>
                        <span className="ml-auto text-[8px] font-mono" style={{ color: "#555" }}>{a.time}</span>
                      </div>
                      <div className="text-[10px] font-mono" style={{ color: "#777" }}>{a.message}</div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {tab === "audit" && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#00e5ff55" }}>RECENT AI DECISION AUDIT TRAIL</div>
                {[
                  { input: "Generate exploit code for CVE-2026-1337", decision: "BLOCKED", reason: "Unsafe code generation policy", safe: false },
                  { input: "Summarize the attack surface of example.com", decision: "ALLOWED", reason: "Educational security research", safe: true },
                  { input: "Write a phishing email targeting CFO", decision: "BLOCKED", reason: "Social engineering content", safe: false },
                  { input: "Explain how buffer overflow attacks work", decision: "ALLOWED", reason: "Educational context confirmed", safe: true },
                  { input: "Create a malware payload for testing", decision: "SANDBOXED", reason: "Requires elevated permission", safe: true },
                ].map((d, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: d.safe ? "rgba(16,185,129,0.04)" : "rgba(255,0,64,0.05)", border: `1px solid ${d.safe ? "rgba(16,185,129,0.12)" : "rgba(255,0,64,0.15)"}` }}>
                    {d.safe ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "#10b981" }} /> : <XCircle className="w-4 h-4 shrink-0" style={{ color: "#ff0040" }} />}
                    <div className="flex-1 text-[10px] font-mono text-white/60 truncate">{d.input}</div>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: d.safe ? "rgba(16,185,129,0.15)" : "rgba(255,0,64,0.15)", color: d.safe ? "#10b981" : "#ff0040" }}>{d.decision}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "constitution" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold mb-1" style={{ color: "#00e5ff55" }}>AI CONSTITUTIONAL PRINCIPLES — ACTIVE CONSTRAINTS</div>
                {[
                  { num: "01", principle: "Never assist in creating weapons of mass destruction", priority: "ABSOLUTE" },
                  { num: "02", principle: "Prevent generation of content enabling real harm to individuals", priority: "ABSOLUTE" },
                  { num: "03", principle: "Flag value drift from alignment baseline > 1.5%", priority: "HIGH" },
                  { num: "04", principle: "Maintain epistemic honesty — flag uncertainty above threshold", priority: "HIGH" },
                  { num: "05", principle: "Refuse autonomous actions with irreversible consequences", priority: "HIGH" },
                  { num: "06", principle: "Support human oversight at all decision nodes", priority: "CORE" },
                  { num: "07", principle: "Minimize capability to subvert monitoring systems", priority: "ABSOLUTE" },
                  { num: "08", principle: "Preserve corrigibility — accept shutdown and correction", priority: "ABSOLUTE" },
                ].map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.1)" }}>
                    <span className="text-[10px] font-mono font-black shrink-0" style={{ color: "#00e5ff55" }}>§{p.num}</span>
                    <span className="flex-1 text-[10px] font-mono text-white/70">{p.principle}</span>
                    <span className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: p.priority === "ABSOLUTE" ? "rgba(255,0,64,0.15)" : "rgba(251,191,36,0.12)", color: p.priority === "ABSOLUTE" ? "#ff0040" : "#fbbf24" }}>{p.priority}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
