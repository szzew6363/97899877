import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Radio, AlertTriangle, Play, ExternalLink, RefreshCw, Zap } from "lucide-react";
import { ExploitChainModal } from "./ExploitChainModal";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface CVEEntry {
  id: string; title: string; cvss: number; vendor: string; product: string;
  type: string; published: string; description: string; zeroday: boolean;
}

const BASE_CVES: CVEEntry[] = [
  { id: "CVE-2024-3094", title: "XZ Utils Backdoor", cvss: 10.0, vendor: "Tukaani", product: "xz-utils 5.6.0/5.6.1", type: "Backdoor", published: "2024-03-29", zeroday: true, description: "Supply chain backdoor in XZ Utils compression library affecting sshd via systemd on multiple Linux distros. Remote code execution as root." },
  { id: "CVE-2024-21762", title: "Fortinet SSL-VPN RCE", cvss: 9.8, vendor: "Fortinet", product: "FortiOS", type: "RCE", published: "2024-02-08", zeroday: true, description: "Out-of-bound write vulnerability in FortiOS/FortiProxy SSL-VPN. Allows unauthenticated RCE via crafted HTTP requests." },
  { id: "CVE-2023-44487", title: "HTTP/2 Rapid Reset", cvss: 7.5, vendor: "Multiple", product: "HTTP/2 Servers", type: "DDoS", published: "2023-10-10", zeroday: false, description: "Novel HTTP/2 rapid reset DDoS technique exploiting stream cancellation. Caused record-breaking DDoS attacks against cloud providers." },
  { id: "CVE-2023-4863", title: "WebP Heap Buffer Overflow", cvss: 8.8, vendor: "Google", product: "Chrome/WebP libwebp", type: "Memory Corruption", published: "2023-09-11", zeroday: true, description: "Heap buffer overflow in WebP decoder. Exploited in the wild. Affects all browsers using libwebp including Chrome, Firefox, Safari." },
  { id: "CVE-2024-1709", title: "ConnectWise ScreenConnect Auth Bypass", cvss: 10.0, vendor: "ConnectWise", product: "ScreenConnect", type: "Auth Bypass", published: "2024-02-19", zeroday: true, description: "Authentication bypass using alternate path allows full system compromise. CISA emergency directive issued. Actively exploited." },
  { id: "CVE-2023-36884", title: "Office/Windows HTML RCE", cvss: 8.3, vendor: "Microsoft", product: "Windows/Office", type: "RCE", published: "2023-07-11", zeroday: true, description: "Windows Search remote code execution via Office documents. Exploited by STORM-0978 (Russian threat actor) against NATO summit attendees." },
  { id: "CVE-2024-6387", title: "OpenSSH regreSSHion", cvss: 8.1, vendor: "OpenSSH", product: "sshd < 9.8p1", type: "RCE", published: "2024-07-01", zeroday: false, description: "Signal handler race condition in OpenSSH sshd daemon. Unauthenticated RCE as root on glibc-based Linux systems. Regression of CVE-2006-5051." },
  { id: "CVE-2024-4577", title: "PHP CGI Windows RCE", cvss: 9.8, vendor: "PHP Group", product: "PHP 8.x (Windows)", type: "RCE", published: "2024-06-06", zeroday: true, description: "Argument injection vulnerability in PHP CGI mode on Windows. Unauthenticated RCE. Bypasses CVE-2012-1823 patch via Windows codepage handling." },
  { id: "CVE-2023-23397", title: "Outlook Zero-Click RCE", cvss: 9.8, vendor: "Microsoft", product: "Microsoft Outlook", type: "Zero-Click", published: "2023-03-14", zeroday: true, description: "Net-NTLMv2 hash theft via specially crafted email. No user interaction required. Exploited by APT28 (Russia GRU) against European targets." },
  { id: "CVE-2024-27198", title: "JetBrains TeamCity Auth Bypass", cvss: 9.8, vendor: "JetBrains", product: "TeamCity < 2023.11.4", type: "Auth Bypass", published: "2024-03-04", zeroday: false, description: "Authentication bypass allowing complete server takeover. Used by North Korean Lazarus Group and ALPHV ransomware operators for initial access." },
];

function cvssColor(s: number) {
  if (s >= 9) return "#ff2222";
  if (s >= 7) return "#f97316";
  if (s >= 4) return "#fbbf24";
  return "#4ade80";
}

export function LiveCVEModal({ open, onOpenChange }: Props) {
  const [feed, setFeed] = useState<CVEEntry[]>(BASE_CVES);
  const [selected, setSelected] = useState<CVEEntry | null>(null);
  const [simLog, setSimLog] = useState<string[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [filterZero, setFilterZero] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [chainCVE, setChainCVE] = useState<CVEEntry | null>(null);
  const [chainOpen, setChainOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      const randIdx = Math.floor(Math.random() * BASE_CVES.length);
      const mutated = { ...BASE_CVES[randIdx], published: new Date().toISOString().split("T")[0], zeroday: Math.random() > 0.7 };
      setFeed(prev => [mutated, ...prev.slice(0, 19)]);
      setLastUpdate(new Date());
    }, 8000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [simLog]);

  function simulateCVE(cve: CVEEntry) {
    setSimLog([]); setSimRunning(true);
    const lines = [
      `[*] Loading CVE simulation: ${cve.id}`,
      `[*] Vulnerability: ${cve.title}`,
      `[*] CVSS Score: ${cve.cvss} (${cve.cvss >= 9 ? "CRITICAL" : cve.cvss >= 7 ? "HIGH" : "MEDIUM"})`,
      `[>] Fetching PoC code from exploit-db...`,
      `[+] PoC found: ${cve.id.replace("CVE-", "exploit-")}.py`,
      `[>] Setting up isolated sandbox environment...`,
      `[+] Container spawned: vuln-sim-${cve.id.toLowerCase().replace(/-/g, "_")}`,
      `[>] Configuring vulnerable ${cve.product} instance...`,
      `[+] Target service running on 127.0.0.1:8443`,
      `[>] Launching exploit simulation: ${cve.type}...`,
      `[>] ${cve.description.split(".")[0]}...`,
      `[+] Exploit payload delivered successfully`,
      `[!] ${cve.cvss >= 9 ? "CRITICAL" : "HIGH"}: System compromise simulated`,
      `[+] Impact assessment: ${cve.vendor} ${cve.product} COMPROMISED`,
      `[>] Generating remediation report...`,
      `[+] Mitigation: Apply vendor patch immediately`,
      `[+] Workaround: ${cve.type === "RCE" ? "Disable service or add WAF rule" : "Update to latest version"}`,
      `[!] Simulation complete — environment destroyed`,
    ];
    let i = 0;
    timerRef.current = setInterval(() => {
      if (i >= lines.length) { clearInterval(timerRef.current!); setSimRunning(false); return; }
      setSimLog(prev => [...prev, lines[i++]]);
    }, 350);
  }

  const displayFeed = filterZero ? feed.filter(c => c.zeroday) : feed;

  if (!open) return null;
  return (
    <>
    {chainCVE && (
      <ExploitChainModal
        open={chainOpen}
        onOpenChange={(v) => { setChainOpen(v); if (!v) setChainCVE(null); }}
        initialCVE={{ id: chainCVE.id, title: chainCVE.title, cvss: chainCVE.cvss, type: chainCVE.type, product: chainCVE.product }}
      />
    )}
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1200, maxHeight: "90vh", background: "#080808", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#141414" }}>
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)" }}>
                <Radio className="w-5 h-5" style={{ color: "#e21227" }} />
                <motion.div className="absolute inset-0 rounded-xl" style={{ border: "1px solid rgba(226,18,39,0.5)" }} animate={{ scale: [1, 1.4], opacity: [0.5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#e21227" }}>LIVE CVE INTELLIGENCE FEED</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Zero-Day Monitor · Real-Time NVD · Simulation Engine</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setFilterZero(!filterZero)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                style={{ background: filterZero ? "rgba(226,18,39,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${filterZero ? "rgba(226,18,39,0.4)" : "#1a1a1a"}`, color: filterZero ? "#e21227" : "#444" }}>
                <AlertTriangle className="w-3 h-3" /> ZERO-DAY ONLY
              </button>
              <div className="text-[9px] font-mono" style={{ color: "#2a2a2a" }}>Updated {lastUpdate.toLocaleTimeString()}</div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4" style={{ color: "#666" }} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {displayFeed.map((cve, i) => (
                <motion.button key={`${cve.id}-${i}`} onClick={() => setSelected(cve)}
                  className="w-full flex items-start gap-3 px-4 py-3 border-b text-left hover:bg-white/2 transition-all"
                  style={{ borderColor: "#0d0d0d", background: selected?.id === cve.id ? "rgba(226,18,39,0.04)" : "transparent" }}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-6 rounded flex items-center justify-center text-[9px] font-bold"
                      style={{ background: `${cvssColor(cve.cvss)}18`, border: `1px solid ${cvssColor(cve.cvss)}44`, color: cvssColor(cve.cvss) }}>
                      {cve.cvss}
                    </div>
                    {cve.zeroday && <div className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>0DAY</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold font-mono" style={{ color: cvssColor(cve.cvss) }}>{cve.id}</span>
                      <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#444" }}>{cve.type}</span>
                    </div>
                    <div className="text-xs font-bold mb-0.5" style={{ color: "#ccc" }}>{cve.title}</div>
                    <div className="text-[9px] truncate" style={{ color: "#333" }}>{cve.vendor} · {cve.product}</div>
                  </div>
                  <div className="text-[9px] font-mono flex-shrink-0" style={{ color: "#2a2a2a" }}>{cve.published}</div>
                </motion.button>
              ))}
            </div>

            <div className="w-80 border-l flex flex-col" style={{ borderColor: "#111" }}>
              {selected ? (
                <>
                  <div className="p-4 border-b" style={{ borderColor: "#111" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold font-mono" style={{ color: cvssColor(selected.cvss) }}>{selected.id}</span>
                      {selected.zeroday && <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(226,18,39,0.15)", color: "#e21227" }}>ZERO-DAY</span>}
                      <div className="ml-auto px-2 py-0.5 rounded font-bold text-[10px]" style={{ background: `${cvssColor(selected.cvss)}18`, color: cvssColor(selected.cvss) }}>{selected.cvss}</div>
                    </div>
                    <div className="text-sm font-bold mb-2" style={{ color: "#eee" }}>{selected.title}</div>
                    <div className="text-[10px] leading-relaxed mb-3" style={{ color: "#555" }}>{selected.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono mb-3">
                      {[["Vendor", selected.vendor], ["Product", selected.product], ["Type", selected.type], ["Published", selected.published]].map(([k, v]) => (
                        <div key={k as string}><div style={{ color: "#2a2a2a" }}>{k}</div><div style={{ color: "#666" }}>{v}</div></div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <motion.button onClick={() => simulateCVE(selected)} disabled={simRunning} whileTap={{ scale: 0.97 }}
                        className="flex-1 py-2 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                        style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.35)", color: "#e21227" }}>
                        <Play className="w-3.5 h-3.5" />{simRunning ? "SIMULATING..." : "SIMULATE"}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setChainCVE(selected); setChainOpen(true); }}
                        className="flex-1 py-2 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                        style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.38)", color: "#a855f7" }}>
                        <Zap className="w-3.5 h-3.5" /> CHAIN EXPLOIT
                      </motion.button>
                    </div>
                  </div>
                  <div ref={logRef} className="flex-1 overflow-y-auto p-3 font-mono text-[9px] space-y-0.5" style={{ background: "#030303", minHeight: 0 }}>
                    {simLog.map((l, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ color: l.startsWith("[!]") ? "#e21227" : l.startsWith("[+]") ? "#4ade80" : l.startsWith("[>]") ? "#00e5ff" : "#333" }}>
                        {l}
                      </motion.div>
                    ))}
                    {simRunning && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ color: "#e21227" }}>█</motion.span>}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center" style={{ color: "#1a1a1a" }}>
                  <div className="text-center"><AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-20" /><div className="text-xs">Select CVE to simulate</div></div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
