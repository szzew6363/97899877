import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, Wifi, Zap } from "lucide-react";

/* =============================================================================
   LIVE ATTACK GLOBE 3D
   Real-time 3D Earth globe with animated cyber attack arcs.
   Uses CISA KEV CVE pool — country geolocation — Three.js pure canvas.
   Mouse drag to rotate. Auto-spins. New attack every ~2-3s.
============================================================================= */

interface CountryData {
  name: string; lat: number; lon: number;
  isOrigin?: boolean; isTarget?: boolean;
}

const COUNTRIES: CountryData[] = [
  { name: "China",        lat:  35.86, lon: 104.19, isOrigin: true },
  { name: "Russia",       lat:  61.52, lon: 105.31, isOrigin: true },
  { name: "Iran",         lat:  32.42, lon:  53.68, isOrigin: true },
  { name: "North Korea",  lat:  40.33, lon: 127.51, isOrigin: true },
  { name: "India",        lat:  20.59, lon:  78.96, isOrigin: true, isTarget: true },
  { name: "Brazil",       lat: -14.23, lon: -51.92, isOrigin: true, isTarget: true },
  { name: "UAE",          lat:  23.42, lon:  53.84, isOrigin: true },
  { name: "Saudi Arabia", lat:  23.88, lon:  45.07, isOrigin: true, isTarget: true },
  { name: "Turkey",       lat:  38.96, lon:  35.24, isOrigin: true, isTarget: true },
  { name: "Pakistan",     lat:  30.38, lon:  69.34, isOrigin: true },
  { name: "USA",          lat:  37.09, lon: -95.71, isTarget: true },
  { name: "UK",           lat:  51.50, lon:  -0.12, isTarget: true },
  { name: "Germany",      lat:  51.16, lon:  10.45, isTarget: true },
  { name: "France",       lat:  46.22, lon:   2.21, isTarget: true },
  { name: "Japan",        lat:  36.20, lon: 138.25, isTarget: true },
  { name: "Australia",    lat: -25.27, lon: 133.77, isTarget: true },
  { name: "South Korea",  lat:  35.90, lon: 127.76, isTarget: true },
  { name: "Canada",       lat:  56.13, lon: -106.34, isTarget: true },
  { name: "Netherlands",  lat:  52.37, lon:   4.90, isTarget: true },
  { name: "Israel",       lat:  31.04, lon:  34.85, isTarget: true },
  { name: "Singapore",    lat:   1.35, lon: 103.81, isTarget: true },
  { name: "Taiwan",       lat:  23.69, lon: 120.96, isTarget: true },
  { name: "Ukraine",      lat:  48.37, lon:  31.16, isTarget: true },
  { name: "Switzerland",  lat:  46.81, lon:   8.22, isTarget: true },
];

interface CVEData {
  id: string; product: string; severity: "critical" | "high" | "medium";
  cvss: number; technique: string;
}

const CVE_POOL: CVEData[] = [
  { id:"CVE-2024-3400",   product:"Palo Alto PAN-OS",         severity:"critical", cvss:10.0, technique:"OS Command Injection RCE" },
  { id:"CVE-2024-21762",  product:"Fortinet SSL-VPN",          severity:"critical", cvss: 9.6, technique:"Unauthenticated Auth Bypass" },
  { id:"CVE-2023-46805",  product:"Ivanti Connect Secure",     severity:"critical", cvss: 8.2, technique:"Auth Bypass via Path Traversal" },
  { id:"CVE-2024-1709",   product:"ConnectWise ScreenConnect", severity:"critical", cvss:10.0, technique:"CWE-288 Auth Bypass" },
  { id:"CVE-2023-4966",   product:"Citrix NetScaler",          severity:"critical", cvss: 9.4, technique:"Session Token Disclosure" },
  { id:"CVE-2024-27198",  product:"JetBrains TeamCity",        severity:"critical", cvss: 9.8, technique:"Authentication Bypass" },
  { id:"CVE-2023-22527",  product:"Atlassian Confluence",      severity:"critical", cvss:10.0, technique:"Template Injection RCE" },
  { id:"CVE-2024-23897",  product:"Jenkins Core",              severity:"critical", cvss: 9.8, technique:"Arbitrary File Read" },
  { id:"CVE-2024-6387",   product:"OpenSSH glibc",             severity:"critical", cvss: 8.1, technique:"RegreSSHion Async-Signal RCE" },
  { id:"CVE-2024-30080",  product:"Windows MSMQ",              severity:"critical", cvss: 9.8, technique:"Remote Code Execution" },
  { id:"CVE-2024-47575",  product:"Fortinet FortiManager",     severity:"critical", cvss: 9.8, technique:"Missing Auth (fgfmsd)" },
  { id:"CVE-2024-10914",  product:"D-Link NAS",                severity:"critical", cvss: 9.2, technique:"OS Command Injection" },
  { id:"CVE-2024-9463",   product:"Palo Alto Expedition",      severity:"critical", cvss: 9.9, technique:"Unauthenticated OS Command Injection" },
  { id:"CVE-2024-43468",  product:"MS Configuration Manager",  severity:"critical", cvss: 9.8, technique:"SQL Injection RCE" },
  { id:"CVE-2024-20353",  product:"Cisco ASA/FTD",             severity:"high",     cvss: 8.6, technique:"Persistent Denial of Service" },
  { id:"CVE-2024-38112",  product:"Windows MSHTML Platform",   severity:"high",     cvss: 7.5, technique:"Spoofing Attack" },
  { id:"CVE-2024-21893",  product:"Ivanti Connect Secure SSRF", severity:"high",    cvss: 8.2, technique:"Server-Side Request Forgery" },
  { id:"CVE-2023-36884",  product:"Microsoft Office / Windows", severity:"high",    cvss: 8.3, technique:"RCE via Crafted Document" },
  { id:"CVE-2024-20767",  product:"Adobe ColdFusion",          severity:"high",     cvss: 7.4, technique:"Improper Access Control" },
  { id:"CVE-2024-11477",  product:"7-Zip",                     severity:"high",     cvss: 7.8, technique:"Deserialization of Untrusted Data" },
  { id:"CVE-2024-28986",  product:"SolarWinds Web Help Desk",  severity:"critical", cvss: 9.8, technique:"Java Deserialization RCE" },
  { id:"CVE-2024-40711",  product:"Veeam Backup & Replication",severity:"critical", cvss: 9.8, technique:"Deserialization RCE" },
  { id:"CVE-2024-29824",  product:"Ivanti EPM SQL Injection",  severity:"critical", cvss: 9.6, technique:"SQL Injection RCE" },
  { id:"CVE-2024-22024",  product:"Ivanti Policy Secure",      severity:"critical", cvss: 8.3, technique:"XXE — Auth Bypass" },
  { id:"CVE-2024-26169",  product:"Windows Error Reporting",   severity:"high",     cvss: 7.8, technique:"Local Privilege Escalation" },
];

const SEVERITY_COLOR: Record<string, number> = {
  critical: 0xFF1133,
  high:     0xFF6600,
  medium:   0xFFAA00,
};

const SEVERITY_HEX: Record<string, string> = {
  critical: "#FF1133",
  high:     "#FF6600",
  medium:   "#FFAA00",
};

function latLon2Vec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function arcMid(a: THREE.Vector3, b: THREE.Vector3, lift: number): THREE.Vector3 {
  const m = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return m.add(m.clone().normalize().multiplyScalar(lift));
}

interface AttackArc {
  id:       string;
  line:     THREE.Line;
  head:     THREE.Mesh;
  flash:    THREE.Mesh;
  curve:    THREE.QuadraticBezierCurve3;
  pts:      THREE.Vector3[];
  progress: number;
  speed:    number;
  cve:      CVEData;
  origin:   CountryData;
  target:   CountryData;
  phase:    "travel" | "impact" | "fade";
  ttl:      number;
  maxTtl:   number;
}

interface FeedEntry {
  id: string; cve: CVEData; origin: string; target: string; ts: string;
}

export function LiveAttackGlobe3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, active: 0 });
  const [clock, setClock] = useState("");
  const [latestCve, setLatestCve] = useState<CVEData | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setClock(new Date().toUTCString().slice(0, 25) + " UTC");
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 800;
    const H = mount.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.set(0, 0, 4.8);

    scene.add(new THREE.AmbientLight(0x112255, 4));
    const pl1 = new THREE.PointLight(0x3366ff, 10, 30);
    pl1.position.set(3, 4, 5);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0xff1133, 4, 20);
    pl2.position.set(-5, -3, -4);
    scene.add(pl2);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // Earth core
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x030818,
      emissive: 0x071830,
      specular: 0x1133aa,
      shininess: 60,
    });
    const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 72, 36), earthMat);
    group.add(earthMesh);

    // Grid wireframe overlay
    const gridMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.508, 30, 15),
      new THREE.MeshBasicMaterial({ color: 0x0a2a77, wireframe: true, transparent: true, opacity: 0.22 })
    );
    group.add(gridMesh);

    // Atmospheric glow
    const atmMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.70, 32, 16),
      new THREE.MeshBasicMaterial({
        color: 0x0044cc, transparent: true, opacity: 0.07,
        side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    group.add(atmMesh);

    // Outer soft halo
    const haloMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.90, 32, 16),
      new THREE.MeshBasicMaterial({
        color: 0x002288, transparent: true, opacity: 0.04,
        side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    group.add(haloMesh);

    // Country markers + rings
    COUNTRIES.forEach(c => {
      const pos = latLon2Vec3(c.lat, c.lon, 1.515);
      const col = c.isOrigin && c.isTarget ? 0xaa55ff
                : c.isOrigin              ? 0xff2244
                :                          0x2299ff;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 6, 6),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
      );
      dot.position.copy(pos);
      group.add(dot);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.026, 0.036, 18),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      group.add(ring);
    });

    // Stars
    const starVerts: number[] = [];
    for (let i = 0; i < 2500; i++) {
      const r2 = 40 + Math.random() * 60;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starVerts.push(r2 * Math.sin(p) * Math.cos(t), r2 * Math.cos(p), r2 * Math.sin(p) * Math.sin(t));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x7788cc, size: 0.12, transparent: true, opacity: 0.5 })));

    // Attack arc state
    const arcs: AttackArc[] = [];
    let totalCount = 0;
    let critCount  = 0;
    let highCount  = 0;
    let lastSpawn  = -9999;
    let rafId      = 0;

    function spawnArc() {
      const origins = COUNTRIES.filter(c => c.isOrigin);
      const targets = COUNTRIES.filter(c => c.isTarget);
      const origin  = origins[Math.floor(Math.random() * origins.length)];
      const pool    = targets.filter(t => t.name !== origin.name);
      if (!pool.length) return;
      const target = pool[Math.floor(Math.random() * pool.length)];
      const cve    = CVE_POOL[Math.floor(Math.random() * CVE_POOL.length)];
      const colorN = SEVERITY_COLOR[cve.severity] ?? 0xff6600;

      const startPos = latLon2Vec3(origin.lat, origin.lon, 1.52);
      const endPos   = latLon2Vec3(target.lat, target.lon, 1.52);
      const lift     = 0.75 + Math.random() * 1.0;
      const midPos   = arcMid(startPos, endPos, lift);
      const curve    = new THREE.QuadraticBezierCurve3(startPos, midPos, endPos);
      const pts      = curve.getPoints(80);

      // Pre-allocated geometry
      const posArr = new Float32Array(80 * 3);
      const geom   = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      geom.setDrawRange(0, 0);
      const lineMat = new THREE.LineBasicMaterial({ color: colorN, transparent: true, opacity: 0.90, blending: THREE.AdditiveBlending });
      const line    = new THREE.Line(geom, lineMat);
      group.add(line);

      // Moving head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.030, 7, 7),
        new THREE.MeshBasicMaterial({ color: colorN, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending })
      );
      head.position.copy(startPos);
      group.add(head);

      // Impact flash sphere
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.10, 8, 8),
        new THREE.MeshBasicMaterial({ color: colorN, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      flash.position.copy(endPos);
      group.add(flash);

      const id  = `arc-${Date.now()}-${Math.random()}`;
      const ttl = 220 + Math.floor(Math.random() * 100);
      arcs.push({ id, line, head, flash, curve, pts, progress: 0,
        speed: 0.007 + Math.random() * 0.006, cve, origin, target,
        phase: "travel", ttl, maxTtl: ttl });

      totalCount++;
      if (cve.severity === "critical") critCount++;
      else if (cve.severity === "high")  highCount++;

      const ts = new Date().toISOString().slice(11, 19) + " UTC";
      setFeed(prev => [{ id, cve, origin: origin.name, target: target.name, ts }, ...prev].slice(0, 10));
      setLatestCve(cve);
      setStats({ total: totalCount, critical: critCount, high: highCount, active: arcs.length });
    }

    // Mouse drag
    let isDrag = false;
    let mx = 0, my = 0;
    const onDown = (e: MouseEvent) => { isDrag = true; mx = e.clientX; my = e.clientY; };
    const onUp   = () => { isDrag = false; };
    const onMove = (e: MouseEvent) => {
      if (!isDrag) return;
      group.rotation.y += (e.clientX - mx) * 0.006;
      group.rotation.x += (e.clientY - my) * 0.006;
      mx = e.clientX; my = e.clientY;
    };
    mount.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);

    // Resize observer
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    function animate(t: number) {
      rafId = requestAnimationFrame(animate);

      // Spawn
      if (t - lastSpawn > 2000 + Math.random() * 2000) {
        spawnArc();
        lastSpawn = t;
      }

      // Globe auto-rotate
      if (!isDrag) group.rotation.y += 0.0006;

      // Update arcs
      let activeNow = 0;
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        if (arc.phase === "travel") {
          arc.progress = Math.min(1, arc.progress + arc.speed);
          const cnt = Math.max(2, Math.floor(arc.progress * 80));
          const posAttr = arc.line.geometry.attributes.position as THREE.BufferAttribute;
          for (let j = 0; j < cnt; j++) {
            const p = arc.pts[j];
            posAttr.setXYZ(j, p.x, p.y, p.z);
          }
          posAttr.needsUpdate = true;
          arc.line.geometry.setDrawRange(0, cnt);
          arc.head.position.copy(arc.curve.getPoint(arc.progress));
          if (arc.progress >= 1) {
            arc.phase = "impact";
            arc.ttl   = 35;
          }
          activeNow++;
        } else if (arc.phase === "impact") {
          arc.ttl--;
          const f = 1 - arc.ttl / 35;
          (arc.flash.material as THREE.MeshBasicMaterial).opacity = f * (1 - f) * 4 * 0.85;
          arc.flash.scale.setScalar(1 + f * 3.5);
          arc.head.visible = false;
          if (arc.ttl <= 0) { arc.phase = "fade"; arc.ttl = arc.maxTtl; }
        } else {
          arc.ttl--;
          const alpha = arc.ttl / arc.maxTtl;
          (arc.line.material  as THREE.LineBasicMaterial).opacity   = alpha * 0.65;
          (arc.flash.material as THREE.MeshBasicMaterial).opacity   = 0;
          if (arc.ttl <= 0) {
            group.remove(arc.line, arc.head, arc.flash);
            arc.line.geometry.dispose();
            (arc.line.material  as THREE.Material).dispose();
            arc.head.geometry.dispose();
            (arc.head.material  as THREE.Material).dispose();
            arc.flash.geometry.dispose();
            (arc.flash.material as THREE.Material).dispose();
            arcs.splice(i, 1);
          }
        }
      }
      if (activeNow !== stats.active) setStats(s => ({ ...s, active: activeNow }));

      renderer.render(scene, camera);
    }

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup",  onUp);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing" style={{ background: "#00010a" }}>
      <div ref={mountRef} className="absolute inset-0" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)" }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-2.5"
        style={{ background: "linear-gradient(180deg,rgba(0,1,10,0.92) 0%,transparent 100%)", borderBottom: "1px solid rgba(0,80,200,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 8px #FF1133" }} />
          <span className="text-[10px] font-bold tracking-[0.4em]" style={{ color: "rgba(200,220,255,0.85)" }}>
            LIVE GLOBAL CYBER ATTACK INTELLIGENCE
          </span>
          <span className="text-[8px] px-2 py-0.5 rounded font-mono font-bold tracking-widest"
            style={{ background: "rgba(255,17,51,0.12)", color: "#FF4466", border: "1px solid rgba(255,17,51,0.28)" }}>
            CISA KEV LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-white/25">{clock}</span>
          <span className="flex items-center gap-1.5 text-[9px] font-mono" style={{ color: "#22ff88" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            STREAMING
          </span>
        </div>
      </div>

      {/* Left: Attack feed */}
      <div className="absolute left-3 top-12 bottom-16 z-20 w-[220px] overflow-hidden flex flex-col" style={{ pointerEvents: "none" }}>
        <div className="text-[8px] font-bold tracking-[0.35em] mb-1.5" style={{ color: "rgba(100,140,255,0.5)" }}>
          LIVE ATTACK FEED
        </div>
        <div className="flex-1 overflow-hidden flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout">
            {feed.map(f => (
              <motion.div key={f.id}
                initial={{ opacity: 0, x: -14, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className="rounded-lg px-2.5 py-2"
                style={{
                  background: "rgba(0,3,18,0.88)",
                  border: `1px solid ${SEVERITY_HEX[f.cve.severity]}28`,
                  backdropFilter: "blur(6px)",
                }}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded tracking-widest"
                    style={{ background: `${SEVERITY_HEX[f.cve.severity]}18`, color: SEVERITY_HEX[f.cve.severity] }}>
                    {f.cve.severity.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono text-white/55 truncate">{f.cve.id}</span>
                </div>
                <div className="text-[8px] text-white/40 truncate mb-0.5">{f.cve.product}</div>
                <div className="flex items-center gap-1 text-[8px]">
                  <span style={{ color: "#ff4466" }}>{f.origin}</span>
                  <span className="text-white/20">→</span>
                  <span style={{ color: "#4499ff" }}>{f.target}</span>
                </div>
                <div className="text-[7px] text-white/20 mt-0.5">{f.ts}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Stats + Latest KEV */}
      <div className="absolute right-3 top-12 z-20 w-[185px] flex flex-col gap-2" style={{ pointerEvents: "none" }}>
        <div className="text-[8px] font-bold tracking-[0.35em] mb-0.5" style={{ color: "rgba(100,140,255,0.5)" }}>
          THREAT METRICS
        </div>
        {([
          { label: "Total Detected",  val: stats.total,    color: "#aabbff", Icon: Activity },
          { label: "Critical Alerts", val: stats.critical, color: "#FF1133", Icon: AlertTriangle },
          { label: "High Severity",   val: stats.high,     color: "#FF6600", Icon: Zap },
          { label: "Active Strikes",  val: stats.active,   color: "#00aaff", Icon: Wifi },
        ] as const).map(row => (
          <div key={row.label} className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: "rgba(0,3,18,0.88)", border: `1px solid ${row.color}18`, backdropFilter: "blur(6px)" }}>
            <div className="flex items-center gap-1.5">
              <row.Icon className="w-3 h-3" style={{ color: row.color, opacity: 0.7 }} />
              <span className="text-[8px] font-mono" style={{ color: "rgba(150,170,220,0.6)" }}>{row.label}</span>
            </div>
            <span className="text-sm font-bold font-mono tabular-nums" style={{ color: row.color, textShadow: `0 0 10px ${row.color}99` }}>
              {String(row.val).padStart(4, "0")}
            </span>
          </div>
        ))}

        {/* Latest KEV entry */}
        {latestCve && (
          <motion.div key={latestCve.id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg p-3 mt-1"
            style={{ background: "rgba(0,3,18,0.92)", border: "1px solid rgba(255,17,51,0.22)", backdropFilter: "blur(6px)" }}>
            <div className="text-[7px] font-bold tracking-[0.35em] mb-1.5" style={{ color: "rgba(100,140,255,0.5)" }}>LATEST KEV ENTRY</div>
            <div className="text-[10px] font-mono font-bold" style={{ color: SEVERITY_HEX[latestCve.severity] }}>{latestCve.id}</div>
            <div className="text-[9px] text-white/60 truncate">{latestCve.product}</div>
            <div className="text-[8px] text-white/35 truncate mt-0.5">{latestCve.technique}</div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${SEVERITY_HEX[latestCve.severity]}15`, color: SEVERITY_HEX[latestCve.severity], border: `1px solid ${SEVERITY_HEX[latestCve.severity]}30` }}>
                CVSS {latestCve.cvss.toFixed(1)}
              </span>
              <span className="text-[7px] font-mono text-white/25">KEV CONFIRMED</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom legend + hint */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 py-3"
        style={{ background: "linear-gradient(0deg,rgba(0,1,10,0.90) 0%,transparent 100%)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            {[
              { label: "CRITICAL", color: "#FF1133" },
              { label: "HIGH",     color: "#FF6600" },
              { label: "MEDIUM",   color: "#FFAA00" },
              { label: "ORIGIN",   color: "#ff2244" },
              { label: "TARGET",   color: "#2299ff" },
              { label: "BOTH",     color: "#aa55ff" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 5px ${l.color}` }} />
                <span className="text-[7px] font-mono tracking-widest" style={{ color: "rgba(140,160,220,0.5)" }}>{l.label}</span>
              </div>
            ))}
          </div>
          <span className="text-[7px] font-mono" style={{ color: "rgba(100,120,180,0.3)" }}>
            DRAG TO ROTATE · DATA: CISA KEV + GEOLOCATION · AUTO-STREAMING
          </span>
        </div>
      </div>
    </div>
  );
}
