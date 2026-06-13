import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Shield, Eye, Code2, Network, Lock, AlertTriangle, Activity, Globe } from "lucide-react";
import { LiveAttackGlobe3D } from "./LiveAttackGlobe3D";

/* ═══════════════════════════════════════════════════════════════════════
   CYBER COMMAND CENTER 3D
   Full-screen Three.js cybersecurity command center.
   6 orbital security domain rings + Neural Core + holographic panels.
   Pure Three.js — no @react-three/fiber dependency needed.
═══════════════════════════════════════════════════════════════════════ */

interface CyberCommandCenter3DProps {
  open: boolean;
  onClose: () => void;
  onOpenModal: (id: string) => void;
}

const DOMAINS = [
  {
    id: 0, label: "OFFENSIVE", sub: "Red Team",
    color: "#FF2020", emissive: "#cc0000", speed: 0.008,
    tilt: Math.PI * 0.15, radius: 2.2,
    modules: [
      { id: "exploitChain", label: "ExploitChain" },
      { id: "jitExploit",   label: "JIT Exploit" },
      { id: "webFuzzing",   label: "Web Fuzzing" },
      { id: "binaryAnalysis",label: "Binary Analysis" },
      { id: "precisionStrike",label: "Precision Strike" },
      { id: "evasionEngine", label: "Evasion Engine" },
      { id: "shellGenerator",label: "Shell Generator" },
      { id: "passwordAttack",label: "Password Attack" },
    ],
  },
  {
    id: 1, label: "DEFENSIVE", sub: "Blue Team",
    color: "#0080FF", emissive: "#003388", speed: 0.005,
    tilt: -Math.PI * 0.2, radius: 2.8,
    modules: [
      { id: "defensiveAI",         label: "Defensive AI" },
      { id: "securityKanban",      label: "Security Kanban" },
      { id: "networkMonitor",      label: "Network Monitor" },
      { id: "basSimulation",       label: "BAS Simulation" },
      { id: "multiAgentSOC",       label: "Multi-Agent SOC" },
      { id: "orchestrationEngine", label: "Orchestration" },
    ],
  },
  {
    id: 2, label: "INTELLIGENCE", sub: "Purple Team",
    color: "#8B00FF", emissive: "#5500aa", speed: 0.006,
    tilt: Math.PI * 0.3, radius: 3.4,
    modules: [
      { id: "threatGlobe",          label: "Threat Globe" },
      { id: "liveCVE",              label: "Live CVE" },
      { id: "threatIntel",          label: "Threat Intel" },
      { id: "deepSearch",           label: "Dark Web Search" },
      { id: "chainInvestigation",   label: "Chain Investigate" },
      { id: "osintDash",            label: "OSINT Dashboard" },
      { id: "osintScanner",         label: "OSINT Scanner" },
    ],
  },
  {
    id: 3, label: "REVERSE ENG", sub: "Analysis",
    color: "#FF6600", emissive: "#882200", speed: 0.007,
    tilt: -Math.PI * 0.1, radius: 4.0,
    modules: [
      { id: "binaryAnalysis",   label: "Binary Analysis" },
      { id: "vulnGraph3D",      label: "Vuln Graph 3D" },
      { id: "vulnTopology",     label: "Vuln Topology" },
      { id: "autonomousRedTeam",label: "Auto Red Team" },
      { id: "exploitSandbox",   label: "Exploit Sandbox" },
      { id: "cyberVision",      label: "Cyber Vision" },
    ],
  },
  {
    id: 4, label: "NETWORK", sub: "Infrastructure",
    color: "#00FF88", emissive: "#006633", speed: 0.004,
    tilt: Math.PI * 0.25, radius: 4.7,
    modules: [
      { id: "networkTopo",       label: "Network Topo" },
      { id: "networkMonitor",    label: "Net Monitor" },
      { id: "globalVulnHeatmap", label: "Global Vuln Map" },
      { id: "net3D",             label: "Network 3D" },
    ],
  },
  {
    id: 5, label: "CRYPTO", sub: "Blockchain",
    color: "#FFFFFF", emissive: "#666666", speed: 0.003,
    tilt: -Math.PI * 0.35, radius: 5.4,
    modules: [
      { id: "blockchainAudit",    label: "Blockchain Audit" },
      { id: "e2eSession",         label: "E2E Session" },
      { id: "warRoom",            label: "War Room" },
      { id: "cyberWarfareMatrix", label: "Warfare Matrix" },
      { id: "sentientCyberSphere",label: "Sentient Sphere" },
      { id: "redTeamDash",        label: "Red Team Dash" },
    ],
  },
] as const;

const THREAT_LEVEL = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const THREAT_COLORS = { LOW: "#00FF88", MEDIUM: "#FFD700", HIGH: "#FF6600", CRITICAL: "#FF2020" };

const DOMAIN_ICONS = [Zap, Shield, Eye, Code2, Network, Lock];

export function CyberCommandCenter3D({ open, onClose, onOpenModal }: CyberCommandCenter3DProps) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef      = useRef<number>(0);
  const ringsRef    = useRef<THREE.Group[]>([]);
  const coreRef     = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const timeRef     = useRef(0);
  const mouseRef    = useRef({ x: 0, y: 0 });
  const isDragging  = useRef(false);
  const lastMouse   = useRef({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'hub' | 'attackmap'>('hub');
  const rotGroup    = useRef<THREE.Group | null>(null);

  const [hoveredDomain, setHoveredDomain] = useState<number | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null);
  const [threatLevel, setThreatLevel] = useState<typeof THREAT_LEVEL[number]>("MEDIUM");
  const [liveCounter, setLiveCounter] = useState(0);
  const [activeDefenses, setActiveDefenses] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<string[]>([]);
  const [systemHealth, setSystemHealth] = useState(0);

  // Simulate live data
  useEffect(() => {
    if (!open) return;
    const levels: typeof THREAT_LEVEL[number][] = ["LOW","MEDIUM","HIGH","CRITICAL"];
    const alerts = [
      "CVE-2024-1234 detected on subnet 192.168.1.0/24",
      "Brute-force attempt blocked — 47 IPs blacklisted",
      "Anomalous beacon traffic flagged on port 4444",
      "Lateral movement detected: WORKSTATION-07 → DC-01",
      "SQL injection attempt blocked — WAF rule 9812",
      "DNS exfiltration pattern identified in traffic",
      "Privilege escalation attempt — user: svc_backup",
      "Zero-day signature match: Cobalt Strike C2 traffic",
    ];
    const tid = setInterval(() => {
      setLiveCounter(c => c + Math.floor(Math.random() * 3));
      setActiveDefenses(Math.floor(80 + Math.random() * 18));
      setSystemHealth(Math.floor(88 + Math.random() * 10));
      if (Math.random() > 0.6) {
        setRecentAlerts(prev => [alerts[Math.floor(Math.random() * alerts.length)], ...prev.slice(0, 4)]);
      }
      if (Math.random() > 0.85) {
        setThreatLevel(levels[Math.floor(Math.random() * levels.length)]);
      }
    }, 2200);
    return () => clearInterval(tid);
  }, [open]);

  // Three.js scene
  useEffect(() => {
    if (!open || !mountRef.current) return;
    const mount = mountRef.current;
    const W = mount.clientWidth, H = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);
    scene.fog = new THREE.FogExp2(0x000510, 0.04);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    camera.position.set(0, 2, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Root rotation group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rotGroup.current = rootGroup;

    // Hex grid floor
    const gridGeo = new THREE.PlaneGeometry(40, 40, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x001a4a, wireframe: true, transparent: true, opacity: 0.12 });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -4;
    scene.add(grid);

    // Ambient + point lights
    scene.add(new THREE.AmbientLight(0x111133, 0.5));
    const ptLight = new THREE.PointLight(0xff2020, 2, 20);
    ptLight.position.set(0, 2, 0);
    scene.add(ptLight);

    // Neural Core — glowing central sphere
    const coreGeo = new THREE.SphereGeometry(0.9, 64, 64);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0xff2020, emissive: 0xcc0000, emissiveIntensity: 1.2,
      transparent: true, opacity: 0.92,
      shininess: 120,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(core);
    coreRef.current = core;

    // Core wireframe overlay
    const coreWire = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true, transparent: true, opacity: 0.3 })
    );
    rootGroup.add(coreWire);

    // Core pulsing rings
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(1.1 + i * 0.25, 1.15 + i * 0.25, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2020, side: THREE.DoubleSide, transparent: true, opacity: 0.4 - i * 0.1 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.userData.pulseRing = true;
      ring.userData.pulseOffset = i * 0.5;
      rootGroup.add(ring);
    }

    // 6 orbital domain rings
    const ringGroups: THREE.Group[] = [];
    DOMAINS.forEach((domain, di) => {
      const group = new THREE.Group();
      group.rotation.x = domain.tilt;
      group.userData.domainId = di;

      // Orbit path
      const torusGeo = new THREE.TorusGeometry(domain.radius, 0.015, 8, 128);
      const torusMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(domain.color), transparent: true, opacity: 0.6 });
      group.add(new THREE.Mesh(torusGeo, torusMat));

      // Glow ring (slightly larger)
      const glowGeo = new THREE.TorusGeometry(domain.radius, 0.04, 8, 128);
      const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(domain.color), transparent: true, opacity: 0.12 });
      group.add(new THREE.Mesh(glowGeo, glowMat));

      // Module nodes along the ring
      domain.modules.forEach((mod, mi) => {
        const angle = (mi / domain.modules.length) * Math.PI * 2;
        const nx = Math.cos(angle) * domain.radius;
        const ny = Math.sin(angle) * domain.radius;
        const nodeGeo = new THREE.SphereGeometry(0.08, 12, 12);
        const nodeMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(domain.color), emissive: new THREE.Color(domain.emissive), emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(nx, ny, 0);
        node.userData.moduleId = mod.id;
        node.userData.moduleLabel = mod.label;
        node.userData.domainId = di;
        group.add(node);
      });

      // Particle trail
      const ptCount = 60;
      const ptPositions = new Float32Array(ptCount * 3);
      for (let i = 0; i < ptCount; i++) {
        const angle = (i / ptCount) * Math.PI * 2;
        ptPositions[i * 3]     = Math.cos(angle) * domain.radius;
        ptPositions[i * 3 + 1] = Math.sin(angle) * domain.radius;
        ptPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
      }
      const ptGeo = new THREE.BufferGeometry();
      ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPositions, 3));
      const ptMat = new THREE.PointsMaterial({ color: new THREE.Color(domain.color), size: 0.04, transparent: true, opacity: 0.5 });
      group.add(new THREE.Points(ptGeo, ptMat));

      rootGroup.add(group);
      ringGroups.push(group);
    });
    ringsRef.current = ringGroups;

    // Background particles (star field)
    const starCount = 800;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x8888ff, size: 0.06, transparent: true, opacity: 0.4 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    particlesRef.current = stars;

    // Data beam connections between core and rings
    for (let di = 0; di < 6; di++) {
      const domain = DOMAINS[di];
      const angle = (di / 6) * Math.PI * 2;
      const ex = Math.cos(angle) * domain.radius * 0.7;
      const ey = Math.sin(angle) * domain.radius * 0.3;
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(ex, ey, 0)];
      const beamGeo = new THREE.BufferGeometry().setFromPoints(points);
      const beamMat = new THREE.LineBasicMaterial({ color: new THREE.Color(domain.color), transparent: true, opacity: 0.15 });
      rootGroup.add(new THREE.Line(beamGeo, beamMat));
    }

    // Animation loop
    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;
      const t = timeRef.current;

      // Rotate rings
      ringsRef.current.forEach((g, i) => {
        g.rotation.z += DOMAINS[i].speed;
      });

      // Pulse core
      if (coreRef.current) {
        const pulse = 1 + 0.08 * Math.sin(t * 2.5);
        coreRef.current.scale.setScalar(pulse);
        (coreRef.current.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.9 + 0.5 * Math.sin(t * 2.5);
      }

      // Pulse rings
      rootGroup.children.forEach(child => {
        if (child.userData.pulseRing) {
          const offset = child.userData.pulseOffset || 0;
          (child as THREE.Mesh).scale.setScalar(1 + 0.15 * Math.sin(t * 1.5 + offset));
          ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.2 * Math.sin(t * 1.5 + offset);
        }
      });

      // Slowly rotate whole group based on mouse
      if (rotGroup.current) {
        rotGroup.current.rotation.y += 0.0008;
        rotGroup.current.rotation.y += (mouseRef.current.x * 0.3 - rotGroup.current.rotation.y) * 0.02;
        rotGroup.current.rotation.x += (mouseRef.current.y * 0.15 - rotGroup.current.rotation.x) * 0.02;
      }

      // Twinkle stars
      if (particlesRef.current) {
        (particlesRef.current.material as THREE.PointsMaterial).opacity = 0.3 + 0.1 * Math.sin(t * 0.7);
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function onResize() {
      const W2 = mount.clientWidth, H2 = mount.clientHeight;
      camera.aspect = W2 / H2; camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    }
    window.addEventListener('resize', onResize);

    // Mouse move
    function onMouseMove(e: MouseEvent) {
      const rect = mount.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
      if (isDragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        if (rotGroup.current) {
          rotGroup.current.rotation.y += dx * 0.005;
          rotGroup.current.rotation.x += dy * 0.005;
        }
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    }
    function onMouseDown(e: MouseEvent) { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }
    function onMouseUp() { isDragging.current = false; }
    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      sceneRef.current = null; rendererRef.current = null; cameraRef.current = null;
    };
  }, [open]);

  const handleDomainClick = useCallback((di: number) => {
    setSelectedDomain(prev => prev === di ? null : di);
  }, []);

  const handleModuleClick = useCallback((moduleId: string) => {
    onOpenModal(moduleId);
  }, [onOpenModal]);

  if (!open) return null;

  const tc = THREAT_COLORS[threatLevel];
  const selectedData = selectedDomain !== null ? DOMAINS[selectedDomain] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[200] flex flex-col"
        style={{ background: "#000510", fontFamily: "'Courier New', monospace" }}
      >
        {/* Three.js canvas mount — hidden when on attack map tab */}
        <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{ display: activeTab === 'hub' ? 'block' : 'none' }} />

        {/* Attack Globe — shown when on attack map tab */}
        {activeTab === 'attackmap' && (
          <div className="absolute inset-0" style={{ top: 56 }}>
            <LiveAttackGlobe3D />
          </div>
        )}

        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)", display: activeTab === 'hub' ? 'block' : 'none' }} />

        {/* Header */}
        <div className="relative z-20 flex items-center justify-between px-6 py-3"
          style={{ borderBottom: "1px solid rgba(255,32,32,0.25)", background: "rgba(0,5,16,0.90)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: tc, boxShadow: `0 0 8px ${tc}` }} />
            <span className="text-xs font-bold tracking-[0.3em] text-white/90">CYBER COMMAND CENTER</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold tracking-widest" style={{ background: `${tc}22`, color: tc, border: `1px solid ${tc}44` }}>
              {threatLevel}
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(0,5,16,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setActiveTab('hub')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest transition-all"
              style={{
                background: activeTab === 'hub' ? `${tc}22` : "transparent",
                color: activeTab === 'hub' ? tc : "rgba(255,255,255,0.35)",
                border: activeTab === 'hub' ? `1px solid ${tc}44` : "1px solid transparent",
              }}>
              <Activity className="w-3 h-3" />
              COMMAND CENTER
            </button>
            <button
              onClick={() => setActiveTab('attackmap')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest transition-all"
              style={{
                background: activeTab === 'attackmap' ? "rgba(255,17,51,0.15)" : "transparent",
                color: activeTab === 'attackmap' ? "#FF1133" : "rgba(255,255,255,0.35)",
                border: activeTab === 'attackmap' ? "1px solid rgba(255,17,51,0.35)" : "1px solid transparent",
              }}>
              <Globe className="w-3 h-3" />
              LIVE ATTACK MAP
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] text-white/30 tracking-widest hidden lg:block">
              {activeTab === 'hub' ? "DRAG TO ROTATE · CLICK RING TO EXPAND" : "DRAG TO ROTATE GLOBE · CISA KEV LIVE"}
            </span>
            <button onClick={onClose}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ff2020"; e.currentTarget.style.borderColor = "#ff202055"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Domain ring buttons — floating left (hub tab only) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2" style={{ display: activeTab === 'hub' ? 'flex' : 'none' }}>
          {DOMAINS.map((domain, di) => {
            const Icon = DOMAIN_ICONS[di];
            const isHov = hoveredDomain === di;
            const isSel = selectedDomain === di;
            return (
              <motion.button key={di}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                onClick={() => handleDomainClick(di)}
                onMouseEnter={() => setHoveredDomain(di)}
                onMouseLeave={() => setHoveredDomain(null)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left"
                style={{
                  background: (isHov || isSel) ? `${domain.color}18` : "rgba(0,5,16,0.7)",
                  border: `1px solid ${(isHov || isSel) ? domain.color + "88" : "rgba(255,255,255,0.08)"}`,
                  backdropFilter: "blur(8px)",
                  boxShadow: (isHov || isSel) ? `0 0 14px ${domain.color}44` : "none",
                  minWidth: 140,
                }}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: domain.color }} />
                <div>
                  <div className="text-[10px] font-bold tracking-widest" style={{ color: domain.color }}>{domain.label}</div>
                  <div className="text-[9px] text-white/40">{domain.sub}</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Expanded module panel (hub tab only) */}
        <AnimatePresence>
          {selectedData && activeTab === 'hub' && (
            <motion.div
              key={selectedDomain}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-xl p-4"
              style={{
                background: "rgba(0,5,16,0.92)", backdropFilter: "blur(16px)",
                border: `1px solid ${selectedData.color}44`,
                boxShadow: `0 0 30px ${selectedData.color}22`,
                minWidth: 200, maxWidth: 230,
              }}>
              <div className="text-[10px] font-bold tracking-[0.3em] mb-3" style={{ color: selectedData.color }}>
                {selectedData.label} MODULES
              </div>
              <div className="flex flex-col gap-1.5">
                {selectedData.modules.map(mod => (
                  <motion.button key={mod.id}
                    whileHover={{ scale: 1.03, x: 4 }} whileTap={{ scale: 0.97 }}
                    onClick={() => handleModuleClick(mod.id)}
                    className="text-left text-[11px] px-3 py-1.5 rounded-lg transition-all font-mono"
                    style={{
                      background: `${selectedData.color}12`,
                      border: `1px solid ${selectedData.color}33`,
                      color: "rgba(255,255,255,0.8)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${selectedData.color}28`; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${selectedData.color}12`; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}>
                    <span style={{ color: selectedData.color, marginRight: 6 }}>▸</span>{mod.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom HUD panels (hub tab only) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-3 pointer-events-none" style={{ display: activeTab === 'hub' ? 'flex' : 'none' }}>
          {/* Live threat counter */}
          <div className="rounded-xl px-4 py-2 text-center" style={{ background: "rgba(0,5,16,0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,32,32,0.25)", minWidth: 110 }}>
            <div className="text-[9px] tracking-widest text-white/40 mb-0.5">THREATS TRACKED</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: tc, textShadow: `0 0 12px ${tc}88` }}>
              {liveCounter.toLocaleString()}
            </div>
          </div>
          {/* Active defenses */}
          <div className="rounded-xl px-4 py-2 text-center" style={{ background: "rgba(0,5,16,0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,128,255,0.25)", minWidth: 110 }}>
            <div className="text-[9px] tracking-widest text-white/40 mb-0.5">ACTIVE DEFENSES</div>
            <div className="text-2xl font-bold" style={{ color: "#0080FF", textShadow: "0 0 12px #0080ff88" }}>{activeDefenses}%</div>
          </div>
          {/* System health */}
          <div className="rounded-xl px-4 py-2 text-center" style={{ background: "rgba(0,5,16,0.88)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,255,136,0.25)", minWidth: 110 }}>
            <div className="text-[9px] tracking-widest text-white/40 mb-0.5">SYSTEM HEALTH</div>
            <div className="text-2xl font-bold" style={{ color: "#00FF88", textShadow: "0 0 12px #00ff8888" }}>{systemHealth}%</div>
          </div>
        </div>

        {/* Recent alerts feed — top right (hub tab only) */}
        <div className="absolute top-16 right-4 z-20 w-72 pointer-events-none" style={{ maxHeight: 160, display: activeTab === 'hub' ? 'block' : 'none' }}>
          <div className="text-[9px] tracking-widest text-white/30 mb-1 px-1">RECENT ALERTS</div>
          <AnimatePresence initial={false}>
            {recentAlerts.map((alert, i) => (
              <motion.div key={alert + i}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1-i*0.18, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="text-[10px] px-3 py-1.5 rounded mb-1 flex items-center gap-2"
                style={{ background: "rgba(255,32,32,0.08)", border: "1px solid rgba(255,32,32,0.18)", color: "rgba(255,255,255,0.65)" }}>
                <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#FF6600" }} />
                <span className="truncate">{alert}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Center label over core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          style={{ marginTop: -120, textAlign: "center" }}>
          <div className="text-[9px] tracking-[0.5em] text-white/20">NEURAL CORE</div>
          <div className="text-[11px] font-bold tracking-[0.3em]" style={{ color: tc }}>
            <Activity className="w-3 h-3 inline mr-1" />{threatLevel}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
