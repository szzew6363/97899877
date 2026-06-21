import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckSquare, Square, Plus, Calendar, Clock, Trash2, Zap, Loader2, Star, Tag } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
async function streamOdysseus(prompt: string, onChunk: (c: string) => void): Promise<string> {
  const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], stream: true }) });
  if (!resp.ok || !resp.body) return "";
  const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue; const raw = line.slice(6).trim(); if (!raw || raw === "[DONE]") continue;
      try { const obj = JSON.parse(raw) as { content?: string; choices?: { delta?: { content?: string } }[] }; const c2 = obj.content ?? obj.choices?.[0]?.delta?.content ?? ""; if (c2) { full += c2; onChunk(full); } } catch { /* ignore */ }
    }
  }
  return full;
}


interface OdysseusTaskCalendarModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Priority = "low" | "medium" | "high" | "critical";
type Task = { id: string; text: string; done: boolean; priority: Priority; tag: string; due?: string; aiGenerated?: boolean };

const PRIORITY_COLORS: Record<Priority, string> = { low: "#10b981", medium: "#3b82f6", high: "#f97316", critical: "#e21227" };
const PRIORITY_LABELS: Record<Priority, string> = { low: "LOW", medium: "MED", high: "HIGH", critical: "CRIT" };

const SAMPLE_TASKS: Task[] = [
  { id: "1", text: "Review security audit report from Q4", done: false, priority: "critical", tag: "SECURITY", due: "Today" },
  { id: "2", text: "Deploy AI model to production cluster", done: false, priority: "high", tag: "DEVOPS", due: "Tomorrow" },
  { id: "3", text: "Write weekly threat intelligence briefing", done: true, priority: "medium", tag: "INTEL", due: "Done" },
  { id: "4", text: "Update OSINT scanning rules for Q1", done: false, priority: "medium", tag: "OSINT", due: "This week" },
  { id: "5", text: "Patch CVE-2026-1337 across all nodes", done: false, priority: "critical", tag: "PATCH", due: "URGENT" },
];

const QUICK_PROMPTS = [
  "Plan my week for maximum productivity",
  "Break down a complex security project into tasks",
  "Create a 30-day AI learning curriculum",
  "Generate a penetration testing task checklist",
];

export function OdysseusTaskCalendarModal({ open, onOpenChange }: OdysseusTaskCalendarModalProps) {
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tag, setTag] = useState("GENERAL");
  const [aiQuery, setAiQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [view, setView] = useState<"tasks" | "ai">("tasks");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  function addTask() {
    if (!newTask.trim()) return;
    const t: Task = { id: Date.now().toString(), text: newTask, done: false, priority, tag, due: "No date" };
    setTasks(prev => [t, ...prev]);
    setNewTask("");
  }

  function toggleTask(id: string) { setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function deleteTask(id: string) { setTasks(prev => prev.filter(t => t.id !== id)); }

  async function runAI(q: string) {
    if (!q.trim() || running) return;
    setRunning(true); setAiOutput(""); setView("ai");
    pipeline.push({ source: "Odysseus Tasks", label: `AI Tasks: ${q.slice(0, 30)}`, content: "", sourceColor: "#f59e0b" });
    const prompt = `You are an AI task management and productivity expert integrated into Odysseus workspace.

User request: "${q}"

Provide:
1. A structured task breakdown with priorities (CRITICAL/HIGH/MEDIUM/LOW)
2. Time estimates for each task
3. Dependencies and sequencing
4. Pro tips for execution
5. Success metrics

Format tasks as:
[PRIORITY] Task name — Time estimate
> Details and approach

Be specific, actionable, and strategic.`;
    try {
      await streamOdysseus(prompt, full => setAiOutput(prev => full));
    } catch { setAiOutput("AI planning unavailable. Please try again."); }
    setRunning(false);
  }

  function parseAndImportTasks() {
    const lines = aiOutput.split("\n").filter(l => /^\[(?:CRITICAL|HIGH|MEDIUM|LOW)\]/.test(l.trim()));
    const imported: Task[] = lines.slice(0, 10).map((l, i) => {
      const match = l.match(/^\[(\w+)\]\s+(.+?)(?:\s+—.*)?$/);
      const p = (match?.[1]?.toLowerCase() ?? "medium") as Priority;
      return { id: `ai-${Date.now()}-${i}`, text: match?.[2] ?? l.replace(/^\[.*?\]\s+/, "").trim(), done: false, priority: PRIORITY_COLORS[p] ? p : "medium", tag: "AI-PLANNED", aiGenerated: true };
    });
    if (imported.length > 0) { setTasks(prev => [...imported, ...prev]); setView("tasks"); }
  }

  if (!open) return null;

  const filtered = tasks.filter(t => filter === "all" ? true : filter === "active" ? !t.done : t.done);
  const stats = { total: tasks.length, done: tasks.filter(t => t.done).length, critical: tasks.filter(t => t.priority === "critical" && !t.done).length };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        className="relative w-full max-w-5xl h-[88vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(145deg, #040507 0%, #030305 60%, #050407 100%)", border: "1px solid rgba(245,158,11,0.15)", boxShadow: "0 0 80px rgba(245,158,11,0.05), inset 0 1px 0 rgba(245,158,11,0.04)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "rgba(245,158,11,0.1)", background: "rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 0 12px rgba(245,158,11,0.15)" }}>
              <CheckSquare className="w-4 h-4" style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <div className="text-sm font-black tracking-widest font-mono" style={{ color: "#f59e0b" }}>ODYSSEUS TASKS & CALENDAR</div>
              <div className="text-[9px] font-mono" style={{ color: "rgba(245,158,11,0.45)" }}>AI-POWERED TASK MANAGEMENT · SMART PLANNING · PRIORITY MATRIX</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["tasks", "ai"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all"
                  style={{ background: view === v ? "rgba(245,158,11,0.15)" : "transparent", border: `1px solid ${view === v ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.06)"}`, color: view === v ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
                  {v === "tasks" ? "📋 TASKS" : "🤖 AI PLAN"}
                </button>
              ))}
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(245,158,11,0.06)" }}>
          {[{ l: "TOTAL TASKS", v: stats.total, c: "#f59e0b" }, { l: "COMPLETED", v: stats.done, c: "#10b981" }, { l: "CRITICAL", v: stats.critical, c: "#e21227" }].map(s => (
            <div key={s.l} className="rounded-xl px-3 py-2 flex items-center gap-3" style={{ background: `${s.c}08`, border: `1px solid ${s.c}18` }}>
              <div className="text-2xl font-black font-mono" style={{ color: s.c }}>{s.v}</div>
              <div className="text-[8px] font-mono tracking-widest" style={{ color: `${s.c}70` }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {view === "tasks" ? (
              <motion.div key="tasks" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                {/* Add task */}
                <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
                    placeholder="Add a new task... (Press Enter)"
                    className="flex-1 bg-transparent outline-none text-sm font-mono" style={{ color: "#ccc" }} />
                  <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                    className="px-2 py-1 rounded-lg text-[9px] font-black outline-none"
                    style={{ background: `${PRIORITY_COLORS[priority]}15`, border: `1px solid ${PRIORITY_COLORS[priority]}35`, color: PRIORITY_COLORS[priority] }}>
                    {(["low", "medium", "high", "critical"] as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                  <input value={tag} onChange={e => setTag(e.target.value.toUpperCase())} placeholder="TAG"
                    className="w-20 bg-transparent outline-none text-[9px] font-black px-2 py-1 rounded-lg"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }} />
                  <motion.button onClick={addTask} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b" }}>
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Filter */}
                <div className="flex gap-1.5">
                  {(["all", "active", "done"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className="px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all"
                      style={{ background: filter === f ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.02)", border: `1px solid ${filter === f ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)"}`, color: filter === f ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
                      {f === "all" ? `All (${tasks.length})` : f === "active" ? `Active (${tasks.filter(t => !t.done).length})` : `Done (${tasks.filter(t => t.done).length})`}
                    </button>
                  ))}
                </div>

                {/* Task list */}
                <div className="flex-1 overflow-y-auto space-y-1.5">
                  <AnimatePresence>
                    {filtered.map(task => (
                      <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} layout
                        whileHover={{ x: 2 }} className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                        style={{ background: task.done ? "rgba(255,255,255,0.015)" : `${PRIORITY_COLORS[task.priority]}06`, border: `1px solid ${task.done ? "rgba(255,255,255,0.04)" : `${PRIORITY_COLORS[task.priority]}18`}` }}>
                        <button onClick={() => toggleTask(task.id)} className="flex-shrink-0 transition-transform hover:scale-110">
                          {task.done ? <CheckSquare className="w-4 h-4" style={{ color: "#10b981" }} /> : <Square className="w-4 h-4" style={{ color: PRIORITY_COLORS[task.priority] }} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold" style={{ color: task.done ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.75)", textDecoration: task.done ? "line-through" : "none" }}>
                            {task.text}
                            {task.aiGenerated && <span className="ml-2 text-[8px] font-black" style={{ color: "#a78bfa" }}>AI</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: `${PRIORITY_COLORS[task.priority]}15`, color: PRIORITY_COLORS[task.priority] }}>{PRIORITY_LABELS[task.priority]}</span>
                            <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{task.tag}</span>
                            {task.due && <span className="text-[8px] font-mono flex items-center gap-0.5" style={{ color: task.due === "URGENT" || task.due === "Today" ? "#e21227" : "rgba(255,255,255,0.2)" }}><Clock className="w-2.5 h-2.5" />{task.due}</span>}
                          </div>
                        </div>
                        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(255,77,77,0.6)" }} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                {/* Quick prompts */}
                <div>
                  <div className="text-[9px] font-black tracking-widest mb-2" style={{ color: "rgba(245,158,11,0.6)" }}>QUICK PLANNING PROMPTS</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {QUICK_PROMPTS.map(q => (
                      <motion.button key={q} onClick={() => { setAiQuery(q); runAI(q); }} whileHover={{ scale: 1.02 }}
                        className="text-left px-3 py-2.5 rounded-xl text-[9px] font-medium"
                        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)", color: "rgba(255,255,255,0.45)" }}>
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </div>
                {/* Custom query */}
                <div className="flex gap-2">
                  <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runAI(aiQuery)}
                    placeholder="Ask AI to plan your tasks, break down projects, create schedules..."
                    className="flex-1 px-4 py-2.5 rounded-xl outline-none text-sm font-mono"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", color: "#ccc" }} />
                  <motion.button onClick={() => runAI(aiQuery)} disabled={!aiQuery.trim() || running} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black disabled:opacity-40"
                    style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#f59e0b" }}>
                    {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    PLAN
                  </motion.button>
                </div>
                {/* AI Output */}
                <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(245,158,11,0.1)" }}>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(245,158,11,0.08)" }}>
                    <span className="text-[9px] font-black tracking-widest font-mono" style={{ color: running ? "#f59e0b" : aiOutput ? "#10b981" : "#333" }}>
                      {running ? "AI PLANNING IN PROGRESS..." : aiOutput ? "PLAN READY" : "AWAITING REQUEST"}
                    </span>
                    {aiOutput && !running && (
                      <motion.button onClick={parseAndImportTasks} whileHover={{ scale: 1.04 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black"
                        style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#f59e0b" }}>
                        <Plus className="w-3 h-3" /> IMPORT TASKS
                      </motion.button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {!aiOutput && !running ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "rgba(245,158,11,0.2)" }}>
                        <Calendar className="w-12 h-12" />
                        <div className="text-[10px] font-mono tracking-widest">AI TASK PLANNER READY</div>
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {aiOutput}
                        {running && <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: "#f59e0b" }}>█</motion.span>}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
