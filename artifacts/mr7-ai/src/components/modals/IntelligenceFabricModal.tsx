import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network, Zap, Activity, Brain, Shield, Globe, RefreshCw, Cpu, TrendingUp, Layers, Link2 } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const NODES = [
  { id: "threat-intel", label: "Threat Intel", x: 20, y: 15, color: "#ff0040", connections: [1, 3, 5] },
  { id: "anomaly", label: "Anomaly Detector", x: 60, y: 10, color: "#f97316", connections: [0, 2, 4] },
  { id: "response", label: "Auto-Response", x: 80, y: 40, color: "#10b981", connections: [1, 3, 6] },
  { id: "identity", label: "Identity Graph", x: 50, y: 55, color: "#a78bfa", connections: [0, 2, 5, 6] },
  { id: "network", label: "Network Monitor", x: 15, y: 60, color: "#00e5ff", connections: [1, 3, 5] },
  { id: "data", label: "Data Intel", x: 35, y: 85, color: "#fbbf24", connections: [0, 3, 4, 6] },
  { id: "evolution", label: "Evo Engine", x: 75, y: 75, color: "#6366f1", connections: [2, 3, 5] },
];

export function IntelligenceFabricModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"fabric" | "relations" | "optimize" | "sync">("fabric");
  const [tick, setTick] = useState(0);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({ throughput: 94.2, latency: 0.8, coverage: 97.3, sync: 99.1 });

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setMetrics(m => ({
        throughput: Math.max(80, Math.min(100, m.throughput + (Math.random() - 0.49) * 0.8)),
        latency: Math.max(0.2, Math.min(2, m.latency + (Math.random() - 0.5) * 0.1)),
        coverage: Math.max(90, Math.min(100, m.coverage + (Math.random() - 0.49) * 0.3)),
        sync: Math.max(95, Math.min(100, m.sync + (Math.random() - 0.49) * 0.2)),
      }));
    }, 300);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #020508 0%, #030612 100%)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(99,102,241,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(99,102,241,0.12)", background: "rgba(99,102,241,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)" }}>
              <Network className="w-5 h-5" style={{ color: "#6366f1" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#6366f1", textShadow: "0 0 20px rgba(99,102,241,0.8)" }}>SELF-ORGANIZING INTELLIGENCE FABRIC</div>
              <div className="text-[10px] font-mono" style={{ color: "#6366f144" }}>AUTONOMOUS RESTRUCTURING · ADAPTIVE MESH TOPOLOGY · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              {[{ label: "THROUGHPUT", val: `${metrics.throughput.toFixed(1)}%`, color: "#10b981" }, { label: "SYNC", val: `${metrics.sync.toFixed(1)}%`, color: "#6366f1" }].map((m, i) => (
                <div key={i} className="text-center">
                  <div className="text-[18px] font-black" style={{ color: m.color }}>{m.val}</div>
                  <div className="text-[8px] font-mono" style={{ color: m.color + "55" }}>{m.label}</div>
                </div>
              ))}
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "fabric", label: "FABRIC MAP", icon: Network }, { id: "relations", label: "RELATIONSHIPS", icon: Link2 }, { id: "optimize", label: "SELF-OPTIMIZE", icon: RefreshCw }, { id: "sync", label: "SYNC STATE", icon: Activity }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#6366f1" : "#444", background: tab === t.id ? "rgba(99,102,241,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "fabric" && (
              <div className="h-full flex gap-5">
                <div className="flex-1 relative rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(99,102,241,0.12)", minHeight: 400 }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {NODES.flatMap((n, i) => n.connections.map(ci => {
                      const cn = NODES[ci];
                      return (<motion.line key={`${i}-${ci}`} x1={n.x} y1={n.y} x2={cn.x} y2={cn.y} stroke={n.color} strokeWidth="0.4" strokeOpacity="0.4" animate={{ strokeOpacity: [0.2, 0.6, 0.2] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }} />);
                    }))}
                    {NODES.map((n, i) => (
                      <g key={i} onClick={() => setActiveNode(activeNode === i ? null : i)} style={{ cursor: "pointer" }}>
                        <motion.circle cx={n.x} cy={n.y} r="3" fill={n.color} opacity="0.9" animate={{ r: [2.5, 3.5, 2.5] }} transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }} />
                        <circle cx={n.x} cy={n.y} r="5" fill="none" stroke={n.color} strokeWidth="0.3" opacity="0.4" />
                        <text x={n.x} y={n.y + 8} textAnchor="middle" fill={n.color} fontSize="3" fontFamily="monospace" opacity="0.8">{n.label}</text>
                      </g>
                    ))}
                  </svg>
                  <div className="absolute top-3 right-3 text-[9px] font-mono" style={{ color: "#6366f155" }}>LIVE TOPOLOGY</div>
                </div>
                <div className="w-64 flex flex-col gap-3">
                  <div className="text-[10px] font-mono font-bold" style={{ color: "#6366f155" }}>FABRIC NODES</div>
                  {NODES.map((n, i) => (
                    <motion.div key={i} className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all" onClick={() => setActiveNode(activeNode === i ? null : i)} style={{ background: activeNode === i ? `${n.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${activeNode === i ? n.color + "35" : "rgba(255,255,255,0.06)"}` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                      <span className="text-[10px] font-mono text-white/70">{n.label}</span>
                      <span className="ml-auto text-[8px] font-mono" style={{ color: n.color }}>{n.connections.length} links</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {tab === "relations" && (
              <div className="grid grid-cols-2 gap-4">
                {NODES.map((n, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: `${n.color}06`, border: `1px solid ${n.color}20` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: n.color }} />
                      <span className="text-[12px] font-bold text-white">{n.label}</span>
                    </div>
                    <div className="text-[9px] font-mono" style={{ color: "#555" }}>Connected to:</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {n.connections.map(ci => (<span key={ci} className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${NODES[ci].color}15`, color: NODES[ci].color }}>{NODES[ci].label}</span>))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "optimize" && (
              <div className="flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#6366f155" }}>AUTONOMOUS OPTIMIZATION LOG</div>
                {[
                  { event: "Redundant path removed between Anomaly ↔ Evolution (latency -0.2ms)", improvement: "+3.1%", time: "00:04:12" },
                  { event: "New direct link forged: Threat Intel ↔ Auto-Response (bypass +1 hop)", improvement: "+8.4%", time: "00:11:37" },
                  { event: "Load rebalanced: Identity Graph offloaded 34% to Network Monitor", improvement: "+5.2%", time: "00:22:05" },
                  { event: "Fabric topology converged to optimal Hamiltonian path", improvement: "+12.7%", time: "00:38:44" },
                  { event: "Self-healing: broken link Anomaly ↔ Evolution auto-rerouted", improvement: "+1.8%", time: "01:04:21" },
                ].map((e, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)" }}>
                    <span className="text-[8px] font-mono shrink-0 mt-0.5" style={{ color: "#6366f155" }}>{e.time}</span>
                    <span className="flex-1 text-[10px] font-mono text-white/60">{e.event}</span>
                    <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: "#10b981" }}>{e.improvement}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "sync" && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Fabric Throughput", val: metrics.throughput.toFixed(1) + "%", color: "#10b981" },
                  { label: "Average Latency", val: metrics.latency.toFixed(2) + "ms", color: "#00e5ff" },
                  { label: "Coverage", val: metrics.coverage.toFixed(1) + "%", color: "#6366f1" },
                  { label: "Sync Efficiency", val: metrics.sync.toFixed(1) + "%", color: "#fbbf24" },
                ].map((m, i) => (
                  <div key={i} className="p-5 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}22` }}>
                    <motion.div className="text-[28px] font-black" style={{ color: m.color }} animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>{m.val}</motion.div>
                    <div className="text-[9px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
