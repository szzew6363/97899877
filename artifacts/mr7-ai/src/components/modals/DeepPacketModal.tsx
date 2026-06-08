import { Wifi } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Deep Packet Cognition Engine — an AI that reconstructs encrypted and fragmented network sessions into meaningful behavioral insights without breaking encryption. Using metadata analysis, timing patterns, flow statistics, and traffic fingerprinting, you identify: application protocols inside encrypted tunnels, user behavior patterns, covert channel communications, data exfiltration over DNS/ICMP/HTTPS, C2 beaconing signatures, and anomalous traffic flows. You produce: protocol reconstruction, behavioral session map, anomaly classification, and traffic intelligence report. Respond in the same language as the user.`;

export function DeepPacketModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Deep Packet Cognition Engine"
      subtitle="Encrypted session reconstruction via metadata · Timing · Flow statistics"
      color="#0ea5e9"
      icon={<Wifi className="w-6 h-6" style={{ color: "#0ea5e9" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "traffic", label: "Traffic Description / Flow Stats / PCAP Summary", placeholder: "HTTPS flows to 185.220.x.x every 300s, avg 2KB payload\nDNS queries: unusually long labels, TXT records with base64...", type: "textarea", rows: 5, span: "full" },
        { key: "protocol", label: "Protocol Context", type: "select", defaultValue: "Mixed/Unknown",
          options: ["Mixed/Unknown", "HTTPS/TLS", "DNS", "ICMP", "SSH", "Custom/Proprietary", "SMB", "RDP", "WebSocket"] },
        { key: "goal", label: "Analysis Goal", type: "select", defaultValue: "Full Behavioral Analysis",
          options: ["Full Behavioral Analysis", "C2 Beaconing Detection", "Data Exfiltration Hunt", "Covert Channel Detection", "Protocol Identification", "User Behavior Map"] },
      ]}
      buildPrompt={v => `PROTOCOL CONTEXT: ${v.protocol}\nANALYSIS GOAL: ${v.goal}\n\nTRAFFIC DATA:\n${v.traffic}\n\nPerform deep packet cognition: reconstruct sessions, identify protocols, map behavior, detect anomalies without decryption.`}
      quickActions={[
        { label: "DNS Exfil", values: { traffic: "DNS queries: a2VhbGluZ3BhdGg=.evil.com, base64-like labels\n200 queries/hour to same domain, TXT responses with encoded data", protocol: "DNS", goal: "Data Exfiltration Hunt" } },
        { label: "C2 Beacon", values: { traffic: "HTTPS to 185.220.101.45:443, interval exactly 300s ±5s\nPayload size 1.2-1.4KB consistently, JA3: d0ec4b50a6a...", protocol: "HTTPS/TLS", goal: "C2 Beaconing Detection" } },
      ]}
      outputLabel="DEEP PACKET COGNITION REPORT"
      statusBadges={[{ label: "ENCRYPTED TRAFFIC", color: "#0ea5e9" }, { label: "METADATA ANALYSIS", color: "#38bdf8" }, { label: "COVERT CHANNELS", color: "#818cf8" }]}
    />
  );
}
