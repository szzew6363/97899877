import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Play, Plus, Trash2, RefreshCw, MessageSquare, Settings, Zap, Shield, Code, Search, Brain, ChevronDown, Send } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Agent { id: string; name: string; role: string; model: string; systemPrompt: string; tools: string[]; color: string }
interface AgentMessage { agentId: string; agentName: string; role: "agent" | "system"; content: string; timestamp: Date }

const PRESET_AGENTS: Omit<Agent, "id">[] = [
  { name: "محلل الأمن", role: "security", model: "gpt-4o", systemPrompt: "أنت محلل أمن معلومات خبير. تحلل المخاطر والثغرات وتقدم توصيات أمنية دقيقة.", tools: ["web_search", "code_scan"], color: "#ef4444" },
  { name: "مختبر الاختراق", role: "pentest", model: "gpt-4o", systemPrompt: "أنت متخصص في اختبار الاختراق الأخلاقي. تحدد ثغرات الأنظمة وتوثقها بشكل احترافي.", tools: ["shell", "code_scan"], color: "#f97316" },
  { name: "مطور الكود", role: "developer", model: "gpt-4o", systemPrompt: "أنت مطور برمجيات خبير متخصص في أمان الكود وكتابة بكود آمن وخالٍ من الثغرات.", tools: ["code_scan", "git"], color: "#3b82f6" },
  { name: "محرك البحث", role: "researcher", model: "gpt-4o", systemPrompt: "أنت باحث معلومات متقدم. تجمع وتحلل المعلومات من مصادر متعددة لدعم قرارات الفريق.", tools: ["web_search", "rag"], color: "#8b5cf6" },
];

const TOOL_ICONS: Record<string, React.ElementType> = {
  web_search: Search, code_scan: Shield, shell: Code, git: Code, rag: Brain,
};

const MODELS = ["gpt-4o", "gpt-4o-mini", "claude-3-opus", "claude-3-haiku", "gemini-1.5-pro"];

interface Props { onClose?: () => void }

export function MultiAgentPage({ onClose }: Props) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [tab, setTab] = useState<"council" | "agents" | "history">("council");
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const addPreset = (preset: Omit<Agent, "id">) => {
    const agent = { ...preset, id: Math.random().toString(36).slice(2) };
    setAgents(a => [...a, agent]);
    setSelectedAgents(s => new Set([...s, agent.id]));
    toast({ title: `✅ تم إضافة ${preset.name}` });
  };

  const removeAgent = (id: string) => {
    setAgents(a => a.filter(x => x.id !== id));
    setSelectedAgents(s => { const n = new Set(s); n.delete(id); return n; });
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const runCouncil = async () => {
    if (!task.trim() || selectedAgents.size === 0) return;
    setRunning(true);
    const newMessages: AgentMessage[] = [];
    setMessages([{ agentId: "system", agentName: "النظام", role: "system", content: `🚀 بدء مجلس الوكلاء: ${selectedAgents.size} وكيل للمهمة: "${task}"`, timestamp: new Date() }]);

    const activeAgents = agents.filter(a => selectedAgents.has(a.id));

    try {
      for (const agent of activeAgents) {
        setMessages(m => [...m, { agentId: agent.id, agentName: agent.name, role: "system", content: `⚙️ ${agent.name} يعمل على المهمة...`, timestamp: new Date() }]);

        const res = await authFetch("/api/council", {
          method: "POST",
          body: JSON.stringify({
            messages: [
              { role: "system", content: agent.systemPrompt },
              { role: "user", content: task },
            ],
            model: agent.model,
          }),
        });

        let content = "";
        if (res.ok) {
          const d = await res.json() as { content?: string; message?: string };
          content = d.content || d.message || "لم يتم الحصول على رد";
        } else {
          content = `⚠️ فشل ${agent.name} في معالجة المهمة`;
        }

        setMessages(m => [...m, { agentId: agent.id, agentName: agent.name, role: "agent", content, timestamp: new Date() }]);
        await new Promise(r => setTimeout(r, 500));
      }

      setMessages(m => [...m, { agentId: "system", agentName: "النظام", role: "system", content: "✅ انتهى مجلس الوكلاء. راجع ردود الخبراء أعلاه.", timestamp: new Date() }]);
    } catch { /* ignore */ }
    finally { setRunning(false); }
  };

  const agentColors: Record<string, string> = {};
  agents.forEach(a => { agentColors[a.id] = a.color; });

  return (
    <div className="flex h-full" dir="rtl">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-l border-white/10 bg-black/30 p-3 space-y-1">
        {[
          { id: "council", label: "مجلس الوكلاء", icon: Bot },
          { id: "agents", label: "إدارة الوكلاء", icon: Settings },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as "council" | "agents")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              tab === t.id ? "bg-red-600/20 text-red-400" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}

        {agents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-gray-500 mb-2 px-2">وكلاؤك ({agents.length})</div>
            {agents.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-2 py-1.5">
                <button onClick={() => toggleAgent(a.id)}
                  className={`w-3 h-3 rounded-full transition-all border ${selectedAgents.has(a.id) ? "bg-current" : "bg-transparent"}`}
                  style={{ borderColor: a.color, color: a.color }} />
                <span className="text-xs text-gray-300 flex-1 truncate">{a.name}</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">

          {/* Council Tab */}
          {tab === "council" && (
            <motion.div key="council" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
              {agents.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Bot className="w-16 h-16 text-gray-600 mx-auto" />
                    <h2 className="text-xl font-bold">لا يوجد وكلاء</h2>
                    <p className="text-gray-400 text-sm">أضف وكلاء من تبويب "إدارة الوكلاء"</p>
                    <button onClick={() => setTab("agents")} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium">
                      إدارة الوكلاء
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div ref={messagesRef} className="flex-1 overflow-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center">
                        <div className="space-y-2">
                          <div className="text-gray-400">وكلاء نشطون: {selectedAgents.size}/{agents.length}</div>
                          <div className="text-sm text-gray-500">أكتب مهمتك وسيتعاون الوكلاء على حلها</div>
                        </div>
                      </div>
                    ) : messages.map((m, i) => (
                      <div key={i} className={`flex gap-3 ${m.role === "system" ? "opacity-60" : ""}`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          style={{ backgroundColor: agentColors[m.agentId] ? agentColors[m.agentId] + "33" : "#ffffff11", color: agentColors[m.agentId] || "#888" }}>
                          {m.role === "system" ? "⚙" : m.agentName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium" style={{ color: agentColors[m.agentId] || "#888" }}>{m.agentName}</span>
                            <span className="text-xs text-gray-600">{m.timestamp.toLocaleTimeString("ar")}</span>
                          </div>
                          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${m.role === "system" ? "text-gray-400 italic" : "text-gray-200"}`}>
                            {m.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    {running && (
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" /> الوكلاء يعملون...
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-white/10">
                    <div className="flex gap-3">
                      <textarea value={task} onChange={e => setTask(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) runCouncil(); }}
                        placeholder="أكتب المهمة التي تريد من الوكلاء حلها معاً... (Ctrl+Enter للإرسال)"
                        rows={2} disabled={running}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none disabled:opacity-50" />
                      <button onClick={runCouncil} disabled={running || !task.trim() || selectedAgents.size === 0}
                        className="px-5 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-medium text-sm flex items-center gap-2 self-end transition-colors">
                        {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        تشغيل
                      </button>
                    </div>
                    {messages.length > 0 && (
                      <button onClick={() => setMessages([])} className="mt-2 text-xs text-gray-500 hover:text-gray-300">مسح المحادثة</button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Agents Tab */}
          {tab === "agents" && (
            <motion.div key="agents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-auto p-6 space-y-6">
              {/* Presets */}
              <div>
                <h2 className="text-lg font-bold mb-4">وكلاء جاهزون</h2>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_AGENTS.map((preset, i) => {
                    const alreadyAdded = agents.some(a => a.name === preset.name);
                    return (
                      <div key={i} className="p-4 bg-white/3 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: preset.color + "33", color: preset.color }}>
                            {preset.name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{preset.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{preset.model}</div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-3 leading-relaxed">{preset.systemPrompt.slice(0, 80)}...</p>
                        <button onClick={() => addPreset(preset)} disabled={alreadyAdded}
                          className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                            alreadyAdded ? "bg-green-600/20 text-green-400 cursor-default" : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                          }`}>
                          {alreadyAdded ? "مُضاف" : "إضافة"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* My Agents */}
              {agents.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-4">وكلاؤك ({agents.length})</h2>
                  <div className="space-y-3">
                    {agents.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-4 bg-white/3 border border-white/10 rounded-xl">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ backgroundColor: a.color + "33", color: a.color }}>
                          {a.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{a.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{a.model}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleAgent(a.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                              selectedAgents.has(a.id) ? "bg-green-600/20 text-green-400" : "bg-white/5 text-gray-400"
                            }`}>
                            {selectedAgents.has(a.id) ? "نشط" : "غير نشط"}
                          </button>
                          <button onClick={() => removeAgent(a.id)} className="p-1.5 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
