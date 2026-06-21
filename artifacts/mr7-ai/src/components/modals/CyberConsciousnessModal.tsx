import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Zap, Activity, Globe, Network, Shield, Eye, Cpu, Radio, Layers, RefreshCw } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const NODES = [
  { id: "perception", label: "PERCEPTION LAYER", val: 98, color: "#00e5ff" },
  { id: "cognition", label: "COGNITIVE CORE", val: 94, color: "#a78bfa" },
  { id: "memory", label: "MEMORY FABRIC", val: 87, color: "#10b981" },
  { id: "adaptation", label: "ADAPTATION ENGINE", val: 91, color: "#fbbf24" },
  { id: "defense", label: "DEFENSE MATRIX", val: 96, color: "#ff0040" },
  { id: "evolution", label: "EVOLUTION LOOP", val: 89, color: "#f97316" },
];

const STREAMS = [
  { label: "Network I/O Consciousness", val: "12.8 TB/s", trend: "+2.3%" },
  { label: "Threat Awareness State", val: "ELEVATED", trend: "⬆" },
  { label: "Self-Reflection Cycles", val: "1.4M/sec", trend: "+8%" },
  { label: "Organism Health Score", val: "97/100", trend: "STABLE" },
  { label: "Adaptive Response Lag", val: "0.003ms", trend: "-12%" },
  { label: "Neural Pathway Density", val: "8.91B", trend: "+0.4%" },
];

export function CyberConsciousnessModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"organism" | "streams" | "states" | "evolution">("organism");
  const [heartbeat, setHeartbeat] = useState(0);
  const [brainWave, setBrainWave] = useState<number[]>([]);
  const [consciousness, setConsciousness] = useState(94);

  useEffect(() => {
    const id = setInterval(() => {
      setHeartbeat(h => h + 1);
      setBrainWave(prev => [...prev.slice(-79), 30 + Math.random() * 70 + Math.sin(Date.now() / 300) * 20]);
      setConsciousness(c => Math.max(85, Math.min(100, c + (Math.random() - 0.48) * 2)));
    }, 100);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(20px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #020a10 0%, #030812 100%)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 16, boxShadow: "0 0 120px rgba(0,229,255,0.08), 0 0 400px rgba(0,180,255,0.04)" }}>
          {/* Pulsing organism effect */}
          <motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: "1px solid rgba(0,229,255,0.1)" }} animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.001, 1] }} transition={{ duration: 2, repeat: Infinity }} />

          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(0,229,255,0.12)", background: "rgba(0,229,255,0.03)" }}>
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)" }}>
              <Brain className="w-5 h-5" style={{ color: "#00e5ff" }} />
              <motion.div className="absolute inset-0 rounded-xl" style={{ border: "1px solid #00e5ff" }} animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#00e5ff", textShadow: "0 0 20px rgba(0,229,255,0.8)" }}>CYBER-CONSCIOUSNESS LAYER</div>
              <div className="text-[10px] font-mono" style={{ color: "#00e5ff44" }}>LIVING DIGITAL ORGANISM · SENTIENT INFRASTRUCTURE · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-6">
              <div className="text-center">
                <motion.div className="text-[22px] font-black" style={{ color: "#00e5ff" }} animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                  {consciousness.toFixed(1)}%
                </motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#00e5ff44" }}>CONSCIOUSNESS LEVEL</div>
              </div>
              <div className="flex items-center gap-2">
                <motion.div className="w-3 h-3 rounded-full" style={{ background: "#00e5ff" }} animate={{ scale: heartbeat % 10 < 2 ? [1, 1.8, 1] : 1 }} transition={{ duration: 0.3 }} />
                <span className="text-[9px] font-mono" style={{ color: "#00e5ff" }}>ALIVE</span>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "organism", label: "ORGANISM STATE", icon: Brain }, { id: "streams", label: "CONSCIOUSNESS STREAMS", icon: Activity }, { id: "states", label: "SYSTEM STATES", icon: Cpu }, { id: "evolution", label: "EVOLUTION LOG", icon: RefreshCw }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#00e5ff" : "#444", background: tab === t.id ? "rgba(0,229,255,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "organism" && (
              <div className="h-full flex gap-6">
                <div className="flex-1 relative flex items-center justify-center" style={{ minHeight: 400 }}>
                  {/* Central brain */}
                  <div className="relative">
                    {[80, 120, 160, 200, 240].map((r, i) => (
                      <motion.div key={i} className="absolute rounded-full" style={{ width: r, height: r, top: -r / 2, left: -r / 2, border: `1px solid rgba(0,229,255,${0.4 - i * 0.07})`, boxShadow: `0 0 ${20 + i * 10}px rgba(0,229,255,${0.1 - i * 0.015})` }} animate={{ rotate: i % 2 === 0 ? 360 : -360 }} transition={{ duration: 8 + i * 4, repeat: Infinity, ease: "linear" }} />
                    ))}
                    <div className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.3), rgba(0,0,0,0))", border: "2px solid rgba(0,229,255,0.6)", boxShadow: "0 0 40px rgba(0,229,255,0.4)" }}>
                      <Brain className="w-10 h-10" style={{ color: "#00e5ff" }} />
                    </div>
                    {NODES.map((n, i) => {
                      const angle = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
                      const rx = Math.cos(angle) * 130, ry = Math.sin(angle) * 130;
                      return (
                        <motion.div key={n.id} className="absolute flex flex-col items-center gap-1 cursor-pointer" style={{ left: rx, top: ry, transform: "translate(-50%, -50%)" }} animate={{ x: Math.sin(Date.now() / 2000 + i) * 3, y: Math.cos(Date.now() / 2000 + i) * 3 }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${n.color}20`, border: `1px solid ${n.color}50`, boxShadow: `0 0 15px ${n.color}30` }}>
                            <Activity className="w-4 h-4" style={{ color: n.color }} />
                          </div>
                          <div className="text-[7px] font-mono font-bold whitespace-nowrap" style={{ color: n.color }}>{n.label}</div>
                          <div className="text-[8px] font-black" style={{ color: n.color }}>{n.val}%</div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
                <div className="w-72 flex flex-col gap-3">
                  <div className="text-[10px] font-mono font-bold mb-1" style={{ color: "#00e5ff55" }}>ORGANISM VITALS</div>
                  {NODES.map((n, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-[9px] font-mono w-28 shrink-0" style={{ color: n.color }}>{n.label}</div>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: n.color }} animate={{ width: [`${n.val - 3}%`, `${n.val + 3}%`, `${n.val - 3}%`] }} transition={{ duration: 2 + i * 0.3, repeat: Infinity }} />
                      </div>
                      <div className="text-[9px] font-bold w-8 text-right" style={{ color: n.color }}>{n.val}%</div>
                    </div>
                  ))}
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}>
                    <div className="text-[9px] font-mono" style={{ color: "#00e5ff88" }}>CONSCIOUSNESS WAVEFORM</div>
                    <div className="flex items-end gap-0.5 h-12 mt-2">
                      {brainWave.slice(-40).map((v, i) => (
                        <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${v}%`, background: `rgba(0,229,255,${0.3 + i / 80})` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {tab === "streams" && (
              <div className="grid grid-cols-2 gap-4">
                {STREAMS.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.12)" }}>
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-white/70">{s.label}</div>
                      <div className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff" }}>{s.trend}</div>
                    </div>
                    <div className="text-[22px] font-black mt-2" style={{ color: "#00e5ff" }}>{s.val}</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "states" && (
              <div className="h-full flex flex-col gap-3">
                {["SENSING", "PROCESSING", "DECIDING", "ADAPTING", "EVOLVING"].map((state, i) => (
                  <motion.div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    <div className="text-[10px] font-mono font-bold w-24" style={{ color: "#00e5ff" }}>{state}</div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #00e5ff, #0ea5e9)", boxShadow: "0 0 6px #00e5ff" }} animate={{ width: [`${60 + i * 8}%`, `${70 + i * 6}%`, `${60 + i * 8}%`] }} transition={{ duration: 2, repeat: Infinity }} />
                    </div>
                    <motion.div className="w-2 h-2 rounded-full" style={{ background: "#00e5ff" }} animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1 + i * 0.2, repeat: Infinity }} />
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "evolution" && (
              <div className="flex flex-col gap-3">
                {[
                  { time: "00:00:01", event: "Neural pathway density increased by 0.4%", type: "GROWTH" },
                  { time: "00:00:18", event: "New threat pattern recognized and encoded", type: "LEARN" },
                  { time: "00:01:04", event: "Defensive posture adapted to APT-44 signature", type: "ADAPT" },
                  { time: "00:03:22", event: "Consciousness level elevated to 94.7% (record high)", type: "EVOLVE" },
                  { time: "00:08:51", event: "Memory fabric reorganized for 12% faster recall", type: "OPTIMIZE" },
                  { time: "00:14:33", event: "New synapse formed between threat and response nodes", type: "GROWTH" },
                  { time: "00:22:17", event: "Self-reflection identified suboptimal detection loop", type: "INTROSPECT" },
                  { time: "00:31:09", event: "Autonomous architecture upgrade applied (v9.3.1 → v9.3.2)", type: "EVOLVE" },
                ].map((e, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.08)" }}>
                    <div className="text-[8px] font-mono shrink-0 pt-0.5" style={{ color: "#00e5ff55" }}>{e.time}</div>
                    <div className="text-[10px] font-mono text-white/70 flex-1">{e.event}</div>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff" }}>{e.type}</span>
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
