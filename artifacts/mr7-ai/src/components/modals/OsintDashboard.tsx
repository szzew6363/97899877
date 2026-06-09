import { useState, useMemo, useEffect, useRef } from "react";
import { Shield, Copy, Download, Search, X, Globe, Hash, Mail, Link, Cpu, AlertTriangle, Radar, Activity, Zap, Eye, Target, ChevronDown, ChevronUp, ExternalLink, RefreshCw } from "lucide-react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type IocType = "ip" | "domain" | "url" | "email" | "md5" | "sha1" | "sha256" | "cve";
type ThreatLevel = "critical" | "high" | "medium" | "low" | "info";

interface ThreatScore { level: ThreatLevel; reason: string }
interface Ioc {
  type: IocType;
  value: string;
  chats: string[];
  count: number;
  score: ThreatScore;
}

const THREAT_META: Record<ThreatLevel, { label: string; color: string; bg: string; dot: string; hex: string }> = {
  critical: { label: "CRITICAL", color: "text-red-400",    bg: "bg-red-500/15 border-red-500/40",    dot: "bg-red-400",    hex: "#f87171" },
  high:     { label: "HIGH",     color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/40", dot: "bg-orange-400", hex: "#fb923c" },
  medium:   { label: "MEDIUM",   color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/40",  dot: "bg-amber-400",  hex: "#fbbf24" },
  low:      { label: "LOW",      color: "text-green-400",  bg: "bg-green-500/15 border-green-500/40",  dot: "bg-green-400",  hex: "#4ade80" },
  info:     { label: "INFO",     color: "text-sky-400",    bg: "bg-sky-500/15 border-sky-500/40",      dot: "bg-sky-400",    hex: "#38bdf8" },
};

function scoreThreat(type: IocType, value: string, count: number): ThreatScore {
  const v = value.toLowerCase();
  if (type === "cve") {
    const year = parseInt(v.match(/cve-(\d{4})/)?.[1] ?? "2000");
    if (year >= 2023) return { level: "critical", reason: "Recent CVE — actively exploited in the wild" };
    if (year >= 2020) return { level: "high",     reason: "Modern CVE — public exploits likely available" };
    if (year >= 2017) return { level: "medium",   reason: "Known CVE — verify patch status" };
    return                   { level: "low",      reason: "Legacy CVE" };
  }
  if (type === "sha256" || type === "sha1" || type === "md5") {
    return { level: "medium", reason: "File hash — cross-reference with VirusTotal" };
  }
  if (type === "ip") {
    if (v.startsWith("10.") || v.startsWith("192.168.") || v.startsWith("127.") || v === "0.0.0.0")
      return { level: "info", reason: "Private/loopback — internal address" };
    const knownBadPrefixes = ["45.33.", "185.220.", "194.165.", "91.108.", "77.83.", "198.54."];
    if (knownBadPrefixes.some((p) => v.startsWith(p)))
      return { level: "critical", reason: "IP matches known threat actor ranges" };
    if (count >= 5) return { level: "high",   reason: "High-frequency IP — possible C2, scanner, or DDoS source" };
    if (count >= 2) return { level: "medium", reason: "Recurring public IP — verify with threat intel" };
    return               { level: "low",    reason: "Public IP — no immediate indicators" };
  }
  if (type === "url") {
    const c2Paths = ["/shell", "/cmd", "/c2", "/beacon", "/gate", "/bot", "/payload", "/wp-admin/plugin", "/.git/", "/phpinfo"];
    const shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd"];
    const badTlds = [".ru/", ".cn/", ".tk/", ".top/", ".onion/", ".xyz/"];
    if (c2Paths.some((p) => v.includes(p))) return { level: "critical", reason: "Suspicious path — possible C2 or webshell" };
    if (badTlds.some((t) => v.includes(t)))  return { level: "high",     reason: "High-risk TLD associated with malicious infrastructure" };
    if (shorteners.some((s) => v.includes(s))) return { level: "medium", reason: "URL shortener — potential phishing redirect" };
    if (v.includes("http://") && !v.includes("https://")) return { level: "low", reason: "Unencrypted HTTP — possible MITM risk" };
    return { level: "info", reason: "URL — no immediate indicators detected" };
  }
  if (type === "domain") {
    const badTlds = [".ru", ".cn", ".tk", ".top", ".xyz", ".onion", ".bit", ".su"];
    const phishWords = ["update", "secure", "login", "account", "verify", "bank", "paypal", "microsoft", "apple", "google", "amazon", "signin"];
    if (badTlds.some((t) => v.endsWith(t))) return { level: "high", reason: "High-risk TLD historically linked to malicious hosting" };
    if (phishWords.some((w) => v.includes(w) && v.split(".").length > 3)) return { level: "high", reason: "Likely phishing domain — brand impersonation" };
    if (count >= 5) return { level: "medium", reason: "Frequently seen domain — review for C2 or exfiltration" };
    return               { level: "low",    reason: "Domain — verify reputation" };
  }
  if (type === "email") {
    const freeMailers = ["protonmail", "tutanota", "guerrillamail", "tempmail", "yopmail"];
    if (freeMailers.some((f) => v.includes(f))) return { level: "medium", reason: "Anonymous/ephemeral mailer — possible threat actor comms" };
    return { level: "low", reason: "Email address — verify sender reputation" };
  }
  return { level: "info", reason: "Indicator — manual review recommended" };
}

const IOC_PATTERNS: { type: IocType; re: RegExp }[] = [
  { type: "url",    re: /https?:\/\/[^\s<>"')\]]+/g },
  { type: "ip",     re: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g },
  { type: "email",  re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g },
  { type: "sha256", re: /\b[0-9a-fA-F]{64}\b/g },
  { type: "sha1",   re: /\b[0-9a-fA-F]{40}\b/g },
  { type: "md5",    re: /\b[0-9a-fA-F]{32}\b/g },
  { type: "cve",    re: /CVE-\d{4}-\d{4,7}/gi },
  { type: "domain", re: new RegExp(String.raw`\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|gov|edu|mil|info|biz|app|dev|ai|tech|cloud|online|site|web|co|uk|de|fr|ru|cn|jp|au|in|ca|br|mx)\b`, "gi") },
];

const IOC_META: Record<IocType, { label: string; icon: React.ElementType; color: string; bg: string; hex: string }> = {
  ip:     { label: "IP",     icon: Cpu,          color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30",  hex: "#fbbf24" },
  domain: { label: "Domain", icon: Globe,         color: "text-sky-400",    bg: "bg-sky-400/10 border-sky-400/30",      hex: "#38bdf8" },
  url:    { label: "URL",    icon: Link,          color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30",    hex: "#60a5fa" },
  email:  { label: "Email",  icon: Mail,          color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30",  hex: "#4ade80" },
  md5:    { label: "MD5",    icon: Hash,          color: "text-rose-400",   bg: "bg-rose-400/10 border-rose-400/30",    hex: "#fb7185" },
  sha1:   { label: "SHA1",   icon: Hash,          color: "text-pink-400",   bg: "bg-pink-400/10 border-pink-400/30",    hex: "#f472b6" },
  sha256: { label: "SHA256", icon: Hash,          color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", hex: "#c084fc" },
  cve:    { label: "CVE",    icon: AlertTriangle, color: "text-red-400",    bg: "bg-red-400/10 border-red-400/30",       hex: "#f87171" },
};

function extractIocs(text: string): Map<string, IocType> {
  const found = new Map<string, IocType>();
  for (const { type, re } of IOC_PATTERNS) {
    const matches = text.match(re) ?? [];
    for (const m of matches) {
      const key = m.toLowerCase();
      if (!found.has(key)) found.set(key, type);
    }
  }
  return found;
}

// ── Animated Radar SVG ────────────────────────────────────────────────────────
function RadarSweep({ iocs }: { iocs: Ioc[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) / 2 - 4;

    // Blip positions from IOCs — pseudo-random but deterministic
    const blips = iocs.slice(0, 18).map((ioc, i) => {
      const seed = ioc.value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const angle = (seed * 137.5 * Math.PI) / 180;
      const dist = ((seed % 100) / 100) * 0.85 * R + 0.05 * R;
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        level: ioc.score.level,
        fading: 0,
        angle,
      };
    });

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, 0, W, H);

      // Concentric rings
      for (let r = 1; r <= 4; r++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (R * r) / 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(226,18,39,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Cross hairs
      ctx.strokeStyle = "rgba(226,18,39,0.12)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R * 0.7, cy - R * 0.7); ctx.lineTo(cx + R * 0.7, cy + R * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + R * 0.7, cy - R * 0.7); ctx.lineTo(cx - R * 0.7, cy + R * 0.7); ctx.stroke();

      // Sweep gradient
      const sweepAngle = angleRef.current;

      // Arc sweep
      ctx.save();
      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      sweepGrad.addColorStop(0, "rgba(226,18,39,0.0)");
      sweepGrad.addColorStop(1, "rgba(226,18,39,0.05)");

      // Draw sweep as a filled arc
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, sweepAngle - Math.PI * 0.3, sweepAngle, false);
      ctx.closePath();
      const sweep = ctx.createLinearGradient(cx, cy, cx + Math.cos(sweepAngle) * R, cy + Math.sin(sweepAngle) * R);
      sweep.addColorStop(0, "rgba(226,18,39,0.0)");
      sweep.addColorStop(0.7, "rgba(226,18,39,0.08)");
      sweep.addColorStop(1, "rgba(226,18,39,0.35)");
      ctx.fillStyle = sweep;
      ctx.fill();
      ctx.restore();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * R, cy + Math.sin(sweepAngle) * R);
      ctx.strokeStyle = "rgba(226,18,39,0.9)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#e21227";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Blips
      for (const blip of blips) {
        const diff = ((blip.angle - sweepAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const alpha = diff < 0.5 ? 1 : Math.max(0, 1 - (diff / (Math.PI * 1.5)));
        if (alpha < 0.05) continue;
        const color = THREAT_META[blip.level].hex;
        ctx.beginPath();
        ctx.arc(blip.x, blip.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Ripple on sweep hit
        if (diff < 0.2) {
          ctx.beginPath();
          ctx.arc(blip.x, blip.y, 8 + (0.2 - diff) * 30, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = (0.2 - diff) * 3;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#e21227";
      ctx.shadowColor = "#e21227";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(226,18,39,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      angleRef.current = (sweepAngle + 0.015) % (Math.PI * 2);
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [iocs]);

  return <canvas ref={canvasRef} width={160} height={160} className="rounded-full" />;
}

// ── Threat Feed Ticker ─────────────────────────────────────────────────────────
const STATIC_THREATS = [
  { msg: "APT29 lateral movement detected — SMB relay via pass-the-hash", level: "critical" as ThreatLevel },
  { msg: "Zerologon exploit attempt on domain controller 192.168.1.10", level: "critical" as ThreatLevel },
  { msg: "Log4Shell payload in User-Agent header — CVE-2021-44228", level: "critical" as ThreatLevel },
  { msg: "Beaconing to C2 185.220.101.47 every 300s — Cobalt Strike", level: "high" as ThreatLevel },
  { msg: "Brute-force SSH on port 22 from 45.33.32.156 — 1,200 attempts", level: "high" as ThreatLevel },
  { msg: "Suspicious PowerShell encoded command — obfuscation detected", level: "high" as ThreatLevel },
  { msg: "Data exfiltration via DNS TXT queries to evil.cn", level: "high" as ThreatLevel },
  { msg: "Reverse shell established on port 4444 from 77.83.40.2", level: "high" as ThreatLevel },
  { msg: "XSS payload injected into /search endpoint — reflected", level: "medium" as ThreatLevel },
  { msg: "SQL injection attempt on /api/users — UNION SELECT", level: "medium" as ThreatLevel },
  { msg: "New CVE-2024-3400 exploit in the wild — PAN-OS GlobalProtect", level: "medium" as ThreatLevel },
  { msg: "TLS cert mismatch on update.microsoft-svc.com — typosquatting", level: "medium" as ThreatLevel },
  { msg: "Port scan from 194.165.16.76 — Nmap SYN stealth", level: "low" as ThreatLevel },
  { msg: "Outdated OpenSSL 1.0.2 in prod — EOL since Dec 2019", level: "low" as ThreatLevel },
  { msg: "Unencrypted HTTP API calls to payment endpoint", level: "low" as ThreatLevel },
  { msg: "VirusTotal feed updated — 3 new IOCs added", level: "info" as ThreatLevel },
  { msg: "ThreatFox daily export processed — 847 new indicators", level: "info" as ThreatLevel },
];

function ThreatTicker({ iocs }: { iocs: Ioc[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const allThreats = useMemo(() => {
    const fromIocs = iocs.slice(0, 5).map((ioc) => ({
      msg: `IOC detected: ${ioc.type.toUpperCase()} ${ioc.value.slice(0, 40)} — ${ioc.score.reason}`,
      level: ioc.score.level,
    }));
    return [...fromIocs, ...STATIC_THREATS];
  }, [iocs]);

  useEffect(() => {
    const tick = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % allThreats.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(tick);
  }, [allThreats.length]);

  const threat = allThreats[idx];
  const meta = THREAT_META[threat.level];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-black/60 border border-border/50 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse ${meta.dot}`} />
        <span className={`text-[9px] font-black font-mono tracking-widest uppercase ${meta.color}`}>{meta.label}</span>
      </div>
      <div className="w-px h-4 bg-border/50 shrink-0" />
      <AnimatePresence mode="wait">
        {visible && (
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-[10px] font-mono text-foreground/80 truncate"
          >
            {threat.msg}
          </motion.span>
        )}
      </AnimatePresence>
      <Zap className="w-3 h-3 text-primary/50 shrink-0 ml-auto" />
    </div>
  );
}

// ── 3D Honeycomb Vulnerability Map ─────────────────────────────────────────────
function HoneycombMap({ iocs }: { iocs: Ioc[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const hexCells = useMemo(() => {
    const cells: { q: number; r: number; ioc?: Ioc; empty: boolean }[] = [];
    const allPositions: [number, number][] = [];
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        if (Math.abs(q + r) <= 3) allPositions.push([q, r]);
      }
    }
    const shuffled = [...allPositions].sort((a, b) => {
      const sa = a[0] * 1000 + a[1];
      const sb = b[0] * 1000 + b[1];
      return (sa * 2654435761) % 1000 - (sb * 2654435761) % 1000;
    });
    for (let i = 0; i < shuffled.length; i++) {
      cells.push({ q: shuffled[i][0], r: shuffled[i][1], ioc: iocs[i], empty: !iocs[i] });
    }
    return cells;
  }, [iocs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const size = 22;

    function hexCorner(x: number, y: number, i: number, s: number) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      return [x + s * Math.cos(angle), y + s * Math.sin(angle)];
    }

    function drawHex(x: number, y: number, s: number, fillColor: string, strokeColor: string, alpha: number, pulse: number) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const [px, py] = hexCorner(x, y, i, s - 1);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = pulse > 0 ? 1.5 + pulse : 1;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = pulse > 0 ? 12 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(8,8,8,0.9)";
      ctx.fillRect(0, 0, W, H);

      const t = timeRef.current;

      for (const cell of hexCells) {
        const x = cx + size * (Math.sqrt(3) * cell.q + Math.sqrt(3) / 2 * cell.r);
        const y = cy + size * (3 / 2 * cell.r);

        if (cell.empty || !cell.ioc) {
          drawHex(x, y, size, "rgba(20,20,25,0.6)", "rgba(226,18,39,0.08)", 0.4, 0);
          continue;
        }

        const ioc = cell.ioc;
        const meta = THREAT_META[ioc.score.level];
        const hex = meta.hex;
        const pulse = Math.sin(t * 2 + cell.q * 0.7 + cell.r * 0.5) * 0.5 + 0.5;
        const isHot = ioc.score.level === "critical" || ioc.score.level === "high";

        drawHex(
          x, y, size,
          `${hex}18`,
          hex,
          0.85 + pulse * 0.15,
          isHot ? pulse * 2 : 0
        );

        // Label inside hex
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = hex;
        ctx.font = `bold 7px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ioc.type.toUpperCase().slice(0, 3), x, y - 3);
        ctx.font = `6px monospace`;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(`×${ioc.count}`, x, y + 5);
        ctx.restore();

        // Critical pulse rings
        if (ioc.score.level === "critical") {
          const ringR = size + pulse * 8;
          ctx.beginPath();
          ctx.arc(x, y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = hex;
          ctx.globalAlpha = (1 - pulse) * 0.3;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // 3D depth effect — top highlight
      const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.3);
      topGrad.addColorStop(0, "rgba(255,255,255,0.03)");
      topGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, H * 0.3);

      timeRef.current += 0.02;
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [hexCells]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={200}
      className="rounded-lg w-full"
      style={{ imageRendering: "crisp-edges" }}
    />
  );
}

// ── Stats Ring ─────────────────────────────────────────────────────────────────
function StatsRing({ iocs }: { iocs: Ioc[] }) {
  const counts = useMemo(() => {
    const c: Record<ThreatLevel, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const ioc of iocs) c[ioc.score.level]++;
    return c;
  }, [iocs]);

  const total = iocs.length || 1;
  const levels: ThreatLevel[] = ["critical", "high", "medium", "low", "info"];

  return (
    <div className="flex flex-col gap-1.5">
      {levels.map((level) => {
        const pct = (counts[level] / total) * 100;
        const meta = THREAT_META[level];
        return (
          <div key={level} className="flex items-center gap-2">
            <span className={`text-[9px] font-black font-mono w-16 shrink-0 ${meta.color}`}>{meta.label}</span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: meta.hex }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span className="text-[9px] font-mono text-muted-foreground w-5 text-right shrink-0">{counts[level]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
type SortKey = "count" | "type" | "value" | "risk";
const ALL_FILTER = "all";

export function OsintDashboard({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>(ALL_FILTER);
  const [riskFilter, setRiskFilter] = useState<string>(ALL_FILTER);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortAsc, setSortAsc] = useState(false);
  const [chatFilter, setChatFilter] = useState<string>(ALL_FILTER);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"radar" | "table" | "honeycomb">("radar");
  const [scanPulse, setScanPulse] = useState(false);

  const lang = state.settings.language;

  const iocs = useMemo<Ioc[]>(() => {
    const map = new Map<string, Ioc>();
    for (const chat of state.chats) {
      for (const msg of chat.messages) {
        if (!msg.content) continue;
        const found = extractIocs(msg.content);
        for (const [val, type] of found) {
          const existing = map.get(val);
          if (existing) {
            existing.count++;
            if (!existing.chats.includes(chat.id)) existing.chats.push(chat.id);
            existing.score = scoreThreat(existing.type, existing.value, existing.count);
          } else {
            map.set(val, { type, value: val, chats: [chat.id], count: 1, score: scoreThreat(type, val, 1) });
          }
        }
      }
    }
    return Array.from(map.values());
  }, [state.chats]);

  const RISK_ORDER: ThreatLevel[] = ["critical", "high", "medium", "low", "info"];

  const filtered = useMemo(() => {
    let list = iocs;
    if (filter !== ALL_FILTER) list = list.filter((i) => i.type === filter);
    if (riskFilter !== ALL_FILTER) list = list.filter((i) => i.score.level === riskFilter);
    if (chatFilter !== ALL_FILTER) list = list.filter((i) => i.chats.includes(chatFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.value.toLowerCase().includes(q) || i.score.reason.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "count") cmp = b.count - a.count;
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else if (sortKey === "risk") cmp = RISK_ORDER.indexOf(a.score.level) - RISK_ORDER.indexOf(b.score.level);
      else cmp = a.value.localeCompare(b.value);
      return sortAsc ? -cmp : cmp;
    });
    return list;
  }, [iocs, filter, riskFilter, chatFilter, search, sortKey, sortAsc]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: iocs.length };
    for (const ioc of iocs) c[ioc.type] = (c[ioc.type] ?? 0) + 1;
    return c;
  }, [iocs]);

  const critCount = useMemo(() => iocs.filter((i) => i.score.level === "critical").length, [iocs]);
  const highCount = useMemo(() => iocs.filter((i) => i.score.level === "high").length, [iocs]);

  function copy(val: string) {
    navigator.clipboard.writeText(val);
    toast({ description: "Copied." });
  }

  function runScan() {
    setScanPulse(true);
    setTimeout(() => setScanPulse(false), 2000);
    toast({ description: `Scan complete — ${iocs.length} IOCs extracted from ${state.chats.length} chats.` });
  }

  function exportCsv() {
    const rows = [["Type", "Value", "Risk", "Count", "Reason", "Chats"].join(",")];
    for (const i of filtered) {
      const chatTitles = i.chats.map((id) => state.chats.find((c) => c.id === id)?.title ?? id).join("; ");
      rows.push([i.type, `"${i.value.replace(/"/g, '""')}"`, i.score.level, String(i.count), `"${i.score.reason}"`, `"${chatTitles}"`].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `osint-iocs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ description: `Exported ${filtered.length} IOCs as CSV.` });
  }

  function exportJson() {
    const data = filtered.map((i) => ({
      type: i.type, value: i.value, risk: i.score.level, reason: i.score.reason,
      count: i.count, chats: i.chats.map((id) => state.chats.find((c) => c.id === id)?.title ?? id),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `osint-iocs-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ description: `Exported ${filtered.length} IOCs as JSON.` });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />) : null;

  const TABS = [
    { id: "radar" as const, label: lang === "ar" ? "الرادار" : "RADAR", icon: Radar },
    { id: "honeycomb" as const, label: lang === "ar" ? "خريطة التهديدات" : "VULN MAP", icon: Target },
    { id: "table" as const, label: lang === "ar" ? "الجدول" : "TABLE", icon: Eye },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop
        className="bg-[#080808] border-[#1f1f1f] w-[97vw] max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-[#1f1f1f] shrink-0 relative overflow-hidden">
          {/* Animated scan line */}
          <AnimatePresence>
            {scanPulse && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
              />
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-5 h-5 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-[13px] font-black tracking-wider text-foreground font-mono uppercase">
                {lang === "ar" ? "مركز الاستخبارات — OSINT 3D" : "OSINT Intelligence Center — 3D"}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {lang === "ar"
                  ? `${iocs.length} مؤشر · ${state.chats.length} محادثة · ${critCount} حرج`
                  : `${iocs.length} IOCs · ${state.chats.length} chats · ${critCount} critical · ${highCount} high`}
              </DialogDescription>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Threat level badge */}
              {critCount > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex items-center gap-1 px-2 py-1 bg-red-500/15 border border-red-500/40 rounded-md"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[9px] font-black text-red-400 font-mono">{critCount} CRITICAL</span>
                </motion.div>
              )}
              <button
                onClick={runScan}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[11px] font-mono hover:bg-primary/20 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                {lang === "ar" ? "مسح" : "SCAN"}
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Live threat ticker */}
        <div className="px-4 py-2 border-b border-[#1f1f1f] shrink-0">
          <ThreatTicker iocs={iocs} />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f1f1f] shrink-0 bg-black/30">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black font-mono uppercase tracking-wider transition-all ${
                activeTab === id
                  ? "bg-primary/15 border border-primary/40 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={exportCsv} disabled={filtered.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/5 border border-border/50 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-40">
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={exportJson} disabled={filtered.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/5 border border-border/50 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-40">
              <Download className="w-3 h-3" /> JSON
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {activeTab === "radar" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top row: radar + stats */}
              <div className="flex gap-4 p-4 border-b border-[#1f1f1f] shrink-0">
                {/* Radar */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <RadarSweep iocs={iocs} />
                  <span className="text-[8px] font-mono text-muted-foreground/60 uppercase tracking-widest">IOC RADAR SWEEP</span>
                </div>

                {/* Middle stats */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                  <div className="grid grid-cols-4 gap-2">
                    {(["critical","high","medium","low"] as ThreatLevel[]).map((level) => {
                      const cnt = iocs.filter((i) => i.score.level === level).length;
                      const meta = THREAT_META[level];
                      return (
                        <div key={level} className={`flex flex-col items-center justify-center py-2.5 rounded-lg border ${meta.bg}`}>
                          <span className={`text-xl font-black font-mono ${meta.color}`}>{cnt}</span>
                          <span className={`text-[8px] font-bold font-mono uppercase tracking-wider ${meta.color} opacity-80`}>{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <StatsRing iocs={iocs} />

                  {/* Type breakdown */}
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {(Object.keys(IOC_META) as IocType[]).filter((k) => counts[k]).map((k) => {
                      const m = IOC_META[k];
                      const Icon = m.icon;
                      return (
                        <button key={k} onClick={() => { setFilter(k); setActiveTab("table"); }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold font-mono transition-colors ${m.bg} ${m.color} hover:opacity-80`}>
                          <Icon className="w-2.5 h-2.5" /> {m.label} ({counts[k]})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recent critical IOCs */}
                <div className="w-52 shrink-0 flex flex-col gap-1.5">
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest text-primary/70">Recent Critical</span>
                  {iocs.filter((i) => i.score.level === "critical" || i.score.level === "high").slice(0, 6).map((ioc) => {
                    const meta = THREAT_META[ioc.score.level];
                    const tm = IOC_META[ioc.type];
                    return (
                      <div key={ioc.value} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border ${meta.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[8px] font-bold font-mono uppercase ${tm.color}`}>{ioc.type}</span>
                          <span className="text-[9px] font-mono text-foreground/80 truncate">{ioc.value.slice(0, 22)}</span>
                        </div>
                        <button onClick={() => copy(ioc.value)} className="ml-auto shrink-0 hover:text-foreground text-muted-foreground/50">
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                  {iocs.filter((i) => i.score.level === "critical" || i.score.level === "high").length === 0 && (
                    <div className="flex items-center justify-center h-16 text-[9px] font-mono text-muted-foreground/50">
                      No critical/high IOCs
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom IOC table preview */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-2 sticky top-0 bg-[#080808] border-b border-[#1f1f1f] flex items-center gap-2">
                  <Activity className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest text-primary/70">Live IOC Feed</span>
                  <span className="text-[9px] font-mono text-muted-foreground/50 ml-1">— {filtered.length} indicators</span>
                </div>
                {filtered.slice(0, 20).map((ioc) => {
                  const m = IOC_META[ioc.type];
                  const Icon = m.icon;
                  const tm = THREAT_META[ioc.score.level];
                  return (
                    <div key={ioc.value} className="flex items-center gap-2 px-4 py-2 border-b border-[#1f1f1f]/50 hover:bg-white/[0.02] transition-colors group">
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[8px] font-black font-mono ${tm.bg} ${tm.color} shrink-0`}>
                        <span className={`w-1 h-1 rounded-full ${tm.dot}`} /> {tm.label}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[8px] font-bold font-mono ${m.bg} ${m.color} shrink-0`}>
                        <Icon className="w-2 h-2" /> {m.label}
                      </span>
                      <span className="font-mono text-[10px] text-foreground/80 truncate flex-1">{ioc.value}</span>
                      <span className="font-mono text-[9px] text-muted-foreground/60 shrink-0">{ioc.count}×</span>
                      <button onClick={() => copy(ioc.value)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Shield className="w-10 h-10 opacity-15" />
                    <p className="text-[11px] font-mono">
                      {iocs.length === 0 ? "Start a conversation to extract IOCs" : "No results match the current filter"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "honeycomb" && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black font-mono uppercase tracking-widest text-primary/70">3D Vulnerability Honeycomb Map</span>
                <span className="text-[9px] font-mono text-muted-foreground/50">— each cell = one IOC, color = risk level</span>
              </div>
              <HoneycombMap iocs={iocs} />
              {/* Legend */}
              <div className="flex items-center gap-3 flex-wrap">
                {(["critical","high","medium","low","info"] as ThreatLevel[]).map((level) => {
                  const meta = THREAT_META[level];
                  return (
                    <div key={level} className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-sm`} style={{ background: meta.hex, opacity: 0.7 }} />
                      <span className={`text-[9px] font-mono font-bold ${meta.color}`}>{meta.label}</span>
                    </div>
                  );
                })}
                <span className="text-[9px] font-mono text-muted-foreground/40 ml-auto">Pulsing = active threat</span>
              </div>
              {/* Type breakdown in honeycomb view */}
              <div className="grid grid-cols-4 gap-2 mt-auto">
                {(Object.keys(IOC_META) as IocType[]).filter((k) => counts[k]).slice(0, 8).map((k) => {
                  const m = IOC_META[k];
                  const Icon = m.icon;
                  return (
                    <div key={k} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border ${m.bg}`}>
                      <Icon className={`w-3 h-3 ${m.color} shrink-0`} />
                      <div>
                        <div className={`text-[9px] font-black font-mono ${m.color}`}>{m.label}</div>
                        <div className="text-[10px] font-mono text-foreground/70 font-bold">{counts[k]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "table" && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Filters */}
              <div className="px-4 py-3 border-b border-[#1f1f1f] shrink-0 space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => setFilter(ALL_FILTER)}
                    className={`px-2.5 py-1 rounded-full border text-[10px] font-bold font-mono transition-colors ${filter === ALL_FILTER ? "bg-primary/15 border-primary/40 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                    ALL ({counts.all})
                  </button>
                  {(Object.keys(IOC_META) as IocType[]).filter((k) => counts[k]).map((k) => {
                    const m = IOC_META[k];
                    const Icon = m.icon;
                    return (
                      <button key={k} onClick={() => setFilter(k)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold font-mono transition-colors ${filter === k ? `${m.bg} ${m.color}` : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                        <Icon className="w-3 h-3" /> {m.label} ({counts[k]})
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 font-bold font-mono shrink-0">RISK:</span>
                  <button onClick={() => setRiskFilter(ALL_FILTER)}
                    className={`px-2 py-0.5 rounded-full border text-[9px] font-bold font-mono transition-colors ${riskFilter === ALL_FILTER ? "bg-primary/15 border-primary/40 text-primary" : "border-border/50 text-muted-foreground"}`}>ALL</button>
                  {(["critical","high","medium","low","info"] as ThreatLevel[]).map((level) => {
                    const tm = THREAT_META[level];
                    return (
                      <button key={level} onClick={() => setRiskFilter(level)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold font-mono transition-colors ${riskFilter === level ? `${tm.bg} ${tm.color}` : "border-border/50 text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tm.dot}`} /> {tm.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder={lang === "ar" ? "ابحث…" : "Search IOCs…"}
                      className="w-full pl-7 pr-7 py-1.5 rounded-lg bg-black/40 border border-border/50 text-[11px] font-mono focus:outline-none focus:border-primary/40" />
                    {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-3 h-3" /></button>}
                  </div>
                  <select value={chatFilter} onChange={(e) => setChatFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-border/50 text-[11px] font-mono text-foreground focus:outline-none min-w-[120px]">
                    <option value={ALL_FILTER}>All chats</option>
                    {state.chats.map((c) => <option key={c.id} value={c.id}>{c.title.slice(0, 35)}</option>)}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
                    <Shield className="w-10 h-10 opacity-15" />
                    <p className="text-[12px] font-mono">{iocs.length === 0 ? "No IOCs detected yet" : "No results match the current filter"}</p>
                  </div>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-[#0d0d0d] border-b border-[#1f1f1f] z-10">
                      <tr>
                        <th className="text-left px-4 py-2 text-muted-foreground font-bold font-mono cursor-pointer hover:text-foreground text-[10px] uppercase" onClick={() => toggleSort("risk")}>Risk<SortIcon k="risk" /></th>
                        <th className="text-left px-4 py-2 text-muted-foreground font-bold font-mono cursor-pointer hover:text-foreground text-[10px] uppercase" onClick={() => toggleSort("type")}>Type<SortIcon k="type" /></th>
                        <th className="text-left px-4 py-2 text-muted-foreground font-bold font-mono cursor-pointer hover:text-foreground text-[10px] uppercase" onClick={() => toggleSort("value")}>Value<SortIcon k="value" /></th>
                        <th className="text-left px-4 py-2 text-muted-foreground font-bold font-mono cursor-pointer hover:text-foreground w-14 text-[10px] uppercase" onClick={() => toggleSort("count")}>×<SortIcon k="count" /></th>
                        <th className="text-left px-4 py-2 text-muted-foreground font-bold font-mono text-[10px] uppercase">Reason</th>
                        <th className="px-4 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((ioc, idx) => {
                        const m = IOC_META[ioc.type];
                        const Icon = m.icon;
                        const tm = THREAT_META[ioc.score.level];
                        const isExpanded = expandedRow === ioc.value;
                        return (
                          <>
                            <tr key={ioc.value}
                              className={`border-b border-[#1f1f1f]/50 hover:bg-white/[0.02] transition-colors cursor-pointer ${idx % 2 === 0 ? "" : "bg-black/20"}`}
                              onClick={() => setExpandedRow(isExpanded ? null : ioc.value)}>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-black font-mono ${tm.bg} ${tm.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${tm.dot}`} /> {tm.label}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold font-mono ${m.bg} ${m.color}`}>
                                  <Icon className="w-2.5 h-2.5" /> {m.label}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className="font-mono text-[10px] text-foreground/90 break-all">{ioc.value.slice(0, 70)}{ioc.value.length > 70 ? "…" : ""}</span>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`font-mono font-bold text-[10px] ${ioc.count > 2 ? "text-primary" : "text-muted-foreground"}`}>{ioc.count}×</span>
                              </td>
                              <td className="px-4 py-2 text-muted-foreground text-[10px] font-mono truncate max-w-[200px]">{ioc.score.reason}</td>
                              <td className="px-4 py-2">
                                <button onClick={(e) => { e.stopPropagation(); copy(ioc.value); }}
                                  className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${ioc.value}-exp`} className="border-b border-primary/20 bg-primary/5">
                                <td colSpan={6} className="px-4 py-3">
                                  <div className="space-y-2">
                                    <div className="font-mono text-[10px] text-foreground break-all select-all bg-black/40 rounded-lg px-3 py-2 border border-border/50">
                                      {ioc.value}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[9px] font-mono text-muted-foreground">{ioc.score.reason}</span>
                                      {ioc.type === "url" && (
                                        <a href={ioc.value} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-[9px] text-sky-400 hover:underline font-mono">
                                          <ExternalLink className="w-2.5 h-2.5" /> Open
                                        </a>
                                      )}
                                      {ioc.type === "cve" && (
                                        <a href={`https://nvd.nist.gov/vuln/detail/${ioc.value.toUpperCase()}`} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-[9px] text-amber-400 hover:underline font-mono">
                                          <ExternalLink className="w-2.5 h-2.5" /> NVD
                                        </a>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {ioc.chats.map((id) => {
                                        const title = state.chats.find((c) => c.id === id)?.title ?? id;
                                        return <span key={id} className="text-[8px] px-1.5 py-0.5 rounded-full bg-card border border-border/50 text-muted-foreground font-mono">{title.slice(0, 30)}</span>;
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1f1f1f] shrink-0 flex items-center justify-between text-[9px] font-mono text-muted-foreground/50">
          <span>OSINT ENGINE v3.0 · IOC EXTRACTOR · THREAT SCORER</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        </div>
      </DialogContentTop>
    </Dialog>
  );
}
