import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, Target, Zap, Terminal, AlertTriangle, CheckCircle,
  Play, Square, RotateCcw, Download, Eye, Lock, Crosshair,
  Network, Cpu, Globe, Activity, FileText, Settings,
  ChevronRight, ChevronDown, Layers, Brain, Flame, Swords,
  Radio, Bug, Search, Database, BarChart2, Users, Clock,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

// ── MITRE ATT&CK tactics ──────────────────────────────────────────────────────
const MITRE_TACTICS = [
  { id: "recon", name: "Reconnaissance", color: "#00e5ff", techniques: ["T1595 - Active Scanning","T1592 - Gather Host Info","T1589 - Gather Victim Identity","T1590 - Gather Network Info","T1591 - Gather Org Info","T1598 - Phishing for Info"] },
  { id: "resource", name: "Resource Dev", color: "#a78bfa", techniques: ["T1583 - Acquire Infrastructure","T1588 - Obtain Capabilities","T1585 - Establish Accounts","T1586 - Compromise Accounts","T1584 - Compromise Infrastructure"] },
  { id: "initial", name: "Initial Access", color: "#f97316", techniques: ["T1190 - Exploit Public App","T1566 - Phishing","T1133 - External Remote Svcs","T1078 - Valid Accounts","T1091 - Removable Media"] },
  { id: "execution", name: "Execution", color: "#fbbf24", techniques: ["T1059 - Command & Script","T1203 - Client Execution","T1204 - User Execution","T1053 - Scheduled Task","T1569 - System Services"] },
  { id: "persistence", name: "Persistence", color: "#4ade80", techniques: ["T1547 - Boot Autostart","T1543 - Create/Modify Service","T1098 - Account Manipulation","T1136 - Create Account","T1505 - Server Software"] },
  { id: "privesc", name: "Priv Escalation", color: "#fb923c", techniques: ["T1548 - Abuse Elevation","T1134 - Access Token Manip","T1068 - Exploit for Priv Esc","T1055 - Process Injection","T1053 - Scheduled Task"] },
  { id: "defense", name: "Defense Evasion", color: "#e21227", techniques: ["T1140 - Deobfuscate/Decode","T1562 - Impair Defenses","T1036 - Masquerading","T1027 - Obfuscated Files","T1070 - Indicator Removal"] },
  { id: "credential", name: "Credential Access", color: "#c084fc", techniques: ["T1110 - Brute Force","T1555 - Creds from Stores","T1003 - OS Credential Dump","T1552 - Unsecured Creds","T1558 - Steal Kerberos"] },
  { id: "discovery", name: "Discovery", color: "#38bdf8", techniques: ["T1087 - Account Discovery","T1083 - File Discovery","T1046 - Network Scan","T1135 - Network Share","T1082 - System Info"] },
  { id: "lateral", name: "Lateral Movement", color: "#34d399", techniques: ["T1210 - Exploit Remote Svcs","T1534 - Internal Spearphish","T1570 - Lateral Tool Transfer","T1563 - Remote Service Session","T1021 - Remote Services"] },
  { id: "collection", name: "Collection", color: "#f472b6", techniques: ["T1560 - Archive Collected","T1074 - Data Staged","T1213 - Data from Info Repos","T1005 - Data from Local Sys","T1119 - Automated Collection"] },
  { id: "exfil", name: "Exfiltration", color: "#ff4444", techniques: ["T1048 - Exfil Over Alt Proto","T1041 - Exfil Over C2","T1567 - Exfil Over Web Svc","T1020 - Automated Exfil","T1030 - Data Transfer Limit"] },
];

// ── Modules ───────────────────────────────────────────────────────────────────
const ARTP_MODULES = [
  { id: "osint", name: "OSINT Engine", icon: Search, color: "#00e5ff", desc: "Domain enum · Cloud discovery · Dark web · GitHub secrets · WHOIS history", status: "ready" },
  { id: "vuln", name: "Vuln Scanner", icon: Bug, color: "#fbbf24", desc: "OpenVAS · Nessus · Nmap NSE · SSL/TLS · Cloud config · CVE correlation", status: "ready" },
  { id: "exploit", name: "Exploit Framework", icon: Swords, color: "#e21227", desc: "Metasploit RPC · Custom payloads · Safe guards · Scope enforcement · Sandbox", status: "ready" },
  { id: "phishing", name: "Phishing Sim", icon: Radio, color: "#f97316", desc: "Template campaigns · Site cloner · Click tracking · LMS integration", status: "ready" },
  { id: "lateral", name: "Lateral Movement", icon: Network, color: "#a855f7", desc: "BloodHound-style graphs · Pivot chains · Credential reuse · Tunneling", status: "ready" },
  { id: "c2", name: "C2 Framework", icon: Cpu, color: "#4ade80", desc: "Beacon management · DNS/HTTPS tunnels · Implant generation · Callback routing", status: "ready" },
  { id: "forensics", name: "Forensics", icon: Database, color: "#38bdf8", desc: "Disk · Memory · Network · Mobile · Timeline · Registry · Log correlation", status: "ready" },
  { id: "report", name: "Report Engine", icon: FileText, color: "#f472b6", desc: "DOCX/PDF · CVSS scoring · NIST/ISO/PCI compliance · JIRA integration", status: "ready" },
];

// ── Engagement phases ─────────────────────────────────────────────────────────
const PHASES = [
  { id: "scoping", name: "Scoping & Authorization", color: "#00e5ff", steps: ["Rules of Engagement upload","IP/Domain whitelist validation","Legal contract verification","Digital signature check","Scope boundary enforcement"] },
  { id: "recon", name: "Reconnaissance", color: "#38bdf8", steps: ["Passive OSINT gathering","Active subdomain enumeration","Cloud asset discovery","Social media intelligence","GitHub secret scanning"] },
  { id: "enum", name: "Enumeration", color: "#a78bfa", steps: ["Port & service scanning","Banner grabbing","SSL/TLS analysis","Web technology fingerprint","User & share enumeration"] },
  { id: "vuln", name: "Vulnerability Analysis", color: "#fbbf24", steps: ["CVE correlation","Risk scoring (CVSS)","False positive reduction","Exploit availability check","Attack vector mapping"] },
  { id: "exploit", name: "Exploitation (Authorized)", color: "#e21227", steps: ["Scope validation gate","Payload generation","Controlled exploit delivery","Shell acquisition","Privilege escalation"] },
  { id: "post", name: "Post-Exploitation", color: "#f97316", steps: ["Credential harvesting","Lateral movement","C2 establishment","Data exfiltration sim","Persistence simulation"] },
  { id: "cleanup", name: "Cleanup & Reporting", color: "#4ade80", steps: ["Artifact removal","Log restoration","Executive report","Technical remediation","Compliance mapping"] },
];

// ── Live findings feed ────────────────────────────────────────────────────────
const SAMPLE_FINDINGS = [
  { sev: "CRITICAL", cvss: 9.8, id: "CVE-2023-44487", title: "HTTP/2 Rapid Reset DDoS", host: "10.0.0.45", port: "443", status: "verified" },
  { sev: "HIGH", cvss: 8.8, id: "CVE-2023-46604", title: "Apache ActiveMQ RCE", host: "10.0.0.12", port: "61616", status: "exploited" },
  { sev: "HIGH", cvss: 8.1, id: "CVE-2023-23397", title: "Outlook NTLM Relay", host: "10.0.0.3", port: "445", status: "verified" },
  { sev: "HIGH", cvss: 7.8, id: "CVE-2023-38831", title: "WinRAR Code Execution", host: "10.0.0.55", port: "N/A", status: "pending" },
  { sev: "MEDIUM", cvss: 6.5, id: "CVE-2023-20198", title: "Cisco IOS XE Priv Esc", host: "10.0.0.1", port: "443", status: "verified" },
  { sev: "MEDIUM", cvss: 6.1, id: "CVE-2023-4863", title: "WebP Heap Buffer Overflow", host: "10.0.0.77", port: "80", status: "pending" },
  { sev: "LOW", cvss: 3.7, id: "CVE-2023-5217", title: "VP8 Encoding Overflow", host: "10.0.0.22", port: "443", status: "mitigated" },
];

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#fbbf24", LOW: "#4ade80",
};

// ── 3D Canvas HUD ─────────────────────────────────────────────────────────────
function ARTPCanvas({ phase }: { phase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    function resize() { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    // nodes
    const nodes: { x: number; y: number; vx: number; vy: number; r: number; color: string; pulse: number }[] = [];
    for (let i = 0; i < 40; i++) {
      nodes.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003, vy: (Math.random() - 0.5) * 0.0003,
        r: 1.5 + Math.random() * 3,
        color: ["#00e5ff","#e21227","#fbbf24","#a855f7","#4ade80"][Math.floor(Math.random() * 5)],
        pulse: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.01;
      const t = tRef.current;
      const W = cv.width, H = cv.height;

      ctx.clearRect(0, 0, W, H);

      // grid
      ctx.strokeStyle = "rgba(0,229,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // phase progress arc
      const cx2 = W * 0.82, cy2 = H * 0.5, rad = Math.min(W, H) * 0.28;
      const prog = phase < 0 ? 0 : (phase + 1) / PHASES.length;
      ctx.beginPath();
      ctx.arc(cx2, cy2, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.strokeStyle = `rgba(226,18,39,${0.4 + 0.3 * Math.sin(t * 2)})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx2, cy2, rad, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(226,18,39,0.1)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // pulsing rings
      for (let r = 0; r < 3; r++) {
        const pr = (((t * 0.4 + r * 0.33) % 1)) * rad * 1.4;
        ctx.beginPath();
        ctx.arc(cx2, cy2, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(226,18,39,${0.15 * (1 - pr / (rad * 1.4))})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
        const px = n.x * W * 0.7, py = n.y * H;
        const alpha = 0.5 + 0.5 * Math.sin(t * 1.5 + n.pulse);
        ctx.beginPath();
        ctx.arc(px, py, n.r * (0.8 + 0.4 * Math.sin(t + n.pulse)), 0, Math.PI * 2);
        ctx.fillStyle = n.color.replace(")", `,${alpha})`).replace("rgb(", "rgba(");
        ctx.fill();
      });

      // edges between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W * 0.7;
          const dy = (nodes[i].y - nodes[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * W * 0.7, nodes[i].y * H);
            ctx.lineTo(nodes[j].x * W * 0.7, nodes[j].y * H);
            ctx.strokeStyle = `rgba(0,229,255,${(1 - dist / 80) * 0.12})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // center crosshair
      const ccx = W * 0.82, ccy = H * 0.5;
      const ch = 12;
      ctx.strokeStyle = `rgba(226,18,39,${0.7 + 0.3 * Math.sin(t * 3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ccx - ch, ccy); ctx.lineTo(ccx + ch, ccy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ccx, ccy - ch); ctx.lineTo(ccx, ccy + ch); ctx.stroke();
    }
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [phase]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── Main component ────────────────────────────────────────────────────────────
export function ARTPlatformModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"dashboard"|"mitre"|"engagement"|"findings"|"modules"|"report">("dashboard");
  const [activePhase, setActivePhase] = useState(-1);
  const [running, setRunning] = useState(false);
  const [expandedTactic, setExpandedTactic] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [engagementName, setEngagementName] = useState("ARTP-2025-001");
  const [targetScope, setTargetScope] = useState("10.0.0.0/24");
  const [authorized, setAuthorized] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const PHASE_LOGS: Record<number, string[]> = {
    0: ["[AUTH] Verifying legal authorization token...","[AUTH] ✓ Contract signature validated","[AUTH] ✓ Scope boundaries locked: " + targetScope,"[RoE] Rules of engagement loaded","[SCOPE] IP whitelist enforced — kill switch armed"],
    1: ["[OSINT] Initiating passive reconnaissance...","[DNS] Enumerating subdomains via amass...","[+] Found: api." + targetScope.split("/")[0] + " → 10.0.0.12","[+] Found: admin." + targetScope.split("/")[0] + " → 10.0.0.3","[CLOUD] Scanning AWS S3 buckets...","[!] Public bucket found: company-backups-dev","[GITHUB] Scanning for leaked secrets...","[!] API key detected in commit a3f9d21"],
    2: ["[ENUM] Port scanning " + targetScope + "...","[+] 10.0.0.1: 22/tcp 80/tcp 443/tcp","[+] 10.0.0.12: 8080/tcp 61616/tcp","[+] 10.0.0.45: 443/tcp 8443/tcp","[SSL] Analyzing TLS configuration...","[!] TLS 1.0 enabled on 10.0.0.3","[WEB] Fingerprinting web technologies...","[+] Apache 2.4.50, PHP 7.4, WordPress 6.1"],
    3: ["[VULN] Correlating with CVE database...","[CRITICAL] CVE-2023-44487 — HTTP/2 Rapid Reset (CVSS 9.8)","[HIGH] CVE-2023-46604 — ActiveMQ RCE (CVSS 8.8)","[HIGH] CVE-2023-23397 — Outlook NTLM (CVSS 8.1)","[ML] False positive reduction: 23 findings filtered","[RISK] Overall risk score: 8.7/10 — CRITICAL"],
    4: ["[EXPLOIT] Authorization gate — PASS","[EXPLOIT] Targeting CVE-2023-46604 on 10.0.0.12:61616","[PAYLOAD] Generating ClassPathXmlApplicationContext payload...","[DELIVERY] Sending exploit via STOMP protocol...","[!] RCE achieved — activemq@10.0.0.12","[PRIVESC] Enumerating SUID binaries...","[+] ROOT SHELL acquired on 10.0.0.12 ✓"],
    5: ["[POST] Dumping credentials from memory...","[+] admin:Password123! (NTLM hash)","[LATERAL] Pivot to 10.0.0.3 via pass-the-hash...","[+] Domain Controller reached","[C2] Establishing beacon on 443/tcp (HTTPS)...","[EXFIL] Simulating data exfiltration (safe mode)...","[+] 1.2GB staged — NOT transmitted (authorized sim only)"],
    6: ["[CLEANUP] Removing artifacts and backdoors...","[LOG] Restoring original log entries...","[REPORT] Generating executive report...","[REPORT] Generating technical remediation guide...","[COMPLIANCE] Mapping to NIST 800-53, ISO 27001, PCI-DSS...","[DONE] Engagement complete — 7 critical findings, 12 high, 8 medium","[DONE] Full report ready for download ✓"],
  };

  const startEngagement = useCallback(() => {
    if (!authorized) return;
    setRunning(true); setActivePhase(0); setLogs([]);
    let phase = 0;
    function runPhase() {
      const phaseLogs = PHASE_LOGS[phase] ?? [];
      let li = 0;
      timerRef.current = setInterval(() => {
        if (li < phaseLogs.length) {
          setLogs(prev => [...prev, phaseLogs[li++]]);
          setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 10);
        } else {
          clearInterval(timerRef.current!);
          if (phase < PHASES.length - 1) {
            phase++;
            setActivePhase(phase);
            setTimeout(runPhase, 800);
          } else {
            setRunning(false);
          }
        }
      }, 280);
    }
    runPhase();
  }, [authorized, targetScope]);

  const stopEngagement = useCallback(() => {
    clearInterval(timerRef.current!); setRunning(false);
    setLogs(prev => [...prev, "[KILL SWITCH] Engagement halted by operator"]);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current!), []);
  if (!open) return null;

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "engagement", label: "Engagement", icon: Target },
    { id: "mitre", label: "MITRE ATT&CK", icon: Layers },
    { id: "findings", label: "Findings", icon: AlertTriangle },
    { id: "modules", label: "Modules", icon: Cpu },
    { id: "report", label: "Reports", icon: FileText },
  ] as const;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#030712]"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,229,255,0.012)_2px,rgba(0,229,255,0.012)_4px)] z-[1]" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-red-900/40 bg-black/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-red-950/60 border border-red-800/50">
            <Swords className="w-5 h-5 text-red-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-red-400/70 tracking-widest">ENTERPRISE</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-900/40 text-red-300 border border-red-800/30">AUTHORIZED USE ONLY</span>
            </div>
            <h1 className="text-base font-black tracking-wider text-white">AUTONOMOUS RED TEAM PLATFORM</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {running && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-800/40">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-mono text-red-300">ENGAGEMENT LIVE</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
            <Lock className="w-3 h-3 text-green-400" />
            <span className="text-[11px] font-mono text-green-400">LEGAL MODE ON</span>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 flex items-center gap-0 border-b border-white/8 bg-black/40 backdrop-blur shrink-0 px-4">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-mono tracking-wider border-b-2 transition-all whitespace-nowrap ${active ? "border-red-500 text-red-400 bg-red-950/20" : "border-transparent text-white/40 hover:text-white/70"}`}>
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden z-10">
        <ARTPCanvas phase={activePhase} />

        <div className="relative z-10 h-full overflow-y-auto p-4">
          <AnimatePresence mode="wait">

            {/* ── DASHBOARD ── */}
            {tab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Critical Findings", value: "7", color: "#e21227", icon: AlertTriangle },
                    { label: "High Severity", value: "12", color: "#f97316", icon: Flame },
                    { label: "Hosts Scanned", value: "254", color: "#fbbf24", icon: Globe },
                    { label: "MITRE Techniques", value: "47", color: "#00e5ff", icon: Layers },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="relative overflow-hidden rounded-xl p-4 border backdrop-blur-sm"
                        style={{ borderColor: s.color + "30", background: s.color + "08" }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                            <div className="text-[10px] font-mono text-white/50 mt-0.5">{s.label}</div>
                          </div>
                          <Icon className="w-5 h-5 opacity-40" style={{ color: s.color }} />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: `linear-gradient(to right, transparent, ${s.color}60, transparent)` }} />
                      </motion.div>
                    );
                  })}
                </div>

                {/* Phase progress + log */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Kill chain phases */}
                  <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-mono text-white/70 tracking-widest uppercase">Engagement Phases</h3>
                      <div className="flex gap-2">
                        {!running ? (
                          <button onClick={startEngagement} disabled={!authorized}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all ${authorized ? "bg-red-600/80 hover:bg-red-500 text-white border border-red-400/30" : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}>
                            <Play className="w-3 h-3" /> EXECUTE
                          </button>
                        ) : (
                          <button onClick={stopEngagement}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-orange-700/80 hover:bg-orange-600 text-white border border-orange-500/30 tracking-wider transition-all">
                            <Square className="w-3 h-3" /> KILL SWITCH
                          </button>
                        )}
                        <button onClick={() => { setActivePhase(-1); setLogs([]); setRunning(false); clearInterval(timerRef.current!); }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {PHASES.map((ph, i) => {
                        const done = activePhase > i;
                        const active = activePhase === i;
                        return (
                          <div key={ph.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${active ? "bg-red-950/30 border border-red-700/40" : done ? "bg-white/5" : "bg-black/20"}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${active ? "ring-2 ring-offset-1 ring-offset-black" : ""}`}
                              style={{ background: done || active ? ph.color + "30" : "rgba(255,255,255,0.05)", borderColor: ph.color + "50", border: `1px solid ${ph.color}40`, ringColor: ph.color }}>
                              {done ? <CheckCircle className="w-3 h-3" style={{ color: ph.color }} /> : active ? <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ph.color }} /> : <span className="text-[9px] font-mono text-white/30">{i + 1}</span>}
                            </div>
                            <span className={`text-[11px] font-mono transition-all ${active ? "text-white font-bold" : done ? "text-white/60 line-through" : "text-white/40"}`}>{ph.name}</span>
                            {active && <div className="ml-auto flex gap-0.5">{[0,1,2].map(b => <div key={b} className="w-1 h-3 rounded-full animate-pulse" style={{ background: ph.color + "80", animationDelay: `${b * 0.2}s` }} />)}</div>}
                          </div>
                        );
                      })}
                    </div>
                    {!authorized && (
                      <div className="mt-3 p-2.5 rounded-lg bg-yellow-950/30 border border-yellow-700/40 text-[10px] font-mono text-yellow-400">
                        ⚠ Authorize scope in Engagement tab to begin
                      </div>
                    )}
                  </div>

                  {/* Live log */}
                  <div className="rounded-xl border border-white/8 bg-black/60 backdrop-blur p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-mono text-white/70 tracking-widest uppercase">Live Operation Log</h3>
                      <div className="flex items-center gap-1.5">
                        {running && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                        <span className="text-[10px] font-mono text-white/30">{logs.length} entries</span>
                      </div>
                    </div>
                    <div ref={logRef} className="flex-1 overflow-y-auto font-mono text-[10px] space-y-0.5 max-h-80 scrollbar-thin">
                      {logs.length === 0 ? (
                        <div className="text-white/20 italic text-center py-8">Awaiting engagement start...</div>
                      ) : logs.map((l, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                          className={`leading-5 ${l.includes("[!]") || l.includes("CRITICAL") ? "text-red-400" : l.includes("[+]") ? "text-green-400" : l.includes("[AUTH]") || l.includes("[DONE]") ? "text-cyan-400" : l.includes("KILL SWITCH") ? "text-orange-400" : "text-white/50"}`}>
                          {l}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ENGAGEMENT ── */}
            {tab === "engagement" && (
              <motion.div key="engagement" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto space-y-4">
                <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-yellow-400" />
                    <h2 className="text-sm font-bold text-white">Authorization & Scope Configuration</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1.5">Engagement ID</label>
                      <input value={engagementName} onChange={e => setEngagementName(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-red-500/50 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1.5">Target Scope (CIDR/Domains)</label>
                      <input value={targetScope} onChange={e => setTargetScope(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-red-500/50 outline-none" />
                    </div>
                  </div>
                  {[
                    { key: "Legal contract uploaded", desc: "Rules of Engagement document" },
                    { key: "Digital signature verified", desc: "Client authorization confirmed" },
                    { key: "Scope boundaries enforced", desc: "IP/domain whitelist active" },
                    { key: "Audit logging enabled", desc: "Immutable WORM log active" },
                    { key: "Kill switch armed", desc: "Emergency stop ready" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/5">
                      <div>
                        <div className="text-[12px] text-white/80 font-medium">{item.key}</div>
                        <div className="text-[10px] font-mono text-white/30">{item.desc}</div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                  ))}
                  <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-700/40">
                    <p className="text-[11px] font-mono text-yellow-300">⚠ FOR AUTHORIZED PENETRATION TESTING ONLY. By enabling this engagement you confirm you have written authorization from the target organization owner. Unauthorized use is illegal.</p>
                  </div>
                  <button onClick={() => setAuthorized(!authorized)}
                    className={`w-full py-3 rounded-xl font-bold text-sm tracking-widest font-mono transition-all ${authorized ? "bg-green-700/40 border border-green-500/40 text-green-300" : "bg-red-600/80 hover:bg-red-500 border border-red-400/30 text-white"}`}>
                    {authorized ? "✓ AUTHORIZED — SCOPE LOCKED" : "I CONFIRM LEGAL AUTHORIZATION — LOCK SCOPE"}
                  </button>
                </div>

                {/* Compliance mapping */}
                <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-5">
                  <h3 className="text-[11px] font-mono text-white/70 tracking-widest uppercase mb-3">Compliance Frameworks</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {["NIST 800-53","ISO 27001","PCI-DSS","SOC 2","HIPAA","GDPR","CIS Controls","OWASP Top 10"].map(f => (
                      <div key={f} className="p-2.5 rounded-lg bg-white/3 border border-white/8 text-center">
                        <CheckCircle className="w-3 h-3 text-cyan-400 mx-auto mb-1" />
                        <span className="text-[10px] font-mono text-white/60">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── MITRE ATT&CK ── */}
            {tab === "mitre" && (
              <motion.div key="mitre" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[11px] font-mono text-white/50">MITRE ATT&CK® Enterprise Matrix v14</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MITRE_TACTICS.map(tactic => (
                    <div key={tactic.id} className="rounded-xl border backdrop-blur overflow-hidden" style={{ borderColor: tactic.color + "25", background: tactic.color + "06" }}>
                      <button onClick={() => setExpandedTactic(expandedTactic === tactic.id ? null : tactic.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/3 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: tactic.color }} />
                          <span className="text-[11px] font-bold font-mono" style={{ color: tactic.color }}>{tactic.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-white/30">{tactic.techniques.length} techniques</span>
                          {expandedTactic === tactic.id ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedTactic === tactic.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-white/5">
                            <div className="p-3 space-y-1.5">
                              {tactic.techniques.map(tech => (
                                <div key={tech} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                                  <ChevronRight className="w-3 h-3 shrink-0" style={{ color: tactic.color + "80" }} />
                                  <span className="text-[10px] font-mono text-white/60">{tech}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── FINDINGS ── */}
            {tab === "findings" && (
              <motion.div key="findings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">Vulnerability Findings — {SAMPLE_FINDINGS.length} total</h2>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/60 transition-colors border border-white/8">
                    <Download className="w-3 h-3" /> Export Report
                  </button>
                </div>
                <div className="space-y-2">
                  {SAMPLE_FINDINGS.map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-black/40 backdrop-blur hover:border-white/15 transition-all cursor-pointer">
                      <div className="px-2 py-0.5 rounded font-mono text-[9px] font-bold shrink-0" style={{ background: SEV_COLORS[f.sev] + "20", color: SEV_COLORS[f.sev] }}>{f.sev}</div>
                      <div className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-mono text-white/50 shrink-0">CVSS {f.cvss}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-white truncate">{f.title}</div>
                        <div className="text-[10px] font-mono text-white/40">{f.id}</div>
                      </div>
                      <div className="text-[10px] font-mono text-white/40 shrink-0">{f.host}:{f.port}</div>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-mono shrink-0 ${f.status === "exploited" ? "bg-red-900/40 text-red-300" : f.status === "verified" ? "bg-yellow-900/40 text-yellow-300" : f.status === "mitigated" ? "bg-green-900/40 text-green-300" : "bg-white/5 text-white/40"}`}>{f.status.toUpperCase()}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── MODULES ── */}
            {tab === "modules" && (
              <motion.div key="modules" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {ARTP_MODULES.map((mod, i) => {
                    const Icon = mod.icon;
                    const sel = selectedModule === mod.id;
                    return (
                      <motion.div key={mod.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedModule(sel ? null : mod.id)}
                        className={`relative rounded-xl border p-4 cursor-pointer transition-all ${sel ? "border-opacity-60 scale-[1.02]" : "border-white/8 hover:border-white/15"}`}
                        style={sel ? { borderColor: mod.color + "60", background: mod.color + "0a" } : {}}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: mod.color + "15", border: `1px solid ${mod.color}30` }}>
                            <Icon className="w-4 h-4" style={{ color: mod.color }} />
                          </div>
                          <div className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-green-900/30 text-green-400 border border-green-800/30">READY</div>
                        </div>
                        <h3 className="text-[12px] font-bold text-white mb-1">{mod.name}</h3>
                        <p className="text-[10px] text-white/40 leading-4">{mod.desc}</p>
                        {sel && (
                          <button className="mt-3 w-full py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ background: mod.color + "20", color: mod.color, border: `1px solid ${mod.color}30` }}>
                            LAUNCH MODULE →
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── REPORT ── */}
            {tab === "report" && (
              <motion.div key="report" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto space-y-4">
                <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-5 space-y-3">
                  <h2 className="text-sm font-bold text-white">Automated Report Generation</h2>
                  {[
                    { name: "Executive Summary Report", fmt: "PDF", icon: FileText, color: "#e21227" },
                    { name: "Technical Findings Report", fmt: "DOCX", icon: FileText, color: "#f97316" },
                    { name: "Remediation Guide", fmt: "PDF", icon: Shield, color: "#4ade80" },
                    { name: "MITRE ATT&CK Coverage Map", fmt: "HTML", icon: Layers, color: "#a855f7" },
                    { name: "Compliance Gap Analysis", fmt: "XLSX", icon: BarChart2, color: "#00e5ff" },
                  ].map((r, i) => {
                    const Icon = r.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: r.color + "15" }}>
                          <Icon className="w-4 h-4" style={{ color: r.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-[12px] font-semibold text-white">{r.name}</div>
                          <div className="text-[10px] font-mono text-white/40">Format: {r.fmt}</div>
                        </div>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/60 transition-colors border border-white/8">
                          <Download className="w-3 h-3" /> Generate
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-5">
                  <h3 className="text-[11px] font-mono text-white/70 tracking-widest uppercase mb-3">Integrations</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {["JIRA","ServiceNow","Trello","Splunk","ELK Stack","Slack"].map(t => (
                      <div key={t} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/3 border border-white/8 hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-[11px] font-mono text-white/60">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
