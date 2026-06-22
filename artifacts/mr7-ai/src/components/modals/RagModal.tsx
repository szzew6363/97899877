/**
 * RAGFlow — Real embedding-based document QA
 * Uses /api/rag/embed (OpenAI text-embedding-3-small or TF-IDF fallback)
 * and /api/rag/query (semantic search + AI answer streaming)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, Trash2, Send, Database, FileText, Plus, GitMerge,
  Zap, Brain, CheckCircle2, AlertCircle, Loader2, RefreshCw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { pipeline } from "@/lib/pipeline";
import { authFetch } from "@/lib/auth";

interface RagModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineDoc?: { text: string; name: string; key: number };
}

type Doc = { id: string; name: string; content: string; words: number; addedAt: string; embedded?: boolean };
type ChatMsg = { role: "user" | "ai"; text: string; sources?: { docName: string; score: number }[] };

export function RagModal({ open, onOpenChange, pipelineDoc }: RagModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [docs, setDocs]         = useState<Doc[]>([]);
  const [query, setQuery]       = useState("");
  const [chat, setChat]         = useState<ChatMsg[]>([]);
  const [running, setRunning]   = useState(false);
  const [embedding, setEmbedding] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<string>("");
  const [embeddingMethod, setEmbeddingMethod] = useState<string>("");
  const [tab, setTab]           = useState<"docs" | "chat">("docs");
  const [sessionId]             = useState(() => Math.random().toString(36).slice(2));
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem("mr7_openai_key") ?? "");
  const fileRef                 = useRef<HTMLInputElement>(null);
  const chatEndRef              = useRef<HTMLDivElement>(null);
  const answerRef               = useRef("");
  const abortRef                = useRef<AbortController | null>(null);

  // Accept pipelined document
  useEffect(() => {
    if (!pipelineDoc?.text) return;
    const doc: Doc = {
      id: Math.random().toString(36).slice(2),
      name: pipelineDoc.name,
      content: pipelineDoc.text.slice(0, 100_000),
      words: pipelineDoc.text.split(/\s+/).length,
      addedAt: new Date().toLocaleTimeString(),
      embedded: false,
    };
    setDocs(p => [...p, doc]);
    setTab("docs");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineDoc?.key]);

  // Handle file uploads
  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const content = (e.target?.result as string) ?? "";
        setDocs(p => [...p, {
          id: Math.random().toString(36).slice(2),
          name: file.name,
          content: content.slice(0, 100_000),
          words: content.split(/\s+/).length,
          addedAt: new Date().toLocaleTimeString(),
          embedded: false,
        }]);
      };
      reader.readAsText(file);
    });
  }

  // Embed all unemedded docs
  const embedDocs = useCallback(async () => {
    const unembedded = docs.filter(d => !d.embedded);
    if (!unembedded.length) return;
    setEmbedding(true);
    setEmbeddingStatus(`جاري تحويل ${unembedded.length} وثيقة إلى vectors…`);
    try {
      const res = await authFetch("/api/rag/embed", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          documents: unembedded.map(d => ({ name: d.name, content: d.content, type: d.name.split(".").pop() })),
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; chunksEmbedded?: number; method?: string; error?: string };
      if (data.ok) {
        if (apiKey) localStorage.setItem("mr7_openai_key", apiKey);
        setDocs(p => p.map(d => unembedded.some(u => u.id === d.id) ? { ...d, embedded: true } : d));
        setEmbeddingMethod(data.method || "");
        setEmbeddingStatus(`✓ ${data.chunksEmbedded} مقطع مُضمَّن (${data.method?.includes("openai") ? "OpenAI" : "TF-IDF"})`);
        setTab("chat");
      } else {
        setEmbeddingStatus(`خطأ: ${data.error}`);
      }
    } catch {
      setEmbeddingStatus("تعذّر الاتصال بالسيرفر");
    } finally {
      setEmbedding(false);
    }
  }, [docs, sessionId, apiKey]);

  // Ask with real semantic search
  async function ask() {
    if (!query.trim() || running) return;

    // Check if need to embed first
    const hasUnembedded = docs.some(d => !d.embedded);
    if (hasUnembedded) {
      await embedDocs();
    }
    if (!docs.length) return;

    const q = query.trim();
    setQuery("");
    setChat(p => [...p, { role: "user", text: q }]);
    setRunning(true);
    answerRef.current = "";
    setChat(p => [...p, { role: "ai", text: "" }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await authFetch("/api/rag/query", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          query: q,
          topK: 8,
          apiKey: apiKey || undefined,
          model: state.activeModel,
          generateAnswer: true,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Failed" })) as { error?: string };
        setChat(p => p.map((m, i) => i === p.length - 1 ? { ...m, text: `خطأ: ${err.error}` } : m));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sources: { docName: string; score: number }[] = [];

      while (true) {
        if (ctrl.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { text?: string; done?: boolean; error?: string; sources?: typeof sources };
            if (data.text) {
              answerRef.current += data.text;
              setChat(p => p.map((m, i) => i === p.length - 1 ? { ...m, text: answerRef.current } : m));
            }
            if (data.sources) sources = data.sources;
            if (data.done || data.error) {
              setChat(p => p.map((m, i) => i === p.length - 1 ? { ...m, sources } : m));
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch { /* cancelled or network error */ }
    finally { setRunning(false); }
  }

  if (!open) return null;
  const totalWords = docs.reduce((s, d) => s + d.words, 0);
  const allEmbedded = docs.length > 0 && docs.every(d => d.embedded);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.88)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#040812", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 0 60px rgba(59,130,246,0.12)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.35)" }}>
                  <Brain className="w-4 h-4" style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider" style={{ color: "#3b82f6" }}>RAGFlow</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: allEmbedded ? "#22c55e" : "#3b82f6", borderColor: allEmbedded ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)", background: allEmbedded ? "rgba(34,197,94,0.06)" : "rgba(59,130,246,0.06)" }}>
                      {allEmbedded ? "EMBEDDED ✓" : "KNOWLEDGE BASE"}
                    </span>
                  </div>
                  <div className="text-[10px]" style={{ color: "#2a3a6a" }}>
                    {docs.length} doc{docs.length !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words
                    {embeddingMethod && <span className="ml-2 text-emerald-600">{embeddingMethod.includes("openai") ? "· OpenAI embeddings" : "· TF-IDF mode"}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "rgba(59,130,246,0.2)" }}>
                  {(["docs", "chat"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} className="px-3 py-1 text-[11px] font-bold transition-all"
                      style={tab === t ? { background: "rgba(59,130,246,0.2)", color: "#3b82f6" } : { background: "transparent", color: "#444" }}>
                      {t === "docs" ? "الوثائق" : "الدردشة"}
                      {t === "docs" && docs.length > 0 && <span className="ml-1 text-[9px] opacity-70">{docs.length}</span>}
                    </button>
                  ))}
                </div>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg" style={{ color: "#2a3a6a" }} onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")} onMouseLeave={e => (e.currentTarget.style.color = "#2a3a6a")}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Docs Tab */}
            {tab === "docs" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json,.py,.ts,.tsx,.js,.html,.css,.xml,.yaml,.yml,.log,.pdf" className="hidden" onChange={e => handleFiles(e.target.files)} />

                {/* OpenAI API Key (optional) */}
                <div className="flex gap-2 items-center px-3 py-2 rounded-xl" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)" }}>
                  <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3b82f6" }} />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="OpenAI API Key (اختياري — لـ embeddings حقيقية)"
                    className="flex-1 bg-transparent text-[11px] outline-none"
                    style={{ color: "#ccc" }}
                  />
                  {apiKey && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </div>

                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all"
                  style={{ borderColor: "rgba(59,130,246,0.2)", color: "#3b82f6", background: "rgba(59,130,246,0.03)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.4)"; (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.07)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.2)"; (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.03)"; }}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-[12px] font-bold">رفع الوثائق</span>
                  <span className="text-[10px]" style={{ color: "#1a2a5a" }}>txt · md · json · py · ts · csv · pdf · yaml</span>
                </button>

                {docs.length > 0 && (
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "#0a0f1a", border: `1px solid ${doc.embedded ? "rgba(34,197,94,0.2)" : "rgba(59,130,246,0.15)"}` }}>
                        <FileText className="w-4 h-4 flex-shrink-0" style={{ color: doc.embedded ? "#22c55e" : "#3b82f6" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold truncate" style={{ color: "#ccc" }}>{doc.name}</div>
                          <div className="text-[9px]" style={{ color: "#1a2a5a" }}>
                            {doc.words.toLocaleString()} كلمة · {doc.addedAt}
                            {doc.embedded && <span className="ml-1 text-emerald-600">· مُضمَّن ✓</span>}
                          </div>
                        </div>
                        <button onClick={() => setDocs(p => p.filter(d => d.id !== doc.id))} className="p-1 rounded transition-colors" style={{ color: "#333" }} onMouseEnter={e => (e.currentTarget.style.color = "#f87171")} onMouseLeave={e => (e.currentTarget.style.color = "#333")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Embedding status */}
                    {embeddingStatus && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: "rgba(59,130,246,0.06)", color: "#3b82f6" }}>
                        {embedding ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        {embeddingStatus}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={embedDocs}
                        disabled={embedding || allEmbedded}
                        className="flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.35)", color: "#3b82f6" }}
                      >
                        {embedding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : allEmbedded ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Brain className="w-3.5 h-3.5" />}
                        {embedding ? "جارٍ التضمين…" : allEmbedded ? "مُضمَّن بالكامل ✓" : "تضمين الوثائق (Embedding)"}
                      </button>
                      <button
                        onClick={() => setTab("chat")}
                        className="px-4 py-2 rounded-xl text-[12px] font-bold border transition-all"
                        style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)", color: "#3b82f6" }}
                      >
                        دردشة →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {tab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: "55vh" }}>
                  {docs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <Database className="w-10 h-10" style={{ color: "rgba(59,130,246,0.2)" }} />
                      <span className="text-[11px]" style={{ color: "#1a2a5a" }}>لا توجد وثائق. انتقل لتبويب الوثائق لرفعها.</span>
                      <button onClick={() => setTab("docs")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
                        <Plus className="w-3.5 h-3.5" /> إضافة وثائق
                      </button>
                    </div>
                  ) : (
                    <>
                      {chat.length === 0 && (
                        <div className="text-center py-8 text-[11px]" style={{ color: "#1a2a5a" }}>
                          {allEmbedded
                            ? `اسأل أي شيء عن ${docs.length} وثيقة (بحث دلالي حقيقي)…`
                            : "ملاحظة: الوثائق لم تُضمَّن بعد — سيتم التضمين تلقائياً عند السؤال."}
                        </div>
                      )}
                      {chat.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                          <div
                            className="max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed"
                            style={{
                              background: m.role === "user" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.07)"}`,
                              color: m.role === "user" ? "#93c5fd" : "#ccc",
                              whiteSpace: "pre-wrap", wordBreak: "break-word",
                            }}
                          >
                            {m.text || (running && i === chat.length - 1 && <span className="inline-block w-1.5 h-3 rounded-sm animate-pulse" style={{ background: "#3b82f6" }} />)}
                          </div>
                          {/* Sources */}
                          {m.sources && m.sources.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {m.sources.slice(0, 4).map((s, si) => (
                                <span key={si} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.15)" }}>
                                  {s.docName} ({(s.score * 100).toFixed(0)}%)
                                </span>
                              ))}
                            </div>
                          )}
                          {m.role === "ai" && m.text && !running && (
                            <button
                              onClick={() => pipeline.push({ source: "RAGFlow", sourceColor: "#3b82f6", label: "doc answer", content: m.text })}
                              className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                              style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}
                            >
                              <GitMerge className="w-2.5 h-2.5" /> Pipe
                            </button>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>
                {docs.length > 0 && (
                  <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(59,130,246,0.15)" }}>
                    <div className="flex gap-2">
                      <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
                        placeholder="اسأل وثائقك… (بحث دلالي)"
                        disabled={running}
                        className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] outline-none"
                        style={{ borderColor: "rgba(59,130,246,0.25)", color: "#ccc" }}
                      />
                      {running && (
                        <button onClick={() => { abortRef.current?.abort(); setRunning(false); }} className="p-2.5 rounded-xl border transition-all" style={{ background: "rgba(255,50,50,0.1)", borderColor: "rgba(255,50,50,0.3)", color: "#f87171" }}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={ask}
                        disabled={!query.trim() || running}
                        className="p-2.5 rounded-xl border transition-all disabled:opacity-40"
                        style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)", color: "#3b82f6" }}
                      >
                        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                    {!allEmbedded && (
                      <p className="text-[9px] mt-1" style={{ color: "#1a2a5a" }}>
                        سيتم تضمين الوثائق تلقائياً عند أول سؤال
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
