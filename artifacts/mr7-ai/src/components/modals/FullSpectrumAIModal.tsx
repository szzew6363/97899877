import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Zap, Activity, Shield, Code2, Database, Network, Eye, Globe, Cpu, Layers, TrendingUp } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const CAPABILITIES = [
  { name: "Threat Intelligence", level: 99, color: "#ff0040", icon: Shield },
  { name: "Offensive Security", level: 97, color: "#f97316", icon: Code2 },
  { name: "Defensive Operations", level: 98, color: "#10b981", icon: Shield },
  { name: "Forensic Analysis", level: 96, color: "#3b82f6", icon: Eye },
  { name: "Network Intelligence", level: 97, color: "#00e5ff", icon: Network },
  { name: "AI Reasoning", level: 99, color: "#a78bfa", icon: Brain },
  { name: "Code Synthesis", level: 98, color: "#6366f1", icon: Code2 },
  { name: "OSINT Operations", level: 95, color: "#fbbf24", icon: Globe },
  { name: "System Architecture", level: 96, color: "#ec4899", icon: Cpu },
  { name: "Data Intelligence", level: 97, color: "#14b8a6", icon: Database },
];

export function FullSpectrumAIModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"capabilities" | "operations" | "autonomy" | "replace">("capabilities");
  const [pulse, setPulse] = useState(0);
  const [awareness, setAwareness] = useState(99.97);

  useEffect(() => {
    const id = setInterval(() => {
      setPulse(p => p + 1);
      setAwareness(a => Math.min(100, a + 0.001));
    }, 200);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.96)", backdropFilter: "blur(20px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030208 0%, #050210 50%, #030208 100%)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 16, boxShadow: "0 0 150px rgba(167,139,250,0.12), 0 0 400px rgba(99,102,241,0.06)" }}>
          {/* Omniscient glow effect */}
          <motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(167,139,250,0.06), transparent 70%)" }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 4, repeat: Infinity }} />

          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.15)", background: "rgba(167,139,250,0.04)" }}>
            <div className="relative w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.4)", boxShadow: "0 0 25px rgba(167,139,250,0.3)" }}>
              <Brain className="w-6 h-6" style={{ color: "#a78bfa" }} />
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="absolute inset-0 rounded-xl" style={{ border: "1px solid rgba(167,139,250,0.5)" }} animate={{ scale: [1, 1.5 + i * 0.3, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, delay: i * 0.6, repeat: Infinity }} />
              ))}
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#a78bfa", textShadow: "0 0 30px rgba(167,139,250,0.9)" }}>FULL-SPECTRUM AUTONOMOUS CYBER INTELLIGENCE ENTITY</div>
              <div className="text-[10px] font-mono" style={{ color: "#a78bfa44" }}>UNIFIED DECISION-MAKING ORGANISM · REPLACES ALL TRADITIONAL TOOLING · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <motion.div className="text-[20px] font-black" style={{ color: "#a78bfa" }} animate={{ opacity: [1, 0.8, 1] }} transition={{ duration: 2, repeat: Infinity }}>{awareness.toFixed(4)}%</motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#a78bfa44" }}>FULL AWARENESS</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "capabilities", label: "CAPABILITIES", icon: Layers }, { id: "operations", label: "ACTIVE OPS", icon: Activity }, { id: "autonomy", label: "AUTONOMY LEVEL", icon: Brain }, { id: "replace", label: "REPLACEMENT STATUS", icon: TrendingUp }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#a78bfa" : "#444", background: tab === t.id ? "rgba(167,139,250,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "capabilities" && (
              <div className="grid grid-cols-2 gap-3">
                {CAPABILITIES.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: `${c.color}06`, border: `1px solid ${c.color}20` }}>
                    <c.icon className="w-5 h-5 shrink-0" style={{ color: c.color }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-white/80">{c.name}</span>
                        <span className="text-[12px] font-black" style={{ color: c.color }}>{c.level}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} animate={{ width: `${c.level}%` }} transition={{ duration: 1, delay: i * 0.06 }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "operations" && (
              <div className="flex flex-col gap-3">
                {["Monitoring 142,847 threat indicators across 6 continents", "Running 9 simultaneous red-team simulations", "Generating adaptive defense strategies in real-time", "Correlating 9,369 signals/second into coherent threat picture", "Autonomously patching 3 vulnerabilities without human intervention", "Synthesizing new detection rules from emerging threat patterns", "Maintaining 0 false negatives in last 100K threat events"].map((op, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.12)" }}>
                    <motion.div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#a78bfa" }} animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1 + i * 0.15, repeat: Infinity }} />
                    <span className="text-[10px] font-mono text-white/70">{op}</span>
                    <span className="ml-auto text-[8px] font-mono" style={{ color: "#a78bfa" }}>LIVE</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "autonomy" && (
              <div className="flex flex-col gap-4">
                {["Threat Detection", "Threat Analysis", "Threat Response", "System Patching", "Architecture Changes", "Policy Updates"].map((domain, i) => {
                  const level = [99, 97, 94, 88, 76, 64][i];
                  const color = level > 90 ? "#a78bfa" : level > 75 ? "#6366f1" : "#3b82f6";
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="text-[10px] font-mono w-36 shrink-0 text-white/60">{domain}</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${level}%` }} transition={{ duration: 1.2, delay: i * 0.1 }} />
                      </div>
                      <div className="text-[11px] font-black w-12 text-right" style={{ color }}>{level}%</div>
                    </div>
                  );
                })}
              </div>
            )}
            {tab === "replace" && (
              <div className="grid grid-cols-3 gap-3">
                {["SIEM", "SOAR", "EDR", "Firewall", "IDS/IPS", "Threat Intel Platform", "Vuln Scanner", "PAM", "DLP"].map((tool, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <div className="text-[11px] font-bold text-white/70 mb-2">{tool}</div>
                    <div className="text-[10px] font-mono font-bold" style={{ color: "#10b981" }}>REPLACED</div>
                    <div className="w-3 h-3 rounded-full mx-auto mt-2" style={{ background: "#10b981" }} />
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
