import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Search, Trash2, Loader2, BookOpen, Sparkles, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Doc { id: string; name: string; size: number; chunks: number; created_at: string }
interface SearchResult { chunk: string; docName: string; score: number }

interface Props { onClose?: () => void }

export function RAGSystemPage({ onClose }: Props) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"upload" | "search" | "knowledge">("upload");
  const [kbDocs, setKbDocs] = useState<Record<string, unknown>[]>([]);
  const [kbLoading, setKbLoading] = useState(false);

  const loadKnowledge = useCallback(async () => {
    setKbLoading(true);
    try {
      const res = await authFetch("/api/rag/knowledge");
      if (res.ok) { const d = await res.json() as { documents?: Record<string, unknown>[] }; setKbDocs(d.documents || []); }
    } catch { /* ignore */ }
    finally { setKbLoading(false); }
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sessionId);
        const res = await authFetch("/api/rag/upload", { method: "POST", body: formData });
        if (res.ok) {
          const d = await res.json() as { doc?: Doc; chunks?: number };
          setDocs(prev => [...prev, { id: Math.random().toString(), name: file.name, size: file.size, chunks: d.chunks || 0, created_at: new Date().toISOString() }]);
          toast({ title: `✅ تم رفع ${file.name} (${d.chunks || 0} chunk)` });
        } else {
          const e = await res.json() as { error?: string };
          toast({ title: e.error || "فشل الرفع", variant: "destructive" });
        }
      }
    } catch { toast({ title: "فشل الرفع", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setResults([]); setAnswer("");
    try {
      const res = await authFetch("/api/rag/query", {
        method: "POST",
        body: JSON.stringify({ query, sessionId, topK: 5, generateAnswer: true }),
      });
      if (res.ok) {
        const d = await res.json() as { results?: SearchResult[]; answer?: string };
        setResults(d.results || []);
        setAnswer(d.answer || "");
      }
    } catch { toast({ title: "فشل البحث", variant: "destructive" }); }
    finally { setSearching(false); }
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 ? `${bytes}B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;

  return (
    <div className="flex h-full" dir="rtl">
      {/* Sidebar */}
      <aside className="w-44 shrink-0 border-l border-white/10 bg-black/30 p-3 space-y-1">
        {[
          { id: "upload", label: "رفع مستندات", icon: Upload },
          { id: "search", label: "البحث الذكي", icon: Search },
          { id: "knowledge", label: "قاعدة المعرفة", icon: BookOpen },
        ].map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id as "upload" | "search" | "knowledge"); if (t.id === "knowledge") loadKnowledge(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              tab === t.id ? "bg-red-600/20 text-red-400" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
        {docs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-gray-500 mb-2">في الجلسة ({docs.length})</div>
            {docs.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400 py-1 truncate">
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">{d.name}</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Upload */}
            {tab === "upload" && (
              <div className="space-y-6 max-w-2xl">
                <h2 className="text-lg font-bold">رفع وتضمين المستندات</h2>

                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
                    uploading ? "border-red-500/50 bg-red-900/10" : "border-white/20 hover:border-red-500/40 hover:bg-white/3"
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}>
                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="w-10 h-10 text-red-400 mx-auto animate-spin" />
                      <div className="text-sm text-gray-400">جاري المعالجة والتضمين...</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-10 h-10 text-gray-500 mx-auto" />
                      <div className="text-white font-medium">اسحب وأفلت الملفات هنا</div>
                      <div className="text-sm text-gray-400">PDF · TXT · MD · CSV · JSON · DOCX</div>
                      <div className="text-xs text-gray-500">أو انقر للاختيار</div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" className="hidden" multiple
                    accept=".pdf,.txt,.md,.csv,.json,.docx,.py,.js,.ts"
                    onChange={e => handleUpload(e.target.files)} />
                </div>

                {docs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-gray-300">المستندات المرفوعة في هذه الجلسة</h3>
                    {docs.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/3 border border-white/10 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{d.name}</div>
                          <div className="text-xs text-gray-400">{formatSize(d.size)} · {d.chunks} chunk</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl text-sm text-blue-300">
                  <div className="font-medium mb-1">💡 كيف يعمل RAG؟</div>
                  <div className="text-xs text-blue-300/70">
                    يتم تقطيع المستندات إلى أجزاء صغيرة، تحويلها لـ embeddings ذكية، ثم البحث عنها باستخدام التشابه الدلالي لتوليد إجابات دقيقة.
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            {tab === "search" && (
              <div className="space-y-6 max-w-2xl">
                <h2 className="text-lg font-bold">البحث الدلالي الذكي</h2>
                {docs.length === 0 && (
                  <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl flex items-center gap-3 text-sm text-amber-300">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    ارفع مستندات أولاً لتتمكن من البحث فيها
                  </div>
                )}
                <div className="flex gap-3">
                  <input value={query} onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="ماذا تريد أن تبحث؟" disabled={docs.length === 0}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 disabled:opacity-50" />
                  <button onClick={handleSearch} disabled={searching || !query || docs.length === 0}
                    className="px-5 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-medium text-sm transition-colors flex items-center gap-2">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    بحث
                  </button>
                </div>

                {answer && (
                  <div className="p-5 bg-white/3 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-red-400" />
                      <span className="font-medium">الإجابة الذكية</span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm text-gray-400">النتائج الأكثر صلة ({results.length})</h3>
                    {results.map((r, i) => (
                      <div key={i} className="p-4 bg-white/3 border border-white/10 rounded-xl hover:border-white/20 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">{r.docName}</span>
                          </div>
                          <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full">
                            {(r.score * 100).toFixed(0)}% تطابق
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{r.chunk}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Knowledge Base */}
            {tab === "knowledge" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">قاعدة المعرفة الدائمة</h2>
                {kbLoading ? (
                  <div className="text-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : kbDocs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    لا توجد مستندات دائمة
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kbDocs.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-white/3 border border-white/10 rounded-xl">
                        <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{String(d.title || d.id)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{String(d.content_type || "document")} · {new Date(String(d.created_at)).toLocaleDateString("ar")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
