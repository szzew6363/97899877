import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Target, Shield, Brain, Activity, AlertTriangle, TrendingUp, ChevronRight, Globe, RefreshCw } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const THREATS = [
  { id: "T-001", name: "Sandworm Advanced Persistent Threat", origin: "Nation-State", evolution: "Stage 3 of 7", predicted_next: "Lateral movement via SMB", confidence: 96, eradication: 23, color: "#ff0040" },
  { id: "T-002", name: "DarkMatter Ransomware v4.2", origin: "Criminal", evolution: "Active encryption", predicted_next: "C2 check-in + exfil trigger", confidence: 91, eradication: 67, color: "#f97316" },
  { id: "T-003", name: "SilentBreach Supply Chain Implant", origin: "Unknown", evolution: "Dormant phase", predicted_next: "Activation via scheduled task", confidence: 84, eradication: 14, color: "#fbbf24" },
];

export function HyperAdaptiveModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"eradication" | "evolution" | "prediction" | "adapt">("eradication");
  const [eradScore, setEradScore] = useState(67);
  const [adapting, setAdapting] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setEradScore(e => Math.min(100, e + (Math.random() > 0.6 ? 0.5 : 0)));
    }, 800);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #080204 0%, #0c0208 100%)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(239,68,68,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(239,68,68,0.12)", background: "rgba(239,68,68,0.03)" }}>
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
              <Zap className="w-5 h-5" style={{ color: "#ef4444" }} />
              <motion.div className="absolute inset-0 rounded-xl" style={{ border: "1px solid rgba(239,68,68,0.6)" }} animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#ef4444", textShadow: "0 0 20px rgba(239,68,68,0.8)" }}>HYPER-ADAPTIVE THREAT ERADICATION ENGINE</div>
              <div className="text-[10px] font-mono" style={{ color: "#ef444444" }}>PREDICT · INTERCEPT · ERADICATE · NEUTRALIZE VARIANTS · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <motion.div className="text-[22px] font-black" style={{ color: "#ef4444" }} animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 1, repeat: Infinity }}>{eradScore.toFixed(1)}%</motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#ef444455" }}>ERADICATION PROGRESS</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "eradication", label: "ACTIVE ERADICATION", icon: Target }, { id: "evolution", label: "THREAT EVOLUTION", icon: TrendingUp }, { id: "prediction", label: "VARIANT PREDICTION", icon: Brain }, { id: "adapt", label: "ADAPTIVE RESPONSE", icon: RefreshCw }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#ef4444" : "#444", background: tab === t.id ? "rgba(239,68,68,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "eradication" && (
              <div className="flex flex-col gap-4">
                {THREATS.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="p-5 rounded-xl" style={{ background: `${t.color}06`, border: `1px solid ${t.color}22` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-6 h-6 shrink-0" style={{ color: t.color }} />
                      <div className="flex-1">
                        <div className="text-[13px] font-bold text-white">{t.name}</div>
                        <div className="text-[9px] font-mono" style={{ color: "#555" }}>{t.id} · Origin: {t.origin} · Phase: {t.evolution}</div>
                      </div>
                      <div className="text-center shrink-0">
                        <div className="text-[18px] font-black" style={{ color: t.color }}>{t.eradication}%</div>
                        <div className="text-[8px] font-mono" style={{ color: "#444" }}>ERADICATED</div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color}88)`, boxShadow: `0 0 8px ${t.color}` }} animate={{ width: `${t.eradication}%` }} transition={{ duration: 1.5 }} />
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono">
                      <ChevronRight className="w-3 h-3" style={{ color: t.color }} />
                      <span style={{ color: "#777" }}>Next predicted action: {t.predicted_next}</span>
                      <span className="ml-auto font-bold" style={{ color: t.color }}>Confidence: {t.confidence}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "evolution" && (
              <div className="flex flex-col gap-3">
                {THREATS.map((t, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: `${t.color}05`, border: `1px solid ${t.color}18` }}>
                    <div className="text-[11px] font-bold mb-3" style={{ color: t.color }}>{t.name}</div>
                    <div className="flex items-center gap-1">
                      {["Recon", "Delivery", "Exploitation", "Installation", "C2", "Actions", "Exfil"].map((stage, j) => {
                        const stage_idx = ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5", "Stage 6", "Stage 7"].indexOf(t.evolution.split(" of ")[0]);
                        const current_stage = parseInt(t.evolution.split("Stage ")[1]) - 1;
                        return (
                          <div key={j} className="flex-1 text-center">
                            <div className="h-2 rounded mb-1" style={{ background: j <= current_stage ? t.color : "rgba(255,255,255,0.05)" }} />
                            <div className="text-[7px] font-mono" style={{ color: j <= current_stage ? t.color : "#333" }}>{stage}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === "prediction" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#ef444455" }}>PREDICTED FUTURE THREAT VARIANTS</div>
                {["DarkMatter Ransomware v4.3 — Quantum-resistant encryption variant (est. 72h)", "Sandworm Tool Update — New exfil mechanism via ICMP covert channel (est. 48h)", "SilentBreach v2 — Polymorphic signature to evade current detection (est. 120h)", "Cross-family fusion: DarkMatter + SilentBreach loader sharing (est. 7 days)"].map((v, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <Brain className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                    <span className="text-[10px] font-mono text-white/60">{v}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "adapt" && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Adaptive Response Speed", val: "0.4ms", color: "#10b981" },
                  { label: "Variants Predicted", val: "12", color: "#a78bfa" },
                  { label: "Pre-emptive Blocks", val: "34", color: "#3b82f6" },
                  { label: "Adaptation Cycles/h", val: "1,284", color: "#fbbf24" },
                  { label: "Eradication Rate", val: "94.7%", color: "#10b981" },
                  { label: "Threat Reinfection", val: "0%", color: "#10b981" },
                ].map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-5 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}22` }}>
                    <div className="text-[24px] font-black" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-[9px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
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
