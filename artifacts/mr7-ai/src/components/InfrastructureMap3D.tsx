import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

// ── DB Schema Node Definitions ────────────────────────────────────────────────
const DB_NODES = [
  { id: "users",            label: "USERS",            color: "#00ff88", size: 1.8, desc: "Identity, auth, devices, preferences",  relations: ["subscriptions","conversations","agent_runs","api_usage","security_events","notifications","teams","api_keys","webhooks"] },
  { id: "subscriptions",    label: "SUBSCRIPTIONS",    color: "#00e5ff", size: 1.4, desc: "Full billing history, tier, Stripe",     relations: [] },
  { id: "conversations",    label: "CONVERSATIONS",    color: "#7c3aed", size: 1.4, desc: "Model, mode, token stats, sharing",      relations: ["messages"] },
  { id: "messages",         label: "MESSAGES",         color: "#8b5cf6", size: 1.2, desc: "Role, tokens, cost, tool calls, rating", relations: [] },
  { id: "agent_runs",       label: "AGENT RUNS",       color: "#f97316", size: 1.4, desc: "Type, status, steps, timing, cost",      relations: [] },
  { id: "api_usage",        label: "API USAGE",        color: "#eab308", size: 1.2, desc: "Endpoint, provider, billing, latency",   relations: [] },
  { id: "security_events",  label: "SECURITY EVENTS",  color: "#ef4444", size: 1.2, desc: "Login, anomaly, severity, resolution",   relations: [] },
  { id: "notifications",    label: "NOTIFICATIONS",    color: "#06b6d4", size: 1.0, desc: "Type, priority, channels, delivery",     relations: [] },
  { id: "teams",            label: "TEAMS",            color: "#10b981", size: 1.4, desc: "Members, roles, projects, settings",     relations: ["projects"] },
  { id: "projects",         label: "PROJECTS",         color: "#34d399", size: 1.0, desc: "Visibility, status, team linking",       relations: [] },
  { id: "modules",          label: "MODULES",          color: "#a78bfa", size: 1.2, desc: "Marketplace, tier gating, ratings",      relations: [] },
  { id: "knowledge_bases",  label: "KNOWLEDGE BASE",   color: "#38bdf8", size: 1.2, desc: "Embeddings, pgvector, documents",        relations: ["documents"] },
  { id: "documents",        label: "DOCUMENTS",        color: "#7dd3fc", size: 1.0, desc: "Chunks, source type, processing",        relations: [] },
  { id: "reports",          label: "REPORTS",          color: "#fb923c", size: 1.2, desc: "Findings, risk, PDF/HTML, sharing",      relations: [] },
  { id: "api_keys",         label: "API KEYS",         color: "#fbbf24", size: 1.0, desc: "Scopes, rate limits, HMAC hashing",      relations: [] },
  { id: "webhooks",         label: "WEBHOOKS",         color: "#c084fc", size: 1.0, desc: "Events, retries, delivery log",          relations: [] },
];

const INFRA_NODES = [
  { id: "postgres",  label: "PostgreSQL + pgvector", color: "#3b82f6", icon: "🐘" },
  { id: "redis",     label: "Redis Cache",           color: "#ef4444", icon: "⚡" },
  { id: "api",       label: "API Server (Node)",     color: "#10b981", icon: "🔌" },
  { id: "frontend",  label: "Frontend (React)",      color: "#8b5cf6", icon: "⚛" },
  { id: "pentest",   label: "Pentest Lab (FastAPI)", color: "#f97316", icon: "🔬" },
  { id: "nginx",     label: "Nginx Proxy",           color: "#06b6d4", icon: "🔀" },
  { id: "backup",    label: "Daily Backups",         color: "#fbbf24", icon: "💾" },
  { id: "smtp",      label: "SMTP / MailHog",        color: "#a78bfa", icon: "✉" },
];

function positionOnSphere(index: number, total: number, radius: number): THREE.Vector3 {
  const phi = Math.acos(-1 + (2 * index) / total);
  const theta = Math.sqrt(total * Math.PI) * phi;
  return new THREE.Vector3(
    radius * Math.cos(theta) * Math.sin(phi),
    radius * Math.sin(theta) * Math.sin(phi),
    radius * Math.cos(phi),
  );
}

type NodeObj = {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  pulseRing: THREE.Mesh;
  data: typeof DB_NODES[0];
  pos: THREE.Vector3;
  baseY: number;
  floatOffset: number;
};

type ConnectionObj = {
  line: THREE.Line;
  from: string;
  to: string;
  particles: THREE.Points;
  particlePositions: Float32Array;
  particleProgress: Float32Array;
};

export function InfrastructureMap3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(true);
  const rotYRef = useRef(0);
  const rotXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const nodeObjsRef = useRef<NodeObj[]>([]);
  const connectionObjsRef = useRef<ConnectionObj[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const clockRef = useRef(new THREE.Clock());

  const [selectedNode, setSelectedNode] = useState<typeof DB_NODES[0] | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"schema" | "infra">("schema");
  const [stats, setStats] = useState({ tables: 16, migrations: 3, indexes: 68, triggers: 11 });
  const [showLegend, setShowLegend] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const buildScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000814, 0.025);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    camera.position.set(0, 2, 18);
    cameraRef.current = camera;

    // Ambient + Point lights
    scene.add(new THREE.AmbientLight(0x0a0f1e, 0.4));
    const pointLight1 = new THREE.PointLight(0x00ff88, 2, 40);
    pointLight1.position.set(0, 10, 0);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x00e5ff, 1.5, 40);
    pointLight2.position.set(-10, -5, 5);
    scene.add(pointLight2);
    const pointLight3 = new THREE.PointLight(0xf97316, 1, 30);
    pointLight3.position.set(10, -5, -5);
    scene.add(pointLight3);

    // Grid floor
    const gridHelper = new THREE.GridHelper(40, 40, 0x00ff8822, 0x00ff8811);
    gridHelper.position.y = -8;
    scene.add(gridHelper);

    // Starfield
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 200;
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    // Central core sphere
    const coreGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 2,
      wireframe: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Rotating rings
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(1.5 + i * 0.3, 0.008, 8, 100);
      const ringMat = new THREE.MeshBasicMaterial({ color: [0x00ff88, 0x00e5ff, 0xf97316][i], transparent: true, opacity: 0.4 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + i * 0.4;
      ring.userData = { rotSpeed: 0.008 + i * 0.003, rotAxis: i };
      scene.add(ring);
    }

    // DB Node spheres
    const nodeObjs: NodeObj[] = [];
    DB_NODES.forEach((node, i) => {
      const pos = positionOnSphere(i, DB_NODES.length, 7);

      // Main sphere
      const geo = new THREE.SphereGeometry(node.size * 0.28, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(node.color),
        emissive: new THREE.Color(node.color),
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.userData = { nodeId: node.id, nodeData: node };
      scene.add(mesh);

      // Glow sphere
      const glowGeo = new THREE.SphereGeometry(node.size * 0.38, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.copy(pos);
      scene.add(glowMesh);

      // Pulse ring
      const pulseGeo = new THREE.TorusGeometry(node.size * 0.38, 0.02, 8, 32);
      const pulseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color), transparent: true, opacity: 0.5 });
      const pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
      pulseRing.position.copy(pos);
      pulseRing.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(pulseRing);

      nodeObjs.push({ mesh, glowMesh, pulseRing, data: node, pos: pos.clone(), baseY: pos.y, floatOffset: Math.random() * Math.PI * 2 });
    });
    nodeObjsRef.current = nodeObjs;

    // Connections (relations)
    const connectionObjs: ConnectionObj[] = [];
    DB_NODES.forEach((node, i) => {
      node.relations.forEach((relId) => {
        const targetIdx = DB_NODES.findIndex((n) => n.id === relId);
        if (targetIdx === -1) return;
        const fromPos = nodeObjs[i].pos;
        const toPos = nodeObjs[targetIdx].pos;

        // Curved line through center
        const midPoint = new THREE.Vector3()
          .addVectors(fromPos, toPos)
          .multiplyScalar(0.5)
          .multiplyScalar(0.6);

        const curve = new THREE.QuadraticBezierCurve3(fromPos, midPoint, toPos);
        const points = curve.getPoints(60);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

        const fromColor = new THREE.Color(node.color);
        const toColor = new THREE.Color(DB_NODES[targetIdx].color);
        const colors = new Float32Array(points.length * 3);
        points.forEach((_, pi) => {
          const t = pi / (points.length - 1);
          const c = fromColor.clone().lerp(toColor, t);
          colors[pi * 3] = c.r;
          colors[pi * 3 + 1] = c.g;
          colors[pi * 3 + 2] = c.b;
        });
        lineGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, linewidth: 1 });
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);

        // Data flow particles
        const PARTICLE_COUNT = 5;
        const particleGeo = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
        const particleProgress = new Float32Array(PARTICLE_COUNT);
        for (let pi = 0; pi < PARTICLE_COUNT; pi++) particleProgress[pi] = pi / PARTICLE_COUNT;
        particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

        const particleMat = new THREE.PointsMaterial({ color: new THREE.Color(node.color), size: 0.12, transparent: true, opacity: 0.9, sizeAttenuation: true });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        connectionObjs.push({ line, from: node.id, to: relId, particles, particlePositions, particleProgress });
      });
    });
    connectionObjsRef.current = connectionObjs;

    // Floating labels (canvas textures)
    nodeObjs.forEach((obj) => {
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 256; labelCanvas.height = 64;
      const ctx2d = labelCanvas.getContext("2d")!;
      ctx2d.clearRect(0, 0, 256, 64);
      const c = new THREE.Color(obj.data.color);
      ctx2d.fillStyle = `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},0.12)`;
      ctx2d.fillRect(0, 16, 256, 32);
      ctx2d.font = "bold 20px 'Courier New', monospace";
      ctx2d.fillStyle = obj.data.color;
      ctx2d.textAlign = "center";
      ctx2d.fillText(obj.data.label, 128, 38);

      const tex = new THREE.CanvasTexture(labelCanvas);
      const labelGeo = new THREE.PlaneGeometry(2.2, 0.55);
      const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.copy(obj.pos);
      label.position.y += obj.data.size * 0.28 + 0.45;
      label.userData = { isLabel: true };
      scene.add(label);
      obj.mesh.userData.label = label;
    });

  }, []);

  // Animate loop
  const animate = useCallback(() => {
    frameRef.current = requestAnimationFrame(animate);
    const t = clockRef.current.getElapsedTime();
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) return;

    // Auto-rotate camera
    if (autoRotateRef.current && !isDraggingRef.current) {
      rotYRef.current += 0.003;
    }

    camera.position.x = Math.sin(rotYRef.current) * Math.cos(rotXRef.current) * 18;
    camera.position.y = Math.sin(rotXRef.current) * 18 + 2;
    camera.position.z = Math.cos(rotYRef.current) * Math.cos(rotXRef.current) * 18;
    camera.lookAt(0, 0, 0);

    // Animate nodes
    nodeObjsRef.current.forEach((obj) => {
      const floatY = Math.sin(t * 0.8 + obj.floatOffset) * 0.15;
      obj.mesh.position.y = obj.baseY + floatY;
      obj.glowMesh.position.y = obj.baseY + floatY;
      obj.pulseRing.position.y = obj.baseY + floatY;

      // Rotate nodes
      obj.mesh.rotation.y += 0.012;
      obj.mesh.rotation.x += 0.005;

      // Pulse ring scale
      const pScale = 1 + Math.sin(t * 2 + obj.floatOffset) * 0.15;
      obj.pulseRing.scale.set(pScale, pScale, 1);
      (obj.pulseRing.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 2 + obj.floatOffset) * 0.2;

      // Billboard labels
      if (obj.mesh.userData.label) {
        obj.mesh.userData.label.position.y = obj.mesh.position.y + obj.data.size * 0.28 + 0.45;
        obj.mesh.userData.label.lookAt(camera.position);
      }

      // Hover glow boost
      if (hoveredNode === obj.data.id) {
        (obj.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8;
        (obj.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.35;
      } else {
        (obj.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
        (obj.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.12;
      }
    });

    // Animate rings
    scene.children.forEach((child) => {
      if (child.userData.rotSpeed !== undefined) {
        const axis = child.userData.rotAxis;
        if (axis === 0) child.rotation.z += child.userData.rotSpeed;
        else if (axis === 1) child.rotation.y += child.userData.rotSpeed;
        else child.rotation.x += child.userData.rotSpeed;
      }
    });

    // Animate data-flow particles
    connectionObjsRef.current.forEach((conn) => {
      const fromNode = nodeObjsRef.current.find((n) => n.data.id === conn.from);
      const toNode = nodeObjsRef.current.find((n) => n.data.id === conn.to);
      if (!fromNode || !toNode) return;

      const fromPos = fromNode.mesh.position;
      const toPos = toNode.mesh.position;
      const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5).multiplyScalar(0.6);
      const curve = new THREE.QuadraticBezierCurve3(fromPos, midPoint, toPos);

      const speed = 0.004;
      for (let pi = 0; pi < conn.particleProgress.length; pi++) {
        conn.particleProgress[pi] = (conn.particleProgress[pi] + speed) % 1;
        const pt = curve.getPoint(conn.particleProgress[pi]);
        conn.particlePositions[pi * 3] = pt.x;
        conn.particlePositions[pi * 3 + 1] = pt.y;
        conn.particlePositions[pi * 3 + 2] = pt.z;
      }
      conn.particles.geometry.attributes.position.needsUpdate = true;
    });

    // Core pulse
    const core = scene.children.find((c) => c.userData.isCore);
    if (core) {
      (core as THREE.Mesh).rotation.y += 0.01;
      (core as THREE.Mesh).rotation.x += 0.007;
    }

    renderer.render(scene, camera);
  }, [hoveredNode]);

  // Mouse hover detection
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      rotYRef.current += dx * 0.005;
      rotXRef.current -= dy * 0.005;
      rotXRef.current = Math.max(-1.2, Math.min(1.2, rotXRef.current));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }

    const raycaster = raycasterRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;
    raycaster.setFromCamera(new THREE.Vector2(mouseRef.current.x, mouseRef.current.y), camera);
    const meshes = nodeObjsRef.current.map((n) => n.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      setHoveredNode(hit.userData.nodeId || null);
      if (canvas) canvas.style.cursor = "pointer";
    } else {
      setHoveredNode(null);
      if (canvas) canvas.style.cursor = "grab";
    }
  }, []);

  const handleClick = useCallback(() => {
    if (hoveredNode) {
      const node = DB_NODES.find((n) => n.id === hoveredNode);
      setSelectedNode((prev) => (prev?.id === hoveredNode ? null : (node ?? null)));
    } else {
      setSelectedNode(null);
    }
  }, [hoveredNode]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    isDraggingRef.current = true;
    autoRotateRef.current = false;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setTimeout(() => { autoRotateRef.current = true; }, 3000);
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !camera || !renderer) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }, []);

  useEffect(() => {
    buildScene();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("click", handleClick);
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.style.cursor = "grab";
    }
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frameRef.current);
      rendererRef.current?.dispose();
      canvas?.removeEventListener("mousemove", handleMouseMove);
      canvas?.removeEventListener("click", handleClick);
      canvas?.removeEventListener("mousedown", handleMouseDown);
      canvas?.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleResize);
    };
  }, [buildScene, handleMouseMove, handleClick, handleMouseDown, handleMouseUp, handleResize]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-screen bg-[#000814] overflow-hidden select-none font-mono">

      {/* ── Background gradient ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000814] via-[#000d24] to-[#000814] pointer-events-none" />
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(ellipse 80% 50% at 50% 50%, #00ff8815, transparent)" }} />

      {/* ── 3D Canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: "none" }}
      />

      {/* ── Top HUD bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[#00ff88] text-xs tracking-[0.3em] uppercase font-bold">
            mr7.ai — Infrastructure Map
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(["schema", "infra"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-[10px] tracking-widest uppercase rounded border transition-all duration-200 ${
                activeTab === tab
                  ? "border-[#00ff88] bg-[#00ff8818] text-[#00ff88]"
                  : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/60"
              }`}
            >
              {tab === "schema" ? "DB Schema" : "Infrastructure"}
            </button>
          ))}
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="ml-2 px-3 py-1.5 text-[10px] tracking-widest uppercase rounded border border-white/10 text-white/40 hover:border-white/30 hover:text-white/60 transition-all"
          >
            {showLegend ? "Hide" : "Legend"}
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-4 py-2 rounded-full border border-[#00ff8822] bg-black/40 backdrop-blur-sm"
      >
        {[
          { label: "Tables", value: stats.tables, color: "#00ff88" },
          { label: "Migrations", value: stats.migrations, color: "#00e5ff" },
          { label: "Indexes", value: stats.indexes, color: "#f97316" },
          { label: "Triggers", value: stats.triggers, color: "#a78bfa" },
        ].map((s, i) => (
          <span key={s.label} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/10 mx-1">|</span>}
            <span style={{ color: s.color }} className="text-sm font-bold tabular-nums">{s.value}</span>
            <span className="text-white/30 text-[10px] uppercase tracking-widest">{s.label}</span>
          </span>
        ))}
      </motion.div>

      {/* ── Node info panel ── */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            key={selectedNode.id}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-1/2 right-6 -translate-y-1/2 z-30 w-72 rounded-2xl border backdrop-blur-xl p-5"
            style={{
              borderColor: selectedNode.color + "44",
              background: `linear-gradient(135deg, ${selectedNode.color}10, #000814cc)`,
              boxShadow: `0 0 40px ${selectedNode.color}22`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: selectedNode.color, boxShadow: `0 0 10px ${selectedNode.color}` }} />
                <span className="text-white text-sm font-bold tracking-wide">{selectedNode.label}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-white/30 hover:text-white text-lg leading-none">&times;</button>
            </div>
            <p className="text-white/50 text-xs mb-4">{selectedNode.desc}</p>
            {selectedNode.relations.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: selectedNode.color }}>Relations →</div>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.relations.map((r) => {
                    const rel = DB_NODES.find((n) => n.id === r);
                    return (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded text-[10px] border cursor-pointer hover:opacity-100 opacity-70 transition-opacity"
                        style={{ borderColor: rel?.color + "44", color: rel?.color, background: rel?.color + "11" }}
                        onClick={() => { const n = DB_NODES.find((x) => x.id === r); if (n) setSelectedNode(n); }}
                      >
                        {r.toUpperCase()}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend panel ── */}
      <AnimatePresence>
        {showLegend && activeTab === "schema" && (
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-44 rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 space-y-1.5"
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-3">Tables</div>
            {DB_NODES.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedNode((prev) => (prev?.id === node.id ? null : node))}
                className="w-full flex items-center gap-2 group"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0 transition-all group-hover:scale-125"
                  style={{ background: node.color, boxShadow: `0 0 6px ${node.color}` }} />
                <span className={`text-[10px] truncate transition-colors ${selectedNode?.id === node.id ? "text-white" : "text-white/40 group-hover:text-white/70"}`}>
                  {node.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}

        {showLegend && activeTab === "infra" && (
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-52 rounded-xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 space-y-2"
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-3">Services</div>
            {INFRA_NODES.map((node) => (
              <div key={node.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded flex items-center justify-center text-xs"
                  style={{ background: node.color + "22", border: `1px solid ${node.color}44` }}>
                  {node.icon}
                </div>
                <div>
                  <div className="text-white/70 text-[10px]">{node.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hover tooltip ── */}
      <AnimatePresence>
        {hoveredNode && !selectedNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg border backdrop-blur-xl text-xs text-center"
            style={{
              borderColor: DB_NODES.find((n) => n.id === hoveredNode)?.color + "44",
              background: "rgba(0,8,20,0.9)",
              color: DB_NODES.find((n) => n.id === hoveredNode)?.color,
            }}
          >
            <div className="font-bold tracking-widest">
              {DB_NODES.find((n) => n.id === hoveredNode)?.label}
            </div>
            <div className="text-white/40 text-[10px] mt-0.5">
              {DB_NODES.find((n) => n.id === hoveredNode)?.desc}
            </div>
            <div className="text-white/20 text-[9px] mt-1">Click to inspect</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom controls ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <div className="text-white/20 text-[10px] tracking-widest uppercase">
          Drag to rotate · Click node to inspect
        </div>
        <div className="w-1 h-1 rounded-full bg-white/20" />
        <button
          onClick={() => { autoRotateRef.current = true; rotYRef.current = 0; rotXRef.current = 0; }}
          className="text-white/20 hover:text-white/50 text-[10px] tracking-widest uppercase transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* ── Scanlines overlay ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.5) 2px, rgba(0,255,136,0.5) 3px)" }} />

      {/* ── Corner decorations ── */}
      {[
        "top-4 left-4 border-t border-l",
        "top-4 right-4 border-t border-r",
        "bottom-4 left-4 border-b border-l",
        "bottom-4 right-4 border-b border-r",
      ].map((cls, i) => (
        <div key={i} className={`absolute ${cls} w-8 h-8 border-[#00ff88]/30 pointer-events-none`} />
      ))}
    </div>
  );
}
