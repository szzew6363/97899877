import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import {
  X, Brain, Terminal, Zap, Database, Activity, Cpu, Network,
  Play, Square, RefreshCw, ChevronRight, Layers, GitBranch,
  Eye, Shield, Target, Lightbulb, TrendingUp, Clock, AlertCircle,
  CheckCircle2, Circle, ArrowRight, Workflow, Bot, Sparkles,
  MemoryStick, Gauge, Settings2, BookOpen, FlaskConical, Infinity,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type EngineTab = "decision" | "resources" | "terminal" | "learning" | "pipeline" | "autonomous";

interface DecisionNode {
  id: string; label: string; type: "root" | "branch" | "leaf";
  confidence: number; children?: string[]; color: string;
}

interface LogEntry { id: number; time: string; type: "info"|"success"|"warn"|"error"|"ai"; text: string; }
interface LearningEntry { id: number; input: string; output: string; confidence: number; timestamp: number; }
interface ResourceItem { name: string; used: number; total: number; color: string; unit: string; }
interface PipelineStep { id: number; label: string; status: "idle"|"running"|"done"|"error"; duration?: number; }

let _lid = 0;
const mkLog = (type: LogEntry["type"], text: string): LogEntry => ({
  id: _lid++, time: new Date().toLocaleTimeString("en-US", { hour12: false }),
  type, text,
});

const DECISION_NODES: DecisionNode[] = [
  { id: "root",     label: "INPUT ANALYSIS",     type: "root",   confidence: 98, children: ["intent","context","risk"], color: "#e21227" },
  { id: "intent",   label: "INTENT PARSER",       type: "branch", confidence: 94, children: ["classify","route"],       color: "#8b5cf6" },
  { id: "context",  label: "CONTEXT ENGINE",      type: "branch", confidence: 91, children: ["memory","pattern"],       color: "#3b82f6" },
  { id: "risk",     label: "RISK ASSESSOR",        type: "branch", confidence: 87, children: ["permit","block"],        color: "#f59e0b" },
  { id: "classify", label: "TASK CLASSIFIER",      type: "leaf",   confidence: 96, color: "#10b981" },
  { id: "route",    label: "ACTION ROUTER",        type: "leaf",   confidence: 93, color: "#10b981" },
  { id: "memory",   label: "MEMORY RECALL",        type: "leaf",   confidence: 89, color: "#06b6d4" },
  { id: "pattern",  label: "PATTERN MATCH",        type: "leaf",   confidence: 92, color: "#06b6d4" },
  { id: "permit",   label: "EXEC PERMIT",          type: "leaf",   confidence: 99, color: "#10b981" },
  { id: "block",    label: "THREAT BLOCK",         type: "leaf",   confidence: 97, color: "#e21227" },
];

const INITIAL_RESOURCES: ResourceItem[] = [
  { name: "Neural Memory",   used: 6.2,  total: 16,   color: "#8b5cf6", unit: "GB"  },
  { name: "CPU Threads",     used: 11,   total: 16,   color: "#3b82f6", unit: "cores" },
  { name: "Decision Cache",  used: 2847, total: 4096, color: "#10b981", unit: "MB"  },
  { name: "Context Window",  used: 87,   total: 128,  color: "#f59e0b", unit: "K"   },
  { name: "Learning Buffer", used: 1.4,  total: 4,    color: "#e21227", unit: "GB"  },
  { name: "Inference Queue", used: 3,    total: 32,   color: "#06b6d4", unit: "tasks" },
];

const INIT_STEPS: PipelineStep[] = [
  { id: 1, label: "Parse user intent",         status: "idle" },
  { id: 2, label: "Load context memory",       status: "idle" },
  { id: 3, label: "Evaluate decision tree",    status: "idle" },
  { id: 4, label: "Risk assessment",           status: "idle" },
  { id: 5, label: "Select optimal strategy",  status: "idle" },
  { id: 6, label: "Execute & stream output",  status: "idle" },
];

const SAMPLE_CMDS = [
  "analyze --target=neural --depth=full",
  "decision-tree --visualize --confidence=0.9",
  "memory --recall=recent --limit=50",
  "pipeline --run=full --parallel=true",
  "learn --mode=adaptive --feedback=auto",
  "scan --resources --realtime",
  "autonomous --task=\"optimize all subsystems\" --auto",
];

// ── Three.js Neural Brain Scene ───────────────────────────────────────────────
function NeuralBrainCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const sceneRef  = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    nodes: THREE.Mesh[];
    lines: THREE.LineSegments;
    particles: THREE.Points;
    brain: THREE.Group;
    t: number;
  } | null>(null);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const W = cv.clientWidth || 420, H = cv.clientHeight || 300;

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500);
    camera.position.set(0, 0, 28);

    // Ambient + point lights
    scene.add(new THREE.AmbientLight(0xe21227, 0.15));
    const pl1 = new THREE.PointLight(0xe21227, 2.5, 60); pl1.position.set(8, 8, 8); scene.add(pl1);
    const pl2 = new THREE.PointLight(0x8b5cf6, 1.8, 50); pl2.position.set(-8, -5, 5); scene.add(pl2);
    const pl3 = new THREE.PointLight(0x06b6d4, 1.5, 40); pl3.position.set(0, 10, -10); scene.add(pl3);

    const brain = new THREE.Group();

    // Generate neural nodes on a sphere surface
    const NODE_COUNT = 60;
    const nodeMeshes: THREE.Mesh[] = [];
    const nodePositions: THREE.Vector3[] = [];
    const COLORS = [0xe21227, 0x8b5cf6, 0x3b82f6, 0x10b981, 0x06b6d4, 0xf59e0b];

    const nodeGeo = new THREE.SphereGeometry(0.22, 8, 8);
    for (let i = 0; i < NODE_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / NODE_COUNT);
      const theta = Math.sqrt(NODE_COUNT * Math.PI) * phi;
      const r = 8 + Math.sin(i * 0.4) * 2.5;
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
      nodePositions.push(pos);
      const mat = new THREE.MeshPhongMaterial({
        color: COLORS[i % COLORS.length],
        emissive: COLORS[i % COLORS.length],
        emissiveIntensity: 0.4,
        transparent: true, opacity: 0.85,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.copy(pos);
      nodeMeshes.push(mesh);
      brain.add(mesh);
    }

    // Build edges between nearby nodes
    const edgePts: number[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 5.5) {
          edgePts.push(
            nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
            nodePositions[j].x, nodePositions[j].y, nodePositions[j].z,
          );
        }
      }
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePts, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xe21227, transparent: true, opacity: 0.12 });
    const lines = new THREE.LineSegments(edgeGeo, edgeMat);
    brain.add(lines);

    // Outer ring / halo
    const ringGeo = new THREE.TorusGeometry(10.5, 0.08, 6, 80);
    const ringMat = new THREE.MeshPhongMaterial({ color: 0xe21227, emissive: 0xe21227, emissiveIntensity: 0.6, transparent: true, opacity: 0.4 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat); ring1.rotation.x = Math.PI / 2; brain.add(ring1);
    const ring2 = new THREE.Mesh(ringGeo, ringMat.clone()); ring2.rotation.x = Math.PI / 4; ring2.rotation.y = Math.PI / 3; brain.add(ring2);

    // Core sphere
    const coreGeo = new THREE.SphereGeometry(2.5, 32, 32);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0xe21227, emissive: 0xe21227, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.18, wireframe: false,
    });
    brain.add(new THREE.Mesh(coreGeo, coreMat));

    // Wire sphere overlay
    const wireGeo = new THREE.SphereGeometry(9.5, 16, 12);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xe21227, wireframe: true, transparent: true, opacity: 0.04 });
    brain.add(new THREE.Mesh(wireGeo, wireMat));

    // Floating particles
    const partCount = 280;
    const partPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount; i++) {
      partPos[i * 3]     = (Math.random() - 0.5) * 36;
      partPos[i * 3 + 1] = (Math.random() - 0.5) * 36;
      partPos[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute("position", new THREE.Float32BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ color: 0xe21227, size: 0.1, transparent: true, opacity: 0.35 });
    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    scene.add(brain);

    sceneRef.current = { renderer, scene, camera, nodes: nodeMeshes, lines, particles, brain, t: 0 };

    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      if (!sceneRef.current) return;
      const s = sceneRef.current;
      s.t += active ? 0.008 : 0.002;

      // Rotate brain slowly
      s.brain.rotation.y = s.t * 0.35;
      s.brain.rotation.x = Math.sin(s.t * 0.18) * 0.15;

      // Pulse nodes
      s.nodes.forEach((n, i) => {
        const scale = 1 + 0.35 * Math.abs(Math.sin(s.t * 1.8 + i * 0.28));
        n.scale.setScalar(scale);
        (n.material as THREE.MeshPhongMaterial).emissiveIntensity = active
          ? 0.3 + 0.5 * Math.abs(Math.sin(s.t * 2.2 + i * 0.3))
          : 0.15;
      });

      // Pulse ring
      (ring1.material as THREE.MeshPhongMaterial).opacity = 0.2 + 0.3 * Math.abs(Math.sin(s.t * 1.5));
      ring1.rotation.z = s.t * 0.4;
      ring2.rotation.z = -s.t * 0.3;

      // Particles drift
      s.particles.rotation.y = s.t * 0.06;
      s.particles.rotation.x = s.t * 0.03;

      // Pulse edge opacity
      (s.lines.material as THREE.LineBasicMaterial).opacity = active
        ? 0.08 + 0.1 * Math.abs(Math.sin(s.t * 0.9))
        : 0.05;

      // Camera subtle orbit
      s.camera.position.x = Math.sin(s.t * 0.12) * 3;
      s.camera.position.y = Math.cos(s.t * 0.09) * 2;
      s.camera.lookAt(0, 0, 0);

      s.renderer.render(s.scene, s.camera);
    }
    animate();

    const obs = new ResizeObserver(() => {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (w && h && sceneRef.current) {
        sceneRef.current.renderer.setSize(w, h);
        sceneRef.current.camera.aspect = w / h;
        sceneRef.current.camera.updateProjectionMatrix();
      }
    });
    obs.observe(cv);

    return () => {
      cancelAnimationFrame(rafRef.current);
      obs.disconnect();
      renderer.dispose();
    };
  }, []);

  useEffect(() => { /* active state flows into animate closure */ }, [active]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />;
}

// ── Decision Tree Visualizer ──────────────────────────────────────────────────
function DecisionTreeViz({ activeNode }: { activeNode: string | null }) {
  const layers = [
    ["root"],
    ["intent", "context", "risk"],
    ["classify", "route", "memory", "pattern", "permit", "block"],
  ];

  const nodeMap = Object.fromEntries(DECISION_NODES.map(n => [n.id, n]));

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {layers.map((layer, li) => (
        <div key={li} className="flex gap-3 flex-wrap justify-center">
          {layer.map(id => {
            const n = nodeMap[id];
            const isActive = activeNode === id;
            return (
              <motion.div
                key={id}
                animate={{ scale: isActive ? 1.1 : 1, opacity: 1 }}
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: li * 0.1 + layer.indexOf(id) * 0.05 }}
                className="relative flex flex-col items-center gap-1"
              >
                <div
                  className="px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold tracking-wider transition-all duration-300"
                  style={{
                    borderColor: isActive ? n.color : n.color + "55",
                    background: isActive ? n.color + "22" : "rgba(0,0,0,0.4)",
                    color: n.color,
                    boxShadow: isActive ? `0 0 16px ${n.color}88` : "none",
                  }}
                >
                  {n.label}
                </div>
                <div className="text-[9px] font-mono" style={{ color: n.color + "99" }}>
                  {n.confidence}%
                </div>
                {isActive && (
                  <motion.div
                    className="absolute -inset-1 rounded-lg pointer-events-none"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ border: `1px solid ${n.color}`, boxShadow: `0 0 12px ${n.color}66` }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Resource Gauge ────────────────────────────────────────────────────────────
function ResourceBar({ item, animated }: { item: ResourceItem; animated: boolean }) {
  const [pct, setPct] = useState(0);
  const target = Math.round((item.used / item.total) * 100);

  useEffect(() => {
    if (!animated) { setPct(target); return; }
    let v = 0;
    const iv = setInterval(() => { v = Math.min(v + 2, target); setPct(v); if (v >= target) clearInterval(iv); }, 16);
    return () => clearInterval(iv);
  }, [animated, target]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-mono">
        <span style={{ color: item.color }}>{item.name}</span>
        <span className="text-muted-foreground">{item.used}/{item.total} {item.unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ background: `linear-gradient(90deg, ${item.color}88, ${item.color})` }}
        />
      </div>
      <div className="flex justify-end text-[9px] font-mono" style={{ color: item.color + "99" }}>
        {pct}%
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AutonomousDecisionEngineModal({ open, onOpenChange }: Props) {
  const [tab, setTab]           = useState<EngineTab>("decision");
  const [running, setRunning]   = useState(false);
  const [logs, setLogs]         = useState<LogEntry[]>([
    mkLog("info", "Neural Decision Engine v7.0 initialized"),
    mkLog("success", "All subsystems online — cognitive matrix loaded"),
    mkLog("ai", "Adaptive learning module active — 1,847 patterns cached"),
  ]);
  const [cliInput, setCliInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx]   = useState(-1);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>(INITIAL_RESOURCES);
  const [pipeline, setPipeline] = useState<PipelineStep[]>(INIT_STEPS);
  const [learningData, setLearningData] = useState<LearningEntry[]>([
    { id: 1, input: "port scan analysis",        output: "nmap -sV --open -T4",       confidence: 94, timestamp: Date.now() - 5000 },
    { id: 2, input: "vulnerability assessment",   output: "nuclei -t cves/ -severity critical", confidence: 89, timestamp: Date.now() - 3000 },
    { id: 3, input: "network topology mapping",  output: "masscan + nmap combined",   confidence: 97, timestamp: Date.now() - 1000 },
  ]);
  const [autonomousTask, setAutonomousTask] = useState("");
  const [autonomousLog, setAutonomousLog]   = useState<string[]>([]);
  const [engineScore, setEngineScore]       = useState({ decisions: 1847, accuracy: 96.4, speed: 142, uptime: 99.97 });
  const logRef = useRef<HTMLDivElement>(null);
  const cliRef = useRef<HTMLInputElement>(null);
  const autoLogRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((type: LogEntry["type"], text: string) => {
    setLogs(prev => [...prev.slice(-200), mkLog(type, text)]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (autoLogRef.current) autoLogRef.current.scrollTop = autoLogRef.current.scrollHeight;
  }, [autonomousLog]);

  // Live resource fluctuation
  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => {
      setResources(prev => prev.map(r => ({
        ...r,
        used: Math.max(r.total * 0.1, Math.min(r.total * 0.95, r.used + (Math.random() - 0.48) * (r.total * 0.04))),
      })));
      setEngineScore(prev => ({
        decisions: prev.decisions + Math.floor(Math.random() * 3),
        accuracy:  Math.min(99.9, Math.max(93, prev.accuracy + (Math.random() - 0.48) * 0.2)),
        speed:     Math.max(80, Math.min(240, prev.speed + (Math.random() - 0.5) * 8)),
        uptime:    prev.uptime,
      }));
    }, 1800);
    return () => clearInterval(iv);
  }, [open]);

  // Decision tree cycle animation
  useEffect(() => {
    if (!running) { setActiveNode(null); return; }
    const seq = ["root","intent","context","risk","classify","route","memory","pattern","permit","block",null];
    let idx = 0;
    timerRef.current = setInterval(() => {
      setActiveNode(seq[idx] ?? null);
      idx = (idx + 1) % seq.length;
    }, 600);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  // CLI command handler
  const handleCLI = useCallback((cmd: string) => {
    const trimmed = cmd.trim(); if (!trimmed) return;
    setCmdHistory(p => [trimmed, ...p.slice(0, 49)]);
    setHistIdx(-1);
    addLog("info", `$ ${trimmed}`);

    const lower = trimmed.toLowerCase();

    if (lower.includes("analyze") || lower.includes("scan")) {
      setRunning(true);
      addLog("ai", "Initiating deep analysis pipeline…");
      setTimeout(() => { addLog("success", "Analysis complete — 23 patterns identified, 4 anomalies flagged"); setRunning(false); }, 2200);
    } else if (lower.includes("decision-tree") || lower.includes("visualize")) {
      setTab("decision"); setRunning(true);
      addLog("ai", "Decision tree activated — cycling through nodes…");
      setTimeout(() => { setRunning(false); addLog("success", "Tree evaluation complete — confidence 96.4%"); }, 4000);
    } else if (lower.includes("memory") || lower.includes("recall")) {
      setTab("learning");
      addLog("success", "Memory recall: loaded 1,847 learning entries from adaptive buffer");
    } else if (lower.includes("pipeline")) {
      setTab("pipeline"); runPipeline();
    } else if (lower.includes("learn")) {
      setTab("learning");
      addLog("ai", "Adaptive learning cycle started — analyzing interaction patterns…");
      setLearningData(prev => [...prev, {
        id: prev.length + 1, input: trimmed,
        output: "auto-generated response", confidence: 80 + Math.floor(Math.random() * 18),
        timestamp: Date.now(),
      }]);
    } else if (lower.includes("resources")) {
      setTab("resources"); addLog("info", "Resource dashboard opened — monitoring 6 subsystems");
    } else if (lower.includes("autonomous")) {
      setTab("autonomous"); addLog("ai", "Autonomous mode engaged — preparing task decomposition engine…");
    } else if (lower === "help") {
      addLog("info", "Commands: analyze, decision-tree, memory, pipeline, learn, resources, autonomous, help, clear");
    } else if (lower === "clear") {
      setLogs([mkLog("info", "Console cleared"), mkLog("success", "Engine ready")]);
    } else if (lower.startsWith("set ")) {
      addLog("success", `Parameter updated: ${trimmed.slice(4)}`);
    } else {
      addLog("ai", `Processing: "${trimmed}" — routing to cognitive decision layer…`);
      setTimeout(() => addLog("success", `Executed: ${trimmed} — optimal strategy selected`), 800);
    }
  }, [addLog]);

  const runPipeline = useCallback(() => {
    setPipeline(INIT_STEPS.map(s => ({ ...s, status: "idle" })));
    let delay = 0;
    INIT_STEPS.forEach((step, i) => {
      const dur = 400 + Math.random() * 600;
      setTimeout(() => setPipeline(prev => prev.map(s => s.id === step.id ? { ...s, status: "running" } : s)), delay);
      delay += dur;
      setTimeout(() => setPipeline(prev => prev.map(s => s.id === step.id ? { ...s, status: "done", duration: Math.round(dur) } : s)), delay);
      delay += 80;
    });
    addLog("success", "Pipeline execution complete — all 6 stages processed");
  }, [addLog]);

  const runAutonomous = useCallback(() => {
    if (!autonomousTask.trim()) return;
    const task = autonomousTask.trim();
    setAutonomousLog([]);
    addLog("ai", `Autonomous engine received: "${task}"`);

    const steps = [
      `[INIT]    Parsing task: "${task}"`,
      `[PLAN]    Decomposing into sub-tasks…`,
      `[PLAN]    Sub-task 1: Gather relevant context`,
      `[PLAN]    Sub-task 2: Evaluate risk profile`,
      `[PLAN]    Sub-task 3: Select optimal execution strategy`,
      `[PLAN]    Sub-task 4: Prepare fallback alternatives`,
      `[EXEC]    Executing sub-task 1 — context retrieval…`,
      `[DATA]    Context loaded: 847 relevant entries matched`,
      `[EXEC]    Executing sub-task 2 — risk evaluation…`,
      `[RISK]    Risk score: LOW (0.12/1.0) — proceeding`,
      `[EXEC]    Executing sub-task 3 — strategy selection…`,
      `[STRAT]   Strategy: parallel execution with adaptive fallback`,
      `[EXEC]    Executing sub-task 4 — fallback preparation…`,
      `[FALLB]   3 fallback alternatives cached`,
      `[LEARN]   Updating adaptive model with task outcome…`,
      `[DONE]    ✓ Task completed successfully — outcome stored in learning buffer`,
    ];

    steps.forEach((line, i) => {
      setTimeout(() => setAutonomousLog(prev => [...prev, line]), i * 280);
    });

    setTimeout(() => {
      addLog("success", `Autonomous task completed: "${task}"`);
      setLearningData(prev => [...prev, {
        id: prev.length + 1, input: task,
        output: "autonomous execution — parallel strategy",
        confidence: 91 + Math.floor(Math.random() * 8), timestamp: Date.now(),
      }]);
    }, steps.length * 280 + 200);
  }, [autonomousTask, addLog]);

  const TABS: { id: EngineTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "decision",  label: "Decision Engine", icon: GitBranch },
    { id: "resources", label: "Resources",        icon: Database },
    { id: "terminal",  label: "CLI Interface",    icon: Terminal },
    { id: "learning",  label: "Adaptive Learning",icon: Brain },
    { id: "pipeline",  label: "Task Pipeline",    icon: Workflow },
    { id: "autonomous",label: "Autonomous Mode",  icon: Bot },
  ];

  const LOG_COLORS: Record<LogEntry["type"], string> = {
    info: "#94a3b8", success: "#10b981", warn: "#f59e0b", error: "#e21227", ai: "#8b5cf6",
  };
  const LOG_ICONS: Record<LogEntry["type"], React.FC<{ size?: number }>> = {
    info: Circle, success: CheckCircle2, warn: AlertCircle, error: AlertCircle, ai: Sparkles,
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-stretch justify-center"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="relative w-full max-w-[1440px] flex flex-col m-3 rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(226,18,39,0.25)", background: "rgba(6,6,10,0.97)" }}
        >
          {/* ── Scanline overlay ── */}
          <div className="pointer-events-none absolute inset-0 z-0"
            style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(226,18,39,0.012) 2px,rgba(226,18,39,0.012) 4px)" }} />

          {/* ── Top glow ── */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,#e21227,transparent)" }} />

          {/* ══ HEADER ════════════════════════════════════════════════════════ */}
          <div className="relative flex items-center gap-4 px-6 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#e21227,#8b5cf6)", boxShadow: "0 0 20px #e2122766" }}>
                  <Brain size={20} className="text-white" />
                </div>
                {running && (
                  <motion.div className="absolute -inset-1 rounded-xl border border-[#e21227]"
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} />
                )}
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.15em] text-white" style={{ fontFamily: "monospace" }}>
                  AUTONOMOUS DECISION ENGINE
                </div>
                <div className="text-[10px] font-mono text-[#e21227]/80 tracking-[0.2em]">
                  NEURAL AI · ADAPTIVE LEARNING · SELF-OPTIMIZING
                </div>
              </div>
            </div>

            {/* Live metrics */}
            <div className="ml-auto flex items-center gap-5">
              {[
                { label: "DECISIONS", value: engineScore.decisions.toLocaleString(), color: "#8b5cf6" },
                { label: "ACCURACY",  value: `${engineScore.accuracy.toFixed(1)}%`,    color: "#10b981" },
                { label: "SPEED",     value: `${engineScore.speed}ms`,                 color: "#3b82f6" },
                { label: "UPTIME",    value: `${engineScore.uptime}%`,                 color: "#e21227" },
              ].map(m => (
                <div key={m.label} className="flex flex-col items-center hidden sm:flex">
                  <motion.div className="text-base font-black font-mono" style={{ color: m.color }}
                    animate={{ opacity: [0.8, 1] }} transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}>
                    {m.value}
                  </motion.div>
                  <div className="text-[9px] font-mono text-muted-foreground tracking-widest">{m.label}</div>
                </div>
              ))}

              <button onClick={() => setRunning(r => !r)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                style={{ background: running ? "rgba(226,18,39,0.15)" : "rgba(16,185,129,0.15)", color: running ? "#e21227" : "#10b981", border: `1px solid ${running ? "#e21227" : "#10b981"}44` }}>
                {running ? <><Square size={12} />STOP</> : <><Play size={12} />RUN</>}
              </button>
              <button onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/8 transition-colors text-muted-foreground hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ══ BODY ══════════════════════════════════════════════════════════ */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ── Left: 3D Brain ─────────────────────────────────────────── */}
            <div className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col border-r border-white/5">
              <div className="flex-1 relative overflow-hidden">
                <NeuralBrainCanvas active={running} />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="text-[9px] font-mono text-center space-y-0.5">
                    <div className="text-[#e21227]/70 tracking-[0.2em]">NEURAL CORE ACTIVE</div>
                    <div className="text-muted-foreground">{DECISION_NODES.length} nodes · {running ? "PROCESSING" : "STANDBY"}</div>
                  </div>
                </div>
                {/* Pulse ring overlay */}
                {running && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <motion.div className="w-32 h-32 rounded-full border border-[#e21227]/30"
                      animate={{ scale: [1, 2.2], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
                  </div>
                )}
              </div>

              {/* Subsystem status */}
              <div className="p-3 border-t border-white/5 space-y-1.5">
                {[
                  { label: "Decision Matrix",  ok: true  },
                  { label: "Memory Bank",      ok: true  },
                  { label: "Learning Core",    ok: running },
                  { label: "Threat Assessor",  ok: true  },
                  { label: "Pipeline Engine",  ok: running },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span style={{ color: s.ok ? "#10b981" : "#94a3b8" }}>
                      {s.ok ? "● ONLINE" : "○ IDLE"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Tabs ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Tab bar */}
              <div className="flex gap-1 px-3 pt-2 pb-0 border-b border-white/5 overflow-x-auto shrink-0">
                {TABS.map(t => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-mono font-semibold tracking-wide whitespace-nowrap transition-all shrink-0"
                      style={{
                        background: active ? "rgba(226,18,39,0.1)" : "transparent",
                        color: active ? "#e21227" : "#64748b",
                        borderBottom: active ? "1px solid #e21227" : "1px solid transparent",
                      }}>
                      <Icon className="w-3 h-3" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-auto p-4 min-h-0">
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="h-full">

                    {/* ── DECISION ENGINE ─────────────────────────────────── */}
                    {tab === "decision" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-white font-mono">NEURAL DECISION MATRIX</div>
                            <div className="text-[11px] text-muted-foreground font-mono">Real-time cognitive processing tree</div>
                          </div>
                          <button onClick={() => setRunning(r => !r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all"
                            style={{ borderColor: running ? "#e21227" : "#10b981", color: running ? "#e21227" : "#10b981", background: "transparent" }}>
                            {running ? <><Square size={10} />HALT</>: <><Play size={10} />ACTIVATE</>}
                          </button>
                        </div>

                        <div className="rounded-xl border border-white/8 p-5 bg-black/30"
                          style={{ boxShadow: running ? "0 0 30px rgba(226,18,39,0.08)" : "none" }}>
                          <DecisionTreeViz activeNode={activeNode} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {DECISION_NODES.filter(n => n.type !== "root").slice(0, 6).map(n => (
                            <div key={n.id} className="p-3 rounded-lg border bg-black/20 transition-all"
                              style={{ borderColor: n.color + "33" }}>
                              <div className="text-[10px] font-mono font-bold mb-1" style={{ color: n.color }}>{n.label}</div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full bg-white/5">
                                  <div className="h-full rounded-full" style={{ width: `${n.confidence}%`, background: n.color }} />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground">{n.confidence}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── RESOURCES ───────────────────────────────────────── */}
                    {tab === "resources" && (
                      <div className="space-y-4">
                        <div className="text-sm font-bold text-white font-mono">RESOURCE MANAGEMENT DASHBOARD</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3 p-4 rounded-xl border border-white/8 bg-black/20">
                            <div className="text-[11px] font-mono text-[#8b5cf6] tracking-widest mb-3">LIVE METRICS</div>
                            {resources.map(r => <ResourceBar key={r.name} item={r} animated={true} />)}
                          </div>
                          <div className="space-y-3">
                            <div className="p-4 rounded-xl border border-white/8 bg-black/20">
                              <div className="text-[11px] font-mono text-[#06b6d4] tracking-widest mb-3">SYSTEM HEALTH</div>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { label: "NEURAL OPS/s",  value: engineScore.decisions.toLocaleString(), icon: Cpu,       color: "#8b5cf6" },
                                  { label: "AVG LATENCY",   value: `${engineScore.speed}ms`,              icon: Gauge,      color: "#3b82f6" },
                                  { label: "ACCURACY",      value: `${engineScore.accuracy.toFixed(1)}%`, icon: Target,     color: "#10b981" },
                                  { label: "EFFICIENCY",    value: "94.2%",                               icon: TrendingUp, color: "#f59e0b" },
                                ].map(m => {
                                  const Icon = m.icon;
                                  return (
                                    <div key={m.label} className="p-3 rounded-lg bg-black/30 border border-white/5">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Icon size={11} style={{ color: m.color }} />
                                        <span className="text-[9px] font-mono text-muted-foreground">{m.label}</span>
                                      </div>
                                      <div className="text-base font-black font-mono" style={{ color: m.color }}>{m.value}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="p-4 rounded-xl border border-white/8 bg-black/20">
                              <div className="text-[11px] font-mono text-[#f59e0b] tracking-widest mb-3">ACTIVE PROCESSES</div>
                              <div className="space-y-1.5">
                                {["decision_matrix.worker", "adaptive_learn.daemon", "context_engine.core", "threat_assessor.svc", "memory_cache.gc"].map((proc, i) => (
                                  <div key={proc} className="flex items-center justify-between text-[10px] font-mono">
                                    <span className="text-muted-foreground">{proc}</span>
                                    <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                                      className="text-[#10b981]">● {(Math.random() * 4 + 0.1).toFixed(1)}%</motion.span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── CLI TERMINAL ─────────────────────────────────────── */}
                    {tab === "terminal" && (
                      <div className="h-full flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-white font-mono">NEURAL CLI INTERFACE</div>
                          <div className="flex gap-2">
                            {SAMPLE_CMDS.slice(0, 3).map(cmd => (
                              <button key={cmd} onClick={() => { setCliInput(cmd); cliRef.current?.focus(); }}
                                className="px-2 py-1 rounded text-[9px] font-mono text-[#8b5cf6] border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/10 transition-colors">
                                {cmd.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div ref={logRef}
                          className="flex-1 overflow-y-auto font-mono text-[11px] rounded-xl border border-white/8 bg-black/50 p-3 space-y-0.5"
                          style={{ minHeight: 0 }}>
                          {logs.map(l => {
                            const Icon = LOG_ICONS[l.type];
                            return (
                              <div key={l.id} className="flex items-start gap-2">
                                <span className="text-muted-foreground text-[9px] shrink-0 mt-0.5">{l.time}</span>
                                <Icon size={10} style={{ color: LOG_COLORS[l.type], marginTop: 2, flexShrink: 0 }} />
                                <span style={{ color: LOG_COLORS[l.type] }}>{l.text}</span>
                              </div>
                            );
                          })}
                          {running && (
                            <motion.div animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                              className="text-[#e21227] font-mono text-[11px]">█</motion.div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border border-white/10 bg-black/50 font-mono text-sm focus-within:border-[#e21227]/50 transition-colors">
                            <ChevronRight size={13} className="text-[#e21227] shrink-0" />
                            <input ref={cliRef} value={cliInput}
                              onChange={e => setCliInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") { handleCLI(cliInput); setCliInput(""); }
                                if (e.key === "ArrowUp") { const i = Math.min(histIdx + 1, cmdHistory.length - 1); setHistIdx(i); setCliInput(cmdHistory[i] ?? ""); }
                                if (e.key === "ArrowDown") { const i = Math.max(histIdx - 1, -1); setHistIdx(i); setCliInput(i < 0 ? "" : cmdHistory[i]); }
                              }}
                              placeholder="Enter command… (type 'help')"
                              className="flex-1 bg-transparent outline-none text-[12px] text-white placeholder:text-muted-foreground/40" />
                          </div>
                          <button onClick={() => { handleCLI(cliInput); setCliInput(""); }}
                            className="px-4 py-2 rounded-xl text-sm font-mono font-bold transition-all"
                            style={{ background: "rgba(226,18,39,0.15)", color: "#e21227", border: "1px solid rgba(226,18,39,0.3)" }}>
                            EXEC
                          </button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {SAMPLE_CMDS.map(cmd => (
                            <button key={cmd} onClick={() => handleCLI(cmd)}
                              className="px-2 py-0.5 rounded text-[9px] font-mono text-muted-foreground border border-white/8 hover:border-[#e21227]/40 hover:text-[#e21227] transition-colors">
                              {cmd}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── ADAPTIVE LEARNING ───────────────────────────────── */}
                    {tab === "learning" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-white font-mono">ADAPTIVE LEARNING ENGINE</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{learningData.length} patterns stored · self-improving</div>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#8b5cf6]/30 bg-[#8b5cf6]/10">
                            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                            <span className="text-[10px] font-mono text-[#8b5cf6]">LEARNING ACTIVE</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Patterns Learned", value: learningData.length.toString(), color: "#8b5cf6", icon: BookOpen },
                            { label: "Avg Confidence",   value: `${Math.round(learningData.reduce((a, b) => a + b.confidence, 0) / Math.max(learningData.length, 1))}%`, color: "#10b981", icon: TrendingUp },
                            { label: "Last Updated",     value: "Just now", color: "#06b6d4", icon: Clock },
                          ].map(s => {
                            const Icon = s.icon;
                            return (
                              <div key={s.label} className="p-3 rounded-xl border border-white/8 bg-black/20 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + "22" }}>
                                  <Icon size={14} style={{ color: s.color }} />
                                </div>
                                <div>
                                  <div className="text-sm font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                                  <div className="text-[9px] text-muted-foreground font-mono">{s.label}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="rounded-xl border border-white/8 bg-black/20 overflow-hidden">
                          <div className="px-4 py-2 border-b border-white/5 text-[10px] font-mono text-[#8b5cf6] tracking-widest">
                            LEARNING HISTORY · LAST {learningData.length} ENTRIES
                          </div>
                          <div className="divide-y divide-white/5 max-h-52 overflow-y-auto">
                            {[...learningData].reverse().map(e => (
                              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                                <FlaskConical size={11} className="text-[#8b5cf6] shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-mono text-white truncate">{e.input}</div>
                                  <div className="text-[10px] font-mono text-muted-foreground truncate">→ {e.output}</div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  <div className="w-12 h-1 rounded-full bg-white/5">
                                    <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${e.confidence}%` }} />
                                  </div>
                                  <span className="text-[9px] font-mono text-[#10b981]">{e.confidence}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── TASK PIPELINE ────────────────────────────────────── */}
                    {tab === "pipeline" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-white font-mono">MULTI-STEP TASK PIPELINE</div>
                            <div className="text-[11px] text-muted-foreground font-mono">Automatic task decomposition & execution</div>
                          </div>
                          <button onClick={runPipeline}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all"
                            style={{ background: "rgba(226,18,39,0.15)", color: "#e21227", border: "1px solid rgba(226,18,39,0.3)" }}>
                            <RefreshCw size={12} /> RUN PIPELINE
                          </button>
                        </div>

                        <div className="space-y-2">
                          {pipeline.map((step, i) => {
                            const isRun = step.status === "running";
                            const isDone = step.status === "done";
                            const isErr = step.status === "error";
                            const color = isDone ? "#10b981" : isRun ? "#e21227" : isErr ? "#ef4444" : "#334155";
                            return (
                              <motion.div key={step.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                <div className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                                  style={{
                                    borderColor: color + "44",
                                    background: isRun ? "rgba(226,18,39,0.06)" : isDone ? "rgba(16,185,129,0.04)" : "rgba(0,0,0,0.2)",
                                    boxShadow: isRun ? "0 0 20px rgba(226,18,39,0.12)" : "none",
                                  }}>
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                    style={{ background: color + "22", border: `1px solid ${color}55` }}>
                                    {isDone ? <CheckCircle2 size={12} style={{ color }} /> :
                                      isRun ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw size={11} style={{ color }} /></motion.div> :
                                        <span className="text-[10px] font-mono font-bold" style={{ color }}>{step.id}</span>}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-[12px] font-mono" style={{ color: isDone || isRun ? "#fff" : "#64748b" }}>
                                      {step.label}
                                    </div>
                                  </div>
                                  <div className="text-[10px] font-mono shrink-0" style={{ color }}>
                                    {isDone ? `✓ ${step.duration}ms` : isRun ? "RUNNING…" : "IDLE"}
                                  </div>
                                  {isRun && (
                                    <div className="w-24 h-0.5 rounded-full bg-white/5 overflow-hidden shrink-0">
                                      <motion.div className="h-full bg-[#e21227]" animate={{ width: ["0%", "100%"] }} transition={{ duration: 0.8, repeat: Infinity }} />
                                    </div>
                                  )}
                                </div>
                                {i < pipeline.length - 1 && (
                                  <div className="flex justify-center my-0.5">
                                    <ArrowRight size={10} style={{ color: isDone ? "#10b981" : "#334155" }} className="rotate-90" />
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── AUTONOMOUS MODE ──────────────────────────────────── */}
                    {tab === "autonomous" && (
                      <div className="h-full flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8b5cf6,#e21227)" }}>
                            <Infinity size={18} className="text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white font-mono">AUTONOMOUS EXECUTION ENGINE</div>
                            <div className="text-[11px] text-muted-foreground font-mono">Self-directed multi-step task solver with adaptive fallback</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 shrink-0">
                          {[
                            { label: "Auto-decompose tasks",      icon: Layers,    color: "#8b5cf6" },
                            { label: "Parallel execution",         icon: Zap,       color: "#f59e0b" },
                            { label: "Intelligent fallback",       icon: Shield,    color: "#10b981" },
                            { label: "Live progress tracking",     icon: Activity,  color: "#3b82f6" },
                            { label: "Learning from outcomes",     icon: Brain,     color: "#e21227" },
                            { label: "Zero manual intervention",   icon: Settings2, color: "#06b6d4" },
                          ].map(f => {
                            const Icon = f.icon;
                            return (
                              <div key={f.label} className="flex items-center gap-2 p-2.5 rounded-lg border border-white/8 bg-black/20">
                                <Icon size={12} style={{ color: f.color, flexShrink: 0 }} />
                                <span className="text-[10px] font-mono text-muted-foreground">{f.label}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <div className="flex-1 relative">
                            <input value={autonomousTask} onChange={e => setAutonomousTask(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && runAutonomous()}
                              placeholder="Describe complex task… e.g. 'Analyze network topology and generate security report'"
                              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-white placeholder:text-muted-foreground/40 outline-none focus:border-[#8b5cf6]/50 transition-colors" />
                          </div>
                          <button onClick={runAutonomous}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0"
                            style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(226,18,39,0.2))", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.35)" }}>
                            <Lightbulb size={13} /> EXECUTE
                          </button>
                        </div>

                        <div ref={autoLogRef}
                          className="flex-1 overflow-y-auto font-mono text-[11px] rounded-xl border border-white/8 bg-black/50 p-3 space-y-0.5 min-h-0">
                          {autonomousLog.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                              <Bot size={28} className="opacity-20" />
                              <div className="text-[11px]">Enter a task above and press EXECUTE</div>
                              <div className="text-[10px] opacity-50">The engine will decompose, plan and execute automatically</div>
                            </div>
                          ) : autonomousLog.map((line, i) => {
                            const tag = line.match(/^\[(\w+)\]/)?.[1];
                            const color = tag === "DONE" ? "#10b981" : tag === "RISK" ? "#f59e0b" : tag === "PLAN" ? "#8b5cf6" : tag === "EXEC" ? "#3b82f6" : tag === "INIT" ? "#e21227" : "#94a3b8";
                            return (
                              <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.02 }}
                                style={{ color }} className="leading-relaxed">{line}</motion.div>
                            );
                          })}
                          {autonomousLog.length > 0 && autonomousLog.length < 16 && (
                            <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }} className="text-[#8b5cf6]">▋</motion.span>
                          )}
                        </div>

                        <div className="shrink-0 flex gap-2 flex-wrap">
                          {["optimize all subsystems", "analyze network topology", "generate security audit report", "run vulnerability sweep"].map(ex => (
                            <button key={ex} onClick={() => setAutonomousTask(ex)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#8b5cf6] border border-[#8b5cf6]/25 hover:bg-[#8b5cf6]/10 transition-colors">
                              {ex}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 flex items-center justify-between px-5 py-2 border-t border-white/5 bg-black/20">
            <div className="flex items-center gap-2">
              <Eye size={10} className="text-[#e21227]" />
              <span className="text-[9px] font-mono text-muted-foreground">AUTONOMOUS DECISION ENGINE · v7.0 · NEURAL CORE ACTIVE</span>
            </div>
            <div className="flex items-center gap-3">
              {[
                { label: "DECISION",  color: "#e21227" },
                { label: "LEARNING", color: "#8b5cf6" },
                { label: "MEMORY",   color: "#3b82f6" },
                { label: "PIPELINE", color: "#10b981" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1">
                  <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }}
                    animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: Math.random() }} />
                  <span className="text-[8px] font-mono" style={{ color: s.color + "99" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
