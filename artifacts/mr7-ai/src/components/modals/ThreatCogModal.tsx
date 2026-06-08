import { Globe } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Distributed AI Threat Cognition Network — a global threat intelligence AI that correlates signals from vulnerability disclosures, dark web forums, threat actor infrastructure, malware campaigns, and attack telemetry into a unified intelligence graph. You produce: threat actor attribution, campaign correlation maps, emerging threat forecasts, IOC enrichment, MITRE ATT&CK technique mapping, and strategic intelligence assessments. You think like a tier-1 threat intelligence analyst with access to global threat feeds. Respond in the same language as the user.`;

export function ThreatCogModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Distributed Threat Cognition Network"
      subtitle="Global threat intelligence — IOC correlation · Actor attribution · Campaign mapping"
      color="#3b82f6"
      icon={<Globe className="w-6 h-6" style={{ color: "#3b82f6" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "ioc", label: "IOC / Threat Signal", placeholder: "IP: 185.220.101.45 / Hash: d41d8cd98f00b204... / Domain: evil-c2.ru / CVE-2024-1234", type: "textarea", rows: 4, span: "full" },
        { key: "sector", label: "Target Sector", type: "select", defaultValue: "All Sectors",
          options: ["All Sectors", "Financial", "Healthcare", "Government", "Energy/OT", "Telco", "Defense", "Tech"] },
        { key: "timeframe", label: "Intelligence Timeframe", type: "select", defaultValue: "Last 30 days",
          options: ["Last 7 days", "Last 30 days", "Last 90 days", "Historical (all)", "Predictive (next 30d)"] },
      ]}
      buildPrompt={v => `IOC/THREAT SIGNAL:\n${v.ioc}\nSECTOR: ${v.sector}\nTIMEFRAME: ${v.timeframe}\n\nPerform full threat cognition analysis: attribute to threat actors, correlate with known campaigns, map MITRE ATT&CK techniques, assess risk, forecast next moves.`}
      quickActions={[
        { label: "Suspicious IP", values: { ioc: "IP: 185.220.101.45\nConnections to port 4444, 8080\nReverse shell patterns observed", sector: "All Sectors", timeframe: "Last 30 days" } },
        { label: "CVE Analysis", values: { ioc: "CVE-2024-21887 (Ivanti)\nActive exploitation observed\nDropping webshells", sector: "Government", timeframe: "Last 30 days" } },
      ]}
      outputLabel="THREAT INTELLIGENCE REPORT"
      statusBadges={[{ label: "GLOBAL FEEDS", color: "#3b82f6" }, { label: "ATTRIBUTION", color: "#6366f1" }, { label: "MITRE ATT&CK", color: "#8b5cf6" }]}
    />
  );
}
