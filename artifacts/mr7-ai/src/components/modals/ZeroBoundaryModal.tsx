import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Brain, Shield, Code2, Database, Globe, Search, Zap, Network, Activity, Cpu } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const DOMAINS = [
  { id: "security", label: "Cybersecurity", icon: Shield, color: "#ff0040", ops: 4821, synergy: 94 },
  { id: "softeng", label: "Software Engineering", icon: Code2, color: "#3b82f6", ops: 7234, synergy: 88 },
  { id: "datascience", label: "Data Science", icon: Database, color: "#10b981", ops: 5912, synergy: 91 },
  { id: "reverseeng", label: "Reverse Engineering", icon: Cpu, color: "#f97316", ops: 3401, synergy: 87 },
  { id: "network", label: "Network Intelligence", icon: Network, color: "#a78bfa", ops: 6103, synergy: 93 },
  { id: "osint", label: "OSINT & Recon", icon: Search, color: "#00e5ff", ops: 2847, synergy: 85 },
];

const CONNECTIONS = [
  { from: "security", to: "reverseeng", strength: 97, label: "Exploit chain analysis" },
  { from: "softeng", to: "security", strength: 91, label: "Secure code generation" },
  { from: "datascience", to: "security", strength: 89, label: "Anomaly detection models" },
  { from: "osint", to: "security", strength: 88, label: "Threat actor profiling" },
  { from: "network", to: "security", strength: 93, label: "Traffic pattern analysis" },
];

export function ZeroBoundaryModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"mesh" | "domains" | "synergy" | "fusion">("mesh");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(20px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030508 0%, #050310 100%)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 16, boxShadow: "0 0 120px rgba(251,191,36,0.08)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(251,191,36,0.12)", background: "rgba(251,191,36,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)" }}>
              <Layers className="w-5 h-5" style={{ color: "#fbbf24" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#fbbf24", textShadow: "0 0 20px rgba(251,191,36,0.8)" }}>ZERO-BOUNDARY INTELLIGENCE MESH</div>
              <div className="text-[10px] font-mono" style={{ color: "#fbbf2444" }}>UNIFIED COGNITIVE SYSTEM · NO DOMAIN SEPARATION · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#fbbf24" }}>6</div>
                <div className="text-[8px] font-mono" style={{ color: "#fbbf2455" }}>DOMAINS MERGED</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "mesh", label: "INTELLIGENCE MESH", icon: Network }, { id: "domains", label: "DOMAIN FUSION", icon: Layers }, { id: "synergy", label: "CROSS-DOMAIN SYNERGY", icon: Zap }, { id: "fusion", label: "UNIFIED COGNITION", icon: Brain }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#fbbf24" : "#444", background: tab === t.id ? "rgba(251,191,36,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "mesh" && (
              <div className="h-full flex gap-5">
                <div className="flex-1 relative rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(251,191,36,0.1)", minHeight: 400 }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet">
                    {DOMAINS.flatMap((d, i) => DOMAINS.slice(i + 1).map((d2, j) => (
                      <motion.line key={`${i}-${j}`} x1={30 + (i % 3) * 70} y1={40 + Math.floor(i / 3) * 80} x2={30 + (DOMAINS.indexOf(d2) % 3) * 70} y2={40 + Math.floor(DOMAINS.indexOf(d2) / 3) * 80} stroke="rgba(251,191,36,0.25)" strokeWidth="0.8" animate={{ strokeOpacity: [0.15, 0.5, 0.15] }} transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }} />
                    )))}
                    {DOMAINS.map((d, i) => {
                      const x = 30 + (i % 3) * 70, y = 40 + Math.floor(i / 3) * 80;
                      return (
                        <g key={d.id} onClick={() => setActiveDomain(activeDomain === d.id ? null : d.id)} style={{ cursor: "pointer" }}>
                          <motion.circle cx={x} cy={y} r="8" fill={d.color} fillOpacity="0.3" stroke={d.color} strokeWidth="0.8" animate={{ r: [7, 9, 7] }} transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }} />
                          <text x={x} y={y + 14} textAnchor="middle" fill={d.color} fontSize="5" fontFamily="monospace">{d.label}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="w-64 flex flex-col gap-2">
                  {DOMAINS.map((d, i) => (
                    <motion.div key={i} onClick={() => setActiveDomain(activeDomain === d.id ? null : d.id)} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="p-3 rounded-xl cursor-pointer transition-all" style={{ background: activeDomain === d.id ? `${d.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${activeDomain === d.id ? d.color + "35" : "rgba(255,255,255,0.06)"}` }}>
                      <div className="flex items-center gap-2">
                        <d.icon className="w-4 h-4 shrink-0" style={{ color: d.color }} />
                        <div className="flex-1">
                          <div className="text-[10px] font-semibold text-white/80">{d.label}</div>
                          <div className="text-[8px] font-mono" style={{ color: "#444" }}>{d.ops.toLocaleString()} ops/s · Synergy: {d.synergy}%</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {tab === "domains" && (
              <div className="grid grid-cols-3 gap-4">
                {DOMAINS.map((d, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-5 rounded-xl" style={{ background: `${d.color}06`, border: `1px solid ${d.color}20` }}>
                    <d.icon className="w-7 h-7 mb-3" style={{ color: d.color }} />
                    <div className="text-[13px] font-bold mb-1" style={{ color: d.color }}>{d.label}</div>
                    <div className="text-[20px] font-black" style={{ color: d.color }}>{d.ops.toLocaleString()}</div>
                    <div className="text-[8px] font-mono mb-2" style={{ color: "#444" }}>OPS/SECOND</div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: d.color }} animate={{ width: `${d.synergy}%` }} />
                    </div>
                    <div className="text-[8px] font-mono mt-1" style={{ color: "#444" }}>SYNERGY {d.synergy}%</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "synergy" && (
              <div className="flex flex-col gap-3">
                {CONNECTIONS.map((c, i) => {
                  const from = DOMAINS.find(d => d.id === c.from)!;
                  const to = DOMAINS.find(d => d.id === c.to)!;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.12)" }}>
                      <div className="flex items-center gap-2">
                        <from.icon className="w-4 h-4" style={{ color: from.color }} />
                        <span className="text-[10px] font-bold" style={{ color: from.color }}>{from.label}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${from.color}, ${to.color})` }} />
                        <span className="text-[8px] font-mono" style={{ color: "#fbbf24" }}>{c.strength}%</span>
                        <div className="flex-1 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${from.color}, ${to.color})` }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <to.icon className="w-4 h-4" style={{ color: to.color }} />
                        <span className="text-[10px] font-bold" style={{ color: to.color }}>{to.label}</span>
                      </div>
                      <div className="ml-4 text-[9px] font-mono" style={{ color: "#555" }}>{c.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {tab === "fusion" && (
              <div className="flex flex-col items-center justify-center gap-6 h-full">
                <div className="relative">
                  {DOMAINS.map((d, i) => {
                    const angle = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2;
                    return (
                      <motion.div key={i} className="absolute w-12 h-12 rounded-xl flex items-center justify-center" style={{ left: Math.cos(angle) * 110 - 24, top: Math.sin(angle) * 110 - 24, background: `${d.color}15`, border: `1px solid ${d.color}40`, boxShadow: `0 0 15px ${d.color}30` }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}>
                        <d.icon className="w-5 h-5" style={{ color: d.color }} />
                      </motion.div>
                    );
                  })}
                  <motion.div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.3), rgba(0,0,0,0))", border: "2px solid rgba(251,191,36,0.5)", boxShadow: "0 0 40px rgba(251,191,36,0.3)" }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Brain className="w-10 h-10" style={{ color: "#fbbf24" }} />
                  </motion.div>
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-black" style={{ color: "#fbbf24" }}>UNIFIED COGNITIVE INTELLIGENCE</div>
                  <div className="text-[10px] font-mono mt-1" style={{ color: "#fbbf2466" }}>All 6 domains merged · No functional separation · Total awareness active</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
