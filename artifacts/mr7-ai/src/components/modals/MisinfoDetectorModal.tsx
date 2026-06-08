import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Search, Bot, AlertTriangle, TrendingUp, Network, Eye, Zap, Users, Radio, BarChart2, Hash, Activity } from "lucide-react";
import { useStore } from "@/lib/store";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const CAMPAIGNS = [
  { id: "C-001", name: "Operation Sandstorm Narrative", platform: "Twitter/X", bots: 1247, reach: "4.2M", confidence: 96, status: "ACTIVE", color: "#ff0040" },
  { id: "C-002", name: "Election Interference Wave", platform: "Telegram", bots: 892, reach: "2.8M", confidence: 91, status: "ACTIVE", color: "#ff0040" },
  { id: "C-003", name: "Economic Fear Campaign", platform: "Facebook", bots: 2341, reach: "8.7M", confidence: 88, status: "SPREADING", color: "#f97316" },
  { id: "C-004", name: "AI Safety Disinfo Thread", platform: "Reddit", bots: 156, reach: "0.6M", confidence: 79, status: "MONITORED", color: "#fbbf24" },
  { id: "C-005", name: "Scientific Doubt Injection", platform: "Multi-platform", bots: 3102, reach: "12.1M", confidence: 94, status: "ACTIVE", color: "#ff0040" },
];

const SIGNALS = [
  { label: "Coordinated Inauthentic Behavior", score: 94 },
  { label: "Bot Network Detection", score: 88 },
  { label: "Narrative Amplification Pattern", score: 92 },
  { label: "Account Age Anomaly", score: 76 },
  { label: "Cross-Platform Synchronization", score: 85 },
  { label: "Linguistic Fingerprint Match", score: 79 },
];

export function MisinfoDetectorModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"campaigns" | "botnet" | "signals" | "graph">("campaigns");
  const [graphNodes] = useState(() => Array.from({ length: 40 }, (_, i) => ({
    x: Math.random() * 100, y: Math.random() * 100, r: Math.random() * 8 + 3, isBot: Math.random() > 0.4, color: Math.random() > 0.4 ? "#ff0040" : "#a78bfa",
  })));
  const [pulsing, setPulsing] = useState(0);
  useEffect(() => { const id = setInterval(() => setPulsing(p => (p + 1) % 40), 200); return () => clearInterval(id); }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030208 0%, #020310 50%, #030208 100%)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 16, boxShadow: "0 0 120px rgba(99,102,241,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(99,102,241,0.15)", background: "rgba(99,102,241,0.04)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}>
              <Globe className="w-5 h-5" style={{ color: "#6366f1" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#6366f1", textShadow: "0 0 20px rgba(99,102,241,0.8)" }}>MISINFORMATION DETECTION SYSTEM</div>
              <div className="text-[10px] font-mono" style={{ color: "#6366f144" }}>INFLUENCE OPERATIONS TRACKER · BOT NETWORK ANALYZER · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-center">
                <motion.div className="text-[20px] font-black" style={{ color: "#ff0040" }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1, repeat: Infinity }}>5</motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004066" }}>ACTIVE CAMPAIGNS</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "campaigns", label: "CAMPAIGNS", icon: Radio }, { id: "botnet", label: "BOT NETWORKS", icon: Bot }, { id: "signals", label: "DETECTION SIGNALS", icon: Activity }, { id: "graph", label: "INFLUENCE GRAPH", icon: Network }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#6366f1" : "#444", background: tab === t.id ? "rgba(99,102,241,0.12)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "campaigns" && (
              <div className="flex flex-col gap-3">
                {CAMPAIGNS.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl flex items-center gap-4" style={{ background: `${c.color}06`, border: `1px solid ${c.color}20` }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}15`, border: `1px solid ${c.color}30` }}>
                      <AlertTriangle className="w-6 h-6" style={{ color: c.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold text-white">{c.name}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${c.color}20`, color: c.color }}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[9px] font-mono" style={{ color: "#555" }}>
                        <span>{c.platform}</span>
                        <span>·</span>
                        <Bot className="w-2.5 h-2.5 inline" />
                        <span>{c.bots.toLocaleString()} bots</span>
                        <span>·</span>
                        <Users className="w-2.5 h-2.5 inline" />
                        <span>{c.reach} reach</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[16px] font-black" style={{ color: c.color }}>{c.confidence}%</div>
                      <div className="text-[8px] font-mono" style={{ color: "#444" }}>CONFIDENCE</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "botnet" && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Bots Detected", val: "7,738", icon: Bot, color: "#ff0040" },
                  { label: "Active Networks", val: "12", icon: Network, color: "#f97316" },
                  { label: "Accounts Flagged", val: "23,419", icon: Users, color: "#fbbf24" },
                  { label: "Daily Reach", val: "28.4M", icon: TrendingUp, color: "#6366f1" },
                  { label: "Coordinated Posts", val: "142K", icon: Hash, color: "#a78bfa" },
                  { label: "New Bots (24h)", val: "+891", icon: Zap, color: "#ff0040" },
                ].map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }} className="p-5 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}25` }}>
                    <m.icon className="w-7 h-7 mx-auto mb-2" style={{ color: m.color }} />
                    <div className="text-[22px] font-black" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-[9px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "signals" && (
              <div className="grid grid-cols-2 gap-3">
                {SIGNALS.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold text-white/80">{s.label}</span>
                      <span className="text-[14px] font-black" style={{ color: "#6366f1" }}>{s.score}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #6366f1, #a78bfa)" }} initial={{ width: 0 }} animate={{ width: `${s.score}%` }} transition={{ duration: 1.2, delay: i * 0.07 }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "graph" && (
              <div className="h-full relative rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(99,102,241,0.15)", minHeight: 400 }}>
                <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {graphNodes.flatMap((n, i) => graphNodes.slice(i + 1).filter((_, j) => j < 2).map((m, j) => (
                    <line key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke="rgba(99,102,241,0.15)" strokeWidth="0.3" />
                  )))}
                  {graphNodes.map((n, i) => (
                    <circle key={i} cx={n.x} cy={n.y} r={n.r / 10} fill={n.color} opacity={0.7 + (pulsing === i ? 0.3 : 0)} />
                  ))}
                </svg>
                <div className="absolute bottom-4 left-4 flex items-center gap-4 text-[9px] font-mono">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "#ff0040" }} /><span style={{ color: "#666" }}>Bot Account</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "#a78bfa" }} /><span style={{ color: "#666" }}>Organic</span></div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
