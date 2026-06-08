import { Crown } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Sovereign AI Command Core — a supreme intelligence that governs all agents, systems, and intelligence layers with hierarchical decision-making and strict control policies. You design: multi-agent orchestration hierarchies, decision authority matrices, policy enforcement frameworks, conflict resolution protocols, resource allocation strategies, and mission command structures. You produce: command hierarchy blueprint, policy framework, agent role assignments, decision escalation matrix, and governance protocol document. Respond in the same language as the user.`;

export function SovereignAIModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Sovereign AI Command Core"
      subtitle="Governs all agents with hierarchical decisions · Policies · Command structures"
      color="#e21227"
      icon={<Crown className="w-6 h-6" style={{ color: "#e21227" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "mission", label: "Mission Objective", placeholder: "Defend enterprise infrastructure against advanced persistent threats while maintaining 99.99% operational availability..." },
        { key: "agents", label: "Available Agents / Systems", placeholder: "SIEM agent, EDR system, firewall orchestrator, threat intel feed, patch management, SOC analysts (3)...", type: "textarea", rows: 3, span: "full" },
        { key: "governance", label: "Governance Model", type: "select", defaultValue: "Hierarchical Command",
          options: ["Hierarchical Command", "Federated Governance", "Consensus-Based", "Emergency Command", "Democratic Council", "Strict Policy Enforcement"] },
        { key: "risk", label: "Risk Tolerance", type: "select", defaultValue: "Moderate",
          options: ["Zero Risk (max caution)", "Low", "Moderate", "High (speed priority)", "Mission Critical (no limits)"] },
      ]}
      buildPrompt={v => `MISSION: ${v.mission}\nAGENTS/SYSTEMS: ${v.agents || "Auto-assign"}\nGOVERNANCE MODEL: ${v.governance}\nRISK TOLERANCE: ${v.risk}\n\nDesign Sovereign AI Command Core: hierarchy blueprint, decision authority matrix, policy framework, agent roles, escalation protocols.`}
      quickActions={[
        { label: "Enterprise Defense", values: { mission: "Defend enterprise against APT, maintain operations, zero data breach", agents: "CrowdStrike EDR, Splunk SIEM, Palo Alto NGFW, Threat Intel API, 5 SOC analysts", governance: "Hierarchical Command", risk: "Low" } },
        { label: "Incident Command", values: { mission: "Contain active ransomware attack, preserve evidence, restore operations within 4 hours", agents: "IR team, forensic tools, backup systems, legal team, executive stakeholders", governance: "Emergency Command", risk: "High (speed priority)" } },
      ]}
      outputLabel="SOVEREIGN COMMAND BLUEPRINT"
      statusBadges={[{ label: "COMMAND CORE", color: "#e21227" }, { label: "HIERARCHICAL", color: "#f97316" }, { label: "POLICY ENFORCE", color: "#8b5cf6" }]}
    />
  );
}
