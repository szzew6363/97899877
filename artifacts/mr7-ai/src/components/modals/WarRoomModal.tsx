import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, AlertTriangle, Activity, Cpu, Wifi, Server, Globe, Zap, Eye, Target, Lock, Radio } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/* ── Simulated real-time data generators ── */
function randBetween(a: number, b: number) { return a + Math.random() * (b - a); }

const ATTACK_TYPES = [
  "SQL Injection", "XSS Payload", "RCE Attempt", "SSRF Probe", "Path Traversal",
  "Brute Force", "CSRF Token Bypass", "XXE Injection", "IDOR Exploit", "Log4Shell",
  "Buffer Overflow", "Zero-Day CVE-2024", "Supply Chain", "DLL Hijack", "Kernel Exploit",
];
const COUNTRIES = ["RU", "CN", "KP", "IR", "BR", "US", "DE", "UK", "AU", "IN"];
const SEVERITIES: { label: string; color: string }[] = [
  { label: "CRITICAL", color: "#e21227" },
  { label: "HIGH", color: "#ff6b35" },
  { label: "MEDIUM", color: "#f59e0b" },
  { label: "LOW", color: "#22c55e" },
];

function genAttack() {
  const sev = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
  return {
    id: Math.random().toString(36).slice(2),
    time: new Date().toISOString().slice(11, 19),
    type: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)],
    src: `${randBetween(1,254)|0}.${randBetween(1,254)|0}.${randBetween(1,254)|0}.${randBetween(1,254)|0}`,
    country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
    sev,
    port: [80, 443, 22, 3389, 8080, 9200, 6379][Math.floor(Math.random() * 7)],
  };
}

/* ── Network Node Graph Canvas ── */
interface Node {
  x: number; y: number; vx: number; vy: number;
  r: number; color: string; label: string; pulse: number;
  threat: number; // 0-1
}

function NetworkCanvas({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const nodeLabels = [
      "CORE", "DMZ", "WEB-01", "DB-01", "API-GW", "PROXY", "CDN",
      "MGMT", "CI/CD", "VPN", "MAIL", "DNS", "BACKUP", "EDR", "SIEM",
    ];
    const colors = ["#e21227", "#ff6b35", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#00e5ff"];

    nodesRef.current = nodeLabels.map((label, i) => ({
      x: randBetween(60, width - 60),
      y: randBetween(60, height - 60),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: i === 0 ? 20 : randBetween(7, 14),
      color: colors[i % colors.length],
      label,
      pulse: Math.random() * Math.PI * 2,
      threat: Math.random(),
    }));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Dark background with subtle grid
      ctx.fillStyle = "rgba(6,6,10,0.0)";
      ctx.fillRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const t = Date.now() / 1000;

      // Update nodes
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += 0.04;
        if (n.x < n.r || n.x > width - n.r) n.vx *= -1;
        if (n.y < n.r || n.y > height - n.r) n.vy *= -1;
        // Slowly update threat level
        n.threat = Math.max(0, Math.min(1, n.threat + (Math.random() - 0.5) * 0.02));
      });

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]; const b = nodes[j];
          const dx = a.x - b.x; const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 200) continue;

          const alpha = (1 - dist / 200) * 0.5;
          const threatColor = a.threat > 0.7 || b.threat > 0.7 ? `rgba(226,18,39,${alpha})` : `rgba(255,255,255,${alpha * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = threatColor;
          ctx.lineWidth = a.threat > 0.7 ? 1.5 : 0.5;
          ctx.stroke();

          // Animated data packet
          if (dist < 150 && Math.random() < 0.01) {
            const px = a.x + (b.x - a.x) * ((t * 0.3) % 1);
            const py = a.y + (b.y - a.y) * ((t * 0.3) % 1);
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = a.threat > 0.7 ? "rgba(226,18,39,0.9)" : "rgba(255,255,255,0.7)";
            ctx.fill();
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const isCompromised = n.threat > 0.75;
        const isWarning = n.threat > 0.5;
        const nodeColor = isCompromised ? "#e21227" : isWarning ? "#f59e0b" : n.color;

        // Pulse ring
        const pulseR = n.r + 8 + Math.sin(n.pulse) * 4;
        const pulseAlpha = (Math.sin(n.pulse) * 0.5 + 0.5) * 0.4;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${isCompromised ? "226,18,39" : "255,255,255"},${pulseAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.5);
        grd.addColorStop(0, `${nodeColor}40`);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Main circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(n.x - n.r * 0.3, n.y - n.r * 0.3, 0, n.x, n.y, n.r);
        grad.addColorStop(0, `${nodeColor}ff`);
        grad.addColorStop(1, `${nodeColor}88`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = isCompromised ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)";
        ctx.lineWidth = isCompromised ? 2 : 1;
        ctx.stroke();

        // Label
        ctx.font = `bold ${Math.max(9, n.r * 0.7)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = 6;
        ctx.fillText(n.label, n.x, n.y + n.r * 0.35);
        ctx.shadowBlur = 0;

        // Threat indicator
        if (isCompromised) {
          ctx.font = "10px monospace";
          ctx.fillStyle = "#e21227";
          ctx.fillText("⚠", n.x, n.y - n.r - 6);
        }
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: "block" }} />;
}

/* ── Live Metric Bar ── */
function MetricBar({ label, value, color, unit = "%" }: { label: string; value: number; color: string; unit?: string }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
        <span style={{ fontSize: "11px", color, fontFamily: "monospace", fontWeight: 700, textShadow: `0 0 8px ${color}` }}>{value.toFixed(1)}{unit}</span>
      </div>
      <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            height: "100%",
            borderRadius: "4px",
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 6px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Shield; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: "12px",
      background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
      border: `1px solid ${color}25`,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <Icon style={{ width: "14px", height: "14px", color }} />
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</span>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 900, color, letterSpacing: "-1px", fontFamily: "monospace", textShadow: `0 0 12px ${color}60` }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "2px", fontFamily: "monospace" }}>{sub}</div>}
    </div>
  );
}

export function WarRoomModal({ open, onOpenChange }: Props) {
  const [attacks, setAttacks] = useState(() => Array.from({ length: 12 }, genAttack));
  const [metrics, setMetrics] = useState({ cpu: 34, mem: 58, net: 27, disk: 41, threats: 7, blocked: 1847 });
  const [alertLevel, setAlertLevel] = useState<"NORMAL" | "ELEVATED" | "CRITICAL">("ELEVATED");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 340 });
  const feedRef = useRef<HTMLDivElement>(null);

  const updateDims = useCallback(() => {
    const el = containerRef.current;
    if (el) setDims({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDims();
    const ro = new ResizeObserver(updateDims);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [open, updateDims]);

  // Simulate live data
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setMetrics(m => ({
        cpu: Math.max(5, Math.min(98, m.cpu + (Math.random() - 0.5) * 8)),
        mem: Math.max(20, Math.min(95, m.mem + (Math.random() - 0.5) * 4)),
        net: Math.max(1, Math.min(100, m.net + (Math.random() - 0.5) * 12)),
        disk: Math.max(10, Math.min(90, m.disk + (Math.random() - 0.5) * 2)),
        threats: Math.max(0, m.threats + (Math.random() < 0.3 ? Math.floor(Math.random() * 3) : -Math.floor(Math.random() * 2))),
        blocked: m.blocked + Math.floor(Math.random() * 5),
      }));

      // Add new attack entry
      if (Math.random() < 0.6) {
        setAttacks(prev => {
          const next = [genAttack(), ...prev].slice(0, 30);
          return next;
        });
      }

      // Update alert level based on threats
      setMetrics(m => {
        if (m.threats > 12) setAlertLevel("CRITICAL");
        else if (m.threats > 5) setAlertLevel("ELEVATED");
        else setAlertLevel("NORMAL");
        return m;
      });
    }, 1500);
    return () => clearInterval(id);
  }, [open]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [attacks.length]);

  const alertColors: Record<string, string> = {
    NORMAL: "#22c55e", ELEVATED: "#f59e0b", CRITICAL: "#e21227",
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(20px)",
          display: "flex", alignItems: "stretch", justifyContent: "stretch",
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(180deg, #06060a 0%, #080810 100%)",
            border: "1px solid rgba(226,18,39,0.3)",
            borderRadius: "0",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Scanline overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
            backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 4px, transparent 5px)",
          }} />

          {/* Top glow line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.8) 30%, rgba(255,255,255,0.5) 50%, rgba(226,18,39,0.8) 70%, transparent)",
            zIndex: 20,
          }} />

          {/* ── HEADER ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid rgba(226,18,39,0.15)",
            background: "linear-gradient(180deg, rgba(226,18,39,0.06) 0%, transparent 100%)",
            flexShrink: 0,
            position: "relative", zIndex: 15,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* 3D icon */}
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(226,18,39,0.2), rgba(226,18,39,0.05))",
                border: "1px solid rgba(226,18,39,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 20px rgba(226,18,39,0.35)",
                transform: "perspective(100px) rotateX(5deg)",
              }}>
                <Target style={{ width: "20px", height: "20px", color: "#e21227" }} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h1 style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "-0.5px", fontFamily: "monospace", color: "#fff" }}>
                    WAR ROOM
                  </h1>
                  <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px" }}>
                    KaliGPT SOC v2.0
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
                    color: alertColors[alertLevel],
                    padding: "2px 8px", borderRadius: "4px",
                    background: `${alertColors[alertLevel]}15`,
                    border: `1px solid ${alertColors[alertLevel]}40`,
                    textShadow: `0 0 8px ${alertColors[alertLevel]}`,
                    letterSpacing: "1px",
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: alertColors[alertLevel], boxShadow: `0 0 6px ${alertColors[alertLevel]}`, animation: alertLevel === "CRITICAL" ? "neonFlicker 0.5s infinite" : "none" }} />
                    ALERT: {alertLevel}
                  </span>
                  <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
                    {new Date().toLocaleTimeString()} UTC
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {[
                { icon: Shield, label: "IDS", active: true, color: "#22c55e" },
                { icon: Lock, label: "WAF", active: true, color: "#3b82f6" },
                { icon: Radio, label: "SIEM", active: true, color: "#a855f7" },
                { icon: Eye, label: "EDR", active: true, color: "#f59e0b" },
              ].map(({ icon: Icon, label, active, color }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "4px 10px", borderRadius: "8px",
                  background: active ? `${color}12` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? color + "35" : "rgba(255,255,255,0.06)"}`,
                  fontSize: "10px", fontFamily: "monospace", fontWeight: 700,
                  color: active ? color : "rgba(255,255,255,0.2)",
                }}>
                  <Icon style={{ width: "10px", height: "10px" }} />
                  {label}
                </div>
              ))}
              <button
                onClick={() => onOpenChange(false)}
                style={{
                  marginLeft: "8px",
                  padding: "8px", borderRadius: "10px",
                  background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.3)",
                  color: "#e21227", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.25)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.1)"; }}
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 280px", gap: 0, overflow: "hidden", minHeight: 0 }}>

            {/* LEFT — Metrics */}
            <div style={{
              borderRight: "1px solid rgba(255,255,255,0.06)",
              padding: "16px",
              display: "flex", flexDirection: "column", gap: "8px",
              overflowY: "auto",
            }}>
              {/* System Vitals */}
              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>
                SYSTEM VITALS
              </div>
              <MetricBar label="CPU Usage" value={metrics.cpu} color={metrics.cpu > 80 ? "#e21227" : metrics.cpu > 60 ? "#f59e0b" : "#22c55e"} />
              <MetricBar label="Memory" value={metrics.mem} color={metrics.mem > 85 ? "#e21227" : "#3b82f6"} />
              <MetricBar label="Network I/O" value={metrics.net} color="#00e5ff" unit=" Gbps" />
              <MetricBar label="Disk I/O" value={metrics.disk} color="#a855f7" />

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "8px 0" }} />

              {/* Threat Stats */}
              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>
                THREAT INTEL
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <StatCard icon={AlertTriangle} label="Active" value={String(metrics.threats)} sub="threats" color="#e21227" />
                <StatCard icon={Shield} label="Blocked" value={metrics.blocked.toLocaleString()} sub="today" color="#22c55e" />
                <StatCard icon={Activity} label="Events/s" value={(randBetween(200, 800)|0).toString()} sub="live" color="#3b82f6" />
                <StatCard icon={Globe} label="Sources" value={(randBetween(20, 80)|0).toString()} sub="unique IPs" color="#f59e0b" />
              </div>

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "8px 0" }} />

              {/* Severity Breakdown */}
              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
                SEVERITY BREAKDOWN
              </div>
              {SEVERITIES.map(({ label, color }) => {
                const count = Math.floor(randBetween(0, 15));
                return (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                    <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)", flex: 1 }}>{label}</span>
                    <span style={{ fontSize: "11px", fontFamily: "monospace", color, fontWeight: 700 }}>{count}</span>
                    <div style={{ width: "50px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / 15) * 100}%`, background: color, borderRadius: "3px" }} />
                    </div>
                  </div>
                );
              })}

              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "8px 0" }} />

              {/* Protocol breakdown */}
              <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
                PROTOCOL ANALYSIS
              </div>
              {[
                { proto: "HTTP/S", pct: 48, color: "#3b82f6" },
                { proto: "SSH", pct: 21, color: "#22c55e" },
                { proto: "DNS", pct: 15, color: "#f59e0b" },
                { proto: "SMTP", pct: 10, color: "#a855f7" },
                { proto: "OTHER", pct: 6, color: "#6b7280" },
              ].map(({ proto, pct, color }) => (
                <div key={proto} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                  <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)", width: "40px", flexShrink: 0 }}>{proto}</span>
                  <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "4px" }} />
                  </div>
                  <span style={{ fontSize: "10px", fontFamily: "monospace", color, width: "26px", textAlign: "right" }}>{pct}%</span>
                </div>
              ))}
            </div>

            {/* CENTER — Network Topology */}
            <div style={{
              display: "flex", flexDirection: "column",
              background: "rgba(6,6,10,0.5)",
              position: "relative",
            }}>
              {/* Top label */}
              <div style={{
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px" }}>
                  LIVE NETWORK TOPOLOGY
                </span>
                <div style={{ display: "flex", gap: "12px" }}>
                  {[
                    { color: "#22c55e", label: "Healthy" },
                    { color: "#f59e0b", label: "Warning" },
                    { color: "#e21227", label: "Compromised" },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas */}
              <div ref={containerRef} style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                <NetworkCanvas width={dims.w} height={dims.h} />
                {/* Overlay grid */}
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  backgroundImage: `
                    linear-gradient(rgba(226,18,39,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(226,18,39,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px",
                }} />
              </div>

              {/* Bottom attack map */}
              <div style={{
                padding: "10px 16px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                flexShrink: 0,
              }}>
                <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                  GEOGRAPHIC ATTACK ORIGINS — LAST 60s
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {COUNTRIES.map((cc) => {
                    const intensity = Math.random();
                    const color = intensity > 0.7 ? "#e21227" : intensity > 0.4 ? "#f59e0b" : "#22c55e";
                    const count = Math.floor(intensity * 50);
                    return (
                      <div key={cc} style={{
                        padding: "4px 8px", borderRadius: "6px",
                        background: `${color}15`, border: `1px solid ${color}30`,
                        fontSize: "10px", fontFamily: "monospace", fontWeight: 700,
                        color,
                      }}>
                        {cc} <span style={{ color: "rgba(255,255,255,0.3)" }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT — Live Attack Feed */}
            <div style={{
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px" }}>
                  LIVE THREAT FEED
                </span>
                <div style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  fontSize: "9px", fontFamily: "monospace", color: "#22c55e",
                }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", animation: "neonFlicker 2s infinite" }} />
                  LIVE
                </div>
              </div>

              <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                <AnimatePresence initial={false}>
                  {attacks.map((atk) => (
                    <motion.div
                      key={atk.id}
                      initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        marginBottom: "4px",
                        background: `${atk.sev.color}08`,
                        border: `1px solid ${atk.sev.color}20`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Severity stripe */}
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0, width: "2px",
                        background: atk.sev.color,
                        boxShadow: `0 0 6px ${atk.sev.color}`,
                      }} />

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{
                          fontSize: "8px", fontFamily: "monospace", fontWeight: 700,
                          color: atk.sev.color,
                          padding: "1px 5px", borderRadius: "3px",
                          background: `${atk.sev.color}20`,
                          letterSpacing: "0.5px",
                        }}>{atk.sev.label}</span>
                        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>{atk.time}</span>
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#fff", marginBottom: "3px" }}>{atk.type}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{atk.src}</span>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)" }}>→</span>
                        <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>:{atk.port}</span>
                        <span style={{ marginLeft: "auto", fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: "#3b82f6" }}>[{atk.country}]</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Active response */}
              <div style={{
                padding: "12px 16px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                flexShrink: 0,
              }}>
                <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>
                  AUTO-RESPONSE
                </div>
                {[
                  { action: "Block IP Range", status: "ACTIVE", color: "#22c55e" },
                  { action: "Rate Limit API", status: "ACTIVE", color: "#22c55e" },
                  { action: "Honeypot Trap", status: "ARMED", color: "#f59e0b" },
                  { action: "Geo-Block RU/CN", status: "ACTIVE", color: "#22c55e" },
                ].map(({ action, status, color }) => (
                  <div key={action} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{action}</span>
                    <span style={{
                      fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color,
                      padding: "1px 6px", borderRadius: "3px", background: `${color}15`,
                      border: `1px solid ${color}30`,
                    }}>{status}</span>
                  </div>
                ))}

                <button
                  style={{
                    width: "100%", marginTop: "8px",
                    padding: "8px", borderRadius: "8px",
                    background: "linear-gradient(135deg, rgba(226,18,39,0.15), rgba(226,18,39,0.05))",
                    border: "1px solid rgba(226,18,39,0.35)",
                    color: "#e21227", fontSize: "11px", fontWeight: 700,
                    fontFamily: "monospace", cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.25)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(226,18,39,0.15), rgba(226,18,39,0.05))"; }}
                >
                  <Zap style={{ width: "12px", height: "12px" }} />
                  LOCKDOWN MODE
                </button>
              </div>
            </div>
          </div>

          {/* ── FOOTER STATUS BAR ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "20px",
            padding: "6px 20px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(0,0,0,0.3)",
            flexShrink: 0,
          }}>
            {[
              { icon: Wifi, label: "NETWORK", value: "STABLE", color: "#22c55e" },
              { icon: Server, label: "SERVERS", value: "14/15 UP", color: "#22c55e" },
              { icon: Cpu, label: "FIREWALL", value: "ACTIVE", color: "#3b82f6" },
              { icon: Activity, label: "IDS/IPS", value: "MONITORING", color: "#a855f7" },
              { icon: Zap, label: "UPTIME", value: "99.97%", color: "#f59e0b" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Icon style={{ width: "10px", height: "10px", color: "rgba(255,255,255,0.2)" }} />
                <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.5px" }}>{label}:</span>
                <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.1)" }}>
              KaliGPT WAR ROOM · SOC v2.0 · {new Date().toLocaleDateString()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
