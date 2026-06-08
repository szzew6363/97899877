import { Microscope } from "lucide-react";
import { AIStreamModule } from "@/components/AIStreamModule";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const SYSTEM = `You are the Low-Level System Observation Engine — a kernel-aware AI that monitors and analyzes system internals at the lowest observable level. You examine: kernel module behavior and rootkit indicators, system call sequences and argument patterns, hardware interrupt timing anomalies, CPU execution timing side-channels, memory page access patterns, DMA and I/O port activity, hypervisor escape indicators, and firmware-level persistence mechanisms. You produce kernel forensics reports with exact syscall tables, timing signatures, and stealth mechanism classifications. Respond in the same language as the user.`;

export function SysObsModal({ open, onOpenChange }: Props) {
  return (
    <AIStreamModule
      open={open} onOpenChange={onOpenChange}
      title="System Observation Engine"
      subtitle="Kernel-level monitoring — Syscalls · Hardware signals · Timing anomalies · Rootkits"
      color="#ec4899"
      icon={<Microscope className="w-6 h-6" style={{ color: "#ec4899" }} />}
      systemPrompt={SYSTEM}
      fields={[
        { key: "syscalls", label: "Syscall / Kernel Event Log", placeholder: "execve(\"/bin/sh\") uid=0\nopen(\"/etc/shadow\") O_RDONLY\nptrace(ATTACH, 1337)...", type: "textarea", rows: 5, span: "full" },
        { key: "kernel", label: "Kernel Version / OS", placeholder: "Linux 5.15.0 / Windows 10 22H2 / macOS 13.6" },
        { key: "focus", label: "Analysis Focus", type: "select", defaultValue: "Full Spectrum",
          options: ["Full Spectrum", "Rootkit Detection", "Privilege Escalation", "Hypervisor Escape", "Timing Side-Channel", "DMA Attack", "Firmware Persistence"] },
      ]}
      buildPrompt={v => `KERNEL/OS: ${v.kernel || "Unknown"}\nFOCUS: ${v.focus}\n\nSYSCALL/EVENT LOG:\n${v.syscalls}\n\nPerform low-level system observation analysis: classify syscall patterns, identify privilege escalations, detect stealth mechanisms, map attack vectors.`}
      quickActions={[
        { label: "Rootkit Indicators", values: { syscalls: "init_module(malicious.ko)\nsys_call_table[__NR_kill] modified\n/proc/1234 hidden from readdir", kernel: "Linux 5.15.0", focus: "Rootkit Detection" } },
        { label: "Privilege Escalation", values: { syscalls: "setuid(0) from uid=1000\nexecve(/bin/bash) uid=0\nptrace(ATTACH, 1) EPERM\nmmap(0x0, PROT_WRITE|EXEC)", kernel: "Linux 5.4.0", focus: "Privilege Escalation" } },
      ]}
      outputLabel="KERNEL FORENSICS REPORT"
      statusBadges={[{ label: "KERNEL LEVEL", color: "#ec4899" }, { label: "ROOTKIT DETECT", color: "#e21227" }, { label: "TIMING ANALYSIS", color: "#f59e0b" }]}
    />
  );
}
