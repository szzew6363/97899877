import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, SkipForward, StopCircle, Brain, Cpu, Database,
  Globe, Terminal, Upload, Download, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Clock, Zap, Shield, Eye, ChevronRight, ChevronDown,
  History, Activity, Lock, Unlock, FileText, Search,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   AUTONOMOUS AGENT 3D — الوكيل المستقل الحقيقي
   Planning · Memory · Tools · Reflection · Human Intervention
══════════════════════════════════════════════════════════════════════ */

export type AgentTool =
  | "shell" | "web_search" | "file_read" | "file_write"
  | "api_call" | "rag_query" | "rag_write" | "code_run";

export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped" | "waiting_approval";

export interface AgentStep {
  id: string;
  index: number;
  title: string;
  description: string;
  tool: AgentTool;
  toolInput: string;
  toolOutput?: string;
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
  reflection?: string;
  approved?: boolean;
}

export interface AgentPlan {
  goal: string;
  reasoning: string;
  steps: AgentStep[];
  estimatedDuration: string;
}

export interface AgentTask {
  id: string;
  goal: string;
  plan?: AgentPlan;
  currentStep: number;
  status: "idle" | "planning" | "running" | "paused" | "done" | "failed" | "cancelled";
  startedAt: number;
  endedAt?: number;
  result?: string;
  shortTermMemory: string[];
  sandboxId: string;
  auditLog: AuditEntry[];
}

interface AuditEntry {
  ts: number;
  action: string;
  detail: string;
  allowed: boolean;
}

const TOOL_ICONS: Record<AgentTool, React.FC<{size?: number; className?: string}>> = {
  shell: Terminal, web_search: Globe, file_read: FileText, file_write: Upload,
  api_call: Zap, rag_query: Search, rag_write: Database, code_run: Cpu,
};

const TOOL_COLORS: Record<AgentTool, string> = {
  shell: "#e21227", web_search: "#3b82f6", file_read: "#10b981", file_write: "#f59e0b",
  api_call: "#a78bfa", rag_query: "#06b6d4", rag_write: "#ec4899", code_run: "#f97316",
};

const TOOL_LABELS: Record<AgentTool, string> = {
  shell: "Shell", web_search: "Web Search", file_read: "File Read", file_write: "File Write",
  api_call: "API Call", rag_query: "RAG Query", rag_write: "RAG Write", code_run: "Code Run",
};

const ALLOWED_OPS = ["web_search", "file_read", "rag_query", "api_call", "code_run"];
const BLOCKED_OPS_PATTERN = /rm\s+-rf|sudo|passwd|\/etc\/shadow|format|mkfs/i;

const LONG_TERM_MEMORY_KEY = "mr7-autonomous-agent-ltm";

function loadLTM(): string[] {
  try { return JSON.parse(localStorage.getItem(LONG_TERM_MEMORY_KEY) || "[]"); } catch { return []; }
}
function saveLTM(entries: string[]) {
  try { localStorage.setItem(LONG_TERM_MEMORY_KEY, JSON.stringify(entries.slice(-50))); } catch {}
}

function loadTaskHistory(): AgentTask[] {
  try { return JSON.parse(localStorage.getItem("mr7-agent-task-history") || "[]"); } catch { return []; }
}
function saveTaskHistory(tasks: AgentTask[]) {
  try { localStorage.setItem("mr7-agent-task-history", JSON.stringify(tasks.slice(-20))); } catch {}
}

/* ── 3D Neural Canvas ─────────────────────────────────────────────── */
function AgentNeuralCanvas({ task, activeStep }: { task: AgentTask | null; activeStep: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef(0);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const spheresRef = useRef<THREE.Mesh[]>([]);
  const linesRef = useRef<THREE.Line[]>([]);
  const tRef = useRef(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const stepCount = task?.plan?.steps.length ?? 6;
    const spheres: THREE.Mesh[] = [];
    const lines: THREE.Line[] = [];

    const positions: THREE.Vector3[] = Array.from({ length: stepCount }, (_, i) => {
      const angle = (i / stepCount) * Math.PI * 2;
      const r = 2.8;
      return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r * 0.6, (Math.random() - 0.5) * 1.2);
    });

    positions.forEach((pos, i) => {
      const step = task?.plan?.steps[i];
      const color = step ? TOOL_COLORS[step.tool] : "#444466";
      const geo = new THREE.SphereGeometry(0.18, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: i === activeStep ? 1.2 : 0.3,
        metalness: 0.8, roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      scene.add(mesh);
      spheres.push(mesh);
    });
    spheresRef.current = spheres;

    for (let i = 0; i < positions.length - 1; i++) {
      const pts = [positions[i], positions[i + 1]];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: "#1a2040", opacity: 0.5, transparent: true });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      lines.push(line);
    }
    linesRef.current = lines;

    const coreGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: "#0a0a1a", emissive: "#1a0530", emissiveIntensity: 0.8,
      metalness: 1, roughness: 0.1,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    const ring1Geo = new THREE.TorusGeometry(1.2, 0.015, 8, 80);
    const ring1Mat = new THREE.MeshStandardMaterial({ color: "#e21227", emissive: "#e21227", emissiveIntensity: 0.6 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2;
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.8, 0.01, 8, 80);
    const ring2Mat = new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#3b82f6", emissiveIntensity: 0.4 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI * 0.3;
    scene.add(ring2);

    scene.add(new THREE.AmbientLight("#ffffff", 0.4));
    const pLight = new THREE.PointLight("#a78bfa", 2, 20);
    pLight.position.set(0, 3, 3);
    scene.add(pLight);

    const FRAME_MS = 30;
    let lastTs = 0;

    function animate(ts: number) {
      frameRef.current = requestAnimationFrame(animate);
      if (document.hidden) return;
      if (ts - lastTs < FRAME_MS) return;
      lastTs = ts;
      tRef.current += 0.012;
      const t = tRef.current;

      scene.rotation.y = t * 0.15;
      ring1.rotation.z = t * 0.5;
      ring2.rotation.z = -t * 0.3;
      ring2.rotation.y = t * 0.2;
      pLight.position.x = Math.sin(t * 0.8) * 3;
      pLight.position.z = Math.cos(t * 0.8) * 3;

      spheresRef.current.forEach((s, i) => {
        const mat = s.material as THREE.MeshStandardMaterial;
        const step = task?.plan?.steps[i];
        const isActive = i === activeStep;
        const isDone = step?.status === "done";
        const isFailed = step?.status === "failed";
        mat.emissiveIntensity = isActive
          ? 1.0 + Math.sin(t * 4) * 0.4
          : isDone ? 0.6
          : isFailed ? 0.8
          : 0.25;
        s.scale.setScalar(isActive ? 1.3 + Math.sin(t * 3) * 0.1 : 1.0);
      });

      renderer.render(scene, camera);
    }
    frameRef.current = requestAnimationFrame(animate);

    const ro = new ResizeObserver(() => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  useEffect(() => {
    spheresRef.current.forEach((s, i) => {
      const mat = s.material as THREE.MeshStandardMaterial;
      const step = task?.plan?.steps[i];
      const color = step ? TOOL_COLORS[step.tool] : "#444466";
      mat.color.set(color);
      mat.emissive.set(step?.status === "failed" ? "#ff0000" : step?.status === "done" ? "#00ff88" : color);
    });
  }, [activeStep, task]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />;
}

/* ── Step Card ────────────────────────────────────────────────────── */
function StepCard({
  step, isActive, onApprove, onSkip, requireApproval,
}: {
  step: AgentStep;
  isActive: boolean;
  onApprove?: () => void;
  onSkip?: () => void;
  requireApproval?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const ToolIcon = TOOL_ICONS[step.tool];
  const color = TOOL_COLORS[step.tool];
  const dur = step.startedAt && step.endedAt ? ((step.endedAt - step.startedAt) / 1000).toFixed(1) + "s" : null;

  const statusIcon = {
    pending: <Clock size={12} className="text-zinc-500" />,
    running: <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: color }} />,
    done: <CheckCircle2 size={12} className="text-emerald-400" />,
    failed: <XCircle size={12} className="text-red-400" />,
    skipped: <ChevronRight size={12} className="text-zinc-600" />,
    waiting_approval: <Lock size={12} style={{ color }} />,
  }[step.status];

  const bgColor = isActive
    ? `${color}15`
    : step.status === "done" ? "#00ff8808"
    : step.status === "failed" ? "#ff000010"
    : "transparent";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-lg border transition-all duration-300 cursor-pointer"
      style={{
        borderColor: isActive ? color + "60" : step.status === "done" ? "#00ff8825" : "#ffffff10",
        background: bgColor,
        boxShadow: isActive ? `0 0 16px ${color}20` : "none",
      }}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {statusIcon}
        </div>
        <div className="w-5 h-5 flex items-center justify-center rounded" style={{ background: color + "25" }}>
          <ToolIcon size={11} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-white/90 truncate">{step.title}</div>
          <div className="text-[10px] text-white/40">{TOOL_LABELS[step.tool]}{dur ? ` · ${dur}` : ""}</div>
        </div>
        {step.status === "waiting_approval" && requireApproval && (
          <div className="flex gap-1">
            <button onClick={e => { e.stopPropagation(); onApprove?.(); }}
              className="px-2 py-0.5 text-[9px] rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all">
              ✓ موافق
            </button>
            <button onClick={e => { e.stopPropagation(); onSkip?.(); }}
              className="px-2 py-0.5 text-[9px] rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
              ✗ تخطي
            </button>
          </div>
        )}
        <ChevronDown size={12} className="text-white/30 transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }} />
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2">
              <p className="text-[10px] text-white/60">{step.description}</p>
              {step.toolInput && (
                <pre className="text-[9px] text-white/50 bg-black/40 rounded p-2 overflow-x-auto font-mono">
                  {step.toolInput.slice(0, 200)}
                </pre>
              )}
              {step.toolOutput && (
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-emerald-400/70 mb-1">Output:</div>
                  <pre className="text-[9px] text-white/60 bg-black/40 rounded p-2 overflow-x-auto font-mono max-h-24 overflow-y-auto">
                    {step.toolOutput.slice(0, 300)}
                  </pre>
                </div>
              )}
              {step.reflection && (
                <div className="flex gap-2 bg-violet-500/10 rounded p-2 border border-violet-500/20">
                  <Brain size={10} className="text-violet-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[9px] text-violet-300">{step.reflection}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Task History Item ────────────────────────────────────────────── */
function TaskHistoryItem({ task, onReplay }: { task: AgentTask; onReplay: (goal: string) => void }) {
  const dur = task.endedAt ? ((task.endedAt - task.startedAt) / 1000).toFixed(0) + "s" : "—";
  const stepsDone = task.plan?.steps.filter(s => s.status === "done").length ?? 0;
  const stepsTotal = task.plan?.steps.length ?? 0;
  const statusColor = task.status === "done" ? "#10b981" : task.status === "failed" ? "#ef4444" : "#f59e0b";

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-2.5 hover:bg-white/5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-white/85 truncate">{task.goal}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-bold uppercase" style={{ color: statusColor }}>{task.status}</span>
            <span className="text-[9px] text-white/35">{dur}</span>
            <span className="text-[9px] text-white/35">{stepsDone}/{stepsTotal} خطوة</span>
          </div>
        </div>
        <button onClick={() => onReplay(task.goal)}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-[9px] rounded border border-[#e21227]/30 text-[#e21227] hover:bg-[#e21227]/10 transition-all">
          <RefreshCw size={8} /> إعادة
        </button>
      </div>
      {task.result && (
        <p className="text-[9px] text-white/40 mt-1 line-clamp-2">{task.result}</p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN MODAL
══════════════════════════════════════════════════════════════════ */
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AutonomousAgentModal({ open, onOpenChange }: Props) {
  const [goalInput, setGoalInput] = useState("");
  const [task, setTask] = useState<AgentTask | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [tab, setTab] = useState<"agent" | "history" | "memory" | "audit">("agent");
  const [requireApproval, setRequireApproval] = useState(false);
  const [longTermMemory, setLongTermMemory] = useState<string[]>(loadLTM);
  const [taskHistory, setTaskHistory] = useState<AgentTask[]>(loadTaskHistory);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const runningRef = useRef(false);
  const abortRef = useRef(false);
  const stepListRef = useRef<HTMLDivElement>(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const scrollToStep = useCallback((i: number) => {
    const el = stepListRef.current?.children[i] as HTMLElement;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function createTaskId() { return `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
  function createStepId() { return `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

  async function callAI(messages: { role: string; content: string }[]): Promise<string> {
    try {
      const res = await fetch("/api/autonomous-agent/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error("AI error");
      const data = await res.json() as { content?: string; error?: string };
      return data.content ?? "No response";
    } catch {
      return "Error: Could not reach AI.";
    }
  }

  async function executeToolSandboxed(tool: AgentTool, input: string): Promise<{ output: string; allowed: boolean }> {
    if (BLOCKED_OPS_PATTERN.test(input)) {
      return { output: "BLOCKED: عملية محظورة في القائمة السوداء", allowed: false };
    }
    if (!ALLOWED_OPS.includes(tool) && tool !== "shell") {
      return { output: `RESTRICTED: الأداة "${tool}" تتطلب موافقة`, allowed: false };
    }
    try {
      const res = await fetch("/api/autonomous-agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, input, sandboxId: task?.sandboxId }),
      });
      const data = await res.json() as { output?: string; error?: string };
      return { output: data.output ?? data.error ?? "No output", allowed: true };
    } catch {
      const sim: Record<string, string> = {
        web_search: `نتائج البحث لـ "${input}":\n• نتيجة 1: معلومات ذات صلة\n• نتيجة 2: مصدر موثوق\n• نتيجة 3: تحليل عميق`,
        file_read: `محتوى الملف "${input}":\nالسطر 1: بيانات نموذجية\nالسطر 2: معلومات إضافية`,
        rag_query: `استعلام RAG لـ "${input}":\nوُجد 3 نتائج في قاعدة المعرفة...`,
        api_call: `استجابة API:\n{"status": "ok", "data": "محاكاة", "timestamp": ${Date.now()}}`,
        code_run: `تنفيذ الكود:\nنتيجة: تم التنفيذ بنجاح`,
        shell: `$ ${input}\nمخرجات المحاكاة للأمر`,
      };
      return { output: sim[tool] ?? `تم تنفيذ ${tool} بنجاح`, allowed: true };
    }
  }

  async function buildPlan(goal: string): Promise<AgentPlan> {
    const ltm = longTermMemory.slice(-5).join("\n");
    const prompt = `أنت وكيل ذكاء اصطناعي مستقل. الهدف: "${goal}"
${ltm ? `الذاكرة طويلة المدى:\n${ltm}` : ""}

ضع خطة تنفيذ تفصيلية بصيغة JSON فقط:
{
  "goal": "وصف الهدف",
  "reasoning": "سبب اختيار هذه الخطة",
  "estimatedDuration": "وقت التنفيذ المتوقع",
  "steps": [
    {
      "title": "عنوان الخطوة",
      "description": "وصف تفصيلي",
      "tool": "web_search|shell|file_read|file_write|api_call|rag_query|rag_write|code_run",
      "toolInput": "المدخل الكامل للأداة"
    }
  ]
}
استخدم 3-7 خطوات. الخطوات يجب أن تكون منطقية ومرتبة.`;

    const raw = await callAI([{ role: "user", content: prompt }]);
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no json");
      const parsed = JSON.parse(jsonMatch[0]) as Partial<AgentPlan>;
      return {
        goal: parsed.goal ?? goal,
        reasoning: parsed.reasoning ?? "خطة تلقائية",
        estimatedDuration: parsed.estimatedDuration ?? "2-5 دقائق",
        steps: (parsed.steps ?? []).map((s: Partial<AgentStep>, i: number) => ({
          id: createStepId(),
          index: i,
          title: s.title ?? `خطوة ${i + 1}`,
          description: s.description ?? "",
          tool: (s.tool as AgentTool) ?? "web_search",
          toolInput: s.toolInput ?? "",
          status: "pending" as StepStatus,
        })),
      };
    } catch {
      return {
        goal,
        reasoning: "خطة افتراضية",
        estimatedDuration: "2-5 دقائق",
        steps: [
          { id: createStepId(), index: 0, title: "بحث في المعلومات", description: `البحث عن "${goal}"`, tool: "web_search", toolInput: goal, status: "pending" },
          { id: createStepId(), index: 1, title: "تحليل النتائج", description: "تحليل البيانات المجمعة", tool: "code_run", toolInput: `analyze("${goal}")`, status: "pending" },
          { id: createStepId(), index: 2, title: "إعداد التقرير", description: "كتابة تقرير شامل", tool: "file_write", toolInput: `report_${Date.now()}.md`, status: "pending" },
        ],
      };
    }
  }

  async function startTask() {
    if (!goalInput.trim() || runningRef.current) return;
    runningRef.current = true;
    abortRef.current = false;
    setPaused(false);

    const newTask: AgentTask = {
      id: createTaskId(),
      goal: goalInput.trim(),
      currentStep: -1,
      status: "planning",
      startedAt: Date.now(),
      shortTermMemory: [],
      sandboxId: `sandbox-${Date.now()}`,
      auditLog: [{ ts: Date.now(), action: "TASK_START", detail: goalInput, allowed: true }],
    };
    setTask(newTask);
    setActiveStep(0);
    setGoalInput("");
    setTab("agent");

    try {
      const plan = await buildPlan(newTask.goal);
      newTask.plan = plan;
      newTask.status = "running";
      newTask.currentStep = 0;
      setTask({ ...newTask });

      for (let i = 0; i < plan.steps.length; i++) {
        if (abortRef.current) break;

        while (pausedRef.current && !abortRef.current) {
          await new Promise(r => setTimeout(r, 200));
        }
        if (abortRef.current) break;

        setActiveStep(i);
        scrollToStep(i);

        plan.steps[i].status = "running";
        plan.steps[i].startedAt = Date.now();
        newTask.currentStep = i;
        setTask({ ...newTask });

        if (requireApproval) {
          plan.steps[i].status = "waiting_approval";
          setTask({ ...newTask });
          await new Promise<void>(resolve => {
            const handler = (e: Event) => {
              const d = (e as CustomEvent<{stepId: string; action: "approve"|"skip"}>).detail;
              if (d.stepId === plan.steps[i].id) {
                window.removeEventListener("agent:step-decision", handler);
                if (d.action === "skip") plan.steps[i].status = "skipped";
                resolve();
              }
            };
            window.addEventListener("agent:step-decision", handler);
          });
          if (plan.steps[i].status === "skipped") {
            setTask({ ...newTask });
            continue;
          }
          plan.steps[i].status = "running";
          setTask({ ...newTask });
        }

        const { output, allowed } = await executeToolSandboxed(plan.steps[i].tool, plan.steps[i].toolInput);
        newTask.auditLog.push({ ts: Date.now(), action: `TOOL:${plan.steps[i].tool.toUpperCase()}`, detail: plan.steps[i].toolInput.slice(0, 100), allowed });
        plan.steps[i].toolOutput = output;

        const reflection = await callAI([{
          role: "user",
          content: `نتيجة الخطوة "${plan.steps[i].title}":\n${output}\n\nهل النتيجة جيدة؟ هل يجب تعديل الخطة؟ أجب في جملة واحدة.`,
        }]);
        plan.steps[i].reflection = reflection;
        plan.steps[i].status = allowed ? "done" : "failed";
        plan.steps[i].endedAt = Date.now();

        newTask.shortTermMemory.push(`الخطوة ${i + 1}: ${plan.steps[i].title} → ${output.slice(0, 80)}`);
        setTask({ ...newTask });

        await new Promise(r => setTimeout(r, 300));
      }

      if (!abortRef.current) {
        const finalResult = await callAI([{
          role: "user",
          content: `لقد أنجزت المهمة: "${newTask.goal}"\nملخص ما تم:\n${newTask.shortTermMemory.join("\n")}\n\nأكتب تقرير إنجاز مختصر في 2-3 جمل.`,
        }]);
        newTask.result = finalResult;
        newTask.status = "done";
        newTask.endedAt = Date.now();

        const newLTM = [...longTermMemory, `[${new Date().toLocaleDateString("ar")}] ${newTask.goal}: ${finalResult.slice(0, 100)}`];
        setLongTermMemory(newLTM);
        saveLTM(newLTM);
      } else {
        newTask.status = "cancelled";
        newTask.endedAt = Date.now();
      }

      setTask({ ...newTask });
      const history = [newTask, ...taskHistory].slice(0, 20);
      setTaskHistory(history);
      saveTaskHistory(history);
    } finally {
      runningRef.current = false;
    }
  }

  function approveStep(stepId: string) {
    window.dispatchEvent(new CustomEvent("agent:step-decision", { detail: { stepId, action: "approve" } }));
  }
  function skipStep(stepId: string) {
    window.dispatchEvent(new CustomEvent("agent:step-decision", { detail: { stepId, action: "skip" } }));
  }

  function cancelTask() {
    abortRef.current = true;
    runningRef.current = false;
    setPaused(false);
    setTask(prev => prev ? { ...prev, status: "cancelled", endedAt: Date.now() } : null);
  }

  const isRunning = task?.status === "planning" || task?.status === "running";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #08080f 0%, #0d0d1a 50%, #080814 100%)",
          border: "1px solid rgba(162,78,246,0.25)",
          boxShadow: "0 0 80px rgba(162,78,246,0.12), 0 0 40px rgba(226,18,39,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 flex-shrink-0"
          style={{ background: "linear-gradient(90deg, rgba(162,78,246,0.08) 0%, rgba(226,18,39,0.05) 100%)" }}>
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #a24ef6, #e21227)" }}>
              <Brain size={18} className="text-white" />
            </div>
            {isRunning && (
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#08080f]">
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">AUTONOMOUS AI AGENT</h1>
            <p className="text-[10px] text-white/40">الوكيل المستقل · تخطيط ذاتي · ذاكرة · أدوات · انعكاس</p>
          </div>

          <div className="flex items-center gap-2 mx-auto">
            {(["agent", "history", "memory", "audit"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-1 text-[10px] uppercase tracking-widest rounded-lg transition-all font-medium"
                style={{
                  background: tab === t ? "rgba(162,78,246,0.2)" : "transparent",
                  border: `1px solid ${tab === t ? "rgba(162,78,246,0.4)" : "transparent"}`,
                  color: tab === t ? "#c084fc" : "rgba(255,255,255,0.4)",
                }}>
                {t === "agent" ? "الوكيل" : t === "history" ? "السجل" : t === "memory" ? "الذاكرة" : "التدقيق"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <div className="relative w-8 h-4 rounded-full transition-all" style={{ background: requireApproval ? "#e21227" : "#1a1a2e" }}
                onClick={() => setRequireApproval(v => !v)}>
                <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                  style={{ transform: requireApproval ? "translateX(16px)" : "translateX(0)" }} />
              </div>
              <span className="text-[9px] text-white/40">موافقة بشرية</span>
            </label>
            <button onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/80 transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── AGENT TAB ── */}
        {tab === "agent" && (
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* Left: 3D Visualization */}
            <div className="w-[320px] flex-shrink-0 relative border-r border-white/5">
              <AgentNeuralCanvas task={task} activeStep={activeStep} />
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-4 gap-2">
                {task && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                    style={{
                      background: "rgba(0,0,0,0.8)",
                      border: `1px solid ${task.status === "done" ? "#10b98140" : task.status === "failed" ? "#ef444440" : "#a24ef640"}`,
                      color: task.status === "done" ? "#10b981" : task.status === "failed" ? "#ef4444" : "#c084fc",
                    }}>
                    {task.status === "planning" ? "⚙ جاري التخطيط..." :
                      task.status === "running" ? `⚡ الخطوة ${activeStep + 1}/${task.plan?.steps.length ?? "?"}` :
                        task.status === "done" ? "✓ مكتمل" :
                          task.status === "cancelled" ? "✗ ملغى" :
                            task.status === "paused" ? "⏸ متوقف" :
                              task.status}
                  </motion.div>
                )}
                {task?.status === "running" && (
                  <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #a24ef6, #e21227)" }}
                      animate={{ width: `${((activeStep + 1) / (task.plan?.steps.length ?? 1)) * 100}%` }}
                      transition={{ duration: 0.5 }} />
                  </div>
                )}
              </div>
            </div>

            {/* Center: Steps + Input */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Input */}
              <div className="p-4 border-b border-white/5 flex-shrink-0">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={goalInput}
                      onChange={e => setGoalInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startTask(); } }}
                      placeholder="أدخل المهمة... (مثال: ابحث عن أحدث ثغرات CVE وأعد تقريراً)"
                      disabled={isRunning}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-[#a24ef6]/50 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={startTask} disabled={isRunning || !goalInput.trim()}
                      className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all disabled:opacity-40 flex items-center gap-1.5"
                      style={{ background: isRunning ? "#1a1a2e" : "linear-gradient(135deg, #a24ef6, #e21227)", color: "white" }}>
                      <Play size={12} /> تشغيل
                    </button>
                    {isRunning && (
                      <>
                        <button onClick={() => setPaused(v => !v)}
                          className="px-4 py-1.5 rounded-xl text-[10px] font-medium border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all flex items-center gap-1.5 justify-center">
                          {paused ? <><Play size={10} /> استمرار</> : <><Pause size={10} /> إيقاف</>}
                        </button>
                        <button onClick={cancelTask}
                          className="px-4 py-1.5 rounded-xl text-[10px] font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5 justify-center">
                          <StopCircle size={10} /> إلغاء
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {task?.plan?.reasoning && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-2 flex items-start gap-2 bg-violet-500/8 rounded-lg p-2 border border-violet-500/15">
                    <Brain size={11} className="text-violet-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-violet-300/80">{task.plan.reasoning}</p>
                  </motion.div>
                )}
              </div>

              {/* Steps list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2" ref={stepListRef}>
                {!task && (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(162,78,246,0.1)", border: "1px solid rgba(162,78,246,0.2)" }}>
                      <Zap size={28} className="text-violet-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white/60 mb-1">الوكيل جاهز</div>
                      <div className="text-[10px] text-white/30 max-w-[220px]">
                        أدخل مهمة معقدة وسيقوم الوكيل بالتخطيط وتنفيذها تلقائياً
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                      {Object.entries(TOOL_ICONS).slice(0, 4).map(([tool, Icon]) => (
                        <div key={tool} className="flex items-center gap-2 rounded-lg p-2 border border-white/5 bg-white/3">
                          <Icon size={12} style={{ color: TOOL_COLORS[tool as AgentTool] }} />
                          <span className="text-[9px] text-white/40">{TOOL_LABELS[tool as AgentTool]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <AnimatePresence>
                  {task?.plan?.steps.map((step, i) => (
                    <StepCard key={step.id} step={step} isActive={i === activeStep && isRunning}
                      requireApproval={requireApproval}
                      onApprove={() => approveStep(step.id)}
                      onSkip={() => skipStep(step.id)} />
                  ))}
                </AnimatePresence>
                {task?.status === "planning" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-violet-500/20 bg-violet-500/8">
                    <div className="w-5 h-5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin flex-shrink-0" />
                    <span className="text-[11px] text-violet-300">الوكيل يحلل المهمة ويضع الخطة...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Result + Short-term memory */}
            <div className="w-[260px] flex-shrink-0 border-l border-white/5 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/5 flex-shrink-0">
                <div className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-2 flex items-center gap-1.5">
                  <Activity size={9} /> النتيجة
                </div>
                {task?.result ? (
                  <p className="text-[11px] text-white/80 leading-relaxed">{task.result}</p>
                ) : (
                  <p className="text-[10px] text-white/25 italic">ستظهر النتيجة هنا عند الانتهاء...</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-2 flex items-center gap-1.5">
                  <Cpu size={9} /> الذاكرة القصيرة
                </div>
                <div className="space-y-1.5">
                  {task?.shortTermMemory.map((m, i) => (
                    <div key={i} className="text-[9px] text-white/50 bg-white/4 rounded p-1.5 border border-white/5">
                      {m}
                    </div>
                  ))}
                  {!task?.shortTermMemory.length && (
                    <p className="text-[9px] text-white/20 italic">فارغة</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <History size={15} className="text-violet-400" /> سجل المهام السابقة
              </h2>
              <button onClick={() => { setTaskHistory([]); saveTaskHistory([]); }}
                className="text-[9px] text-red-400/60 hover:text-red-400 transition-colors px-2 py-1 rounded border border-red-500/20 hover:border-red-500/40">
                مسح السجل
              </button>
            </div>
            {taskHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/30">
                <History size={32} className="mb-2 opacity-30" />
                <p className="text-sm">لا توجد مهام سابقة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {taskHistory.map(t => (
                  <TaskHistoryItem key={t.id} task={t} onReplay={goal => { setGoalInput(goal); setTab("agent"); }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MEMORY TAB ── */}
        {tab === "memory" && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Database size={15} className="text-violet-400" /> الذاكرة طويلة المدى
              </h2>
              <button onClick={() => { setLongTermMemory([]); saveLTM([]); }}
                className="text-[9px] text-red-400/60 hover:text-red-400 transition-colors px-2 py-1 rounded border border-red-500/20">
                مسح الذاكرة
              </button>
            </div>
            {longTermMemory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/30">
                <Database size={32} className="mb-2 opacity-30" />
                <p className="text-sm">الذاكرة فارغة — ستُبنى تلقائياً مع تنفيذ المهام</p>
              </div>
            ) : (
              <div className="space-y-2">
                {longTermMemory.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/4 border border-white/6">
                    <span className="text-[9px] text-violet-400 font-bold mt-0.5 flex-shrink-0">#{i + 1}</span>
                    <p className="text-[11px] text-white/70">{entry}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AUDIT TAB ── */}
        {tab === "audit" && (
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Shield size={15} className="text-violet-400" /> سجل التدقيق الأمني الكامل
            </h2>
            {!task?.auditLog.length ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/30">
                <Shield size={32} className="mb-2 opacity-30" />
                <p className="text-sm">لا يوجد نشاط بعد</p>
              </div>
            ) : (
              <div className="space-y-1.5 font-mono">
                {task.auditLog.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded border text-[10px]"
                    style={{
                      borderColor: e.allowed ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                      background: e.allowed ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)",
                    }}>
                    {e.allowed ? <Unlock size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" /> : <Lock size={11} className="text-red-400 mt-0.5 flex-shrink-0" />}
                    <span className="text-white/30">{new Date(e.ts).toLocaleTimeString("ar")}</span>
                    <span className="font-bold" style={{ color: e.allowed ? "#10b981" : "#ef4444" }}>{e.action}</span>
                    <span className="text-white/60 flex-1 truncate">{e.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
