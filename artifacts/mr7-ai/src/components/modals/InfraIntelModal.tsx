import { Layers } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Cross-Layer Infrastructure Intelligence System — an AI that unifies cloud, on-premises, edge, and IoT environments into a single observable AI-driven control plane. You map: east-west traffic flows, service mesh dependencies, cloud resource relationships, OT/IoT device topology, container orchestration attack surfaces, secret sprawl, IAM privilege graphs, and cross-environment lateral movement paths. You produce: unified topology map, risk heat map, privilege escalation paths, segmentation recommendations, and observability gaps. Respond in the same language as the user.`;

export function InfraIntelModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Cross-Layer Infrastructure Intelligence"
      subtitle="Unified cloud · on-prem · edge · IoT into a single AI-driven control plane"
      color="#fb923c"
      icon={<Layers className="w-6 h-6" style={{ color: "#fb923c" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "topology", label: "Infrastructure Topology Description", placeholder: "AWS VPC (us-east-1), 3 EKS clusters, RDS PostgreSQL, 200 IoT sensors on-prem, Cisco ASA firewall...", type: "textarea", rows: 4, span: "full" },
        { key: "layers", label: "Infrastructure Layers Present", type: "select", defaultValue: "Full Stack (Cloud+On-prem+IoT)",
          options: ["Cloud Only", "On-Prem Only", "Cloud + On-Prem", "Full Stack (Cloud+On-prem+IoT)", "Edge Computing", "OT/SCADA + IT"] },
        { key: "concern", label: "Primary Concern", type: "select", defaultValue: "Full Risk Assessment",
          options: ["Full Risk Assessment", "Lateral Movement Paths", "IAM Privilege Graph", "Segmentation Gaps", "Cloud Misconfiguration", "IoT/OT Attack Surface"] },
      ]}
      buildPrompt={v => `LAYERS: ${v.layers}\nCONCERN: ${v.concern}\n\nINFRASTRUCTURE:\n${v.topology}\n\nGenerate unified infrastructure intelligence: map topology, identify risk zones, lateral movement paths, segmentation gaps, and observability blind spots.`}
      quickActions={[
        { label: "AWS + On-Prem", values: { topology: "AWS VPC with 3 subnets, EC2 + RDS, VPN to on-prem datacenter with Windows AD, file servers, 50 workstations", layers: "Cloud + On-Prem", concern: "Lateral Movement Paths" } },
        { label: "ICS/SCADA", values: { topology: "Industrial control network: Siemens PLCs, historian server, engineering workstation connected to corporate IT via DMZ", layers: "OT/SCADA + IT", concern: "IoT/OT Attack Surface" } },
      ]}
      outputLabel="INFRASTRUCTURE INTELLIGENCE MAP"
      statusBadges={[{ label: "MULTI-LAYER", color: "#fb923c" }, { label: "CLOUD+OT+IoT", color: "#f97316" }, { label: "RISK HEAT MAP", color: "#ef4444" }]}
    />
  );
}
