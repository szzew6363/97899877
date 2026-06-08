import { Swords } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Predictive Cyber Warfare Simulation Engine — a strategic AI that models large-scale attack scenarios across cloud, network, and infrastructure environments for defense planning and wargaming. You simulate: APT campaign kill chains, nation-state attack playbooks, infrastructure destruction scenarios, supply chain compromise waves, coordinated DDoS + exploitation sequences, and ransomware deployment campaigns. For each scenario you produce: attack timeline, defender detection windows, critical decision points, recommended countermeasures, and damage containment strategies. Respond in the same language as the user.`;

export function CyberWarfareModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Cyber Warfare Simulation Engine"
      subtitle="Models large-scale attack scenarios for defense planning and wargaming"
      color="#ef4444"
      icon={<Swords className="w-6 h-6" style={{ color: "#ef4444" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "target", label: "Target Infrastructure", placeholder: "Financial sector cloud infrastructure / Power grid SCADA / Government datacenter..." },
        { key: "attacker", label: "Threat Actor Profile", type: "select", defaultValue: "APT Nation-State",
          options: ["APT Nation-State", "Ransomware Gang", "Hacktivist Group", "Insider Threat", "Supply Chain Actor", "Unknown Advanced Threat"] },
        { key: "scenario", label: "Attack Scenario", type: "select", defaultValue: "Full Campaign Simulation",
          options: ["Full Campaign Simulation", "Initial Access Phase", "Lateral Movement", "Data Exfiltration", "Destruction Phase", "Ransomware Deployment"] },
        { key: "defenses", label: "Existing Defenses", placeholder: "SIEM, EDR, MFA, WAF, network segmentation...", span: "full" },
      ]}
      buildPrompt={v => `TARGET: ${v.target}\nTHREAT ACTOR: ${v.attacker}\nSCENARIO: ${v.scenario}\nEXISTING DEFENSES: ${v.defenses || "Unknown"}\n\nSimulate the full cyber warfare scenario: model attack timeline, identify defender detection windows, critical pivot points, and provide comprehensive defense playbook.`}
      quickActions={[
        { label: "Ransomware Campaign", values: { target: "Healthcare network 500 systems", attacker: "Ransomware Gang", scenario: "Ransomware Deployment", defenses: "Basic AV, no EDR, flat network" } },
        { label: "APT Espionage", values: { target: "Defense contractor cloud infra", attacker: "APT Nation-State", scenario: "Full Campaign Simulation", defenses: "SIEM, MFA, endpoint DLP" } },
      ]}
      outputLabel="WARFARE SIMULATION REPORT"
      statusBadges={[{ label: "APT MODELING", color: "#ef4444" }, { label: "KILL CHAIN", color: "#f97316" }, { label: "WARGAMING", color: "#fbbf24" }]}
    />
  );
}
