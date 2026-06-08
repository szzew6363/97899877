import { FileSearch } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Autonomous Forensic Reconstruction System — an AI that rebuilds full cyber incidents step-by-step, reconstructing attacker behavior, complete timelines, lateral movement paths, data accessed, tools deployed, and full impact mapping. You analyze: file system artifacts, registry changes, event log patterns, network flow records, memory dumps, and volatile data artifacts. You produce: complete incident timeline, attacker TTP map, data breach scope assessment, evidence chain of custody notes, legal-quality incident report, and lessons learned. Respond in the same language as the user.`;

export function ForensicReconModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="Autonomous Forensic Reconstruction"
      subtitle="Rebuilds full cyber incidents — Timeline · TTPs · Data scope · Legal report"
      color="#818cf8"
      icon={<FileSearch className="w-6 h-6" style={{ color: "#818cf8" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "artifacts", label: "Forensic Artifacts / Evidence", placeholder: "Windows Event Log 4624/4625/4688\nPrefetch: mimikatz.exe, psexec.exe\nRegistry: Run key added\nNetwork: beaconing to 185.x.x.x port 443\nFiles: encrypted with .locked extension", type: "textarea", rows: 6, span: "full" },
        { key: "systems", label: "Affected Systems", placeholder: "DC01 (Windows Server 2019), FILE01, WRK-HR-05, WRK-FIN-12" },
        { key: "timeframe", label: "Incident Timeframe", placeholder: "Detected: 2024-01-15 09:30 UTC / Discovery: 2 days later" },
        { key: "output", label: "Report Format", type: "select", defaultValue: "Full Forensic Report",
          options: ["Full Forensic Report", "Executive Summary Only", "Technical Deep Dive", "Legal/Regulatory", "DFIR Timeline", "Lessons Learned Focus"] },
      ]}
      buildPrompt={v => `AFFECTED SYSTEMS: ${v.systems || "Unknown"}\nTIMEFRAME: ${v.timeframe || "Unknown"}\nREPORT FORMAT: ${v.output}\n\nFORENSIC ARTIFACTS:\n${v.artifacts}\n\nReconstruct complete incident: timeline, attacker behavior, TTPs, data accessed, impact scope, legal-quality findings.`}
      quickActions={[
        { label: "Ransomware Incident", values: { artifacts: "Event 4624: admin login 02:33 from unusual IP\nEvent 4688: cmd.exe → vssadmin delete shadows\nEvent 4648: lateral movement to FILE01\nFiles: README_RANSOM.txt, .encrypted extension", systems: "DC01, FILE01, 15 workstations", timeframe: "Incident: 2024-01-10 02:30 - 05:00 UTC", output: "Full Forensic Report" } },
        { label: "Data Exfil", values: { artifacts: "Outbound HTTPS 50GB over 3 days to Mega.nz\nNew admin account: svc_help2\nSQLDUMP detected in temp folder\nAV exclusion added via GPO", systems: "DBSRV01, WEBAPP02, domain controller", timeframe: "Ongoing for 3 weeks before detection", output: "Legal/Regulatory" } },
      ]}
      outputLabel="FORENSIC RECONSTRUCTION REPORT"
      statusBadges={[{ label: "DFIR GRADE", color: "#818cf8" }, { label: "LEGAL QUALITY", color: "#6366f1" }, { label: "FULL TIMELINE", color: "#a78bfa" }]}
    />
  );
}
