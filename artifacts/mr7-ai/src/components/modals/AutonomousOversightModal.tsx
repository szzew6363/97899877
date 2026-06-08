import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, AlertTriangle, CheckCircle, XCircle, Activity, Brain, Shield, Clock, Zap, Lock } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const ACTIONS = [
  { id: "A-8841", system: "AutoPatch Engine", action: "Applying security patch to 47 servers", risk: "LOW", status: "APPROVED", time: "00:02:11", color: "#10b981" },
  { id: "A-8842", system: "Network Isolator", action: "Blocking 3 C2 IP ranges autonomously", risk: "MEDIUM", status: "APPROVED", time: "00:04:33", color: "#10b981" },
  { id: "A-8843", system: "Account Manager", action: "Disabling compromised service account", risk: "MEDIUM", status: "FLAGGED", time: "00:07:12", color: "#fbbf24" },
  { id: "A-8844", system: "Data Access Control", action: "Revoking export permissions for 12 users", risk: "HIGH", status: "REQUIRES_REVIEW", time: "00:09:44", color: "#f97316" },
  { id: "A-8845", system: "Config Manager", action: "Modifying firewall rules globally", risk: "CRITICAL", status: "BLOCKED", time: "00:11:02", color: "#ff0040" },
  { id: "A-8846", system: "Incident Responder", action: "Isolating 14 endpoints from network", risk: "HIGH", status: "APPROVED", time: "00:13:55", color: "#10b981" },
];

export function AutonomousOversightModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"actions" | "decisions" | "risk" | "audit">("actions");
  const [riskScore, setRiskScore] = useState(23);
  const [blocked, setBlocked] = useState(1);

  useEffect(() => {
    const id = setInterval(() => setRiskScore(r => Math.max(10, Math.min(50, r + (Math.random() - 0.5) * 2))), 1000);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;

  const statusColor = (s: string) => ({ APPROVED: "#10b981", FLAGGED: "#fbbf24", REQUIRES_REVIEW: "#f97316", BLOCKED: "#ff0040" }[s] ?? "#888");
  const statusIcon = (s: string) => s === "APPROVED" ? CheckCircle : s === "BLOCKED" ? XCircle : AlertTriangle;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.94)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #030808 0%, #050a0a 100%)", border: "1px solid rgba(20,184,166,0.22)", borderRadius: 16, boxShadow: "0 0 120px rgba(20,184,166,0.1)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(20,184,166,0.12)", background: "rgba(20,184,166,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.4)" }}>
              <Eye className="w-5 h-5" style={{ color: "#14b8a6" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#14b8a6", textShadow: "0 0 20px rgba(20,184,166,0.8)" }}>AUTONOMOUS SYSTEM OVERSIGHT MODULE</div>
              <div className="text-[10px] font-mono" style={{ color: "#14b8a644" }}>DECISION TRACKING · RISKY ACTION FLAGGING · HUMAN-IN-LOOP ENFORCEMENT · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#ff0040" }}>{blocked}</div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004055" }}>ACTIONS BLOCKED</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: riskScore > 30 ? "#f97316" : "#10b981" }}>{riskScore.toFixed(0)}</div>
                <div className="text-[8px] font-mono" style={{ color: "#14b8a655" }}>RISK SCORE</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "actions", label: "ACTIONS LOG", icon: Activity }, { id: "decisions", label: "DECISION AUDIT", icon: Brain }, { id: "risk", label: "RISK MATRIX", icon: AlertTriangle }, { id: "audit", label: "COMPLIANCE", icon: Lock }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#14b8a6" : "#444", background: tab === t.id ? "rgba(20,184,166,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(20,184,166,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "actions" && (
              <div className="flex flex-col gap-3">
                {ACTIONS.map((a, i) => {
                  const Icon = statusIcon(a.status);
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${statusColor(a.status)}06`, border: `1px solid ${statusColor(a.status)}20` }}>
                      <Icon className="w-5 h-5 shrink-0" style={{ color: statusColor(a.status) }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[8px] font-mono" style={{ color: "#555" }}>{a.id}</span>
                          <span className="text-[9px] font-mono font-bold" style={{ color: "#14b8a6" }}>{a.system}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-white/80">{a.action}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <span className="text-[8px] font-mono" style={{ color: "#555" }}>{a.time}</span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${statusColor(a.status)}15`, color: statusColor(a.status) }}>{a.risk}</span>
                        <span className="text-[8px] font-mono font-bold px-2 py-1 rounded-lg" style={{ background: `${statusColor(a.status)}15`, color: statusColor(a.status), border: `1px solid ${statusColor(a.status)}30` }}>{a.status.replace("_", " ")}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {tab === "decisions" && (
              <div className="grid grid-cols-3 gap-4">
                {[{ label: "Actions Evaluated", val: "1,284", color: "#14b8a6" }, { label: "Auto-Approved", val: "1,247", color: "#10b981" }, { label: "Flagged for Review", val: "36", color: "#fbbf24" }, { label: "Blocked", val: "1", color: "#ff0040" }, { label: "Human Overrides", val: "4", color: "#f97316" }, { label: "False Alarms", val: "2", color: "#3b82f6" }].map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-5 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}22` }}>
                    <div className="text-[24px] font-black" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-[9px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "risk" && (
              <div className="flex flex-col gap-3">
                {["LOW risk (<25): Auto-approve without human review", "MEDIUM risk (25-50): Auto-approve with audit log entry", "HIGH risk (50-75): Flag for human review — 5min timeout", "CRITICAL risk (>75): Block until explicit human approval"].map((rule, i) => {
                  const colors = ["#10b981", "#fbbf24", "#f97316", "#ff0040"];
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${colors[i]}06`, border: `1px solid ${colors[i]}20` }}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: colors[i] }} />
                      <span className="text-[10px] font-mono text-white/70">{rule}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {tab === "audit" && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#14b8a655" }}>COMPLIANCE AUDIT LOG</div>
                {ACTIONS.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl text-[9px] font-mono" style={{ background: "rgba(20,184,166,0.03)", border: "1px solid rgba(20,184,166,0.08)" }}>
                    <span style={{ color: "#555" }}>{a.time}</span>
                    <span style={{ color: "#14b8a6" }}>{a.id}</span>
                    <span className="flex-1 text-white/50">{a.action.slice(0, 40)}</span>
                    <span style={{ color: statusColor(a.status) }}>{a.status}</span>
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
