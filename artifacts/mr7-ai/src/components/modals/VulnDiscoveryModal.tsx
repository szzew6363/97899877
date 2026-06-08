import { Search } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Autonomous Vulnerability Discovery System — an AI that analyzes source code, binary artifacts, and runtime behavior to identify previously unknown security flaws. You perform: taint analysis for injection vulnerabilities, control flow graph analysis for logic flaws, state machine analysis for race conditions, cryptographic implementation audits, authentication/authorization bypass discovery, and insecure deserialization pattern detection. You produce: vulnerability descriptions with PoC sketch, CVSS score estimate, affected component, fix recommendations, and exploit difficulty rating. Respond in the same language as the user.`;

export function VulnDiscoveryModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Autonomous Vulnerability Discovery"
      subtitle="AI-driven flaw discovery — Taint analysis · Logic flaws · Race conditions · Crypto audits"
      color="#10b981"
      icon={<Search className="w-6 h-6" style={{ color: "#10b981" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "code", label: "Source Code / Binary Description / Function", placeholder: "paste code snippet, function, or describe the component behavior...", type: "textarea", rows: 7, span: "full" },
        { key: "lang", label: "Language / Platform", type: "select", defaultValue: "Auto-detect",
          options: ["Auto-detect", "C/C++", "Python", "JavaScript/Node.js", "Java", "Go", "PHP", "Ruby", "Rust", "Binary/Assembly"] },
        { key: "focus", label: "Vulnerability Focus", type: "select", defaultValue: "All Vulnerability Classes",
          options: ["All Vulnerability Classes", "Injection (SQLi/XSS/RCE)", "Authentication Bypass", "Race Conditions", "Memory Corruption", "Cryptographic Flaws", "Business Logic", "Deserialization"] },
      ]}
      buildPrompt={v => `LANGUAGE: ${v.lang}\nFOCUS: ${v.focus}\n\nCODE/COMPONENT:\n\`\`\`\n${v.code}\n\`\`\`\n\nPerform autonomous vulnerability discovery: identify all security flaws, provide CVSS estimates, PoC sketches, and remediation recommendations.`}
      quickActions={[
        { label: "SQL Injection", values: { code: 'query = "SELECT * FROM users WHERE id = " + user_input\ndb.execute(query)', lang: "Python", focus: "Injection (SQLi/XSS/RCE)" } },
        { label: "Auth Bypass", values: { code: "if (user.role == 'admin' || user.id == req.params.id) { return data; }", lang: "JavaScript/Node.js", focus: "Authentication Bypass" } },
      ]}
      outputLabel="VULNERABILITY DISCOVERY REPORT"
      statusBadges={[{ label: "ZERO-DAY FOCUS", color: "#10b981" }, { label: "TAINT ANALYSIS", color: "#0ea5e9" }, { label: "CVSS SCORING", color: "#6366f1" }]}
    />
  );
}
