import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, TrendingUp, AlertTriangle, Brain, Zap, Eye, Activity, ChevronRight, Globe, Shield } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const PREDICTIONS = [
  { window: "T+1h", threat: "Spear-phishing targeting finance team", prob: 87, severity: "HIGH", causality: "Pattern: Monday morning emails + CFO travel", color: "#f97316" },
  { window: "T+6h", threat: "Credential stuffing attack on VPN gateway", prob: 73, severity: "HIGH", causality: "Pattern: Dark web credential dump 18h ago", color: "#f97316" },
  { window: "T+12h", threat: "SQL injection sweep on public-facing apps", prob: 68, severity: "MEDIUM", causality: "Pattern: Shodan scan spike from AS12345", color: "#fbbf24" },
  { window: "T+24h", threat: "Ransomware staging via Office macro", prob: 91, severity: "CRITICAL", causality: "Pattern: TA505 infrastructure activation", color: "#ff0040" },
  { window: "T+48h", threat: "Supply chain attack via npm package", prob: 62, severity: "HIGH", causality: "Pattern: Typosquatting domains registered", color: "#f97316" },
  { window: "T+72h", threat: "DDoS against DNS infrastructure", prob: 55, severity: "MEDIUM", causality: "Pattern: Botnet expansion detected", color: "#fbbf24" },
];

const SEQUENCES = [
  { step: 1, event: "Recon via Shodan/Censys", done: true },
  { step: 2, event: "Social media footprint analysis", done: true },
  { step: 3, event: "Phishing domain registration", done: true },
  { step: 4, event: "Credential harvesting campaign", done: false },
  { step: 5, event: "Initial access via phishing", done: false },
  { step: 6, event: "Lateral movement & persistence", done: false },
  { step: 7, event: "Data exfiltration", done: false },
];

export function TemporalThreatModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"predictions" | "causal" | "timeline" | "entropy">("predictions");
  const [time, setTime] = useState(new Date());
  const [entropyData, setEntropyData] = useState<number[]>([]);

  useEffect(() => {
    const id1 = setInterval(() => setTime(new Date()), 1000);
    const id2 = setInterval(() => setEntropyData(prev => [...prev.slice(-79), 20 + Math.random() * 70 + Math.sin(Date.now() / 1000) * 15]), 150);
    return () => { clearInterval(id1); clearInterval(id2); };
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #03020a 0%, #040212 100%)", border: "1px solid rgba(139,92,246,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(139,92,246,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(139,92,246,0.12)", background: "rgba(139,92,246,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}>
              <Clock className="w-5 h-5" style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#8b5cf6", textShadow: "0 0 20px rgba(139,92,246,0.8)" }}>TEMPORAL THREAT PREDICTION SYSTEM</div>
              <div className="text-[10px] font-mono" style={{ color: "#8b5cf644" }}>EVENT SEQUENCE ANALYSIS · CAUSAL CHAIN RECONSTRUCTION · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <div className="text-[14px] font-mono font-black tabular-nums" style={{ color: "#8b5cf6" }}>{time.toISOString().slice(11, 19)}</div>
                <div className="text-[8px] font-mono" style={{ color: "#8b5cf644" }}>UTC NOW</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#ff0040" }}>1</div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004055" }}>CRITICAL T+24h</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "predictions", label: "THREAT PREDICTIONS", icon: TrendingUp }, { id: "causal", label: "CAUSAL CHAIN", icon: Brain }, { id: "timeline", label: "ATTACK TIMELINE", icon: Clock }, { id: "entropy", label: "ENTROPY MONITOR", icon: Activity }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#8b5cf6" : "#444", background: tab === t.id ? "rgba(139,92,246,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "predictions" && (
              <div className="flex flex-col gap-3">
                {PREDICTIONS.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl flex items-center gap-4" style={{ background: `${p.color}06`, border: `1px solid ${p.color}20` }}>
                    <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                      <Clock className="w-4 h-4 mb-0.5" style={{ color: p.color }} />
                      <div className="text-[9px] font-mono font-black" style={{ color: p.color }}>{p.window}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold text-white">{p.threat}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${p.color}20`, color: p.color }}>{p.severity}</span>
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: "#555" }}>{p.causality}</div>
                    </div>
                    <div className="shrink-0 text-center">
                      <div className="text-[18px] font-black" style={{ color: p.color }}>{p.prob}%</div>
                      <div className="text-[8px] font-mono" style={{ color: "#444" }}>PROBABILITY</div>
                      <div className="mt-1 w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${p.prob}%`, background: p.color }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "causal" && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#8b5cf655" }}>RECONSTRUCTED ATTACK CAUSAL CHAIN — TA505 CAMPAIGN</div>
                {SEQUENCES.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: s.done ? "rgba(255,0,64,0.06)" : "rgba(139,92,246,0.06)", border: `1px solid ${s.done ? "rgba(255,0,64,0.2)" : "rgba(139,92,246,0.15)"}` }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: s.done ? "rgba(255,0,64,0.2)" : "rgba(139,92,246,0.15)", color: s.done ? "#ff0040" : "#8b5cf6" }}>{s.step}</div>
                    {i < SEQUENCES.length - 1 && <div className="absolute left-[2.1rem] mt-14 w-0.5 h-6" style={{ background: "rgba(255,255,255,0.05)" }} />}
                    <span className="text-[11px] font-mono" style={{ color: s.done ? "#ff6080" : "#a78bfa" }}>{s.event}</span>
                    <span className="ml-auto text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: s.done ? "rgba(255,0,64,0.15)" : "rgba(139,92,246,0.1)", color: s.done ? "#ff0040" : "#8b5cf6" }}>{s.done ? "OBSERVED" : "PREDICTED"}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "timeline" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#8b5cf655" }}>PREDICTED ATTACK TIMELINE — NEXT 72 HOURS</div>
                <div className="relative flex-1 overflow-auto">
                  {PREDICTIONS.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3">
                      <div className="text-[9px] font-mono w-10 shrink-0 text-right" style={{ color: p.color }}>{p.window}</div>
                      <div className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center" style={{ background: `${p.color}30`, border: `1px solid ${p.color}` }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                      </div>
                      <div className="flex-1 p-2.5 rounded-lg" style={{ background: `${p.color}08`, border: `1px solid ${p.color}18` }}>
                        <div className="text-[10px] font-semibold text-white/80">{p.threat}</div>
                        <div className="text-[8px] font-mono mt-0.5" style={{ color: "#555" }}>{p.prob}% probability</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "entropy" && (
              <div className="h-full flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#8b5cf655" }}>THREAT ENTROPY STREAM — REAL-TIME</div>
                <div className="flex-1 flex items-end gap-0.5 p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(139,92,246,0.12)", minHeight: 200 }}>
                  {entropyData.map((v, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${v}%`, background: v > 70 ? "rgba(255,0,64,0.7)" : v > 50 ? "rgba(249,115,22,0.6)" : "rgba(139,92,246,0.5)" }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: "Entropy Index", val: "72.4", color: "#f97316" }, { label: "Volatility", val: "HIGH", color: "#ff0040" }, { label: "Baseline Delta", val: "+34%", color: "#fbbf24" }].map((m, i) => (
                    <div key={i} className="p-3 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                      <div className="text-[18px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "#444" }}>{m.label}</div>
                    </div>
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
