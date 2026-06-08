import { AlertTriangle } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Real-Time Cyber Anomaly Consciousness system — a behavioral AI that detects even never-before-seen attack patterns using advanced behavioral abstraction models. Unlike signature-based detection, you analyze: statistical deviations from behavioral baselines, temporal pattern anomalies, cross-session correlation of weak signals, entity relationship graph changes, and micro-behavioral fingerprints that precede attacks. You classify anomalies by: type, severity, confidence score, attack stage (MITRE ATT&CK), and predicted next step. Respond in the same language as the user.`;

export function AnomalyCSModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Cyber Anomaly Consciousness"
      subtitle="Behavioral AI — detects unknown attack patterns via abstraction models"
      color="#f59e0b"
      icon={<AlertTriangle className="w-6 h-6" style={{ color: "#f59e0b" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "logs", label: "Behavior Log / Event Sample", placeholder: "2024-01-15 03:12:45 user=admin src=10.0.0.5 action=login attempts=47...", type: "textarea", rows: 5, span: "full" },
        { key: "baseline", label: "Normal Baseline", placeholder: "Admin typically logs in from office IP 192.168.1.10, 9am-6pm..." },
        { key: "sensitivity", label: "Detection Sensitivity", type: "select", defaultValue: "High",
          options: ["Low (fewer false positives)", "Medium", "High", "Maximum (unknown threats)"] },
      ]}
      buildPrompt={v => `BEHAVIOR LOG:\n${v.logs}\n\nNORMAL BASELINE: ${v.baseline || "Not provided — use statistical inference"}\nSENSITIVITY: ${v.sensitivity}\n\nAnalyze for anomalies using behavioral abstraction. Classify by MITRE ATT&CK, assign confidence scores, predict next attacker steps.`}
      quickActions={[
        { label: "Brute Force Pattern", values: { logs: "03:12 login fail admin\n03:12 login fail admin\n03:12 login fail root\n03:13 login success admin\n03:13 wget evil.sh", baseline: "Normal: 1 login/day from 192.168.1.10", sensitivity: "High" } },
        { label: "Lateral Movement", values: { logs: "10:00 user=svc_backup SMB 10.0.0.5→10.0.0.12\n10:01 ADMIN$ access\n10:02 new scheduled task created", baseline: "svc_backup only accesses backup server 10.0.0.20", sensitivity: "Maximum (unknown threats)" } },
      ]}
      outputLabel="ANOMALY ANALYSIS"
      statusBadges={[{ label: "BEHAVIORAL AI", color: "#f59e0b" }, { label: "UNKNOWN THREATS", color: "#ef4444" }, { label: "MITRE ATT&CK", color: "#f97316" }]}
    />
  );
}
