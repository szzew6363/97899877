import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Shield, Zap, Eye } from "lucide-react";

interface ThreatEntry {
  id: string;
  time: string;
  cve: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  type: string;
  src: string;
  port: number;
}

const ATTACK_TYPES = [
  "SQL Injection", "XSS Payload", "RCE Attempt", "SSRF Probe", "Path Traversal",
  "Brute Force", "CSRF Bypass", "XXE Injection", "IDOR Exploit", "Log4Shell",
  "Buffer Overflow", "DNS Rebind", "Supply Chain", "DLL Hijack", "Kernel Exploit",
  "Zero-Day", "Heap Spray", "Format String", "UAF Exploit", "Type Confusion",
];

const CVE_IDS = [
  "CVE-2024-3400", "CVE-2024-21762", "CVE-2024-1709", "CVE-2024-4577",
  "CVE-2023-46604", "CVE-2023-44487", "CVE-2024-20353", "CVE-2024-27198",
  "CVE-2024-6387", "CVE-2024-21413", "CVE-2024-30078", "CVE-2024-38077",
];

const SEV_CONFIG = {
  CRITICAL: { color: "#e21227", bg: "rgba(226,18,39,0.12)", label: "CRIT" },
  HIGH:     { color: "#ff6b35", bg: "rgba(255,107,53,0.1)",  label: "HIGH" },
  MEDIUM:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", label: "MED"  },
  LOW:      { color: "#22c55e", bg: "rgba(34,197,94,0.07)",  label: "LOW"  },
};

function randIp() {
  return [
    Math.floor(Math.random() * 220) + 10,
    Math.floor(Math.random() * 254) + 1,
    Math.floor(Math.random() * 254) + 1,
    Math.floor(Math.random() * 254) + 1,
  ].join(".");
}

function genThreat(): ThreatEntry {
  const sevs: ThreatEntry["severity"][] = ["CRITICAL", "HIGH", "HIGH", "MEDIUM", "MEDIUM", "MEDIUM", "LOW"];
  const sev = sevs[Math.floor(Math.random() * sevs.length)];
  return {
    id: Math.random().toString(36).slice(2),
    time: new Date().toISOString().slice(11, 19),
    cve: CVE_IDS[Math.floor(Math.random() * CVE_IDS.length)],
    severity: sev,
    type: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)],
    src: randIp(),
    port: [80, 443, 22, 3389, 8080, 9200, 6379, 5432, 27017, 4444][Math.floor(Math.random() * 10)],
  };
}

function ThreatChip({ threat }: { threat: ThreatEntry }) {
  const cfg = SEV_CONFIG[threat.severity];
  const Icon = threat.severity === "CRITICAL" ? AlertTriangle
    : threat.severity === "HIGH" ? Zap
    : threat.severity === "MEDIUM" ? Eye
    : Shield;

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 12px",
      borderRadius: "6px",
      border: `1px solid ${cfg.color}25`,
      background: cfg.bg,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      <Icon style={{ width: "10px", height: "10px", color: cfg.color, flexShrink: 0 }} />
      <span style={{ fontSize: "9px", fontWeight: 800, color: cfg.color, letterSpacing: "0.5px", fontFamily: "monospace" }}>
        [{cfg.label}]
      </span>
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
        {threat.type}
      </span>
      <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
        {threat.src}:{threat.port}
      </span>
      <span style={{ fontSize: "8px", color: cfg.color, opacity: 0.7, fontFamily: "monospace" }}>
        {threat.cve}
      </span>
      <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>
        {threat.time}
      </span>
    </div>
  );
}

export function ThreatFeedTicker() {
  const [threats, setThreats] = useState<ThreatEntry[]>(() =>
    Array.from({ length: 14 }, genThreat)
  );
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setThreats(t => [genThreat(), ...t.slice(0, 19)]);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      borderTop: "1px solid rgba(226,18,39,0.12)",
      borderBottom: "1px solid rgba(226,18,39,0.12)",
      background: "linear-gradient(90deg, rgba(226,18,39,0.04) 0%, rgba(8,8,12,0.95) 8%, rgba(8,8,12,0.95) 92%, rgba(226,18,39,0.04) 100%)",
      overflow: "hidden",
      backdropFilter: "blur(10px)",
    }}>
      {/* Left fade */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "100px",
        background: "linear-gradient(90deg, rgba(8,8,12,0.98), transparent)",
        zIndex: 2, pointerEvents: "none",
      }} />
      {/* Right fade */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "100px",
        background: "linear-gradient(270deg, rgba(8,8,12,0.98), transparent)",
        zIndex: 2, pointerEvents: "none",
      }} />

      {/* Live indicator */}
      <div style={{
        position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
        zIndex: 3, display: "flex", alignItems: "center", gap: "5px",
      }}>
        <span style={{
          width: "5px", height: "5px", borderRadius: "50%",
          background: "#e21227", boxShadow: "0 0 8px #e21227",
          animation: "neonFlicker 2s ease-in-out infinite",
          flexShrink: 0, display: "block",
        }} />
        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "#e21227", letterSpacing: "1px", fontWeight: 700 }}>
          LIVE
        </span>
      </div>

      {/* Scrolling track */}
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: "12px",
          padding: "8px 120px 8px 80px",
          animation: "ticker-scroll 35s linear infinite",
          width: "max-content",
        }}
      >
        {[...threats, ...threats].map((t, i) => (
          <ThreatChip key={`${t.id}-${i}`} threat={t} />
        ))}
      </div>
    </div>
  );
}
