import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Dna, User, Activity, AlertTriangle, Brain, Zap, Search, Shield, TrendingUp, Hash } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const IDENTITIES = [
  { id: "USR-001", name: "Admin Account", type: "HUMAN", risk: 12, anomaly: "None", genome: [0.8, 0.3, 0.9, 0.4, 0.7, 0.2, 0.8, 0.5] },
  { id: "USR-002", name: "Service Account K7", type: "MACHINE", risk: 67, anomaly: "Unusual hours", genome: [0.2, 0.9, 0.1, 0.8, 0.3, 0.9, 0.2, 0.7] },
  { id: "USR-003", name: "DevOps Pipeline", type: "PROCESS", risk: 34, anomaly: "New destination", genome: [0.5, 0.5, 0.6, 0.4, 0.7, 0.3, 0.8, 0.4] },
  { id: "USR-004", name: "External API Key", type: "API", risk: 88, anomaly: "Volume spike 400%", genome: [0.9, 0.1, 0.8, 0.2, 0.9, 0.1, 0.7, 0.3] },
  { id: "USR-005", name: "Mobile Device X92", type: "DEVICE", risk: 45, anomaly: "Location change", genome: [0.4, 0.7, 0.3, 0.8, 0.2, 0.6, 0.5, 0.7] },
];

const DNA_DIMENSIONS = ["Access Timing", "Data Volume", "Service Scope", "Auth Pattern", "Geo Behavior", "Error Rate", "Resource Use", "Network Profile"];

export function BehavioralDNAModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"genome" | "anomaly" | "evolution" | "compare">("genome");
  const [selected, setSelected] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  const ent = IDENTITIES[selected];
  const riskColor = (r: number) => r > 70 ? "#ff0040" : r > 40 ? "#f97316" : "#10b981";

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #020a06 0%, #020810 100%)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, boxShadow: "0 0 120px rgba(16,185,129,0.08)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(16,185,129,0.12)", background: "rgba(16,185,129,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" }}>
              <Hash className="w-5 h-5" style={{ color: "#10b981" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#10b981", textShadow: "0 0 20px rgba(16,185,129,0.8)" }}>BEHAVIORAL DNA ENGINE</div>
              <div className="text-[10px] font-mono" style={{ color: "#10b98144" }}>IDENTITY GENOME PROFILING · ANOMALY DETECTION AT DNA LEVEL · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#f97316" }}>2</div>
                <div className="text-[8px] font-mono" style={{ color: "#f9731666" }}>HIGH RISK</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "genome", label: "DNA GENOME", icon: Hash }, { id: "anomaly", label: "ANOMALY DETECTION", icon: AlertTriangle }, { id: "evolution", label: "DNA EVOLUTION", icon: TrendingUp }, { id: "compare", label: "PROFILE COMPARE", icon: Brain }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#10b981" : "#444", background: tab === t.id ? "rgba(16,185,129,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "genome" && (
              <div className="flex gap-5 h-full">
                <div className="w-64 shrink-0 flex flex-col gap-2">
                  {IDENTITIES.map((id, i) => (
                    <button key={i} onClick={() => setSelected(i)} className="text-left p-3 rounded-xl transition-all" style={{ background: selected === i ? `${riskColor(id.risk)}10` : "rgba(255,255,255,0.02)", border: `1px solid ${selected === i ? riskColor(id.risk) + "35" : "rgba(255,255,255,0.06)"}` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5" style={{ color: riskColor(id.risk) }} />
                        <span className="text-[10px] font-semibold text-white/80">{id.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#666" }}>{id.type}</span>
                        <span className="text-[9px] font-bold" style={{ color: riskColor(id.risk) }}>RISK: {id.risk}%</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <div className="p-5 rounded-xl" style={{ background: `${riskColor(ent.risk)}06`, border: `1px solid ${riskColor(ent.risk)}20` }}>
                    <div className="text-[11px] font-mono font-bold mb-4" style={{ color: "#10b98166" }}>BEHAVIORAL GENOME — {ent.id}</div>
                    <div className="flex flex-col gap-3">
                      {DNA_DIMENSIONS.map((dim, i) => {
                        const v = ent.genome[i];
                        const isAnomaly = v > 0.7 && ent.risk > 50;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="text-[9px] font-mono w-28 shrink-0" style={{ color: isAnomaly ? "#ff0040" : "#666" }}>{dim}</div>
                            <div className="flex-1 flex items-end gap-px h-6">
                              {Array.from({ length: 40 }).map((_, j) => {
                                const bv = v + Math.sin(j * 0.5 + i) * 0.3;
                                return (<div key={j} className="flex-1 rounded-t-sm" style={{ height: `${Math.abs(bv) * 100}%`, background: isAnomaly ? `rgba(255,0,64,${0.4 + j / 80})` : `rgba(16,185,129,${0.3 + j / 100})` }} />);
                              })}
                            </div>
                            <div className="text-[9px] font-bold w-8 text-right" style={{ color: isAnomaly ? "#ff0040" : "#10b981" }}>{(v * 100).toFixed(0)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {tab === "anomaly" && (
              <div className="flex flex-col gap-3">
                {IDENTITIES.filter(id => id.risk > 30).map((id, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="p-4 rounded-xl flex items-center gap-4" style={{ background: `${riskColor(id.risk)}06`, border: `1px solid ${riskColor(id.risk)}20` }}>
                    <AlertTriangle className="w-6 h-6 shrink-0" style={{ color: riskColor(id.risk) }} />
                    <div className="flex-1">
                      <div className="text-[12px] font-bold text-white">{id.name} <span className="text-[9px] font-mono" style={{ color: "#555" }}>{id.id}</span></div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: "#777" }}>Anomaly: {id.anomaly}</div>
                    </div>
                    <div className="text-[16px] font-black" style={{ color: riskColor(id.risk) }}>{id.risk}%</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "evolution" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#10b98166" }}>DNA EVOLUTION OVER TIME — BASELINE DRIFT ANALYSIS</div>
                {IDENTITIES.map((id, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.1)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-white/70">{id.name}</span>
                      <span className="text-[8px] font-mono" style={{ color: "#444" }}>{id.id}</span>
                    </div>
                    <div className="flex items-end gap-0.5 h-8">
                      {Array.from({ length: 60 }).map((_, j) => {
                        const drift = id.genome[(j % 8)] * (1 + Math.sin(j * 0.3 + i) * 0.3);
                        const isHigh = drift > 0.75;
                        return (<div key={j} className="flex-1 rounded-t-sm" style={{ height: `${drift * 100}%`, background: isHigh ? "#ff0040" : "#10b981", opacity: 0.6 + j / 120 }} />);
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === "compare" && (
              <div className="h-full">
                <div className="text-[10px] font-mono font-bold mb-4" style={{ color: "#10b98166" }}>CROSS-IDENTITY GENOME COMPARISON</div>
                <div className="overflow-auto">
                  <table className="w-full text-[10px] font-mono">
                    <thead>
                      <tr>
                        <th className="text-left p-2" style={{ color: "#555" }}>IDENTITY</th>
                        {DNA_DIMENSIONS.map(d => (<th key={d} className="p-2 text-center" style={{ color: "#555", minWidth: 80 }}>{d.slice(0, 8)}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {IDENTITIES.map((id, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                          <td className="p-2" style={{ color: riskColor(id.risk) }}>{id.name}</td>
                          {id.genome.map((v, j) => (
                            <td key={j} className="p-2 text-center">
                              <div className="w-8 h-8 mx-auto rounded" style={{ background: `rgba(16,185,129,${v})`, border: "1px solid rgba(16,185,129,0.2)" }} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
