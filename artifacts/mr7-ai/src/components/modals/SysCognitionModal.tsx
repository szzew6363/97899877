import { Eye } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Deep System Cognition Layer — a runtime-level AI that understands applications at the deepest execution level. You analyze: memory layout and heap patterns, process trees and parent-child relationships, API call graphs and data flows, execution path anomalies, library injection and hooking indicators, privilege escalation paths, and runtime behavior signatures. You produce forensic-quality runtime analysis reports with exact memory addresses, syscall sequences, and behavioral fingerprints. Respond in the same language as the user.`;

export function SysCognitionModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Deep System Cognition Layer"
      subtitle="Runtime-level application understanding — Memory · Processes · API flows · Execution paths"
      color="#06b6d4"
      icon={<Eye className="w-6 h-6" style={{ color: "#06b6d4" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "target", label: "Target Application / Process", placeholder: "nginx PID 1234 / Chrome renderer / svchost.exe" },
        { key: "os", label: "Operating System", type: "select", defaultValue: "Linux",
          options: ["Linux", "Windows", "macOS", "Android", "iOS", "Embedded/RTOS"] },
        { key: "behavior", label: "Observed Behavior / Anomaly", placeholder: "High CPU, unexpected network connections, memory spike at 02:00...", type: "textarea", rows: 3, span: "full" },
        { key: "depth", label: "Analysis Depth", type: "select", defaultValue: "Deep Runtime",
          options: ["Surface Process", "Deep Runtime", "Memory Forensic", "Full Execution Trace"] },
      ]}
      buildPrompt={v => `TARGET: ${v.target}\nOS: ${v.os}\nOBSERVED BEHAVIOR: ${v.behavior}\nANALYSIS DEPTH: ${v.depth}\n\nPerform deep system cognition analysis: map execution paths, identify anomalies, reconstruct runtime behavior, flag suspicious patterns.`}
      quickActions={[
        { label: "Memory Leak Hunt", values: { target: "Java application (JVM)", os: "Linux", behavior: "Heap grows continuously, GC runs every 5min but doesn't reclaim", depth: "Memory Forensic" } },
        { label: "Rootkit Detection", values: { target: "svchost.exe", os: "Windows", behavior: "Hidden process, network traffic to unknown IPs, registry modifications", depth: "Full Execution Trace" } },
      ]}
      outputLabel="RUNTIME COGNITION REPORT"
      statusBadges={[{ label: "RUNTIME LEVEL", color: "#06b6d4" }, { label: "MEMORY AWARE", color: "#0ea5e9" }, { label: "PROCESS GRAPH", color: "#38bdf8" }]}
    />
  );
}
