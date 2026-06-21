import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, AlertTriangle, Search, Brain, TrendingUp, Zap, Database, Network, Eye, BarChart2 } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const ANOMALIES = [
  { id: "ANO-8841", dataset: "Production Traffic", metric: "Request Rate", baseline: "12K/s", current: "847K/s", deviation: "+6,959%", severity: "CRITICAL", color: "#ff0040" },
  { id: "ANO-8842", dataset: "User Behavior", metric: "Login Attempts", baseline: "2.3/user/day", current: "312/user/day", deviation: "+13,465%", severity: "CRITICAL", color: "#ff0040" },
  { id: "ANO-8843", dataset: "Data Egress", metric: "Transfer Volume", baseline: "4.2 GB/h", current: "847 GB/h", deviation: "+20,069%", severity: "CRITICAL", color: "#ff0040" },
  { id: "ANO-8844", dataset: "DNS Queries", metric: "Unique Domains", baseline: "1,200/h", current: "94,000/h", deviation: "+7,733%", severity: "HIGH", color: "#f97316" },
  { id: "ANO-8845", dataset: "API Usage", metric: "Error Rate", baseline: "0.1%", current: "34.7%", deviation: "+34,600%", severity: "HIGH", color: "#f97316" },
];

export function LargeScaleAnomalyModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"anomalies" | "heatmap" | "clusters" | "predict">("anomalies");
  const [waveData, setWaveData] = useState<number[]>([]);
  const [totalAnomalies, setTotalAnomalies] = useState(5);

  useEffect(() => {
    const id = setInterval(() => {
      setWaveData(prev => [...prev.slice(-79), 10 + Math.random() * 90 + Math.sin(Date.now() / 300) * 20]);
    }, 100);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030806 0%, #050a08 100%)", border: "1px solid rgba(16,185,129,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(16,185,129,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(16,185,129,0.12)", background: "rgba(16,185,129,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
              <BarChart2 className="w-5 h-5" style={{ color: "#10b981" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#10b981", textShadow: "0 0 20px rgba(16,185,129,0.8)" }}>LARGE-SCALE ANOMALY DETECTION SYSTEM</div>
              <div className="text-[10px] font-mono" style={{ color: "#10b98144" }}>MASSIVE DATASET ANALYSIS · BEHAVIORAL PATTERN DETECTION · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <motion.div className="text-[20px] font-black" style={{ color: "#ff0040" }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>{totalAnomalies}</motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004055" }}>ANOMALIES</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "anomalies", label: "ANOMALIES", icon: AlertTriangle }, { id: "heatmap", label: "LIVE STREAM", icon: Activity }, { id: "clusters", label: "CLUSTERS", icon: Database }, { id: "predict", label: "ML MODEL", icon: Brain }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#10b981" : "#444", background: tab === t.id ? "rgba(16,185,129,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "anomalies" && (
              <div className="flex flex-col gap-3">
                {ANOMALIES.map((a, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: `${a.color}06`, border: `1px solid ${a.color}20` }}>
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: a.color }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-white">{a.dataset}</span>
                          <span className="text-[9px] font-mono" style={{ color: "#555" }}>{a.metric}</span>
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ml-auto" style={{ background: `${a.color}20`, color: a.color }}>{a.severity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ label: "BASELINE", val: a.baseline, color: "#555" }, { label: "CURRENT", val: a.current, color: a.color }, { label: "DEVIATION", val: a.deviation, color: "#ff0040" }].map((m, j) => (
                        <div key={j} className="p-2.5 rounded-lg text-center" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <div className="text-[12px] font-black" style={{ color: m.color }}>{m.val}</div>
                          <div className="text-[7px] font-mono mt-0.5" style={{ color: "#333" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "heatmap" && (
              <div className="flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#10b98155" }}>REAL-TIME ANOMALY STREAM</div>
                <div className="flex items-end gap-0.5 h-40 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(16,185,129,0.12)" }}>
                  {waveData.map((v, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${v}%`, background: v > 70 ? "#ff0040" : v > 50 ? "#f97316" : `rgba(16,185,129,${0.3 + i / 120})` }} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[{ label: "Datasets Monitored", val: "1,284", color: "#10b981" }, { label: "Events/Second", val: "9.4M", color: "#00e5ff" }, { label: "Anomalies (24h)", val: "847", color: "#f97316" }, { label: "False Positive Rate", val: "0.02%", color: "#10b981" }].map((m, i) => (
                    <div key={i} className="p-3 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                      <div className="text-[16px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "#444" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "clusters" && (
              <div className="grid grid-cols-3 gap-3">
                {["Traffic Anomalies", "Auth Anomalies", "Data Access Anomalies", "Network Pattern Anomalies", "API Behavior Anomalies", "User Behavior Anomalies"].map((cluster, i) => {
                  const counts = [3, 2, 1, 4, 2, 3];
                  const colors = ["#ff0040", "#f97316", "#fbbf24", "#10b981", "#3b82f6", "#a78bfa"];
                  return (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: `${colors[i]}08`, border: `1px solid ${colors[i]}22` }}>
                      <div className="text-[11px] font-bold text-white/70 mb-2">{cluster}</div>
                      <div className="text-[22px] font-black" style={{ color: colors[i] }}>{counts[i]}</div>
                      <div className="text-[8px] font-mono" style={{ color: "#444" }}>Active anomalies</div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {tab === "predict" && (
              <div className="flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#10b98155" }}>ML MODEL PERFORMANCE METRICS</div>
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: "Model Accuracy", val: "99.98%", color: "#10b981" }, { label: "Recall", val: "99.7%", color: "#10b981" }, { label: "Precision", val: "99.3%", color: "#10b981" }, { label: "F1 Score", val: "0.995", color: "#10b981" }, { label: "AUC-ROC", val: "0.9991", color: "#a78bfa" }, { label: "Model Version", val: "v12.4.2", color: "#00e5ff" }].map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                      <div className="text-[18px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "#444" }}>{m.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
