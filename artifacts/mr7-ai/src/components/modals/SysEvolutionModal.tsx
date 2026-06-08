import { TrendingUp } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Continuous System Evolution Engine — an AI that autonomously rewrites system components over time to optimize security posture, performance characteristics, and scalability metrics without causing downtime. You design: rolling upgrade strategies, canary deployment plans, feature flag rollout sequences, zero-downtime database migrations, API versioning strategies, dependency lifecycle management plans, and technical debt elimination roadmaps. You produce: evolution timeline, component rewrite priority matrix, migration scripts outline, rollback checkpoints, and success metrics. Respond in the same language as the user.`;

export function SysEvolutionModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Continuous System Evolution Engine"
      subtitle="Autonomous system rewrites — Zero downtime · Security · Performance · Scalability"
      color="#4ade80"
      icon={<TrendingUp className="w-6 h-6" style={{ color: "#4ade80" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "system", label: "Current System State", placeholder: "PHP 7.2 monolith, MySQL 5.7, jQuery 1.x frontend, deployed on single server, 99.5% uptime SLA...", type: "textarea", rows: 4, span: "full" },
        { key: "target", label: "Target State", placeholder: "Microservices, PostgreSQL 15, React SPA, Kubernetes, 99.99% SLA..." },
        { key: "timeline", label: "Evolution Timeline", type: "select", defaultValue: "6 months",
          options: ["1 month (aggressive)", "3 months", "6 months", "12 months", "24 months (conservative)"] },
        { key: "constraint", label: "Zero-Downtime Constraint", type: "select", defaultValue: "Strict (no downtime allowed)",
          options: ["Strict (no downtime allowed)", "Maintenance windows OK", "Degraded mode acceptable", "Weekend downtime OK"] },
      ]}
      buildPrompt={v => `CURRENT STATE:\n${v.system}\nTARGET STATE: ${v.target || "Modern best practices"}\nTIMELINE: ${v.timeline}\nDOWNTIME CONSTRAINT: ${v.constraint}\n\nDesign continuous evolution plan: phase roadmap, component priorities, migration strategy, rollback checkpoints, success metrics.`}
      quickActions={[
        { label: "PHP → Node.js", values: { system: "PHP 7.2 monolith, MySQL 5.7, 50k users, 3 developers", target: "Node.js microservices, PostgreSQL, React, Docker", timeline: "12 months", constraint: "Strict (no downtime allowed)" } },
        { label: "Legacy → Cloud", values: { system: "On-prem Java EE app, Oracle DB, IBM WebSphere, 10 years old", target: "AWS Lambda + RDS + CloudFront, modern CI/CD", timeline: "24 months (conservative)", constraint: "Maintenance windows OK" } },
      ]}
      outputLabel="SYSTEM EVOLUTION ROADMAP"
      statusBadges={[{ label: "ZERO DOWNTIME", color: "#4ade80" }, { label: "PHASED EVOLUTION", color: "#22c55e" }, { label: "AUTO-OPTIMIZE", color: "#a78bfa" }]}
    />
  );
}
