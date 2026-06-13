export type ThreatSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ThreatEntry = {
  id: string;
  cveId: string;
  title: string;
  description: string;
  score: number;
  severity: ThreatSeverity;
  category: string;
  published: number;
  isNew?: boolean;
};

const SEED_THREATS: Omit<ThreatEntry, "id" | "published">[] = [
  { cveId: "CVE-2025-32433", title: "Erlang/OTP SSH RCE", description: "Remote code execution via unauthenticated SSH handshake in OTP", score: 10.0, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-24054", title: "Windows NTLM Auth Bypass", description: "Hash disclosure via crafted .library-ms file — NTLM credential leak", score: 9.3, severity: "CRITICAL", category: "Auth Bypass" },
  { cveId: "CVE-2025-29824", title: "Windows CLFS LPE", description: "Privilege escalation via Common Log File System driver heap overflow", score: 9.0, severity: "CRITICAL", category: "LPE" },
  { cveId: "CVE-2025-21333", title: "Windows Hyper-V PE", description: "Heap-based buffer overflow in VSP allows guest→host escape", score: 9.1, severity: "CRITICAL", category: "VM Escape" },
  { cveId: "CVE-2025-0282", title: "Ivanti Connect Secure RCE", description: "Stack overflow in pre-auth phase allows unauthenticated RCE on VPN", score: 9.0, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-22457", title: "Pulse Connect RCE", description: "Unauthenticated stack overflow → remote code execution via HTTP", score: 9.0, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-1974", title: "Kubernetes IngressNightmare", description: "Arbitrary code injection via malicious admission webhook controller", score: 9.8, severity: "CRITICAL", category: "Kubernetes" },
  { cveId: "CVE-2025-24813", title: "Apache Tomcat Partial PUT RCE", description: "Deserialization of uploaded session data enables remote execution", score: 9.8, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-31200", title: "Apple CoreAudio RCE", description: "Processing malicious audio stream triggers memory corruption in kernel", score: 9.5, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2024-3400", title: "PAN-OS Command Injection", description: "Unauthenticated command injection via GlobalProtect gateway — exploited in wild", score: 10.0, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2024-38063", title: "Windows TCP/IP IPv6 RCE", description: "Remote code execution via specially crafted IPv6 packets, pre-auth", score: 9.8, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-26633", title: "Windows MMC File Spoofing", description: ".msc file processed without proper validation — code execution via UNC path", score: 8.8, severity: "HIGH", category: "Spoofing" },
  { cveId: "CVE-2025-27363", title: "FreeType OOB Write", description: "Out-of-bounds write when parsing TrueType GX/AAT fonts — exploited in wild", score: 8.1, severity: "HIGH", category: "Memory Corruption" },
  { cveId: "CVE-2025-30065", title: "Apache Parquet RCE", description: "Schema parsing in parquet-avro allows arbitrary code via crafted file", score: 10.0, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-24200", title: "Apple USB Restricted Mode", description: "Physical attack bypasses USB Restricted Mode — exploited against targets", score: 6.1, severity: "MEDIUM", category: "Auth Bypass" },
  { cveId: "CVE-2025-21334", title: "Windows Hyper-V TOCTOU", description: "Time-of-check/time-of-use race in VSMB allows elevation of privilege", score: 8.8, severity: "HIGH", category: "LPE" },
  { cveId: "CVE-2025-23006", title: "SonicWall SMA RCE", description: "Pre-auth deserialization flaw in SonicWall SMA 1000 appliances", score: 9.8, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-21293", title: "Active Directory LPE", description: "Authenticated privilege escalation via AD schema write access", score: 8.8, severity: "HIGH", category: "LPE" },
  { cveId: "CVE-2024-49113", title: "Windows LDAP DoS", description: "Unauthenticated crash of LSASS via malformed LDAP response — wormable", score: 7.5, severity: "HIGH", category: "DoS" },
  { cveId: "CVE-2024-47574", title: "FortiClient EMS SQLi", description: "SQL injection via CSF endpoint — no auth required, leads to RCE", score: 9.3, severity: "CRITICAL", category: "SQLi" },
  { cveId: "CVE-2025-25257", title: "Fortinet FortiWeb Auth Bypass", description: "JWT signature bypass via algorithm confusion attack on admin endpoint", score: 9.6, severity: "CRITICAL", category: "Auth Bypass" },
  { cveId: "CVE-2025-31324", title: "SAP NetWeaver RCE", description: "Unauthenticated file upload to metadata upload endpoint → RCE", score: 10.0, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-26319", title: "FlowiseAI SSRF", description: "Unauthenticated SSRF in Flowise AI chatbot platform — internal exposure", score: 7.2, severity: "HIGH", category: "SSRF" },
  { cveId: "CVE-2025-27218", title: "NAKIVO Backup RCE", description: "Arbitrary file write via director API — pre-auth, leads to code execution", score: 9.8, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2025-24472", title: "Fortinet FortiOS CSF", description: "Authentication bypass via crafted CSF connection request — admin access", score: 9.8, severity: "CRITICAL", category: "Auth Bypass" },
  { cveId: "CVE-2025-30406", title: "Gladinet CentreStack RCE", description: "Hardcoded machineKey leads to deserialization RCE on file server", score: 9.0, severity: "CRITICAL", category: "RCE" },
  { cveId: "CVE-2024-55591", title: "Fortinet FortiOS Node.js", description: "Auth bypass via crafted Node.js WebSocket request — admin session spoof", score: 9.8, severity: "CRITICAL", category: "Auth Bypass" },
  { cveId: "CVE-2025-21388", title: "Microsoft Outlook SSRF", description: "Server-side request forgery via malicious calendar invitation file", score: 6.5, severity: "MEDIUM", category: "SSRF" },
  { cveId: "CVE-2025-0108", title: "Palo Alto PAN-OS Auth Bypass", description: "Authentication bypass via crafted PHP script in management interface", score: 8.8, severity: "HIGH", category: "Auth Bypass" },
  { cveId: "CVE-2025-29891", title: "Apache Camel OGNL Injection", description: "OGNL injection via malicious message header in Apache Camel routes", score: 8.1, severity: "HIGH", category: "Injection" },
];

let _counter = 0;
function makeEntry(base: Omit<ThreatEntry, "id" | "published">, isNew = false): ThreatEntry {
  return { ...base, id: `t-${++_counter}`, published: Date.now() - Math.floor(Math.random() * 86400000 * 7), isNew };
}

export const SEVERITY_COLOR: Record<ThreatSeverity, string> = {
  CRITICAL: "#e21227",
  HIGH:     "#f97316",
  MEDIUM:   "#f59e0b",
  LOW:      "#22c55e",
  INFO:     "#00e5ff",
};

class ThreatFeedEngine {
  private feed: ThreatEntry[] = SEED_THREATS.map((t) => makeEntry(t));
  private subscribers = new Set<(e: ThreatEntry) => void>();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  getFeed(): ThreatEntry[] { return this.feed; }

  subscribe(cb: (e: ThreatEntry) => void): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      const base = SEED_THREATS[Math.floor(Math.random() * SEED_THREATS.length)];
      const entry = makeEntry({
        ...base,
        cveId: `CVE-2025-${Math.floor(10000 + Math.random() * 89999)}`,
      }, true);
      this.feed.unshift(entry);
      if (this.feed.length > 200) this.feed.pop();
      this.subscribers.forEach((cb) => cb(entry));
    }, 18000 + Math.random() * 12000);
  }

  stop() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }
}

export const threatFeed = new ThreatFeedEngine();
