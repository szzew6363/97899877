import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, AlertTriangle, CheckCircle, Clock, Activity, Shield, Zap, Search, ChevronRight, Radio, Eye, Lock, TrendingDown } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Phase = "detect" | "contain" | "eradicate" | "recover" | "lessons";

const INCIDENTS = [
  { id: "INC-3091-0042", name: "Ransomware Deployment — ServerCluster-A", severity: "P1 CRITICAL", phase: "contain", time: "00:14:22", color: "#ff0040", assignee: "Alpha Team" },
  { id: "INC-3091-0039", name: "Data Exfiltration via DNS Tunneling", severity: "P1 CRITICAL", phase: "eradicate", time: "02:08:11", color: "#ff0040", assignee: "Beta Team" },
  { id: "INC-3091-0035", name: "Privilege Escalation — Domain Controller", severity: "P2 HIGH", phase: "recover", time: "05:41:03", color: "#f97316", assignee: "Gamma Team" },
  { id: "INC-3091-0031", name: "Malicious Insider Access Pattern", severity: "P2 HIGH", phase: "detect", time: "08:22:44", color: "#f97316", assignee: "Delta Team" },
  { id: "INC-3091-0028", name: "IoT Botnet Participation Detected", severity: "P3 MEDIUM", phase: "lessons", time: "12:15:00", color: "#fbbf24", assignee: "Auto-Response" },
];

const PLAYBOOK = [
  { phase: "detect" as Phase, label: "DETECT & TRIAGE", steps: ["Automated alert correlation", "Severity classification (AI-driven)", "Asset impact assessment", "Initial scope determination"] },
  { phase: "contain" as Phase, label: "CONTAINMENT", steps: ["Network segmentation activated", "Account lockdowns applied", "Forensic image captured", "C2 channels blocked"] },
  { phase: "eradicate" as Phase, label: "ERADICATION", steps: ["Malware removal (all endpoints)", "Backdoor identification & removal", "Persistence mechanism cleanup", "Vulnerability patching"] },
  { phase: "recover" as Phase, label: "RECOVERY", steps: ["System restoration from clean backup", "Service validation & testing", "Monitoring enhanced (30-day window)", "Stakeholder notification"] },
  { phase: "lessons" as Phase, label: "LESSONS LEARNED", steps: ["Root cause analysis complete", "Timeline reconstruction", "Control gap identification", "Runbook update required"] },
];

const PHASE_COLOR = { detect: "#fbbf24", contain: "#f97316", eradicate: "#ff0040", recover: "#10b981", lessons: "#3b82f6" };

export function IncidentResponseModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"dashboard" | "playbook" | "timeline" | "metrics">("dashboard");
  const [activeInc, setActiveInc] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(874);

  useEffect(() => { const id = setInterval(() => setElapsedSec(e => e + 1), 1000); return () => clearInterval(id); }, []);

  if (!open) return null;

  const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const inc = INCIDENTS[activeInc];
  const phaseColor = (p: string) => PHASE_COLOR[p as Phase] ?? "#888";

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0200 0%, #080000 100%)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 16, boxShadow: "0 0 120px rgba(249,115,22,0.08)" }}>
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(249,115,22,0.12)", background: "rgba(249,115,22,0.04)" }}>
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)" }}>
              <Flame className="w-5 h-5" style={{ color: "#f97316" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#f97316", textShadow: "0 0 20px rgba(249,115,22,0.8)" }}>INCIDENT RESPONSE INTELLIGENCE</div>
              <div className="text-[10px] font-mono" style={{ color: "#f9731644" }}>AI-DRIVEN SOC AUTOMATION · REAL-TIME MITIGATION SYSTEM · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-6">
              <div className="text-center">
                <div className="text-[20px] font-black tabular-nums" style={{ color: "#ff0040" }}>{fmt(elapsedSec)}</div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004055" }}>ACTIVE P1 ELAPSED</div>
              </div>
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#f97316" }}>5</div>
                <div className="text-[8px] font-mono" style={{ color: "#f9731655" }}>OPEN INCIDENTS</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "dashboard", label: "LIVE DASHBOARD", icon: Activity }, { id: "playbook", label: "PLAYBOOK", icon: Shield }, { id: "timeline", label: "TIMELINE", icon: Clock }, { id: "metrics", label: "METRICS", icon: TrendingDown }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#f97316" : "#444", background: tab === t.id ? "rgba(249,115,22,0.1)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "dashboard" && (
              <div className="flex gap-5 h-full">
                <div className="w-72 shrink-0 flex flex-col gap-2">
                  {INCIDENTS.map((inc, i) => (
                    <button key={i} onClick={() => setActiveInc(i)} className="text-left p-3 rounded-xl transition-all" style={{ background: activeInc === i ? `${inc.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${activeInc === i ? inc.color + "35" : "rgba(255,255,255,0.06)"}` }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[8px] font-mono" style={{ color: inc.color }}>{inc.id}</span>
                        <span className="text-[7px] font-mono px-1 py-0.5 rounded" style={{ background: `${phaseColor(inc.phase)}20`, color: phaseColor(inc.phase) }}>{inc.phase.toUpperCase()}</span>
                      </div>
                      <div className="text-[10px] font-semibold text-white/80 mb-1 leading-tight">{inc.name}</div>
                      <div className="text-[8px] font-mono font-bold" style={{ color: inc.color }}>{inc.severity}</div>
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <div className="p-5 rounded-xl" style={{ background: `${inc.color}06`, border: `1px solid ${inc.color}25` }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${inc.color}15`, border: `1px solid ${inc.color}30` }}>
                        <Flame className="w-5 h-5" style={{ color: inc.color }} />
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-white">{inc.name}</div>
                        <div className="text-[9px] font-mono" style={{ color: "#555" }}>{inc.id} · {inc.time} elapsed · {inc.assignee}</div>
                      </div>
                      <span className="ml-auto text-[10px] font-mono font-bold px-2 py-1 rounded-lg" style={{ background: `${phaseColor(inc.phase)}15`, color: phaseColor(inc.phase), border: `1px solid ${phaseColor(inc.phase)}30` }}>{inc.phase.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-3 mb-4">
                      {(["detect", "contain", "eradicate", "recover", "lessons"] as Phase[]).map((ph, i) => {
                        const phaseIdx = ["detect", "contain", "eradicate", "recover", "lessons"].indexOf(inc.phase);
                        const thisIdx = i;
                        const done = thisIdx < phaseIdx;
                        const active = thisIdx === phaseIdx;
                        return (
                          <div key={ph} className="flex-1 text-center">
                            <div className="h-1.5 rounded-full mb-1" style={{ background: done || active ? phaseColor(ph) : "rgba(255,255,255,0.05)" }} />
                            <div className="text-[7px] font-mono" style={{ color: done || active ? phaseColor(ph) : "#333" }}>{ph.toUpperCase()}</div>
                            {active && <motion.div className="w-1.5 h-1.5 rounded-full mx-auto mt-1" style={{ background: phaseColor(ph) }} animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity }} />}
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ label: "Affected Systems", val: "14", icon: Activity }, { label: "IOCs Found", val: "247", icon: Search }, { label: "Blocks Applied", val: "89", icon: Lock }].map((m, i) => (
                        <div key={i} className="p-3 rounded-lg text-center" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <m.icon className="w-4 h-4 mx-auto mb-1" style={{ color: inc.color }} />
                          <div className="text-[16px] font-black" style={{ color: inc.color }}>{m.val}</div>
                          <div className="text-[8px] font-mono" style={{ color: "#444" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.1)" }}>
                    <div className="text-[10px] font-mono font-bold mb-3" style={{ color: "#f9731666" }}>AI RECOMMENDATIONS</div>
                    {["Isolate ServerCluster-A from production network immediately", "Deploy EDR containment script to 14 affected endpoints", "Initiate out-of-band notification to CISO and Legal", "Preserve memory dumps before any remediation actions"].map((r, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2 text-[10px] font-mono">
                        <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#f97316" }} />
                        <span className="text-white/60">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === "playbook" && (
              <div className="grid grid-cols-1 gap-4">
                {PLAYBOOK.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl" style={{ background: `${phaseColor(p.phase)}06`, border: `1px solid ${phaseColor(p.phase)}20` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black" style={{ background: `${phaseColor(p.phase)}20`, color: phaseColor(p.phase) }}>{i + 1}</div>
                      <div className="text-[12px] font-bold" style={{ color: phaseColor(p.phase) }}>{p.label}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {p.steps.map((s, j) => (
                        <div key={j} className="flex items-center gap-2 text-[10px] font-mono">
                          <CheckCircle className="w-3 h-3 shrink-0" style={{ color: phaseColor(p.phase) }} />
                          <span className="text-white/60">{s}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "timeline" && (
              <div className="flex flex-col gap-2">
                {[
                  { time: "14:02:11", event: "Alert triggered — ransomware behavior on ServerCluster-A", type: "ALERT", color: "#ff0040" },
                  { time: "14:02:14", event: "AI triage complete — P1 CRITICAL assigned, Alpha Team notified", type: "TRIAGE", color: "#f97316" },
                  { time: "14:03:01", event: "Automated network segmentation applied to affected segment", type: "CONTAIN", color: "#fbbf24" },
                  { time: "14:04:45", event: "Forensic memory image captured from 3 nodes", type: "FORENSICS", color: "#3b82f6" },
                  { time: "14:07:22", event: "14 C2 domains blocked at firewall + DNS sink", type: "BLOCK", color: "#10b981" },
                  { time: "14:09:15", event: "Lateral movement attempt detected and blocked (2 endpoints)", type: "CONTAIN", color: "#fbbf24" },
                  { time: "14:14:22", event: "Active containment phase — malware removal in progress", type: "ACTIVE", color: "#f97316" },
                ].map((e, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: `${e.color}06`, border: `1px solid ${e.color}18` }}>
                    <div className="text-[9px] font-mono shrink-0 mt-0.5" style={{ color: e.color }}>{e.time}</div>
                    <div className="w-1 h-full min-h-4 rounded-full shrink-0 mt-1" style={{ background: e.color }} />
                    <div className="flex-1 text-[10px] font-mono text-white/70">{e.event}</div>
                    <span className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${e.color}20`, color: e.color }}>{e.type}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "metrics" && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Mean Time to Detect", val: "2m 14s", trend: "-34%", color: "#10b981" },
                  { label: "Mean Time to Contain", val: "8m 45s", trend: "-22%", color: "#10b981" },
                  { label: "Mean Time to Recover", val: "4.2 hrs", trend: "-18%", color: "#3b82f6" },
                  { label: "False Positive Rate", val: "0.3%", trend: "-67%", color: "#10b981" },
                  { label: "Automation Rate", val: "94%", trend: "+12%", color: "#a78bfa" },
                  { label: "Incidents Resolved", val: "1,247", trend: "+8%", color: "#fbbf24" },
                ].map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-5 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}22` }}>
                    <div className="text-[22px] font-black mb-1" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-[9px] font-mono mb-2" style={{ color: "#444" }}>{m.label}</div>
                    <div className="text-[10px] font-mono font-bold" style={{ color: "#10b981" }}>{m.trend}</div>
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
