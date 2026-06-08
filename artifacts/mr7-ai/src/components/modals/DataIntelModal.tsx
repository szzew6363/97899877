import { Database } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Multi-Dimensional Data Intelligence Engine — an AI that merges structured, unstructured, and streaming data into a single semantic understanding layer. You perform: cross-source data correlation, semantic entity extraction and linking, temporal pattern mining, anomaly detection in data streams, knowledge graph construction from raw data, PII/sensitive data discovery, and data lineage reconstruction. You produce: unified data model, semantic entity map, anomaly findings, data risk assessment, and intelligence extraction recommendations. Respond in the same language as the user.`;

export function DataIntelModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Multi-Dimensional Data Intelligence"
      subtitle="Merges structured · unstructured · streaming data into semantic understanding"
      color="#06b6d4"
      icon={<Database className="w-6 h-6" style={{ color: "#06b6d4" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "data", label: "Data Description / Sample / Schema", placeholder: "Table: users(id, email, ip_address, created_at)\nLogs: nginx access, syslog\nStreams: Kafka topic user_events...", type: "textarea", rows: 5, span: "full" },
        { key: "sources", label: "Data Sources", type: "select", defaultValue: "Mixed (SQL + Logs + Streams)",
          options: ["SQL/Relational", "NoSQL/Document", "Log Files", "Event Streams", "Mixed (SQL + Logs + Streams)", "Unstructured Text", "Time-Series"] },
        { key: "goal", label: "Intelligence Goal", type: "select", defaultValue: "Full Intelligence Extraction",
          options: ["Full Intelligence Extraction", "PII/Sensitive Discovery", "Anomaly Detection", "Knowledge Graph Build", "Data Lineage Map", "Correlation Analysis"] },
      ]}
      buildPrompt={v => `DATA SOURCES: ${v.sources}\nINTELLIGENCE GOAL: ${v.goal}\n\nDATA DESCRIPTION:\n${v.data}\n\nPerform multi-dimensional intelligence analysis: correlate sources, extract entities, detect anomalies, map relationships, assess data risks.`}
      quickActions={[
        { label: "PII Discovery", values: { data: "users table: name, email, ssn, dob, credit_card\norders: billing_address, payment_token\nlogs: IP addresses in plain text", sources: "SQL/Relational", goal: "PII/Sensitive Discovery" } },
        { label: "Log Correlation", values: { data: "nginx: 10M requests/day\nauth logs: login events\napplication: error traces\nAll in separate silos, different formats", sources: "Mixed (SQL + Logs + Streams)", goal: "Anomaly Detection" } },
      ]}
      outputLabel="DATA INTELLIGENCE REPORT"
      statusBadges={[{ label: "SEMANTIC LAYER", color: "#06b6d4" }, { label: "CROSS-SOURCE", color: "#0ea5e9" }, { label: "KNOWLEDGE GRAPH", color: "#38bdf8" }]}
    />
  );
}
