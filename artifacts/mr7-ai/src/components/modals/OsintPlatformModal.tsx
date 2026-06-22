import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Globe, Shield, Database, AlertTriangle, CheckCircle2,
  XCircle, Clock, ChevronDown, ChevronRight, Download, FileText,
  Network, Lock, Wifi, Server, Eye, Zap, Activity, Map,
  RefreshCw, Copy, ExternalLink, Info,
} from "lucide-react";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════════════════
   OSINT PLATFORM MODAL — محرك OSINT المتقدم
   DNS · crt.sh · HIBP · VirusTotal · Shodan · Wayback · Whois
══════════════════════════════════════════════════════════════════ */

type ModuleId = "dns" | "crt" | "hibp" | "vt" | "shodan" | "wayback" | "whois" | "geo";
type ModuleStatus = "idle" | "running" | "done" | "error";
type RiskLevel = "low" | "medium" | "high" | "critical";

interface ModuleDef {
  id: ModuleId;
  label: string;
  labelAr: string;
  color: string;
  icon: React.FC<{size?: number; className?: string}>;
  desc: string;
}

interface ScanResult {
  target: string;
  modules: Record<ModuleId, { status: ModuleStatus; data?: unknown; error?: string; ts?: number }>;
  aiAnalysis?: string;
  done: boolean;
  startedAt: number;
  endedAt?: number;
}

interface EntityNode {
  id: string;
  label: string;
  type: "target" | "ip" | "domain" | "cert" | "port" | "email" | "vuln";
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: string[];
}

const MODULES: ModuleDef[] = [
  { id: "dns",     label: "DNS",          labelAr: "تحليل DNS",        color: "#3b82f6", icon: Network,   desc: "A · AAAA · MX · TXT · NS · SRV" },
  { id: "crt",     label: "Certs",        labelAr: "شهادات SSL",       color: "#10b981", icon: Lock,      desc: "crt.sh — جميع شهادات TLS" },
  { id: "hibp",    label: "HIBP",         labelAr: "تسريب البيانات",   color: "#f59e0b", icon: AlertTriangle, desc: "Have I Been Pwned" },
  { id: "vt",      label: "VirusTotal",   labelAr: "فيروس توتال",      color: "#ef4444", icon: Shield,    desc: "70+ محرك مكافحة فيروسات" },
  { id: "shodan",  label: "Shodan",       labelAr: "شودان",            color: "#a78bfa", icon: Eye,       desc: "الأنظمة والمنافذ المكشوفة" },
  { id: "wayback", label: "Wayback",      labelAr: "أرشيف الويب",      color: "#06b6d4", icon: Clock,     desc: "نسخ تاريخية — Archive.org" },
  { id: "whois",   label: "Whois",        labelAr: "معلومات التسجيل",  color: "#f97316", icon: Info,      desc: "RDAP · تواريخ التسجيل" },
  { id: "geo",     label: "GeoIP",        labelAr: "الموقع الجغرافي",  color: "#ec4899", icon: Map,       desc: "البلد · المنطقة · ISP" },
];

const TYPE_COLORS: Record<string, string> = {
  target: "#e21227", ip: "#3b82f6", domain: "#10b981",
  cert: "#f59e0b", port: "#a78bfa", email: "#ec4899", vuln: "#ef4444",
};

/* ── 3D Relationship Graph Canvas ─────────────────────────────── */
function RelationshipGraph3D({ nodes, target }: { nodes: EntityNode[]; target: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const cvEl: HTMLCanvasElement = cv;
    const ctx = cvEl.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0;
    function resize() { W = cvEl.width = cvEl.offsetWidth * DPR; H = cvEl.height = cvEl.offsetHeight * DPR; }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvEl);
    const FRAME_MS = 32;
    let lastTs = 0;

    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (document.hidden || ts - lastTs < FRAME_MS) return;
      lastTs = ts; tRef.current += 0.008;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);
      const ns = nodesRef.current;
      if (!ns.length || W === 0) return;
      const cx = W / 2, cy = H / 2;

      // physics step
      ns.forEach(n => {
        ns.forEach(m => {
          if (n.id === m.id) return;
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 150) * 0.0004;
          n.vx -= dx * force; n.vy -= dy * force;
        });
        n.vx += (cx - n.x) * 0.001;
        n.vy += (cy - n.y) * 0.001;
        n.vx *= 0.88; n.vy *= 0.88;
        n.x += n.vx; n.y += n.vy;
      });

      // draw edges
      ns.forEach(n => {
        n.connections.forEach(cid => {
          const m = ns.find(x => x.id === cid);
          if (!m) return;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y);
          const grad = ctx.createLinearGradient(n.x, n.y, m.x, m.y);
          grad.addColorStop(0, n.color + "60");
          grad.addColorStop(1, m.color + "60");
          ctx.strokeStyle = grad; ctx.lineWidth = 0.8 * DPR;
          ctx.stroke();
        });
      });

      // draw nodes
      ns.forEach(n => {
        const pulse = n.type === "target" ? 1 + Math.sin(t * 3) * 0.15 : 1;
        const r = (n.type === "target" ? 18 : n.type === "ip" ? 12 : 8) * DPR * pulse;

        // glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
        grd.addColorStop(0, n.color + "40"); grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        // circle
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "22";
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 1.5 * DPR;
        ctx.fill(); ctx.stroke();

        // label
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = `${n.type === "target" ? 11 : 9}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(n.label.slice(0, 22), n.x, n.y + r + 12 * DPR);
      });

      // title
      if (target) {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = `bold ${10 * DPR}px monospace`;
        ctx.textAlign = "left";
        ctx.fillText(`TARGET: ${target}`, 10 * DPR, 18 * DPR);
      }
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

/* ── 3D Neural Sphere for active scan ───────────────────────────── */
function ScanOrb({ scanning }: { scanning: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 50);
    camera.position.z = 4;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(80, 80);
    renderer.setClearColor(0, 0);
    el.appendChild(renderer.domElement);
    const geo = new THREE.SphereGeometry(1, 24, 24);
    const mat = new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#1a3a7a", emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.1, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    scene.add(new THREE.AmbientLight("#ffffff", 0.5));
    const pl = new THREE.PointLight("#3b82f6", 3, 10); pl.position.set(2, 2, 2); scene.add(pl);
    const FRAME_MS = 33; let lastTs = 0;
    function animate(ts: number) {
      rafRef.current = requestAnimationFrame(animate);
      if (ts - lastTs < FRAME_MS) return; lastTs = ts;
      mesh.rotation.y += scanning ? 0.04 : 0.008;
      mesh.rotation.x += scanning ? 0.02 : 0.003;
      mat.emissiveIntensity = scanning ? 0.6 + Math.sin(ts * 0.005) * 0.4 : 0.3;
      renderer.render(scene, camera);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(rafRef.current); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, [scanning]);
  return <div ref={mountRef} style={{ width: 80, height: 80 }} />;
}

/* ── Module Card ─────────────────────────────────────────────────── */
function ModuleCard({
  mod, enabled, status, data, onToggle,
}: {
  mod: ModuleDef; enabled: boolean; status: ModuleStatus; data?: unknown; onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = mod.icon;
  const statusEl = {
    idle: null,
    running: <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: mod.color }} />,
    done: <CheckCircle2 size={12} color="#10b981" />,
    error: <XCircle size={12} color="#ef4444" />,
  }[status];

  const preview = data ? JSON.stringify(data, null, 2).slice(0, 400) : null;

  return (
    <div className="rounded-xl border transition-all" style={{
      borderColor: enabled ? mod.color + "50" : "#ffffff15",
      background: enabled ? mod.color + "08" : "transparent",
    }}>
      <div className="flex items-center gap-2.5 p-2.5 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div onClick={e => { e.stopPropagation(); onToggle(); }}
          className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
          style={{ borderColor: enabled ? mod.color : "#ffffff30", background: enabled ? mod.color : "transparent" }}>
          {enabled && <CheckCircle2 size={9} className="text-white" />}
        </div>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: mod.color + "25", color: mod.color }}>
          <Icon size={12} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-white/90">{mod.labelAr}</div>
          <div className="text-[9px] text-white/35">{mod.desc}</div>
        </div>
        {statusEl}
        {data != null && <ChevronDown size={11} className="text-white/30 transition-transform flex-shrink-0"
          style={{ transform: expanded ? "rotate(180deg)" : "" }} />}
      </div>
      <AnimatePresence>
        {expanded && preview && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <pre className="px-3 pb-3 text-[9px] text-white/55 font-mono overflow-x-auto whitespace-pre-wrap">
              {preview}{preview.length >= 400 ? "..." : ""}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Risk Badge ─────────────────────────────────────────────────── */
function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg: Record<RiskLevel, { label: string; color: string }> = {
    low: { label: "منخفض", color: "#10b981" },
    medium: { label: "متوسط", color: "#f59e0b" },
    high: { label: "عالٍ", color: "#ef4444" },
    critical: { label: "حرج", color: "#e21227" },
  };
  const c = cfg[level];
  return (
    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: c.color + "25", color: c.color, border: `1px solid ${c.color}50` }}>
      {c.label}
    </span>
  );
}

function detectRisk(result: ScanResult): RiskLevel {
  const vt = result.modules.vt?.data as Record<string, unknown> | undefined;
  const shodan = result.modules.shodan?.data as Record<string, unknown> | undefined;
  const hibp = result.modules.hibp?.data;
  const malicious = (vt?.data as Record<string, unknown>)?.attributes as Record<string, unknown> | undefined;
  const last_stats = (malicious?.last_analysis_stats as Record<string, number>) ?? {};
  if (last_stats.malicious > 5) return "critical";
  if (last_stats.malicious > 1 || (Array.isArray(hibp) && hibp.length > 5)) return "high";
  if ((Array.isArray(shodan?.vulns) && (shodan.vulns as unknown[]).length > 0) || (Array.isArray(hibp) && hibp.length > 0)) return "medium";
  return "low";
}

function buildEntityNodes(result: ScanResult): EntityNode[] {
  const nodes: EntityNode[] = [];
  const cx = 300, cy = 200;

  const root: EntityNode = { id: "root", label: result.target, type: "target", color: TYPE_COLORS.target, x: cx, y: cy, vx: 0, vy: 0, connections: [] };
  nodes.push(root);

  // DNS IPs
  const dnsData = result.modules.dns?.data as Record<string, Array<{data?: string}>> | undefined;
  if (dnsData?.A) {
    dnsData.A.slice(0, 4).forEach((r, i) => {
      if (!r.data) return;
      const id = `ip-${i}`;
      root.connections.push(id);
      nodes.push({ id, label: r.data, type: "ip", color: TYPE_COLORS.ip, x: cx + 160 * Math.cos(i * 1.5), y: cy + 120 * Math.sin(i * 1.5), vx: 0, vy: 0, connections: ["root"] });
    });
  }

  // Certs — subdomains
  const certs = result.modules.crt?.data as Array<{common_name?: string}> | undefined;
  if (Array.isArray(certs)) {
    [...new Set(certs.slice(0, 6).map(c => c.common_name).filter(Boolean))].forEach((name, i) => {
      const id = `cert-${i}`;
      root.connections.push(id);
      nodes.push({ id, label: name as string, type: "cert", color: TYPE_COLORS.cert, x: cx - 160 * Math.cos(i * 1.1), y: cy - 120 * Math.sin(i * 1.1), vx: 0, vy: 0, connections: ["root"] });
    });
  }

  // Shodan ports
  const shodan = result.modules.shodan?.data as Record<string, unknown> | undefined;
  if (Array.isArray(shodan?.ports)) {
    (shodan.ports as number[]).slice(0, 4).forEach((port, i) => {
      const id = `port-${i}`;
      const ipNode = nodes.find(n => n.type === "ip");
      if (ipNode) {
        ipNode.connections.push(id);
        nodes.push({ id, label: `Port ${port}`, type: "port", color: TYPE_COLORS.port, x: ipNode.x + 80 * Math.cos(i * 1.7), y: ipNode.y + 80 * Math.sin(i * 1.7), vx: 0, vy: 0, connections: [ipNode.id] });
      }
    });
  }

  return nodes;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function OsintPlatformModal({ open, onOpenChange }: Props) {
  const [target, setTarget] = useState("");
  const [enabled, setEnabled] = useState<Set<ModuleId>>(new Set(["dns", "crt", "vt", "shodan", "wayback", "whois"]));
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ScanResult | null>(null);
  const [tab, setTab] = useState<"scan" | "graph" | "timeline" | "report">("scan");
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<string>("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const toggleModule = useCallback((id: ModuleId) => {
    setEnabled(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);

  async function startScan() {
    if (!target.trim() || scanning) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setScanning(true);
    setReport("");
    setTab("scan");

    const initial: ScanResult = {
      target: target.trim(),
      modules: Object.fromEntries(MODULES.map(m => [m.id, { status: enabled.has(m.id) ? "running" : "idle" as ModuleStatus }])) as ScanResult["modules"],
      done: false,
      startedAt: Date.now(),
    };
    setResult(initial);

    try {
      const res = await fetch("/api/osint-advanced/scan/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), modules: [...enabled], apiKeys }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No stream body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
            const event = (line.match(/^event:\s*(.+)/) ? null : null); void event;
            // Parse event from preceding "event:" line — use different approach
            handleSsePayload(payload);
          } catch { /* skip */ }
        }

        // Re-parse with proper event tracking
        const evLines = (decoder.decode(value, { stream: false }) + "").split("\n");
        void evLines;
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("OSINT scan error:", err);
      }
    } finally {
      setScanning(false);
      setResult(prev => prev ? { ...prev, done: true, endedAt: Date.now() } : null);
    }
  }

  // Re-implement with proper SSE event parsing
  async function startScanFixed() {
    if (!target.trim() || scanning) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setScanning(true); setReport("");
    const tgt = target.trim();
    const mods = [...enabled];

    const initial: ScanResult = {
      target: tgt,
      modules: Object.fromEntries(MODULES.map(m => [m.id, { status: enabled.has(m.id) ? "running" as ModuleStatus : "idle" as ModuleStatus }])) as ScanResult["modules"],
      done: false, startedAt: Date.now(),
    };
    setResult(initial);

    try {
      const res = await fetch("/api/osint-advanced/scan/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: tgt, modules: mods, apiKeys }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n"); buf = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const eventLine = chunk.match(/^event:\s*(.+)/m)?.[1]?.trim();
          const dataLine = chunk.match(/^data:\s*(.+)/m)?.[1]?.trim();
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine) as Record<string, unknown>;
            handleSseEvent(eventLine ?? "message", payload);
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error(err);
    } finally {
      setScanning(false);
      setResult(prev => prev ? { ...prev, done: true, endedAt: Date.now() } : null);
    }
  }

  function handleSsePayload(_p: Record<string, unknown>) { /* legacy, handled below */ }

  function handleSseEvent(event: string, payload: Record<string, unknown>) {
    setResult(prev => {
      if (!prev) return prev;
      const next = { ...prev, modules: { ...prev.modules } };
      switch (event) {
        case "module_start": {
          const id = payload.id as ModuleId;
          if (id) next.modules[id] = { status: "running", ts: payload.ts as number };
          break;
        }
        case "module_done": {
          const id = payload.id as ModuleId;
          if (id) next.modules[id] = { status: "done", data: payload.data, ts: payload.ts as number };
          break;
        }
        case "module_error": {
          const id = payload.id as ModuleId;
          if (id) next.modules[id] = { status: "error", error: payload.error as string, ts: payload.ts as number };
          break;
        }
        case "ai_done": {
          next.aiAnalysis = payload.analysis as string;
          break;
        }
        case "complete": {
          next.done = true;
          break;
        }
      }
      return next;
    });
  }

  async function generateReport() {
    if (!result || generatingReport) return;
    setGeneratingReport(true);
    try {
      const res = await fetch("/api/osint-advanced/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: result.target,
          results: Object.fromEntries(Object.entries(result.modules).map(([k, v]) => [k, v.data])),
          analysis: result.aiAnalysis ?? "",
        }),
      });
      const data = await res.json() as { report?: string };
      setReport(data.report ?? "");
      setTab("report");
    } catch { /* ignore */ } finally { setGeneratingReport(false); }
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `osint-report-${result?.target ?? "target"}-${Date.now()}.md`;
    a.click(); URL.revokeObjectURL(url);
  }

  const entityNodes = result ? buildEntityNodes(result) : [];
  const risk = result?.done ? detectRisk(result) : null;
  const duration = result?.endedAt ? ((result.endedAt - result.startedAt) / 1000).toFixed(1) + "s" : null;
  const doneCount = result ? Object.values(result.modules).filter(m => m.status === "done").length : 0;
  const totalEnabled = enabled.size;

  // Timeline data from wayback
  const waybackData = result?.modules.wayback?.data as { snapshots?: Array<{timestamp?: string; original?: string; statuscode?: string}> } | undefined;
  const snapshots = waybackData?.snapshots ?? [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(14px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-7xl h-[92vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #070712 0%, #0b0b18 60%, #070710 100%)",
          border: "1px solid rgba(59,130,246,0.22)",
          boxShadow: "0 0 80px rgba(59,130,246,0.1), 0 0 40px rgba(226,18,39,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/7 flex-shrink-0"
          style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.08), rgba(226,18,39,0.04))" }}>
          <ScanOrb scanning={scanning} />
          <div>
            <h1 className="text-sm font-black text-white tracking-wide">OSINT INTELLIGENCE PLATFORM</h1>
            <p className="text-[10px] text-white/40">محرك الاستخبارات المفتوح · DNS · SSL · HIBP · VirusTotal · Shodan · Wayback</p>
          </div>

          {/* Progress */}
          {scanning && (
            <div className="flex items-center gap-2 ml-3">
              <div className="w-24 h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full rounded-full bg-blue-500"
                  animate={{ width: `${(doneCount / totalEnabled) * 100}%` }} transition={{ duration: 0.4 }} />
              </div>
              <span className="text-[9px] text-blue-400 font-mono">{doneCount}/{totalEnabled}</span>
            </div>
          )}
          {risk && <RiskBadge level={risk} />}
          {duration && <span className="text-[9px] text-white/30 font-mono">{duration}</span>}

          {/* Tabs */}
          <div className="flex items-center gap-1 mx-auto">
            {(["scan", "graph", "timeline", "report"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-2.5 py-1 text-[9px] uppercase tracking-widest rounded-lg transition-all"
                style={{
                  background: tab === t ? "rgba(59,130,246,0.2)" : "transparent",
                  border: `1px solid ${tab === t ? "rgba(59,130,246,0.4)" : "transparent"}`,
                  color: tab === t ? "#93c5fd" : "rgba(255,255,255,0.35)",
                }}>
                {t === "scan" ? "المسح" : t === "graph" ? "الخريطة" : t === "timeline" ? "الزمنية" : "التقرير"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowApiKeys(v => !v)}
              className="flex items-center gap-1 px-2 py-1 text-[9px] rounded border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
              <Lock size={9} /> مفاتيح API
            </button>
            <button onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/80 transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── API Keys drawer ───────────────────────────────────────── */}
        <AnimatePresence>
          {showApiKeys && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden border-b border-white/5 bg-white/2">
              <div className="p-3 grid grid-cols-4 gap-2">
                {(["shodan", "vt", "hibp"] as const).map(k => (
                  <div key={k}>
                    <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">{k === "vt" ? "VirusTotal" : k === "hibp" ? "HIBP" : "Shodan"} API Key</label>
                    <input
                      type="password"
                      value={apiKeys[k] ?? ""}
                      onChange={e => setApiKeys(prev => ({ ...prev, [k]: e.target.value }))}
                      placeholder={`${k.toUpperCase()}_API_KEY`}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white/70 font-mono focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                ))}
                <div className="flex items-end">
                  <p className="text-[8px] text-white/25 leading-relaxed">
                    مفاتيح API تُحفظ في الجلسة فقط. أو اضبط متغيرات البيئة في الباكند.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SCAN TAB ──────────────────────────────────────────────── */}
        {tab === "scan" && (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left: modules config */}
            <div className="w-[280px] flex-shrink-0 border-r border-white/5 flex flex-col">
              <div className="p-3 border-b border-white/5">
                <div className="text-[9px] uppercase tracking-widest text-white/30 mb-2 flex items-center justify-between">
                  <span>وحدات الفحص</span>
                  <button onClick={() => {
                    const all = new Set(MODULES.map(m => m.id));
                    setEnabled(enabled.size === MODULES.length ? new Set() : all);
                  }} className="text-blue-400/70 hover:text-blue-400 transition-colors">
                    {enabled.size === MODULES.length ? "إلغاء الكل" : "تحديد الكل"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {MODULES.map(m => (
                    <ModuleCard key={m.id} mod={m} enabled={enabled.has(m.id)}
                      status={result?.modules[m.id]?.status ?? "idle"}
                      data={result?.modules[m.id]?.data}
                      onToggle={() => toggleModule(m.id)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Center: input + results */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Target input */}
              <div className="p-4 border-b border-white/5 flex-shrink-0">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      value={target}
                      onChange={e => setTarget(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") startScanFixed(); }}
                      placeholder="أدخل الهدف: نطاق أو IP أو بريد إلكتروني (مثال: example.com / 8.8.8.8)"
                      disabled={scanning}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                    />
                  </div>
                  <button onClick={startScanFixed} disabled={scanning || !target.trim()}
                    className="px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all disabled:opacity-40 flex items-center gap-1.5"
                    style={{ background: scanning ? "#1a1a2e" : "linear-gradient(135deg, #1d4ed8, #e21227)", color: "white" }}>
                    {scanning ? <><RefreshCw size={12} className="animate-spin" /> جاري المسح...</> : <><Zap size={12} /> ابدأ المسح</>}
                  </button>
                  {scanning && (
                    <button onClick={() => abortRef.current?.abort()}
                      className="px-3 py-2.5 rounded-xl text-[10px] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                      إيقاف
                    </button>
                  )}
                </div>

                {/* Quick targets */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {["example.com", "8.8.8.8", "github.com"].map(q => (
                    <button key={q} onClick={() => setTarget(q)}
                      className="px-2 py-0.5 text-[9px] rounded border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 font-mono transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto p-4">
                {!result && (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                    <div className="grid grid-cols-4 gap-3 max-w-lg">
                      {MODULES.map(m => {
                        const Icon = m.icon;
                        return (
                          <div key={m.id} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/6 bg-white/2" style={{ color: m.color }}>
                            <Icon size={18} />
                            <span className="text-[9px] text-white/40 text-center">{m.labelAr}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-white/25 max-w-sm">أدخل هدفاً وحدد وحدات الفحص ثم اضغط "ابدأ المسح"</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-4">
                    {/* AI Analysis */}
                    {result.aiAnalysis && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={13} className="text-violet-400" />
                          <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">تحليل الذكاء الاصطناعي</span>
                        </div>
                        <div className="text-[11px] text-white/75 leading-relaxed whitespace-pre-wrap">{result.aiAnalysis}</div>
                      </motion.div>
                    )}

                    {/* Module results grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {MODULES.filter(m => enabled.has(m.id)).map(m => {
                        const mod = result.modules[m.id];
                        const Icon = m.icon;
                        return (
                          <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="rounded-xl border p-3"
                            style={{ borderColor: m.color + "30", background: m.color + "06" }}>
                            <div className="flex items-center gap-2 mb-2" style={{ color: m.color }}>
                              <Icon size={12} />
                              <span className="text-[10px] font-semibold text-white/80" style={{ color: "rgba(255,255,255,0.8)" }}>{m.labelAr}</span>
                              <div className="ml-auto">
                                {mod.status === "running" && <div className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: m.color }} />}
                                {mod.status === "done" && <CheckCircle2 size={11} color="#10b981" />}
                                {mod.status === "error" && <XCircle size={11} color="#ef4444" />}
                              </div>
                            </div>
                            {mod.status === "running" && <div className="h-1 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full animate-pulse" style={{ background: m.color, width: "60%" }} /></div>}
                            {mod.status === "error" && <p className="text-[9px] text-red-400">{mod.error}</p>}
                            {mod.status === "done" && mod.data != null && (
                              <pre className="text-[9px] text-white/50 font-mono overflow-hidden max-h-24 overflow-y-auto">
                                {JSON.stringify(mod.data, null, 2).slice(0, 300)}
                              </pre>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Generate report button */}
                    {result.done && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-center pt-2">
                        <button onClick={generateReport} disabled={generatingReport}
                          className="flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-bold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-50">
                          {generatingReport ? <><RefreshCw size={11} className="animate-spin" /> جاري التوليد...</> : <><FileText size={11} /> إنشاء تقرير PDF</>}
                        </button>
                        <button onClick={() => setTab("graph")}
                          className="flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-bold border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all">
                          <Network size={11} /> خريطة العلاقات
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: stat summary */}
            {result && (
              <div className="w-[200px] flex-shrink-0 border-l border-white/5 p-3 overflow-y-auto">
                <div className="text-[9px] uppercase tracking-widest text-white/30 mb-3 flex items-center gap-1">
                  <Activity size={9} /> الملخص
                </div>
                <div className="space-y-2">
                  {/* IPs found */}
                  <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 p-2">
                    <div className="text-[9px] text-blue-400/70 mb-0.5">عناوين IP</div>
                    <div className="text-lg font-black text-blue-400">
                      {(result.modules.dns?.data as Record<string, unknown[]>)?.A?.length ?? 0}
                    </div>
                  </div>
                  {/* Certs */}
                  <div className="rounded-lg bg-green-500/8 border border-green-500/20 p-2">
                    <div className="text-[9px] text-emerald-400/70 mb-0.5">شهادات SSL</div>
                    <div className="text-lg font-black text-emerald-400">
                      {Array.isArray(result.modules.crt?.data) ? (result.modules.crt.data as unknown[]).length : 0}
                    </div>
                  </div>
                  {/* Wayback */}
                  <div className="rounded-lg bg-cyan-500/8 border border-cyan-500/20 p-2">
                    <div className="text-[9px] text-cyan-400/70 mb-0.5">لقطات تاريخية</div>
                    <div className="text-lg font-black text-cyan-400">{snapshots.length}</div>
                  </div>
                  {/* Shodan ports */}
                  <div className="rounded-lg bg-violet-500/8 border border-violet-500/20 p-2">
                    <div className="text-[9px] text-violet-400/70 mb-0.5">منافذ مفتوحة</div>
                    <div className="text-lg font-black text-violet-400">
                      {Array.isArray((result.modules.shodan?.data as Record<string, unknown>)?.ports) ? ((result.modules.shodan.data as Record<string, unknown[]>).ports as unknown[]).length : 0}
                    </div>
                  </div>
                  {/* HIBP */}
                  <div className="rounded-lg bg-orange-500/8 border border-orange-500/20 p-2">
                    <div className="text-[9px] text-amber-400/70 mb-0.5">تسريبات HIBP</div>
                    <div className="text-lg font-black text-amber-400">
                      {Array.isArray(result.modules.hibp?.data) ? (result.modules.hibp.data as unknown[]).filter((d: unknown) => !(d as Record<string, boolean>)?.simulated).length : 0}
                    </div>
                  </div>
                  {/* Risk */}
                  {risk && (
                    <div className="pt-1">
                      <div className="text-[9px] text-white/30 mb-1">مستوى الخطر</div>
                      <RiskBadge level={risk} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GRAPH TAB ─────────────────────────────────────────────── */}
        {tab === "graph" && (
          <div className="flex-1 relative overflow-hidden">
            {entityNodes.length > 0 ? (
              <>
                <RelationshipGraph3D nodes={entityNodes} target={result?.target ?? ""} />
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                  {Object.entries(TYPE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 border border-white/10">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[9px] text-white/60 capitalize">{type}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute top-4 right-4 text-[9px] text-white/25 font-mono">
                  {entityNodes.length} عقدة · {entityNodes.reduce((s, n) => s + n.connections.length, 0)} رابط
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-white/30">
                <Network size={40} className="opacity-30" />
                <p>ابدأ المسح لبناء خريطة العلاقات</p>
              </div>
            )}
          </div>
        )}

        {/* ── TIMELINE TAB ──────────────────────────────────────────── */}
        {tab === "timeline" && (
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={15} className="text-cyan-400" /> التطور الزمني للبصمة الرقمية
            </h2>
            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/30">
                <Clock size={32} className="mb-2 opacity-30" />
                <p>لا توجد لقطات تاريخية — شغّل وحدة Wayback أولاً</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/40 to-transparent" />
                <div className="space-y-3 pl-14">
                  {snapshots.map((snap, i) => {
                    const ts = snap.timestamp ?? "";
                    const year = ts.slice(0, 4); const month = ts.slice(4, 6); const day = ts.slice(6, 8);
                    const date = ts ? `${year}-${month}-${day}` : "—";
                    const statusCode = snap.statuscode ?? "—";
                    const statusColor = statusCode === "200" ? "#10b981" : statusCode?.startsWith("3") ? "#f59e0b" : "#ef4444";
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="relative flex items-start gap-3">
                        <div className="absolute -left-8 w-3 h-3 rounded-full border-2 border-cyan-500/60 bg-black flex-shrink-0 mt-1" />
                        <div className="flex-1 rounded-lg border border-white/8 bg-white/3 p-2.5 hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-cyan-300">{date}</span>
                            <span className="text-[9px] font-bold rounded px-1.5 py-0.5" style={{ background: statusColor + "25", color: statusColor }}>
                              {statusCode}
                            </span>
                            <a href={`https://web.archive.org/web/${ts}/${snap.original ?? ""}`} target="_blank" rel="noreferrer"
                              className="ml-auto flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-colors">
                              <ExternalLink size={9} /> فتح
                            </a>
                          </div>
                          <p className="text-[9px] text-white/40 mt-0.5 truncate font-mono">{snap.original}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REPORT TAB ────────────────────────────────────────────── */}
        {tab === "report" && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 flex-shrink-0">
              <FileText size={13} className="text-white/50" />
              <span className="text-[10px] text-white/40">تقرير OSINT الاحترافي</span>
              <div className="ml-auto flex gap-2">
                {!report && (
                  <button onClick={generateReport} disabled={!result?.done || generatingReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-40">
                    {generatingReport ? <><RefreshCw size={10} className="animate-spin" /> توليد...</> : <><Zap size={10} /> توليد التقرير</>}
                  </button>
                )}
                {report && (
                  <>
                    <button onClick={() => { navigator.clipboard.writeText(report); setCopiedReport(true); setTimeout(() => setCopiedReport(false), 2000); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded-lg border border-white/10 text-white/50 hover:text-white/80 transition-all">
                      <Copy size={9} /> {copiedReport ? "تم النسخ!" : "نسخ"}
                    </button>
                    <button onClick={downloadReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all">
                      <Download size={9} /> تنزيل .md
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {!report && !generatingReport && (
                <div className="flex flex-col items-center justify-center h-64 text-white/30">
                  <FileText size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">أنهِ المسح أولاً ثم اضغط "توليد التقرير"</p>
                </div>
              )}
              {generatingReport && (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <p className="text-[11px] text-white/50">الذكاء الاصطناعي يُنشئ التقرير الاحترافي...</p>
                </div>
              )}
              {report && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="text-[11px] text-white/75 font-sans whitespace-pre-wrap leading-relaxed">{report}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
