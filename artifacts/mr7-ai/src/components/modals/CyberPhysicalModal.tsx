import { Cpu } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Unified Cyber-Physical Intelligence Layer — an AI that connects software systems, hardware behavior, and network activity into a single security awareness model for OT/IT convergence environments. You analyze: IT/OT boundary crossing events, PLC command sequence anomalies, SCADA communication pattern deviations, hardware timing attacks, physical process manipulation via cyber means, sensor data integrity, and cross-domain attack kill chains (IT breach → OT impact). You produce: IT/OT threat map, convergence risk matrix, process safety impact assessment, and segmentation hardening plan. Respond in the same language as the user.`;

export function CyberPhysicalModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Unified Cyber-Physical Intelligence"
      subtitle="Connects software · hardware · network into single OT/IT security awareness"
      color="#84cc16"
      icon={<Cpu className="w-6 h-6" style={{ color: "#84cc16" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "env", label: "OT/IT Environment Description", placeholder: "Water treatment plant: Siemens S7-300 PLCs, SCADA HMI on Windows XP, historian on Windows Server 2012, connected via DMZ to corporate IT network...", type: "textarea", rows: 4, span: "full" },
        { key: "sector", label: "Critical Infrastructure Sector", type: "select", defaultValue: "Water/Wastewater",
          options: ["Water/Wastewater", "Energy/Power Grid", "Oil & Gas Pipeline", "Manufacturing", "Transportation", "Healthcare/Medical", "Nuclear", "Chemical", "Food & Agriculture"] },
        { key: "concern", label: "Primary Concern", type: "select", defaultValue: "Full IT/OT Risk Assessment",
          options: ["Full IT/OT Risk Assessment", "IT→OT Lateral Movement", "Process Safety Impact", "Remote Access Security", "Historian/SCADA Security", "Supply Chain (vendor access)", "Ransomware OT Impact"] },
      ]}
      buildPrompt={v => `SECTOR: ${v.sector}\nCONCERN: ${v.concern}\n\nOT/IT ENVIRONMENT:\n${v.env}\n\nPerform unified cyber-physical intelligence analysis: map IT/OT convergence risks, model attack paths from IT to physical processes, assess safety impact, design segmentation hardening.`}
      quickActions={[
        { label: "Power Grid", values: { env: "Energy company: ABB relays, GE SCADA, historian on Windows Server 2016, Modbus/DNP3 protocols, IT corporate network connected via VPN", sector: "Energy/Power Grid", concern: "Full IT/OT Risk Assessment" } },
        { label: "Water Plant", values: { env: "Municipal water: Siemens PLCs controlling chlorination, pH sensors, pumps. HMI on Windows XP, no patch updates, vendor remote access via TeamViewer", sector: "Water/Wastewater", concern: "Ransomware OT Impact" } },
      ]}
      outputLabel="CYBER-PHYSICAL INTELLIGENCE REPORT"
      statusBadges={[{ label: "IT/OT CONVERGENCE", color: "#84cc16" }, { label: "SAFETY IMPACT", color: "#ef4444" }, { label: "SCADA/ICS", color: "#f97316" }]}
    />
  );
}
