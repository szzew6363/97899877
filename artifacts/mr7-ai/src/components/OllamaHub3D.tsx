import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Cpu, Download, Trash2, Play, Square, Activity,
  Zap, Brain, Server, Globe, RefreshCw, Terminal,
  ChevronRight, AlertCircle, CheckCircle2, Loader2,
  MemoryStick, HardDrive, Wifi, WifiOff
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   OLLAMA HUB 3D — Neural Model Command Center
   Futuristic 3D management dashboard for local AI models.
   Three.js orbital rings + holographic panels + live stats.
═══════════════════════════════════════════════════════════════ */

interface OllamaHubProps {
  open: boolean;
  onClose: () => void;
}

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: { parameter_size?: string; quantization_level?: string; family?: string };
}

interface RunningModel {
  name: string;
  model: string;
  size: number;
  size_vram?: number;
  expires_at?: string;
}

interface OllamaStatus {
  running: boolean;
  models: OllamaModel[];
  version: string | null;
}

const AVAILABLE_MODELS = [
  { name: "llama3.2:3b",      label: "Llama 3.2",    size: "2GB",  speed: "⚡ Fast",   color: "#7c3aed", tag: "META" },
  { name: "llama3.3:70b",     label: "Llama 3.3 70B",size: "40GB", speed: "🧠 Smart",  color: "#4f46e5", tag: "META" },
  { name: "deepseek-r1:7b",   label: "DeepSeek R1",  size: "4GB",  speed: "🔍 Reason", color: "#0891b2", tag: "DS" },
  { name: "deepseek-r1:14b",  label: "DeepSeek 14B", size: "8GB",  speed: "🔍 Reason", color: "#0e7490", tag: "DS" },
  { name: "qwen2.5:7b",       label: "Qwen 2.5",     size: "4GB",  speed: "⚡ Fast",   color: "#059669", tag: "ALI" },
  { name: "qwen2.5:72b",      label: "Qwen 2.5 72B", size: "41GB", speed: "🧠 Smart",  color: "#047857", tag: "ALI" },
  { name: "mistral:7b",       label: "Mistral",      size: "4GB",  speed: "⚡ Fast",   color: "#b45309", tag: "MIS" },
  { name: "phi3:mini",        label: "Phi-3 Mini",   size: "2GB",  speed: "⚡ Tiny",   color: "#be185d", tag: "MS" },
  { name: "gemma2:2b",        label: "Gemma 2",      size: "1.6GB",speed: "⚡ Tiny",   color: "#dc2626", tag: "GOO" },
  { name: "codellama:13b",    label: "CodeLlama",    size: "7GB",  speed: "💻 Code",   color: "#9333ea", tag: "META" },
  { name: "vicuna:13b",       label: "Vicuna",       size: "7GB",  speed: "💬 Chat",   color: "#ea580c", tag: "LMSYS" },
  { name: "neural-chat:7b",   label: "NeuralChat",   size: "4GB",  speed: "💬 Chat",   color: "#0f766e", tag: "INTEL" },
];

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

/* ── Three.js Neural Core Scene ─────────────────────────────── */
function useNeuralScene(canvasRef: React.RefObject<HTMLCanvasElement | null>, modelCount: number) {
  const sceneRef   = useRef<THREE.Scene | null>(null);
  const rendererRef= useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef  = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef   = useRef<number>(0);
  const ringsRef   = useRef<THREE.Mesh[]>([]);
  const nodesRef   = useRef<THREE.Mesh[]>([]);
  const coreRef    = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const timeRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth || 600;
    const H = canvas.clientHeight || 400;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 2, 7);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    /* ── Ambient + point lights ── */
    scene.add(new THREE.AmbientLight(0x111133, 2));
    const pL1 = new THREE.PointLight(0x7c3aed, 80, 20);
    pL1.position.set(0, 4, 0);
    scene.add(pL1);
    const pL2 = new THREE.PointLight(0x00e5ff, 40, 15);
    pL2.position.set(-4, -2, 2);
    scene.add(pL2);
    const pL3 = new THREE.PointLight(0xff2079, 30, 15);
    pL3.position.set(4, -2, -2);
    scene.add(pL3);

    /* ── Neural core ── */
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed, emissive: 0x4c1d95, emissiveIntensity: 2,
      metalness: 0.8, roughness: 0.2, wireframe: false,
    });
    const coreGeo = new THREE.IcosahedronGeometry(0.8, 2);
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);
    coreRef.current = core;

    /* ── Orbital rings ── */
    const ringColors = [0x7c3aed, 0x00e5ff, 0x00ff88, 0xff2079, 0xffaa00, 0xff6600, 0xff0000];
    const ringData = [
      { radius: 1.5, tilt: 0, speed: 0.012 },
      { radius: 2.1, tilt: Math.PI * 0.3, speed: -0.008 },
      { radius: 2.7, tilt: Math.PI * 0.6, speed: 0.006 },
      { radius: 3.2, tilt: Math.PI * 0.15, speed: -0.005 },
      { radius: 3.7, tilt: Math.PI * 0.45, speed: 0.004 },
      { radius: 4.1, tilt: Math.PI * 0.75, speed: -0.003 },
      { radius: 4.5, tilt: Math.PI * 0.9, speed: 0.007 },
    ];

    ringsRef.current = [];
    ringData.forEach((rd, i) => {
      const geo = new THREE.TorusGeometry(rd.radius, 0.015, 8, 80);
      const mat = new THREE.MeshStandardMaterial({
        color: ringColors[i % ringColors.length],
        emissive: ringColors[i % ringColors.length],
        emissiveIntensity: 1.5, metalness: 1, roughness: 0,
        transparent: true, opacity: i < modelCount ? 0.9 : 0.25,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = rd.tilt;
      (ring as any).userData = { speed: rd.speed, active: i < modelCount };
      scene.add(ring);
      ringsRef.current.push(ring);
    });

    /* ── Node spheres on each ring ── */
    nodesRef.current = [];
    ringsRef.current.forEach((ring, ri) => {
      const nodeCount = 4 + ri;
      for (let n = 0; n < nodeCount; n++) {
        const angle = (n / nodeCount) * Math.PI * 2;
        const rd = ringData[ri];
        const nodeMat = new THREE.MeshStandardMaterial({
          color: ringColors[ri % ringColors.length],
          emissive: ringColors[ri % ringColors.length],
          emissiveIntensity: 2,
          transparent: true,
          opacity: ri < modelCount ? 1 : 0.2,
        });
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), nodeMat);
        node.position.set(
          Math.cos(angle) * rd.radius,
          0,
          Math.sin(angle) * rd.radius,
        );
        (node as any).userData = { ring: ri, angle, radius: rd.radius, active: ri < modelCount };
        scene.add(node);
        nodesRef.current.push(node);
      }
    });

    /* ── Particle field ── */
    const pCount = 800;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i++) pPositions[i] = (Math.random() - 0.5) * 20;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x7c3aed, size: 0.03, transparent: true, opacity: 0.4 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    particlesRef.current = particles;

    /* ── Grid plane ── */
    const gridHelper = new THREE.GridHelper(20, 30, 0x1a0533, 0x1a0533);
    gridHelper.position.y = -3;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    scene.add(gridHelper);

    /* ── Animation loop ── */
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;
      const t = timeRef.current;

      if (coreRef.current) {
        coreRef.current.rotation.x = t * 0.3;
        coreRef.current.rotation.y = t * 0.5;
        const pulse = 1 + Math.sin(t * 2) * 0.05;
        coreRef.current.scale.setScalar(pulse);
      }

      ringsRef.current.forEach((ring, i) => {
        const ud = (ring as any).userData;
        ring.rotation.z += ud.speed;
      });

      nodesRef.current.forEach((node) => {
        const ud = (node as any).userData;
        const ri = ud.ring;
        const ringMesh = ringsRef.current[ri];
        if (!ringMesh) return;
        const newAngle = ud.angle + t * Math.abs(ringData[ri].speed) * 60;
        const rd = ringData[ri];
        const localPos = new THREE.Vector3(
          Math.cos(newAngle) * rd.radius,
          0,
          Math.sin(newAngle) * rd.radius,
        );
        localPos.applyEuler(ringMesh.rotation);
        node.position.copy(localPos);
        if (ud.active) {
          const s = 1 + Math.sin(t * 3 + ri) * 0.3;
          node.scale.setScalar(s);
        }
      });

      if (particlesRef.current) {
        particlesRef.current.rotation.y = t * 0.02;
        particlesRef.current.rotation.x = t * 0.01;
      }

      camera.position.x = Math.sin(t * 0.1) * 0.5;
      camera.position.y = 2 + Math.sin(t * 0.07) * 0.3;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      const W2 = canvas.clientWidth;
      const H2 = canvas.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  /* Update ring opacity when model count changes */
  useEffect(() => {
    ringsRef.current.forEach((ring, i) => {
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.opacity = i < modelCount ? 0.9 : 0.2;
      mat.emissiveIntensity = i < modelCount ? 1.5 : 0.3;
      mat.needsUpdate = true;
    });
    nodesRef.current.forEach((node) => {
      const ud = (node as any).userData;
      const mat = node.material as THREE.MeshStandardMaterial;
      const active = ud.ring < modelCount;
      mat.opacity = active ? 1 : 0.15;
      mat.emissiveIntensity = active ? 2 : 0.2;
      mat.needsUpdate = true;
      (node as any).userData.active = active;
    });
  }, [modelCount]);
}

/* ── Main Component ─────────────────────────────────────────── */
export function OllamaHub3D({ open, onClose }: OllamaHubProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<"installed" | "library" | "chat" | "hf">("installed");
  const [status, setStatus] = useState<OllamaStatus>({ running: false, models: [], version: null });
  const [running, setRunning] = useState<RunningModel[]>([]);
  const [pulling, setPulling] = useState<Record<string, number>>({});
  const [pullLog, setPullLog]  = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [chatModel, setChatModel] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [hfUrl, setHfUrl] = useState(() => localStorage.getItem("ollama-hf-url") || "");
  const [hfKey, setHfKey] = useState(() => localStorage.getItem("ollama-hf-key") || "");

  useNeuralScene(canvasRef, status.models.length);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/ollama/status");
      const d = await r.json() as OllamaStatus;
      setStatus(d);
      if (d.running) {
        const ps = await fetch("/api/ollama/ps");
        const pd = await ps.json() as { models?: RunningModel[] };
        setRunning(pd.models ?? []);
        if (d.models[0] && !chatModel) setChatModel(d.models[0].name);
      }
    } catch { /* offline */ }
  }, [chatModel]);

  useEffect(() => {
    if (!open) return;
    fetchStatus();
    const iv = setInterval(fetchStatus, 8000);
    return () => clearInterval(iv);
  }, [open, fetchStatus]);

  const handleInstall = async () => {
    setInstalling(true);
    setInstallLog([]);
    setTab("installed");
    try {
      const r = await fetch("/api/ollama/install", { method: "POST" });
      if (!r.body) return;
      const reader  = r.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data:"));
        for (const line of lines) {
          try {
            const d = JSON.parse(line.slice(5));
            if (d.msg)  setInstallLog(p => [...p, d.msg]);
            if (d.done) { await fetchStatus(); }
          } catch { /* skip */ }
        }
      }
    } finally {
      setInstalling(false);
    }
  };

  const handlePull = async (modelName: string) => {
    setPulling(p => ({ ...p, [modelName]: 0 }));
    setPullLog(p => ({ ...p, [modelName]: "Starting..." }));
    try {
      const r = await fetch("/api/ollama/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelName }),
      });
      if (!r.body) return;
      const reader  = r.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data:"));
        for (const line of lines) {
          try {
            const d = JSON.parse(line.slice(5));
            if (d.total && d.completed) {
              const pct = Math.round((d.completed / d.total) * 100);
              setPulling(p => ({ ...p, [modelName]: pct }));
            }
            if (d.status) setPullLog(p => ({ ...p, [modelName]: d.status }));
          } catch { /* skip */ }
        }
      }
    } finally {
      setPulling(p => { const n = { ...p }; delete n[modelName]; return n; });
      await fetchStatus();
    }
  };

  const handleDelete = async (modelName: string) => {
    await fetch("/api/ollama/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName }),
    });
    await fetchStatus();
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !chatModel || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const r = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: chatModel, messages: newHistory }),
      });
      const d = await r.json() as { message?: { content?: string } };
      setChatHistory(h => [...h, { role: "assistant", content: d.message?.content ?? "..." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const saveHfConfig = () => {
    localStorage.setItem("ollama-hf-url", hfUrl);
    localStorage.setItem("ollama-hf-key", hfKey);
  };

  if (!open) return null;

  const installedNames = new Set(status.models.map(m => m.name));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "radial-gradient(ellipse at center, #0d0015 0%, #000008 60%, #000000 100%)" }}
    >
      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-violet-900/40"
           style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-7 h-7 text-violet-400" />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-violet-500/30"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              OLLAMA NEURAL HUB
            </h1>
            <p className="text-[10px] font-mono text-violet-400/60 tracking-[0.3em]">
              LOCAL AI MODEL COMMAND CENTER
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {status.running ? (
              <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-emerald-400">ONLINE v{status.version}</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40">
                <WifiOff className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-mono text-red-400">OFFLINE</span>
              </div>
            )}
            <div className="px-2 py-0.5 rounded-full bg-violet-950/60 border border-violet-500/30 text-[10px] font-mono text-violet-400">
              {status.models.length} MODELS · {running.length} ACTIVE
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStatus}
            className="p-1.5 rounded-lg border border-violet-800/40 text-violet-400 hover:bg-violet-900/20 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          {!status.running && (
            <button onClick={handleInstall} disabled={installing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50">
              {installing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {installing ? "INSTALLING..." : "INSTALL OLLAMA"}
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: 3D Scene ── */}
        <div className="relative w-[42%] flex-shrink-0 hidden lg:flex flex-col">
          <canvas ref={canvasRef} className="w-full h-full" style={{ background: "transparent" }} />

          {/* Overlay stats */}
          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
            {[
              { icon: <Server className="w-3.5 h-3.5" />, label: "MODELS",  value: status.models.length, color: "violet" },
              { icon: <Cpu    className="w-3.5 h-3.5" />, label: "ACTIVE",  value: running.length,       color: "cyan" },
              { icon: <HardDrive className="w-3.5 h-3.5"/>,label: "STORAGE",
                value: status.models.reduce((a, m) => a + (m.size || 0), 0) > 0
                  ? formatSize(status.models.reduce((a, m) => a + (m.size || 0), 0))
                  : "0 GB",
                color: "emerald" },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-${color}-800/40 bg-black/60 backdrop-blur-sm`}>
                <span className={`text-${color}-400`}>{icon}</span>
                <div>
                  <div className={`text-sm font-black text-${color}-300`}>{value}</div>
                  <div className={`text-[9px] font-mono text-${color}-500`}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Ring legend */}
          <div className="absolute top-4 left-4 space-y-1">
            {status.models.slice(0, 7).map((m, i) => {
              const colors = ["#7c3aed","#00e5ff","#00ff88","#ff2079","#ffaa00","#ff6600","#ff0000"];
              return (
                <motion.div key={m.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i], boxShadow: `0 0 6px ${colors[i]}` }} />
                  <span className="text-[10px] font-mono text-white/70">{m.name.split(":")[0]}</span>
                  <span className="text-[8px] font-mono text-white/40">{m.details?.parameter_size || ""}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Control Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-violet-900/30"
             style={{ background: "rgba(5,0,20,0.85)", backdropFilter: "blur(20px)" }}>

          {/* Tabs */}
          <div className="flex border-b border-violet-900/30 px-4 pt-3">
            {(["installed","library","chat","hf"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-bold tracking-widest rounded-t-lg transition-all mr-1 ${
                  tab === t
                    ? "bg-violet-900/40 text-violet-300 border-x border-t border-violet-600/40"
                    : "text-violet-500/60 hover:text-violet-300"
                }`}>
                {t === "installed" ? "🧠 INSTALLED" : t === "library" ? "📦 LIBRARY" : t === "chat" ? "💬 CHAT" : "☁️ HF SPACES"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* ══ INSTALLED TAB ══ */}
            {tab === "installed" && (
              <>
                {installLog.length > 0 && (
                  <div className="rounded-xl border border-violet-700/30 bg-black/40 p-3 font-mono text-xs space-y-0.5 max-h-32 overflow-y-auto">
                    {installLog.map((l, i) => <div key={i} className="text-emerald-400">{l}</div>)}
                  </div>
                )}

                {!status.running && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="relative">
                      <WifiOff className="w-16 h-16 text-violet-800" />
                      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full bg-violet-500/10" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-violet-300">Ollama Not Running</p>
                      <p className="text-sm text-violet-500/60 mt-1">Install Ollama to run local AI models</p>
                      <p className="text-xs text-violet-600/40 mt-2">⚠️ Requires ~4GB+ RAM per model. GPU recommended for large models.</p>
                    </div>
                    <button onClick={handleInstall} disabled={installing}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-violet-900/50">
                      {installing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {installing ? "Installing..." : "Install & Start Ollama"}
                    </button>
                  </motion.div>
                )}

                {status.running && status.models.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Brain className="w-12 h-12 text-violet-700" />
                    <p className="text-violet-300 font-bold">No models installed</p>
                    <p className="text-sm text-violet-500/60">Go to Library tab to pull a model</p>
                  </div>
                )}

                {status.models.map((model, idx) => {
                  const isActive = running.some(r => r.name === model.name || r.model === model.name);
                  const colors = ["#7c3aed","#00e5ff","#00ff88","#ff2079","#ffaa00","#ff6600","#ff0000"];
                  const color  = colors[idx % colors.length];
                  return (
                    <motion.div key={model.name}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      className="relative rounded-xl border overflow-hidden group"
                      style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)` }}>
                      {/* Active glow */}
                      {isActive && (
                        <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: `radial-gradient(ellipse at left, ${color}15 0%, transparent 70%)` }} />
                      )}
                      <div className="flex items-center gap-3 p-3">
                        {/* Status dot */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: isActive ? "#00ff88" : color, boxShadow: `0 0 8px ${isActive ? "#00ff88" : color}` }} />
                          {isActive && <motion.div animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 rounded-full" style={{ backgroundColor: "#00ff88" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">{model.name}</span>
                            {isActive && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-900/60 text-emerald-400 border border-emerald-700/40">RUNNING</span>}
                          </div>
                          <div className="flex gap-3 mt-0.5 text-[10px] font-mono text-white/40">
                            <span>{formatSize(model.size)}</span>
                            {model.details?.parameter_size && <span>{model.details.parameter_size}</span>}
                            {model.details?.quantization_level && <span>{model.details.quantization_level}</span>}
                            {model.details?.family && <span className="capitalize">{model.details.family}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setChatModel(model.name); setTab("chat"); }}
                            className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-900/30 transition-all" title="Chat">
                            <Terminal className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(model.name)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-all" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}

            {/* ══ LIBRARY TAB ══ */}
            {tab === "library" && (
              <>
                <div className="text-[10px] font-mono text-violet-500/60 tracking-widest pb-1 border-b border-violet-900/30">
                  ⚠️ REPLIT FREE TIER: Small models only (≤7B Q4). Large models need 16-40GB RAM + GPU.
                </div>
                {AVAILABLE_MODELS.map((m, idx) => {
                  const installed = installedNames.has(m.name);
                  const isPulling  = m.name in pulling;
                  const pct        = pulling[m.name] ?? 0;
                  const log        = pullLog[m.name] ?? "";
                  return (
                    <motion.div key={m.name}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      className="rounded-xl border p-3 group transition-all"
                      style={{ borderColor: `${m.color}30`, background: `linear-gradient(135deg, ${m.color}06 0%, transparent 100%)` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border"
                          style={{ borderColor: `${m.color}60`, backgroundColor: `${m.color}15`, color: m.color }}>
                          {m.tag}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{m.label}</span>
                            <span className="text-[9px] font-mono text-white/40">{m.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] font-mono" style={{ color: m.color }}>{m.size}</span>
                            <span className="text-[10px] text-white/40">{m.speed}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {installed ? (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/40">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span className="text-[10px] font-bold text-emerald-400">INSTALLED</span>
                            </div>
                          ) : isPulling ? (
                            <div className="flex items-center gap-1.5 min-w-[100px]">
                              <div className="flex-1 h-1.5 rounded-full bg-violet-900/60 overflow-hidden">
                                <motion.div animate={{ width: `${pct}%` }} className="h-full rounded-full bg-violet-400" />
                              </div>
                              <span className="text-[10px] font-mono text-violet-400">{pct}%</span>
                            </div>
                          ) : (
                            <button onClick={() => handlePull(m.name)} disabled={!status.running}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                              style={{ backgroundColor: `${m.color}20`, borderWidth: 1, borderColor: `${m.color}40`, color: m.color }}>
                              <Download className="w-3 h-3" />
                              PULL
                            </button>
                          )}
                        </div>
                      </div>
                      {isPulling && log && (
                        <div className="mt-2 text-[9px] font-mono text-violet-400/60 truncate">{log}</div>
                      )}
                    </motion.div>
                  );
                })}
              </>
            )}

            {/* ══ CHAT TAB ══ */}
            {tab === "chat" && (
              <div className="flex flex-col h-full gap-3">
                <div className="flex items-center gap-2">
                  <select value={chatModel} onChange={e => setChatModel(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-violet-950/40 border border-violet-700/40 text-violet-200 text-xs font-mono focus:outline-none focus:border-violet-500">
                    {status.models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                  <button onClick={() => setChatHistory([])}
                    className="px-2 py-1.5 rounded-lg border border-violet-700/40 text-violet-400 hover:bg-violet-900/30 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[400px] pr-1">
                  {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center opacity-40">
                      <Brain className="w-8 h-8 text-violet-600" />
                      <p className="text-xs text-violet-400">Start a conversation with {chatModel || "a local model"}</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-violet-700/40 text-violet-100 border border-violet-600/30"
                          : "bg-black/40 text-emerald-100 border border-emerald-800/30"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="px-3 py-2 rounded-xl bg-black/40 border border-emerald-800/30">
                        <div className="flex gap-1">
                          {[0,1,2].map(i => (
                            <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i*0.3 }}
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
                    placeholder={status.running && chatModel ? `Message ${chatModel}...` : "Ollama not running..."}
                    disabled={!status.running || !chatModel}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-violet-700/40 text-violet-100 text-xs placeholder-violet-700 focus:outline-none focus:border-violet-500 disabled:opacity-40" />
                  <button onClick={handleChat} disabled={!status.running || !chatModel || chatLoading}
                    className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ══ HF SPACES TAB ══ */}
            {tab === "hf" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-violet-700/30 bg-violet-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-bold text-violet-300">HuggingFace Spaces — Remote Ollama</span>
                  </div>
                  <p className="text-xs text-violet-500/70">
                    Run Ollama on HuggingFace with GPU acceleration for free. Your Space runs 24/7 and connects to your phone via API.
                  </p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-violet-400/60">YOUR SPACE URL</label>
                    <input value={hfUrl} onChange={e => setHfUrl(e.target.value)}
                      placeholder="https://username-space-name.hf.space"
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-violet-700/40 text-violet-200 text-xs font-mono placeholder-violet-800 focus:outline-none focus:border-violet-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-violet-400/60">API KEY (optional)</label>
                    <input value={hfKey} onChange={e => setHfKey(e.target.value)} type="password"
                      placeholder="your-secret-key"
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-violet-700/40 text-violet-200 text-xs font-mono placeholder-violet-800 focus:outline-none focus:border-violet-500" />
                  </div>
                  <button onClick={saveHfConfig}
                    className="w-full py-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold transition-all">
                    SAVE & CONNECT
                  </button>
                </div>

                <div className="rounded-xl border border-cyan-800/30 bg-cyan-950/10 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-cyan-300">📦 Setup Instructions</h3>
                  <div className="space-y-2 text-xs text-cyan-400/70 font-mono">
                    {[
                      "1. Go to huggingface.co/spaces → New Space",
                      "2. Choose Docker SDK, enable GPU (T4 free tier)",
                      "3. Upload files from hf-spaces/ folder in your project",
                      "4. Add API_KEY secret in Space Settings",
                      "5. Set PRELOAD_MODELS=llama3.2:3b in Space env vars",
                      "6. Copy your Space URL and paste it above",
                    ].map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-cyan-500" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/10 p-4 space-y-2">
                  <h3 className="text-xs font-bold text-emerald-300">📱 Mobile API Access</h3>
                  <div className="text-[10px] font-mono text-emerald-400/60 space-y-1">
                    <div>GET  {hfUrl || "https://your-space.hf.space"}/api/tags</div>
                    <div>POST {hfUrl || "https://your-space.hf.space"}/api/chat</div>
                    <div>POST {hfUrl || "https://your-space.hf.space"}/api/generate</div>
                  </div>
                  <p className="text-[10px] text-emerald-500/50">Add Authorization: Bearer {hfKey ? "***" : "<key>"} header</p>
                </div>

                <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-4">
                  <h3 className="text-xs font-bold text-amber-300 mb-2">⚡ Recommended Free Models for HF</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["llama3.2:3b (2GB)","qwen2.5:7b (4GB)","mistral:7b (4GB)","phi3:mini (2GB)"].map(m => (
                      <div key={m} className="px-2 py-1 rounded bg-amber-950/40 border border-amber-800/20 text-[10px] font-mono text-amber-300">{m}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Ambient bottom scan line ── */}
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, #7c3aed 50%, transparent 100%)" }}
      />
    </motion.div>
  );
}
