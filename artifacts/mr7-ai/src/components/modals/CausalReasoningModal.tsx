import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitBranch, Brain, Search, Eye, ChevronRight, AlertTriangle, Clock, Shield, Activity, Zap } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const INCIDENTS = [
  {
    id: "POST-MORTEM-3091-0042",
    name: "Ransomware Deployment — ServerCluster-A",
    rootCause: "Unpatched SMB vulnerability (CVE-3090-8841) exploited via phishing email 3 days prior",
    causalChain: [
      { event: "User clicked phishing email attachment (14:02:07)", type: "INITIATING" },
      { event: "Word macro executed — dropped loader (14:02:11)", type: "PROPAGATION" },
      { event: "LSASS memory dumped — credentials extracted (14:02:44)", type: "PROPAGATION" },
      { event: "Lateral movement via SMB relay (14:03:18)", type: "PROPAGATION" },
      { event: "Admin share mounted on ServerCluster-A (14:04:02)", type: "PROPAGATION" },
      { event: "Ransomware payload dropped & executed (14:04:15)", type: "IMPACT" },
    ],
    counterfactuals: [
      "If MFA had been enforced: credential theft would not have enabled lateral movement",
      "If patched: SMB relay attack vector would not have existed",
      "If EDR alert was not suppressed: initial loader would have been blocked",
    ],
    color: "#ff0040",
  },
];

export function CausalReasoningModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"causal" | "counterfactual" | "prevention" | "graph">("causal");
  const [selected, setSelected] = useState(0);

  if (!open) return null;

  const inc = INCIDENTS[selected];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full w-full h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030508 0%, #040310 100%)", border: "1px solid rgba(139,92,246,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(139,92,246,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(139,92,246,0.12)", background: "rgba(139,92,246,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
              <GitBranch className="w-5 h-5" style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#8b5cf6", textShadow: "0 0 20px rgba(139,92,246,0.8)" }}>SYSTEM-WIDE CAUSAL REASONING ENGINE</div>
              <div className="text-[10px] font-mono" style={{ color: "#8b5cf644" }}>ROOT CAUSE ANALYSIS · COUNTERFACTUAL SIMULATION · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "causal", label: "CAUSAL CHAIN", icon: GitBranch }, { id: "counterfactual", label: "COUNTERFACTUALS", icon: Brain }, { id: "prevention", label: "PREVENTION PATHS", icon: Shield }, { id: "graph", label: "CAUSAL GRAPH", icon: Activity }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#8b5cf6" : "#444", background: tab === t.id ? "rgba(139,92,246,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "causal" && (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl" style={{ background: "rgba(255,0,64,0.06)", border: "1px solid rgba(255,0,64,0.2)" }}>
                  <div className="text-[12px] font-bold text-white mb-1">{inc.name}</div>
                  <div className="text-[9px] font-mono" style={{ color: "#555" }}>{inc.id}</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#8b5cf6" }}>ROOT CAUSE</div>
                  <div className="text-[11px] font-mono text-white/80">{inc.rootCause}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold mb-3" style={{ color: "#8b5cf655" }}>CAUSAL CHAIN RECONSTRUCTION</div>
                  {inc.causalChain.map((c, i) => {
                    const typeColor = c.type === "INITIATING" ? "#ff0040" : c.type === "IMPACT" ? "#f97316" : "#8b5cf6";
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-3 mb-2">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-3 h-3 rounded-full" style={{ background: typeColor }} />
                          {i < inc.causalChain.length - 1 && <div className="w-0.5 h-8 mt-0.5" style={{ background: "rgba(139,92,246,0.2)" }} />}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="text-[10px] font-mono text-white/70">{c.event}</div>
                          <span className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${typeColor}20`, color: typeColor }}>{c.type}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
            {tab === "counterfactual" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#8b5cf655" }}>COUNTERFACTUAL ANALYSIS — WHAT IF SIMULATIONS</div>
                {inc.counterfactuals.map((cf, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <Brain className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#8b5cf6" }} />
                    <span className="text-[11px] font-mono text-white/70">{cf}</span>
                  </motion.div>
                ))}
                <div className="p-4 rounded-xl mt-2" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#10b981" }}>OPTIMAL PREVENTION PATH</div>
                  <div className="text-[10px] font-mono text-white/60">Enforcing MFA (impact: -94% attack success) combined with SMB patching (impact: -87%) would have prevented this incident with 99.2% probability.</div>
                </div>
              </div>
            )}
            {tab === "prevention" && (
              <div className="flex flex-col gap-3">
                {["Enforce MFA across all privileged accounts (impact: -94% attack success)", "Patch CVE-3090-8841 on all Windows systems (impact: -87%)", "Re-enable EDR real-time protection (was suppressed) (impact: -91%)", "Email attachment sandboxing for Office documents (impact: -78%)", "Network segmentation preventing SMB lateral movement (impact: -82%)"].map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <Shield className="w-4 h-4 shrink-0" style={{ color: "#10b981" }} />
                    <span className="flex-1 text-[10px] font-mono text-white/70">{p}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "graph" && (
              <div className="h-full relative rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(139,92,246,0.12)", minHeight: 400 }}>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet">
                  {inc.causalChain.map((c, i) => {
                    const x = 20 + i * 30, y = 60 + Math.sin(i) * 20;
                    const nx = x + 30, ny = 60 + Math.sin(i + 1) * 20;
                    const color = c.type === "INITIATING" ? "#ff0040" : c.type === "IMPACT" ? "#f97316" : "#8b5cf6";
                    return (
                      <g key={i}>
                        {i < inc.causalChain.length - 1 && <motion.line x1={x} y1={y} x2={nx} y2={ny} stroke={color} strokeWidth="0.8" strokeOpacity="0.5" animate={{ strokeOpacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }} />}
                        <circle cx={x} cy={y} r="5" fill={color} fillOpacity="0.8" />
                        <text x={x} y={y + 10} textAnchor="middle" fill={color} fontSize="4" fontFamily="monospace" opacity="0.7">{c.type.slice(0, 6)}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
