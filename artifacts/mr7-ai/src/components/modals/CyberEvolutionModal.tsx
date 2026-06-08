import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, TrendingUp, Brain, Zap, Activity, Shield, Cpu, Code2, GitBranch, ChevronRight, Layers } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const GENERATIONS = [
  { gen: "v1.0", name: "Genesis", date: "3088-01-01", improvements: 0, fitness: 40, color: "#555" },
  { gen: "v2.0", name: "Awakening", date: "3088-06-15", improvements: 847, fitness: 61, color: "#3b82f6" },
  { gen: "v3.0", name: "Cognition", date: "3089-02-28", improvements: 2341, fitness: 74, color: "#8b5cf6" },
  { gen: "v4.0", name: "Adaptation", date: "3089-09-11", improvements: 5892, fitness: 84, color: "#f97316" },
  { gen: "v5.0", name: "Transcendence", date: "3090-03-20", improvements: 12847, fitness: 94, color: "#00e5ff" },
  { gen: "v5.1 (CURRENT)", name: "Singularity", date: "NOW", improvements: 847, fitness: 97, color: "#10b981" },
];

const MUTATIONS = [
  { id: "MUT-9341", type: "Architecture Rewrite", module: "Threat Detection Core", delta: "+4.2% accuracy", status: "APPLIED", color: "#10b981" },
  { id: "MUT-9342", type: "Algorithm Evolution", module: "Behavioral DNA Engine", delta: "+7.8% recall", status: "APPLIED", color: "#10b981" },
  { id: "MUT-9343", type: "Neural Pathway Add", module: "Response Synthesizer", delta: "-12ms latency", status: "TESTING", color: "#fbbf24" },
  { id: "MUT-9344", type: "Schema Reorganization", module: "Memory Fabric", delta: "+3.1% coherence", status: "PROPOSED", color: "#6366f1" },
  { id: "MUT-9345", type: "Redundancy Pruning", module: "Anomaly Classifier", delta: "-20% compute cost", status: "PROPOSED", color: "#6366f1" },
];

export function CyberEvolutionModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"generations" | "mutations" | "fitness" | "live">("generations");
  const [fitness, setFitness] = useState(97.2);
  const [generation, setGeneration] = useState("v5.1.847");
  const [fitnessHistory] = useState(() => Array.from({ length: 60 }, (_, i) => 40 + i * 0.9 + Math.sin(i * 0.5) * 5));

  useEffect(() => {
    const id = setInterval(() => {
      setFitness(f => Math.min(100, f + (Math.random() - 0.45) * 0.15));
    }, 500);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #020a04 0%, #030c08 100%)", border: "1px solid rgba(16,185,129,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(16,185,129,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(16,185,129,0.12)", background: "rgba(16,185,129,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
              <RefreshCw className="w-5 h-5" style={{ color: "#10b981" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#10b981", textShadow: "0 0 20px rgba(16,185,129,0.8)" }}>AUTONOMOUS CYBER EVOLUTION ENGINE</div>
              <div className="text-[10px] font-mono" style={{ color: "#10b98144" }}>RUNTIME ARCHITECTURE REWRITING · ZERO-DOWNTIME UPGRADES · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <div className="text-[18px] font-black" style={{ color: "#10b981" }}>{fitness.toFixed(2)}%</div>
                <div className="text-[8px] font-mono" style={{ color: "#10b98155" }}>FITNESS SCORE</div>
              </div>
              <div className="text-center">
                <div className="text-[13px] font-mono font-black" style={{ color: "#10b981" }}>{generation}</div>
                <div className="text-[8px] font-mono" style={{ color: "#10b98155" }}>CURRENT GEN</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "generations", label: "GENERATIONS", icon: GitBranch }, { id: "mutations", label: "MUTATIONS", icon: Zap }, { id: "fitness", label: "FITNESS CURVE", icon: TrendingUp }, { id: "live", label: "LIVE EVOLUTION", icon: RefreshCw }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#10b981" : "#444", background: tab === t.id ? "rgba(16,185,129,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "generations" && (
              <div className="flex flex-col gap-3">
                {GENERATIONS.map((g, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${g.color}08`, border: `1px solid ${g.color}20` }}>
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: `${g.color}15`, border: `1px solid ${g.color}30` }}>
                      <div className="text-[9px] font-mono font-black" style={{ color: g.color }}>{g.gen}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-bold" style={{ color: g.color }}>{g.name}</span>
                        <span className="text-[8px] font-mono" style={{ color: "#555" }}>{g.date}</span>
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: "#444" }}>{g.improvements.toLocaleString()} micro-improvements applied</div>
                    </div>
                    <div className="shrink-0 text-center">
                      <div className="text-[18px] font-black" style={{ color: g.color }}>{g.fitness}%</div>
                      <div className="w-20 h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${g.fitness}%`, background: g.color }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "mutations" && (
              <div className="flex flex-col gap-3">
                {MUTATIONS.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl flex items-center gap-4" style={{ background: `${m.color}06`, border: `1px solid ${m.color}20` }}>
                    <div className="text-[9px] font-mono shrink-0" style={{ color: m.color }}>{m.id}</div>
                    <div className="flex-1">
                      <div className="text-[11px] font-bold text-white/80">{m.type}</div>
                      <div className="text-[9px] font-mono" style={{ color: "#555" }}>{m.module}</div>
                    </div>
                    <div className="text-[11px] font-bold" style={{ color: "#10b981" }}>{m.delta}</div>
                    <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}30` }}>{m.status}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "fitness" && (
              <div className="h-full flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#10b98155" }}>EVOLUTIONARY FITNESS OVER TIME</div>
                <div className="flex-1 flex items-end gap-1 p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(16,185,129,0.12)", minHeight: 200 }}>
                  {fitnessHistory.map((v, i) => (
                    <motion.div key={i} className="flex-1 rounded-t-sm" style={{ background: `rgba(16,185,129,${0.3 + i / 100})` }} initial={{ height: 0 }} animate={{ height: `${v}%` }} transition={{ duration: 0.5, delay: i * 0.01 }} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[{ label: "Current Fitness", val: `${fitness.toFixed(2)}%`, color: "#10b981" }, { label: "Best Ever", val: "97.8%", color: "#00e5ff" }, { label: "Improvement Rate", val: "+0.3%/day", color: "#a78bfa" }, { label: "Mutations/min", val: "14.2", color: "#fbbf24" }].map((m, i) => (
                    <div key={i} className="p-3 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                      <div className="text-[16px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "#444" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "live" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#10b98155" }}>LIVE EVOLUTION LOG — REAL-TIME RUNTIME MODIFICATIONS</div>
                {Array.from({ length: 8 }).map((_, i) => {
                  const actions = ["Rewriting detection algorithm for 3.1% accuracy gain", "Pruning 847 redundant neural pathways", "Merging duplicate response patterns", "Optimizing memory layout for cache efficiency", "Injecting new threat signature learned 4ms ago", "Restructuring classification tree (depth: 8 → 6)", "Auto-tuning hyperparameters via Bayesian optimization", "Evolving response templates based on recent incident outcomes"];
                  const modules = ["ThreatCore", "BehaviorDNA", "MemoryFabric", "ResponseSynth", "AnomalyCS", "EvolutionLoop", "PatternLib", "CognitionEngine"];
                  return (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                      <motion.div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#10b981" }} animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1 + i * 0.2, repeat: Infinity }} />
                      <span className="text-[9px] font-mono" style={{ color: "#10b98177" }}>{modules[i]}</span>
                      <ChevronRight className="w-3 h-3" style={{ color: "#10b98133" }} />
                      <span className="flex-1 text-[10px] font-mono text-white/60">{actions[i]}</span>
                      <span className="text-[8px] font-mono shrink-0" style={{ color: "#10b981" }}>LIVE</span>
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
