import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, AlertTriangle, Brain, Shield, Globe, Activity, Network, Eye, Zap, TrendingUp } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const CORRELATIONS = [
  { id: "C-001", domains: ["Security Event", "Media Activity", "Financial Pattern"], threatLevel: 94, summary: "Nation-state actor correlating market crash with infrastructure probe", color: "#ff0040" },
  { id: "C-002", domains: ["Behavioral Anomaly", "Network Traffic", "User Identity"], threatLevel: 88, summary: "Insider threat: unusual access patterns matching data exfiltration behavior", color: "#f97316" },
  { id: "C-003", domains: ["AI Output", "System Behavior", "API Usage"], threatLevel: 79, summary: "Possible AI model manipulation via coordinated adversarial inputs", color: "#fbbf24" },
  { id: "C-004", domains: ["Physical Security", "Digital Access", "Time Pattern"], threatLevel: 91, summary: "Hybrid attack: physical badge access correlated with digital intrusion", color: "#ff0040" },
];

export function CrossDomainRiskModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"correlations" | "domains" | "graph" | "risk">("correlations");
  const [selected, setSelected] = useState(0);

  if (!open) return null;

  const sel = CORRELATIONS[selected];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030508 0%, #050310 100%)", border: "1px solid rgba(14,165,233,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(14,165,233,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(14,165,233,0.12)", background: "rgba(14,165,233,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.4)" }}>
              <Link2 className="w-5 h-5" style={{ color: "#0ea5e9" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#0ea5e9", textShadow: "0 0 20px rgba(14,165,233,0.8)" }}>CROSS-DOMAIN RISK CORRELATION ENGINE</div>
              <div className="text-[10px] font-mono" style={{ color: "#0ea5e944" }}>MULTI-SIGNAL THREAT FUSION · COMPLEX ATTACK DETECTION · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#ff0040" }}>4</div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004055" }}>CORRELATIONS</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "correlations", label: "CORRELATIONS", icon: Link2 }, { id: "domains", label: "SIGNAL DOMAINS", icon: Globe }, { id: "graph", label: "CORRELATION GRAPH", icon: Network }, { id: "risk", label: "RISK MATRIX", icon: AlertTriangle }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#0ea5e9" : "#444", background: tab === t.id ? "rgba(14,165,233,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "correlations" && (
              <div className="flex gap-5 h-full">
                <div className="w-72 shrink-0 flex flex-col gap-2">
                  {CORRELATIONS.map((c, i) => (
                    <button key={i} onClick={() => setSelected(i)} className="text-left p-3 rounded-xl transition-all" style={{ background: selected === i ? `${c.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${selected === i ? c.color + "35" : "rgba(255,255,255,0.06)"}` }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[8px] font-mono" style={{ color: c.color }}>{c.id}</span>
                        <span className="text-[9px] font-black ml-auto" style={{ color: c.color }}>{c.threatLevel}%</span>
                      </div>
                      <div className="text-[9px] font-mono text-white/60 mb-1">{c.domains.join(" + ")}</div>
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-5 rounded-xl" style={{ background: `${sel.color}06`, border: `1px solid ${sel.color}22` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <Link2 className="w-8 h-8" style={{ color: sel.color }} />
                    <div>
                      <div className="text-[14px] font-bold text-white">{sel.id}</div>
                      <div className="text-[11px] font-mono mt-0.5" style={{ color: sel.color }}>{sel.summary}</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-[9px] font-mono mb-2" style={{ color: "#555" }}>CORRELATED DOMAINS</div>
                    <div className="flex gap-2 flex-wrap">
                      {sel.domains.map((d, i) => (
                        <span key={i} className="text-[9px] font-mono px-2 py-1 rounded-lg" style={{ background: `${sel.color}15`, color: sel.color, border: `1px solid ${sel.color}30` }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono mb-1" style={{ color: "#555" }}>THREAT LEVEL</div>
                    <div className="text-[28px] font-black" style={{ color: sel.color }}>{sel.threatLevel}%</div>
                    <div className="w-full h-2 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: sel.color }} initial={{ width: 0 }} animate={{ width: `${sel.threatLevel}%` }} transition={{ duration: 1 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {tab === "domains" && (
              <div className="grid grid-cols-3 gap-4">
                {["Security Events", "Network Traffic", "User Behavior", "Media/OSINT", "Physical Access", "AI System Outputs", "Financial Patterns", "Time Correlations", "API Activity"].map((domain, i) => {
                  const colors = ["#ff0040", "#f97316", "#fbbf24", "#10b981", "#3b82f6", "#a78bfa", "#0ea5e9", "#ec4899", "#00e5ff"];
                  return (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }} className="p-4 rounded-xl flex items-center gap-3" style={{ background: `${colors[i]}08`, border: `1px solid ${colors[i]}20` }}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: colors[i] }} />
                      <span className="text-[11px] font-semibold text-white/80">{domain}</span>
                      <span className="ml-auto text-[9px] font-mono font-bold" style={{ color: colors[i] }}>LIVE</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {tab === "graph" && (
              <div className="h-full relative rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(14,165,233,0.12)", minHeight: 400 }}>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                  {CORRELATIONS.map((c, i) => {
                    const cx = 20 + (i % 2) * 60, cy = 20 + Math.floor(i / 2) * 60;
                    return (
                      <g key={i}>
                        {c.domains.map((d, j) => {
                          const dx = cx + Math.cos(j * Math.PI * 2 / c.domains.length) * 18;
                          const dy = cy + Math.sin(j * Math.PI * 2 / c.domains.length) * 18;
                          return (
                            <g key={j}>
                              <motion.line x1={cx} y1={cy} x2={dx} y2={dy} stroke={c.color} strokeWidth="0.5" strokeOpacity="0.5" animate={{ strokeOpacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, delay: j * 0.3, repeat: Infinity }} />
                              <circle cx={dx} cy={dy} r="3" fill={c.color} fillOpacity="0.6" />
                              <text x={dx} y={dy + 6} textAnchor="middle" fill={c.color} fontSize="3.5" fontFamily="monospace" opacity="0.8">{d.split(" ")[0]}</text>
                            </g>
                          );
                        })}
                        <circle cx={cx} cy={cy} r="5" fill={c.color} fillOpacity="0.9" />
                        <text x={cx} y={cy - 7} textAnchor="middle" fill={c.color} fontSize="3.5" fontFamily="monospace">{c.id}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
            {tab === "risk" && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Critical Correlations", val: "2", color: "#ff0040" },
                  { label: "High Risk Correlations", val: "1", color: "#f97316" },
                  { label: "Domains Monitored", val: "9", color: "#0ea5e9" },
                  { label: "Signals Processed/s", val: "142K", color: "#a78bfa" },
                  { label: "False Positive Rate", val: "0.4%", color: "#10b981" },
                  { label: "Detection Coverage", val: "98.1%", color: "#10b981" },
                ].map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-5 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}22` }}>
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
