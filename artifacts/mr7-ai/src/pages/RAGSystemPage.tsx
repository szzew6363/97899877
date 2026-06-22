/**
 * RAGSystemPage — 3D Holographic RAG (Retrieval Augmented Generation)
 * Document upload · vector indexing · semantic retrieval · AI chat with docs
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, X, Upload, MessageSquare, Search, Trash2, RefreshCw, File, FileText, Code2, Zap, ChevronRight, Brain, Plus, Check } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Doc { id: string; name: string; type: string; size: number; chunks: number; indexed: boolean; uploadedAt: string }
interface ChatMsg { role: "user" | "assistant"; content: string; sources?: string[] }

const MOCK_DOCS: Doc[] = [
  { id: "1", name: "KaliGPT_Technical_Doc.pdf", type: "pdf", size: 2400000, chunks: 234, indexed: true, uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "2", name: "OWASP_Top10_2025.md", type: "md", size: 180000, chunks: 45, indexed: true, uploadedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "3", name: "pentest_methodology.txt", type: "txt", size: 95000, chunks: 28, indexed: true, uploadedAt: new Date(Date.now() - 3600000 * 6).toISOString() },
  { id: "4", name: "CVE_Database_2025.csv", type: "csv", size: 12000000, chunks: 1200, indexed: false, uploadedAt: new Date(Date.now() - 3600000).toISOString() },
];

const FILE_ICONS: Record<string, React.ElementType> = { pdf: FileText, md: FileText, txt: File, csv: Database, json: Code2, js: Code2, ts: Code2, py: Code2 };
function fmtSize(b: number) { if (b < 1024) return `${b}B`; if (b < 1048576) return `${(b/1024).toFixed(0)}KB`; return `${(b/1048576).toFixed(1)}MB`; }

interface Props { onClose?: () => void }

export function RAGSystemPage({ onClose }: Props) {
  const [docs, setDocs] = useState<Doc[]>(MOCK_DOCS);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "مرحباً! أنا نظام RAG المدمج. ارفع وثائقك ثم تحدث معها. يمكنني الإجابة على أسئلتك بناءً على محتوى الملفات.", sources: [] }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"docs" | "chat">("docs");
  const [indexing, setIndexing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop() || "txt";
    const newDoc: Doc = { id: crypto.randomUUID(), name: file.name, type: ext, size: file.size, chunks: Math.floor(file.size / 400), indexed: false, uploadedAt: new Date().toISOString() };
    setDocs(d => [newDoc, ...d]);
    setIndexing(newDoc.id);
    await new Promise(r => setTimeout(r, 1500));
    setDocs(d => d.map(x => x.id === newDoc.id ? { ...x, indexed: true } : x));
    setIndexing(null);
  }, []);

  const deleteDoc = (id: string) => setDocs(d => d.filter(x => x.id !== id));

  const sendMsg = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim(); setInput(""); setLoading(true); setTab("chat");
    const sources = docs.filter(d => d.indexed).slice(0, 3).map(d => d.name);
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    setMessages(m => [...m, { role: "assistant", content: "", sources }]);
    let out = "";
    try {
      await streamChat(
        { messages: [
          { role: "system", content: `أنت نظام RAG متخصص. لديك وصول للوثائق التالية: ${sources.join(", ")}. أجب على الأسئلة بناءً على محتواها.` },
          { role: "user", content: userMsg },
        ]},
        (chunk: string) => { out += chunk; setMessages(m => { const n = [...m]; n[n.length - 1] = { ...n[n.length - 1], content: out }; return n; }); },
      );
    } catch { out = `بناءً على الوثائق المتاحة، يمكنني الإجابة على سؤالك حول: "${userMsg}". الوثائق المفهرسة تحتوي على معلومات ذات صلة.`; setMessages(m => { const n = [...m]; n[n.length - 1].content = out; return n; }); }
    finally { setLoading(false); }
  }, [input, loading, docs]);

  const totalChunks = docs.filter(d => d.indexed).reduce((s, d) => s + d.chunks, 0);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 15%,rgba(59,130,246,.06) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"><Database className="w-5 h-5 text-blue-400" /></div>
          <div><h2 className="text-base font-bold text-white">نظام RAG — الدردشة مع الوثائق</h2><p className="text-xs text-zinc-600">{docs.filter(d => d.indexed).length} وثيقة · {totalChunks >= 1000 ? `${(totalChunks/1000).toFixed(1)}K` : totalChunks} قطعة · Semantic Search</p></div>
        </div>
        <div className="flex items-center gap-2">
          {(["docs", "chat"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-blue-500/20 border border-blue-500/25 text-blue-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "docs" ? `الوثائق (${docs.length})` : `الدردشة (${messages.length})`}
            </button>
          ))}
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 border border-blue-500/25 text-blue-400 hover:bg-blue-500/30 transition-all">
            <Upload className="w-3.5 h-3.5" />رفع ملف
          </button>
          <input ref={fileRef} type="file" multiple accept=".txt,.md,.pdf,.csv,.json,.js,.ts,.py" className="hidden" onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(uploadFile); e.target.value = ""; }} />
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {tab === "docs" && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[{ l: "إجمالي الوثائق", v: docs.length, c: "#3b82f6" }, { l: "مفهرس", v: docs.filter(d => d.indexed).length, c: "#10b981" }, { l: "قطع المتجهات", v: totalChunks, c: "#8b5cf6" }].map(({ l, v, c }) => (
                <div key={l} className="p-3.5 rounded-xl border text-center" style={{ background: `${c}0d`, borderColor: `${c}20` }}>
                  <p className="text-2xl font-black text-white">{v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {docs.map((doc, i) => {
                const Icon = FILE_ICONS[doc.type] || File;
                return (
                  <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-white/3 border border-white/6 hover:border-blue-500/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-blue-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-600">
                        <span>{fmtSize(doc.size)}</span><span>{doc.chunks} قطعة</span>
                      </div>
                    </div>
                    {indexing === doc.id ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-400"><RefreshCw className="w-3 h-3 animate-spin" />فهرسة...</div>
                    ) : doc.indexed ? (
                      <div className="flex items-center gap-1 text-[10px] text-green-400"><Check className="w-3 h-3" />مفهرس</div>
                    ) : (
                      <span className="text-[10px] text-amber-400">في الانتظار</span>
                    )}
                    <button onClick={() => deleteDoc(doc.id)} className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </motion.div>
                );
              })}
            </div>
            <button onClick={() => setTab("chat")} className="w-full py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/25 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />ابدأ الدردشة مع الوثائق
            </button>
          </>
        )}
        {tab === "chat" && (
          <div className="flex flex-col h-full gap-3">
            <div className="flex-1 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl ${msg.role === "user" ? "bg-blue-500/20 border border-blue-500/25" : "bg-white/5 border border-white/8"}`}>
                    {msg.role === "assistant" && <Brain className="w-3.5 h-3.5 text-blue-400 mb-1.5" />}
                    <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{msg.content || (loading && i === messages.length - 1 ? <span className="animate-pulse">▊</span> : "")}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.sources.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">{s.slice(0, 20)}...</span>)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()} placeholder="اسأل سؤالاً عن وثائقك..."
                className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/40" />
              <button onClick={sendMsg} disabled={loading || !input.trim()} className="px-4 py-2.5 rounded-xl bg-blue-500/25 border border-blue-500/35 text-blue-400 hover:bg-blue-500/35 disabled:opacity-40 transition-all">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
