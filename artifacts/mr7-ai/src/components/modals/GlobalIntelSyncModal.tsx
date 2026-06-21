import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Activity, Zap, Network, Shield, TrendingUp, Radio, Cpu, Eye } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const REGIONS = [
  { id: "NA", label: "North America", signals: 1842, sync: 99.2, threats: 14, color: "#00e5ff" },
  { id: "EU", label: "Europe", signals: 2341, sync: 98.7, threats: 22, color: "#3b82f6" },
  { id: "APAC", label: "Asia Pacific", signals: 3104, sync: 97.8, threats: 31, color: "#a78bfa" },
  { id: "LATAM", label: "Latin America", signals: 847, sync: 96.4, threats: 8, color: "#10b981" },
  { id: "ME", label: "Middle East", signals: 712, sync: 95.1, threats: 11, color: "#fbbf24" },
  { id: "AF", label: "Africa", signals: 523, sync: 93.8, threats: 6, color: "#f97316" },
];

export function GlobalIntelSyncModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"global" | "signals" | "compression" | "awareness">("global");
  const [totalSignals, setTotalSignals] = useState(9369);
  const [syncRate, setSyncRate] = useState(98.4);
  const [compressionWave, setCompressionWave] = useState<number[]>([]);

  useEffect(() => {
    const id1 = setInterval(() => {
      setTotalSignals(s => s + Math.floor(Math.random() * 50));
      setSyncRate(s => Math.max(94, Math.min(100, s + (Math.random() - 0.49) * 0.1)));
      setCompressionWave(prev => [...prev.slice(-79), 30 + Math.random() * 70 + Math.sin(Date.now() / 500) * 20]);
    }, 200);
    return () => clearInterval(id1);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #020a08 0%, #030c12 100%)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 16, boxShadow: "0 0 120px rgba(0,229,255,0.08)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(0,229,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)" }}>
              <Globe className="w-5 h-5" style={{ color: "#00e5ff" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#00e5ff", textShadow: "0 0 20px rgba(0,229,255,0.8)" }}>GLOBAL INTELLIGENCE SYNCHRONIZATION LAYER</div>
              <div className="text-[10px] font-mono" style={{ color: "#00e5ff44" }}>DISTRIBUTED SIGNAL AGGREGATION · UNIFIED AWARENESS STATE · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <motion.div className="text-[18px] font-black tabular-nums" style={{ color: "#00e5ff" }} animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 1, repeat: Infinity }}>{totalSignals.toLocaleString()}</motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#00e5ff44" }}>SIGNALS/SEC</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-black" style={{ color: "#10b981" }}>{syncRate.toFixed(1)}%</div>
                <div className="text-[8px] font-mono" style={{ color: "#10b98144" }}>SYNC RATE</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "global", label: "GLOBAL VIEW", icon: Globe }, { id: "signals", label: "SIGNAL STREAMS", icon: Radio }, { id: "compression", label: "COMPRESSION", icon: Zap }, { id: "awareness", label: "AWARENESS STATE", icon: Eye }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#00e5ff" : "#444", background: tab === t.id ? "rgba(0,229,255,0.08)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "global" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  {REGIONS.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: `${r.color}06`, border: `1px solid ${r.color}20` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="w-4 h-4" style={{ color: r.color }} />
                        <span className="text-[11px] font-bold" style={{ color: r.color }}>{r.label}</span>
                        <span className="ml-auto text-[8px] font-mono font-bold px-1 py-0.5 rounded" style={{ background: "rgba(255,0,64,0.15)", color: "#ff6060" }}>{r.threats} threats</span>
                      </div>
                      <div className="text-[18px] font-black" style={{ color: r.color }}>{r.signals.toLocaleString()}</div>
                      <div className="text-[8px] font-mono" style={{ color: "#444" }}>SIGNALS · SYNC {r.sync}%</div>
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: r.color }} animate={{ width: `${r.sync}%` }} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {tab === "signals" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#00e5ff55" }}>LIVE SIGNAL STREAMS</div>
                {REGIONS.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${r.color}05`, border: `1px solid ${r.color}15` }}>
                    <Globe className="w-4 h-4 shrink-0" style={{ color: r.color }} />
                    <div className="text-[10px] font-mono w-28 shrink-0" style={{ color: r.color }}>{r.label}</div>
                    <div className="flex-1 flex items-end gap-px h-8">
                      {Array.from({ length: 40 }).map((_, j) => (
                        <motion.div key={j} className="flex-1 rounded-t-sm" style={{ background: r.color }} animate={{ height: `${20 + Math.random() * 80}%` }} transition={{ duration: 0.3 + j * 0.01 }} />
                      ))}
                    </div>
                    <div className="text-[10px] font-black w-16 text-right" style={{ color: r.color }}>{r.signals.toLocaleString()}/s</div>
                  </div>
                ))}
              </div>
            )}
            {tab === "compression" && (
              <div className="flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#00e5ff55" }}>REAL-TIME SIGNAL COMPRESSION INTO AWARENESS STATE</div>
                <div className="flex items-end gap-0.5 h-40 p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,229,255,0.12)" }}>
                  {compressionWave.map((v, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${v}%`, background: `rgba(0,229,255,${0.3 + i / 120})` }} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[{ label: "Raw Signals", val: `${totalSignals.toLocaleString()}`, color: "#555" }, { label: "After Dedup", val: `${Math.floor(totalSignals * 0.34).toLocaleString()}`, color: "#3b82f6" }, { label: "After Correlation", val: `${Math.floor(totalSignals * 0.08).toLocaleString()}`, color: "#a78bfa" }, { label: "Awareness Atoms", val: `${Math.floor(totalSignals * 0.01).toLocaleString()}`, color: "#00e5ff" }].map((m, i) => (
                    <div key={i} className="p-3 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                      <div className="text-[16px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "#444" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "awareness" && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Global Threat Level", val: "ELEVATED", color: "#f97316" },
                  { label: "Total Active Incidents", val: "47", color: "#ff0040" },
                  { label: "New IOCs (1h)", val: "1,284", color: "#fbbf24" },
                  { label: "APT Groups Active", val: "9", color: "#a78bfa" },
                  { label: "Critical Regions", val: "2", color: "#ff0040" },
                  { label: "Synchronized Sensors", val: "142,847", color: "#10b981" },
                ].map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-5 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}22` }}>
                    <div className="text-[22px] font-black" style={{ color: m.color }}>{m.val}</div>
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
