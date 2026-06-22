import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Square, CheckCircle2, XCircle, Clock, Terminal,
  Globe, FileText, Database, Cpu, Brain, RefreshCw, ChevronDown,
  ChevronRight, AlertTriangle, Loader2, History, ScrollText,
  Edit3, Check, Ban, Sparkles, Zap, MemoryStick, Send,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type PlanStep = {
  id: string;
  title: string;
  description: string;
  tool?: string;
  requiresHumanApproval?: boolean;
};

type AgentEvent =
  | { type: "task_id"; taskId: string }
  | { type: "plan"; steps: PlanStep[] }
  | { type: "step_start"; stepIndex: number; step: PlanStep }
  | { type: "thinking"; text: string }
  | { type: "tool_call"; tool: string; args: Record<string, unknown> }
  | { type: "tool_result"; tool: string; output: string; success: boolean }
  | { type: "reflection"; assessment: string; continue_: boolean; adjusted?: string }
  | { type: "step_done"; stepIndex: number; success: boolean }
  | { type: "human_gate"; stepIndex: number; question: string; step: PlanStep }
  | { type: "done"; result: string; totalMs: number; taskId: string }
  | { type: "error"; message: string };

type StepStatus = "pending" | "running" | "done" | "failed" | "skipped";

type StepState = {
  step: PlanStep;
  status: StepStatus;
  events: AgentEvent[];
};

type HistoryTask = {
  task_id: string;
  goal: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  result?: string;
  plan_json?: PlanStep[];
  steps_json?: Array<{ title: string; result: string; success: boolean }>;
  audit_log?: string[];
};

type GateState = {
  stepIndex: number;
  question: string;
  step: PlanStep;
  editValue: string;
  editing: boolean;
};

// ── Icons per tool ────────────────────────────────────────────────────────────
const TOOL_ICONS: Record<string, React.ReactNode> = {
  shell:         <Terminal className="w-3.5 h-3.5" />,
  web_search:    <Globe className="w-3.5 h-3.5" />,
  read_file:     <FileText className="w-3.5 h-3.5" />,
  write_file:    <FileText className="w-3.5 h-3.5" />,
  http_get:      <Globe className="w-3.5 h-3.5" />,
  http_post:     <Globe className="w-3.5 h-3.5" />,
  kb_read:       <Database className="w-3.5 h-3.5" />,
  kb_write:      <Database className="w-3.5 h-3.5" />,
  memory_recall: <MemoryStick className="w-3.5 h-3.5" />,
  memory_store:  <MemoryStick className="w-3.5 h-3.5" />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMs(ms?: number): string {
  if (!ms) return "--";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function fmtDate(dt?: string): string {
  if (!dt) return "--";
  return new Date(dt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running")  return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
  if (status === "done")     return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "failed")   return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === "skipped")  return <Ban className="w-4 h-4 text-zinc-500" />;
  return <Clock className="w-4 h-4 text-zinc-600" />;
}

function ToolBadge({ tool }: { tool: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#3b3b6b] text-[10px] text-indigo-300 font-mono">
      {TOOL_ICONS[tool] ?? <Cpu className="w-3 h-3" />}
      {tool}
    </span>
  );
}

function CollapsibleOutput({ label, content, danger }: { label: string; content: string; danger?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5 rounded border border-[#222] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2 py-1 bg-[#111] hover:bg-[#1a1a1a] transition text-left"
      >
        <span className={`text-[10px] font-mono ${danger ? "text-red-400" : "text-zinc-400"}`}>{label}</span>
        {open ? <ChevronDown className="w-3 h-3 text-zinc-600" /> : <ChevronRight className="w-3 h-3 text-zinc-600" />}
      </button>
      {open && (
        <pre className="px-2 py-1.5 bg-black/40 text-[10px] font-mono text-zinc-300 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
          {content}
        </pre>
      )}
    </div>
  );
}

function EventRow({ ev }: { ev: AgentEvent }) {
  if (ev.type === "thinking") {
    return (
      <div className="flex items-start gap-2 py-1">
        <Brain className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-zinc-400 italic">{ev.text}</p>
      </div>
    );
  }
  if (ev.type === "tool_call") {
    return (
      <div className="py-1 space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className="text-[11px] text-yellow-300">Calling tool:</span>
          <ToolBadge tool={ev.tool} />
        </div>
        <CollapsibleOutput label="args" content={JSON.stringify(ev.args, null, 2)} />
      </div>
    );
  }
  if (ev.type === "tool_result") {
    return (
      <CollapsibleOutput
        label={`result — ${ev.success ? "success" : "error"}`}
        content={ev.output}
        danger={!ev.success}
      />
    );
  }
  if (ev.type === "reflection") {
    return (
      <div className="flex items-start gap-2 py-1">
        <RefreshCw className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] text-cyan-300">{ev.assessment}</p>
          {ev.adjusted && (
            <p className="text-[10px] text-zinc-500 mt-0.5">Adjustment: {ev.adjusted}</p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function AgentV2Modal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"run" | "history" | "audit">("run");
  const [goal, setGoal] = useState("");
  const [maxSteps, setMaxSteps] = useState(10);
  const [requireShellApproval, setRequireShellApproval] = useState(true);
  const [requireWriteApproval, setRequireWriteApproval] = useState(true);

  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [stepStates, setStepStates] = useState<StepState[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [gate, setGate] = useState<GateState | null>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [totalMs, setTotalMs] = useState<number | null>(null);

  const [history, setHistory] = useState<HistoryTask[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<string[]>([]);

  const feedRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [stepStates, currentStep]);

  // Load history when tab opens
  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const r = await fetch("/api/agent-v2/history");
      const d = await r.json() as { ok: boolean; tasks: HistoryTask[] };
      if (d.ok) setHistory(d.tasks);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  };

  const resetState = () => {
    setPlanSteps([]);
    setStepStates([]);
    setCurrentStep(-1);
    setGate(null);
    setFinalResult(null);
    setErrorMsg(null);
    setTotalMs(null);
    setTaskId(null);
    setAuditLog([]);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const updateStepStatus = useCallback((idx: number, status: StepStatus) => {
    setStepStates(prev => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx]!, status };
      return next;
    });
  }, []);

  const addEventToStep = useCallback((idx: number, ev: AgentEvent) => {
    setStepStates(prev => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx]!, events: [...next[idx]!.events, ev] };
      return next;
    });
  }, []);

  const handleRun = async () => {
    if (!goal.trim() || running) return;
    resetState();
    setRunning(true);

    const approvalTools: string[] = [];
    if (requireShellApproval) approvalTools.push("shell", "write_file");
    if (requireWriteApproval) approvalTools.push("http_post", "kb_write", "memory_store");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/agent-v2/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), maxSteps, requireApprovalForTools: approvalTools }),
        signal: ctrl.signal,
      });

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let activeTaskId = "";
      let activeStepIdx = -1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          let ev: AgentEvent;
          try { ev = JSON.parse(raw) as AgentEvent; } catch { continue; }

          switch (ev.type) {
            case "task_id":
              activeTaskId = ev.taskId;
              setTaskId(ev.taskId);
              break;

            case "plan":
              setPlanSteps(ev.steps);
              setStepStates(ev.steps.map(s => ({ step: s, status: "pending", events: [] })));
              break;

            case "step_start":
              activeStepIdx = ev.stepIndex;
              setCurrentStep(ev.stepIndex);
              updateStepStatus(ev.stepIndex, "running");
              break;

            case "thinking":
              if (activeStepIdx >= 0) addEventToStep(activeStepIdx, ev);
              break;

            case "tool_call":
            case "tool_result":
            case "reflection":
              if (activeStepIdx >= 0) addEventToStep(activeStepIdx, ev);
              break;

            case "step_done":
              updateStepStatus(ev.stepIndex, ev.success ? "done" : "failed");
              break;

            case "human_gate": {
              setGate({
                stepIndex: ev.stepIndex,
                question: ev.question,
                step: ev.step,
                editValue: ev.step.description,
                editing: false,
              });
              break;
            }

            case "done":
              setFinalResult(ev.result);
              setTotalMs(ev.totalMs);
              setRunning(false);
              break;

            case "error":
              setErrorMsg(ev.message);
              setRunning(false);
              break;
          }
        }
      }

      // Load audit log after completion
      if (activeTaskId) {
        try {
          const r = await fetch(`/api/agent-v2/${activeTaskId}`);
          const d = await r.json() as { ok: boolean; task: HistoryTask };
          if (d.ok && d.task.audit_log) setAuditLog(d.task.audit_log);
        } catch { /* ignore */ }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorMsg((err as Error).message);
      }
      setRunning(false);
    }
  };

  const handleGate = async (action: "approve" | "reject" | "edit") => {
    if (!taskId || !gate) return;
    const body: Record<string, unknown> = { stepIndex: gate.stepIndex, action };
    if (action === "edit") body["editedInstruction"] = gate.editValue;

    await fetch(`/api/agent-v2/${taskId}/gate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (action === "reject") updateStepStatus(gate.stepIndex, "skipped");
    setGate(null);
  };

  const handleReplay = async (task: HistoryTask) => {
    setGoal(task.goal);
    setTab("run");
    setExpandedTask(null);
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(226,18,39,0.12), 0 0 120px rgba(226,18,39,0.05)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e21227]/10 border border-[#e21227]/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#e21227]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Autonomous Agent</h2>
              <p className="text-[10px] text-zinc-500">Multi-step execution with tools, memory, and reflection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {taskId && (
              <span className="text-[9px] font-mono text-zinc-600 bg-[#111] border border-[#222] px-2 py-0.5 rounded">
                {taskId}
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-zinc-500 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#1a1a1a] bg-[#0d0d0d] px-4">
          {([["run", "Run Agent"], ["history", "Task History"], ["audit", "Audit Log"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-all border-b-2 ${
                tab === id
                  ? "border-[#e21227] text-[#e21227]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {/* ── RUN TAB ───────────────────────────────────────────────────── */}
          {tab === "run" && (
            <div className="h-full flex flex-col lg:flex-row gap-0">
              {/* Left: Input + Plan */}
              <div className="lg:w-72 shrink-0 flex flex-col border-r border-[#1a1a1a]">
                {/* Goal input */}
                <div className="p-4 space-y-3 border-b border-[#1a1a1a]">
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500">Goal</label>
                  <textarea
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    placeholder="Describe what you want the agent to accomplish..."
                    disabled={running}
                    rows={3}
                    className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:border-[#e21227]/50 disabled:opacity-50"
                  />

                  {/* Settings */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">Max steps</span>
                      <div className="flex items-center gap-1">
                        {[5, 10, 15].map(n => (
                          <button
                            key={n}
                            onClick={() => setMaxSteps(n)}
                            disabled={running}
                            className={`px-2 py-0.5 rounded text-[10px] border transition ${
                              maxSteps === n
                                ? "bg-[#e21227]/20 border-[#e21227]/50 text-[#e21227]"
                                : "border-[#222] text-zinc-500 hover:border-[#333]"
                            }`}
                          >{n}</button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={requireShellApproval} onChange={e => setRequireShellApproval(e.target.checked)}
                        disabled={running} className="w-3 h-3 accent-[#e21227]" />
                      <span className="text-[10px] text-zinc-400">Approve shell/file writes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={requireWriteApproval} onChange={e => setRequireWriteApproval(e.target.checked)}
                        disabled={running} className="w-3 h-3 accent-[#e21227]" />
                      <span className="text-[10px] text-zinc-400">Approve HTTP POST / memory</span>
                    </label>
                  </div>

                  {/* Run/Stop */}
                  <div className="flex gap-2">
                    {!running ? (
                      <button
                        onClick={handleRun}
                        disabled={!goal.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#e21227] hover:bg-[#c41020] text-white text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Run Agent
                      </button>
                    ) : (
                      <button
                        onClick={handleStop}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] hover:bg-[#222] text-zinc-300 text-xs font-semibold transition"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                {/* Plan steps */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {planSteps.length === 0 && !running && (
                    <p className="text-[10px] text-zinc-600 text-center pt-8">Plan will appear here</p>
                  )}
                  {planSteps.length === 0 && running && (
                    <div className="flex items-center gap-2 justify-center pt-8">
                      <Loader2 className="w-4 h-4 text-[#e21227] animate-spin" />
                      <p className="text-[10px] text-zinc-500">Planning...</p>
                    </div>
                  )}
                  {planSteps.map((step, i) => {
                    const state = stepStates[i];
                    const status = state?.status ?? "pending";
                    const isCurrent = i === currentStep;
                    return (
                      <div
                        key={step.id}
                        className={`rounded-lg border px-3 py-2 transition-all ${
                          isCurrent
                            ? "border-[#e21227]/40 bg-[#e21227]/5"
                            : status === "done"
                            ? "border-emerald-900/40 bg-emerald-950/10"
                            : status === "failed" || status === "skipped"
                            ? "border-red-900/30 bg-red-950/10 opacity-60"
                            : "border-[#1a1a1a] bg-[#111]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <StepIcon status={status} />
                          <span className="text-[10px] font-semibold text-zinc-300 flex-1 leading-tight">{step.title}</span>
                          {step.tool && <ToolBadge tool={step.tool} />}
                        </div>
                        {isCurrent && (
                          <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">{step.description}</p>
                        )}
                        {step.requiresHumanApproval && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                            <span className="text-[8px] text-amber-400">requires approval</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Live Feed */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Gate overlay */}
                <AnimatePresence>
                  {gate && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="m-4 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-300">Human Approval Required</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 mb-3 whitespace-pre-line">{gate.question}</p>

                      {gate.editing ? (
                        <div className="space-y-2">
                          <textarea
                            value={gate.editValue}
                            onChange={e => setGate(g => g ? { ...g, editValue: e.target.value } : null)}
                            rows={3}
                            className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-[11px] text-white resize-none focus:outline-none focus:border-amber-500/50"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleGate("edit")} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition">
                              <Send className="w-3 h-3" /> Submit Edit
                            </button>
                            <button onClick={() => setGate(g => g ? { ...g, editing: false } : null)} className="px-3 py-1.5 rounded bg-[#222] hover:bg-[#2a2a2a] text-zinc-300 text-[11px] transition">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleGate("approve")} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold transition">
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => setGate(g => g ? { ...g, editing: true } : null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white text-[11px] font-semibold transition">
                            <Edit3 className="w-3 h-3" /> Edit & Approve
                          </button>
                          <button onClick={() => handleGate("reject")} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900 hover:bg-red-800 text-white text-[11px] font-semibold transition">
                            <Ban className="w-3 h-3" /> Reject Step
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Event feed */}
                <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {stepStates.map((ss, i) => {
                    const hasEvents = ss.events.length > 0;
                    const isActive = i === currentStep || ss.status !== "pending";
                    if (!isActive) return null;
                    return (
                      <motion.div
                        key={ss.step.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] overflow-hidden"
                      >
                        <div className={`flex items-center gap-2 px-3 py-2 border-b border-[#1a1a1a] ${
                          ss.status === "running" ? "bg-[#e21227]/5" : ""
                        }`}>
                          <StepIcon status={ss.status} />
                          <span className="text-[11px] font-semibold text-zinc-200">{ss.step.title}</span>
                          {ss.step.tool && <ToolBadge tool={ss.step.tool} />}
                          <span className={`ml-auto text-[9px] uppercase tracking-widest font-bold ${
                            ss.status === "running" ? "text-yellow-400" :
                            ss.status === "done" ? "text-emerald-400" :
                            ss.status === "failed" ? "text-red-400" :
                            ss.status === "skipped" ? "text-zinc-500" : "text-zinc-600"
                          }`}>{ss.status}</span>
                        </div>
                        {hasEvents && (
                          <div className="px-3 py-2 space-y-0.5">
                            {ss.events.map((ev, j) => <EventRow key={j} ev={ev} />)}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Error */}
                  {errorMsg && (
                    <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-bold text-red-300">Agent Error</span>
                      </div>
                      <p className="text-[11px] text-red-200">{errorMsg}</p>
                    </div>
                  )}

                  {/* Final result */}
                  {finalResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-emerald-700/40 bg-emerald-950/10 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-300">Task Complete</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-mono">{fmtMs(totalMs ?? undefined)}</span>
                      </div>
                      <div className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {finalResult}
                      </div>
                    </motion.div>
                  )}

                  {/* Empty state */}
                  {!running && !finalResult && !errorMsg && stepStates.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#e21227]/10 border border-[#e21227]/20 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-[#e21227]/60" />
                      </div>
                      <div>
                        <p className="text-[11px] text-zinc-400">Enter a goal and press Run Agent</p>
                        <p className="text-[9px] text-zinc-600 mt-1">The agent will plan, execute tools, and reflect at each step</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY TAB ───────────────────────────────────────────────── */}
          {tab === "history" && (
            <div className="h-full overflow-y-auto p-4 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Past Agent Tasks</span>
                <button onClick={loadHistory} className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {historyLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[#e21227] animate-spin" />
                </div>
              )}

              {!historyLoading && history.length === 0 && (
                <div className="text-center py-12">
                  <History className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-[11px] text-zinc-600">No past tasks yet</p>
                </div>
              )}

              {history.map(task => (
                <div key={task.task_id} className="rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#111] transition text-left"
                    onClick={() => setExpandedTask(expandedTask === task.task_id ? null : task.task_id)}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      task.status === "done" ? "bg-emerald-500" :
                      task.status === "running" ? "bg-yellow-500 animate-pulse" :
                      "bg-red-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 truncate font-medium">{task.goal}</p>
                      <p className="text-[9px] text-zinc-600 mt-0.5">
                        {fmtDate(task.started_at)} · {fmtMs(task.duration_ms)} · {task.status}
                      </p>
                    </div>
                    {expandedTask === task.task_id ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedTask === task.task_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[#1a1a1a] px-4 py-3 space-y-3"
                      >
                        {/* Steps */}
                        {task.steps_json && task.steps_json.length > 0 && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">Steps</p>
                            <div className="space-y-1">
                              {task.steps_json.map((s, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  {s.success ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                  )}
                                  <div>
                                    <p className="text-[10px] text-zinc-300 font-medium">{s.title}</p>
                                    <p className="text-[9px] text-zinc-600 line-clamp-2">{s.result}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Result */}
                        {task.result && (
                          <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Result</p>
                            <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-4">{task.result}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleReplay(task)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#e21227]/20 border border-[#e21227]/30 hover:bg-[#e21227]/30 text-[#e21227] text-[10px] font-semibold transition"
                          >
                            <RefreshCw className="w-3 h-3" /> Replay
                          </button>
                          <span className="text-[9px] text-zinc-600 font-mono self-center">{task.task_id}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          {/* ── AUDIT LOG TAB ─────────────────────────────────────────────── */}
          {tab === "audit" && (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a]">
                <ScrollText className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Audit Log</span>
                <span className="text-[9px] text-zinc-700">— {auditLog.length} entries</span>
              </div>
              {auditLog.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[11px] text-zinc-600">Run a task to populate the audit log</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4">
                  <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
                    {auditLog.join("\n")}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
