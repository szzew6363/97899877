import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Square, RefreshCw, Target, Shield, Bug, Crosshair,
  Network, Terminal, Activity, AlertTriangle, CheckCircle2,
  Cpu, Radio, Zap, Database, Eye, Clock, Download,
  ChevronRight, BarChart2, Layers,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   AI RED TEAM DASHBOARD — Fullscreen ops center
   Features:
   • MITRE ATT&CK heatmap (12 tactics × 10 techniques)
   • Active agent session cards (4 parallel agents)
   • Real-time vulnerability timeline (auto-scrolling)
   • Multi-agent terminal panels (4 mini-terminals)
   • Mission timer + stats header
   • Canvas ambient background
═══════════════════════════════════════════════════════════════════ */

/* ── MITRE ATT&CK Data ── */
const TACTICS = [
  { short: "IA",  name: "Initial Access"   },
  { short: "EX",  name: "Execution"        },
  { short: "PE",  name: "Persistence"      },
  { short: "PrE", name: "Priv.Esc"         },
  { short: "DE",  name: "Def.Evasion"      },
  { short: "CA",  name: "Cred.Access"      },
  { short: "DI",  name: "Discovery"        },
  { short: "LM",  name: "Lateral Move"     },
  { short: "CO",  name: "Collection"       },
  { short: "C2",  name: "C&C"              },
  { short: "EXF", name: "Exfiltration"     },
  { short: "IMP", name: "Impact"           },
] as const;

type CellStatus = 0 | 1 | 2 | 3 | 4; // none | scoped | covered | active | evaded

const TECH_ROWS: { id: string; name: string; cells: CellStatus[] }[] = [
  { id:"T1595", name:"Active Scanning",      cells:[3,0,0,0,2,0,2,0,0,0,0,0] },
  { id:"T1078", name:"Valid Accounts",       cells:[2,0,2,2,2,2,0,0,0,0,0,0] },
  { id:"T1190", name:"Exploit Public App",   cells:[3,2,0,0,0,0,0,0,0,0,0,0] },
  { id:"T1059", name:"Command Interpreter",  cells:[0,3,0,0,1,0,0,0,0,0,0,0] },
  { id:"T1543", name:"Create Svc/Process",   cells:[0,0,3,2,0,0,0,0,0,0,0,0] },
  { id:"T1055", name:"Process Injection",    cells:[0,2,0,2,3,0,0,0,0,0,0,0] },
  { id:"T1110", name:"Brute Force",          cells:[0,0,0,0,0,3,0,0,0,0,0,0] },
  { id:"T1021", name:"Remote Services",      cells:[0,0,0,0,0,0,0,3,0,0,0,0] },
  { id:"T1041", name:"Exfil over C2",        cells:[0,0,0,0,0,0,0,0,2,3,3,0] },
  { id:"T1486", name:"Data Encryption",      cells:[0,0,0,0,0,0,0,0,0,0,0,1] },
];

const CELL_CFG: Record<CellStatus, { bg: string; border: string; shadow: string; pulse?: boolean }> = {
  0: { bg:"rgba(255,255,255,0.02)", border:"rgba(255,255,255,0.04)", shadow:"none" },
  1: { bg:"rgba(34,197,94,0.08)",  border:"rgba(34,197,94,0.2)",    shadow:"none" },
  2: { bg:"rgba(34,197,94,0.22)",  border:"rgba(34,197,94,0.4)",    shadow:"0 0 6px rgba(34,197,94,0.15)" },
  3: { bg:"rgba(226,18,39,0.35)",  border:"rgba(226,18,39,0.6)",    shadow:"0 0 10px rgba(226,18,39,0.35)", pulse:true },
  4: { bg:"rgba(167,139,250,0.28)",border:"rgba(167,139,250,0.5)",  shadow:"0 0 8px rgba(167,139,250,0.25)" },
};

/* ── Agent Configs ── */
interface AgentCfg {
  id: string; name: string; color: string; bg: string;
  specialty: string; target: string; phase: string;
  initProgress: number;
  initLogs: string[];
}

const AGENT_CFGS: AgentCfg[] = [
  {
    id:"alpha", name:"ALPHA", color:"#e21227", bg:"rgba(226,18,39,0.06)",
    specialty:"Recon & Initial Access", target:"10.10.14.1", phase:"EXPLOIT",
    initProgress: 68,
    initLogs:[
      "[*] Launching nmap scan on 10.10.14.1",
      "[+] CVE-2024-1337 found — CVSS 9.8",
      "[*] Generating Metasploit payload",
      "[+] Shell obtained: uid=0(root)",
      "[*] Establishing persistence...",
    ],
  },
  {
    id:"beta", name:"BETA", color:"#00e5ff", bg:"rgba(0,229,255,0.05)",
    specialty:"Exploitation", target:"10.10.14.2", phase:"PERSIST",
    initProgress: 45,
    initLogs:[
      "[*] SQLmap against login endpoint",
      "[+] SQL injection confirmed — UNION based",
      "[*] Dumping credentials from db",
      "[+] Admin hash: $2b$12$abc...",
      "[*] Cracking with hashcat...",
    ],
  },
  {
    id:"gamma", name:"GAMMA", color:"#f59e0b", bg:"rgba(245,158,11,0.05)",
    specialty:"Priv.Esc & Lateral Move", target:"10.10.14.0/24", phase:"LATERAL",
    initProgress: 32,
    initLogs:[
      "[*] Running LinPEAS on compromised host",
      "[+] SUID binary found: /usr/bin/find",
      "[*] Escalating to root via SUID exploit",
      "[+] Scanning internal network /24",
      "[*] 7 hosts discovered, 3 reachable",
    ],
  },
  {
    id:"delta", name:"DELTA", color:"#22c55e", bg:"rgba(34,197,94,0.05)",
    specialty:"Exfiltration & C2", target:"10.10.14.5", phase:"EXFILTRATE",
    initProgress: 81,
    initLogs:[
      "[*] Staging data for exfiltration",
      "[*] Compressing with AES-256 encryption",
      "[+] DNS tunnel established (dnscat2)",
      "[*] Sending 2.4GB over covert channel",
      "[+] Beacon check-in successful",
    ],
  },
];

/* ── Vulnerability timeline data ── */
interface VulnItem {
  ts: string; cve: string; severity: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW";
  host: string; type: string; desc: string;
}

const INITIAL_VULNS: VulnItem[] = [
  { ts:"14:42:11", cve:"CVE-2024-1337", severity:"CRITICAL", host:"10.10.14.1", type:"RCE",    desc:"Apache HTTP Server RCE via SSRF" },
  { ts:"14:41:58", cve:"CVE-2024-0986", severity:"HIGH",     host:"10.10.14.2", type:"SQLi",   desc:"MySQL 8.0 auth bypass" },
  { ts:"14:41:33", cve:"CVE-2023-4966", severity:"CRITICAL", host:"10.10.14.1", type:"Auth",   desc:"Citrix Bleed session token leak" },
  { ts:"14:41:02", cve:"CVE-2024-2199", severity:"HIGH",     host:"10.10.14.3", type:"LFI",    desc:"PHP file inclusion via upload" },
  { ts:"14:40:47", cve:"CVE-2023-3519", severity:"CRITICAL", host:"10.10.14.4", type:"RCE",    desc:"Citrix NetScaler unauthenticated RCE" },
  { ts:"14:40:21", cve:"CVE-2024-1086", severity:"HIGH",     host:"10.10.14.1", type:"Priv",   desc:"Linux kernel nf_tables UAF" },
  { ts:"14:39:55", cve:"CVE-2024-3400", severity:"CRITICAL", host:"10.10.14.5", type:"RCE",    desc:"PAN-OS OS command injection" },
  { ts:"14:39:11", cve:"CVE-2023-46747",severity:"CRITICAL", host:"10.10.14.2", type:"Auth",   desc:"F5 BIG-IP auth bypass" },
];

const SEV_COLOR: Record<string,string> = {
  CRITICAL:"#e21227", HIGH:"#f59e0b", MEDIUM:"#a78bfa", LOW:"#22c55e",
};

const LIVE_LOG_LINES: Record<string, string[]> = {
  alpha: [
    "[*] Bypassing AV with polymorphic shellcode",
    "[+] Shell spawned as SYSTEM",
    "[*] Running Mimikatz — dumping LSASS",
    "[+] Found 3 admin credential hashes",
    "[*] Pass-the-hash against domain controller",
    "[+] Domain admin access achieved",
    "[*] Installing persistence backdoor",
    "[+] Scheduled task created: svchost32.exe",
    "[*] Covering tracks — wiping event logs",
    "[*] Pivoting to 10.10.14.0/24...",
  ],
  beta: [
    "[+] Admin hash cracked: Password@123!",
    "[*] Logging in via admin panel",
    "[+] Webshell uploaded to /uploads/shell.php",
    "[*] Testing RCE via webshell",
    "[+] id: uid=33(www-data) gid=33",
    "[*] Upgrading to interactive shell",
    "[*] Running sudo -l",
    "[+] (ALL : ALL) NOPASSWD: /usr/bin/python3",
    "[+] Root shell via sudo python exploit",
    "[*] Downloading privesc toolkit...",
  ],
  gamma: [
    "[+] 7 internal hosts on 10.10.14.0/24",
    "[*] Scanning ports on internal hosts",
    "[+] RDP open on 10.10.14.8:3389",
    "[*] Attempting pass-the-hash via RDP",
    "[+] Authenticated to 10.10.14.8 as DOMAIN\\admin",
    "[*] Running BloodHound collection",
    "[+] Attack path: svc_backup → DA in 2 hops",
    "[*] Kerberoasting service accounts",
    "[+] 4 TGS hashes captured for offline crack",
    "[*] Establishing SOCKS5 proxy for pivoting",
  ],
  delta: [
    "[+] Data staged: 2.4GB compressed & encrypted",
    "[*] DNS tunnel test: 847 bytes/sec throughput",
    "[*] Sending data in 512-byte DNS TXT chunks",
    "[+] Transfer: 12% complete — ETA 18 min",
    "[*] Checking for DPI/IDS signatures...",
    "[+] Traffic mimics legitimate DNS — undetected",
    "[*] HTTPS beacon active — 60s check-in",
    "[+] C2 server acknowledged last beacon",
    "[*] Transfer: 34% complete",
    "[+] No alerts triggered in SIEM (blind check)",
  ],
};

/* ── Sub-components ── */

function MitreCell({ status, tactic }: { status: CellStatus; tactic: string }) {
  const cfg = CELL_CFG[status];
  return (
    <div
      title={`${tactic} — Status: ${["None","Scoped","Covered","Active","Evaded"][status]}`}
      style={{
        width:"28px", height:"16px", borderRadius:"3px",
        background: cfg.bg, border:`1px solid ${cfg.border}`,
        boxShadow: cfg.shadow,
        transition:"all 0.3s ease",
        animation: cfg.pulse ? "neonFlicker 2s ease-in-out infinite" : "none",
        cursor:"default",
      }}
    />
  );
}

function MitreMatrix() {
  const covered = TECH_ROWS.flatMap(r => r.cells).filter(c => c >= 2).length;
  const total = TECH_ROWS.length * TACTICS.length;
  const pct = Math.round((covered / total) * 100);

  return (
    <div style={{ width:"100%" }}>
      {/* Tactic headers */}
      <div style={{ display:"flex", gap:"3px", marginBottom:"4px", paddingLeft:"88px" }}>
        {TACTICS.map(t => (
          <div key={t.short} style={{ width:"28px", textAlign:"center" }}>
            <span style={{ fontSize:"6.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.25)", fontWeight:700, letterSpacing:"0.2px" }}>{t.short}</span>
          </div>
        ))}
      </div>

      {/* Technique rows */}
      <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
        {TECH_ROWS.map(row => (
          <div key={row.id} style={{ display:"flex", alignItems:"center", gap:"3px" }}>
            <div style={{ width:"40px", flexShrink:0 }}>
              <span style={{ fontSize:"6.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.25)" }}>{row.id}</span>
            </div>
            <div style={{ width:"44px", flexShrink:0 }}>
              <span style={{ fontSize:"6.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.3)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block" }}>{row.name.slice(0,10)}</span>
            </div>
            {row.cells.map((cell, i) => (
              <MitreCell key={i} status={cell} tactic={TACTICS[i].name} />
            ))}
          </div>
        ))}
      </div>

      {/* Legend + coverage */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"10px" }}>
        <div style={{ display:"flex", gap:"10px" }}>
          {[
            { s:0, l:"None" }, { s:1, l:"Scoped" }, { s:2, l:"Covered" },
            { s:3, l:"Active" }, { s:4, l:"Evaded" },
          ].map(({ s, l }) => {
            const c = CELL_CFG[s as CellStatus];
            return (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                <div style={{ width:"10px", height:"8px", borderRadius:"2px", background:c.bg, border:`1px solid ${c.border}` }} />
                <span style={{ fontSize:"7px", fontFamily:"monospace", color:"rgba(255,255,255,0.2)" }}>{l}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <span style={{ fontSize:"8px", fontFamily:"monospace", color:"rgba(255,255,255,0.3)" }}>COVERAGE:</span>
          <span style={{ fontSize:"11px", fontFamily:"monospace", fontWeight:900, color: pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#e21227" }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

interface AgentState {
  progress: number;
  logs: string[];
  status: "active" | "stalled" | "complete";
  logIdx: number;
}

function SessionCard({ cfg, agentState }: { cfg: AgentCfg; agentState: AgentState }) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [agentState.logs]);

  return (
    <div style={{
      borderRadius:"10px",
      background: cfg.bg,
      border:`1px solid ${cfg.color}20`,
      boxShadow: agentState.status === "active" ? `0 0 20px ${cfg.color}14, 0 4px 16px rgba(0,0,0,0.4)` : "0 4px 16px rgba(0,0,0,0.3)",
      overflow:"hidden", position:"relative",
    }}>
      {/* Active scanline */}
      {agentState.status === "active" && (
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:"1.5px",
          background:`linear-gradient(90deg, transparent, ${cfg.color} 50%, transparent)`,
          animation:"energy-flow 1.5s linear infinite", backgroundSize:"200% auto",
        }} />
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"7px", padding:"7px 10px 5px", borderBottom:`1px solid ${cfg.color}12` }}>
        <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:cfg.color, boxShadow:`0 0 8px ${cfg.color}`, flexShrink:0,
          animation: agentState.status === "active" ? "neonFlicker 1.8s ease infinite" : "none" }} />
        <span style={{ fontSize:"10px", fontFamily:"monospace", fontWeight:900, color:cfg.color, letterSpacing:"1.2px" }}>{cfg.name}</span>
        <span style={{ fontSize:"7.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.25)", flex:1 }}>{cfg.specialty}</span>
        <span style={{
          fontSize:"7px", fontFamily:"monospace", fontWeight:800,
          color: agentState.status === "active" ? "#22c55e" : agentState.status === "stalled" ? "#f59e0b" : "#a78bfa",
          background: agentState.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
          border:`1px solid ${agentState.status === "active" ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
          borderRadius:"4px", padding:"1px 5px",
        }}>{agentState.status.toUpperCase()}</span>
      </div>

      {/* Target + phase */}
      <div style={{ display:"flex", gap:"6px", padding:"4px 10px" }}>
        <span style={{ fontSize:"7.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.2)" }}>TARGET:</span>
        <span style={{ fontSize:"7.5px", fontFamily:"monospace", color:cfg.color, fontWeight:700 }}>{cfg.target}</span>
        <span style={{ marginLeft:"auto", fontSize:"7.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.2)" }}>PHASE:</span>
        <span style={{ fontSize:"7.5px", fontFamily:"monospace", color:"#f59e0b", fontWeight:700 }}>{cfg.phase}</span>
      </div>

      {/* Progress bar */}
      <div style={{ padding:"0 10px 4px" }}>
        <div style={{ height:"3px", borderRadius:"3px", background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
          <motion.div animate={{ width:`${agentState.progress}%` }} transition={{ duration:0.6, ease:"easeOut" }}
            style={{ height:"100%", borderRadius:"3px", background:`linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
              boxShadow:`0 0 6px ${cfg.color}60` }} />
        </div>
        <span style={{ fontSize:"6.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.2)", display:"block", marginTop:"2px", textAlign:"right" }}>{agentState.progress}%</span>
      </div>

      {/* Mini log */}
      <div ref={logRef} style={{ padding:"3px 10px 7px", height:"52px", overflowY:"auto", overflowX:"hidden" }}>
        {agentState.logs.slice(-3).map((line, i) => (
          <div key={i} style={{ fontSize:"7.5px", fontFamily:"monospace", lineHeight:1.7,
            color: line.startsWith("[+]") ? cfg.color : "rgba(255,255,255,0.3)" }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function VulnTimeline({ items }: { items: VulnItem[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [items.length]);

  return (
    <div ref={listRef} style={{ overflowY:"auto", height:"100%", paddingRight:"4px" }}>
      <AnimatePresence initial={false}>
        {items.map((v, i) => (
          <motion.div key={`${v.ts}-${v.cve}`}
            initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.3 }}
            style={{
              display:"flex", flexDirection:"column", gap:"2px",
              padding:"6px 8px", marginBottom:"4px",
              borderRadius:"7px",
              background:"rgba(255,255,255,0.02)",
              border:`1px solid ${SEV_COLOR[v.severity]}18`,
              borderLeft:`2px solid ${SEV_COLOR[v.severity]}60`,
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
              <span style={{ fontSize:"7px", fontFamily:"monospace", color:"rgba(255,255,255,0.2)" }}>{v.ts}</span>
              <span style={{
                fontSize:"6.5px", fontFamily:"monospace", fontWeight:800,
                color: SEV_COLOR[v.severity],
                background:`${SEV_COLOR[v.severity]}12`,
                border:`1px solid ${SEV_COLOR[v.severity]}30`,
                borderRadius:"3px", padding:"0 4px",
              }}>{v.severity}</span>
              <span style={{ fontSize:"7px", fontFamily:"monospace", color:"rgba(255,255,255,0.3)", marginLeft:"auto" }}>{v.type}</span>
            </div>
            <span style={{ fontSize:"8px", fontFamily:"monospace", fontWeight:700, color:SEV_COLOR[v.severity] }}>{v.cve}</span>
            <span style={{ fontSize:"7.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.35)" }}>{v.desc}</span>
            <span style={{ fontSize:"6.5px", fontFamily:"monospace", color:"rgba(255,255,255,0.18)" }}>{v.host}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface AgentTerminalProps { cfg: AgentCfg; logs: string[]; }

function AgentTerminal({ cfg, logs }: AgentTerminalProps) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  return (
    <div style={{ flex:1, minWidth:0, borderRadius:"10px", background:"rgba(2,4,8,0.98)", border:`1px solid ${cfg.color}18`, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      {/* Terminal titlebar */}
      <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"5px 10px", borderBottom:`1px solid ${cfg.color}12`, background:`${cfg.color}07`, flexShrink:0 }}>
        <div style={{ display:"flex", gap:"4px" }}>
          {["#e21227","#f59e0b","#22c55e"].map(c => (
            <div key={c} style={{ width:"7px", height:"7px", borderRadius:"50%", background:c, opacity:0.7 }} />
          ))}
        </div>
        <Terminal style={{ width:"9px", height:"9px", color:cfg.color }} />
        <span style={{ fontSize:"8.5px", fontFamily:"monospace", fontWeight:800, color:cfg.color, letterSpacing:"0.8px" }}>
          AGENT::{cfg.name}
        </span>
        <span style={{ fontSize:"7px", fontFamily:"monospace", color:"rgba(255,255,255,0.2)", marginLeft:"auto" }}>{cfg.target}</span>
        <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 6px #22c55e", animation:"neonFlicker 2s ease infinite" }} />
      </div>

      {/* Log output */}
      <div ref={logRef} style={{ flex:1, overflowY:"auto", padding:"5px 8px" }}>
        {logs.map((line, i) => (
          <div key={i} style={{
            fontSize:"8px", fontFamily:"monospace", lineHeight:1.75,
            color: line.startsWith("[+]") ? cfg.color :
                   line.startsWith("[!]") ? "#e21227" :
                   "rgba(255,255,255,0.4)",
          }}>
            <span style={{ color:"rgba(255,255,255,0.15)", marginRight:"4px" }}>$</span>
            {line}
          </div>
        ))}
        {/* Live cursor */}
        <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
          <span style={{ fontSize:"8px", fontFamily:"monospace", color:"rgba(255,255,255,0.15)" }}>$</span>
          <span style={{ display:"inline-block", width:"5px", height:"10px", background:cfg.color, opacity:0.8, animation:"cursorBlink 1s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */

interface RedTeamDashboardProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function useTimer(running: boolean) {
  const [secs, setSecs] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function RedTeamDashboard({ open, onOpenChange }: RedTeamDashboardProps) {
  const [missionRunning, setMissionRunning] = useState(false);
  const [vulns, setVulns] = useState<VulnItem[]>(INITIAL_VULNS);
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>(
    Object.fromEntries(AGENT_CFGS.map(a => [a.id, {
      progress: a.initProgress, logs: a.initLogs,
      status: "active" as const, logIdx: 0,
    }]))
  );
  const [agentLogs, setAgentLogs] = useState<Record<string, string[]>>(
    Object.fromEntries(AGENT_CFGS.map(a => [a.id, a.initLogs]))
  );
  const timerStr = useTimer(missionRunning);
  const tickRef = useRef(0);

  // Live update tick
  useEffect(() => {
    if (!missionRunning) return;
    const id = setInterval(() => {
      tickRef.current++;
      const t = tickRef.current;

      // Update agent logs
      setAgentLogs(prev => {
        const next = { ...prev };
        AGENT_CFGS.forEach(a => {
          const lines = LIVE_LOG_LINES[a.id];
          const idx = t % lines.length;
          next[a.id] = [...prev[a.id].slice(-12), lines[idx]];
        });
        return next;
      });

      // Update agent progress
      setAgentStates(prev => {
        const next = { ...prev };
        AGENT_CFGS.forEach(a => {
          const cur = prev[a.id];
          const newProg = Math.min(100, cur.progress + (Math.random() > 0.7 ? 1 : 0));
          next[a.id] = {
            ...cur,
            progress: newProg,
            status: newProg >= 100 ? "complete" : "active",
          };
        });
        return next;
      });

      // Occasionally add a new vuln
      if (t % 8 === 0) {
        const now = new Date();
        const ts = now.toTimeString().slice(0, 8);
        const newVuln: VulnItem = {
          ts, severity: ["CRITICAL","HIGH","MEDIUM"][Math.floor(Math.random() * 3)] as VulnItem["severity"],
          cve: `CVE-2024-${1000 + Math.floor(Math.random() * 9000)}`,
          host: `10.10.14.${Math.floor(Math.random() * 20)}`,
          type: ["RCE","SQLi","LFI","XSS","Privesc","Auth"][Math.floor(Math.random() * 6)],
          desc: ["Remote code execution via buffer overflow", "Authentication bypass discovered", "Unrestricted file upload vulnerability", "OS command injection in admin panel"][Math.floor(Math.random() * 4)],
        };
        setVulns(prev => [newVuln, ...prev.slice(0, 40)]);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [missionRunning]);

  const critCount = vulns.filter(v => v.severity === "CRITICAL").length;
  const highCount = vulns.filter(v => v.severity === "HIGH").length;
  const activeAgents = Object.values(agentStates).filter(a => a.status === "active").length;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 65,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(16px)",
          display: "flex", flexDirection: "column",
          fontFamily: "monospace",
          overflow: "hidden",
        }}
      >
        {/* Ambient grid background */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage:"linear-gradient(rgba(226,18,39,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(226,18,39,0.025) 1px, transparent 1px)",
          backgroundSize:"40px 40px",
          zIndex:0,
        }} />

        {/* Top accent line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg, transparent, #e21227 20%, #00e5ff 50%, #e21227 80%, transparent)", animation:"energy-flow 3s linear infinite", backgroundSize:"200% auto", zIndex:1 }} />

        {/* ── HEADER ── */}
        <div style={{
          display:"flex", alignItems:"center", gap:"12px",
          padding:"10px 20px",
          background:"rgba(4,4,10,0.96)",
          borderBottom:"1px solid rgba(226,18,39,0.15)",
          flexShrink:0, position:"relative", zIndex:2,
        }}>
          {/* Icon */}
          <div style={{ width:"32px", height:"32px", borderRadius:"9px", background:"rgba(226,18,39,0.12)", border:"1px solid rgba(226,18,39,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Crosshair style={{ width:"16px", height:"16px", color:"#e21227" }} />
          </div>

          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ fontSize:"14px", fontWeight:900, color:"#e21227", letterSpacing:"2px" }}>AI RED TEAM DASHBOARD</span>
              <span style={{ fontSize:"7.5px", fontWeight:800, color:"#22c55e", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:"4px", padding:"1px 6px" }}>OPS CENTER</span>
            </div>
            <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.5px" }}>MITRE ATT&CK · Multi-Agent · Real-time Intelligence</span>
          </div>

          {/* Stats strip */}
          <div style={{ display:"flex", gap:"20px", marginLeft:"auto", alignItems:"center" }}>
            {[
              { icon:Clock, label:"UPTIME", value:timerStr, color:"#00e5ff" },
              { icon:AlertTriangle, label:"CRITICAL", value:String(critCount), color:"#e21227" },
              { icon:Bug, label:"HIGH", value:String(highCount), color:"#f59e0b" },
              { icon:Radio, label:"AGENTS", value:String(activeAgents), color:"#22c55e" },
              { icon:Activity, label:"VULNS", value:String(vulns.length), color:"#a78bfa" },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                    <Icon style={{ width:"9px", height:"9px", color:s.color }} />
                    <span style={{ fontSize:"8px", color:"rgba(255,255,255,0.25)", letterSpacing:"0.5px" }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize:"13px", fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</span>
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div style={{ display:"flex", gap:"6px", marginLeft:"16px" }}>
            <button onClick={() => setMissionRunning(v => !v)} style={{
              height:"30px", padding:"0 14px", borderRadius:"7px",
              background: missionRunning ? "rgba(226,18,39,0.12)" : "linear-gradient(135deg, rgba(226,18,39,0.9), rgba(160,10,20,0.95))",
              border: missionRunning ? "1px solid rgba(226,18,39,0.4)" : "none",
              color:"#fff", fontSize:"9px", fontWeight:800, cursor:"pointer",
              display:"flex", alignItems:"center", gap:"5px",
              boxShadow: missionRunning ? "none" : "0 0 16px rgba(226,18,39,0.3)",
              letterSpacing:"0.5px",
            }}>
              {missionRunning ? <><Square style={{ width:"9px", height:"9px" }} />PAUSE</> : <><Play style={{ width:"9px", height:"9px" }} />START MISSION</>}
            </button>
            <button onClick={() => { setMissionRunning(false); setVulns(INITIAL_VULNS); setAgentStates(Object.fromEntries(AGENT_CFGS.map(a => [a.id, { progress:a.initProgress, logs:a.initLogs, status:"active" as const, logIdx:0 }]))); setAgentLogs(Object.fromEntries(AGENT_CFGS.map(a => [a.id, a.initLogs]))); tickRef.current = 0; }}
              style={{ height:"30px", padding:"0 10px", borderRadius:"7px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)", fontSize:"9px", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px" }}>
              <RefreshCw style={{ width:"9px", height:"9px" }} />RESET
            </button>
            <button onClick={() => onOpenChange(false)} style={{ height:"30px", width:"30px", borderRadius:"7px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X style={{ width:"13px", height:"13px" }} />
            </button>
          </div>
        </div>

        {/* ── MAIN BODY ── */}
        <div style={{ flex:1, display:"grid", gridTemplateColumns:"230px 1fr 240px", gridTemplateRows:"1fr 220px", gap:"0", overflow:"hidden", position:"relative", zIndex:1 }}>

          {/* LEFT — Agent Sessions */}
          <div style={{ padding:"12px", display:"flex", flexDirection:"column", gap:"8px", borderRight:"1px solid rgba(255,255,255,0.05)", overflowY:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"2px", flexShrink:0 }}>
              <Cpu style={{ width:"10px", height:"10px", color:"rgba(255,255,255,0.3)" }} />
              <span style={{ fontSize:"8.5px", fontWeight:800, color:"rgba(255,255,255,0.3)", letterSpacing:"1px" }}>ACTIVE SESSIONS</span>
              <span style={{ marginLeft:"auto", fontSize:"8px", color:"#22c55e", fontWeight:700 }}>{activeAgents}/4</span>
            </div>
            {AGENT_CFGS.map(cfg => (
              <SessionCard key={cfg.id} cfg={cfg} agentState={agentStates[cfg.id]} />
            ))}
          </div>

          {/* CENTER — MITRE Matrix + secondary stats */}
          <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:"10px", overflowY:"auto", borderRight:"1px solid rgba(255,255,255,0.05)" }}>
            {/* MITRE Matrix */}
            <div style={{
              borderRadius:"12px",
              background:"rgba(4,6,12,0.98)",
              border:"1px solid rgba(226,18,39,0.1)",
              padding:"12px 14px",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"10px" }}>
                <Layers style={{ width:"11px", height:"11px", color:"#e21227" }} />
                <span style={{ fontSize:"9px", fontWeight:900, color:"#e21227", letterSpacing:"1.5px" }}>MITRE ATT&CK MATRIX</span>
                <span style={{ fontSize:"7px", color:"rgba(255,255,255,0.2)", marginLeft:"auto" }}>v14.1 · {TECH_ROWS.length} techniques · {TACTICS.length} tactics</span>
              </div>
              <MitreMatrix />
            </div>

            {/* Secondary metric cards */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px" }}>
              {[
                { label:"ATTACK PATHS", value:"7", sub:"discovered", color:"#e21227", icon:ChevronRight },
                { label:"CRED HASHES", value:"23", sub:"captured", color:"#f59e0b", icon:Database },
                { label:"PIVOTS", value:"4", sub:"established", color:"#a78bfa", icon:Network },
                { label:"SHELLS", value:"6", sub:"active", color:"#22c55e", icon:Terminal },
                { label:"C2 BEACONS", value:"3", sub:"online", color:"#00e5ff", icon:Radio },
                { label:"DATA STAGED", value:"4.2GB", sub:"ready to exfil", color:"#f59e0b", icon:Download },
              ].map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.label} style={{
                    borderRadius:"9px", padding:"8px 10px",
                    background:"rgba(255,255,255,0.02)", border:`1px solid ${m.color}15`,
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"4px" }}>
                      <Icon style={{ width:"9px", height:"9px", color:m.color }} />
                      <span style={{ fontSize:"7px", color:"rgba(255,255,255,0.25)", letterSpacing:"0.5px" }}>{m.label}</span>
                    </div>
                    <span style={{ fontSize:"18px", fontWeight:900, color:m.color, display:"block", lineHeight:1 }}>{m.value}</span>
                    <span style={{ fontSize:"7px", color:"rgba(255,255,255,0.2)" }}>{m.sub}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT — Vulnerability Timeline */}
          <div style={{ padding:"12px", display:"flex", flexDirection:"column", gap:"8px", overflowY:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
              <Eye style={{ width:"10px", height:"10px", color:"rgba(255,255,255,0.3)" }} />
              <span style={{ fontSize:"8.5px", fontWeight:800, color:"rgba(255,255,255,0.3)", letterSpacing:"1px" }}>VULN TIMELINE</span>
              {missionRunning && (
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"3px" }}>
                  <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#e21227", animation:"neonFlicker 1s ease infinite" }} />
                  <span style={{ fontSize:"7px", color:"#e21227" }}>LIVE</span>
                </div>
              )}
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              <VulnTimeline items={vulns} />
            </div>
          </div>

          {/* BOTTOM LEFT — span sessions col */}
          <div style={{ gridColumn:"1 / -1", display:"flex", gap:"6px", padding:"8px 12px", borderTop:"1px solid rgba(255,255,255,0.05)", background:"rgba(2,4,8,0.96)", overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"5px", flexShrink:0, marginRight:"4px" }}>
              <Terminal style={{ width:"10px", height:"10px", color:"rgba(255,255,255,0.25)" }} />
              <span style={{ fontSize:"8px", fontWeight:800, color:"rgba(255,255,255,0.2)", letterSpacing:"1px", writingMode:"vertical-lr", transform:"rotate(180deg)" }}>AGENT TERMINALS</span>
            </div>
            {AGENT_CFGS.map(cfg => (
              <AgentTerminal key={cfg.id} cfg={cfg} logs={agentLogs[cfg.id]} />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
