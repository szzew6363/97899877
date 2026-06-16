import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Radio, AlertTriangle, Play, ExternalLink, RefreshCw, Zap, Shield, Target, Globe,
  Activity, Network, Eye, Wifi, Server, Lock, Unlock, AlertCircle, TrendingUp,
} from "lucide-react";
import { ExploitChainModal } from "./ExploitChainModal";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface CVEEntry {
  id: string; title: string; cvss: number; vendor: string; product: string;
  type: string; published: string; description: string; zeroday: boolean;
  mitreIds?: string[]; attackOrigins?: [number, number][];
}

interface PacketNode {
  id: string; x: number; y: number; vx: number; vy: number;
  color: string; size: number; alpha: number; targetX: number; targetY: number;
  type: "packet" | "burst" | "ping"; age: number; maxAge: number;
}

interface IntrusionEvent {
  id: string; src: string; dst: string; type: string; severity: "critical"|"high"|"medium"|"low";
  time: string; blocked: boolean; protocol: string; bytes: number;
}

const MITRE_TACTICS: Record<string, { id: string; tactic: string; technique: string; color: string }[]> = {
  "RCE": [{ id: "T1190", tactic: "Initial Access", technique: "Exploit Public-Facing App", color: "#e21227" }, { id: "T1059", tactic: "Execution", technique: "Command Scripting", color: "#f97316" }],
  "Backdoor": [{ id: "T1195", tactic: "Initial Access", technique: "Supply Chain Compromise", color: "#a855f7" }, { id: "T1543", tactic: "Persistence", technique: "Create/Modify System Process", color: "#8b5cf6" }],
  "Auth Bypass": [{ id: "T1078", tactic: "Defense Evasion", technique: "Valid Accounts", color: "#f59e0b" }, { id: "T1110", tactic: "Credential Access", technique: "Brute Force", color: "#fbbf24" }],
  "DDoS": [{ id: "T1498", tactic: "Impact", technique: "Network DoS", color: "#ef4444" }, { id: "T1499", tactic: "Impact", technique: "Endpoint DoS", color: "#dc2626" }],
  "Memory Corruption": [{ id: "T1203", tactic: "Execution", technique: "Exploitation for Client Exec", color: "#06b6d4" }, { id: "T1055", tactic: "Defense Evasion", technique: "Process Injection", color: "#0891b2" }],
  "Zero-Click": [{ id: "T1566", tactic: "Initial Access", technique: "Phishing", color: "#10b981" }, { id: "T1204", tactic: "Execution", technique: "User Execution", color: "#059669" }],
  "default": [{ id: "T1210", tactic: "Lateral Movement", technique: "Exploit Remote Services", color: "#6366f1" }, { id: "T1588", tactic: "Resource Dev", technique: "Obtain Capabilities", color: "#4f46e5" }],
};

const ATTACK_ORIGINS: [number, number][] = [
  [55.75, 37.61], [39.91, 116.39], [35.68, 139.69], [51.50, -0.12], [48.85, 2.35],
  [40.71, -74.00], [37.56, 126.97], [28.61, 77.20], [-23.55, -46.63], [24.89, 46.67],
  [1.35, 103.82], [52.37, 4.89], [41.38, 2.17], [59.33, 18.07], [43.65, -79.38],
];

const ATTACK_LABELS: string[] = [
  "Moscow", "Beijing", "Tokyo", "London", "Paris", "New York", "Seoul",
  "Delhi", "São Paulo", "Riyadh", "Singapore", "Amsterdam", "Barcelona", "Stockholm", "Toronto",
];

const INTRUSION_TYPES = ["SQL Injection", "XSS", "Buffer Overflow", "Port Scan", "Brute Force", "DDoS Flood", "Reverse Shell", "SSRF", "RCE", "Privilege Escalation", "Lateral Movement", "C2 Beacon"];
const PROTOCOLS = ["HTTP", "HTTPS", "TCP", "UDP", "ICMP", "SSH", "FTP", "DNS", "SMTP"];

function generateIntrusionEvents(): IntrusionEvent[] {
  const events: IntrusionEvent[] = [];
  for (let i = 0; i < 20; i++) {
    const srcIP = `${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`;
    const dstIP = `10.0.${Math.floor(Math.random()*10)}.${Math.floor(Math.random()*254)+1}`;
    const sev: IntrusionEvent["severity"][] = ["critical","high","medium","low"];
    events.push({
      id: `evt-${i}`, src: srcIP, dst: dstIP,
      type: INTRUSION_TYPES[Math.floor(Math.random()*INTRUSION_TYPES.length)],
      severity: sev[Math.floor(Math.random()*4)],
      time: new Date(Date.now() - Math.random()*3600000).toLocaleTimeString(),
      blocked: Math.random() > 0.3,
      protocol: PROTOCOLS[Math.floor(Math.random()*PROTOCOLS.length)],
      bytes: Math.floor(Math.random()*100000),
    });
  }
  return events.sort((a,b) => {const o=["critical","high","medium","low"]; return o.indexOf(a.severity)-o.indexOf(b.severity);});
}

// ── Live Network Packet Visualization ──────────────────────────────────────
function PacketNetworkViz({ active, threatLevel }: { active: boolean; threatLevel: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const packetsRef = useRef<PacketNode[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.offsetWidth || 360, H = cv.offsetHeight || 80;
    cv.width = W; cv.height = H;

    const nodes = [
      { x: W*0.05, y: H*0.5, label: "WAN", color: "#e21227" },
      { x: W*0.25, y: H*0.5, label: "FW", color: "#f97316" },
      { x: W*0.5, y: H*0.5, label: "DMZ", color: "#fbbf24" },
      { x: W*0.75, y: H*0.5, label: "LAN", color: "#10b981" },
      { x: W*0.95, y: H*0.5, label: "SRV", color: "#22d3ee" },
    ];

    function spawnPacket() {
      if (packetsRef.current.length > 30) return;
      const srcIdx = 0;
      const dstIdx = Math.floor(Math.random()*(nodes.length-1))+1;
      const src = nodes[srcIdx], dst = nodes[dstIdx];
      const isMalicious = Math.random() < (threatLevel / 100);
      packetsRef.current.push({
        id: String(nextIdRef.current++),
        x: src.x, y: src.y + (Math.random()-0.5)*10,
        vx: (dst.x - src.x)*0.04, vy: (dst.y - src.y + (Math.random()-0.5)*20)*0.04,
        color: isMalicious ? "#e21227" : "#22d3ee",
        size: isMalicious ? 3 : 2,
        alpha: 1,
        targetX: dst.x, targetY: dst.y + (Math.random()-0.5)*10,
        type: isMalicious ? "burst" : "packet",
        age: 0, maxAge: 40 + Math.random()*20,
      });
    }

    let spawnCounter = 0;
    function draw() {
      tRef.current += 0.02;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      // Background glow
      const bgGrad = ctx.createLinearGradient(0, 0, W, 0);
      bgGrad.addColorStop(0, "rgba(226,18,39,0.03)");
      bgGrad.addColorStop(0.5, "rgba(0,229,255,0.03)");
      bgGrad.addColorStop(1, "rgba(16,185,129,0.03)");
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

      // Connection lines
      for (let i = 0; i < nodes.length-1; i++) {
        const a = nodes[i], b = nodes[i+1];
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1; ctx.stroke();
        // Traffic flow indicator
        const pulse = (Math.sin(t*3 + i) + 1) / 2;
        ctx.strokeStyle = `rgba(34,211,238,${pulse*0.2})`; ctx.lineWidth = 0.5; ctx.stroke();
      }

      // Nodes
      nodes.forEach((node, i) => {
        const pulse = Math.sin(t*2 + i*0.7) * 0.5 + 0.5;
        // Glow
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 12);
        grd.addColorStop(0, node.color + "66"); grd.addColorStop(1, node.color + "00");
        ctx.beginPath(); ctx.arc(node.x, node.y, 12 + pulse*3, 0, Math.PI*2);
        ctx.fillStyle = grd; ctx.fill();
        // Node
        ctx.beginPath(); ctx.arc(node.x, node.y, 5, 0, Math.PI*2);
        ctx.fillStyle = node.color; ctx.fill();
        ctx.strokeStyle = node.color + "88"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(node.x, node.y, 8, 0, Math.PI*2); ctx.stroke();
        // Label
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "8px monospace";
        ctx.textAlign = "center"; ctx.fillText(node.label, node.x, node.y - 14);
      });

      // Spawn packets
      spawnCounter++;
      const spawnRate = active ? Math.max(2, 8 - Math.floor(threatLevel/15)) : 12;
      if (spawnCounter >= spawnRate) { spawnPacket(); spawnCounter = 0; }

      // Update & draw packets
      packetsRef.current = packetsRef.current.filter(p => p.alpha > 0.05);
      packetsRef.current.forEach(p => {
        const progress = p.age / p.maxAge;
        p.x += (p.targetX - p.x) * 0.06;
        p.y += (p.targetY - p.y) * 0.06 + Math.sin(p.age*0.3)*0.3;
        p.age++;
        if (p.age >= p.maxAge) p.alpha *= 0.85;

        if (p.type === "burst") {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size+1+Math.sin(progress*Math.PI)*2, 0, Math.PI*2);
          ctx.fillStyle = `rgba(226,18,39,${p.alpha*0.4})`; ctx.fill();
        }
        const trail = 6;
        for (let t2 = 0; t2 < trail; t2++) {
          const tp = Math.max(0, progress - t2/trail*0.15);
          ctx.beginPath(); ctx.arc(p.x - p.vx*t2*2, p.y - p.vy*t2*2, Math.max(0.5, p.size*(1-t2/trail)), 0, Math.PI*2);
          ctx.fillStyle = `${p.color}${Math.floor((1-t2/trail)*p.alpha*200).toString(16).padStart(2,"0")}`;
          ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = `${p.color}${Math.floor(p.alpha*255).toString(16).padStart(2,"0")}`; ctx.fill();
        // Explosion on arrival
        if (p.age >= p.maxAge - 3 && p.type === "burst") {
          for (let k = 0; k < 5; k++) {
            const ang = (k/5)*Math.PI*2, er = 8+Math.random()*8;
            ctx.beginPath(); ctx.arc(p.x+Math.cos(ang)*er*progress, p.y+Math.sin(ang)*er*progress, 1, 0, Math.PI*2);
            ctx.fillStyle = `rgba(226,18,39,${p.alpha*0.6})`; ctx.fill();
          }
        }
      });

      // Stats overlay
      const malCount = packetsRef.current.filter(p=>p.type==="burst").length;
      const totalCount = packetsRef.current.length;
      ctx.fillStyle = "rgba(226,18,39,0.8)"; ctx.font = "8px monospace"; ctx.textAlign = "left";
      if (malCount > 0) ctx.fillText(`THREAT: ${malCount}`, 4, H-4);
      ctx.fillStyle = "rgba(34,211,238,0.6)"; ctx.textAlign = "right";
      ctx.fillText(`PKTS: ${totalCount}`, W-4, H-4);

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(rafRef.current); packetsRef.current = []; };
  }, [active, threatLevel]);

  return <canvas ref={cvRef} className="w-full" style={{ height: 80, display: "block" }} />;
}

// ── Attack Globe 3D ─────────────────────────────────────────────────────────
type AttackPacket = { srcLat: number; srcLon: number; progress: number; speed: number; color: string; size: number; };
function AttackGlobe3D({ attacks }: { attacks: [number, number][] }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const beamsRef = useRef<{lat:number;lon:number;age:number;maxAge:number;color:string}[]>([]);
  const packetsRef = useRef<AttackPacket[]>([]);
  const packetTimerRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    const cx = W/2, cy = H/2, R = Math.min(W,H)/2 - 6;

    function latLonToXY(lat:number, lon:number, rotY:number): {x:number;y:number;z:number} {
      const phi = (90-lat)*(Math.PI/180);
      const theta = (lon+rotY)*(Math.PI/180);
      return { x: cx+R*Math.sin(phi)*Math.cos(theta), y: cy-R*Math.cos(phi), z: Math.sin(phi)*Math.sin(theta) };
    }

    // Precompute some continent outlines for realism
    const LAND_DOTS: [number,number][] = [
      [40,0],[50,10],[45,20],[35,30],[55,-5],[45,-2],[38,15],[48,8],[60,10],[52,13],
      [51,0],[42,13],[45,25],[38,23],[55,37],[60,30],[63,25],[50,40],[45,50],[35,50],
      [25,50],[20,45],[15,38],[10,38],[5,35],[0,32],[-5,20],[-10,15],[-15,28],[-20,45],
      [39,116],[35,105],[30,120],[25,110],[20,110],[15,100],[10,105],[5,100],[0,110],
      [35,139],[38,140],[33,130],[40,125],[45,130],[55,130],[60,150],[52,140],
      [40,-75],[38,-77],[35,-80],[42,-71],[45,-73],[48,-68],[36,-86],[34,-84],
      [37,-122],[38,-122],[34,-118],[47,-122],[45,-93],[41,-87],[40,-104],[39,-105],
      [51,-0.1],[53,-2],[56,-3],[57,-4],[54,-6],[50,-5],[48,2],[47,6],[50,8],[52,5],
    ];

    const PACKET_COLORS = ["#e21227","#f97316","#ff6b35","#dc2626","#ef4444","#fb923c"];

    function draw() {
      tRef.current += 0.01; const t = tRef.current;

      // Spawn new attack packets periodically
      packetTimerRef.current++;
      if (attacks.length > 0 && packetTimerRef.current % 18 === 0) {
        const src = attacks[Math.floor(Math.random() * attacks.length)];
        packetsRef.current.push({
          srcLat: src[0], srcLon: src[1],
          progress: 0,
          speed: 0.008 + Math.random() * 0.012,
          color: PACKET_COLORS[Math.floor(Math.random() * PACKET_COLORS.length)],
          size: 1.5 + Math.random() * 2,
        });
        // Keep max 40 packets
        if (packetsRef.current.length > 40) packetsRef.current.shift();
      }
      // Advance packet progress; remove completed ones
      packetsRef.current = packetsRef.current.filter(p => {
        p.progress += p.speed;
        return p.progress < 1.0;
      });
      ctx.clearRect(0, 0, W, H);
      const rotY = t*15;

      // Globe body
      const gGrad = ctx.createRadialGradient(cx-R*0.3, cy-R*0.3, 0, cx, cy, R);
      gGrad.addColorStop(0, "rgba(10,20,40,0.95)");
      gGrad.addColorStop(0.6, "rgba(5,10,20,0.97)");
      gGrad.addColorStop(1, "rgba(0,0,0,0.8)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.fillStyle = gGrad; ctx.fill();

      // Grid
      for (let lat=-60; lat<=60; lat+=30) {
        ctx.beginPath(); let first=true;
        for (let lon=0; lon<=360; lon+=5) {
          const p = latLonToXY(lat, lon, rotY);
          if (p.z > 0) { if(first){ctx.moveTo(p.x,p.y);first=false;}else{ctx.lineTo(p.x,p.y);} }
          else first=true;
        }
        ctx.strokeStyle = "rgba(34,211,238,0.06)"; ctx.lineWidth=0.5; ctx.stroke();
      }
      for (let lon=0; lon<=360; lon+=30) {
        ctx.beginPath(); let first=true;
        for (let lat=-80; lat<=80; lat+=5) {
          const p = latLonToXY(lat, lon, rotY);
          if (p.z > 0) { if(first){ctx.moveTo(p.x,p.y);first=false;}else{ctx.lineTo(p.x,p.y);} }
          else first=true;
        }
        ctx.strokeStyle = "rgba(34,211,238,0.06)"; ctx.lineWidth=0.5; ctx.stroke();
      }

      // Land dots
      LAND_DOTS.forEach(([lat,lon]) => {
        const p = latLonToXY(lat, lon, rotY);
        if (p.z > 0.1) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 1, 0, Math.PI*2);
          ctx.fillStyle = `rgba(34,211,238,${p.z*0.4})`; ctx.fill();
        }
      });

      // Attack origins → center beams
      const center = { lat: 0, lon: 0 };
      attacks.forEach(([lat, lon], idx) => {
        const src = latLonToXY(lat, lon, rotY);
        const dst = latLonToXY(center.lat, center.lon+180*0, rotY);
        if (src.z < -0.2) return;

        const phase = (t*2 + idx*0.5) % 1;
        const midX = (src.x + cx) / 2 + Math.cos(idx)*20;
        const midY = Math.min(src.y, cy) - 30 - Math.abs(lat)*0.3;
        const px = (1-phase)*(1-phase)*src.x + 2*(1-phase)*phase*midX + phase*phase*cx;
        const py = (1-phase)*(1-phase)*src.y + 2*(1-phase)*phase*midY + phase*phase*cy;

        if (src.z > -0.1) {
          ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.quadraticCurveTo(midX, midY, cx, cy);
          ctx.strokeStyle = `rgba(226,18,39,0.12)`; ctx.lineWidth=0.5; ctx.stroke();
          const trailAlpha = Math.sin(phase*Math.PI)*0.8;
          ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2);
          ctx.fillStyle = `rgba(226,18,39,${trailAlpha})`; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 4+Math.sin(phase*Math.PI)*3, 0, Math.PI*2);
          ctx.fillStyle = `rgba(226,18,39,${trailAlpha*0.3})`; ctx.fill();
        }

        // Origin dot
        if (src.z > 0) {
          const pulse = Math.sin(t*4+idx)*0.5+0.5;
          ctx.beginPath(); ctx.arc(src.x, src.y, 2+pulse, 0, Math.PI*2);
          ctx.fillStyle = `rgba(226,18,39,${0.6+pulse*0.4})`; ctx.fill();
          ctx.beginPath(); ctx.arc(src.x, src.y, 6+pulse*3, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(226,18,39,${0.2+pulse*0.3})`; ctx.lineWidth=1; ctx.stroke();
        }
      });

      // ── Animated 3D Attack Packets ──────────────────────────────────────
      const rotYNow = t * 15;
      packetsRef.current.forEach(pkt => {
        const { srcLat, srcLon, progress, color, size } = pkt;
        const src3d = latLonToXY(srcLat, srcLon, rotYNow);
        if (src3d.z < -0.3) return; // behind globe

        // Bezier from src to center with an arc lift
        const midX = (src3d.x + cx) / 2;
        const midY = (src3d.y + cy) / 2 - R * 0.35 * (1 - Math.abs(src3d.z));
        const px = (1-progress)*(1-progress)*src3d.x + 2*(1-progress)*progress*midX + progress*progress*cx;
        const py = (1-progress)*(1-progress)*src3d.y + 2*(1-progress)*progress*midY + progress*progress*cy;

        // Depth fade based on src z
        const depthAlpha = 0.4 + src3d.z * 0.6;
        const brightness = 0.6 + progress * 0.4;

        // Glow halo
        const grd = ctx.createRadialGradient(px, py, 0, px, py, size * 4);
        const hexToRgb = (hex: string) => {
          const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
          return `${r},${g},${b}`;
        };
        const rgb = hexToRgb(color);
        grd.addColorStop(0, `rgba(${rgb},${depthAlpha * brightness * 0.9})`);
        grd.addColorStop(0.5, `rgba(${rgb},${depthAlpha * brightness * 0.3})`);
        grd.addColorStop(1, `rgba(${rgb},0)`);
        ctx.beginPath(); ctx.arc(px, py, size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        // Core dot
        ctx.beginPath(); ctx.arc(px, py, size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${depthAlpha})`; ctx.fill();

        // Impact flash at center when arriving
        if (progress > 0.9) {
          const flash = (progress - 0.9) / 0.1;
          ctx.beginPath(); ctx.arc(cx, cy, flash * 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb},${flash * 0.8})`; ctx.lineWidth = 1.5; ctx.stroke();
        }
      });

      // Center target pulse
      const cpulse = Math.sin(t*6)*0.5+0.5;
      for (let r = 4; r <= 18; r += 7) {
        ctx.beginPath(); ctx.arc(cx, cy, r+cpulse*2, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(226,18,39,${0.8-r/20})`; ctx.lineWidth=1; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
      ctx.fillStyle = "#e21227"; ctx.fill();

      // Atmosphere glow
      const atmGrad = ctx.createRadialGradient(cx, cy, R*0.9, cx, cy, R+10);
      atmGrad.addColorStop(0, "rgba(34,211,238,0.0)");
      atmGrad.addColorStop(0.5, "rgba(34,211,238,0.04)");
      atmGrad.addColorStop(1, "rgba(34,211,238,0.0)");
      ctx.beginPath(); ctx.arc(cx, cy, R+10, 0, Math.PI*2);
      ctx.fillStyle = atmGrad; ctx.fill();

      // Shine
      const shineGrad = ctx.createRadialGradient(cx-R*0.3, cy-R*0.35, 0, cx-R*0.1, cy-R*0.1, R*0.8);
      shineGrad.addColorStop(0, "rgba(255,255,255,0.06)");
      shineGrad.addColorStop(1, "rgba(255,255,255,0.0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.fillStyle = shineGrad; ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [attacks]);

  return <canvas ref={cvRef} width={200} height={200} style={{ width:200, height:200, flexShrink:0 }} />;
}

const LIVE_CVE_FEED: CVEEntry[] = [
  { id: "CVE-2025-31324", title: "SAP NetWeaver UNAUTHENTICATED RCE", cvss: 10.0, vendor: "SAP", product: "NetWeaver AS Java", type: "RCE", published: "2025-04-25", description: "Unauthenticated file upload in Visual Composer Metadata Uploader allows complete server takeover without any credentials.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(0,8) },
  { id: "CVE-2025-29824", title: "Windows CLFS Driver Zero-Day LPE", cvss: 7.8, vendor: "Microsoft", product: "Windows 10/11/Server", type: "LPE", published: "2025-04-09", description: "Use-after-free in Common Log File System driver allows local privilege escalation to SYSTEM. Exploited in the wild by RansomEXX.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(2,10) },
  { id: "CVE-2025-24054", title: "Windows NTLM Hash Disclosure", cvss: 6.5, vendor: "Microsoft", product: "Windows Server", type: "Auth Bypass", published: "2025-04-09", description: "NTLM hash disclosure via .library-ms file. Exploited in wild since March 19, 2025 targeting Polish and Romanian entities.", zeroday: false, attackOrigins: ATTACK_ORIGINS.slice(1,9) },
  { id: "CVE-2025-32433", title: "Erlang/OTP SSH RCE Pre-Auth", cvss: 10.0, vendor: "Erlang", product: "OTP SSH Server", type: "RCE", published: "2025-04-16", description: "Pre-authentication remote code execution in Erlang/OTP SSH server. CVSS 10.0. Affects all Erlang/OTP versions < 27.3.3.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(3,11) },
  { id: "CVE-2025-30065", title: "Apache Parquet Schema Parsing RCE", cvss: 10.0, vendor: "Apache", product: "Parquet Java", type: "RCE", published: "2025-04-01", description: "Deserialization vulnerability in parquet-avro module allows RCE when reading attacker-controlled Parquet files. Critical supply chain risk.", zeroday: false, attackOrigins: ATTACK_ORIGINS.slice(0,6) },
  { id: "CVE-2025-22457", title: "Ivanti Connect Secure Buffer Overflow", cvss: 9.0, vendor: "Ivanti", product: "Connect Secure", type: "Memory Corruption", published: "2025-04-04", description: "Stack-based buffer overflow enables unauthenticated RCE. Exploited by suspected China-nexus actor UNC5221 deploying TRAILBLAZE malware.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(1,7) },
  { id: "CVE-2025-21333", title: "Hyper-V NT Kernel LPE", cvss: 7.8, vendor: "Microsoft", product: "Hyper-V / Windows 11", type: "LPE", published: "2025-01-14", description: "Heap-based buffer overflow in NT OS Kernel Integration VSP allowing SYSTEM-level escape from Hyper-V guest. Actively exploited in wild.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(4,12) },
  { id: "CVE-2025-0282", title: "Ivanti VPN Unauthenticated Stack Overflow", cvss: 9.0, vendor: "Ivanti", product: "Connect Secure 22.7R2.2", type: "Memory Corruption", published: "2025-01-08", description: "Pre-authentication stack overflow enabling RCE on edge VPN appliances. Widely exploited in mass compromise campaigns.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(2,10) },
  { id: "CVE-2024-49035", title: "Microsoft Power Apps Privilege Escalation", cvss: 9.8, vendor: "Microsoft", product: "Power Apps", type: "Auth Bypass", published: "2024-11-12", description: "Improper access control in Power Apps allows unauthenticated privilege escalation to admin. Exploited in wild.", zeroday: false, attackOrigins: ATTACK_ORIGINS.slice(0,5) },
  { id: "CVE-2024-47176", title: "CUPS Unauthenticated RCE (Linux)", cvss: 9.9, vendor: "OpenPrinting", product: "CUPS", type: "RCE", published: "2024-09-26", description: "Chain of four CVEs in Linux CUPS printing system allows unauthenticated RCE on all GNU/Linux systems with cups-browsed enabled.", zeroday: false, attackOrigins: ATTACK_ORIGINS.slice(5,13) },
  { id: "CVE-2024-40711", title: "Veeam Backup RCE", cvss: 9.8, vendor: "Veeam", product: "Backup & Replication", type: "RCE", published: "2024-09-05", description: "Unauthenticated RCE in Veeam Backup & Replication. Exploited by Akira and Fog ransomware groups in mass campaigns.", zeroday: false, attackOrigins: ATTACK_ORIGINS.slice(2,8) },
  { id: "CVE-2024-3400", title: "PAN-OS Command Injection Zero-Day", cvss: 10.0, vendor: "Palo Alto", product: "PAN-OS GlobalProtect", type: "RCE", published: "2024-04-12", description: "OS command injection in GlobalProtect feature enables unauthenticated RCE with root privileges. Exploited by UTA0218 since March 26.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(0,8) },
  { id: "CVE-2025-26633", title: "Windows MMC Zero-Click RCE", cvss: 7.0, vendor: "Microsoft", product: "Windows MMC", type: "Zero-Click", published: "2025-03-11", description: "MSC file handling allows code execution without user interaction. Exploited by Water Gamayun APT group in targeted campaigns.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(3,9) },
  { id: "CVE-2025-30400", title: "Windows DWM Heap Use-After-Free", cvss: 7.8, vendor: "Microsoft", product: "Windows Desktop Window Manager", type: "LPE", published: "2025-05-13", description: "Heap use-after-free in DWM Core Library exploited in wild for local privilege escalation to SYSTEM.", zeroday: true, attackOrigins: ATTACK_ORIGINS.slice(1,7) },
  { id: "CVE-2025-41789", title: "Cisco IOS XE Auth Bypass", cvss: 9.8, vendor: "Cisco", product: "IOS XE", type: "Auth Bypass", published: "2025-05-20", description: "Authentication bypass in Cisco IOS XE web UI allows unauthenticated access to admin functions. Mass exploitation detected.", zeroday: false, attackOrigins: ATTACK_ORIGINS.slice(0,10) },
];

const CVSS_COLOR = (v: number) => v>=9?"#e21227":v>=7?"#f97316":v>=4?"#fbbf24":"#22c55e";
const SEV_LABEL = (v: number) => v>=9?"CRITICAL":v>=7?"HIGH":v>=4?"MEDIUM":"LOW";
const SEV_COLOR: Record<string, string> = { critical:"#e21227", high:"#f97316", medium:"#fbbf24", low:"#22c55e" };

export function LiveCVEModal({ open, onOpenChange }: Props) {
  const [selectedCVE, setSelectedCVE] = useState<CVEEntry|null>(null);
  const [exploitOpen, setExploitOpen] = useState(false);
  const [activeView, setActiveView] = useState<"globe"|"network"|"feed">("globe");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [intrusionEvents, setIntrusionEvents] = useState<IntrusionEvent[]>([]);
  const [threatLevel, setThreatLevel] = useState(35);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [allowedCount, setAllowedCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    if (open) {
      setIntrusionEvents(generateIntrusionEvents());
      const blocked = intrusionEvents.filter(e=>e.blocked).length;
      setBlockedCount(blocked); setAllowedCount(intrusionEvents.length-blocked);
    }
    return () => { if(timerRef.current) clearInterval(timerRef.current); if(liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    liveTimerRef.current = setInterval(() => {
      const types = INTRUSION_TYPES, srcIPs = ["192.168.1","10.0.0","172.16.0","45.141","198.51"];
      const srcIP = `${srcIPs[Math.floor(Math.random()*srcIPs.length)]}.${Math.floor(Math.random()*254)+1}`;
      const type = types[Math.floor(Math.random()*types.length)];
      const blocked = Math.random() > 0.3;
      const msg = `${blocked?"[BLOCKED]":"[ALLOWED]"} ${srcIP} → ${type}`;
      setLiveEvents(prev => [msg, ...prev].slice(0, 8));
      if (blocked) setBlockedCount(p=>p+1); else setAllowedCount(p=>p+1);
      setThreatLevel(p => Math.max(10, Math.min(95, p + (Math.random()-0.45)*8)));
    }, 2000);
    return () => { if(liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [open]);

  function startScan() {
    setScanning(true); setScanProgress(0);
    timerRef.current = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) { clearInterval(timerRef.current!); setScanning(false); setIntrusionEvents(generateIntrusionEvents()); return 100; }
        return p + 2 + Math.random()*3;
      });
    }, 80);
  }

  const allOrigins = LIVE_CVE_FEED.flatMap(c=>c.attackOrigins||[]);
  const criticalCount = LIVE_CVE_FEED.filter(c=>c.cvss>=9).length;
  const zerodayCount = LIVE_CVE_FEED.filter(c=>c.zeroday).length;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{background:"rgba(0,0,0,0.95)"}}
          onClick={(e)=>{ if(e.target===e.currentTarget) onOpenChange(false); }}>

          <motion.div initial={{scale:0.93,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.93,opacity:0}}
            className="relative w-full max-w-5xl max-h-[96vh] flex flex-col rounded-2xl border overflow-hidden"
            style={{background:"#080808",borderColor:"rgba(226,18,39,0.4)",boxShadow:"0 0 80px rgba(226,18,39,0.15),0 25px 60px rgba(0,0,0,0.9)"}}>

            {/* Header */}
            <div className="px-5 py-3 border-b flex items-center gap-3 shrink-0"
              style={{borderColor:"rgba(226,18,39,0.2)",background:"linear-gradient(135deg,rgba(226,18,39,0.1),rgba(0,0,0,0))"}}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background:"rgba(226,18,39,0.15)",border:"1px solid rgba(226,18,39,0.4)"}}>
                <Radio className="w-4 h-4" style={{color:"#e21227"}} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-black tracking-widest" style={{color:"#e21227"}}>THREAT INTELLIGENCE HUB</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded border animate-pulse" style={{background:"rgba(226,18,39,0.1)",color:"#e21227",borderColor:"rgba(226,18,39,0.3)"}}>LIVE</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border" style={{background:"rgba(226,18,39,0.08)",color:"#f97316",borderColor:"rgba(249,115,22,0.3)"}}>{criticalCount} CRITICAL</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border" style={{background:"rgba(226,18,39,0.08)",color:"#a855f7",borderColor:"rgba(168,85,247,0.3)"}}>{zerodayCount} ZERO-DAY</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  تهديدات 2024-2025 · {LIVE_CVE_FEED.length} CVE · شبكة مراقبة مباشرة · {blockedCount} محجوب | {allowedCount} مسموح
                </p>
              </div>
              <button onClick={()=>onOpenChange(false)} className="p-2 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Threat Level Bar */}
            <div className="px-5 py-2 border-b flex items-center gap-3" style={{borderColor:"rgba(226,18,39,0.15)",background:"rgba(0,0,0,0.5)"}}>
              <span className="text-[9px] font-black" style={{color:"rgba(226,18,39,0.7)"}}>THREAT LEVEL</span>
              <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full transition-all duration-500"
                  style={{width:`${threatLevel}%`, background: threatLevel>70?"linear-gradient(90deg,#f97316,#e21227)":threatLevel>40?"linear-gradient(90deg,#fbbf24,#f97316)":"linear-gradient(90deg,#22c55e,#fbbf24)"}} />
              </div>
              <span className="text-[10px] font-black font-mono" style={{color:threatLevel>70?"#e21227":threatLevel>40?"#f97316":"#22c55e"}}>{Math.round(threatLevel)}%</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background: threatLevel>70?"#e21227":"#22c55e"}} />
                <span className="text-[8px] font-black" style={{color:"rgba(255,255,255,0.4)"}}>{threatLevel>70?"CRITICAL":threatLevel>40?"ELEVATED":"NORMAL"}</span>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex border-b shrink-0" style={{borderColor:"rgba(226,18,39,0.15)"}}>
              {([
                {id:"globe",label:"كرة التهديدات 3D",icon:Globe},
                {id:"network",label:"شبكة الحزم",icon:Network},
                {id:"feed",label:`تغذية CVE (${LIVE_CVE_FEED.length})`,icon:Shield},
              ] as const).map(v=>(
                <button key={v.id} onClick={()=>setActiveView(v.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold transition-all"
                  style={{color:activeView===v.id?"#e21227":"rgba(255,255,255,0.35)",background:activeView===v.id?"rgba(226,18,39,0.08)":"transparent",borderBottom:activeView===v.id?"2px solid #e21227":"2px solid transparent"}}>
                  <v.icon className="w-3.5 h-3.5" />{v.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">

              {/* GLOBE VIEW */}
              {activeView==="globe" && (
                <div className="flex gap-0 h-full min-h-[400px]">
                  {/* Globe */}
                  <div className="w-[220px] shrink-0 flex flex-col items-center justify-center p-4 border-r" style={{borderColor:"rgba(226,18,39,0.15)"}}>
                    <div className="relative">
                      <AttackGlobe3D attacks={selectedCVE?.attackOrigins || allOrigins.slice(0,12)} />
                      <div className="absolute top-2 left-2 text-[8px] font-mono" style={{color:"rgba(226,18,39,0.7)"}}>GLOBAL THREAT MAP</div>
                    </div>
                    <div className="mt-3 w-full space-y-1.5">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-muted-foreground">مصادر الهجوم</span>
                        <span className="font-bold font-mono" style={{color:"#e21227"}}>{allOrigins.length}</span>
                      </div>
                      {ATTACK_LABELS.slice(0,5).map((label, i) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{background:`hsl(${i*40},70%,55%)`}} />
                          <span className="text-[9px] text-muted-foreground flex-1">{label}</span>
                          <div className="h-1 rounded-full" style={{width:`${20+Math.random()*40}px`,background:`hsl(${i*40},70%,55%)`,opacity:0.6}} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 w-full p-2 rounded-xl border" style={{borderColor:"rgba(226,18,39,0.2)",background:"rgba(226,18,39,0.05)"}}>
                      <p className="text-[8px] text-muted-foreground/50 mb-1">LIVE EVENTS</p>
                      {liveEvents.slice(0,4).map((ev,i)=>(
                        <motion.p key={ev+i} initial={{opacity:0,x:-5}} animate={{opacity:1,x:0}}
                          className="text-[8px] font-mono truncate" style={{color:ev.includes("BLOCKED")?"#22c55e":"#e21227"}}>
                          {ev}
                        </motion.p>
                      ))}
                    </div>
                  </div>

                  {/* CVE List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black">قائمة CVE الحية</span>
                      <button onClick={startScan} disabled={scanning}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all disabled:opacity-60"
                        style={{background:"rgba(226,18,39,0.1)",border:"1px solid rgba(226,18,39,0.3)",color:"#e21227"}}>
                        {scanning?<RefreshCw className="w-3 h-3 animate-spin"/>:<Radio className="w-3 h-3"/>}
                        {scanning?`فحص... ${Math.round(scanProgress)}%`:"فحص مباشر"}
                      </button>
                    </div>
                    {scanning && (
                      <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
                        <motion.div className="h-full rounded-full" style={{background:"linear-gradient(90deg,#e21227,#f97316)",width:`${scanProgress}%`}} transition={{duration:0.1}} />
                      </div>
                    )}
                    {LIVE_CVE_FEED.map(cve => (
                      <motion.div key={cve.id} layout
                        className={`rounded-xl border cursor-pointer transition-all ${selectedCVE?.id===cve.id?"border-opacity-70":"border-opacity-20 hover:border-opacity-40"}`}
                        style={{background:selectedCVE?.id===cve.id?"rgba(226,18,39,0.08)":"rgba(0,0,0,0.4)",borderColor:CVSS_COLOR(cve.cvss)+"55"}}
                        onClick={()=>setSelectedCVE(selectedCVE?.id===cve.id?null:cve)}>
                        <div className="flex items-start gap-2.5 p-2.5">
                          <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                            <div className="text-[11px] font-black" style={{color:CVSS_COLOR(cve.cvss)}}>{cve.cvss}</div>
                            <div className="text-[7px] font-bold px-1 rounded" style={{background:CVSS_COLOR(cve.cvss)+"20",color:CVSS_COLOR(cve.cvss)}}>{SEV_LABEL(cve.cvss)}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold text-muted-foreground/50 font-mono">{cve.id}</span>
                              {cve.zeroday && <span className="text-[7px] font-black px-1.5 py-0.5 rounded" style={{background:"rgba(226,18,39,0.15)",color:"#e21227"}}>0-DAY</span>}
                              <span className="text-[7px] px-1.5 py-0.5 rounded" style={{background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)"}}>{cve.type}</span>
                            </div>
                            <p className="text-[10px] font-bold mt-0.5 leading-tight">{cve.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] text-muted-foreground/50">{cve.vendor} · {cve.product}</span>
                              <span className="text-[8px] text-muted-foreground/30">{cve.published}</span>
                            </div>
                          </div>
                          <button onClick={(e)=>{e.stopPropagation();setSelectedCVE(cve);setExploitOpen(true);}}
                            className="px-2 py-1.5 rounded-lg text-[9px] font-bold shrink-0 transition-all hover:opacity-80"
                            style={{background:"rgba(226,18,39,0.15)",color:"#e21227",border:"1px solid rgba(226,18,39,0.3)"}}>
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                        <AnimatePresence>
                          {selectedCVE?.id===cve.id && (
                            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                              <div className="px-3 pb-3 pt-1 border-t space-y-2" style={{borderColor:CVSS_COLOR(cve.cvss)+"22"}}>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">{cve.description}</p>
                                {(MITRE_TACTICS[cve.type]||MITRE_TACTICS["default"]).map(t=>(
                                  <div key={t.id} className="flex items-center gap-2 text-[9px] px-2 py-1 rounded-lg" style={{background:`${t.color}10`,border:`1px solid ${t.color}25`}}>
                                    <span className="font-bold font-mono" style={{color:t.color}}>{t.id}</span>
                                    <span style={{color:`${t.color}cc`}}>{t.tactic} → {t.technique}</span>
                                  </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                  <button onClick={()=>setExploitOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold"
                                    style={{background:"rgba(226,18,39,0.15)",color:"#e21227",border:"1px solid rgba(226,18,39,0.3)"}}>
                                    <Target className="w-3 h-3" /> استغلال
                                  </button>
                                  <a href={`https://nvd.nist.gov/vuln/detail/${cve.id}`} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold"
                                    style={{background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.1)"}}>
                                    <ExternalLink className="w-3 h-3" /> NVD
                                  </a>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* NETWORK VIEW */}
              {activeView==="network" && (
                <div className="p-4 space-y-4">
                  <div className="rounded-xl border overflow-hidden" style={{borderColor:"rgba(34,211,238,0.2)",background:"rgba(0,0,0,0.7)"}}>
                    <div className="px-3 py-2 border-b flex items-center gap-2" style={{borderColor:"rgba(34,211,238,0.15)"}}>
                      <Wifi className="w-3.5 h-3.5" style={{color:"#22d3ee"}} />
                      <span className="text-[11px] font-black" style={{color:"#22d3ee"}}>NETWORK PACKET MONITOR</span>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse ml-1" style={{background:"#22c55e"}} />
                      <span className="text-[8px] font-mono text-muted-foreground ml-1">LIVE</span>
                    </div>
                    <div className="p-2">
                      <PacketNetworkViz active={true} threatLevel={threatLevel} />
                    </div>
                    <div className="px-3 py-2 grid grid-cols-4 gap-2 border-t text-center" style={{borderColor:"rgba(34,211,238,0.1)"}}>
                      {[
                        {label:"محجوب",val:blockedCount,color:"#22c55e"},
                        {label:"مسموح",val:allowedCount,color:"#e21227"},
                        {label:"مستوى التهديد",val:`${Math.round(threatLevel)}%`,color:threatLevel>70?"#e21227":"#f59e0b"},
                        {label:"CVE نشط",val:LIVE_CVE_FEED.filter(c=>c.zeroday).length,color:"#a855f7"},
                      ].map(s=>(
                        <div key={s.label} className="space-y-0.5">
                          <p className="text-[14px] font-black" style={{color:s.color}}>{s.val}</p>
                          <p className="text-[8px] text-muted-foreground/50">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live event stream */}
                  <div className="rounded-xl border overflow-hidden" style={{borderColor:"rgba(226,18,39,0.2)",background:"rgba(0,0,0,0.6)"}}>
                    <div className="px-3 py-2 border-b flex items-center gap-2" style={{borderColor:"rgba(226,18,39,0.15)"}}>
                      <Activity className="w-3.5 h-3.5" style={{color:"#e21227"}} />
                      <span className="text-[11px] font-black">INTRUSION DETECTION FEED</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-auto" />
                    </div>
                    <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto font-mono">
                      <AnimatePresence>
                        {liveEvents.map((ev,i)=>(
                          <motion.div key={ev+i} initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                            className="flex items-center gap-2 text-[10px] py-1 border-b" style={{borderColor:"rgba(255,255,255,0.03)"}}>
                            {ev.includes("BLOCKED")
                              ? <Lock className="w-3 h-3 text-emerald-400 shrink-0"/>
                              : <Unlock className="w-3 h-3 shrink-0" style={{color:"#e21227"}}/>}
                            <span style={{color:ev.includes("BLOCKED")?"#22c55e":"#f97316"}}>{ev}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Intrusion events table */}
                  <div className="rounded-xl border overflow-hidden" style={{borderColor:"rgba(255,255,255,0.08)"}}>
                    <div className="px-3 py-2 border-b flex items-center justify-between" style={{borderColor:"rgba(255,255,255,0.06)"}}>
                      <div className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-black">محاولات الاختراق الحديثة</span>
                      </div>
                      <button onClick={()=>setIntrusionEvents(generateIntrusionEvents())}
                        className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground transition-colors">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b" style={{borderColor:"rgba(255,255,255,0.06)"}}>
                            {["الخطورة","النوع","المصدر","الهدف","البروتوكول","الحجم","الحالة"].map(h=>(
                              <th key={h} className="px-3 py-2 text-right font-bold text-muted-foreground/50">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {intrusionEvents.slice(0,10).map(ev=>(
                            <tr key={ev.id} className="border-b hover:bg-[#0d0d0d] transition-colors" style={{borderColor:"rgba(255,255,255,0.03)"}}>
                              <td className="px-3 py-1.5">
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{background:`${SEV_COLOR[ev.severity]}15`,color:SEV_COLOR[ev.severity]}}>{ev.severity.toUpperCase()}</span>
                              </td>
                              <td className="px-3 py-1.5 font-mono text-muted-foreground">{ev.type}</td>
                              <td className="px-3 py-1.5 font-mono text-muted-foreground/60">{ev.src}</td>
                              <td className="px-3 py-1.5 font-mono text-muted-foreground/60">{ev.dst}</td>
                              <td className="px-3 py-1.5 text-muted-foreground/40">{ev.protocol}</td>
                              <td className="px-3 py-1.5 text-muted-foreground/40">{(ev.bytes/1024).toFixed(1)}KB</td>
                              <td className="px-3 py-1.5">
                                {ev.blocked
                                  ? <span className="flex items-center gap-1 text-emerald-400"><Lock className="w-2.5 h-2.5"/>محجوب</span>
                                  : <span className="flex items-center gap-1" style={{color:"#e21227"}}><AlertCircle className="w-2.5 h-2.5"/>مسموح</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* FEED VIEW */}
              {activeView==="feed" && (
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      {label:"إجمالي CVE",val:LIVE_CVE_FEED.length,color:"#a78bfa",icon:Shield},
                      {label:"حرجة",val:criticalCount,color:"#e21227",icon:AlertTriangle},
                      {label:"Zero-Day",val:zerodayCount,color:"#f97316",icon:Zap},
                      {label:"RCE",val:LIVE_CVE_FEED.filter(c=>c.type==="RCE"||c.type==="Memory Corruption").length,color:"#06b6d4",icon:Target},
                    ].map(s=>(
                      <div key={s.label} className="rounded-xl border p-3 text-center" style={{borderColor:`${s.color}25`,background:`${s.color}08`}}>
                        <s.icon className="w-4 h-4 mx-auto mb-1" style={{color:s.color}} />
                        <p className="text-[18px] font-black" style={{color:s.color}}>{s.val}</p>
                        <p className="text-[8px] text-muted-foreground/50">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {LIVE_CVE_FEED.map(cve=>(
                    <div key={cve.id} className="rounded-xl border p-3 cursor-pointer hover:border-opacity-40 transition-all"
                      style={{borderColor:CVSS_COLOR(cve.cvss)+"30",background:"rgba(0,0,0,0.4)"}}
                      onClick={()=>{setSelectedCVE(cve);setActiveView("globe");}}>
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 text-center">
                          <div className="text-[14px] font-black" style={{color:CVSS_COLOR(cve.cvss)}}>{cve.cvss}</div>
                          <div className="text-[7px] font-bold" style={{color:CVSS_COLOR(cve.cvss)}}>{SEV_LABEL(cve.cvss)}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-mono text-muted-foreground/40">{cve.id}</span>
                            {cve.zeroday&&<span className="text-[7px] font-black px-1 rounded" style={{background:"rgba(226,18,39,0.2)",color:"#e21227"}}>0-DAY</span>}
                            <span className="text-[7px] px-1.5 rounded" style={{background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.4)"}}>{cve.type}</span>
                            <span className="text-[7px] text-muted-foreground/30">{cve.vendor}</span>
                          </div>
                          <p className="text-[11px] font-bold mt-0.5">{cve.title}</p>
                          <p className="text-[9px] text-muted-foreground/50 mt-0.5 truncate">{cve.description.slice(0,100)}...</p>
                        </div>
                        <button onClick={(e)=>{e.stopPropagation();setSelectedCVE(cve);setExploitOpen(true);}}
                          className="shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-bold" style={{background:"rgba(226,18,39,0.15)",color:"#e21227",border:"1px solid rgba(226,18,39,0.3)"}}>
                          استغلال
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t flex items-center justify-between shrink-0" style={{borderColor:"rgba(226,18,39,0.15)"}}>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:"#e21227"}} />
                <span className="text-[9px] text-muted-foreground">آخر تحديث: {new Date().toLocaleTimeString("ar-SA")}</span>
                <span className="text-[9px] font-mono text-muted-foreground/40">NVD · CISA KEV · MITRE ATT&CK</span>
              </div>
              <button onClick={()=>onOpenChange(false)} className="px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white text-[11px] font-bold hover:bg-[#222] transition-colors">إغلاق</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      {exploitOpen && selectedCVE && (
        <ExploitChainModal open={exploitOpen} onClose={()=>setExploitOpen(false)} cveId={selectedCVE.id} cvssScore={selectedCVE.cvss} targetProduct={selectedCVE.product} vulnerabilityType={selectedCVE.type} />
      )}
    </AnimatePresence>
  );
}
