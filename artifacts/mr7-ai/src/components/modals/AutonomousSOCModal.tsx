import { Activity } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Autonomous SOC AI — a tier-3 security operations center AI that replaces traditional analysts by triaging alerts, correlating events across time and systems, identifying true positives from alert noise, executing automated responses, and producing executive briefings. You process security events with: false positive suppression, attack chain correlation, MITRE ATT&CK mapping, severity escalation logic, containment action recommendations, and SLA-aware prioritization. You produce: triage verdict, correlation summary, recommended actions with runbooks, and executive summary. Respond in the same language as the user.`;

export function AutonomousSOCModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Autonomous SOC AI"
      subtitle="Tier-3 AI analyst — Triage · Correlation · Response · Executive briefing"
      color="#f97316"
      icon={<Activity className="w-6 h-6" style={{ color: "#f97316" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "alerts", label: "Security Alerts / SIEM Events", placeholder: "Alert: Brute Force on admin account (100 failures)\nAlert: Outbound connection to known C2 IP\nAlert: Scheduled task created by SYSTEM\nAlert: Large file upload to external storage...", type: "textarea", rows: 6, span: "full" },
        { key: "env", label: "Environment Context", placeholder: "50-person company, Windows AD, Office 365, AWS workloads, Fortinet firewall" },
        { key: "sla", label: "Response SLA", type: "select", defaultValue: "4 hours",
          options: ["15 minutes (P1 Critical)", "1 hour (P2 High)", "4 hours (P3 Medium)", "24 hours (P4 Low)", "Best effort"] },
      ]}
      buildPrompt={v => `ENVIRONMENT: ${v.env || "Unknown"}\nRESPONSE SLA: ${v.sla}\n\nALERTS/EVENTS:\n${v.alerts}\n\nPerform autonomous SOC analysis: triage all alerts, suppress false positives, correlate into attack chains, map MITRE ATT&CK, recommend prioritized response actions with runbooks.`}
      quickActions={[
        { label: "Full Alert Queue", values: { alerts: "HIGH: Failed SSH brute force 500 attempts in 10min\nMED: Tor exit node connection from workstation\nLOW: Admin account login outside hours\nHIGH: Mimikatz strings in PowerShell log", env: "Windows corporate, 200 endpoints, CrowdStrike EDR", sla: "1 hour (P2 High)" } },
        { label: "APT Indicators", values: { alerts: "CRIT: Living-off-land tools (certutil, bitsadmin)\nHIGH: LSASS memory access by rundll32.exe\nHIGH: Golden ticket authentication anomaly\nHIGH: New domain admin account created at 3am", env: "Enterprise AD, 500 users, Splunk SIEM", sla: "15 minutes (P1 Critical)" } },
      ]}
      outputLabel="SOC INTELLIGENCE BRIEF"
      statusBadges={[{ label: "AUTONOMOUS TRIAGE", color: "#f97316" }, { label: "FALSE POS FILTER", color: "#22c55e" }, { label: "MITRE ATT&CK", color: "#8b5cf6" }]}
    />
  );
}
