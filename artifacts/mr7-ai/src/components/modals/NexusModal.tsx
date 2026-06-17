import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Square, Brain, Zap, ChevronDown, ChevronUp,
  Globe, Calculator, Code, Search, Network, FileSearch,
  Shield, Terminal, Wifi, Server, CheckCircle2, XCircle,
  RefreshCw, Clock, Layers, Cpu, Flame, Swords, Crown,
  Crosshair, Eye, AlertCircle, Radio,
} from "lucide-react";
import { streamAgent, streamCouncil, type AgentEvent, type CouncilEvent } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

interface NexusModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type AgentMode = "brain" | "standalone";

type TierDef = {
  id: number;
  code: string;
  label: string;
  desc: string;
  icon: typeof Cpu;
  color: string;
  glow: string;
  border: string;
  bg: string;
  steps: number;
  brains: number;
  council: boolean;
  badge: string;
  systemHint: string;
};

const TIERS: TierDef[] = [
  {
    id: 1, code: "SCOUT", label: "Scout", icon: Eye,
    desc: "5-step recon agent — fast and surgical",
    color: "#94a3b8", glow: "rgba(148,163,184,0.3)", border: "rgba(148,163,184,0.3)", bg: "rgba(148,163,184,0.06)",
    steps: 5, brains: 1, council: false, badge: "I",
    systemHint: "Perform rapid, precise recon. Prioritise speed.",
  },
  {
    id: 2, code: "RECON", label: "Recon", icon: Crosshair,
    desc: "8-step deep recon with web intelligence",
    color: "#60a5fa", glow: "rgba(96,165,250,0.35)", border: "rgba(96,165,250,0.35)", bg: "rgba(96,165,250,0.06)",
    steps: 8, brains: 1, council: false, badge: "II",
    systemHint: "Deep recon mode. Use web search and DNS aggressively. Correlate all findings.",
  },
  {
    id: 3, code: "GHOST", label: "Ghost", icon: Shield,
    desc: "10-step red team — exploit & evade",
    color: "#c084fc", glow: "rgba(192,132,252,0.35)", border: "rgba(192,132,252,0.35)", bg: "rgba(192,132,252,0.06)",
    steps: 10, brains: 1, council: false, badge: "III",
    systemHint: "Red team operator mode. Find vulnerabilities, generate exploits, enumerate all attack surfaces. Redteam mode on.",
  },
  {
    id: 4, code: "CIPHER", label: "Cipher", icon: Flame,
    desc: "12-step multi-vector — CVE + exploit chains",
    color: "#fb923c", glow: "rgba(251,146,60,0.4)", border: "rgba(251,146,60,0.4)", bg: "rgba(251,146,60,0.07)",
    steps: 12, brains: 2, council: false, badge: "IV",
    systemHint: "Advanced threat simulation. Chain exploits. Enumerate CVEs. Generate attack playbooks. Use all available tools in sequence.",
  },
  {
    id: 5, code: "OMEGA", label: "Nexus Ω", icon: Crown,
    desc: "15-step Omega — agent + council synthesis",
    color: "#fbbf24", glow: "rgba(251,191,36,0.5)", border: "rgba(251,191,36,0.5)", bg: "rgba(251,191,36,0.08)",
    steps: 15, brains: 5, council: true, badge: "V",
    systemHint: "OMEGA tier. Maximum intelligence. Use every tool. Build comprehensive attack trees. Leave nothing unexplored. This is a full-scale autonomous offensive intelligence run.",
  },
];

type TaskLog =
  | { kind: "step"; step: number; maxSteps: number }
  | { kind: "thinking"; content: string }
  | { kind: "tool_call"; step: number; name: string; args: Record<string, unknown> }
  | { kind: "tool_result"; step: number; name: string; result: string; ok: boolean }
  | { kind: "agent_done"; steps: number }
  | { kind: "council_start" }
  | { kind: "council_brain"; id: string; content: string }
  | { kind: "council_done" }
  | { kind: "error"; message: string };

const TOOL_ICONS: Record<string, typeof Globe> = {
  web_search: Globe, fetch_url: FileSearch, dns_lookup: Network,
  whois_lookup: Server, extract_iocs: Shield, calculate: Calculator,
  analyze_code: Code, port_scan: Wifi, exploit_search: Search,
  generate_pentest_script: Terminal, network_recon: Network,
};
const TOOL_COLORS: Record<string, string> = {
  web_search: "#60a5fa", fetch_url: "#c084fc", dns_lookup: "#34d399",
  whois_lookup: "#34d399", extract_iocs: "#fbbf24", calculate: "#4ade80",
  analyze_code: "#e879f9", port_scan: "#fb923c", exploit_search: "#f87171",
  generate_pentest_script: "#f87171", network_recon: "#34d399",
};

const QUICK_TASKS = [
  { label: "Full Attack Surface Map", icon: Network, task: "Build a complete attack surface map for example.com — DNS, WHOIS, open ports, CVEs, subdomains, and a prioritised list of entry points." },
  { label: "Zero-Day Hunt", icon: Swords, task: "Search for unpublished or recent critical CVEs in Apache HTTP Server and Nginx. Find proof-of-concept exploits and generate a test script." },
  { label: "Chain Exploit Plan", icon: Flame, task: "Design a multi-stage exploit chain for a target running WordPress 6.x on a Linux VPS. Include initial access, privilege escalation, and persistence." },
  { label: "Threat Intel Report", icon: FileSearch, task: "Compile a detailed threat intelligence report on the APT28 / Fancy Bear group — TTPs, recent campaigns, IOCs, and detection signatures." },
  { label: "Red Team Playbook", icon: Shield, task: "Generate a complete red team engagement playbook for an internal corporate network. Include recon, lateral movement, exfiltration, and cleanup." },
  { label: "Pentest Automation", icon: Terminal, task: "Write a full Python pentest automation suite for web app testing — SQLi, XSS, CSRF, IDOR, broken auth, and SSRF detection." },
];

function NexusIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 28 28" fill="none">
      <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" opacity="0.6" />
      <circle cx="14" cy="14" r="2.5" fill="currentColor" opacity="0.9" />
      <line x1="14" y1="2" x2="14" y2="7" stroke="currentColor" strokeWidth="1.8" />
      <line x1="25" y1="8" x2="21" y2="11" stroke="currentColor" strokeWidth="1.8" />
      <line x1="25" y1="20" x2="21" y2="17" stroke="currentColor" strokeWidth="1.8" />
      <line x1="14" y1="26" x2="14" y2="21" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="20" x2="7" y2="17" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="8" x2="7" y2="11" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

// ── CVE LIVE FEED component ───────────────────────────────────────────────────
type CveSev = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type CveEntry = {
  id: string; cve: string; product: string; vendor: string;
  severity: CveSev; score: number; desc: string; ts: number;
};

const CVE_POOL: Omit<CveEntry, "ts">[] = [
  { id: "1", cve: "CVE-2025-21298", product: "Windows OLE", vendor: "Microsoft", severity: "CRITICAL", score: 9.8, desc: "Remote code execution via Object Linking and Embedding deserialization flaw" },
  { id: "2", cve: "CVE-2025-0282", product: "Ivanti Connect Secure", vendor: "Ivanti", severity: "CRITICAL", score: 9.0, desc: "Stack overflow allows unauthenticated remote code execution" },
  { id: "3", cve: "CVE-2025-24200", product: "iOS / iPadOS", vendor: "Apple", severity: "HIGH", score: 7.1, desc: "USB Restricted Mode bypass via physical access vector" },
  { id: "4", cve: "CVE-2025-1974", product: "ingress-nginx", vendor: "Kubernetes", severity: "CRITICAL", score: 9.8, desc: "Admission controller RCE via crafted annotation injection" },
  { id: "5", cve: "CVE-2025-23209", product: "Craft CMS", vendor: "Craft", severity: "CRITICAL", score: 9.0, desc: "Server-side template injection leading to remote code execution" },
  { id: "6", cve: "CVE-2025-2294", product: "Kubio AI Page Builder", vendor: "WordPress", severity: "HIGH", score: 7.2, desc: "Path traversal via Local File Inclusion vulnerability" },
  { id: "7", cve: "CVE-2025-20188", product: "IOS XE Software", vendor: "Cisco", severity: "CRITICAL", score: 10.0, desc: "Hardcoded JSON Web Token allows arbitrary file upload" },
  { id: "8", cve: "CVE-2025-24054", product: "Windows NTLM", vendor: "Microsoft", severity: "HIGH", score: 6.5, desc: "Hash disclosure through spoofing minimal interaction" },
  { id: "9", cve: "CVE-2025-31200", product: "CoreAudio", vendor: "Apple", severity: "HIGH", score: 7.5, desc: "Memory corruption via crafted media file parsing" },
  { id: "10", cve: "CVE-2025-29824", product: "Windows CLFS Driver", vendor: "Microsoft", severity: "HIGH", score: 7.8, desc: "Use-after-free in Common Log File System driver" },
  { id: "11", cve: "CVE-2025-30397", product: "Scripting Engine", vendor: "Microsoft", severity: "HIGH", score: 7.5, desc: "Memory corruption in browser scripting engine" },
  { id: "12", cve: "CVE-2025-4664", product: "Chrome Loader", vendor: "Google", severity: "HIGH", score: 8.8, desc: "Insufficient policy enforcement allows cross-origin data leakage" },
  { id: "13", cve: "CVE-2025-3248", product: "Langflow", vendor: "Langflow", severity: "CRITICAL", score: 9.8, desc: "Missing auth on /api/v1/validate/code allows arbitrary code exec" },
  { id: "14", cve: "CVE-2025-34028", product: "Commvault Command Center", vendor: "Commvault", severity: "CRITICAL", score: 10.0, desc: "Path traversal leads to arbitrary code execution pre-auth" },
];

const SEV_COLOR: Record<CveSev, string> = {
  CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#fbbf24", LOW: "#22c55e",
};
const SEV_BG: Record<CveSev, string> = {
  CRITICAL: "rgba(226,18,39,0.15)", HIGH: "rgba(249,115,22,0.15)", MEDIUM: "rgba(251,191,36,0.12)", LOW: "rgba(34,197,94,0.10)",
};

function CveLiveFeed() {
  const [entries, setEntries] = useState<CveEntry[]>([]);
  const [filter, setFilter] = useState<"ALL" | CveSev>("ALL");
  const [paused, setPaused] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const idxRef  = useRef(0);

  const addEntry = useCallback(() => {
    if (paused) return;
    const src = CVE_POOL[idxRef.current % CVE_POOL.length];
    idxRef.current++;
    setEntries(prev => {
      const next = [{ ...src, id: String(Date.now()), ts: Date.now() }, ...prev].slice(0, 40);
      return next;
    });
  }, [paused]);

  useEffect(() => {
    addEntry(); addEntry(); addEntry();
    const t = setInterval(addEntry, 2800);
    return () => clearInterval(t);
  }, [addEntry]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [entries.length]);

  const filtered = filter === "ALL" ? entries : entries.filter(e => e.severity === filter);

  return (
    <div className="flex flex-col h-full" style={{ background: "#070707" }}>
      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "rgba(226,18,39,0.15)" }}>
        <Radio className="w-3.5 h-3.5 animate-pulse" style={{ color: "#e21227" }} />
        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "#e21227" }}>CVE LIVE FEED</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 5px #22c55e", animation: "pulse 1s infinite" }} />
        <span className="text-[8px] font-mono" style={{ color: "#22c55e" }}>STREAMING</span>
        <div className="flex-1" />
        {/* Severity filter */}
        <div className="flex gap-1">
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-2 py-0.5 rounded text-[7px] font-black border transition-all"
              style={filter === s
                ? { background: s === "ALL" ? "rgba(255,255,255,0.1)" : SEV_BG[s as CveSev], borderColor: s === "ALL" ? "rgba(255,255,255,0.3)" : SEV_COLOR[s as CveSev], color: s === "ALL" ? "#fff" : SEV_COLOR[s as CveSev] }
                : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }
              }
            >{s}</button>
          ))}
        </div>
        <button onClick={() => setPaused(p => !p)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold border transition-all"
          style={paused
            ? { background: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.4)", color: "#fbbf24" }
            : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }
          }
        >{paused ? "▶ RESUME" : "⏸ PAUSE"}</button>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(226,18,39,0.3) transparent" }}>
        <AnimatePresence initial={false}>
          {filtered.map(e => (
            <motion.div key={e.id}
              initial={{ opacity: 0, x: -12, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${SEV_COLOR[e.severity]}22`, background: SEV_BG[e.severity] }}
            >
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: SEV_COLOR[e.severity] + "22", color: SEV_COLOR[e.severity], border: `1px solid ${SEV_COLOR[e.severity]}44` }}>
                    {e.severity}
                  </span>
                  <span className="text-[10px] font-black font-mono" style={{ color: SEV_COLOR[e.severity] }}>{e.cve}</span>
                  <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                    CVSS {e.score.toFixed(1)}
                  </span>
                  <div className="flex-1" />
                  <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {new Date(e.ts).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>{e.vendor}</span>
                  <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>›</span>
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>{e.product}</span>
                </div>
                <p className="text-[9px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{e.desc}</p>
                {/* CVSS bar */}
                <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(e.score / 10) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ background: SEV_COLOR[e.severity] }} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Shield className="w-8 h-8" style={{ color: "rgba(255,255,255,0.1)" }} />
            <p className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>لا توجد إدخالات لهذا المستوى</p>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-t" style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.4)" }}>
        {(["CRITICAL","HIGH","MEDIUM","LOW"] as CveSev[]).map(s => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: SEV_COLOR[s] }} />
            <span className="text-[8px] font-mono" style={{ color: SEV_COLOR[s] }}>{entries.filter(e => e.severity === s).length}</span>
            <span className="text-[7px] text-muted-foreground/30">{s.slice(0,4)}</span>
          </div>
        ))}
        <span className="ml-auto text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{entries.length} total</span>
      </div>
    </div>
  );
}

export function NexusModal({ open, onOpenChange }: NexusModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [nexusTab, setNexusTab] = useState<"agent" | "cve">("agent");
  const [tier, setTier] = useState<TierDef>(TIERS[0]);
  const [mode, setMode] = useState<AgentMode>("brain");
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "agent" | "council" | "done">("idle");
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [agentAnswer, setAgentAnswer] = useState("");
  const [councilSynthesis, setCouncilSynthesis] = useState("");
  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});
  const [gatewayOk, setGatewayOk] = useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [sessionReqs, setSessionReqs] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [healthExpanded, setHealthExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const agentAnswerRef = useRef("");
  const councilRef = useRef("");

  useEffect(() => {
    if (!open) return;
    const start = performance.now();
    fetch("/api/healthz")
      .then((r) => { setGatewayOk(r.ok); setLatencyMs(Math.round(performance.now() - start)); })
      .catch(() => { setGatewayOk(false); setLatencyMs(null); });
  }, [open]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, agentAnswer, councilSynthesis]);

  function close() { if (running) stop(); onOpenChange(false); }
  function stop() { abortRef.current?.abort(); setRunning(false); setPhase("idle"); }
  function clearAll() {
    setLogs([]); setAgentAnswer(""); setCouncilSynthesis("");
    agentAnswerRef.current = ""; councilRef.current = "";
    setCurrentStep(0); setPhase("idle"); setExpandedThinking({});
  }

  function getContextMessages(taskText: string) {
    if (mode === "standalone") return [{ role: "user" as const, content: taskText }];
    const active = state.chats.find((c) => c.id === state.activeChatId);
    const history = (active?.messages ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    return [...history, { role: "user" as const, content: taskText }];
  }

  async function execute() {
    if (!task.trim() || running) return;
    clearAll();
    setRunning(true);
    setPhase("agent");
    setSessionReqs(r => r + 1);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const messages = getContextMessages(task.trim());

    const sysPrompt = [
      "You are NEXUS — a hyper-advanced autonomous cybersecurity AI agent.",
      `Operating at Tier ${tier.badge} (${tier.code}).`,
      tier.systemHint,
      "Use all available tools in a logical chain. Produce actionable, expert-level intelligence.",
    ].join(" ");

    try {
      await streamAgent(
        { messages, language: (lang as "en" | "ar") ?? "en", maxSteps: tier.steps, customSystemPrompt: sysPrompt, redteamMode: true },
        (ev: AgentEvent) => {
          if (ev.type === "step_start") {
            setCurrentStep(ev.step);
            setLogs((p) => [...p, { kind: "step", step: ev.step, maxSteps: ev.maxSteps }]);
          } else if (ev.type === "thinking") {
            setLogs((p) => [...p, { kind: "thinking", content: ev.content }]);
          } else if (ev.type === "tool_call") {
            setLogs((p) => [...p, { kind: "tool_call", step: ev.step, name: ev.name, args: ev.args }]);
          } else if (ev.type === "tool_result") {
            setLogs((p) => [...p, { kind: "tool_result", step: ev.step, name: ev.name, result: ev.result, ok: ev.ok }]);
          } else if (ev.type === "answer_chunk") {
            agentAnswerRef.current += ev.content;
            setAgentAnswer(agentAnswerRef.current);
          } else if (ev.type === "done") {
            setLogs((p) => [...p, { kind: "agent_done", steps: ev.steps }]);
            setSessionSteps(s => s + ev.steps);
          }
        },
        ctrl.signal,
      );

      if (tier.council && !ctrl.signal.aborted) {
        setPhase("council");
        setLogs((p) => [...p, { kind: "council_start" }]);
        const councilMessages = [
          ...messages,
          { role: "assistant" as const, content: agentAnswerRef.current },
          {
            role: "user" as const,
            content: "Now synthesize the above intelligence using multi-brain analysis. Produce a comprehensive, structured threat report with executive summary, technical details, attack vectors, and recommended mitigations.",
          },
        ];
        await streamCouncil(
          { messages: councilMessages, language: (lang as "en" | "ar") ?? "en", customInstructions: "", memory: [], autoSelect: true, maxBrains: 3, fusion: true, scoring: false },
          (ev: CouncilEvent) => {
            if (ev.type === "brain_chunk") {
              councilRef.current += ev.content;
              setCouncilSynthesis(councilRef.current);
            } else if (ev.type === "synthesis_chunk") {
              councilRef.current += ev.content;
              setCouncilSynthesis(councilRef.current);
            } else if (ev.type === "done") {
              setLogs((p) => [...p, { kind: "council_done" }]);
            }
          },
          ctrl.signal,
        );
      }

      setPhase("done");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setLogs((p) => [...p, { kind: "error", message: (e as Error)?.message ?? "Nexus failed" }]);
      }
    } finally {
      setRunning(false);
      setPhase((p) => (p !== "idle" ? "done" : "idle"));
    }
  }

  const activeTier = tier;
  const hasOutput = logs.length > 0 || agentAnswer || councilSynthesis;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.82)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl max-h-[94vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "#070707",
              border: `1px solid ${activeTier.border}`,
              boxShadow: `0 0 80px ${activeTier.glow}, 0 30px 60px rgba(0,0,0,0.9)`,
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: activeTier.border, background: activeTier.bg }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0"
                  style={{ background: activeTier.bg, borderColor: activeTier.border }}
                >
                  <NexusIcon className="w-6 h-6" style={{ color: activeTier.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black tracking-widest" style={{ color: activeTier.color }}>
                      NEXUS
                    </span>
                    <span className="text-sm font-black tracking-wider text-white">AGENT</span>
                    <span
                      className="text-[9px] font-black px-2 py-0.5 rounded border font-mono tracking-widest"
                      style={{ color: activeTier.color, borderColor: activeTier.border, background: activeTier.bg }}
                    >
                      TIER {activeTier.badge} · {activeTier.code}
                    </span>
                    {activeTier.council && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono"
                        style={{ color: "#fbbf24", borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.08)" }}
                      >
                        + COUNCIL
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#444" }}>
                    {activeTier.desc} · {activeTier.steps} steps · {activeTier.brains} brain{activeTier.brains > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Main tab switcher */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  {([
                    { id: "agent", label: "AGENT", color: activeTier.color },
                    { id: "cve",   label: "CVE LIVE", color: "#e21227" },
                  ] as const).map(tb => (
                    <button key={tb.id} onClick={() => setNexusTab(tb.id)}
                      className="px-2.5 py-1 text-[8px] font-black tracking-widest transition-all"
                      style={nexusTab === tb.id
                        ? { background: tb.id === "cve" ? "rgba(226,18,39,0.18)" : activeTier.bg, color: tb.color, borderRight: "1px solid rgba(255,255,255,0.06)" }
                        : { background: "transparent", color: "rgba(255,255,255,0.28)", borderRight: "1px solid rgba(255,255,255,0.06)" }
                      }
                    >
                      {tb.id === "cve" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />}
                      {tb.label}
                    </button>
                  ))}
                </div>

                {/* Health toggle button */}
                {nexusTab === "agent" && <button
                  onClick={() => setHealthExpanded(h => !h)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all"
                  style={{
                    background: healthExpanded ? "rgba(0,229,204,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${healthExpanded ? "rgba(0,229,204,0.35)" : "rgba(255,255,255,0.08)"}`,
                  }}
                  title="NEXUS Health Dashboard"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{
                    background: gatewayOk === null ? "#666" : gatewayOk ? "#00e5cc" : "#ff4d4d",
                    boxShadow: gatewayOk ? "0 0 6px #00e5cc" : undefined,
                  }} />
                  <span className="text-[9px] font-mono hidden sm:block" style={{ color: gatewayOk ? "#00e5cc" : "#666" }}>
                    {gatewayOk === null ? "INIT" : gatewayOk ? `${latencyMs ?? "?"}ms` : "OFFLINE"}
                  </span>
                  {healthExpanded
                    ? <ChevronUp className="w-3 h-3 text-gray-600" />
                    : <ChevronDown className="w-3 h-3 text-gray-600" />}
                </button>}
                <button onClick={close} className="p-1.5 rounded-lg transition-colors" style={{ color: "#555", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#555"; (e.currentTarget as HTMLElement).style.background = ""; }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── NEXUS HEALTH DASHBOARD ── */}
            {healthExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="px-4 pb-2 border-b"
                style={{ borderColor: "rgba(0,229,204,0.1)", background: "rgba(0,229,204,0.02)" }}
              >
                <div className="py-2 space-y-1.5">
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(0,229,204,0.45)" }}>
                    NEXUS SYSTEM HEALTH
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Gateway API", val: gatewayOk === null ? "INIT" : gatewayOk ? "ONLINE" : "OFFLINE", color: gatewayOk ? "#00e5cc" : "#ff4d4d", dot: true },
                      { label: "Latency", val: latencyMs !== null ? `${latencyMs}ms` : "N/A", color: latencyMs !== null && latencyMs < 300 ? "#00e5cc" : latencyMs !== null && latencyMs < 800 ? "#fbbf24" : "#ff4d4d", dot: false },
                      { label: "Council", val: tier.council ? "ENABLED" : "UNAVAIL", color: tier.council ? "#fbbf24" : "#444", dot: false },
                      { label: "Agent Tier", val: `${tier.code} · ${tier.steps} steps`, color: tier.color, dot: false },
                      { label: "Session Reqs", val: String(sessionReqs), color: "#a78bfa", dot: false },
                      { label: "Steps Used", val: String(sessionSteps), color: activeTier.color, dot: false },
                    ].map(m => (
                      <div key={m.label} className="rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="text-[7px] uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{m.label}</div>
                        <div className="flex items-center gap-1">
                          {m.dot && <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: m.color, boxShadow: `0 0 4px ${m.color}` }} />}
                          <span className="text-[10px] font-black font-mono" style={{ color: m.color }}>{m.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Latency bar */}
                  {latencyMs !== null && (
                    <div className="mt-1">
                      <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (latencyMs / 1500) * 100)}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          style={{ background: latencyMs < 300 ? "#00e5cc" : latencyMs < 800 ? "#fbbf24" : "#ff4d4d" }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>0ms</span>
                        <span className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>1500ms</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── CVE LIVE FEED TAB ── */}
            {nexusTab === "cve" && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <CveLiveFeed />
              </div>
            )}

            {/* ── AGENT TAB BODY ── */}
            {nexusTab === "agent" && <>

            {/* ── Tier Selector ── */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex gap-1.5">
                {TIERS.map((t) => {
                  const Icon = t.icon;
                  const active = tier.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTier(t)}
                      disabled={running}
                      className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all disabled:opacity-40"
                      style={
                        active
                          ? { background: t.bg, borderColor: t.border, boxShadow: `0 0 16px ${t.glow}` }
                          : { background: "#0d0d0d", borderColor: "rgba(255,255,255,0.07)" }
                      }
                    >
                      <div
                        className="w-5 h-5 rounded-lg flex items-center justify-center"
                        style={{ background: active ? t.bg : "transparent" }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: active ? t.color : "#444" }} />
                      </div>
                      <span
                        className="text-[9px] font-black font-mono tracking-widest hidden sm:block"
                        style={{ color: active ? t.color : "#333" }}
                      >
                        {t.code}
                      </span>
                      <span
                        className="text-[8px] font-black font-mono"
                        style={{
                          color: active ? t.color : "#333",
                          background: active ? t.bg : "transparent",
                          padding: "1px 4px", borderRadius: 3,
                        }}
                      >
                        {t.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Mode Toggle ── */}
            <div className="px-4 pb-2">
              <div
                className="flex rounded-xl p-1 gap-1"
                style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {(["brain", "standalone"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={running}
                    className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
                    style={
                      mode === m
                        ? {
                            background: m === "brain" ? "rgba(139,92,246,0.18)" : activeTier.bg,
                            border: `1px solid ${m === "brain" ? "rgba(139,92,246,0.45)" : activeTier.border}`,
                            color: m === "brain" ? "#a78bfa" : activeTier.color,
                          }
                        : { color: "#444", border: "1px solid transparent" }
                    }
                  >
                    {m === "brain" ? <Brain className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                    {m === "brain" ? "Brain Mode" : "Standalone"}
                    {mode === m && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.07)" }}>
                        ACTIVE
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1 px-1" style={{ color: "#444" }}>
                {mode === "brain"
                  ? "🧠 Brain Mode — Reads your current conversation. Agent continues from your context."
                  : "⚡ Standalone — Fresh context. Pure autonomous execution with no history."}
              </p>
            </div>

            {/* ── Quick Presets ── */}
            <div className="px-4 pb-2">
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_TASKS.map((qt) => {
                  const Icon = qt.icon;
                  return (
                    <button
                      key={qt.label}
                      onClick={() => setTask(qt.task)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                      style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.07)", color: "#555" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = activeTier.border;
                        (e.currentTarget as HTMLElement).style.color = activeTier.color;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                        (e.currentTarget as HTMLElement).style.color = "#555";
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {qt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Task Input ── */}
            <div className="px-4 pb-3">
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${activeTier.border}`, background: "#0a0a0a" }}
              >
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) execute(); }}
                  placeholder={`[NEXUS Tier ${activeTier.badge}] Describe the intelligence mission…`}
                  rows={3}
                  disabled={running}
                  className="w-full bg-transparent px-3 py-2.5 text-[12px] font-mono text-gray-200 placeholder:text-gray-700 outline-none resize-none"
                />
                <div
                  className="flex items-center justify-between px-3 py-2 border-t"
                  style={{ borderColor: activeTier.border }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono" style={{ color: "#333" }}>
                      {running
                        ? <span style={{ color: activeTier.color }}>▶ Step {currentStep} / {activeTier.steps} · {phase.toUpperCase()}</span>
                        : "Ctrl+Enter to run"}
                    </span>
                    {running && (
                      <div className="flex gap-0.5">
                        {Array.from({ length: activeTier.steps }).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 h-2.5 rounded-sm transition-all"
                            style={{
                              background: i < currentStep ? activeTier.color : "#1a1a1a",
                              opacity: i < currentStep ? 1 : 0.4,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasOutput && !running && (
                      <button
                        onClick={clearAll}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-colors"
                        style={{ color: "#444", border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        <RefreshCw className="w-3 h-3" /> Clear
                      </button>
                    )}
                    {running ? (
                      <button
                        onClick={stop}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}
                      >
                        <Square className="w-3 h-3 fill-current" /> Abort
                      </button>
                    ) : (
                      <button
                        onClick={execute}
                        disabled={!task.trim() || !gatewayOk}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-black tracking-wider disabled:opacity-40 transition-all"
                        style={{
                          background: activeTier.bg,
                          border: `1px solid ${activeTier.border}`,
                          color: activeTier.color,
                          boxShadow: task.trim() ? `0 0 18px ${activeTier.glow}` : undefined,
                        }}
                      >
                        <Play className="w-3 h-3 fill-current" /> ENGAGE
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Output ── */}
            {hasOutput && (
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px" style={{ background: activeTier.border }} />
                  <span className="text-[9px] font-mono font-black px-2" style={{ color: activeTier.color }}>
                    NEXUS OUTPUT STREAM
                  </span>
                  <div className="flex-1 h-px" style={{ background: activeTier.border }} />
                </div>

                {logs.map((log, i) => (
                  <NexusLogEntry
                    key={i}
                    log={log}
                    idx={i}
                    tierColor={activeTier.color}
                    expanded={expandedThinking[i] ?? false}
                    onToggle={() => setExpandedThinking((p) => ({ ...p, [i]: !p[i] }))}
                  />
                ))}

                {agentAnswer && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl p-3.5"
                    style={{
                      background: activeTier.bg,
                      border: `1px solid ${activeTier.border}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: activeTier.color }} />
                      <span className="text-[10px] font-black font-mono tracking-widest" style={{ color: activeTier.color }}>
                        AGENT INTELLIGENCE REPORT
                      </span>
                      {running && phase === "agent" && (
                        <span className="inline-block w-1.5 h-3.5 rounded-sm animate-pulse ml-1" style={{ background: activeTier.color }} />
                      )}
                    </div>
                    <pre
                      className="text-[11px] font-mono leading-relaxed text-gray-300"
                      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {agentAnswer}
                    </pre>
                  </motion.div>
                )}

                {councilSynthesis && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-3.5"
                    style={{
                      background: "rgba(251,191,36,0.06)",
                      border: "1px solid rgba(251,191,36,0.4)",
                      boxShadow: "0 0 30px rgba(251,191,36,0.12)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Crown className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                      <span className="text-[10px] font-black font-mono tracking-widest" style={{ color: "#fbbf24" }}>
                        OMEGA COUNCIL SYNTHESIS
                      </span>
                      {running && phase === "council" && (
                        <span className="inline-block w-1.5 h-3.5 rounded-sm animate-pulse ml-1" style={{ background: "#fbbf24" }} />
                      )}
                    </div>
                    <pre
                      className="text-[11px] font-mono leading-relaxed text-gray-200"
                      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {councilSynthesis}
                    </pre>
                  </motion.div>
                )}

                <div ref={logsEndRef} />
              </div>
            )}

            {/* ── Empty State ── */}
            {!hasOutput && (
              <div className="flex-1 flex flex-col items-center justify-center pb-6 gap-5">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: activeTier.bg, border: `1px solid ${activeTier.border}` }}
                >
                  <NexusIcon className="w-11 h-11" style={{ color: activeTier.color }} />
                </motion.div>
                <div className="text-center space-y-1">
                  <div className="text-sm font-black tracking-wider" style={{ color: activeTier.color }}>
                    NEXUS TIER {activeTier.badge} — {activeTier.code}
                  </div>
                  <div className="text-[11px]" style={{ color: "#444" }}>
                    {activeTier.desc}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 px-4 w-full max-w-md">
                  {[
                    { label: `${activeTier.steps} Max Steps`, icon: Layers, color: activeTier.color },
                    { label: `${activeTier.brains} Brain${activeTier.brains > 1 ? "s" : ""}`, icon: Brain, color: activeTier.council ? "#fbbf24" : "#60a5fa" },
                    { label: activeTier.council ? "Council Synthesis" : "ReAct Engine", icon: activeTier.council ? Crown : Cpu, color: activeTier.council ? "#fbbf24" : activeTier.color },
                  ].map((f) => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={f.label}
                        className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl text-[10px] text-center"
                        style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <Icon className="w-4 h-4" style={{ color: f.color }} />
                        <span style={{ color: "#555" }}>{f.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            </>} {/* end nexusTab === "agent" */}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NexusLogEntry({
  log, idx, tierColor, expanded, onToggle,
}: {
  log: TaskLog; idx: number; tierColor: string; expanded: boolean; onToggle: () => void;
}) {
  if (log.kind === "step") {
    return (
      <div className="flex items-center gap-2 py-0.5">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
        <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded" style={{ color: "#444", background: "#111" }}>
          <Clock className="w-2.5 h-2.5 inline mr-1" />
          STEP {log.step} / {log.maxSteps}
        </span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    );
  }
  if (log.kind === "thinking") {
    return (
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "#0d0d0d" }}>
        <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-1.5">
          <AlertCircle className="w-3 h-3" style={{ color: "#333" }} />
          <span className="text-[10px] font-mono" style={{ color: "#444" }}>Agent reasoning…</span>
          <span className="ml-auto">{expanded ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3 h-3 text-gray-700" />}</span>
        </button>
        {expanded && (
          <div className="px-3 pb-2 text-[10px] font-mono leading-relaxed border-t" style={{ borderColor: "rgba(255,255,255,0.04)", color: "#555", whiteSpace: "pre-wrap" }}>
            {log.content}
          </div>
        )}
      </div>
    );
  }
  if (log.kind === "tool_call") {
    const Icon = TOOL_ICONS[log.name] ?? Shield;
    const color = TOOL_COLORS[log.name] ?? "#888";
    const argsStr = Object.entries(log.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ");
    return (
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-start gap-2 px-3 py-2 rounded-lg"
        style={{ background: "#0d0d0d", border: `1px solid ${tierColor}33` }}
      >
        <span className="text-xs mt-0.5" style={{ color: tierColor, opacity: 0.7 }}>→</span>
        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color }} />
        <div className="min-w-0">
          <span className="text-[11px] font-mono font-bold" style={{ color: tierColor }}>{log.name}</span>
          {argsStr && (
            <span className="text-[10px] font-mono ml-2 break-all" style={{ color: "#444" }}>
              {argsStr.slice(0, 130)}{argsStr.length > 130 ? "…" : ""}
            </span>
          )}
        </div>
      </motion.div>
    );
  }
  if (log.kind === "tool_result") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        className="px-3 py-2 rounded-lg"
        style={{
          background: log.ok ? "rgba(0,229,204,0.03)" : "rgba(248,113,113,0.06)",
          border: `1px solid ${log.ok ? "rgba(0,229,204,0.18)" : "rgba(248,113,113,0.25)"}`,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {log.ok ? <CheckCircle2 className="w-3 h-3" style={{ color: "#00e5cc" }} /> : <XCircle className="w-3 h-3 text-red-400" />}
          <span className="text-[10px] font-mono font-bold" style={{ color: log.ok ? "#00e5cc" : "#f87171" }}>← {log.name}</span>
        </div>
        <pre className="text-[10px] font-mono leading-relaxed max-h-24 overflow-y-auto" style={{ color: "#555", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {log.result.slice(0, 500)}{log.result.length > 500 ? "\n…(truncated)" : ""}
        </pre>
      </motion.div>
    );
  }
  if (log.kind === "agent_done") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono" style={{ background: "rgba(0,229,204,0.05)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}>
        <CheckCircle2 className="w-3.5 h-3.5" />Agent loop complete · {log.steps} steps executed
      </div>
    );
  }
  if (log.kind === "council_start") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-mono" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>
        <Crown className="w-3.5 h-3.5 animate-pulse" />
        Engaging OMEGA Council — multi-brain synthesis in progress…
      </div>
    );
  }
  if (log.kind === "council_done") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24" }}>
        <Crown className="w-3.5 h-3.5" />Council synthesis complete
      </div>
    );
  }
  if (log.kind === "error") {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] font-mono" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.35)", color: "#f87171" }}>
        <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{log.message}
      </div>
    );
  }
  return null;
}
