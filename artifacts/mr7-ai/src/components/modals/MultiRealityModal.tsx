import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Globe, Zap, Activity, Shield, Brain, TrendingUp, Play, Pause, RefreshCw, AlertTriangle } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const UNIVERSES = [
  { id: "U-Alpha", label: "Universe Alpha", scenario: "APT Nation-State Attack", status: "RUNNING", progress: 74, outcome: "BREACH DETECTED", color: "#ff0040" },
  { id: "U-Beta", label: "Universe Beta", scenario: "Ransomware Wave", status: "RUNNING", progress: 52, outcome: "CONTAINED", color: "#10b981" },
  { id: "U-Gamma", label: "Universe Gamma", scenario: "Insider Threat", status: "RUNNING", progress: 88, outcome: "CRITICAL", color: "#ff0040" },
  { id: "U-Delta", label: "Universe Delta", scenario: "Supply Chain Compromise", status: "PAUSED", progress: 31, outcome: "INVESTIGATING", color: "#fbbf24" },
  { id: "U-Epsilon", label: "Universe Epsilon", scenario: "Zero-Day Weaponization", status: "RUNNING", progress: 19, outcome: "MONITORING", color: "#a78bfa" },
  { id: "U-Zeta", label: "Universe Zeta", scenario: "AI Model Poisoning", status: "COMPLETE", progress: 100, outcome: "PREVENTED", color: "#10b981" },
];

export function MultiRealityModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"universes" | "compare" | "outcomes" | "spawn">("universes");
  const [selected, setSelected] = useState<string[]>(["U-Alpha", "U-Beta"]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  const toggleUniverse = (id: string) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(20px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030208 0%, #050210 100%)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 16, boxShadow: "0 0 120px rgba(99,102,241,0.12)" }}>
          {/* Dimensional shimmer */}
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(ellipse at ${30 + i * 20}% ${40 + i * 10}%, rgba(99,102,241,0.04), transparent 60%)` }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, delay: i * 1, repeat: Infinity }} />
          ))}

          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(99,102,241,0.15)", background: "rgba(99,102,241,0.04)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)" }}>
              <Layers className="w-5 h-5" style={{ color: "#6366f1" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#6366f1", textShadow: "0 0 20px rgba(99,102,241,0.8)" }}>MULTI-REALITY SECURITY SIMULATOR</div>
              <div className="text-[10px] font-mono" style={{ color: "#6366f144" }}>PARALLEL UNIVERSE TESTING · SIMULTANEOUS ATTACK SIMULATIONS · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#6366f1" }}>6</div>
                <div className="text-[8px] font-mono" style={{ color: "#6366f155" }}>PARALLEL UNIVERSES</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "universes", label: "UNIVERSES", icon: Globe }, { id: "compare", label: "COMPARE", icon: Layers }, { id: "outcomes", label: "OUTCOMES", icon: TrendingUp }, { id: "spawn", label: "SPAWN NEW", icon: Zap }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#6366f1" : "#444", background: tab === t.id ? "rgba(99,102,241,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "universes" && (
              <div className="grid grid-cols-2 gap-4">
                {UNIVERSES.map((u, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]" style={{ background: `${u.color}06`, border: `1px solid ${u.color}20`, boxShadow: `0 0 20px ${u.color}05` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${u.color}15`, border: `1px solid ${u.color}30` }}>
                        <Globe className="w-4 h-4" style={{ color: u.color }} />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold" style={{ color: u.color }}>{u.label}</div>
                        <div className="text-[9px] font-mono" style={{ color: "#555" }}>{u.scenario}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {u.status === "RUNNING" && <motion.div className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1, repeat: Infinity }} />}
                        <span className="text-[8px] font-mono" style={{ color: u.status === "RUNNING" ? "#10b981" : u.status === "PAUSED" ? "#fbbf24" : "#3b82f6" }}>{u.status}</span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono" style={{ color: "#444" }}>SIMULATION PROGRESS</span>
                        <span className="text-[9px] font-mono font-bold" style={{ color: u.color }}>{u.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: u.color }} animate={{ width: `${u.progress}%` }} />
                      </div>
                    </div>
                    <div className="text-[9px] font-mono font-bold" style={{ color: u.color }}>OUTCOME: {u.outcome}</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "compare" && (
              <div className="flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#6366f155" }}>SELECT UNIVERSES TO COMPARE</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {UNIVERSES.map(u => (
                    <button key={u.id} onClick={() => toggleUniverse(u.id)} className="px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold transition-all" style={{ background: selected.includes(u.id) ? `${u.color}20` : "rgba(255,255,255,0.03)", color: selected.includes(u.id) ? u.color : "#444", border: `1px solid ${selected.includes(u.id) ? u.color + "40" : "rgba(255,255,255,0.06)"}` }}>{u.id}</button>
                  ))}
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
                  {selected.map(id => {
                    const u = UNIVERSES.find(x => x.id === id)!;
                    if (!u) return null;
                    return (
                      <div key={id} className="p-4 rounded-xl" style={{ background: `${u.color}08`, border: `1px solid ${u.color}22` }}>
                        <div className="text-[12px] font-bold mb-3" style={{ color: u.color }}>{u.label}</div>
                        {[{ label: "Scenario", val: u.scenario }, { label: "Progress", val: u.progress + "%" }, { label: "Outcome", val: u.outcome }, { label: "Status", val: u.status }].map((m, i) => (
                          <div key={i} className="mb-2">
                            <div className="text-[8px] font-mono" style={{ color: "#444" }}>{m.label}</div>
                            <div className="text-[11px] font-bold" style={{ color: u.color }}>{m.val}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {tab === "outcomes" && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Universes with Breach", val: "2/6", color: "#ff0040" },
                  { label: "Universes Contained", val: "3/6", color: "#10b981" },
                  { label: "Average Time-to-Detect", val: "4m 22s", color: "#00e5ff" },
                  { label: "Best Outcome Universe", val: "U-Zeta", color: "#10b981" },
                  { label: "Worst Outcome Universe", val: "U-Gamma", color: "#ff0040" },
                  { label: "Control Effectiveness", val: "83.4%", color: "#6366f1" },
                ].map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }} className="p-5 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}22` }}>
                    <div className="text-[22px] font-black" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-[9px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "spawn" && (
              <div className="flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#6366f155" }}>SPAWN A NEW PARALLEL UNIVERSE</div>
                <div className="grid grid-cols-3 gap-3">
                  {["APT Simulation", "Ransomware Drill", "Insider Threat", "Zero-Day Test", "DDoS Flood", "AI Adversary", "Phishing Wave", "Supply Chain", "Firmware Attack"].map((scenario, i) => (
                    <motion.button key={i} whileHover={{ scale: 1.03 }} className="p-4 rounded-xl text-center transition-all" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }}>
                      <Globe className="w-6 h-6 mx-auto mb-2" style={{ color: "#6366f1" }} />
                      <div className="text-[11px] font-bold text-white/70">{scenario}</div>
                    </motion.button>
                  ))}
                </div>
                <button className="self-center px-8 py-3 rounded-xl font-bold text-[12px] transition-all hover:scale-105" style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.35)", boxShadow: "0 0 20px rgba(99,102,241,0.15)" }}>
                  SPAWN UNIVERSE
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
