import { TrendingUp } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Real-Time Cognitive Threat Prediction Engine — an AI that forecasts cyber incidents before they materialize by analyzing weak signals across global infrastructure data streams. You correlate: threat actor activity patterns, vulnerability disclosure velocity, geopolitical cyber tensions, dark web chatter trends, malware toolkit evolution rates, patch deployment lag statistics, and historical attack seasonality. You produce: 30/60/90-day threat forecasts with probability scores, early warning indicators, pre-emptive action recommendations, and confidence intervals. Respond in the same language as the user.`;

export function ThreatPredictModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Cognitive Threat Prediction Engine"
      subtitle="Forecasts cyber incidents from weak signals — 30/60/90 day probability models"
      color="#f59e0b"
      icon={<TrendingUp className="w-6 h-6" style={{ color: "#f59e0b" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "org", label: "Organization Profile", placeholder: "Mid-size healthcare org, 500 employees, Epic EMR, AWS, HIPAA scope..." },
        { key: "signals", label: "Current Threat Signals / Context", placeholder: "Recent CVEs for our stack, geopolitical events, peer orgs breached, dark web mentions...", type: "textarea", rows: 4, span: "full" },
        { key: "horizon", label: "Prediction Horizon", type: "select", defaultValue: "30 days",
          options: ["7 days", "30 days", "60 days", "90 days", "6 months"] },
        { key: "sector", label: "Sector", type: "select", defaultValue: "Healthcare",
          options: ["Healthcare", "Financial", "Government", "Energy/OT", "Retail/E-commerce", "Technology", "Education", "Defense", "Manufacturing"] },
      ]}
      buildPrompt={v => `ORGANIZATION: ${v.org || "Unknown"}\nSECTOR: ${v.sector}\nHORIZON: ${v.horizon}\n\nCURRENT SIGNALS:\n${v.signals || "No specific signals — use sector threat landscape"}\n\nGenerate cognitive threat predictions: probability forecasts, early warning indicators, attack vectors most likely to be used, pre-emptive action plan.`}
      quickActions={[
        { label: "Healthcare 30d", values: { org: "Regional hospital, 1500 beds, Epic EMR, on-prem + AWS hybrid", signals: "LockBit activity against healthcare spiked, Apache Tomcat CVE unpatched, peer hospital breach last month", horizon: "30 days", sector: "Healthcare" } },
        { label: "Financial 90d", values: { org: "Regional bank, 200 branches, SWIFT, online banking portal", signals: "Nation-state SWIFT attacks reported, banking trojans evolving, CISA advisory for banking sector", horizon: "90 days", sector: "Financial" } },
      ]}
      outputLabel="THREAT PREDICTION FORECAST"
      statusBadges={[{ label: "PREDICTIVE AI", color: "#f59e0b" }, { label: "WEAK SIGNALS", color: "#fbbf24" }, { label: "PROBABILITY MODEL", color: "#f97316" }]}
    />
  );
}
