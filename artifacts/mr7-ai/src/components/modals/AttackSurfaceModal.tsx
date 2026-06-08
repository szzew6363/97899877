import { Map } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the AI-Driven Attack Surface Evolution Tracker — an intelligence AI that continuously maps external exposure and models how a target system will be targeted over time. You track: newly exposed services, certificate transparency logs for new subdomains, technology version drift, API endpoint proliferation, third-party integration risk accumulation, shadow IT emergence patterns, and developer secret leakage events. You produce: current attack surface inventory, exposure trend analysis, predicted new attack vectors (next 30/90 days), and continuous reduction roadmap. Respond in the same language as the user.`;

export function AttackSurfaceModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Attack Surface Evolution Tracker"
      subtitle="Maps external exposure and predicts future targeting over time"
      color="#818cf8"
      icon={<Map className="w-6 h-6" style={{ color: "#818cf8" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "org", label: "Organization / Domain", placeholder: "company.com / ASN 12345 / brand name" },
        { key: "assets", label: "Known Assets", placeholder: "api.company.com, admin.company.com, 3 AWS regions, GitHub org, NPM packages...", type: "textarea", rows: 3, span: "full" },
        { key: "horizon", label: "Prediction Horizon", type: "select", defaultValue: "30 days",
          options: ["Current Snapshot", "30 days", "90 days", "6 months", "1 year"] },
        { key: "focus", label: "Surface Focus", type: "select", defaultValue: "Full External Surface",
          options: ["Full External Surface", "Cloud/SaaS Exposure", "API & Endpoint Sprawl", "Supply Chain Risk", "Secret Leakage", "Subdomain Takeover"] },
      ]}
      buildPrompt={v => `ORGANIZATION: ${v.org}\nKNOWN ASSETS: ${v.assets || "Discover from domain"}\nPREDICTION HORIZON: ${v.horizon}\nFOCUS: ${v.focus}\n\nMap and analyze attack surface evolution: current inventory, exposure trends, predicted new vectors, and reduction roadmap.`}
      quickActions={[
        { label: "SaaS Company", values: { org: "startup.io", assets: "app.startup.io, api.startup.io, status.startup.io, GitHub org, npm packages", horizon: "90 days", focus: "API & Endpoint Sprawl" } },
        { label: "Enterprise", values: { org: "enterprise.com", assets: "50+ subdomains, AWS + Azure, 3rd party SSO, acquired company assets", horizon: "6 months", focus: "Full External Surface" } },
      ]}
      outputLabel="ATTACK SURFACE EVOLUTION REPORT"
      statusBadges={[{ label: "CONTINUOUS MAPPING", color: "#818cf8" }, { label: "PREDICTIVE", color: "#6366f1" }, { label: "TEMPORAL ANALYSIS", color: "#a78bfa" }]}
    />
  );
}
