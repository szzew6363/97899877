import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, AlertTriangle, Zap, Activity, Eye, Target, Brain, Radio, Network, Lock, Flame, Search, RefreshCw, ChevronRight, TrendingUp, Globe, Bug } from "lucide-react";
import { useStore } from "@/lib/store";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const THREATS = [
  { id: 1, type: "APT-44 Sandworm", severity: "CRITICAL", confidence: 97, vector: "Network Intrusion", status: "ACTIVE", time: "00:02:14", color: "#ff0040", geo: "UA → US" },
  { id: 2, type: "Polymorphic Ransomware", severity: "HIGH", confidence: 91, vector: "Endpoint", status: "DETECTED", time: "00:08:31", color: "#f97316", geo: "RU → EU" },
  { id: 3, type: "Supply Chain Poisoning", severity: "CRITICAL", confidence: 88, vector: "CI/CD Pipeline", status: "QUARANTINED", time: "00:15:07", color: "#ff0040", geo: "CN → GLOBAL" },
  { id: 4, type: "Zero-Day Exploit CVE-2026-1337", severity: "CRITICAL", confidence: 94, vector: "Browser RCE", status: "ACTIVE", time: "00:23:45", color: "#ff0040", geo: "Unknown" },
  { id: 5, type: "AI-Generated Phishing Campaign", severity: "HIGH", confidence: 86, vector: "Email / Social", status: "MITIGATED", time: "01:02:18", color: "#f97316", geo: "Distributed" },
  { id: 6, type: "Quantum Decrypt Attempt", severity: "MEDIUM", confidence: 72, vector: "Crypto Layer", status: "MONITORING", time: "02:14:53", color: "#fbbf24", geo: "APAC" },
  { id: 7, type: "Neural Network Poisoning", severity: "HIGH", confidence: 83, vector: "AI Model API", status: "INVESTIGATING", time: "03:41:22", color: "#f97316", geo: "Distributed" },
  { id: 8, type: "Firmware Implant Detection", severity: "CRITICAL", confidence: 96, vector: "Hardware Layer", status: "ACTIVE", time: "04:07:11", color: "#ff0040", geo: "CN → US" },
];

const PATTERNS = [
  { name: "Lateral Movement Pattern", match: 94, trend: "+12%", icon: Network, color: "#00e5ff" },
  { name: "Data Exfiltration Sequence", match: 88, trend: "+7%", icon: Target, color: "#ff0040" },
  { name: "Command & Control Beacon", match: 76, trend: "+3%", icon: Radio, color: "#fbbf24" },
  { name: "Privilege Escalation Chain", match: 91, trend: "+18%", icon: Lock, color: "#a78bfa" },
  { name: "AI Evasion Techniques", match: 69, trend: "+24%", icon: Brain, color: "#10b981" },
];

// ── Real-time CVE Feed Data (simulated live feed) ──────────────────────────
const CVE_FEED_INITIAL = [
  { id: "CVE-2026-31337", cvss: 9.8, severity: "CRITICAL", product: "OpenSSL 3.x", desc: "Heap buffer overflow in TLS 1.3 handshake — remote code execution without auth", published: "2m ago", vector: "Network", patched: false, color: "#ff0040" },
  { id: "CVE-2026-29900", cvss: 9.1, severity: "CRITICAL", product: "Linux Kernel 6.8", desc: "Use-after-free in io_uring subsystem allows local privilege escalation to root", published: "7m ago", vector: "Local", patched: false, color: "#ff0040" },
  { id: "CVE-2026-28218", cvss: 8.8, severity: "HIGH", product: "Apache Struts 2.x", desc: "Remote code execution via crafted OGNL expression in HTTP headers", published: "23m ago", vector: "Network", patched: true, color: "#f97316" },
  { id: "CVE-2026-27401", cvss: 8.6, severity: "HIGH", product: "Chrome v124", desc: "Type confusion in V8 engine enables sandbox escape via malicious JS", published: "41m ago", vector: "Network", patched: true, color: "#f97316" },
  { id: "CVE-2026-26774", cvss: 7.5, severity: "HIGH", product: "OpenSSH 9.6", desc: "Race condition in privilege separation allows auth bypass in specific configs", published: "1h ago", vector: "Network", patched: false, color: "#f97316" },
  { id: "CVE-2026-24891", cvss: 7.2, severity: "HIGH", product: "NVIDIA GPU Driver", desc: "Integer overflow in display driver IOCTL allows kernel memory corruption", published: "2h ago", vector: "Local", patched: true, color: "#f97316" },
  { id: "CVE-2026-23110", cvss: 6.8, severity: "MEDIUM", product: "Spring Boot 3.2", desc: "XXE injection in XML binding allows SSRF and internal network scanning", published: "3h ago", vector: "Network", patched: false, color: "#fbbf24" },
  { id: "CVE-2026-21905", cvss: 6.5, severity: "MEDIUM", product: "PostgreSQL 16", desc: "Improper privilege checking in ROW LEVEL SECURITY policies", published: "4h ago", vector: "Network", patched: true, color: "#fbbf24" },
  { id: "CVE-2026-20044", cvss: 5.9, severity: "MEDIUM", product: "Nginx 1.26", desc: "Memory disclosure via crafted HTTP/2 SETTINGS frame injection", published: "6h ago", vector: "Network", patched: true, color: "#fbbf24" },
  { id: "CVE-2026-18771", cvss: 5.3, severity: "MEDIUM", product: "Redis 7.2", desc: "ACL bypass in RESP3 protocol allows unauthorized key access", published: "8h ago", vector: "Network", patched: false, color: "#fbbf24" },
];

export function ThreatDetectionModal({ open, onOpenChange }: Props) {
  const { state } = useStore();
  const [tab, setTab] = useState<"live" | "patterns" | "heatmap" | "predict" | "cve">("live");
  const [scanning, setScanning] = useState(true);
  const [threatCount, setThreatCount] = useState(8);
  const [pulseRing, setPulseRing] = useState(0);
  const [particles, setParticles] = useState<{ x: number; y: number; r: number; speed: number; angle: number }[]>([]);
  const [cveFeed, setCveFeed] = useState(CVE_FEED_INITIAL);
  const [cveFilter, setCveFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM">("ALL");
  const [cveSearch, setCveSearch] = useState("");
  const [cveRefreshing, setCveRefreshing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const accent = (state as unknown as { accent?: { value: string } }).accent?.value ?? "#e21227";

  // Simulate live CVE feed updates
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      const newCve = {
        id: `CVE-2026-${Math.floor(10000 + Math.random() * 89999)}`,
        cvss: parseFloat((5 + Math.random() * 5).toFixed(1)),
        severity: Math.random() > 0.7 ? "CRITICAL" : Math.random() > 0.4 ? "HIGH" : "MEDIUM",
        product: ["Chrome", "Firefox", "Node.js", "Python", "Docker", "Kubernetes", "AWS SDK", "React"][Math.floor(Math.random() * 8)] + " " + Math.floor(Math.random() * 30),
        desc: ["Stack overflow in memory allocator", "Auth bypass via JWT manipulation", "RCE in XML parser", "SSRF in HTTP client", "SQL injection in ORM layer", "Command injection via env vars", "Path traversal in file upload"][Math.floor(Math.random() * 7)],
        published: "just now",
        vector: Math.random() > 0.5 ? "Network" : "Local",
        patched: false,
        color: Math.random() > 0.7 ? "#ff0040" : Math.random() > 0.4 ? "#f97316" : "#fbbf24",
      };
      setCveFeed(prev => [newCve, ...prev.slice(0, 14)]);
      setThreatCount(c => c + 1);
    }, 8000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * 800, y: Math.random() * 400,
      r: Math.random() * 2 + 0.5, speed: Math.random() * 0.8 + 0.2,
      angle: Math.random() * Math.PI * 2,
    }));
    setParticles(pts);
  }, []);

  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => setPulseRing(p => (p + 1) % 3), 600);
    return () => clearInterval(id);
  }, [scanning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let frame = 0;
    const pts = particles.slice();

    function draw() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = "rgba(226,18,39,0.06)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Particles
      pts.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        if (p.x < 0) p.x = canvas!.width;
        if (p.x > canvas!.width) p.x = 0;
        if (p.y < 0) p.y = canvas!.height;
        if (p.y > canvas!.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${0.3 + Math.sin(frame * 0.05) * 0.2})`;
        ctx.fill();
      });

      // Radar sweep
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const maxR = Math.min(cx, cy) * 0.8;
      const sweep = (frame * 0.02) % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - 0.6, sweep);
      ctx.fillStyle = "rgba(226,18,39,0.08)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR);
      ctx.strokeStyle = "rgba(226,18,39,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Radar rings
      [0.3, 0.55, 0.8].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(226,18,39,0.12)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Threat blips
      THREATS.slice(0, 6).forEach((t, i) => {
        const angle = (i / 6) * Math.PI * 2 + frame * 0.005;
        const radius = maxR * (0.3 + (i % 3) * 0.25);
        const bx = cx + Math.cos(angle) * radius;
        const by = cy + Math.sin(angle) * radius;
        const pulse = Math.sin(frame * 0.1 + i) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(bx, by, 4 + pulse * 3, 0, Math.PI * 2);
        ctx.fillStyle = t.color + "cc";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, 8 + pulse * 6, 0, Math.PI * 2);
        ctx.strokeStyle = t.color + "44";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      frame++;
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [particles]);

  if (!open) return null;

  const severityColor = (s: string) => s === "CRITICAL" ? "#ff0040" : s === "HIGH" ? "#f97316" : "#fbbf24";
  const statusColor = (s: string) => ({ ACTIVE: "#ff0040", DETECTED: "#fbbf24", QUARANTINED: "#10b981", MITIGATED: "#3b82f6", MONITORING: "#a78bfa", INVESTIGATING: "#f97316" }[s] ?? "#888");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}
      >
        <motion.div
          initial={{ scale: 0.92, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 30 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full h-full w-full h-full flex flex-col overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a0002 0%, #080000 50%, #0a0205 100%)",
            border: "1px solid rgba(255,0,64,0.25)",
            borderRadius: 16,
            boxShadow: "0 0 120px rgba(255,0,64,0.12), 0 0 400px rgba(226,18,39,0.06), inset 0 0 60px rgba(255,0,64,0.03)",
          }}
        >
          {/* Animated scan line */}
          <motion.div
            className="absolute inset-x-0 h-px z-10 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,0,64,0.6), transparent)" }}
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(255,0,64,0.15)", background: "rgba(255,0,64,0.04)" }}>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,0,64,0.15)", border: "1px solid rgba(255,0,64,0.4)", boxShadow: "0 0 20px rgba(255,0,64,0.3)" }}>
                <Shield className="w-5 h-5" style={{ color: "#ff0040" }} />
              </div>
              <motion.div className="absolute inset-0 rounded-xl" style={{ border: "1px solid rgba(255,0,64,0.6)" }} animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#ff0040", textShadow: "0 0 20px rgba(255,0,64,0.8)" }}>THREAT DETECTION ENGINE</div>
              <div className="text-[10px] font-mono" style={{ color: "#ff004066" }}>ADVANCED BEHAVIORAL ANOMALY SYSTEM · v9.3.1 · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-6">
              <div className="flex items-center gap-2">
                <motion.div className="w-2 h-2 rounded-full" style={{ background: "#ff0040" }} animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                <span className="text-[10px] font-mono font-bold" style={{ color: "#ff0040" }}>LIVE SCAN</span>
              </div>
              <div className="text-center">
                <div className="text-[22px] font-black" style={{ color: "#ff0040", textShadow: "0 0 15px rgba(255,0,64,0.6)" }}>{threatCount}</div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004088" }}>ACTIVE THREATS</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg transition-colors hover:bg-white/5">
                <X className="w-4 h-4" style={{ color: "#444" }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-4 shrink-0 flex-wrap">
            {[
              { id: "live", label: "LIVE THREATS", icon: Flame },
              { id: "patterns", label: "BEHAVIOR PATTERNS", icon: Brain },
              { id: "heatmap", label: "RADAR SCAN", icon: Target },
              { id: "predict", label: "PREDICTION ENGINE", icon: TrendingUp },
              { id: "cve", label: "CVE FEED", icon: Bug },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all"
                style={{
                  color: tab === t.id ? "#ff0040" : "#444",
                  background: tab === t.id ? "rgba(255,0,64,0.12)" : "transparent",
                  border: `1px solid ${tab === t.id ? "rgba(255,0,64,0.35)" : "rgba(255,255,255,0.05)"}`,
                  boxShadow: tab === t.id ? "0 0 12px rgba(255,0,64,0.2)" : "none",
                }}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-6 pt-4">
            {tab === "live" && (
              <div className="h-full flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: "calc(100% - 10px)" }}>
                {THREATS.map((threat, i) => (
                  <motion.div
                    key={threat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                    style={{
                      background: `linear-gradient(135deg, rgba(255,0,64,0.04), rgba(0,0,0,0))`,
                      border: `1px solid ${threat.color}22`,
                      boxShadow: `0 0 20px ${threat.color}08, inset 0 0 20px rgba(0,0,0,0.3)`,
                    }}
                  >
                    <div className="relative w-10 h-10 shrink-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${threat.color}15`, border: `1px solid ${threat.color}35` }}>
                        <AlertTriangle className="w-5 h-5" style={{ color: threat.color }} />
                      </div>
                      {threat.status === "ACTIVE" && (
                        <motion.div className="absolute inset-0 rounded-xl" style={{ border: `1px solid ${threat.color}` }} animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-bold text-white truncate">{threat.type}</span>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${severityColor(threat.severity)}20`, color: severityColor(threat.severity), border: `1px solid ${severityColor(threat.severity)}40` }}>{threat.severity}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-mono" style={{ color: "#555" }}>
                        <span>{threat.vector}</span>
                        <span>·</span>
                        <Globe className="w-2.5 h-2.5" />
                        <span>{threat.geo}</span>
                        <span>·</span>
                        <span>{threat.time} ago</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-black mb-1" style={{ color: threat.color }}>{threat.confidence}%</div>
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${threat.color}, ${threat.color}88)` }} initial={{ width: 0 }} animate={{ width: `${threat.confidence}%` }} transition={{ duration: 1, delay: i * 0.06 }} />
                      </div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "#444" }}>CONFIDENCE</div>
                    </div>
                    <div className="shrink-0">
                      <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg" style={{ background: `${statusColor(threat.status)}15`, color: statusColor(threat.status), border: `1px solid ${statusColor(threat.status)}30` }}>{threat.status}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {tab === "patterns" && (
              <div className="h-full flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#ff004088" }}>ANOMALY BEHAVIOR PATTERNS — REAL-TIME CORRELATION ENGINE</div>
                {PATTERNS.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${p.color}20` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                        <p.icon className="w-4 h-4" style={{ color: p.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-bold text-white">{p.name}</div>
                        <div className="text-[9px] font-mono" style={{ color: "#444" }}>PATTERN MATCH CONFIDENCE</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] font-black" style={{ color: p.color }}>{p.match}%</div>
                        <div className="text-[9px] font-mono font-bold" style={{ color: "#10b981" }}>{p.trend}</div>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}66)`, boxShadow: `0 0 8px ${p.color}` }} initial={{ width: 0 }} animate={{ width: `${p.match}%` }} transition={{ duration: 1.2, delay: i * 0.08 }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {tab === "heatmap" && (
              <div className="h-full flex flex-col">
                <div className="text-[10px] font-mono font-bold mb-3" style={{ color: "#ff004088" }}>GLOBAL THREAT RADAR — 360° PERIMETER SCAN</div>
                <div className="flex-1 relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,0,64,0.15)", background: "rgba(0,0,0,0.5)" }}>
                  <canvas ref={canvasRef} className="w-full h-full" />
                  <div className="absolute top-4 left-4 flex flex-col gap-1">
                    {THREATS.slice(0, 4).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px] font-mono">
                        <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                        <span style={{ color: "#666" }}>{t.type.slice(0, 24)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "predict" && (
              <div className="h-full flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#ff004088" }}>PREDICTIVE THREAT ENGINE — TEMPORAL ANALYSIS ACTIVE</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Next 1H Threat Score", val: "87/100", color: "#ff0040", icon: Flame },
                    { label: "Attack Vector Probability", val: "Network 64%", color: "#f97316", icon: Network },
                    { label: "Zero-Day Likelihood", val: "32%", color: "#fbbf24", icon: Bug },
                    { label: "AI-Powered Attacks", val: "+340%", color: "#a78bfa", icon: Brain },
                    { label: "Critical Asset Risk", val: "ELEVATED", color: "#ff0040", icon: AlertTriangle },
                    { label: "Threat Actor Activity", val: "9 APTs LIVE", color: "#00e5ff", icon: Eye },
                  ].map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}25`, boxShadow: `0 0 20px ${m.color}08` }}>
                      <m.icon className="w-6 h-6 mx-auto mb-2" style={{ color: m.color }} />
                      <div className="text-[14px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex-1 p-4 rounded-xl" style={{ background: "rgba(255,0,64,0.03)", border: "1px solid rgba(255,0,64,0.12)" }}>
                  <div className="text-[10px] font-mono font-bold mb-3" style={{ color: "#ff004088" }}>PREDICTED ATTACK TIMELINE</div>
                  <div className="space-y-2">
                    {["Spear-phishing wave targeting C-suite (12h)", "Supply chain compromise attempt (24h)", "Critical infrastructure probe (48h)", "Coordinated DDoS + Exfiltration (72h)"].map((e, i) => (
                      <div key={i} className="flex items-center gap-3 text-[10px] font-mono">
                        <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#ff0040" }} />
                        <span className="text-white/60">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── CVE REAL-TIME FEED ─────────────────────────────────────── */}
            {tab === "cve" && (
              <div className="h-full flex flex-col gap-3">
                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,0,64,0.06)", border: "1px solid rgba(255,0,64,0.2)" }}>
                    <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff0040" }}
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                    <span className="text-[9px] font-mono font-bold" style={{ color: "#ff0040" }}>LIVE CVE FEED</span>
                    <span className="text-[8px] font-mono" style={{ color: "#ff004066" }}>· auto-refresh 8s</span>
                  </div>
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "#444" }} />
                    <input
                      value={cveSearch}
                      onChange={e => setCveSearch(e.target.value)}
                      placeholder="Search CVE-ID, product..."
                      className="w-full rounded-lg pl-7 pr-3 py-1.5 outline-none text-[10px] font-mono"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#fff" }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {(["ALL", "CRITICAL", "HIGH", "MEDIUM"] as const).map(f => (
                      <button key={f} onClick={() => setCveFilter(f)}
                        className="px-2 py-1 rounded text-[8px] font-mono font-bold transition-all"
                        style={{
                          background: cveFilter === f ? (f === "CRITICAL" ? "rgba(255,0,64,0.2)" : f === "HIGH" ? "rgba(249,115,22,0.2)" : f === "MEDIUM" ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.08)") : "transparent",
                          border: `1px solid ${cveFilter === f ? (f === "CRITICAL" ? "rgba(255,0,64,0.5)" : f === "HIGH" ? "rgba(249,115,22,0.5)" : f === "MEDIUM" ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.2)") : "rgba(255,255,255,0.06)"}`,
                          color: cveFilter === f ? (f === "CRITICAL" ? "#ff0040" : f === "HIGH" ? "#f97316" : f === "MEDIUM" ? "#fbbf24" : "#fff") : "#555",
                        }}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setCveRefreshing(true);
                      setTimeout(() => setCveRefreshing(false), 1200);
                    }}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#666" }}
                  >
                    <RefreshCw className={`w-3 h-3 ${cveRefreshing ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Summary stats */}
                <div className="flex items-center gap-2 shrink-0">
                  {[
                    { label: "CRITICAL", count: cveFeed.filter(c => c.severity === "CRITICAL").length, color: "#ff0040" },
                    { label: "HIGH", count: cveFeed.filter(c => c.severity === "HIGH").length, color: "#f97316" },
                    { label: "MEDIUM", count: cveFeed.filter(c => c.severity === "MEDIUM").length, color: "#fbbf24" },
                    { label: "UNPATCHED", count: cveFeed.filter(c => !c.patched).length, color: "#a78bfa" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                      <span className="text-[14px] font-black" style={{ color: s.color }}>{s.count}</span>
                      <span className="text-[8px] font-mono" style={{ color: `${s.color}88` }}>{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* CVE list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <AnimatePresence>
                    {cveFeed
                      .filter(c => cveFilter === "ALL" || c.severity === cveFilter)
                      .filter(c => !cveSearch || c.id.toLowerCase().includes(cveSearch.toLowerCase()) || c.product.toLowerCase().includes(cveSearch.toLowerCase()) || c.desc.toLowerCase().includes(cveSearch.toLowerCase()))
                      .map((cve, i) => (
                        <motion.div
                          key={cve.id}
                          initial={{ opacity: 0, x: -16, scale: 0.98 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 16 }}
                          transition={{ duration: 0.25, delay: i < 5 ? i * 0.04 : 0 }}
                          className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.005]"
                          style={{
                            background: `linear-gradient(135deg, ${cve.color}06, rgba(0,0,0,0))`,
                            border: `1px solid ${cve.color}18`,
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* CVSS score */}
                            <div className="shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center"
                              style={{ background: `${cve.color}12`, border: `1px solid ${cve.color}30` }}>
                              <span className="text-[13px] font-black leading-none" style={{ color: cve.color }}>{cve.cvss}</span>
                              <span className="text-[7px] font-mono" style={{ color: `${cve.color}88` }}>CVSS</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-[11px] font-black font-mono" style={{ color: "#fff" }}>{cve.id}</span>
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                  style={{ background: `${cve.color}18`, color: cve.color, border: `1px solid ${cve.color}35` }}>
                                  {cve.severity}
                                </span>
                                <span className="text-[8px] font-mono shrink-0" style={{ color: "#00e5ff88" }}>{cve.product}</span>
                                {!cve.patched && (
                                  <span className="text-[7px] font-bold px-1 py-0.5 rounded shrink-0"
                                    style={{ background: "rgba(255,0,64,0.12)", color: "#ff0040", border: "1px solid rgba(255,0,64,0.25)" }}>
                                    UNPATCHED
                                  </span>
                                )}
                                {cve.patched && (
                                  <span className="text-[7px] font-bold px-1 py-0.5 rounded shrink-0"
                                    style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
                                    PATCHED
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] font-mono leading-relaxed mb-1" style={{ color: "#666" }}>{cve.desc}</div>
                              <div className="flex items-center gap-3 text-[8px] font-mono" style={{ color: "#444" }}>
                                <span style={{ color: "#00e5ff55" }}>VEC: {cve.vector}</span>
                                <span>·</span>
                                <span>{cve.published}</span>
                              </div>
                            </div>
                            {/* CVSS bar */}
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                                <motion.div className="h-full rounded-full"
                                  style={{ background: `linear-gradient(90deg, ${cve.color}, ${cve.color}88)`, boxShadow: `0 0 6px ${cve.color}` }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(cve.cvss / 10) * 100}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.04 }}
                                />
                              </div>
                              <button
                                onClick={() => { navigator.clipboard.writeText(cve.id); }}
                                className="text-[7px] font-mono px-1.5 py-0.5 rounded transition-all hover:bg-white/5"
                                style={{ color: "#333", border: "1px solid rgba(255,255,255,0.05)" }}
                              >
                                COPY ID
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  {cveFeed.filter(c => cveFilter === "ALL" || c.severity === cveFilter).filter(c => !cveSearch || c.id.toLowerCase().includes(cveSearch.toLowerCase()) || c.product.toLowerCase().includes(cveSearch.toLowerCase())).length === 0 && (
                    <div className="text-center py-12 text-[11px] font-mono" style={{ color: "#333" }}>No CVEs match the current filter</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
