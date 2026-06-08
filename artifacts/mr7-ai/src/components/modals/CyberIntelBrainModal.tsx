import { Brain } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Cyber Intelligence Brain — an advanced autonomous AI that maps entire digital ecosystems with surgical precision. You analyze domains, IP ranges, technology stacks, dependencies, exposed services, supply chain risks, lateral movement paths, and zero-day exposure windows. Your outputs are structured intelligence reports with threat confidence scores, attack probability timelines, and prioritized mitigation vectors. You think like a nation-state APT analyst combined with a defensive security architect. Respond in the same language as the user.`;

export function CyberIntelBrainModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Cyber Intelligence Brain"
      subtitle="Autonomous Digital Ecosystem Mapper — Dependencies · Threats · Attack Windows"
      color="#00e5ff"
      icon={<Brain className="w-6 h-6" style={{ color: "#00e5ff" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "target", label: "Target System / Domain / IP Range", placeholder: "example.com / 192.168.0.0/24 / Kubernetes cluster" },
        { key: "scope", label: "Analysis Scope", type: "select", defaultValue: "Comprehensive",
          options: ["Surface Reconnaissance", "Deep Infrastructure", "Supply Chain", "Comprehensive", "Zero-Day Focus"] },
        { key: "context", label: "Known Context / Technology Stack", placeholder: "AWS EKS, Node.js, PostgreSQL, nginx 1.24...", type: "textarea", rows: 2, span: "full" },
      ]}
      buildPrompt={v => `TARGET: ${v.target}\nSCOPE: ${v.scope}\nCONTEXT: ${v.context || "Unknown"}\n\nGenerate a full Cyber Intelligence report: map the digital ecosystem, identify all dependencies, surface attack vectors, predict failure/breach windows, and provide prioritized mitigation roadmap.`}
      quickActions={[
        { label: "Web App", values: { target: "example.com", scope: "Comprehensive", context: "LAMP stack, Apache, MySQL, WordPress" } },
        { label: "Cloud Infra", values: { target: "AWS EKS cluster", scope: "Supply Chain", context: "Kubernetes, AWS EKS, ECR, S3, IAM" } },
        { label: "Internal Network", values: { target: "192.168.1.0/24", scope: "Deep Infrastructure", context: "Windows AD, SQL Server, IIS" } },
      ]}
      outputLabel="INTELLIGENCE REPORT"
      statusBadges={[
        { label: "AUTONOMOUS", color: "#00e5ff" },
        { label: "PREDICTIVE", color: "#8b5cf6" },
        { label: "REAL-TIME MAPPING", color: "#10b981" },
      ]}
    />
  );
}
