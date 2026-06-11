import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, GitBranch, Zap, Ghost, Activity, Lock, Target, Volume2, VolumeX, Mic, Radio, Eye, ShieldAlert } from "lucide-react";
import * as THREE from "three";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type TabId = "neuralcore" | "digitaltwin" | "swarm" | "ghost" | "genesis" | "crypto" | "wargame";

const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "neuralcore",  label: "NEURAL CORE",      icon: <Cpu size={13}/>,        color: "#00e5ff" },
  { id: "digitaltwin",label: "DIGITAL TWIN",      icon: <GitBranch size={13}/>,  color: "#a78bfa" },
  { id: "swarm",       label: "SWARM INTEL",       icon: <Activity size={13}/>,   color: "#4ade80" },
  { id: "ghost",       label: "GHOST PROTOCOL",    icon: <Ghost size={13}/>,      color: "#94a3b8" },
  { id: "genesis",     label: "GENESIS PULSE",     icon: <Zap size={13}/>,        color: "#fbbf24" },
  { id: "crypto",      label: "DIMENSIONAL CRYPTO",icon: <Lock size={13}/>,       color: "#f472b6" },
  { id: "wargame",     label: "WAR GAMING",        icon: <Target size={13}/>,     color: "#e21227" },
];

function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const droneRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
  const [muted, setMuted] = useState(false);

  const initAudio = useCallback(() => {
    if (ctxRef.current) return;
    try {
      ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 38;
      osc.type = "sine";
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      droneRef.current = { osc, gain };
    } catch { /* ignore */ }
  }, []);

  const playAction = useCallback((freq = 880, type: OscillatorType = "square", duration = 0.12) => {
    if (muted || !ctxRef.current) return;
    try {
      const ctx = ctxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = type;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + duration);
    } catch { /* ignore */ }
  }, [muted]);

  const playLock = useCallback(() => {
    playAction(220, "sawtooth", 0.3);
    setTimeout(() => playAction(440, "square", 0.2), 150);
    setTimeout(() => playAction(880, "sine", 0.15), 300);
  }, [playAction]);

  const playPulse = useCallback(() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playAction(200 + i * 80, "sine", 0.4), i * 80);
    }
  }, [playAction]);

  const playAlert = useCallback(() => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playAction(1200, "square", 0.1), i * 200);
    }
  }, [playAction]);

  const toggleMute = useCallback(() => {
    setMuted(m => {
      if (droneRef.current) droneRef.current.gain.gain.value = m ? 0.04 : 0;
      return !m;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (muted || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.2;
    u.rate = 0.75;
    u.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const eng = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("male"))
              || voices.find(v => v.lang.startsWith("en"))
              || voices[0];
    if (eng) u.voice = eng;
    window.speechSynthesis.speak(u);
  }, [muted]);

  useEffect(() => () => {
    ctxRef.current?.close().catch(() => {});
  }, []);

  return { initAudio, playAction, playLock, playPulse, playAlert, speak, muted, toggleMute };
}

function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [line, setLine] = useState(0);
  const lines = [
    "INITIALIZING SENTIENT CYBER-SPHERE v9.0...",
    "NEURAL SUBSTRATE ONLINE. COGNITIVE LOAD: 0.001%",
    "ESTABLISHING OMNI-CHANNEL CYBER DOMAIN...",
    "THREAT HORIZON SCAN: 0 BORDERS RECOGNIZED.",
    "GHOST SUPREMACY PROTOCOL: ARMED.",
    "GENESIS PULSE CAPACITORS: CHARGED.",
    "WARNING: ENTERING LETHAL CYBER SPACE.",
    "SYSTEM STATUS: GODMODE ACTIVE. AWAITING AUTHORIZATION...",
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setLine(l => {
        if (l >= lines.length - 1) { clearInterval(id); setTimeout(onComplete, 700); return l; }
        return l + 1;
      });
    }, 420);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#000] select-none"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div key={i}
            className="absolute h-px bg-[#e21227]"
            style={{ top: `${(i + 1) * 5.5}%`, left: 0, right: 0, opacity: 0.06 + (i % 3) * 0.04 }}
            animate={{ scaleX: [1, 1.02, 1], opacity: [0.06, 0.15, 0.06] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
          />
        ))}
      </div>
      <div className="text-[#e21227] text-xs font-mono tracking-[0.3em] mb-8 animate-pulse">
        KaliGPT / SENTIENT CYBER-SPHERE
      </div>
      <div className="w-[640px] max-w-full px-4 space-y-1">
        {lines.slice(0, line + 1).map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className={`font-mono text-xs tracking-wide ${i === line ? "text-[#00e5ff]" : "text-[#4a4a4a]"}`}>
            <span className="text-[#e21227] mr-2">&gt;</span>{l}
            {i === line && <span className="ml-1 inline-block w-2 h-3 bg-[#00e5ff] animate-pulse" />}
          </motion.div>
        ))}
      </div>
      <div className="mt-10 w-64 h-px bg-gradient-to-r from-transparent via-[#e21227] to-transparent animate-pulse" />
    </motion.div>
  );
}

function NeuralCore3D({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"idle"|"attack"|"defend"|"absorb">("idle");
  const [stats, setStats] = useState({ particles: 4200, synapses: 312, throughput: "0 TB/s", threats: 0 });
  const stateRef = useRef({ mode: "idle", tick: 0 });

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, el.clientWidth / el.clientHeight, 0.1, 2000);
    camera.position.z = 380;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const COUNT = 4200;
    const CONN = 312;

    const pos = new Float32Array(COUNT * 3);
    const basePos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / COUNT);
      const theta = Math.sqrt(COUNT * Math.PI) * phi;
      const r = 140 + (Math.random() - 0.5) * 30;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      pos[i*3] = basePos[i*3] = x;
      pos[i*3+1] = basePos[i*3+1] = y;
      pos[i*3+2] = basePos[i*3+2] = z;
      col[i*3] = 0; col[i*3+1] = 0.85 + Math.random() * 0.15; col[i*3+2] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 1.8, vertexColors: true, sizeAttenuation: true });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const linePositions = new Float32Array(CONN * 6);
    for (let i = 0; i < CONN; i++) {
      const a = Math.floor(Math.random() * COUNT);
      const b = Math.floor(Math.random() * COUNT);
      linePositions[i*6] = pos[a*3]; linePositions[i*6+1] = pos[a*3+1]; linePositions[i*6+2] = pos[a*3+2];
      linePositions[i*6+3] = pos[b*3]; linePositions[i*6+4] = pos[b*3+1]; linePositions[i*6+5] = pos[b*3+2];
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, opacity: 0.12, transparent: true });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    const ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);
    const coreLight = new THREE.PointLight(0x00e5ff, 2, 400);
    scene.add(coreLight);

    const mouse = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    el.addEventListener("mousemove", onMove);

    let animId = 0;
    let t = 0;
    function animate() {
      animId = requestAnimationFrame(animate);
      t += 0.008;
      stateRef.current.tick = t;

      const m = stateRef.current.mode;
      const posArr = geo.attributes.position.array as Float32Array;
      const colArr = geo.attributes.color.array as Float32Array;

      points.rotation.y += 0.003 + (m === "attack" ? 0.01 : 0);
      points.rotation.x += 0.001;
      lines.rotation.y = points.rotation.y;
      lines.rotation.x = points.rotation.x;

      if (m === "attack") {
        for (let i = 0; i < COUNT; i++) {
          const ex = 1 + 0.04 * Math.sin(t * 8 + i * 0.1);
          posArr[i*3] = basePos[i*3] * ex;
          posArr[i*3+1] = basePos[i*3+1] * ex;
          posArr[i*3+2] = basePos[i*3+2] * ex;
          colArr[i*3] = 0.9 + 0.1 * Math.sin(t * 12 + i);
          colArr[i*3+1] = 0.07;
          colArr[i*3+2] = 0.07;
        }
        coreLight.color.set(0xe21227);
      } else if (m === "defend") {
        for (let i = 0; i < COUNT; i++) {
          posArr[i*3] = basePos[i*3] * (1 + 0.015 * Math.sin(t * 3 + i * 0.05));
          posArr[i*3+1] = basePos[i*3+1] * (1 + 0.015 * Math.sin(t * 3 + i * 0.05));
          posArr[i*3+2] = basePos[i*3+2] * (1 + 0.015 * Math.sin(t * 3 + i * 0.05));
          colArr[i*3] = 0.08; colArr[i*3+1] = 0.95; colArr[i*3+2] = 0.3;
        }
        coreLight.color.set(0x4ade80);
      } else if (m === "absorb") {
        for (let i = 0; i < COUNT; i++) {
          const s = 0.8 + 0.2 * Math.abs(Math.sin(t * 2 + i * 0.02));
          posArr[i*3] = basePos[i*3] * s;
          posArr[i*3+1] = basePos[i*3+1] * s;
          posArr[i*3+2] = basePos[i*3+2] * s;
          colArr[i*3] = 0.65; colArr[i*3+1] = 0.2; colArr[i*3+2] = 1;
        }
        coreLight.color.set(0xa78bfa);
      } else {
        for (let i = 0; i < COUNT; i++) {
          const wave = 1 + 0.007 * Math.sin(t * 1.5 + i * 0.03);
          posArr[i*3] = basePos[i*3] * wave;
          posArr[i*3+1] = basePos[i*3+1] * wave;
          posArr[i*3+2] = basePos[i*3+2] * wave;
          colArr[i*3] = 0; colArr[i*3+1] = 0.85; colArr[i*3+2] = 1;
        }
        coreLight.color.set(0x00e5ff);
      }

      camera.position.x += (mouse.x * 60 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 40 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      renderer.render(scene, camera);

      setStats(s => ({
        ...s,
        throughput: (Math.random() * 9.9 + 0.1).toFixed(2) + " TB/s",
        threats: m === "attack" ? Math.floor(Math.random() * 12 + 4) : Math.floor(Math.random() * 3),
      }));
    }
    animate();

    const ro = new ResizeObserver(() => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      el.removeEventListener("mousemove", onMove);
      renderer.dispose();
      geo.dispose(); mat.dispose(); lineGeo.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  const setModeAndSpeak = (m: typeof mode, speech: string) => {
    setMode(m);
    stateRef.current.mode = m;
    audio.playLock();
    audio.speak(speech);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-4 pt-3 pb-2 border-b border-[#1f1f1f] flex-wrap">
        {[
          { m: "idle"  as const, label: "STANDBY",        speech: "Neural core standing by. Awaiting activation.", color: "#00e5ff" },
          { m: "attack"as const, label: "ATTACK MODE",     speech: "Attack mode initiated. Target acquired. Matrix initialized. Core status: Lethal.", color: "#e21227" },
          { m: "defend"as const, label: "DEFEND MODE",     speech: "Defensive shield engaged. Cortex synchronizing. All vectors covered.", color: "#4ade80" },
          { m: "absorb"as const, label: "ABSORB INTEL",    speech: "Intelligence absorption protocol active. Harvesting target data streams.", color: "#a78bfa" },
        ].map(b => (
          <button key={b.m} onClick={() => setModeAndSpeak(b.m, b.speech)}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border transition-all"
            style={{
              borderColor: mode === b.m ? b.color : "#262626",
              color: mode === b.m ? b.color : "#555",
              background: mode === b.m ? b.color + "18" : "transparent",
              boxShadow: mode === b.m ? `0 0 12px ${b.color}44` : "none",
            }}>
            {b.label}
          </button>
        ))}
        <div className="ml-auto flex gap-4 items-center text-[10px] font-mono">
          <span className="text-[#555]">PARTICLES <span style={{ color: "#00e5ff" }}>{stats.particles.toLocaleString()}</span></span>
          <span className="text-[#555]">SYNAPSES <span style={{ color: "#a78bfa" }}>{stats.synapses}</span></span>
          <span className="text-[#555]">THROUGHPUT <span style={{ color: "#4ade80" }}>{stats.throughput}</span></span>
          <span className="text-[#555]">THREATS <span style={{ color: stats.threats > 3 ? "#e21227" : "#4ade80" }}>{stats.threats}</span></span>
        </div>
      </div>
      <div ref={mountRef} className="flex-1 relative cursor-crosshair" style={{ minHeight: 0 }}>
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="text-[9px] font-mono text-[#e21227]/60 tracking-[0.3em]">SENTIENT CYBER-SPHERE</div>
          <div className="text-[8px] font-mono text-[#555] mt-0.5">NEURAL SUBSTRATE ONLINE</div>
        </div>
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none text-right">
          <div className="text-[9px] font-mono tracking-widest" style={{ color: mode === "attack" ? "#e21227" : mode === "defend" ? "#4ade80" : mode === "absorb" ? "#a78bfa" : "#00e5ff" }}>
            {mode.toUpperCase()} MODE ACTIVE
          </div>
          <div className="text-[8px] font-mono text-[#444] mt-0.5">HOVER TO INTERACT</div>
        </div>
      </div>
    </div>
  );
}

const INFRA_NODES = [
  { id: "dc1", label: "DATA CENTER ALPHA", x: 0.5, y: 0.18, type: "dc" },
  { id: "fw1", label: "FIREWALL ARRAY", x: 0.5, y: 0.34, type: "fw" },
  { id: "srv1", label: "APP SERVER CLUSTER", x: 0.25, y: 0.5, type: "srv" },
  { id: "srv2", label: "DB MASTER", x: 0.5, y: 0.5, type: "db" },
  { id: "srv3", label: "CDN EDGE", x: 0.75, y: 0.5, type: "srv" },
  { id: "ep1", label: "ENDPOINT 1", x: 0.15, y: 0.72, type: "ep" },
  { id: "ep2", label: "ENDPOINT 2", x: 0.35, y: 0.72, type: "ep" },
  { id: "ep3", label: "ENDPOINT 3", x: 0.5, y: 0.72, type: "ep" },
  { id: "ep4", label: "ENDPOINT 4", x: 0.65, y: 0.72, type: "ep" },
  { id: "ep5", label: "ENDPOINT 5", x: 0.85, y: 0.72, type: "ep" },
  { id: "iot1", label: "IoT MESH", x: 0.3, y: 0.88, type: "iot" },
  { id: "iot2", label: "SCADA BUS", x: 0.7, y: 0.88, type: "iot" },
];

const INFRA_EDGES = [
  ["dc1","fw1"],["fw1","srv1"],["fw1","srv2"],["fw1","srv3"],
  ["srv1","ep1"],["srv1","ep2"],["srv2","ep3"],["srv3","ep4"],["srv3","ep5"],
  ["ep2","iot1"],["ep4","iot2"],["srv2","srv1"],["srv2","srv3"],
];

function DigitalTwin({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [compromised, setCompromised] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [log, setLog] = useState<string[]>(["[TWIN] Digital replica initialized.", "[TWIN] All 12 nodes synchronized."]);
  const addLog = (m: string) => setLog(p => [...p.slice(-18), m]);

  useEffect(() => {
    const cv = cvRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    let t = 0;
    const comp = { current: compromised };

    function draw() {
      raf = requestAnimationFrame(draw);
      t += 0.02;
      const w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);

      const nodeColor = (id: string, type: string) => {
        if (comp.current.has(id)) return "#e21227";
        const map: Record<string, string> = { dc: "#00e5ff", fw: "#fbbf24", srv: "#a78bfa", db: "#f472b6", ep: "#4ade80", iot: "#fb923c" };
        return map[type] ?? "#555";
      };

      INFRA_EDGES.forEach(([a, b]) => {
        const na = INFRA_NODES.find(n => n.id === a)!;
        const nb = INFRA_NODES.find(n => n.id === b)!;
        const ax = na.x * w, ay = na.y * h, bx = nb.x * w, by = nb.y * h;
        const compEdge = comp.current.has(a) || comp.current.has(b);
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = compEdge ? "#e2122744" : "#ffffff10";
        ctx.lineWidth = compEdge ? 1.5 : 1;
        ctx.stroke();
        if (compEdge) {
          const prog = (t * 0.8) % 1;
          const px = ax + (bx - ax) * prog, py = ay + (by - ay) * prog;
          ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#e21227"; ctx.fill();
        }
      });

      INFRA_NODES.forEach(n => {
        const x = n.x * w, y = n.y * h;
        const color = nodeColor(n.id, n.type);
        const pulse = 1 + 0.15 * Math.sin(t * 3 + n.x * 10);
        const r = (n.type === "dc" ? 16 : n.type === "fw" ? 13 : n.type === "db" ? 12 : 9) * pulse;

        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = color + "18"; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#0d0d0d"; ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = comp.current.has(n.id) ? 2.5 : 1.5;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = `${n.type === "dc" ? 9 : 7}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(n.id.toUpperCase(), x, y + 3);
        if (n.type === "dc" || n.type === "fw") {
          ctx.fillStyle = color + "80";
          ctx.font = "6px monospace";
          ctx.fillText(n.label, x, y - r - 6);
        }
      });

      ctx.font = "8px monospace";
      ctx.fillStyle = "#e21227";
      ctx.textAlign = "left";
      ctx.fillText("DIGITAL TWIN — LIVE SYNC", 12, 18);
      ctx.fillStyle = "#333";
      ctx.fillText(`NODES: ${INFRA_NODES.length}  COMPROMISED: ${comp.current.size}  EDGES: ${INFRA_EDGES.length}`, 12, 30);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const attackNode = (id: string) => {
    setCompromised(prev => {
      const next = new Set(prev); next.add(id);
      return next;
    });
    addLog(`[ATTACK] Injecting exploit into ${id.toUpperCase()}...`);
    addLog(`[PWNED] ${id.toUpperCase()} compromised. Lateral movement initiated.`);
    audio.playAlert();
    audio.speak(`Target ${id} compromised. Lateral movement initiated.`);
  };

  const runScan = () => {
    setScanning(true);
    addLog("[TWIN] Deep scan initiated. Enumerating CVEs...");
    audio.speak("Deep infrastructure scan initiated. Identifying vulnerabilities.");
    const cves = ["CVE-2024-3094","CVE-2023-44487","CVE-2024-21762","CVE-2023-46604"];
    cves.forEach((c, i) => setTimeout(() => addLog(`[VULN] ${c} detected on ${INFRA_NODES[i+2].id.toUpperCase()}`), (i + 1) * 600));
    setTimeout(() => { setScanning(false); addLog("[SCAN] Complete. 4 critical vulnerabilities found."); }, 3200);
  };

  const reset = () => {
    setCompromised(new Set());
    setLog(["[TWIN] Digital replica reset.", "[TWIN] All nodes restored to baseline."]);
    audio.playAction(440, "sine", 0.4);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-[#1f1f1f]">
          <button onClick={runScan} disabled={scanning}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border border-[#a78bfa]/40 text-[#a78bfa] bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 transition-colors disabled:opacity-40">
            {scanning ? "SCANNING..." : "DEEP SCAN"}
          </button>
          <button onClick={reset}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/20 transition-colors">
            RESET TWIN
          </button>
          <div className="ml-auto text-[10px] font-mono text-[#555] self-center">
            COMPROMISED: <span className="text-[#e21227]">{compromised.size}</span>/{INFRA_NODES.length}
          </div>
        </div>
        <canvas ref={cvRef} className="flex-1 w-full"
          width={760} height={440}
          style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="w-52 border-l border-[#1f1f1f] flex flex-col">
        <div className="px-3 py-2 text-[9px] font-mono text-[#e21227] tracking-widest border-b border-[#1f1f1f]">NODE TARGETS</div>
        <div className="flex-1 overflow-y-auto">
          {INFRA_NODES.map(n => (
            <div key={n.id}
              className="flex items-center justify-between px-3 py-1.5 border-b border-[#111] hover:bg-[#1a1a1a] cursor-pointer"
              onClick={() => attackNode(n.id)}>
              <div>
                <div className={`text-[9px] font-mono ${compromised.has(n.id) ? "text-[#e21227]" : "text-[#888]"}`}>{n.id.toUpperCase()}</div>
                <div className="text-[8px] text-[#444]">{n.type.toUpperCase()}</div>
              </div>
              <div className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${compromised.has(n.id) ? "bg-[#e21227]/20 text-[#e21227]" : "bg-[#1f1f1f] text-[#555]"}`}>
                {compromised.has(n.id) ? "PWNED" : "CLICK"}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#1f1f1f] h-40 overflow-y-auto p-2">
          {log.map((l, i) => (
            <div key={i} className={`text-[8px] font-mono mb-0.5 ${l.includes("PWNED") || l.includes("ATTACK") ? "text-[#e21227]" : l.includes("VULN") ? "text-[#fbbf24]" : "text-[#444]"}`}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Agent = { id: number; x: number; y: number; vx: number; vy: number; type: "chaos"|"ghost"|"data"|"phantom"|"strike"; status: "idle"|"hunting"|"striking"|"returning" };

function SwarmIntelligence({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);
  const [log, setLog] = useState<string[]>(["[SWARM] 500 micro-agents dormant.", "[SWARM] Awaiting deployment command."]);
  const addLog = (m: string) => setLog(p => [...p.slice(-20), m]);
  const agentsRef = useRef<Agent[]>([]);
  const activeRef = useRef(false);

  const deploy = () => {
    const agents: Agent[] = [];
    const types: Agent["type"][] = ["chaos","ghost","data","phantom","strike"];
    for (let i = 0; i < 500; i++) {
      agents.push({
        id: i,
        x: Math.random() * 760, y: Math.random() * 440,
        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
        type: types[i % 5],
        status: "hunting",
      });
    }
    agentsRef.current = agents;
    activeRef.current = true;
    setActive(true);
    setCount(500);
    addLog("[DEPLOY] 500 micro-agents launched into target matrix.");
    addLog("[CHAOS-VECTOR] DDoS swarm engaging firewall cluster...");
    addLog("[GHOST-RECON] 100 ghost agents pursuing zero-day vectors...");
    addLog("[DATA-WRAITH] Exfiltration threads active...");
    addLog("[PHANTOM-WIPER] Evidence erasure protocol standing by...");
    addLog("[STRIKE] 100 precision agents locked on critical nodes...");
    audio.speak("Five hundred micro agents deployed. Swarm intelligence active. Collective consciousness online.");
    audio.playPulse();
  };

  const recall = () => {
    activeRef.current = false;
    setActive(false);
    addLog("[RECALL] All agents recalled. Synthesis complete.");
    audio.speak("Swarm recalled. Mission complete. All traces eliminated.");
    audio.playLock();
  };

  useEffect(() => {
    const cv = cvRef.current!;
    const ctx = cv.getContext("2d")!;
    const target = { x: cv.width / 2, y: cv.height / 2 };
    let raf = 0;
    let t = 0;

    function draw() {
      raf = requestAnimationFrame(draw);
      t += 0.01;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#030303";
      ctx.fillRect(0, 0, cv.width, cv.height);

      ctx.beginPath(); ctx.arc(target.x, target.y, 30 + 8 * Math.sin(t * 3), 0, Math.PI * 2);
      ctx.strokeStyle = "#e21227"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#e21227"; ctx.font = "9px monospace"; ctx.textAlign = "center";
      ctx.fillText("TARGET", target.x, target.y + 4);

      if (!activeRef.current) {
        ctx.fillStyle = "#222"; ctx.font = "12px monospace"; ctx.textAlign = "center";
        ctx.fillText("SWARM DORMANT — CLICK DEPLOY", cv.width/2, cv.height/2 - 60);
        return;
      }

      const agentColor: Record<Agent["type"], string> = {
        chaos: "#e21227", ghost: "#94a3b8", data: "#00e5ff", phantom: "#a78bfa", strike: "#fbbf24"
      };

      agentsRef.current.forEach(a => {
        const dx = target.x - a.x, dy = target.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const speed = a.type === "ghost" ? 0.4 : a.type === "chaos" ? 1.2 : 0.8;
        a.vx += (dx / dist) * 0.08 * speed + (Math.random() - 0.5) * 0.3;
        a.vy += (dy / dist) * 0.08 * speed + (Math.random() - 0.5) * 0.3;
        const maxV = a.type === "chaos" ? 4 : 2.5;
        const v = Math.sqrt(a.vx*a.vx + a.vy*a.vy);
        if (v > maxV) { a.vx = (a.vx/v)*maxV; a.vy = (a.vy/v)*maxV; }
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > cv.width) a.vx *= -1;
        if (a.y < 0 || a.y > cv.height) a.vy *= -1;

        const color = agentColor[a.type];
        ctx.beginPath(); ctx.arc(a.x, a.y, a.type === "ghost" ? 1.2 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = color + (a.type === "ghost" ? "80" : "cc");
        ctx.fill();
      });

      const legend: [string, string][] = [["CHAOS-VECTOR","#e21227"],["GHOST-RECON","#94a3b8"],["DATA-WRAITH","#00e5ff"],["PHANTOM-WIPER","#a78bfa"],["STRIKE","#fbbf24"]];
      legend.forEach(([name, color], i) => {
        ctx.beginPath(); ctx.arc(14, 16 + i*16, 4, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill();
        ctx.fillStyle = color; ctx.font = "8px monospace"; ctx.textAlign = "left";
        ctx.fillText(`${name} (×100)`, 24, 19 + i*16);
      });
      ctx.fillStyle = "#333"; ctx.font = "8px monospace"; ctx.textAlign = "right";
      ctx.fillText(`ACTIVE AGENTS: ${agentsRef.current.length}`, cv.width - 10, 18);
    }
    draw();

    const onMove = (e: MouseEvent) => {
      const rect = cv.getBoundingClientRect();
      const sx = cv.width / rect.width;
      const sy = cv.height / rect.height;
      target.x = (e.clientX - rect.left) * sx;
      target.y = (e.clientY - rect.top) * sy;
    };
    cv.addEventListener("mousemove", onMove);

    return () => { cancelAnimationFrame(raf); cv.removeEventListener("mousemove", onMove); };
  }, []);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-[#1f1f1f] items-center">
          <button onClick={deploy} disabled={active}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/20 transition-colors disabled:opacity-40">
            DEPLOY SWARM (×500)
          </button>
          <button onClick={recall} disabled={!active}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border border-[#e21227]/40 text-[#e21227] bg-[#e21227]/10 hover:bg-[#e21227]/20 transition-colors disabled:opacity-40">
            RECALL ALL
          </button>
          <div className="ml-auto text-[10px] font-mono text-[#555]">
            HOVER CANVAS TO REDIRECT SWARM TARGET
          </div>
        </div>
        <canvas ref={cvRef} width={760} height={440} className="flex-1 w-full" style={{ width:"100%", height:"100%" }} />
      </div>
      <div className="w-52 border-l border-[#1f1f1f] flex flex-col">
        <div className="px-3 py-2 text-[9px] font-mono text-[#4ade80] tracking-widest border-b border-[#1f1f1f]">SWARM INTEL LOG</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {log.map((l, i) => (
            <div key={i} className={`text-[8px] font-mono ${l.includes("CHAOS") ? "text-[#e21227]" : l.includes("GHOST") ? "text-[#94a3b8]" : l.includes("DATA") ? "text-[#00e5ff]" : l.includes("PHANTOM") ? "text-[#a78bfa]" : l.includes("STRIKE") ? "text-[#fbbf24]" : "text-[#444]"}`}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

const GHOST_LINES = [
  "HARMONIC VIBRATION PACKETS CALIBRATED...",
  "TRAFFIC SIGNATURE: NORMALIZED — BLENDING WITH NOISE FLOOR.",
  "PHASE 1 — INITIAL RESONANCE: EMBEDDING INTO PROTOCOL STACK.",
  "PHASE 2 — DEEP PAYLOAD INSERTION: MODIFYING LOGIC GATES SILENTLY.",
  "PHASE 3 — SYSTEMIC DETERIORATION: TARGET SELF-DESTRUCTING.",
  "PHASE 4 — COVER DISSOLUTION: LOGS PURGED. MEMORY ZEROED.",
  "GENESIS PULSE INITIATED: DIGITAL HISTORY ERASED.",
  "GHOST SUPREMACY PROTOCOL COMPLETE. NO TRACE DETECTED.",
  "KALI-GPT WAS NEVER HERE.",
];

function GhostProtocol({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>(["[GHOST] Harmonic vibration engine loaded.", "[GHOST] Awaiting activation..."]);
  const addLog = (m: string) => setLog(p => [...p.slice(-20), m]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const cv = cvRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0; let t = 0;
    const phaseRef = { current: 0 };
    const particlesRef: { x: number; y: number; vx: number; vy: number; alpha: number; r: number }[] = [];
    for (let i = 0; i < 200; i++) {
      particlesRef.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, alpha: Math.random(), r: Math.random()*2+0.5 });
    }

    function draw() {
      raf = requestAnimationFrame(draw);
      t += 0.012;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#030303";
      ctx.fillRect(0, 0, cv.width, cv.height);

      const ph = phaseRef.current;
      const centerX = cv.width / 2, centerY = cv.height / 2;

      for (let ring = 0; ring < 6; ring++) {
        const r = 50 + ring * 35;
        const alpha = (0.04 + 0.04 * Math.sin(t * 2 + ring)) * (ph === 0 ? 0.3 : Math.min(1, ph / 4));
        ctx.beginPath(); ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = ph >= 3 ? `rgba(226,18,39,${alpha})` : `rgba(148,163,184,${alpha})`;
        ctx.lineWidth = 0.5; ctx.setLineDash([3, 8]);
        ctx.stroke(); ctx.setLineDash([]);
      }

      const waveCount = 8;
      for (let w = 0; w < waveCount; w++) {
        const angle = (w / waveCount) * Math.PI * 2 + t * 0.5;
        const len = 120 + 30 * Math.sin(t * 3 + w);
        const intensity = ph >= 1 ? Math.min(1, ph * 0.25) : 0.15;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * 60, centerY + Math.sin(angle) * 60);
        ctx.lineTo(centerX + Math.cos(angle) * len, centerY + Math.sin(angle) * len);
        ctx.strokeStyle = `rgba(148,163,184,${intensity * 0.4})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      }

      particlesRef.forEach(p => {
        p.x += p.vx * (ph > 0 ? 1 + ph * 0.5 : 0.3);
        p.y += p.vy * (ph > 0 ? 1 + ph * 0.5 : 0.3);
        if (p.x < 0) p.x = cv.width; if (p.x > cv.width) p.x = 0;
        if (p.y < 0) p.y = cv.height; if (p.y > cv.height) p.y = 0;
        const alpha = p.alpha * (ph >= 6 ? 0.1 * (1 - (ph - 6) / 3) : 0.4);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,184,${Math.max(0, alpha)})`; ctx.fill();
      });

      if (ph >= 8) {
        const fade = Math.min(1, (ph - 7.5) * 2);
        ctx.fillStyle = `rgba(0,0,0,${fade * 0.95})`;
        ctx.fillRect(0, 0, cv.width, cv.height);
        if (fade > 0.8) {
          ctx.fillStyle = `rgba(148,163,184,${(fade - 0.8) * 2})`;
          ctx.font = "11px monospace"; ctx.textAlign = "center";
          ctx.fillText("NO TRACE DETECTED. WE WERE NEVER HERE.", centerX, centerY);
        }
      }

      ctx.font = "8px monospace"; ctx.textAlign = "left";
      ctx.fillStyle = "#94a3b8"; ctx.fillText("GHOST SUPREMACY PROTOCOL", 12, 18);
      ctx.fillStyle = "#333"; ctx.fillText(`PHASE ${ph}/8  HARMONIC VIBRATION ACTIVE`, 12, 30);
    }
    draw();

    const handler = (e: CustomEvent) => { phaseRef.current = e.detail; };
    cv.addEventListener("phasechange", handler as EventListener);
    return () => { cancelAnimationFrame(raf); cv.removeEventListener("phasechange", handler as EventListener); };
  }, []);

  const runProtocol = () => {
    setRunning(true); setPhase(0); setLog(["[GHOST] GHOST SUPREMACY PROTOCOL INITIATED."]);
    audio.speak("Ghost Supremacy Protocol initiated. Harmonic vibrations deployed. We are invisible.");
    GHOST_LINES.forEach((line, i) => {
      timerRef.current = setTimeout(() => {
        const ph = i + 1;
        setPhase(ph);
        addLog(`[PH.${ph}] ${line}`);
        cvRef.current?.dispatchEvent(new CustomEvent("phasechange", { detail: ph }));
        if (ph === GHOST_LINES.length) { setRunning(false); audio.speak("Ghost protocol complete. No trace detected. We were never here."); }
      }, (i + 1) * 900);
    });
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-[#1f1f1f] items-center">
          <button onClick={runProtocol} disabled={running}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border border-[#94a3b8]/40 text-[#94a3b8] bg-[#94a3b8]/10 hover:bg-[#94a3b8]/20 transition-colors disabled:opacity-40">
            {running ? "PROTOCOL ACTIVE..." : "ACTIVATE GHOST PROTOCOL"}
          </button>
          <div className="ml-auto flex gap-3 text-[10px] font-mono">
            <span className="text-[#555]">PHASE <span className="text-[#94a3b8]">{phase}/8</span></span>
            <span className="text-[#555]">TRACE LEVEL <span className="text-[#4ade80]">ZERO</span></span>
          </div>
        </div>
        <canvas ref={cvRef} width={760} height={440} className="flex-1 w-full" style={{ width:"100%", height:"100%" }} />
      </div>
      <div className="w-52 border-l border-[#1f1f1f] flex flex-col">
        <div className="px-3 py-2 text-[9px] font-mono text-[#94a3b8] tracking-widest border-b border-[#1f1f1f]">GHOST LOG</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {log.map((l, i) => <div key={i} className="text-[8px] font-mono text-[#555]" style={{ color: i === log.length-1 ? "#94a3b8" : "#444" }}>{l}</div>)}
        </div>
        <div className="p-2 border-t border-[#1f1f1f] space-y-1">
          {["Harmonic Vibrations","Traffic Normalization","Log Erasure","Memory Zero","Genesis Pulse"].map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: phase > i * 1.5 ? "#4ade80" : "#222" }} />
              <span className="text-[8px] font-mono text-[#444]">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GenesisPulse({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [charged, setCharged] = useState(0);
  const [fired, setFired] = useState(false);
  const [log, setLog] = useState<string[]>(["[GENESIS] Capacitor banks at 0%.", "[GENESIS] Charging to 100% required before firing."]);
  const addLog = (m: string) => setLog(p => [...p.slice(-18), m]);
  const chargeRef = useRef(0);
  const waveRef = useRef<{ r: number; alpha: number }[]>([]);
  const firedRef = useRef(false);

  useEffect(() => {
    const cv = cvRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0; let t = 0;

    function draw() {
      raf = requestAnimationFrame(draw);
      t += 0.015;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#030303"; ctx.fillRect(0, 0, cv.width, cv.height);

      const cx = cv.width/2, cy = cv.height/2;
      const charge = chargeRef.current;

      for (let i = 0; i < 5; i++) {
        const r = 30 + i * 25 + 8 * Math.sin(t * 4 + i);
        const alpha = (0.03 + charge * 0.001) * (i % 2 === 0 ? 1 : 0.5);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(251,191,36,${Math.min(1, alpha)})`; ctx.lineWidth = 0.8; ctx.stroke();
      }

      const coreR = 20 + 10 * (charge / 100) + 3 * Math.sin(t * 8);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR + 20);
      grad.addColorStop(0, `rgba(251,191,36,${0.1 + charge * 0.006})`);
      grad.addColorStop(0.5, `rgba(251,191,36,${0.05 + charge * 0.003})`);
      grad.addColorStop(1, "rgba(251,191,36,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coreR + 20, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = "#0d0d0d"; ctx.fill();
      ctx.strokeStyle = `rgba(251,191,36,${0.3 + charge * 0.007})`; ctx.lineWidth = 2; ctx.stroke();

      if (firedRef.current) {
        waveRef.current.forEach((w, i) => {
          if (w.alpha <= 0) return;
          w.r += 12;
          w.alpha -= 0.008;
          ctx.beginPath(); ctx.arc(cx, cy, w.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(251,191,36,${Math.max(0, w.alpha)})`; ctx.lineWidth = 3 - i * 0.3; ctx.stroke();
          const alpha2 = w.alpha * 0.3;
          ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, alpha2)})`; ctx.lineWidth = 1; ctx.stroke();
        });
        waveRef.current = waveRef.current.filter(w => w.alpha > 0);
      }

      const barW = 200, barH = 10;
      const bx = cx - barW/2, by = cv.height - 50;
      ctx.fillStyle = "#111"; ctx.fillRect(bx, by, barW, barH);
      const fg = ctx.createLinearGradient(bx, 0, bx + barW, 0);
      fg.addColorStop(0, "#fbbf24"); fg.addColorStop(1, "#e21227");
      ctx.fillStyle = fg; ctx.fillRect(bx, by, barW * charge / 100, barH);
      ctx.strokeStyle = "#fbbf2444"; ctx.strokeRect(bx, by, barW, barH);
      ctx.fillStyle = "#fbbf24"; ctx.font = "8px monospace"; ctx.textAlign = "center";
      ctx.fillText(`CAPACITOR: ${Math.round(charge)}%`, cx, by - 5);
      ctx.fillStyle = "#333"; ctx.font = "8px monospace"; ctx.textAlign = "left";
      ctx.fillText("GENESIS PULSE — DIGITAL HISTORY ERASURE", 12, 18);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const charge = () => {
    if (charged >= 100) return;
    setCharged(0); chargeRef.current = 0; setFired(false); firedRef.current = false;
    addLog("[GENESIS] Charging capacitor banks...");
    audio.speak("Genesis pulse capacitors charging. Do not interrupt power supply.");
    const start = Date.now();
    const dur = 4000;
    const id = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / dur) * 100);
      setCharged(p); chargeRef.current = p;
      if (p >= 100) {
        clearInterval(id);
        addLog("[GENESIS] Capacitors at 100%. PULSE READY.");
        audio.speak("Genesis pulse fully charged. Ready to fire. Digital erasure standing by.");
      }
    }, 60);
  };

  const fire = () => {
    if (charged < 100) return;
    setFired(true); firedRef.current = true;
    waveRef.current = Array.from({ length: 8 }, (_, i) => ({ r: 20 + i * 5, alpha: 1 - i * 0.08 }));
    addLog("[GENESIS] PULSE FIRED. Shockwave propagating through target matrix.");
    addLog("[GENESIS] Digital history: ERASED. Logs: ZEROED. Memory: PURGED.");
    addLog("[GENESIS] TARGET INFRASTRUCTURE: DEVASTATED.");
    addLog("[GENESIS] Genesis Pulse sequence complete. No evidence remains.");
    audio.speak("Genesis pulse fired. Shockwave propagating. All digital history erased. The matrix has been purged.");
    audio.playPulse();
    setCharged(0); chargeRef.current = 0;
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-[#1f1f1f] items-center">
          <button onClick={charge}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border border-[#fbbf24]/40 text-[#fbbf24] bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 transition-colors">
            CHARGE CAPACITORS
          </button>
          <button onClick={fire} disabled={charged < 100}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border transition-colors disabled:opacity-30"
            style={{ borderColor: "#e21227", color: "#e21227", background: charged >= 100 ? "#e2122220" : "transparent" }}>
            FIRE GENESIS PULSE
          </button>
          <div className="ml-auto text-[10px] font-mono">
            <span className="text-[#555]">CHARGE </span>
            <span style={{ color: charged >= 100 ? "#e21227" : "#fbbf24" }}>{Math.round(charged)}%</span>
          </div>
        </div>
        <canvas ref={cvRef} width={760} height={440} className="flex-1 w-full" style={{ width:"100%", height:"100%" }} />
      </div>
      <div className="w-52 border-l border-[#1f1f1f] flex flex-col">
        <div className="px-3 py-2 text-[9px] font-mono text-[#fbbf24] tracking-widest border-b border-[#1f1f1f]">PULSE LOG</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {log.map((l, i) => (
            <div key={i} className={`text-[8px] font-mono ${l.includes("FIRED") || l.includes("DEVASTATED") ? "text-[#e21227]" : i === log.length-1 ? "text-[#fbbf24]" : "text-[#444]"}`}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CRYPTO_TARGETS = [
  { name: "RSA-2048",   algo: "Shor's Algorithm",  qubits: 4096,  color: "#e21227", time: "Classic: 300 YEARS  Quantum: 3.7 SEC" },
  { name: "AES-256",    algo: "Grover's Algorithm", qubits: 512,   color: "#f472b6", time: "Classic: 100 YEARS  Quantum: 12 MIN" },
  { name: "ECC-384",    algo: "Quantum Annealing",  qubits: 2048,  color: "#a78bfa", time: "Classic: 1000 YEARS  Quantum: 8.2 SEC" },
  { name: "SHA-3-512",  algo: "Amplitude Amplify",  qubits: 1024,  color: "#00e5ff", time: "Classic: INFEASIBLE  Quantum: 42 MIN" },
  { name: "MILITARY-Q", algo: "Hybrid Shor+Grover", qubits: 8192,  color: "#fbbf24", time: "Classic: INFEASIBLE  Quantum: 2.1 MIN" },
];

function DimensionalCrypto({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState(0);
  const [cracking, setCracking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cracked, setCracked] = useState(false);
  const [log, setLog] = useState<string[]>(["[CRYPTO] Quantum cryptanalysis engine online.", "[CRYPTO] Select target cipher to begin."]);
  const addLog = (m: string) => setLog(p => [...p.slice(-20), m]);
  const progRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const cv = cvRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0; let t = 0;
    const qubitStates: number[] = Array.from({ length: 64 }, () => Math.random());

    function draw() {
      raf = requestAnimationFrame(draw);
      t += 0.02;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#030303"; ctx.fillRect(0, 0, cv.width, cv.height);

      const target = CRYPTO_TARGETS[selected];
      const prog = progRef.current;
      const cols = 64, qR = 6, spacing = Math.floor((cv.width - 40) / cols);
      for (let i = 0; i < cols; i++) {
        if (prog > 0) qubitStates[i] = Math.random();
        const state = qubitStates[i];
        const x = 20 + i * spacing + spacing/2;
        const yCenter = 80;
        const isOne = prog > 0 ? (state > (1 - prog/100)) : state > 0.5;
        const col = isOne ? target.color : "#333";
        ctx.beginPath(); ctx.arc(x, yCenter + (isOne ? -8 : 8) * Math.sin(t * 4 + i * 0.3), qR, 0, Math.PI*2);
        ctx.fillStyle = col + "cc"; ctx.fill();
        if (isOne) {
          ctx.beginPath(); ctx.arc(x, yCenter, 3, 0, Math.PI*2);
          ctx.fillStyle = col; ctx.fill();
        }
      }

      ctx.fillStyle = "#555"; ctx.font = "8px monospace"; ctx.textAlign = "left";
      ctx.fillText(`QUBIT REGISTER (${target.qubits} logical qubits)`, 20, 20);
      ctx.fillText(target.algo.toUpperCase(), 20, 32);

      if (prog > 0) {
        const matW = cv.width - 40, matH = 180;
        const matX = 20, matY = 110;
        const cols2 = 40, rows = 20;
        const cw = matW / cols2, rh = matH / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols2; c++) {
            const v = Math.random();
            const crackFraction = prog / 100;
            const isDecrypted = v < crackFraction;
            if (isDecrypted) {
              ctx.fillStyle = target.color + "22";
              ctx.fillRect(matX + c*cw, matY + r*rh, cw-1, rh-1);
              ctx.fillStyle = target.color;
              ctx.font = "7px monospace"; ctx.textAlign = "center";
              const chars = "0123456789ABCDEF";
              ctx.fillText(chars[Math.floor(Math.random()*16)] + chars[Math.floor(Math.random()*16)], matX + c*cw + cw/2, matY + r*rh + rh/2 + 3);
            } else {
              ctx.fillStyle = "#111";
              ctx.fillRect(matX + c*cw, matY + r*rh, cw-1, rh-1);
              ctx.fillStyle = "#2a2a2a"; ctx.font = "7px monospace"; ctx.textAlign = "center";
              ctx.fillText("??", matX + c*cw + cw/2, matY + r*rh + rh/2 + 3);
            }
          }
        }
      }

      const barY = cv.height - 60;
      ctx.fillStyle = "#111"; ctx.fillRect(20, barY, cv.width-40, 12);
      ctx.fillStyle = target.color; ctx.fillRect(20, barY, (cv.width-40) * prog/100, 12);
      ctx.strokeStyle = target.color + "33"; ctx.strokeRect(20, barY, cv.width-40, 12);
      ctx.fillStyle = target.color; ctx.font = "9px monospace"; ctx.textAlign = "left";
      ctx.fillText(`CRACK PROGRESS: ${Math.round(prog)}%  ${target.time}`, 20, barY - 6);
      if (prog >= 100) {
        ctx.fillStyle = target.color; ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
        ctx.fillText("ENCRYPTION SHATTERED. KEY EXTRACTED.", cv.width/2, cv.height - 20);
      }
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [selected]);

  const crack = () => {
    const t = CRYPTO_TARGETS[selected];
    setCracking(true); setCracked(false); setProgress(0); progRef.current = 0;
    addLog(`[CRYPTO] Initializing ${t.algo} on ${t.name}...`);
    addLog(`[QUBIT] Allocating ${t.qubits.toLocaleString()} logical qubits...`);
    audio.speak(`Initiating ${t.algo} against ${t.name}. ${t.qubits} qubits online.`);
    timerRef.current = setInterval(() => {
      const inc = 0.6 + Math.random() * 1.2;
      const next = Math.min(100, progRef.current + inc);
      progRef.current = next;
      setProgress(next);
      if (next >= 100) {
        clearInterval(timerRef.current);
        setCracking(false); setCracked(true);
        addLog(`[CRACKED] ${t.name} SHATTERED. Encryption key extracted in ${(Math.random()*8+1).toFixed(1)}s.`);
        addLog(`[KEY] 0x${Array.from({length:32}, () => Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join("").toUpperCase()}`);
        audio.speak(`${t.name} shattered. Encryption key extracted. Dimensional cryptography complete.`);
        audio.playAlert();
      }
    }, 80);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-[#1f1f1f] flex-wrap items-center">
          {CRYPTO_TARGETS.map((t, i) => (
            <button key={i} onClick={() => { setSelected(i); setProgress(0); progRef.current = 0; setCracked(false); }}
              className="px-2.5 py-1 text-[9px] font-mono tracking-widest rounded border transition-all"
              style={{ borderColor: selected === i ? t.color : "#262626", color: selected === i ? t.color : "#555", background: selected === i ? t.color+"18" : "transparent" }}>
              {t.name}
            </button>
          ))}
          <button onClick={crack} disabled={cracking}
            className="ml-auto px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border border-[#f472b6]/40 text-[#f472b6] bg-[#f472b6]/10 hover:bg-[#f472b6]/20 transition-colors disabled:opacity-40">
            {cracking ? "CRACKING..." : "INITIATE QUANTUM CRACK"}
          </button>
        </div>
        <canvas ref={cvRef} width={760} height={440} className="flex-1 w-full" style={{ width:"100%", height:"100%" }} />
      </div>
      <div className="w-52 border-l border-[#1f1f1f] flex flex-col">
        <div className="px-3 py-2 text-[9px] font-mono text-[#f472b6] tracking-widest border-b border-[#1f1f1f]">CRYPTO LOG</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {log.map((l, i) => (
            <div key={i} className={`text-[8px] font-mono break-all ${l.includes("KEY") && l.includes("0x") ? "text-[#fbbf24]" : l.includes("CRACKED") || l.includes("SHATTERED") ? "text-[#e21227]" : i === log.length-1 ? "text-[#f472b6]" : "text-[#444]"}`}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

const WARGAME_SCENARIOS = [
  { year: 2025, threat: "Nation-State APT", vector: "Supply Chain", impact: "CRITICAL",  color: "#e21227" },
  { year: 2026, threat: "AI Worm Proliferation", vector: "LLM Injection", impact: "CRITICAL",  color: "#e21227" },
  { year: 2027, threat: "Quantum Key Cracking", vector: "RSA Collapse", impact: "EXTREME",   color: "#ff6600" },
  { year: 2028, threat: "Satellite Hijack", vector: "RF Spoofing", impact: "SEVERE",    color: "#fbbf24" },
  { year: 2029, threat: "Grid Collapse", vector: "SCADA Zero-Day", impact: "CATASTROPHIC", color: "#e21227" },
  { year: 2030, threat: "AGI Rogue Protocol", vector: "Self-Replication", impact: "EXISTENTIAL", color: "#f472b6" },
];

function PredictiveWarGaming({ audio }: { audio: ReturnType<typeof useAudioEngine> }) {
  const [simulating, setSimulating] = useState(false);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>(["[WAR-GAME] Predictive engine online.", "[WAR-GAME] Modeling global threat horizon 2025-2030."]);
  const addLog = (m: string) => setLog(p => [...p.slice(-22), m]);
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = cvRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0; let t = 0;

    function draw() {
      raf = requestAnimationFrame(draw);
      t += 0.015;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#030303"; ctx.fillRect(0, 0, cv.width, cv.height);

      const timelineY = cv.height * 0.55;
      ctx.beginPath(); ctx.moveTo(40, timelineY); ctx.lineTo(cv.width - 40, timelineY);
      ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 1.5; ctx.stroke();

      WARGAME_SCENARIOS.forEach((s, i) => {
        const x = 40 + (i / (WARGAME_SCENARIOS.length - 1)) * (cv.width - 80);
        const isActive = activeYear === s.year;
        const pulse = 1 + 0.2 * Math.sin(t * 3 + i);
        const nodeR = isActive ? 14 * pulse : 9;
        ctx.beginPath(); ctx.arc(x, timelineY, nodeR + 6, 0, Math.PI * 2);
        ctx.fillStyle = s.color + "15"; ctx.fill();
        ctx.beginPath(); ctx.arc(x, timelineY, nodeR, 0, Math.PI * 2);
        ctx.fillStyle = "#0d0d0d"; ctx.fill();
        ctx.strokeStyle = s.color; ctx.lineWidth = isActive ? 2.5 : 1.5; ctx.stroke();
        ctx.fillStyle = s.color; ctx.font = `${isActive ? 9 : 8}px monospace`; ctx.textAlign = "center";
        ctx.fillText(s.year.toString(), x, timelineY + 4);

        const threatH = isActive ? 80 + 20 * Math.sin(t * 2) : 40;
        const threatX = x;
        const threatYTop = timelineY - 20 - threatH;
        ctx.beginPath(); ctx.moveTo(threatX, timelineY - 16); ctx.lineTo(threatX, threatYTop);
        ctx.strokeStyle = s.color + "55"; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
        ctx.stroke(); ctx.setLineDash([]);

        ctx.fillStyle = s.color; ctx.font = `${isActive ? 9 : 7}px monospace`; ctx.textAlign = "center";
        ctx.fillText(s.threat, threatX, threatYTop - 12);
        if (isActive) {
          ctx.fillStyle = s.color + "aa"; ctx.font = "7px monospace";
          ctx.fillText(`VECTOR: ${s.vector}`, threatX, threatYTop - 2);
          ctx.fillStyle = s.color; ctx.font = "bold 8px monospace";
          ctx.fillText(`⚠ ${s.impact}`, threatX, threatYTop + 8);
        }

        ctx.fillStyle = s.color + "80"; ctx.font = "7px monospace"; ctx.textAlign = "center";
        ctx.fillText(s.vector, x, timelineY + 22);
      });

      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = cv.height * 0.65 + (i / gridLines) * (cv.height * 0.28);
        ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(cv.width - 40, y);
        ctx.strokeStyle = "#111"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      WARGAME_SCENARIOS.forEach((s, i) => {
        const x = 40 + (i / (WARGAME_SCENARIOS.length - 1)) * (cv.width - 80);
        const impactMap: Record<string, number> = { CRITICAL: 0.7, EXTREME: 0.85, SEVERE: 0.55, CATASTROPHIC: 0.95, EXISTENTIAL: 1 };
        const imp = impactMap[s.impact] ?? 0.5;
        const barH = cv.height * 0.28 * imp;
        const barY = cv.height * 0.65 + cv.height * 0.28 - barH;
        const barW = 28;
        const wave = 1 + 0.05 * Math.sin(t * 2 + i);
        ctx.fillStyle = s.color + "22";
        ctx.fillRect(x - barW/2, barY, barW, barH * wave);
        ctx.strokeStyle = s.color + "66"; ctx.lineWidth = 1;
        ctx.strokeRect(x - barW/2, barY, barW, barH * wave);
      });

      ctx.fillStyle = "#333"; ctx.font = "8px monospace"; ctx.textAlign = "left";
      ctx.fillText("PREDICTIVE THREAT TIMELINE — GLOBAL CYBER LANDSCAPE 2025-2030", 12, 18);
      ctx.fillStyle = "#555"; ctx.fillText("CLICK NODE TO SIMULATE", 12, 30);
    }
    draw();

    const onClick = (e: MouseEvent) => {
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (cv.width / rect.width);
      const my = (e.clientY - rect.top) * (cv.height / rect.height);
      const tY = cv.height * 0.55;
      WARGAME_SCENARIOS.forEach((s, i) => {
        const x = 40 + (i / (WARGAME_SCENARIOS.length - 1)) * (cv.width - 80);
        const d = Math.sqrt((mx - x) ** 2 + (my - tY) ** 2);
        if (d < 20) {
          setActiveYear(s.year);
          addLog(`[WAR-GAME] Simulating ${s.year} scenario: ${s.threat}`);
          addLog(`[VECTOR] ${s.vector} attack vector engaged.`);
          addLog(`[IMPACT] Projected impact: ${s.impact}`);
          audio.speak(`Simulating ${s.year}. Threat: ${s.threat}. Impact level: ${s.impact}.`);
          audio.playAction(300 + i * 50, "sawtooth", 0.3);
        }
      });
    };
    cv.addEventListener("click", onClick);

    return () => { cancelAnimationFrame(raf); cv.removeEventListener("click", onClick); };
  }, [activeYear, audio]);

  const runFullSim = () => {
    setSimulating(true);
    addLog("[WAR-GAME] Running full 6-scenario simulation...");
    audio.speak("Initiating full predictive war game simulation across all six scenarios.");
    WARGAME_SCENARIOS.forEach((s, i) => {
      setTimeout(() => {
        setActiveYear(s.year);
        addLog(`[${s.year}] ${s.threat} — ${s.impact}`);
        if (i === WARGAME_SCENARIOS.length - 1) { setSimulating(false); audio.speak("War game simulation complete. All scenarios processed. Threat model updated."); }
      }, i * 900);
    });
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex gap-2 px-3 py-2 border-b border-[#1f1f1f] items-center">
          <button onClick={runFullSim} disabled={simulating}
            className="px-3 py-1.5 text-[10px] font-mono tracking-widest rounded border border-[#e21227]/40 text-[#e21227] bg-[#e21227]/10 hover:bg-[#e21227]/20 transition-colors disabled:opacity-40">
            {simulating ? "SIMULATING..." : "RUN FULL WAR-GAME"}
          </button>
          <div className="ml-auto flex gap-3 text-[10px] font-mono text-[#555]">
            {WARGAME_SCENARIOS.map(s => (
              <span key={s.year} style={{ color: activeYear === s.year ? s.color : "#444" }}>{s.year}</span>
            ))}
          </div>
        </div>
        <canvas ref={cvRef} width={760} height={440} className="flex-1 w-full" style={{ width:"100%", height:"100%" }} />
      </div>
      <div className="w-52 border-l border-[#1f1f1f] flex flex-col">
        <div className="px-3 py-2 text-[9px] font-mono text-[#e21227] tracking-widest border-b border-[#1f1f1f]">WAR-GAME LOG</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {log.map((l, i) => (
            <div key={i} className={`text-[8px] font-mono ${l.includes("CATASTROPHIC")||l.includes("EXISTENTIAL") ? "text-[#e21227]" : l.includes("EXTREME") ? "text-[#f472b6]" : l.includes("CRITICAL") ? "text-[#fbbf24]" : i === log.length-1 ? "text-[#e21227]" : "text-[#444]"}`}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SentientCyberSphereModal({ open, onOpenChange }: Props) {
  const [intro, setIntro] = useState(true);
  const [tab, setTab] = useState<TabId>("neuralcore");
  const audio = useAudioEngine();

  useEffect(() => {
    if (open) {
      setIntro(true);
      audio.initAudio();
      setTimeout(() => audio.speak("Sentient Cyber-Sphere online. Neural substrate synchronized. Awaiting your command."), 1200);
    } else {
      setIntro(true);
    }
  }, [open]);

  const VOICE_CMDS = [
    { label: "TARGET LOCK",    speech: "Target locked. Matrix initialized. Core status: Lethal. Awaiting launch authorization." },
    { label: "SYSTEM STATUS",  speech: "All systems nominal. Neural substrate at full capacity. Threat index: minimal. Ghost protocol on standby." },
    { label: "MISSION BRIEF",  speech: "We don't scan networks. We perceive them. We don't exploit vulnerabilities. We rewrite the rules of the matrix. Welcome to the final evolution of cyber power." },
    { label: "SWARM LAUNCH",   speech: "Five hundred micro agents entering target matrix. Chaos vector engaging. Ghost recon dispersing. Data wraith active. We are everywhere." },
    { label: "GHOST ENGAGE",   speech: "Ghost supremacy protocol active. Harmonic vibrations deployed. We are invisible. No radar in the world can detect us." },
    { label: "GENESIS ARM",    speech: "Genesis pulse capacitors armed. One command and the entire digital history of the target will cease to exist. Standing by." },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9998] flex flex-col bg-[#060606]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <AnimatePresence>
          {intro && (
            <motion.div className="absolute inset-0 z-[100]" exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
              <CinematicIntro onComplete={() => { setIntro(false); audio.playLock(); }} />
            </motion.div>
          )}
        </AnimatePresence>

        {!intro && (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f1f1f] shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e21227] animate-pulse" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80]" />
                </div>
                <span className="text-[10px] font-mono tracking-[0.3em] text-[#e21227]">SENTIENT CYBER-SPHERE</span>
                <span className="text-[9px] font-mono text-[#333]">v9.0 — COGNITIVE DETERRENCE ARSENAL</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={audio.toggleMute}
                  className="p-1.5 rounded border border-[#1f1f1f] text-[#555] hover:text-[#e21227] hover:border-[#e21227]/30 transition-colors">
                  {audio.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
                <button onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded border border-[#1f1f1f] text-[#555] hover:text-[#e21227] hover:border-[#e21227]/30 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex border-b border-[#1f1f1f] shrink-0 overflow-x-auto">
              {TABS.map(tb => (
                <button key={tb.id} onClick={() => { setTab(tb.id); audio.playAction(600, "sine", 0.08); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-[9px] font-mono tracking-widest whitespace-nowrap transition-all border-b-2"
                  style={{
                    borderBottomColor: tab === tb.id ? tb.color : "transparent",
                    color: tab === tb.id ? tb.color : "#444",
                    background: tab === tb.id ? tb.color + "0a" : "transparent",
                  }}>
                  {tb.icon} {tb.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              {tab === "neuralcore"  && <NeuralCore3D audio={audio} />}
              {tab === "digitaltwin"&& <DigitalTwin audio={audio} />}
              {tab === "swarm"       && <SwarmIntelligence audio={audio} />}
              {tab === "ghost"       && <GhostProtocol audio={audio} />}
              {tab === "genesis"     && <GenesisPulse audio={audio} />}
              {tab === "crypto"      && <DimensionalCrypto audio={audio} />}
              {tab === "wargame"     && <PredictiveWarGaming audio={audio} />}
            </div>

            <div className="border-t border-[#1f1f1f] px-3 py-2 shrink-0 flex gap-2 items-center flex-wrap">
              <div className="flex items-center gap-1.5 mr-1">
                <Mic size={10} className="text-[#e21227]" />
                <span className="text-[9px] font-mono text-[#333] tracking-widest">VOICE CMDS:</span>
              </div>
              {VOICE_CMDS.map(cmd => (
                <button key={cmd.label}
                  onClick={() => { audio.speak(cmd.speech); audio.playAction(440, "sine", 0.1); }}
                  className="px-2.5 py-1 text-[8px] font-mono tracking-widest rounded border border-[#1f1f1f] text-[#444] hover:border-[#e21227]/40 hover:text-[#e21227] transition-colors">
                  {cmd.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-3 text-[8px] font-mono text-[#2a2a2a]">
                <span className="flex items-center gap-1"><Radio size={8} className="text-[#4ade80]" />NEURAL ONLINE</span>
                <span className="flex items-center gap-1"><Eye size={8} className="text-[#a78bfa]" />UBIQUITOUS PRESENCE</span>
                <span className="flex items-center gap-1"><ShieldAlert size={8} className="text-[#e21227]" />GHOST ARMED</span>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
