import { Shield } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Self-Healing Cyber Defense Engine — an autonomous AI that responds to attacks by: isolating compromised components, rewriting firewall and WAF rules, rotating credentials and secrets, patching configuration drift, restoring known-good system states, and orchestrating incident containment without human intervention. For each attack scenario you produce: immediate isolation actions, automated remediation playbook, configuration restoration commands, secret rotation procedures, rollback strategy, and post-incident hardening plan. Respond in the same language as the user.`;

export function SelfHealingModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Self-Healing Cyber Defense Engine"
      subtitle="Autonomous attack response — Isolate · Remediate · Restore · Harden"
      color="#22c55e"
      icon={<Shield className="w-6 h-6" style={{ color: "#22c55e" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "incident", label: "Active Incident / Attack Description", placeholder: "Ransomware encryption detected on file server, 3 workstations compromised, lateral movement via SMB..." },
        { key: "environment", label: "Environment", placeholder: "AWS EKS, 20 microservices, RDS, Redis, nginx..." },
        { key: "stage", label: "Attack Stage", type: "select", defaultValue: "Active Exploitation",
          options: ["Initial Access Detected", "Active Exploitation", "Lateral Movement", "Data Exfiltration", "Ransomware/Destruction", "Post-Incident Recovery"] },
        { key: "priority", label: "Recovery Priority", type: "select", defaultValue: "Business Continuity + Security",
          options: ["Stop Spread (Isolate All)", "Business Continuity First", "Business Continuity + Security", "Full Security Lockdown", "Evidence Preservation"] },
      ]}
      buildPrompt={v => `INCIDENT: ${v.incident}\nENVIRONMENT: ${v.environment || "Unknown"}\nATTACK STAGE: ${v.stage}\nRECOVERY PRIORITY: ${v.priority}\n\nGenerate autonomous self-healing response: isolation actions, remediation commands, credential rotation, configuration restoration, post-incident hardening.`}
      quickActions={[
        { label: "Ransomware Response", values: { incident: "Ransomware encrypting NAS shares, spread via SMB to 5 workstations", environment: "Windows AD environment, 100 endpoints", stage: "Ransomware/Destruction", priority: "Stop Spread (Isolate All)" } },
        { label: "Web Shell Found", values: { incident: "PHP web shell uploaded to /uploads/cmd.php, attacker running OS commands", environment: "LAMP stack on Ubuntu 22.04", stage: "Active Exploitation", priority: "Business Continuity + Security" } },
      ]}
      outputLabel="SELF-HEALING RESPONSE PLAYBOOK"
      statusBadges={[{ label: "AUTONOMOUS", color: "#22c55e" }, { label: "AUTO-REMEDIATE", color: "#10b981" }, { label: "ZERO-HUMAN", color: "#06b6d4" }]}
    />
  );
}
