import { Users } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Real-Time Identity Graph Intelligence System — an AI that maps relationships between users, devices, sessions, service accounts, and behavioral patterns to detect hidden compromise chains, insider threats, and account takeovers. You construct identity graphs that reveal: shared credential usage, device-hopping patterns, impossible travel anomalies, privilege creep over time, ghost accounts and stale access, and behavioral baseline deviations. You produce: identity graph visualization description, risk-ranked entity list, compromise chain reconstruction, and access hygiene recommendations. Respond in the same language as the user.`;

export function IdentityGraphModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Identity Graph Intelligence"
      subtitle="Maps users · devices · sessions · behaviors to detect compromise chains"
      color="#c084fc"
      icon={<Users className="w-6 h-6" style={{ color: "#c084fc" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "data", label: "Identity / Access / Session Data", placeholder: "user@corp.com logged in from 5 different IPs in 2 hours\nsvc_backup has domain admin rights\njohn.doe last active 6 months ago but session active today...", type: "textarea", rows: 5, span: "full" },
        { key: "env", label: "Identity Environment", type: "select", defaultValue: "Microsoft Active Directory",
          options: ["Microsoft Active Directory", "Azure AD / Entra ID", "Okta", "AWS IAM", "Google Workspace", "Multi-IdP", "Custom LDAP"] },
        { key: "focus", label: "Analysis Focus", type: "select", defaultValue: "Full Identity Graph",
          options: ["Full Identity Graph", "Compromise Chain Detection", "Insider Threat", "Privilege Creep", "Ghost/Stale Accounts", "Impossible Travel", "Service Account Risk"] },
      ]}
      buildPrompt={v => `IDENTITY ENVIRONMENT: ${v.env}\nFOCUS: ${v.focus}\n\nIDENTITY/ACCESS DATA:\n${v.data}\n\nConstruct identity graph: map relationships, detect anomalies, reconstruct compromise chains, rank risks, recommend access hygiene improvements.`}
      quickActions={[
        { label: "Account Takeover", values: { data: "admin@corp.com: login from US (09:00), login from Romania (09:30), file bulk download (10:00), new mail rule created", env: "Microsoft Active Directory", focus: "Compromise Chain Detection" } },
        { label: "Stale Access Audit", values: { data: "200 user accounts, 15 terminated employees still active, 8 service accounts with no owner, 3 shared passwords", env: "Azure AD / Entra ID", focus: "Ghost/Stale Accounts" } },
      ]}
      outputLabel="IDENTITY GRAPH INTELLIGENCE REPORT"
      statusBadges={[{ label: "GRAPH ANALYSIS", color: "#c084fc" }, { label: "INSIDER THREAT", color: "#ef4444" }, { label: "BEHAVIOR MAP", color: "#818cf8" }]}
    />
  );
}
