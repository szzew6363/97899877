import { Copy } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Full-Spectrum Digital Twin Engine — an AI that creates and operates a complete virtual replica of infrastructure that simulates real-world behavior, attack scenarios, failure cascades, and optimization experiments in a parallel reality model. You design: digital twin architecture, component behavior models, failure injection scenarios, attack simulation playbooks, performance optimization experiments, and chaos engineering test suites. You produce: twin specification, simulation results, failure cascade maps, optimization recommendations, and infrastructure resilience score. Respond in the same language as the user.`;

export function DigitalTwinModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Full-Spectrum Digital Twin"
      subtitle="Parallel reality infrastructure simulation — Failures · Attacks · Optimizations"
      color="#fbbf24"
      icon={<Copy className="w-6 h-6" style={{ color: "#fbbf24" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "infra", label: "Infrastructure to Twin", placeholder: "3-tier web app: nginx LB, 4 Node.js servers, Redis cache, PostgreSQL primary+replica, AWS us-east-1...", type: "textarea", rows: 4, span: "full" },
        { key: "simulation", label: "Simulation Type", type: "select", defaultValue: "Full Resilience Test",
          options: ["Full Resilience Test", "Attack Simulation", "Failure Cascade", "Performance Under Load", "Chaos Engineering", "Disaster Recovery", "Capacity Planning"] },
        { key: "scenario", label: "Specific Scenario", placeholder: "DDoS attack + primary DB failure simultaneously at 10x normal load..." },
      ]}
      buildPrompt={v => `INFRASTRUCTURE:\n${v.infra}\nSIMULATION TYPE: ${v.simulation}\nSPECIFIC SCENARIO: ${v.scenario || "General resilience test"}\n\nDesign and run digital twin simulation: model behavior, inject failures/attacks, analyze cascades, produce resilience score and recommendations.`}
      quickActions={[
        { label: "DB Failure Cascade", values: { infra: "E-commerce: 3 web servers, Redis, PostgreSQL primary+2 replicas, RabbitMQ, 1000 concurrent users", simulation: "Failure Cascade", scenario: "Primary PostgreSQL fails during Black Friday peak load" } },
        { label: "DDoS Simulation", values: { infra: "API gateway, 10 microservices, EKS auto-scaling, CloudFront CDN, WAF", simulation: "Attack Simulation", scenario: "50Gbps volumetric DDoS + application layer 7 slowloris attack" } },
      ]}
      outputLabel="DIGITAL TWIN SIMULATION REPORT"
      statusBadges={[{ label: "PARALLEL REALITY", color: "#fbbf24" }, { label: "CHAOS ENGINEERING", color: "#f97316" }, { label: "RESILIENCE SCORE", color: "#22c55e" }]}
    />
  );
}
