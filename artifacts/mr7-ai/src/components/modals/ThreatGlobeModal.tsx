import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Zap, Shield, Activity, AlertTriangle } from "lucide-react";
import * as THREE from "three";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface ThreatGlobeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

type AttackEvent = {
  id: number;
  srcLat: number; srcLon: number;
  dstLat: number; dstLon: number;
  type: string; severity: Severity;
  src: string; dst: string;
  ts: string; color: string;
};

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: "#e21227",
  HIGH:     "#f97316",
  MEDIUM:   "#fbbf24",
  LOW:      "#10b981",
};

const ATTACK_TYPES = [
  "SQL Injection","RCE","Zero-Day Exploit","Ransomware","APT Campaign",
  "DDoS","Brute Force","Supply Chain","Phishing","Data Exfil",
  "Privilege Escalation","MITM","Memory Corruption","Firmware Attack","DNS Hijack",
];

const COUNTRIES = [
  { name:"USA",       lat:37.09,  lon:-95.71,  color:"#3b82f6", major:true  },
  { name:"Russia",    lat:61.52,  lon:105.31,  color:"#ef4444", major:true  },
  { name:"China",     lat:35.86,  lon:104.19,  color:"#f97316", major:true  },
  { name:"Germany",   lat:51.16,  lon:10.45,   color:"#fbbf24", major:false },
  { name:"Brazil",    lat:-14.23, lon:-51.92,  color:"#22c55e", major:false },
  { name:"India",     lat:20.59,  lon:78.96,   color:"#10b981", major:false },
  { name:"UK",        lat:55.37,  lon:-3.43,   color:"#8b5cf6", major:false },
  { name:"Japan",     lat:36.20,  lon:138.25,  color:"#ec4899", major:false },
  { name:"Australia", lat:-25.27, lon:133.77,  color:"#06b6d4", major:false },
  { name:"Iran",      lat:32.42,  lon:53.68,   color:"#ef4444", major:false },
  { name:"N.Korea",   lat:40.33,  lon:127.51,  color:"#ef4444", major:false },
  { name:"Ukraine",   lat:48.37,  lon:31.16,   color:"#60a5fa", major:false },
  { name:"France",    lat:46.22,  lon:2.21,    color:"#6366f1", major:false },
  { name:"Canada",    lat:56.13,  lon:-106.34, color:"#2dd4bf", major:false },
  { name:"Israel",    lat:31.04,  lon:34.85,   color:"#a78bfa", major:false },
  { name:"S.Korea",   lat:35.90,  lon:127.76,  color:"#34d399", major:false },
  { name:"Turkey",    lat:38.96,  lon:35.24,   color:"#fb923c", major:false },
  { name:"Netherlands",lat:52.13, lon:5.29,    color:"#818cf8", major:false },
];

/* ─── THREE.js helpers ───────────────────────────────────────────────────── */
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function makeGreatArc(
  src: THREE.Vector3, dst: THREE.Vector3,
  altitude = 0.35, segments = 128,
): THREE.Vector3[] {
  const mid = src.clone().add(dst).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(src.length() + altitude * src.distanceTo(dst) * 0.8);
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const t2 = t * t, t3 = t2 * t;
    const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt;
    return new THREE.Vector3(
      mt3 * src.x + 3 * mt2 * t * mid.x + 3 * mt * t2 * mid.x + t3 * dst.x,
      mt3 * src.y + 3 * mt2 * t * mid.y + 3 * mt * t2 * mid.y + t3 * dst.y,
      mt3 * src.z + 3 * mt2 * t * mid.z + 3 * mt * t2 * mid.z + t3 * dst.z,
    );
  });
}

function makeGlowSprite(color: string): THREE.Sprite {
  const size = 128;
  const cv   = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const c = size / 2, r = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, r);
  g.addColorStop(0,   color.replace(")", ",1)").replace("rgb(","rgba(").replace("#", "rgba(").replace("rgba(","rgba(") || `${color}ff`);
  g.addColorStop(0.3, color + "aa");
  g.addColorStop(1,   color + "00");
  // Simplified gradient using string color
  ctx.fillStyle = color;
  ctx.globalAlpha = 1.0;
  ctx.beginPath(); ctx.arc(c, c, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.arc(c, c, r * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.beginPath(); ctx.arc(c, c, r * 0.9, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  return new THREE.Sprite(mat);
}

/* ─── Active arc tracker ─────────────────────────────────────────────────── */
interface ActiveArc {
  fullPts: THREE.Vector3[];
  line: THREE.Line;
  head: THREE.Sprite;
  progress: number;
  speed: number;
  sevColor: string;
  globeRotY: number;
}

/* ─── Pulse ring pool ────────────────────────────────────────────────────── */
interface PulseRing {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  t: number;
  color: string;
}

/* ─── Globe builder ──────────────────────────────────────────────────────── */
function buildGlobe(scene: THREE.Scene) {
  /* Globe body */
  const globeGeo = new THREE.SphereGeometry(1, 256, 256);
  const globeMat = new THREE.MeshPhongMaterial({
    color:     new THREE.Color(0x061428),
    emissive:  new THREE.Color(0x020c1a),
    shininess: 80,
    specular:  new THREE.Color(0x1a4080),
  });
  const globe = new THREE.Mesh(globeGeo, globeMat);
  scene.add(globe);

  /* Inner glow layer */
  const innerGeo = new THREE.SphereGeometry(0.998, 64, 64);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x0a2040,
    transparent: true,
    opacity: 0.5,
    side: THREE.FrontSide,
  });
  scene.add(new THREE.Mesh(innerGeo, innerMat));

  /* Wireframe lat/lon grid */
  const gridGeo = new THREE.SphereGeometry(1.004, 36, 18);
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x0d4080,
    wireframe: true,
    transparent: true,
    opacity: 0.08,
  });
  scene.add(new THREE.Mesh(gridGeo, gridMat));

  /* Dense hex dot surface pattern */
  const dotGeo  = new THREE.SphereGeometry(1.0025, 72, 36);
  const dotMat  = new THREE.MeshBasicMaterial({ color: 0x0a3060, wireframe: true, transparent: true, opacity: 0.04 });
  scene.add(new THREE.Mesh(dotGeo, dotMat));

  /* Atmosphere — inner layer */
  const atm1Geo = new THREE.SphereGeometry(1.055, 64, 64);
  const atm1Mat = new THREE.MeshBasicMaterial({
    color: 0x1060e0,
    transparent: true,
    opacity: 0.025,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(atm1Geo, atm1Mat));

  /* Atmosphere — outer glow */
  const atm2Geo = new THREE.SphereGeometry(1.16, 64, 64);
  const atm2Mat = new THREE.MeshBasicMaterial({
    color: 0x0030a0,
    transparent: true,
    opacity: 0.015,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(atm2Geo, atm2Mat));

  /* Equatorial ring */
  const eqGeo = new THREE.TorusGeometry(1.22, 0.002, 8, 256);
  const eqMat = new THREE.MeshBasicMaterial({ color: 0xe21227, transparent: true, opacity: 0.55 });
  const eqRing = new THREE.Mesh(eqGeo, eqMat);
  eqRing.rotation.x = Math.PI / 2.2;
  scene.add(eqRing);

  /* Secondary tilt ring */
  const r2Geo = new THREE.TorusGeometry(1.19, 0.0012, 8, 256);
  const r2Mat = new THREE.MeshBasicMaterial({ color: 0x0060ff, transparent: true, opacity: 0.3 });
  const r2 = new THREE.Mesh(r2Geo, r2Mat);
  r2.rotation.x = Math.PI / 3.5;
  r2.rotation.z = Math.PI / 5;
  scene.add(r2);

  return { globe, eqRing, r2 };
}

function buildStarfield(scene: THREE.Scene, count = 6000): THREE.Points {
  const positions = new Float32Array(count * 3);
  const sizes     = new Float32Array(count);
  const colors    = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 30 + Math.random() * 70;
    const θ = Math.random() * Math.PI * 2;
    const φ = Math.acos(2 * Math.random() - 1);
    positions[i*3]   = r * Math.sin(φ) * Math.cos(θ);
    positions[i*3+1] = r * Math.sin(φ) * Math.sin(θ);
    positions[i*3+2] = r * Math.cos(φ);
    sizes[i] = 0.02 + Math.random() * 0.06;
    const hue = 0.55 + Math.random() * 0.15;
    const sat = 0.2 + Math.random() * 0.3;
    const c = new THREE.Color().setHSL(hue, sat, 0.7 + Math.random() * 0.3);
    colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size",     new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.04,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}

function addLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0x0a1a3e, 2.5));
  const sun = new THREE.DirectionalLight(0x2244ff, 2.2);
  sun.position.set(5, 4, 5);
  scene.add(sun);
  const redPt = new THREE.PointLight(0xe21227, 1.2, 12);
  redPt.position.set(-3, 1, 2);
  scene.add(redPt);
  const bluePt = new THREE.PointLight(0x0044ff, 0.8, 10);
  bluePt.position.set(2, -2, -3);
  scene.add(bluePt);
}

function addCountryMarkers(scene: THREE.Scene): THREE.Mesh[] {
  const markers: THREE.Mesh[] = [];
  COUNTRIES.forEach(c => {
    const v = latLonToVec3(c.lat, c.lon, 1.016);
    const r = c.major ? 0.016 : 0.010;
    const geo = new THREE.SphereGeometry(r, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(c.color),
      transparent: true,
      opacity: 0.9,
    });
    const dot = new THREE.Mesh(geo, mat);
    dot.position.copy(v);
    scene.add(dot);
    markers.push(dot);

    /* Glow ring around major countries */
    if (c.major) {
      const rGeo = new THREE.TorusGeometry(r * 3.5, r * 0.35, 6, 32);
      const rMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c.color), transparent: true, opacity: 0.4 });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.position.copy(v);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(ring);
    }
  });
  return markers;
}

/* ─── Main component ─────────────────────────────────────────────────────── */
let evId = 0;
function rndAttack(): AttackEvent {
  const sev  = (["CRITICAL","HIGH","HIGH","MEDIUM","MEDIUM","LOW"] as Severity[])[Math.floor(Math.random()*6)];
  const s    = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  let d      = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  while (d.name === s.name) d = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  return {
    id: evId++,
    srcLat: s.lat + (Math.random()-0.5)*6, srcLon: s.lon + (Math.random()-0.5)*6,
    dstLat: d.lat + (Math.random()-0.5)*6, dstLon: d.lon + (Math.random()-0.5)*6,
    type: ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)],
    severity: sev, src: s.name, dst: d.name,
    ts: new Date().toLocaleTimeString("en-US",{hour12:false}),
    color: SEV_COLOR[sev],
  };
}

export function ThreatGlobeModal({ open, onOpenChange }: ThreatGlobeModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const globeRef     = useRef<THREE.Mesh | null>(null);
  const eqRingRef    = useRef<THREE.Mesh | null>(null);
  const r2Ref        = useRef<THREE.Mesh | null>(null);
  const arcsRef      = useRef<ActiveArc[]>([]);
  const pulseRef     = useRef<PulseRing[]>([]);
  const frameRef     = useRef(0);
  const dragRef      = useRef({ active: false, x: 0, y: 0, velX: 0, velY: 0 });
  const autoRotRef   = useRef(true);
  const [events, setEvents] = useState<AttackEvent[]>([]);
  const [stats,  setStats]  = useState({ total: 0, critical: 0, high: 0, active: 0 });

  const addArc = useCallback((ev: AttackEvent) => {
    const sc = sceneRef.current;
    const gl = globeRef.current;
    if (!sc || !gl) return;

    const src3 = latLonToVec3(ev.srcLat, ev.srcLon, 1.01);
    const dst3 = latLonToVec3(ev.dstLat, ev.dstLon, 1.01);
    const pts  = makeGreatArc(src3, dst3, 0.4, 96);

    /* Main line — starts empty, grows during progress */
    const geo = new THREE.BufferGeometry().setFromPoints([pts[0]]);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(ev.color),
      transparent: true,
      opacity: 0.0,
      linewidth: 2,
    });
    (mat as THREE.LineBasicMaterial & { blending: THREE.Blending }).blending = THREE.AdditiveBlending;
    const line = new THREE.Line(geo, mat);
    line.rotation.copy(gl.rotation);
    sc.add(line);

    /* Travelling head sprite */
    const head = makeGlowSprite(ev.color);
    head.scale.setScalar(ev.severity === "CRITICAL" ? 0.14 : ev.severity === "HIGH" ? 0.11 : 0.085);
    head.position.copy(pts[0]);
    head.rotation.copy(gl.rotation);
    sc.add(head);

    arcsRef.current.push({
      fullPts: pts, line, head,
      progress: 0,
      speed: 0.007 + Math.random() * 0.010,
      sevColor: ev.color,
      globeRotY: gl.rotation.y,
    });

    /* Pulse ring at source */
    const pGeo = new THREE.RingGeometry(0.01, 0.025, 32);
    const pMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(ev.color),
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const pulse = new THREE.Mesh(pGeo, pMat);
    const sv = latLonToVec3(ev.srcLat, ev.srcLon, 1.015);
    pulse.position.copy(sv);
    pulse.lookAt(new THREE.Vector3(0, 0, 0));
    pulse.rotation.copy(gl.rotation);
    sc.add(pulse);
    pulseRef.current.push({ mesh: pulse, pos: sv, t: 0, color: ev.color });
  }, []);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const W = containerRef.current.clientWidth  || 700;
    const H = containerRef.current.clientHeight || 500;

    /* Renderer — maximum quality */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      precision: "highp",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * 2, 4));
    renderer.toneMapping    = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled  = false;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* Scene */
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    /* Camera */
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 500);
    camera.position.set(0, 0, 3.0);
    cameraRef.current = camera;

    /* Build world */
    const { globe, eqRing, r2 } = buildGlobe(scene);
    globeRef.current  = globe;
    eqRingRef.current = eqRing;
    r2Ref.current     = r2;
    buildStarfield(scene);
    addLights(scene);
    addCountryMarkers(scene);

    /* Resize observer */
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const nW = containerRef.current.clientWidth;
      const nH = containerRef.current.clientHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    /* ── Drag ── */
    const el = renderer.domElement;
    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = { active: true, x: e.clientX, y: e.clientY, velX: 0, velY: 0 };
      autoRotRef.current = false;
    };
    const onMouseUp = () => {
      dragRef.current.active = false;
      setTimeout(() => { autoRotRef.current = true; }, 2200);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active || !globe) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current.velX = dx;
      dragRef.current.velY = dy;
      globe.rotation.y += dx * 0.004;
      globe.rotation.x += dy * 0.003;
      globe.rotation.x  = Math.max(-1.2, Math.min(1.2, globe.rotation.x));
      dragRef.current.x = e.clientX;
      dragRef.current.y = e.clientY;
    };
    /* Touch */
    let lastTouch = { x: 0, y: 0 };
    const onTouchStart = (e: TouchEvent) => {
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      autoRotRef.current = false;
    };
    const onTouchEnd   = () => setTimeout(() => { autoRotRef.current = true; }, 2200);
    const onTouchMove  = (e: TouchEvent) => {
      if (!globe) return;
      const dx = e.touches[0].clientX - lastTouch.x;
      const dy = e.touches[0].clientY - lastTouch.y;
      globe.rotation.y += dx * 0.004;
      globe.rotation.x += dy * 0.003;
      globe.rotation.x  = Math.max(-1.2, Math.min(1.2, globe.rotation.x));
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    el.addEventListener("mousedown",  onMouseDown);
    window.addEventListener("mouseup",    onMouseUp);
    window.addEventListener("mousemove",  onMouseMove);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend",   onTouchEnd);
    el.addEventListener("touchmove",  onTouchMove,  { passive: true });

    /* ── Render loop ── */
    let last = 0;
    const animate = (now: number) => {
      frameRef.current = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      /* Auto rotate */
      if (autoRotRef.current && globe) {
        globe.rotation.y += 0.0012;
      }
      /* Inertia after drag */
      if (!dragRef.current.active) {
        dragRef.current.velX *= 0.94;
        dragRef.current.velY *= 0.94;
        if (Math.abs(dragRef.current.velX) > 0.05 && globe) globe.rotation.y += dragRef.current.velX * 0.0012;
      }
      if (eqRing) eqRing.rotation.z += 0.0014;
      if (r2)     r2.rotation.y     += 0.0008;

      const globeRotY = globe?.rotation.y ?? 0;

      /* Update arcs */
      arcsRef.current = arcsRef.current.filter(arc => {
        arc.progress = Math.min(1, arc.progress + arc.speed);
        const total  = arc.fullPts.length;
        const show   = Math.max(2, Math.floor(arc.progress * total));

        /* Sync arc rotation to globe */
        const rotDelta = globeRotY - arc.globeRotY;
        arc.globeRotY  = globeRotY;

        /* Rebuild geometry with visible subset */
        const visiblePts = arc.fullPts.slice(0, show).map(p => {
          const q = p.clone().applyEuler(new THREE.Euler(0, rotDelta, 0));
          return q;
        });
        if (visiblePts.length >= 2) {
          arc.line.geometry.dispose();
          arc.line.geometry = new THREE.BufferGeometry().setFromPoints(visiblePts);
        }

        /* Move head */
        const headPt = arc.fullPts[show - 1].clone().applyEuler(new THREE.Euler(0, globeRotY - (arc.globeRotY - rotDelta), 0));
        arc.head.position.copy(headPt);

        /* Fade opacity */
        const fade = arc.progress < 0.15 ? arc.progress / 0.15 :
                     arc.progress > 0.85 ? (1 - arc.progress) / 0.15 : 1;
        (arc.line.material as THREE.LineBasicMaterial).opacity = 0.88 * fade;

        if (arc.progress >= 1) {
          sceneRef.current?.remove(arc.line);
          sceneRef.current?.remove(arc.head);
          arc.line.geometry.dispose();
          return false;
        }
        return true;
      });

      /* Update pulse rings */
      pulseRef.current = pulseRef.current.filter(pr => {
        pr.t += dt * 1.6;
        const scale = 1 + pr.t * 6;
        pr.mesh.scale.setScalar(scale);
        (pr.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 * (1 - pr.t));
        if (pr.t >= 1) { sceneRef.current?.remove(pr.mesh); return false; }
        return true;
      });

      renderer.render(scene, camera);
    };
    frameRef.current = requestAnimationFrame(animate);

    /* ── Spawn attacks ── */
    const spawnAttack = () => {
      const ev = rndAttack();
      setEvents(prev => [ev, ...prev].slice(0, 16));
      setStats(prev => ({
        total:    prev.total + 1,
        critical: prev.critical + (ev.severity === "CRITICAL" ? 1 : 0),
        high:     prev.high    + (ev.severity === "HIGH"     ? 1 : 0),
        active:   arcsRef.current.length + 1,
      }));
      addArc(ev);
    };

    /* Seed 8 initial events */
    for (let i = 0; i < 8; i++) setTimeout(spawnAttack, i * 350);
    const iv1 = setInterval(spawnAttack, 700);
    const iv2 = setInterval(() => {
      setStats(p => ({ ...p, active: arcsRef.current.length }));
    }, 400);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(iv1);
      clearInterval(iv2);
      ro.disconnect();
      el.removeEventListener("mousedown",  onMouseDown);
      window.removeEventListener("mouseup",    onMouseUp);
      window.removeEventListener("mousemove",  onMouseMove);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend",   onTouchEnd);
      el.removeEventListener("touchmove",  onTouchMove);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      arcsRef.current = [];
      pulseRef.current = [];
      rendererRef.current = null;
    };
  }, [open, addArc]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative flex flex-col overflow-hidden rounded-2xl"
            style={{
              width: "min(1340px, 96vw)",
              height: "min(860px, 90vh)",
              background: "linear-gradient(145deg,#020810 0%,#050f1e 45%,#020810 100%)",
              border: "1px solid rgba(226,18,39,0.22)",
              boxShadow: "0 0 120px rgba(226,18,39,0.1), 0 0 60px rgba(0,40,120,0.12), 0 40px 100px rgba(0,0,0,0.9)",
            }}
          >
            {/* Top scan line */}
            <motion.div
              className="absolute top-0 inset-x-0 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg,transparent,#e21227,transparent)", zIndex: 10 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ background: "rgba(226,18,39,0.04)", borderBottom: "1px solid rgba(226,18,39,0.1)" }}>
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)" }}>
                  <Globe className="w-4 h-4" style={{ color: "#e21227" }} />
                </motion.div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.35em] font-mono" style={{ color: "#e21227" }}>
                    THREAT GLOBE — LIVE INTELLIGENCE
                  </div>
                  <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                    REAL-TIME CYBER ATTACK VISUALIZATION · 3D INTERACTIVE · DRAG TO ROTATE
                  </div>
                </div>
                <motion.div
                  className="flex items-center gap-1.5 ml-4 px-2 py-1 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}
                  animate={{ opacity: [0.7, 1] }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  <span className="text-[8px] font-black font-mono" style={{ color: "#10b981" }}>LIVE</span>
                </motion.div>
              </div>

              <div className="flex items-center gap-5">
                {[
                  { label:"TOTAL",    val:stats.total,    color:"#00e5ff" },
                  { label:"CRITICAL", val:stats.critical, color:"#e21227" },
                  { label:"HIGH",     val:stats.high,     color:"#f97316" },
                  { label:"ARCS",     val:stats.active,   color:"#fbbf24" },
                ].map(s => (
                  <motion.div key={s.label} className="text-center"
                    animate={{ scale: s.label === "CRITICAL" && stats.critical > 0 ? [1, 1.12, 1] : 1 }}
                    transition={{ duration: 0.4 }}>
                    <div className="text-xl font-mono font-black tabular-nums" style={{ color: s.color }}>
                      {s.val}
                    </div>
                    <div className="text-[7px] font-mono tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.18)" }}>
                      {s.label}
                    </div>
                  </motion.div>
                ))}
                <button onClick={() => onOpenChange(false)}
                  className="p-2 rounded-xl transition-all hover:scale-105"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">

              {/* Globe canvas */}
              <div ref={containerRef} className="flex-1 relative" style={{ cursor: "grab" }}>
                {/* Severity legend */}
                <div className="absolute bottom-5 left-5 space-y-1.5 pointer-events-none z-10">
                  <div className="text-[8px] font-black tracking-widest font-mono mb-2"
                    style={{ color: "rgba(255,255,255,0.25)" }}>SEVERITY</div>
                  {(Object.entries(SEV_COLOR) as [Severity, string][]).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <div className="w-5 h-0.5 rounded-full" style={{ background: v, boxShadow: `0 0 4px ${v}` }} />
                      <span className="text-[8px] font-mono font-black" style={{ color: v }}>{k}</span>
                    </div>
                  ))}
                </div>
                {/* Corner HUD */}
                <div className="absolute top-4 left-4 pointer-events-none z-10 space-y-0.5">
                  <div className="text-[7px] font-mono" style={{ color: "rgba(226,18,39,0.35)" }}>THREAT-GLOBE v3.0</div>
                  <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>INTERACTIVE · 3D · REAL-TIME</div>
                </div>
                <div className="absolute top-4 right-4 pointer-events-none z-10">
                  <div className="text-[7px] font-mono text-right" style={{ color: "rgba(255,255,255,0.15)" }}>
                    {COUNTRIES.length} NODES ACTIVE
                  </div>
                </div>
              </div>

              {/* Right panel — event feed */}
              <div className="w-[270px] flex flex-col shrink-0"
                style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,10,20,0.6)" }}>
                <div className="px-3.5 py-2.5 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
                    <span className="text-[10px] font-black font-mono tracking-widest" style={{ color: "#e21227" }}>
                      LIVE ATTACKS
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5"
                  style={{ scrollbarWidth: "none" }}>
                  <AnimatePresence initial={false}>
                    {events.map(ev => (
                      <motion.div
                        key={ev.id}
                        initial={{ x: 24, opacity: 0, scale: 0.96 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.18 }}
                        className="rounded-xl p-2.5"
                        style={{
                          background: `${ev.color}09`,
                          border: `1px solid ${ev.color}22`,
                          boxShadow: ev.severity === "CRITICAL" ? `0 0 12px ${ev.color}18` : "none",
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded"
                            style={{ background: `${ev.color}25`, color: ev.color, border: `1px solid ${ev.color}40` }}>
                            {ev.severity}
                          </span>
                          <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                            {ev.ts}
                          </span>
                        </div>
                        <div className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.82)" }}>
                          {ev.type}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[8px] font-mono font-bold" style={{ color: ev.color }}>
                            {ev.src}
                          </span>
                          <span className="text-[8px]" style={{ color: ev.color }}>→</span>
                          <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {ev.dst}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Bottom legend */}
                <div className="p-3 shrink-0 space-y-1.5"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {[
                    { icon: Zap,           label:"Attack arcs: real-time simulation", c:"#e21227" },
                    { icon: Shield,        label:"Globe: drag / touch to rotate",      c:"#00e5ff" },
                    { icon: AlertTriangle, label:"18 country nodes · 15 attack types", c:"#fbbf24" },
                  ].map(i => (
                    <div key={i.label} className="flex items-center gap-2">
                      <i.icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: i.c }} />
                      <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>
                        {i.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
