import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Lock, Shield, AlertTriangle, Search, Globe, Activity, Zap, EyeOff, Database, Cpu } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const RISKS = [
  { id: "track-1", name: "Behavioral Tracking Pixel", source: "analytics.dataharvest.io", severity: "HIGH", type: "TRACKING", exposure: "Session data, Scroll depth, Click patterns", color: "#f97316" },
  { id: "track-2", name: "Browser Fingerprinting Script", source: "cdn.fingerprinter.net", severity: "HIGH", type: "FINGERPRINT", exposure: "Hardware info, Fonts, Canvas fingerprint", color: "#f97316" },
  { id: "track-3", name: "Cross-Site Data Broker", source: "synapse.databroker.com", severity: "CRITICAL", type: "DATA_BROKER", exposure: "Full identity profile, Location history", color: "#ff0040" },
  { id: "track-4", name: "Ad Network Surveillance", source: "omnivore-ads.net", severity: "MEDIUM", type: "ADVERTISING", exposure: "Ad interactions, Purchase intent", color: "#fbbf24" },
  { id: "track-5", name: "Shadow Profile Construction", source: "unknown", severity: "CRITICAL", type: "AI_PROFILING", exposure: "Inferred identity from metadata patterns", color: "#ff0040" },
];

const SENSORS = [
  { name: "Location Access", apps: 34, risk: "HIGH", color: "#ff0040" },
  { name: "Microphone Access", apps: 12, risk: "CRITICAL", color: "#ff0040" },
  { name: "Camera Access", apps: 8, risk: "HIGH", color: "#f97316" },
  { name: "Contacts Database", apps: 19, risk: "HIGH", color: "#f97316" },
  { name: "Activity History", apps: 47, risk: "MEDIUM", color: "#fbbf24" },
];

export function PrivacyRiskModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"risks" | "sensors" | "exposure" | "protect">("risks");
  const [privacyScore, setPrivacyScore] = useState(34);
  const [trackCount, setTrackCount] = useState(247);

  useEffect(() => {
    const id = setInterval(() => setTrackCount(t => t + Math.floor(Math.random() * 3)), 2000);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #080203 0%, #0a0305 100%)", border: "1px solid rgba(236,72,153,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(236,72,153,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(236,72,153,0.12)", background: "rgba(236,72,153,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.4)" }}>
              <EyeOff className="w-5 h-5" style={{ color: "#ec4899" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#ec4899", textShadow: "0 0 20px rgba(236,72,153,0.8)" }}>PRIVACY RISK DETECTION SYSTEM</div>
              <div className="text-[10px] font-mono" style={{ color: "#ec489944" }}>SURVEILLANCE MONITORING · DATA EXPOSURE ANALYSIS · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <div className="text-[22px] font-black" style={{ color: privacyScore < 50 ? "#ff0040" : "#10b981" }}>{privacyScore}/100</div>
                <div className="text-[8px] font-mono" style={{ color: "#ec489955" }}>PRIVACY SCORE</div>
              </div>
              <div className="text-center">
                <motion.div className="text-[18px] font-black tabular-nums" style={{ color: "#f97316" }} animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 2, repeat: Infinity }}>{trackCount}</motion.div>
                <div className="text-[8px] font-mono" style={{ color: "#f9731655" }}>TRACKERS BLOCKED</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "risks", label: "TRACKING RISKS", icon: Eye }, { id: "sensors", label: "SENSOR EXPOSURE", icon: Cpu }, { id: "exposure", label: "DATA EXPOSURE", icon: Database }, { id: "protect", label: "PROTECTION", icon: Shield }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#ec4899" : "#444", background: tab === t.id ? "rgba(236,72,153,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "risks" && (
              <div className="flex flex-col gap-3">
                {RISKS.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl flex items-start gap-4" style={{ background: `${r.color}06`, border: `1px solid ${r.color}20` }}>
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: r.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold text-white">{r.name}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${r.color}20`, color: r.color }}>{r.severity}</span>
                        <span className="text-[7px] font-mono px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#666" }}>{r.type}</span>
                      </div>
                      <div className="text-[9px] font-mono mb-1" style={{ color: "#555" }}>Source: {r.source}</div>
                      <div className="text-[9px] font-mono" style={{ color: "#ec4899" }}>Exposes: {r.exposure}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "sensors" && (
              <div className="flex flex-col gap-3">
                {SENSORS.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${s.color}06`, border: `1px solid ${s.color}20` }}>
                    <Cpu className="w-5 h-5 shrink-0" style={{ color: s.color }} />
                    <div className="flex-1">
                      <div className="text-[12px] font-bold text-white">{s.name}</div>
                      <div className="text-[9px] font-mono" style={{ color: "#555" }}>{s.apps} apps with access</div>
                    </div>
                    <span className="text-[8px] font-mono font-bold px-2 py-1 rounded" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>{s.risk}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "exposure" && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Identity Data Exposed", val: "HIGH RISK", color: "#ff0040" },
                  { label: "Location History", val: "8,400 points", color: "#f97316" },
                  { label: "Behavioral Profile", val: "97% complete", color: "#ff0040" },
                  { label: "Data Brokers w/ Profile", val: "34 found", color: "#f97316" },
                  { label: "Dark Web Exposure", val: "2 leaks", color: "#ff0040" },
                  { label: "AI Shadow Profile", val: "EXISTS", color: "#a78bfa" },
                ].map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}22` }}>
                    <div className="text-[18px] font-black" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-[8px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "protect" && (
              <div className="flex flex-col gap-3">
                {["Block all 3rd-party tracking pixels (247 blocked)", "Enable DNS-over-HTTPS on all devices", "Rotate device fingerprint every 24 hours", "Submit data deletion requests to 34 brokers", "Enable AI shadow profile suppression", "Deploy VPN on all exit nodes", "Enable memory-only browsing mode"].map((action, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(236,72,153,0.05)", border: "1px solid rgba(236,72,153,0.12)" }}>
                    <Lock className="w-4 h-4 shrink-0" style={{ color: "#ec4899" }} />
                    <span className="text-[10px] font-mono text-white/70">{action}</span>
                    <button className="ml-auto text-[8px] font-mono font-bold px-2 py-1 rounded shrink-0" style={{ background: "rgba(236,72,153,0.15)", color: "#ec4899", border: "1px solid rgba(236,72,153,0.3)" }}>APPLY</button>
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
