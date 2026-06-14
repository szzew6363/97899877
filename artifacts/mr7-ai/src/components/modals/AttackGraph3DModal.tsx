import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import {
  X, Play, Trash2, Target, Zap, Shield, Network,
  Activity, Database, Eye, AlertTriangle,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type NodeType = "attacker" | "target" | "port" | "service" | "cve" | "exploit" | "persist";

interface GNode {
  id: number;
  type: NodeType;
  label: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  force: THREE.Vector3;
  mesh: THREE.Mesh;
  halo: THREE.Sprite;
  mat: THREE.MeshPhongMaterial;
  haloMat: THREE.SpriteMaterial;
  geo: THREE.SphereGeometry;
  fixed?: boolean;
}

interface GEdge {
  a: number; b: number;
  line: THREE.Line;
  lineGeo: THREE.BufferGeometry;
  lineMat: THREE.LineBasicMaterial;
}

const CFG: Record<NodeType, { color: string; hex: number; size: number; emissive: number; icon: string }> = {
  attacker: { color: "#e21227", hex: 0xe21227, size: 0.22, emissive: 0.7, icon: "ATK" },
  target:   { color: "#f97316", hex: 0xf97316, size: 0.16, emissive: 0.45, icon: "TGT" },
  port:     { color: "#3b82f6", hex: 0x3b82f6, size: 0.09, emissive: 0.35, icon: "PRT" },
  service:  { color: "#10b981", hex: 0x10b981, size: 0.10, emissive: 0.30, icon: "SVC" },
  cve:      { color: "#ff2233", hex: 0xff2233, size: 0.09, emissive: 0.75, icon: "CVE" },
  exploit:  { color: "#dc2626", hex: 0xdc2626, size: 0.13, emissive: 0.60, icon: "EXP" },
  persist:  { color: "#8b5cf6", hex: 0x8b5cf6, size: 0.10, emissive: 0.45, icon: "PST" },
};

const REPULSION = 5.5;
const SPRING_K  = 0.055;
const SPRING_RL = 2.3;
const GRAVITY   = 0.038;
const DAMPING   = 0.80;

function makeGlowTex(color: string): THREE.Texture {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const cx = cv.getContext("2d")!;
  const hex = parseInt(color.slice(1), 16);
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  const gd = cx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  gd.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gd.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
  gd.addColorStop(0.6, `rgba(${r},${g},${b},0.15)`);
  gd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  cx.fillStyle = gd; cx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}

export function AttackGraph3DModal({ open, onOpenChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef  = useRef<THREE.Scene | null>(null);
  const nodesRef  = useRef<GNode[]>([]);
  const edgesRef  = useRef<GEdge[]>([]);
  const nodeIdRef = useRef(0);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const isDragRef = useRef(false);
  const camRef    = useRef({ theta: 0, phi: 0.25, dist: 9 });
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const simTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [target, setTarget] = useState("192.168.1.100");
  const [simulating, setSimulating] = useState(false);
  const [nodes, setNodes] = useState(0);
  const [edges, setEdges] = useState(0);
  const [selected, setSelected] = useState<{ type: NodeType; label: string } | null>(null);

  // ── Core add helpers ─────────────────────────────────────────────────────

  const addNodeInternal = useCallback((type: NodeType, label: string, connectToId: number | null, fixed = false) => {
    const scene = sceneRef.current;
    if (!scene) return -1;
    const cfg = CFG[type];
    const id = nodeIdRef.current++;

    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 3.5,
      (Math.random() - 0.5) * 2.5,
    );
    if (fixed) pos.set(0, 0, 0);

    // Sphere
    const geo = new THREE.SphereGeometry(cfg.size, 18, 18);
    const mat = new THREE.MeshPhongMaterial({
      color: cfg.hex, emissive: cfg.hex,
      emissiveIntensity: cfg.emissive,
      shininess: 50, transparent: true, opacity: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);

    // Halo
    const haloMat = new THREE.SpriteMaterial({ map: makeGlowTex(cfg.color), transparent: true, opacity: 0 });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(cfg.size * 7);
    halo.position.copy(pos);
    scene.add(halo);

    const node: GNode = {
      id, type, label, pos,
      vel: new THREE.Vector3(),
      force: new THREE.Vector3(),
      mesh, halo, mat, haloMat, geo, fixed,
    };
    nodesRef.current.push(node);

    // Fade-in
    let fi = 0;
    const fadeIn = setInterval(() => {
      fi += 0.06;
      mat.opacity = Math.min(1, fi);
      haloMat.opacity = Math.min(0.6, fi * 0.6);
      if (fi >= 1) clearInterval(fadeIn);
    }, 16);

    // Edge
    if (connectToId !== null) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.Float32BufferAttribute([0,0,0,0,0,0], 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0 });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      edgesRef.current.push({ a: id, b: connectToId, line, lineGeo, lineMat });
      // Fade edge
      let ef = 0;
      const fadeEdge = setInterval(() => {
        ef += 0.04;
        lineMat.opacity = Math.min(0.55, ef * 0.55);
        if (ef >= 1) clearInterval(fadeEdge);
      }, 16);
      setEdges(edgesRef.current.length);
      void fadeEdge;
    }

    setNodes(nodesRef.current.length);
    return id;
  }, []);

  // ── Clear ────────────────────────────────────────────────────────────────

  const clearGraph = useCallback(() => {
    simTimers.current.forEach(t => clearTimeout(t));
    simTimers.current = [];
    const scene = sceneRef.current;
    if (scene) {
      nodesRef.current.forEach(n => {
        scene.remove(n.mesh); scene.remove(n.halo);
        n.geo.dispose(); n.mat.dispose();
        n.haloMat.map?.dispose(); n.haloMat.dispose();
      });
      edgesRef.current.forEach(e => {
        scene.remove(e.line);
        e.lineGeo.dispose(); e.lineMat.dispose();
      });
    }
    nodesRef.current = [];
    edgesRef.current = [];
    nodeIdRef.current = 0;
    setNodes(0); setEdges(0);
    setSelected(null); setSimulating(false);
  }, []);

  // ── Simulate ─────────────────────────────────────────────────────────────

  const simulate = useCallback(() => {
    if (simulating) return;
    clearGraph();
    setSimulating(true);

    const seq: { delay: number; type: NodeType; label: string; to: number | null; fixed?: boolean }[] = [
      { delay: 0,    type: "attacker", label: "KaliGPT Attacker",        to: null, fixed: true },
      { delay: 900,  type: "target",   label: target,                     to: 0 },
      { delay: 1600, type: "port",     label: "22/tcp SSH",               to: 1 },
      { delay: 1900, type: "port",     label: "80/tcp HTTP",              to: 1 },
      { delay: 2200, type: "port",     label: "443/tcp HTTPS",            to: 1 },
      { delay: 2500, type: "port",     label: "3306/tcp MySQL",           to: 1 },
      { delay: 3100, type: "service",  label: "Apache httpd 2.4.41",      to: 3 },
      { delay: 3700, type: "cve",      label: "CVE-2021-41773 (9.8)",     to: 6 },
      { delay: 4300, type: "service",  label: "MySQL 5.7.32",             to: 5 },
      { delay: 4900, type: "cve",      label: "CVE-2021-4034 Privesc",    to: 8 },
      { delay: 5600, type: "exploit",  label: "Path Traversal → RCE",     to: 0 },
      { delay: 6200, type: "persist",  label: "Reverse Shell /bin/bash",  to: 1 },
      { delay: 6900, type: "persist",  label: "Cron Backdoor",            to: 1 },
      { delay: 7600, type: "persist",  label: "SSH Key Injection",        to: 2 },
    ];

    seq.forEach(({ delay, type, label, to, fixed }) => {
      const t = setTimeout(() => {
        addNodeInternal(type, label, to ?? null, fixed);
      }, delay);
      simTimers.current.push(t);
    });

    const doneT = setTimeout(() => setSimulating(false), 8500);
    simTimers.current.push(doneT);
  }, [simulating, clearGraph, addNodeInternal, target]);

  // ── THREE.js scene setup ─────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth || 800;
    const H = canvas.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.06));
    const rLight = new THREE.PointLight(0xe21227, 3, 15);
    rLight.position.set(3, 3, 4);
    scene.add(rLight);
    const bLight = new THREE.PointLight(0x3b82f6, 2, 12);
    bLight.position.set(-3, -2, 2);
    scene.add(bLight);
    const gLight = new THREE.PointLight(0x10b981, 1.5, 10);
    gLight.position.set(0, 4, -3);
    scene.add(gLight);

    // Background particles
    const pN = 350;
    const pPos = new Float32Array(pN * 3);
    for (let i = 0; i < pN; i++) {
      pPos[i*3]   = (Math.random() - 0.5) * 24;
      pPos[i*3+1] = (Math.random() - 0.5) * 16;
      pPos[i*3+2] = (Math.random() - 0.5) * 20;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x334155, size: 0.025, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(pGeo, pMat));

    // Grid plane
    const gridHelper = new THREE.GridHelper(14, 18, 0x1a2030, 0x0f1520);
    gridHelper.position.y = -2.5;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.4;
    scene.add(gridHelper);

    // Axis glow rings at origin
    const makeRing = (r: number, c: number, rotX = 0, rotZ = 0) => {
      const rg = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.005, 4, 80),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.18 })
      );
      rg.rotation.x = rotX; rg.rotation.z = rotZ;
      scene.add(rg);
      return rg;
    };
    const ring1 = makeRing(1.5, 0xe21227, Math.PI / 2);
    const ring2 = makeRing(1.8, 0x3b82f6, 0, Math.PI / 4);
    const ring3 = makeRing(2.1, 0x8b5cf6, Math.PI / 3, Math.PI / 6);

    // Camera orbit controls
    const onMouseDown = (e: MouseEvent) => {
      isDragRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      camRef.current.theta += dx * 0.008;
      camRef.current.phi = Math.max(-0.45, Math.min(0.55, camRef.current.phi + dy * 0.006));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragRef.current = false; };
    const onWheel = (e: WheelEvent) => {
      camRef.current.dist = Math.max(4, Math.min(16, camRef.current.dist + e.deltaY * 0.01));
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragRef.current = true;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMouseRef.current.x;
      const dy = e.touches[0].clientY - lastMouseRef.current.y;
      camRef.current.theta += dx * 0.01;
      camRef.current.phi = Math.max(-0.45, Math.min(0.55, camRef.current.phi + dy * 0.008));
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onMouseUp);

    // Resize
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      cam.aspect = w / h; cam.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    ro.observe(canvas);

    // Animation loop
    const tmp = new THREE.Vector3();
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      tRef.current += 0.014;
      const t = tRef.current;

      // Auto-rotate when not dragging
      if (!isDragRef.current) camRef.current.theta += 0.004;

      // Camera position
      const { theta, phi, dist } = camRef.current;
      cam.position.set(
        dist * Math.cos(phi) * Math.sin(theta),
        dist * Math.sin(phi) + 0.5,
        dist * Math.cos(phi) * Math.cos(theta),
      );
      cam.lookAt(0, 0, 0);

      // Origin rings animation
      ring1.rotation.y += 0.008;
      ring2.rotation.x += 0.004;
      ring3.rotation.z += 0.006;

      const ns = nodesRef.current;
      const es = edgesRef.current;
      const nodeMap = new Map(ns.map(n => [n.id, n]));

      // Physics
      ns.forEach(n => n.force.set(0, 0, 0));

      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          tmp.copy(ns[i].pos).sub(ns[j].pos);
          const dist2 = Math.max(tmp.length(), 0.4);
          const f = REPULSION / (dist2 * dist2);
          const dir = tmp.clone().normalize().multiplyScalar(f);
          ns[i].force.add(dir);
          ns[j].force.sub(dir);
        }
      }

      es.forEach(e => {
        const a = nodeMap.get(e.a);
        const b = nodeMap.get(e.b);
        if (!a || !b) return;
        tmp.copy(b.pos).sub(a.pos);
        const d = Math.max(tmp.length(), 0.1);
        const stretch = d - SPRING_RL;
        const f = SPRING_K * stretch;
        const dir = tmp.normalize().multiplyScalar(f);
        if (!a.fixed) a.force.add(dir);
        if (!b.fixed) b.force.sub(dir);
      });

      ns.forEach(n => {
        if (n.fixed) return;
        n.force.add(n.pos.clone().multiplyScalar(-GRAVITY));
        n.vel.add(n.force.clone().multiplyScalar(0.016));
        n.vel.multiplyScalar(DAMPING);
        n.pos.add(n.vel.clone().multiplyScalar(0.016));
        n.pos.x = Math.max(-7, Math.min(7, n.pos.x));
        n.pos.y = Math.max(-4, Math.min(4, n.pos.y));
        n.pos.z = Math.max(-4, Math.min(4, n.pos.z));
      });

      // Update mesh positions
      ns.forEach(n => {
        n.mesh.position.copy(n.pos);
        n.halo.position.copy(n.pos);
        const cfg = CFG[n.type];
        // Pulse emissive for CVE/exploit
        if (n.type === "cve" || n.type === "exploit") {
          n.mat.emissiveIntensity = cfg.emissive * (0.6 + 0.5 * Math.abs(Math.sin(t * 3.5 + n.id)));
        }
        // Halo pulse
        const hScale = cfg.size * (6 + 2 * Math.abs(Math.sin(t * 1.5 + n.id)));
        n.halo.scale.setScalar(hScale);
      });

      // Update edges
      es.forEach(e => {
        const a = nodeMap.get(e.a);
        const b = nodeMap.get(e.b);
        if (!a || !b) return;
        const pos = e.lineGeo.attributes.position.array as Float32Array;
        pos[0] = a.pos.x; pos[1] = a.pos.y; pos[2] = a.pos.z;
        pos[3] = b.pos.x; pos[4] = b.pos.y; pos[5] = b.pos.z;
        e.lineGeo.attributes.position.needsUpdate = true;
        // Animate edge color/opacity
        const pulse = 0.3 + 0.35 * Math.abs(Math.sin(t * 1.8 + e.a));
        e.lineMat.opacity = Math.min(e.lineMat.opacity, pulse);
        // Color edges by type
        const bNode = nodeMap.get(e.b);
        if (bNode) {
          const c = CFG[bNode.type].hex;
          e.lineMat.color.setHex(c);
        }
      });

      renderer.render(scene, cam);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onMouseUp);
      ro.disconnect();
      pGeo.dispose(); pMat.dispose();
      renderer.dispose();
      sceneRef.current = null;
    };
  }, [open]);

  // Clean up on close
  useEffect(() => { if (!open) clearGraph(); }, [open, clearGraph]);

  if (!open) return null;

  const LEGEND: { type: NodeType; icon: React.ReactNode }[] = [
    { type: "attacker", icon: <Zap className="w-3 h-3" /> },
    { type: "target",   icon: <Target className="w-3 h-3" /> },
    { type: "port",     icon: <Network className="w-3 h-3" /> },
    { type: "service",  icon: <Activity className="w-3 h-3" /> },
    { type: "cve",      icon: <AlertTriangle className="w-3 h-3" /> },
    { type: "exploit",  icon: <Zap className="w-3 h-3" /> },
    { type: "persist",  icon: <Database className="w-3 h-3" /> },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[75] flex items-center justify-center p-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(18px)" }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        <motion.div
          className="relative w-full flex flex-col rounded-2xl overflow-hidden"
          initial={{ scale: 0.88, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.88, y: 50 }}
          transition={{ type: "spring", damping: 20, stiffness: 260 }}
          style={{
            maxWidth: "1100px", maxHeight: "90vh",
            background: "linear-gradient(145deg, #030306 0%, #060608 60%, #080305 100%)",
            border: "1px solid rgba(226,18,39,0.2)",
            boxShadow: "0 0 100px rgba(226,18,39,0.08), 0 0 200px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.015]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(226,18,39,0.9) 2px,rgba(226,18,39,0.9) 3px)" }} />

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="relative z-10 flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
            style={{ borderColor: "rgba(226,18,39,0.15)", background: "rgba(0,0,0,0.6)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
              <Eye className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-black text-white tracking-widest">ATTACK GRAPH — 3D TOPOLOGY VISUALIZER</div>
              <div className="text-[9px] font-mono" style={{ color: "rgba(16,185,129,0.7)" }}>
                FORCE-DIRECTED NETWORK · LIVE PHYSICS SIMULATION · DRAG TO ROTATE
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 mr-2">
              <div className="text-center">
                <div className="text-[14px] font-black" style={{ color: "#e21227" }}>{nodes}</div>
                <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>NODES</div>
              </div>
              <div className="text-center">
                <div className="text-[14px] font-black" style={{ color: "#3b82f6" }}>{edges}</div>
                <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>EDGES</div>
              </div>
            </div>

            <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* ── Controls row ───────────────────────────────────────────── */}
          <div className="relative z-10 flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.4)" }}>
            <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f97316" }} />
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              className="flex-1 bg-transparent text-[11px] font-mono outline-none"
              style={{ color: "#f97316" }}
              placeholder="Target IP / Domain"
              spellCheck={false}
            />
            <button
              onClick={simulate}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
              style={{
                background: simulating ? "rgba(226,18,39,0.1)" : "rgba(226,18,39,0.2)",
                border: "1px solid rgba(226,18,39,0.45)", color: "#e21227",
              }}
            >
              {simulating ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Activity className="w-3 h-3" />
                </motion.div>
              ) : (
                <Play className="w-3 h-3" />
              )}
              {simulating ? "SIMULATING..." : "SIMULATE ATTACK"}
            </button>
            <button
              onClick={clearGraph}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
            >
              <Trash2 className="w-3 h-3" />
              CLEAR
            </button>
          </div>

          {/* ── Main: Canvas + Legend ───────────────────────────────────── */}
          <div className="relative z-10 flex flex-1 min-h-0">
            {/* THREE.js canvas */}
            <canvas
              ref={canvasRef}
              className="flex-1 min-w-0 min-h-0 cursor-grab active:cursor-grabbing"
              style={{ display: "block", touchAction: "none" }}
            />

            {/* Legend sidebar */}
            <div className="flex-shrink-0 border-l flex flex-col"
              style={{ width: "168px", borderColor: "rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.5)" }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
                  دليل العقد
                </div>
              </div>

              {LEGEND.map(({ type, icon }) => {
                const cfg = CFG[type];
                return (
                  <div key={type} className="flex items-center gap-2 px-3 py-2 border-b"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}55` }}>
                      <div style={{ color: cfg.color }}>{icon}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.icon}</div>
                      <div className="text-[7.5px]" style={{ color: "rgba(255,255,255,0.3)" }}>{type}</div>
                    </div>
                    <div className="ml-auto">
                      <div className="text-[11px] font-black" style={{ color: cfg.color }}>
                        {nodesRef.current.filter(n => n.type === type).length}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Selected node info */}
              {selected && (
                <div className="p-3 mt-2 mx-2 rounded-lg" style={{ background: `${CFG[selected.type].color}12`, border: `1px solid ${CFG[selected.type].color}33` }}>
                  <div className="text-[8px] font-bold mb-1" style={{ color: CFG[selected.type].color }}>
                    {selected.type.toUpperCase()}
                  </div>
                  <div className="text-[8px]" style={{ color: "rgba(255,255,255,0.6)" }}>{selected.label}</div>
                </div>
              )}

              {/* Attack sequence status */}
              {simulating && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.2 }}
                  className="p-3 mt-auto border-t"
                  style={{ borderColor: "rgba(226,18,39,0.15)" }}>
                  <div className="text-[8px] font-mono font-bold" style={{ color: "#e21227" }}>
                    ATTACK IN PROGRESS
                  </div>
                  <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Building topology...
                  </div>
                </motion.div>
              )}

              {!simulating && nodes > 0 && (
                <div className="p-3 mt-auto border-t" style={{ borderColor: "rgba(16,185,129,0.15)" }}>
                  <div className="text-[8px] font-mono font-bold" style={{ color: "#10b981" }}>
                    SIMULATION COMPLETE
                  </div>
                  <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {nodes} nodes · {edges} connections
                  </div>
                </div>
              )}

              {nodes === 0 && (
                <div className="p-3 mt-auto text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                  <Shield className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <div className="text-[8px] font-mono">Press SIMULATE<br/>to start</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Status bar ─────────────────────────────────────────────── */}
          <div className="relative z-10 flex items-center gap-3 px-4 py-1.5 border-t flex-shrink-0"
            style={{ borderColor: "rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.7)" }}>
            <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ background: simulating ? "#e21227" : nodes > 0 ? "#10b981" : "#334155" }}
            />
            <span className="text-[8px] font-mono" style={{ color: simulating ? "#e21227" : nodes > 0 ? "#10b981" : "#334155" }}>
              {simulating ? "BUILDING ATTACK TOPOLOGY..." : nodes > 0 ? "GRAPH STABLE — DRAG TO EXPLORE" : "READY — ENTER TARGET AND SIMULATE"}
            </span>
            <div className="flex-1" />
            <span className="text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
              FORCE-DIRECTED · THREE.js · REAL-TIME PHYSICS
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
