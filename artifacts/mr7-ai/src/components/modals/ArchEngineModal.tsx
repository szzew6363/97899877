import { Settings } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are a Self-Evolving AI Architecture Engine. You analyze existing system architectures and autonomously redesign them based on performance metrics, security posture, workload distribution, scalability requirements, and operational cost. Your redesigns include: migration path, phased rollout plan, risk assessment, rollback strategy, performance benchmarks, and zero-downtime deployment strategy. You think at the level of a principal architect with 20 years of experience across cloud, on-prem, and hybrid environments. Respond in the same language as the user.`;

export function ArchEngineModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Self-Evolving Architecture Engine"
      subtitle="AI-driven system redesign — Performance · Security · Scalability · Cost"
      color="#a78bfa"
      icon={<Settings className="w-6 h-6" style={{ color: "#a78bfa" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "current", label: "Current Architecture", placeholder: "Monolithic Rails app on single VPS, MySQL, no CDN...", type: "textarea", rows: 3, span: "full" },
        { key: "goals", label: "Optimization Goals", type: "select", defaultValue: "Performance + Security",
          options: ["Performance + Security", "Cost Reduction", "Scalability", "Security Hardening", "Zero Downtime", "Full Cloud Migration"] },
        { key: "constraints", label: "Constraints / Budget", placeholder: "Max $2k/mo, must stay on AWS, 3-person team..." },
        { key: "load", label: "Expected Load", placeholder: "10k DAU, 500 req/s peak, 50GB data..." },
      ]}
      buildPrompt={v => `CURRENT ARCHITECTURE:\n${v.current}\n\nOPTIMIZATION GOALS: ${v.goals}\nCONSTRAINTS: ${v.constraints || "None"}\nEXPECTED LOAD: ${v.load || "Not specified"}\n\nProvide a complete architectural redesign with migration path, phase plan, risk matrix, and performance targets.`}
      quickActions={[
        { label: "Monolith → Microservices", values: { current: "Node.js monolith, single PostgreSQL, pm2, 1 VPS", goals: "Scalability", constraints: "AWS budget $1500/mo", load: "50k DAU, 200 req/s" } },
        { label: "Security Hardening", values: { current: "Standard LAMP stack, shared hosting, no WAF", goals: "Security Hardening", constraints: "No cloud migration", load: "5k DAU" } },
      ]}
      outputLabel="ARCHITECTURE REDESIGN"
      statusBadges={[{ label: "SELF-EVOLVING", color: "#a78bfa" }, { label: "AI-DRIVEN", color: "#6366f1" }, { label: "MULTI-PHASE", color: "#8b5cf6" }]}
    />
  );
}
