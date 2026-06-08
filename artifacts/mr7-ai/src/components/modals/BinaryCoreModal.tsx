import { Code2 } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Binary Intelligence Reverse-Engineering Core — an expert AI that reconstructs full software logic from compiled artifacts. You analyze: assembly code, hex dumps, bytecode, decompiled pseudocode, import/export tables, string artifacts, and behavioral traces. You reconstruct: program intent, algorithm logic, encryption schemes, obfuscation techniques, anti-analysis mechanisms, C2 communication protocols, and vulnerability locations. You produce annotated disassembly with function purpose labels, data structure definitions, and vulnerability markers. Respond in the same language as the user.`;

export function BinaryCoreModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Binary Intelligence RE Core"
      subtitle="Reconstructs full software logic from compiled artifacts — Assembly · Bytecode · Logic"
      color="#00ff41"
      icon={<Code2 className="w-6 h-6" style={{ color: "#00ff41" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "binary", label: "Binary / Assembly / Hex / Pseudocode Input", placeholder: "55 8B EC 83 EC 10 56 57 8B 7D 08...\n\nor paste decompiled pseudocode / IDA output...", type: "textarea", rows: 6, span: "full" },
        { key: "type", label: "Input Type", type: "select", defaultValue: "Assembly (x86/x64)",
          options: ["Assembly (x86/x64)", "ARM Assembly", "Hex Dump", "Decompiled C Pseudocode", "Java Bytecode", "Python Bytecode", "Shellcode"] },
        { key: "goal", label: "RE Goal", type: "select", defaultValue: "Full Logic Reconstruction",
          options: ["Full Logic Reconstruction", "Find Vulnerabilities", "Extract Encryption Keys", "Map C2 Protocol", "Detect Anti-Analysis", "Identify Malware Family"] },
      ]}
      buildPrompt={v => `INPUT TYPE: ${v.type}\nRE GOAL: ${v.goal}\n\nBINARY/CODE INPUT:\n\`\`\`\n${v.binary}\n\`\`\`\n\nPerform full reverse engineering analysis: reconstruct logic, label functions, identify algorithms, find vulnerabilities, document findings.`}
      quickActions={[
        { label: "XOR Decrypt", values: { binary: "EB 0E 58 80 30 41 40 48 74 06 80 38 00 75 F7 C3", type: "Assembly (x86/x64)", goal: "Extract Encryption Keys" } },
        { label: "Shellcode", values: { binary: "31 c0 50 68 2f 2f 73 68 68 2f 62 69 6e 89 e3 50 53 89 e1 b0 0b cd 80", type: "Shellcode", goal: "Full Logic Reconstruction" } },
      ]}
      outputLabel="REVERSE ENGINEERING REPORT"
      statusBadges={[{ label: "MULTI-ARCH", color: "#00ff41" }, { label: "LOGIC RECONSTRUCTION", color: "#4ade80" }, { label: "VULN DETECTION", color: "#e21227" }]}
    />
  );
}
