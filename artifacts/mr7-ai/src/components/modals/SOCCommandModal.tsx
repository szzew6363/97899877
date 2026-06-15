import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, AlertTriangle, Activity, Eye, CheckCircle,
  Clock, Globe, Network, Cpu, Database, Radio,
  TrendingUp, TrendingDown, Zap, Lock, Bell, Users,
  BarChart2, Layers, Terminal, FileText, Search, Filter,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

// ── Alert feed ────────────────────────────────────────────────────────────────
const INITIAL_ALERTS = [
  { id: 1, sev: "CRITICAL", type: "Ransomware", src: "10.0.14.52", dst: "DC-01", proto: "SMB", time: "13:47:22", status: "active", rule: "RULE-001-RANSOM" },
  { id: 2, sev: "HIGH", type: "Lateral Movement", src: "10.0.14.52", dst: "10.0.14.103", proto: "WinRM", time: "13:47:18", status: "investigating", rule: "RULE-045-LATMOV" },
  { id: 3, sev: "HIGH", type: "Mimikatz Detection", src: "10.0.14.52", dst: "LOCAL", proto: "LSASS", time: "13:47:15", status: "investigating", rule: "RULE-012-CREDS" },
  { id: 4, sev: "HIGH", type: "C2 Beacon", src: "10.0.14.52", dst: "185.220.101.45", proto: "HTTPS", time: "13:47:10", status: "active", rule: "RULE-099-C2" },
  { id: 5, sev: "MEDIUM", type: "Port Scan", src: "192.168.1.88", dst: "10.0.0.0/8", proto: "TCP", time: "13:46:55", status: "resolved", rule: "RULE-002-SCAN" },
  { id: 6, sev: "MEDIUM", type: "DNS Tunneling", src: "10.0.14.77", dst: "8.8.8.8", proto: "DNS", time: "13:46:40", status: "investigating", rule: "RULE-071-DNSEX" },
  { id: 7, sev: "LOW", type: "Failed Auth x47", src: "203.0.113.42", dst: "auth.corp.com", proto: "HTTPS", time: "13:46:20", status: "resolved", rule: "RULE-003-BRUTE" },
  { id: 8, sev: "MEDIUM", type: "Suspicious Powershell", src: "10.0.14.99", dst: "LOCAL", proto: "Powershell", time: "13:46:10", status: "active", rule: "RULE-033-PS" },
];

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#fbbf24", LOW: "#4ade80",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#e21227", investigating: "#fbbf24", resolved: "#4ade80",
};

// ── SIEM sources ─────────────────────────────────────────────────────────────
const SIEM_SOURCES = [
  { name: "Splunk Enterprise", status: "connected", eps: 12_450, icon: Database, color: "#f97316" },
  { name: "Elastic SIEM", status: "connected", eps: 8_320, icon: Layers, color: "#00e5ff" },
  { name: "Wazuh Manager", status: "connected", eps: 3_100, icon: Shield, color: "#4ade80" },
  { name: "Windows Event Collector", status: "connected", eps: 5_600, icon: Cpu, color: "#a855f7" },
  { name: "Suricata IDS", status: "connected", eps: 22_000, icon: Radio, color: "#e21227" },
  { name: "Zeek Network Monitor", status: "warning", eps: 0, icon: Network, color: "#fbbf24" },
];

// ── Threat intel feeds ─────────────────────────────────────────────────────────
const THREAT_FEEDS = [
  { name: "CISA KEV", type: "CVE", count: 1117, lastUpdate: "2m ago", color: "#e21227", fresh: true },
  { name: "AlienVault OTX", type: "IOC", count: 4_280_000, lastUpdate: "15m ago", color: "#f97316", fresh: true },
  { name: "VirusTotal Intelligence", type: "Hash", count: 890_000, lastUpdate: "5m ago", color: "#fbbf24", fresh: true },
  { name: "Shodan Monitor", type: "Assets", count: 2_344, lastUpdate: "1h ago", color: "#00e5ff", fresh: false },
  { name: "AbuseIPDB", type: "IP Reputation", count: 1_200_000, lastUpdate: "30m ago", color: "#a855f7", fresh: true },
  { name: "Mitre ATT&CK", type: "TTP", count: 760, lastUpdate: "1d ago", color: "#4ade80", fresh: false },
];

// ── Playbooks ─────────────────────────────────────────────────────────────────
const PLAYBOOKS = [
  { name: "Ransomware Response", steps: ["Isolate host","Snapshot memory","Block C2 IPs","Preserve evidence","Notify legal"], trigger: "RULE-001-RANSOM", color: "#e21227" },
  { name: "Credential Theft", steps: ["Force password reset","Revoke active sessions","Audit access logs","Enable MFA enforce"], trigger: "RULE-012-CREDS", color: "#f97316" },
  { name: "C2 Beaconing", steps: ["Block outbound IP","PCAP capture","Hash file artifacts","Threat hunt laterally"], trigger: "RULE-099-C2", color: "#a855f7" },
  { name: "Brute Force", steps: ["Block source IP","Notify account owner","Review auth logs","Add to watchlist"], trigger: "RULE-003-BRUTE", color: "#fbbf24" },
];

// ── Animated canvas ───────────────────────────────────────────────────────────
function SOCCanvas() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    function resize() { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    let t = 0;
    // Connection lines between random nodes
    const nodeCount = 18;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0002, vy: (Math.random() - 0.5) * 0.0002,
      sev: Math.random() < 0.15 ? "crit" : Math.random() < 0.3 ? "high" : "low",
    }));
    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.006;
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      // Radial glow center
      const grd = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.min(W, H) * 0.5);
      grd.addColorStop(0, "rgba(0,229,255,0.04)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });
      // Edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W;
          const dy = (nodes[i].y - nodes[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * W, nodes[i].y * H);
            ctx.lineTo(nodes[j].x * W, nodes[j].y * H);
            ctx.strokeStyle = `rgba(0,229,255,${(1 - dist / 160) * 0.07})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      // Nodes
      nodes.forEach((n, idx) => {
        const px = n.x * W, py = n.y * H;
        const col = n.sev === "crit" ? "226,18,39" : n.sev === "high" ? "249,115,22" : "0,229,255";
        const pulse = 0.6 + 0.4 * Math.sin(t * 2 + idx);
        ctx.beginPath();
        ctx.arc(px, py, n.sev === "crit" ? 5 : n.sev === "high" ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},${pulse})`;
        ctx.fill();
        if (n.sev === "crit") {
          ctx.beginPath();
          ctx.arc(px, py, 8 + 4 * Math.sin(t * 3 + idx), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(226,18,39,${0.25 * pulse})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);
  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── Live metric ticker ────────────────────────────────────────────────────────
function useLiveTicker(initial: number, variance: number, interval: number) {
  const [val, setVal] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setVal(v => Math.max(0, v + Math.round((Math.random() - 0.5) * variance))), interval);
    return () => clearInterval(id);
  }, [variance, interval]);
  return val;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SOCCommandModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"overview"|"alerts"|"intel"|"playbooks"|"siem"|"hunt">("overview");
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPlaybook, setSelectedPlaybook] = useState<number | null>(null);
  const [pbRunning, setPbRunning] = useState<Set<number>>(new Set());
  const [pbCompleted, setPbCompleted] = useState<Set<number>>(new Set());

  const eps = useLiveTicker(51_470, 1200, 800);
  const activeAlerts = useLiveTicker(8, 2, 2000);
  const blockedIPs = useLiveTicker(14_332, 50, 3000);
  const mttr = useLiveTicker(18, 3, 4000);

  function dismissAlert(id: number) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "resolved" } : a));
  }

  function runPlaybook(pbIdx: number) {
    setPbRunning(prev => new Set([...prev, pbIdx]));
    setTimeout(() => {
      setPbRunning(prev => { const s = new Set(prev); s.delete(pbIdx); return s; });
      setPbCompleted(prev => new Set([...prev, pbIdx]));
    }, 3000);
  }

  const filteredAlerts = search
    ? alerts.filter(a => a.type.toLowerCase().includes(search.toLowerCase()) || a.src.includes(search) || a.dst.includes(search))
    : alerts;

  if (!open) return null;

  const TABS = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "intel", label: "Threat Intel", icon: Globe },
    { id: "playbooks", label: "Playbooks", icon: Zap },
    { id: "siem", label: "SIEM", icon: Database },
    { id: "hunt", label: "Threat Hunt", icon: Search },
  ] as const;

  return (
    <motion.div className="fixed inset-0 z-[9999] flex flex-col bg-[#020b14]"
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,229,255,0.01)_3px,rgba(0,229,255,0.01)_4px)]" />
      <SOCCanvas />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-cyan-900/30 bg-black/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-950/60 border border-cyan-800/40">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-black" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-500/70 tracking-widest">UNIFIED</div>
            <h1 className="text-base font-black text-white tracking-wide">SOC COMMAND CENTER</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/30">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[11px] font-mono text-red-300">{activeAlerts} ACTIVE ALERTS</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-[11px] font-mono text-green-400">ALL SYSTEMS ONLINE</span>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 flex border-b border-white/8 bg-black/40 backdrop-blur shrink-0 px-4">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-mono tracking-wider border-b-2 transition-all whitespace-nowrap ${active ? "border-cyan-500 text-cyan-400 bg-cyan-950/20" : "border-transparent text-white/40 hover:text-white/70"}`}>
              <Icon className="w-3 h-3" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Events/Second", value: eps.toLocaleString(), delta: "+8%", up: true, color: "#00e5ff", icon: Activity },
                  { label: "Active Alerts", value: activeAlerts.toString(), delta: "-2", up: false, color: "#e21227", icon: AlertTriangle },
                  { label: "Blocked IPs", value: blockedIPs.toLocaleString(), delta: "+50", up: true, color: "#4ade80", icon: Lock },
                  { label: "MTTR (min)", value: mttr.toString(), delta: "-3min", up: false, color: "#a855f7", icon: Clock },
                ].map((kpi, i) => {
                  const Icon = kpi.icon;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="relative overflow-hidden rounded-xl p-4 border backdrop-blur" style={{ borderColor: kpi.color + "25", background: kpi.color + "06" }}>
                      <div className="flex items-start justify-between mb-2">
                        <Icon className="w-4 h-4 opacity-50" style={{ color: kpi.color }} />
                        <div className={`flex items-center gap-0.5 text-[9px] font-mono ${kpi.up ? "text-green-400" : "text-red-400"}`}>
                          {kpi.up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {kpi.delta}
                        </div>
                      </div>
                      <div className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
                      <div className="text-[10px] font-mono text-white/40 mt-0.5">{kpi.label}</div>
                      <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: `linear-gradient(to right,transparent,${kpi.color}60,transparent)` }} />
                    </motion.div>
                  );
                })}
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent critical alerts */}
                <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4">
                  <h3 className="text-[11px] font-mono text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-400" /> Critical & High Alerts
                  </h3>
                  <div className="space-y-2">
                    {alerts.filter(a => a.sev === "CRITICAL" || a.sev === "HIGH").slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/3 border border-white/5 hover:border-white/12 transition-all cursor-pointer" onClick={() => { setTab("alerts"); setSelectedAlert(a.id); }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: SEV_COLORS[a.sev] }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-white truncate">{a.type}</div>
                          <div className="text-[9px] font-mono text-white/35">{a.src} → {a.dst}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: STATUS_COLORS[a.status] + "20", color: STATUS_COLORS[a.status] }}>{a.status.toUpperCase()}</div>
                          <div className="text-[9px] font-mono text-white/25">{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SIEM health */}
                <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4">
                  <h3 className="text-[11px] font-mono text-white/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Database className="w-3 h-3 text-cyan-400" /> SIEM Data Sources
                  </h3>
                  <div className="space-y-2">
                    {SIEM_SOURCES.map((src, i) => {
                      const Icon = src.icon;
                      return (
                        <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/3 border border-white/5">
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: src.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-mono text-white/70">{src.name}</div>
                            <div className="text-[9px] font-mono text-white/30">{src.eps.toLocaleString()} EPS</div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${src.status === "connected" ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Threat landscape */}
              <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4">
                <h3 className="text-[11px] font-mono text-white/60 uppercase tracking-widest mb-3">Threat Landscape — Last 24h</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "Malware", pct: 35, color: "#e21227" },
                    { label: "Phishing", pct: 28, color: "#f97316" },
                    { label: "Brute Force", pct: 18, color: "#fbbf24" },
                    { label: "Recon", pct: 12, color: "#a855f7" },
                    { label: "Other", pct: 7, color: "#4ade80" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="relative w-14 h-14">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke={item.color} strokeWidth="4"
                            strokeDasharray={`${item.pct * 0.879} ${(100 - item.pct) * 0.879}`} strokeLinecap="round" opacity="0.8" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-black" style={{ color: item.color }}>{item.pct}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-white/40 text-center">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ALERTS ── */}
          {tab === "alerts" && (
            <motion.div key="alerts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-black/40 rounded-lg px-3 py-1.5 border border-white/8">
                  <Search className="w-3 h-3 text-white/30" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by type, IP, protocol..."
                    className="flex-1 bg-transparent text-[11px] font-mono text-white outline-none placeholder:text-white/25" />
                </div>
                <div className="flex gap-1">
                  {["All","CRITICAL","HIGH","MEDIUM","LOW"].map(f => (
                    <button key={f} className="px-2.5 py-1 rounded text-[9px] font-mono text-white/40 hover:text-white hover:bg-white/8 transition-all border border-white/8">{f}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredAlerts.map(a => {
                  const sel = selectedAlert === a.id;
                  return (
                    <motion.div key={a.id} layout className={`rounded-xl border backdrop-blur overflow-hidden cursor-pointer transition-all ${sel ? "" : "hover:border-white/15"}`}
                      style={sel ? { borderColor: SEV_COLORS[a.sev] + "50", background: SEV_COLORS[a.sev] + "05" } : { borderColor: "rgba(255,255,255,0.06)" }}
                      onClick={() => setSelectedAlert(sel ? null : a.id)}>
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: SEV_COLORS[a.sev] }} />
                        <div className="px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0" style={{ background: SEV_COLORS[a.sev] + "20", color: SEV_COLORS[a.sev] }}>{a.sev}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-white">{a.type}</div>
                          <div className="text-[10px] font-mono text-white/35">{a.rule}</div>
                        </div>
                        <div className="text-[10px] font-mono text-white/40 text-right">
                          <div>{a.src} → {a.dst}</div>
                          <div className="text-white/25">{a.proto} · {a.time}</div>
                        </div>
                        <div className="px-2 py-0.5 rounded text-[9px] font-mono shrink-0" style={{ background: STATUS_COLORS[a.status] + "20", color: STATUS_COLORS[a.status] }}>{a.status.toUpperCase()}</div>
                      </div>
                      <AnimatePresence>
                        {sel && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/5 overflow-hidden">
                            <div className="p-3 flex items-center gap-2 flex-wrap">
                              <button onClick={() => dismissAlert(a.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-800/30 hover:bg-green-700/40 text-green-300 text-[10px] font-mono border border-green-700/30 transition-all"><CheckCircle className="w-3 h-3" /> Dismiss</button>
                              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-800/30 hover:bg-yellow-700/40 text-yellow-300 text-[10px] font-mono border border-yellow-700/30 transition-all"><Eye className="w-3 h-3" /> Investigate</button>
                              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-800/30 hover:bg-red-700/40 text-red-300 text-[10px] font-mono border border-red-700/30 transition-all"><Zap className="w-3 h-3" /> Run Playbook</button>
                              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[10px] font-mono border border-white/8 transition-all"><FileText className="w-3 h-3" /> Create Ticket</button>
                              <div className="ml-auto text-[10px] font-mono text-white/25">Alert ID: SOC-{String(a.id).padStart(6, "0")}</div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── THREAT INTEL ── */}
          {tab === "intel" && (
            <motion.div key="intel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {THREAT_FEEDS.map((feed, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4 hover:border-white/15 transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-[11px] font-bold text-white mb-0.5">{feed.name}</div>
                        <div className="text-[9px] font-mono text-white/35">{feed.type}</div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono ${feed.fresh ? "bg-green-900/30 text-green-400" : "bg-white/5 text-white/30"}`}>
                        <div className={`w-1 h-1 rounded-full ${feed.fresh ? "bg-green-400 animate-pulse" : "bg-white/30"}`} />
                        {feed.lastUpdate}
                      </div>
                    </div>
                    <div className="text-2xl font-black" style={{ color: feed.color }}>{feed.count.toLocaleString()}</div>
                    <div className="text-[9px] font-mono text-white/30 mt-0.5">indicators</div>
                    <div className="mt-3 h-0.5 rounded-full" style={{ background: `linear-gradient(to right, ${feed.color}60, ${feed.color}10)` }} />
                  </motion.div>
                ))}
              </div>
              <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4">
                <h3 className="text-[11px] font-mono text-white/60 uppercase tracking-widest mb-3">IOC Lookup</h3>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-black/60 border border-white/10 rounded-lg px-3 py-2">
                    <Search className="w-3 h-3 text-white/30" />
                    <input placeholder="IP, domain, hash, URL..."
                      className="flex-1 bg-transparent text-[12px] font-mono text-white outline-none placeholder:text-white/25" />
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-cyan-700/40 hover:bg-cyan-600/50 text-cyan-300 text-[11px] font-mono font-bold border border-cyan-600/30 transition-all">LOOKUP</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PLAYBOOKS ── */}
          {tab === "playbooks" && (
            <motion.div key="playbooks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLAYBOOKS.map((pb, i) => {
                const running = pbRunning.has(i);
                const done = pbCompleted.has(i);
                const sel = selectedPlaybook === i;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="rounded-xl border backdrop-blur overflow-hidden" style={{ borderColor: pb.color + "25", background: pb.color + "06" }}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4" style={{ color: pb.color }} />
                            <h3 className="text-[13px] font-bold text-white">{pb.name}</h3>
                          </div>
                          <div className="text-[9px] font-mono text-white/30">Trigger: {pb.trigger}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedPlaybook(sel ? null : i)}
                            className="px-2.5 py-1 rounded-lg text-[9px] font-mono border border-white/10 text-white/40 hover:text-white hover:bg-white/8 transition-all">
                            {sel ? "HIDE" : "DETAILS"}
                          </button>
                          <button onClick={() => runPlaybook(i)} disabled={running}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all ${done ? "bg-green-800/30 text-green-400 border border-green-700/30" : running ? "bg-yellow-800/30 text-yellow-400 border border-yellow-700/30 animate-pulse" : "border"}`}
                            style={!done && !running ? { background: pb.color + "20", color: pb.color, borderColor: pb.color + "40" } : {}}>
                            {done ? "✓ DONE" : running ? "RUNNING..." : "▶ RUN"}
                          </button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {sel && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-3 border-t border-white/5 space-y-2">
                              {pb.steps.map((step, si) => (
                                <div key={si} className="flex items-center gap-2">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-mono ${done || (running && si === 0) ? "bg-green-900/40 text-green-400" : "bg-white/5 text-white/30"}`}>{done || (running && si === 0) ? "✓" : si + 1}</div>
                                  <span className="text-[11px] text-white/60">{step}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ── SIEM ── */}
          {tab === "siem" && (
            <motion.div key="siem" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SIEM_SOURCES.map((src, i) => {
                  const Icon = src.icon;
                  return (
                    <div key={i} className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4" style={{ color: src.color }} />
                        <span className="text-[12px] font-bold text-white">{src.name}</span>
                        <div className={`ml-auto w-2 h-2 rounded-full ${src.status === "connected" ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
                      </div>
                      <div className="text-xl font-black" style={{ color: src.color }}>{src.eps.toLocaleString()}</div>
                      <div className="text-[10px] font-mono text-white/35 mb-3">events/second</div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (src.eps / 22000) * 100)}%`, background: src.color + "80" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-white/8 bg-black/60 backdrop-blur p-4">
                <h3 className="text-[11px] font-mono text-white/60 uppercase tracking-widest mb-3">Query Builder — Lucene / KQL</h3>
                <textarea rows={3} className="w-full bg-black/60 border border-white/8 rounded-lg px-3 py-2 text-[11px] font-mono text-green-400 outline-none resize-none focus:border-cyan-500/40"
                  defaultValue={`event.category:network AND event.action:connection AND source.ip:10.0.0.0/8 AND NOT destination.ip:10.0.0.0/8\n| stats count by source.ip, destination.ip, destination.port\n| sort -count | head 20`} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-mono text-white/25">Time range: Last 24h</span>
                  <button className="px-4 py-1.5 rounded-lg bg-cyan-700/40 hover:bg-cyan-600/50 text-cyan-300 text-[11px] font-mono font-bold border border-cyan-600/30 transition-all">▶ EXECUTE QUERY</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── THREAT HUNT ── */}
          {tab === "hunt" && (
            <motion.div key="hunt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: "Unusual Process Spawn", desc: "Hunt for cmd.exe/powershell spawned from unexpected parents (Office, browser).", tactic: "Execution", color: "#fbbf24" },
                  { name: "Beaconing Detection", desc: "Identify periodic outbound connections with regularity scores above 0.8.", tactic: "C2", color: "#e21227" },
                  { name: "Living Off the Land", desc: "Detect LOLBins: certutil, regsvr32, mshta, wscript used maliciously.", tactic: "Defense Evasion", color: "#a855f7" },
                  { name: "Kerberoasting Activity", desc: "RC4-encrypted Kerberos TGS requests targeting non-machine accounts.", tactic: "Credential Access", color: "#f97316" },
                  { name: "Data Staging", desc: "Large archive creation or file copying to staging directories.", tactic: "Collection", color: "#00e5ff" },
                  { name: "Abnormal Auth Hours", desc: "User authentications outside business hours or from unusual geolocation.", tactic: "Initial Access", color: "#4ade80" },
                ].map((hunt, i) => (
                  <div key={i} className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4 hover:border-white/15 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="px-2 py-0.5 rounded text-[9px] font-mono" style={{ background: hunt.color + "20", color: hunt.color }}>{hunt.tactic}</div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded bg-white/5 text-[9px] font-mono text-white/50 hover:bg-white/10">RUN</button>
                    </div>
                    <h3 className="text-[12px] font-bold text-white mb-1.5">{hunt.name}</h3>
                    <p className="text-[10px] text-white/40 leading-4">{hunt.desc}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/8 bg-black/40 backdrop-blur p-4">
                <h3 className="text-[11px] font-mono text-white/60 uppercase tracking-widest mb-3">Custom Hunt Query</h3>
                <textarea rows={4} className="w-full bg-black/60 border border-white/8 rounded-lg px-3 py-2 text-[11px] font-mono text-green-400 outline-none resize-none focus:border-cyan-500/40"
                  placeholder="# Write your Sigma/YARA/KQL hunting rule here..." />
                <div className="flex gap-2 mt-2">
                  <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-700/40 hover:bg-red-600/50 text-red-300 text-[11px] font-mono font-bold border border-red-600/30 transition-all"><Search className="w-3 h-3" /> HUNT</button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[11px] font-mono border border-white/8 transition-all"><FileText className="w-3 h-3" /> Load Template</button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
