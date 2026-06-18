import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  X, Search, Plus, MessageSquare, Mail, Wrench, Calendar, BarChart2,
  BookOpen, Microscope, Image, Library, Brain, FileText, CheckSquare,
  Palette, Zap, Send, ChevronRight, Loader2, Copy, CheckCheck,
  Trash2, Star, Clock, AlertCircle, Filter, RefreshCw, Download,
  Cpu, Globe, Target, Layers, ArrowRight, Sparkles, Menu, Bot
} from "lucide-react";
import { readChatText } from "@/lib/chat-client";
import { pipeline } from "@/lib/pipeline";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Section =
  | "chat" | "email" | "tools" | "calendar" | "compare"
  | "cookbook" | "research" | "gallery" | "library" | "brain"
  | "notes" | "tasks";

const NAV = [
  { id: "chat" as Section,     icon: MessageSquare, label: "New Chat",      color: "#00e5cc" },
  { id: "email" as Section,    icon: Mail,          label: "Email AI",      color: "#3b82f6" },
  { id: "tools" as Section,    icon: Wrench,        label: "Tools",         color: "#a78bfa" },
  { id: "calendar" as Section, icon: Calendar,      label: "Calendar",      color: "#f59e0b" },
  { id: "compare" as Section,  icon: BarChart2,     label: "Compare",       color: "#ec4899" },
  { id: "cookbook" as Section, icon: Cpu,           label: "Cookbook",      color: "#10b981" },
  { id: "research" as Section, icon: Microscope,    label: "Deep Research", color: "#6366f1" },
  { id: "gallery" as Section,  icon: Image,         label: "Gallery",       color: "#f97316" },
  { id: "library" as Section,  icon: Library,       label: "Library",       color: "#64c8ff" },
  { id: "brain" as Section,    icon: Brain,         label: "Brain",         color: "#e879f9" },
  { id: "notes" as Section,    icon: FileText,      label: "Notes",         color: "#84cc16" },
  { id: "tasks" as Section,    icon: CheckSquare,   label: "Tasks",         color: "#fb923c" },
];

const SECTION_COLOR: Record<Section, string> = {
  chat: "#00e5cc", email: "#3b82f6", tools: "#a78bfa", calendar: "#f59e0b",
  compare: "#ec4899", cookbook: "#10b981", research: "#6366f1", gallery: "#f97316",
  library: "#64c8ff", brain: "#e879f9", notes: "#84cc16", tasks: "#fb923c",
};

function ParticleCanvas({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const pts: { x: number; y: number; vx: number; vy: number; a: number }[] = [];
    for (let i = 0; i < 40; i++) pts.push({ x: Math.random() * 400, y: Math.random() * 400, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, a: Math.random() });
    let raf = 0;
    function draw() {
      c!.width = c!.offsetWidth; c!.height = c!.offsetHeight;
      ctx.clearRect(0, 0, c!.width, c!.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.a += .01;
        if (p.x < 0 || p.x > c!.width) p.vx *= -1;
        if (p.y < 0 || p.y > c!.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(Math.abs(Math.sin(p.a)) * 99).toString(16).padStart(2, "0");
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

function ChatSection({ color }: { color: string }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const q = input.trim(); setInput(""); setStreaming(true);
    setMsgs(m => [...m, { role: "user", text: q }]);
    setDraft("");
    try {
      let full = "";
      await readChatText(
        `You are Odysseus, a helpful AI workspace assistant. ${q}`,
        chunk => { full += chunk; setDraft(full); }
      );
      setMsgs(m => [...m, { role: "ai", text: full }]);
      pipeline.emit("ODYSSEUSWORKSPACE", full);
    } finally { setStreaming(false); setDraft(""); }
  }, [input, streaming]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, draft]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-60">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
              <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center" style={{ borderColor: color }}>
                <Bot size={28} style={{ color }} />
              </div>
            </motion.div>
            <p className="text-sm font-mono" style={{ color }}>Odysseus · Yours for the voyage</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-2">
              {["Research a topic deeply", "Compare two AI models", "Draft a professional email", "Plan a project timeline"].map(p => (
                <button key={p} onClick={() => setInput(p)}
                  className="text-xs p-2 rounded text-left border transition-all hover:opacity-80"
                  style={{ border: `1px solid ${color}44`, background: `${color}0a`, color: "#ccc" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm font-mono leading-relaxed whitespace-pre-wrap`}
              style={m.role === "user"
                ? { background: `${color}22`, border: `1px solid ${color}44`, color: "#e2e8f0" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" }}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {streaming && draft && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="max-w-[80%] px-3 py-2 rounded-lg text-sm font-mono leading-relaxed whitespace-pre-wrap"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}44`, color: "#cbd5e1" }}>
              {draft}<span className="animate-pulse">▋</span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Message Odysseus…" disabled={streaming}
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none placeholder-gray-500 px-3 py-2 rounded border"
          style={{ border: `1px solid ${color}33` }} />
        <button onClick={send} disabled={streaming || !input.trim()}
          className="px-3 py-2 rounded text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

function EmailSection({ color }: { color: string }) {
  const [emails] = useState([
    { from: "security@github.com", subject: "Critical vulnerability in your repo", preview: "A critical security vulnerability has been detected...", time: "2m ago", priority: "CRITICAL" },
    { from: "ceo@company.com", subject: "Q4 Strategy Meeting — Action Required", preview: "Please review the attached deck before Thursday...", time: "1h ago", priority: "ACTION" },
    { from: "newsletter@techcrunch.com", subject: "Top AI stories this week", preview: "This week in AI: GPT-5 rumors, OpenAI updates...", time: "3h ago", priority: "INFO" },
    { from: "billing@aws.com", subject: "Invoice #INV-2024-1124 attached", preview: "Your monthly AWS invoice is now available...", time: "5h ago", priority: "LATER" },
    { from: "noreply@linkedin.com", subject: "You have 12 new connection requests", preview: "People you may know are waiting...", time: "8h ago", priority: "LATER" },
  ]);
  const [selected, setSelected] = useState<number | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const PRIORITY_COLOR: Record<string, string> = { CRITICAL: "#ef4444", ACTION: "#f59e0b", INFO: "#3b82f6", LATER: "#6b7280", SPAM: "#374151" };

  const summarize = async (idx: number) => {
    setSelected(idx); setLoading(true); setSummary("");
    const e = emails[idx];
    let full = "";
    await readChatText(
      `Summarize this email for a busy executive in 2-3 bullet points:\nFrom: ${e.from}\nSubject: ${e.subject}\n${e.preview}`,
      c => { full += c; setSummary(full); }
    );
    setLoading(false);
    pipeline.emit("ODYSSEUSWORKSPACE", full);
  };

  return (
    <div className="flex h-full gap-3 p-4 min-h-0">
      <div className="w-64 flex-shrink-0 space-y-1 overflow-y-auto">
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color }}>Inbox · {emails.length}</div>
        {emails.map((e, i) => (
          <motion.div key={i} whileHover={{ x: 4 }} onClick={() => summarize(i)}
            className="p-2 rounded cursor-pointer border transition-all"
            style={{
              border: selected === i ? `1px solid ${color}66` : "1px solid rgba(255,255,255,0.06)",
              background: selected === i ? `${color}11` : "transparent",
            }}>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs px-1 rounded font-bold" style={{ background: PRIORITY_COLOR[e.priority] + "33", color: PRIORITY_COLOR[e.priority] }}>{e.priority}</span>
              <span className="text-xs text-gray-500 ml-auto">{e.time}</span>
            </div>
            <div className="text-xs font-semibold text-gray-300 truncate">{e.subject}</div>
            <div className="text-xs text-gray-500 truncate mt-0.5">{e.from}</div>
          </motion.div>
        ))}
      </div>
      <div className="flex-1 min-w-0 rounded-lg p-4 border overflow-y-auto" style={{ border: `1px solid ${color}22`, background: `${color}06` }}>
        {selected === null ? (
          <div className="flex items-center justify-center h-full opacity-40">
            <div className="text-center"><Mail size={32} className="mx-auto mb-2" style={{ color }} /><p className="text-sm font-mono" style={{ color }}>Select an email to analyse</p></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-bold text-gray-100">{emails[selected].subject}</div>
              <div className="text-xs text-gray-400 mt-1">From: {emails[selected].from}</div>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed">{emails[selected].preview}</div>
            <div className="border-t pt-3" style={{ borderColor: `${color}22` }}>
              <div className="text-xs font-bold mb-2" style={{ color }}>⚡ AI ANALYSIS</div>
              {loading ? (
                <div className="flex gap-2 items-center text-xs text-gray-400"><Loader2 size={12} className="animate-spin" /> Analysing…</div>
              ) : (
                <div className="text-sm text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">{summary}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResearchSection({ color }: { color: string }) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState(-1);
  const [result, setResult] = useState("");
  const [running, setRunning] = useState(false);
  const PHASES = ["Query Decomposition", "Source Planning", "Parallel Search", "Document Reading", "Cross-Reference", "Gap Analysis", "Adversarial Audit", "Synthesis"];

  const run = async () => {
    if (!query.trim() || running) return;
    setRunning(true); setResult(""); setPhase(0);
    for (let i = 0; i < PHASES.length; i++) {
      setPhase(i);
      await new Promise(r => setTimeout(r, 600));
    }
    let full = "";
    await readChatText(
      `You are Odysseus Deep Research. Conduct a comprehensive multi-phase research report on: "${query}". Include: Executive Summary, Key Findings (5+), Supporting Evidence, Counterarguments, Knowledge Gaps, and Conclusions. Be thorough and academic.`,
      c => { full += c; setResult(full); }
    );
    setPhase(-1); setRunning(false);
    pipeline.emit("ODYSSEUSWORKSPACE", full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
          placeholder="Enter research topic…" disabled={running}
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none placeholder-gray-500 px-3 py-2 rounded border"
          style={{ border: `1px solid ${color}44` }} />
        <button onClick={run} disabled={running || !query.trim()}
          className="px-4 py-2 rounded text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {running ? <Loader2 size={14} className="animate-spin" /> : "RESEARCH"}
        </button>
      </div>
      {running && (
        <div className="grid grid-cols-4 gap-2">
          {PHASES.map((p, i) => (
            <div key={p} className="text-xs p-2 rounded text-center border transition-all"
              style={{ border: i <= phase ? `1px solid ${color}88` : "1px solid rgba(255,255,255,0.08)", background: i <= phase ? `${color}18` : "transparent", color: i <= phase ? color : "#6b7280" }}>
              {i < phase ? "✓ " : i === phase ? "⟳ " : ""}{p}
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto rounded border p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0"
        style={{ border: `1px solid ${color}22`, background: `${color}06` }}>
        {result || <span className="opacity-30">Research results will appear here…</span>}
        {running && result && <span className="animate-pulse">▋</span>}
      </div>
    </div>
  );
}

function NotesSection({ color }: { color: string }) {
  const [notes, setNotes] = useState<{ id: number; title: string; content: string; ts: string }[]>([
    { id: 1, title: "Project Ideas", content: "- Build an AI-powered note-taking system\n- Integrate with calendar for smart scheduling\n- Add voice-to-text for quick captures", ts: "Today 09:24" },
    { id: 2, title: "Research Notes", content: "Key findings from deep research session on cybersecurity trends 2025...", ts: "Yesterday 15:30" },
  ]);
  const [selected, setSelected] = useState(0);
  const [content, setContent] = useState(notes[0].content);
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setNotes(n => n.map((nt, i) => i === selected ? { ...nt, content } : nt));
    setTimeout(() => setSaving(false), 800);
  };

  const newNote = () => {
    const n = { id: Date.now(), title: `Note ${notes.length + 1}`, content: "", ts: "Just now" };
    setNotes(ns => [...ns, n]);
    setSelected(notes.length);
    setContent("");
  };

  return (
    <div className="flex h-full gap-3 p-4 min-h-0">
      <div className="w-48 flex-shrink-0 space-y-1 overflow-y-auto">
        <button onClick={newNote} className="w-full text-xs py-1.5 px-2 rounded flex items-center gap-1 transition-all hover:opacity-80 mb-2"
          style={{ background: color, color: "#000", fontWeight: "bold" }}>
          <Plus size={12} /> New Note
        </button>
        {notes.map((n, i) => (
          <div key={n.id} onClick={() => { setSelected(i); setContent(n.content); }}
            className="p-2 rounded cursor-pointer border transition-all"
            style={{ border: selected === i ? `1px solid ${color}66` : "1px solid rgba(255,255,255,0.06)", background: selected === i ? `${color}11` : "transparent" }}>
            <div className="text-xs font-semibold text-gray-300 truncate">{n.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{n.ts}</div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0 gap-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-200">{notes[selected]?.title}</span>
          <button onClick={save} className="text-xs px-3 py-1 rounded transition-all hover:opacity-80"
            style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
            {saving ? "Saved ✓" : "Save"}
          </button>
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none resize-none p-3 rounded border leading-relaxed"
          style={{ border: `1px solid ${color}22`, background: `${color}06` }}
          placeholder="Start writing…" />
      </div>
    </div>
  );
}

function TasksSection({ color }: { color: string }) {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Review security audit report", priority: "CRITICAL", done: false },
    { id: 2, text: "Set up Odysseus deep research pipeline", priority: "HIGH", done: false },
    { id: 3, text: "Compare GPT-4o vs Claude 3.5 models", priority: "HIGH", done: true },
    { id: 4, text: "Update project documentation", priority: "MEDIUM", done: false },
    { id: 5, text: "Clear inbox backlog", priority: "LOW", done: false },
  ]);
  const [input, setInput] = useState("");
  const [planning, setPlanning] = useState(false);
  const PC: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#6b7280" };

  const addTask = () => {
    if (!input.trim()) return;
    setTasks(t => [...t, { id: Date.now(), text: input.trim(), priority: "MEDIUM", done: false }]);
    setInput("");
  };

  const aiPlan = async () => {
    setPlanning(true);
    let full = "";
    await readChatText(
      `Generate 5 actionable tasks for a cybersecurity professional to do today. Format: one task per line, starting with priority [CRITICAL/HIGH/MEDIUM/LOW]: task description.`,
      c => full += c
    );
    const newTasks = full.split("\n").filter(l => l.trim()).slice(0, 5).map((l, i) => {
      const match = l.match(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]/i);
      return { id: Date.now() + i, text: l.replace(/\[.*?\]:?\s*/, "").trim(), priority: match?.[1].toUpperCase() || "MEDIUM", done: false };
    });
    setTasks(t => [...t, ...newTasks]);
    setPlanning(false);
    pipeline.emit("ODYSSEUSWORKSPACE", full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
          placeholder="Add a task…"
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 rounded border"
          style={{ border: `1px solid ${color}44` }} />
        <button onClick={addTask} className="px-3 py-2 rounded text-xs font-bold" style={{ background: color, color: "#000" }}><Plus size={14} /></button>
        <button onClick={aiPlan} disabled={planning}
          className="px-3 py-2 rounded text-xs font-bold flex items-center gap-1 transition-all hover:opacity-80 disabled:opacity-40"
          style={{ border: `1px solid ${color}66`, color }}>
          {planning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Plan
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(pri => {
          const group = tasks.filter(t => t.priority === pri);
          if (!group.length) return null;
          return (
            <div key={pri}>
              <div className="text-xs font-bold mb-1 px-1" style={{ color: PC[pri] }}>{pri} · {group.length}</div>
              {group.map(t => (
                <motion.div key={t.id} layout whileHover={{ x: 3 }}
                  className="flex items-center gap-2 p-2 rounded border mb-1 cursor-pointer transition-all"
                  style={{ border: `1px solid ${PC[pri]}22`, background: `${PC[pri]}08`, opacity: t.done ? 0.5 : 1 }}
                  onClick={() => setTasks(ts => ts.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}>
                  <div className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all"
                    style={{ border: `1px solid ${PC[pri]}66`, background: t.done ? PC[pri] : "transparent" }}>
                    {t.done && <CheckCheck size={10} color="#000" />}
                  </div>
                  <span className="text-sm text-gray-300 font-mono" style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GallerySection({ color }: { color: string }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [description, setDescription] = useState("");
  const EXAMPLES = ["Futuristic cyberpunk cityscape at night", "Abstract AI neural network visualization", "Space station with Earth in background", "Quantum computer made of light and glass"];

  const generate = async (p: string) => {
    setPrompt(p); setGenerating(true); setDescription("");
    let full = "";
    await readChatText(
      `You are an AI image description system. Create a vivid, detailed description of an image prompt: "${p}". Describe colors, composition, lighting, mood, style, and details as if describing a real image to someone. Make it visually rich and detailed (4-6 sentences).`,
      c => { full += c; setDescription(full); }
    );
    setGenerating(false);
    pipeline.emit("ODYSSEUSWORKSPACE", full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && generate(prompt)}
          placeholder="Describe an image to generate…"
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 rounded border"
          style={{ border: `1px solid ${color}44` }} />
        <button onClick={() => generate(prompt)} disabled={generating || !prompt.trim()}
          className="px-4 py-2 rounded text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {generating ? <Loader2 size={14} className="animate-spin" /> : "GENERATE"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {EXAMPLES.map(e => (
          <button key={e} onClick={() => generate(e)}
            className="text-xs p-2 rounded border text-left transition-all hover:opacity-80"
            style={{ border: `1px solid ${color}33`, background: `${color}08`, color: "#aaa" }}>
            {e}
          </button>
        ))}
      </div>
      {(generating || description) && (
        <div className="flex-1 rounded border p-4 min-h-0 overflow-y-auto" style={{ border: `1px solid ${color}33`, background: `${color}0a` }}>
          <div className="text-xs font-bold mb-2" style={{ color }}>⚡ AI IMAGE VISION</div>
          <div className="w-full h-40 rounded mb-3 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}15, ${color}30)`, border: `1px solid ${color}33` }}>
            {generating ? <Loader2 size={24} className="animate-spin" style={{ color }} /> : <Image size={32} style={{ color, opacity: 0.5 }} />}
          </div>
          <p className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{description}</p>
          {generating && <span className="animate-pulse text-gray-400">▋</span>}
        </div>
      )}
    </div>
  );
}

function BrainSection({ color }: { color: string }) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState("");
  const TOPICS = ["Explain quantum entanglement", "How do transformers work?", "What is zero-trust security?", "Explain the CAP theorem"];

  const think = async (q: string) => {
    setQuery(q); setThinking(true); setResult("");
    let full = "";
    await readChatText(
      `You are Odysseus Brain — a deep knowledge engine. Provide a comprehensive, structured explanation of: "${q}". Include: core concept, how it works, real-world applications, key insights, and related concepts. Use markdown-style formatting with clear sections.`,
      c => { full += c; setResult(full); }
    );
    setThinking(false);
    pipeline.emit("ODYSSEUSWORKSPACE", full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && think(query)}
          placeholder="Ask the Brain anything…"
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 rounded border"
          style={{ border: `1px solid ${color}44` }} />
        <button onClick={() => think(query)} disabled={thinking || !query.trim()}
          className="px-4 py-2 rounded text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {thinking ? <Loader2 size={14} className="animate-spin" /> : "THINK"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TOPICS.map(t => (
          <button key={t} onClick={() => think(t)}
            className="text-xs p-2 rounded border text-left transition-all hover:opacity-80"
            style={{ border: `1px solid ${color}33`, background: `${color}08`, color: "#aaa" }}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto rounded border p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0"
        style={{ border: `1px solid ${color}22`, background: `${color}06` }}>
        {result || <span className="opacity-30">Knowledge synthesis will appear here…</span>}
        {thinking && <span className="animate-pulse">▋</span>}
      </div>
    </div>
  );
}

function LibrarySection({ color }: { color: string }) {
  const DOCS = [
    { title: "Deep Research Report: AI Trends 2025", type: "Research", size: "12.4 KB", date: "Today" },
    { title: "Security Audit Q3 2024", type: "Report", size: "8.1 KB", date: "Yesterday" },
    { title: "System Architecture Overview", type: "Document", size: "5.6 KB", date: "3 days ago" },
    { title: "Model Comparison: GPT-4o vs Claude 3.5", type: "Analysis", size: "4.2 KB", date: "1 week ago" },
    { title: "Email Campaign Templates", type: "Template", size: "2.8 KB", date: "2 weeks ago" },
  ];
  const TYPE_COLOR: Record<string, string> = { Research: "#6366f1", Report: "#ef4444", Document: "#3b82f6", Analysis: "#10b981", Template: "#f59e0b" };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 rounded border" style={{ border: `1px solid ${color}33`, background: `${color}08` }}>
        <Search size={14} style={{ color }} />
        <input placeholder="Search library…" className="flex-1 bg-transparent text-sm text-gray-300 outline-none font-mono" />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {DOCS.map((doc, i) => (
          <motion.div key={i} whileHover={{ x: 4 }}
            className="flex items-center gap-3 p-3 rounded border cursor-pointer transition-all"
            style={{ border: `1px solid rgba(255,255,255,0.06)`, background: "rgba(255,255,255,0.02)" }}>
            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: `${TYPE_COLOR[doc.type]}22`, border: `1px solid ${TYPE_COLOR[doc.type]}44` }}>
              <FileText size={14} style={{ color: TYPE_COLOR[doc.type] }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-200 truncate">{doc.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{doc.type} · {doc.size} · {doc.date}</div>
            </div>
            <Download size={14} className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CompareSection({ color }: { color: string }) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [resA, setResA] = useState(""); const [resB, setResB] = useState("");
  const [voted, setVoted] = useState<"A" | "B" | null>(null);
  const MODELS = ["GPT-4o (OpenAI)", "Claude 3.5 Sonnet (Anthropic)"];

  const run = async () => {
    if (!prompt.trim() || running) return;
    setRunning(true); setResA(""); setResB(""); setVoted(null);
    await Promise.all([
      readChatText(`Model A responding to: "${prompt}". Provide a thorough, helpful response.`, c => setResA(p => p + c)),
      readChatText(`Model B responding to: "${prompt}". Provide a different perspective and approach.`, c => setResB(p => p + c)),
    ]);
    setRunning(false);
    pipeline.emit("ODYSSEUSWORKSPACE", `Compare complete: ${prompt}`);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
          placeholder="Enter prompt to compare…"
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 rounded border"
          style={{ border: `1px solid ${color}44` }} />
        <button onClick={run} disabled={running || !prompt.trim()}
          className="px-4 py-2 rounded text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {running ? <Loader2 size={14} className="animate-spin" /> : "COMPARE"}
        </button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {["A", "B"].map((label, idx) => (
          <div key={label} className="flex flex-col rounded border overflow-hidden min-h-0"
            style={{ border: `1px solid ${idx === 0 ? "#3b82f6" : "#10b981"}44` }}>
            <div className="px-3 py-2 flex items-center justify-between text-xs font-bold"
              style={{ background: `${idx === 0 ? "#3b82f6" : "#10b981"}18`, color: idx === 0 ? "#3b82f6" : "#10b981" }}>
              <span>Model {label} {voted ? `· ${MODELS[idx]}` : ""}</span>
              {(resA || resB) && !voted && (
                <button onClick={() => { setVoted(label as "A" | "B"); pipeline.emit("ODYSSEUSWORKSPACE", `Voted: Model ${label}`); }}
                  className="px-2 py-0.5 rounded text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: idx === 0 ? "#3b82f644" : "#10b98144" }}>
                  Vote {label}
                </button>
              )}
              {voted === label && <span className="text-yellow-400">★ WINNER</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0">
              {(idx === 0 ? resA : resB) || <span className="opacity-30">Awaiting response…</span>}
              {running && <span className="animate-pulse">▋</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CookbookSection({ color }: { color: string }) {
  const [profile, setProfile] = useState(0);
  const [advice, setAdvice] = useState(""); const [loading, setLoading] = useState(false);
  const PROFILES = [
    { name: "CPU Only", spec: "No GPU, 8GB RAM", icon: "💻", models: ["Llama 3.2 3B", "Phi-3 Mini", "Gemma 2B"] },
    { name: "Mid GPU", spec: "8GB VRAM, 16GB RAM", icon: "🖥️", models: ["Llama 3.1 8B", "Mistral 7B", "CodeLlama 7B"] },
    { name: "High-End GPU", spec: "24GB VRAM, 32GB RAM", icon: "⚡", models: ["Llama 3.1 70B Q4", "Mixtral 8x7B", "Yi-34B"] },
    { name: "Dual GPU", spec: "48GB+ VRAM", icon: "🔥", models: ["Llama 3.1 70B", "Mixtral 8x22B", "Falcon 180B"] },
    { name: "Cloud API", spec: "No local GPU needed", icon: "☁️", models: ["GPT-4o", "Claude 3.5", "Gemini 1.5 Pro"] },
  ];
  const P = PROFILES[profile];

  const getAdvice = async () => {
    setLoading(true); setAdvice("");
    let full = "";
    await readChatText(
      `You are an LLM deployment expert. Give specific recommendations for running AI models on: ${P.name} (${P.spec}). Cover: best models to run, performance expectations, ollama commands to install them, memory requirements, and optimization tips. Be specific and technical.`,
      c => { full += c; setAdvice(full); }
    );
    setLoading(false);
    pipeline.emit("ODYSSEUSWORKSPACE", full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="grid grid-cols-5 gap-2">
        {PROFILES.map((p, i) => (
          <button key={i} onClick={() => { setProfile(i); setAdvice(""); }}
            className="text-xs p-2 rounded border text-center transition-all"
            style={{ border: i === profile ? `1px solid ${color}88` : "1px solid rgba(255,255,255,0.1)", background: i === profile ? `${color}18` : "transparent", color: i === profile ? color : "#888" }}>
            <div className="text-lg mb-1">{p.icon}</div>{p.name}
          </button>
        ))}
      </div>
      <div className="p-3 rounded border" style={{ border: `1px solid ${color}33`, background: `${color}0a` }}>
        <div className="text-xs font-bold mb-2" style={{ color }}>{P.icon} {P.name} · {P.spec}</div>
        <div className="flex flex-wrap gap-1">
          {P.models.map(m => (
            <span key={m} className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}22`, color }}>{m}</span>
          ))}
        </div>
        <button onClick={getAdvice} disabled={loading}
          className="mt-2 text-xs px-3 py-1 rounded transition-all hover:opacity-80 disabled:opacity-40 flex items-center gap-1"
          style={{ background: color, color: "#000", fontWeight: "bold" }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Get AI Advice
        </button>
      </div>
      <div className="flex-1 overflow-y-auto rounded border p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0"
        style={{ border: `1px solid ${color}22`, background: `${color}06` }}>
        {advice || <span className="opacity-30">Select a profile and get AI recommendations…</span>}
        {loading && <span className="animate-pulse">▋</span>}
      </div>
    </div>
  );
}

function CalendarSection({ color }: { color: string }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates = Array.from({ length: 35 }, (_, i) => i - 3);
  const today = new Date().getDate();
  const EVENTS = [
    { day: today, title: "Security Review", time: "09:00", color: "#ef4444" },
    { day: today + 1, title: "AI Model Testing", time: "14:00", color: "#3b82f6" },
    { day: today + 3, title: "Team Standup", time: "10:00", color: "#10b981" },
  ];

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="text-xs font-bold" style={{ color }}>JUNE 2025</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => <div key={d} className="text-xs text-center text-gray-500 font-bold">{d}</div>)}
        {dates.map((d, i) => {
          const date = d + 1;
          const event = EVENTS.find(e => e.day === date);
          return (
            <div key={i} className="aspect-square rounded flex flex-col items-center justify-center text-xs cursor-pointer transition-all hover:opacity-80 relative"
              style={{ background: date === today ? `${color}22` : "transparent", border: date === today ? `1px solid ${color}66` : "1px solid transparent", color: date <= 0 || date > 31 ? "#333" : "#ccc" }}>
              {date > 0 && date <= 31 && (
                <>
                  <span>{date}</span>
                  {event && <div className="w-1 h-1 rounded-full mt-0.5 absolute bottom-1" style={{ background: event.color }} />}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="text-xs font-bold mb-2" style={{ color }}>UPCOMING EVENTS</div>
        {EVENTS.map((e, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded border mb-1"
            style={{ border: `1px solid ${e.color}33`, background: `${e.color}0a` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
            <span className="text-xs text-gray-300 flex-1">{e.title}</span>
            <span className="text-xs text-gray-500">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolsSection({ color }: { color: string }) {
  const TOOLS = [
    { name: "Deep Research", desc: "8-phase multi-source research", icon: "🔍", section: "research" as Section },
    { name: "Compare Models", desc: "Blind side-by-side testing", icon: "⚖️", section: "compare" as Section },
    { name: "Document AI", desc: "AI writing & editing", icon: "📝", section: "notes" as Section },
    { name: "Brain", desc: "Deep knowledge synthesis", icon: "🧠", section: "brain" as Section },
    { name: "Email AI", desc: "Triage & auto-reply", icon: "📧", section: "email" as Section },
    { name: "Model Cookbook", desc: "Hardware LLM recommendations", icon: "🍳", section: "cookbook" as Section },
    { name: "Gallery AI", desc: "AI image descriptions", icon: "🖼️", section: "gallery" as Section },
    { name: "Tasks", desc: "AI task planning", icon: "✅", section: "tasks" as Section },
    { name: "Calendar", desc: "Smart scheduling", icon: "📅", section: "calendar" as Section },
    { name: "Library", desc: "Document storage", icon: "📚", section: "library" as Section },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 p-4 overflow-y-auto">
      {TOOLS.map(t => (
        <motion.div key={t.name} whileHover={{ scale: 1.02, y: -2 }}
          className="p-3 rounded border cursor-pointer transition-all"
          style={{ border: `1px solid ${color}33`, background: `${color}08` }}>
          <div className="text-2xl mb-2">{t.icon}</div>
          <div className="text-sm font-bold text-gray-200">{t.name}</div>
          <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
        </motion.div>
      ))}
    </div>
  );
}

export function OdysseusWorkspaceModal({ open, onOpenChange }: Props) {
  const [section, setSection] = useState<Section>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const color = SECTION_COLOR[section];
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 100, damping: 30 });

  const renderSection = () => {
    switch (section) {
      case "chat": return <ChatSection color={color} />;
      case "email": return <EmailSection color={color} />;
      case "tools": return <ToolsSection color={color} />;
      case "calendar": return <CalendarSection color={color} />;
      case "compare": return <CompareSection color={color} />;
      case "cookbook": return <CookbookSection color={color} />;
      case "research": return <ResearchSection color={color} />;
      case "gallery": return <GallerySection color={color} />;
      case "library": return <LibrarySection color={color} />;
      case "brain": return <BrainSection color={color} />;
      case "notes": return <NotesSection color={color} />;
      case "tasks": return <TasksSection color={color} />;
    }
  };

  const activeNav = NAV.find(n => n.id === section)!;

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-6xl h-[88vh] rounded-2xl overflow-hidden flex"
          style={{ background: "#0a0a0f", border: `1px solid ${color}33`, boxShadow: `0 0 60px ${color}20, 0 0 120px ${color}10` }}>

          <ParticleCanvas color={color} />

          {/* Sidebar */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }} animate={{ width: 192, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="flex-shrink-0 overflow-hidden flex flex-col border-r relative z-10"
                style={{ borderColor: `${color}22`, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
                <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: `${color}22` }}>
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                    <Zap size={12} style={{ color }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color }}>Odysseus</span>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {NAV.map(n => {
                    const Icon = n.icon;
                    const active = section === n.id;
                    return (
                      <motion.button key={n.id} whileHover={{ x: 4 }} onClick={() => setSection(n.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all"
                        style={{ color: active ? n.color : "#6b7280", background: active ? `${n.color}15` : "transparent" }}>
                        <Icon size={14} style={{ color: active ? n.color : "#4b5563" }} />
                        {n.label}
                        {active && <ChevronRight size={10} className="ml-auto" style={{ color: n.color }} />}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="p-3 border-t text-xs text-gray-600 font-mono" style={{ borderColor: `${color}11` }}>
                  v2.0 · Odysseus AI
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0 relative z-10">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: `${color}22`, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)" }}>
              <button onClick={() => setSidebarOpen(v => !v)} className="p-1.5 rounded transition-all hover:opacity-70" style={{ border: `1px solid ${color}33` }}>
                <Menu size={14} style={{ color }} />
              </button>
              <activeNav.icon size={16} style={{ color }} />
              <span className="text-sm font-bold" style={{ color }}>{activeNav.label}</span>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
                <span className="text-xs text-gray-500 font-mono">LIVE</span>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-1.5 rounded transition-all hover:opacity-70" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            {/* Section content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={section} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }} className="h-full overflow-hidden">
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
