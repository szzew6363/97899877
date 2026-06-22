import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Globe, Database, Brain, Sparkles, Clock, RefreshCw, ChevronRight, Filter } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface SearchResult { id: string; source: string; type: string; title: string; content: string; score: number; url?: string; created_at?: string }

const SOURCES = [
  { id: "all", label: "الكل", icon: Search },
  { id: "knowledge", label: "المعرفة", icon: Database },
  { id: "memory", label: "الذاكرة", icon: Brain },
  { id: "chats", label: "المحادثات", icon: FileText },
];

interface Props { onClose?: () => void }

export function SemanticSearchPage({ onClose }: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [searching, setSearching] = useState(false);
  const [source, setSource] = useState("all");
  const [history, setHistory] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string = query) => {
    if (!q.trim()) return;
    setSearching(true); setResults([]); setAnswer(""); setExpanded(null);
    try {
      const res = await authFetch("/api/rag/query", {
        method: "POST",
        body: JSON.stringify({ query: q, topK: 8, source, generateAnswer: true }),
      });
      if (res.ok) {
        const d = await res.json() as { results?: SearchResult[]; answer?: string };
        setResults(d.results || []);
        setAnswer(d.answer || "");
        setHistory(h => [q, ...h.filter(x => x !== q).slice(0, 9)]);
      } else {
        toast({ title: "فشل البحث", variant: "destructive" });
      }
    } catch { toast({ title: "فشل البحث", variant: "destructive" }); }
    finally { setSearching(false); }
  }, [query, source]);

  const sourceIcon: Record<string, React.ElementType> = { knowledge: Database, memory: Brain, chats: FileText, rag: Database };
  const getSourceIcon = (s: string) => sourceIcon[s] || Globe;

  const scoreColor = (n: number) => n > 0.8 ? "text-green-400" : n > 0.6 ? "text-amber-400" : "text-gray-400";

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-red-400" />
            <h1 className="text-2xl font-black">البحث الدلالي الذكي</h1>
          </div>
          <p className="text-gray-400 text-sm">ابحث عبر قاعدة معرفتك وذاكرتك ومحادثاتك</p>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="ابحث عن أي شيء... يفهم المعنى وليس فقط الكلمات"
            className="w-full bg-white/5 border border-white/10 rounded-2xl pr-12 pl-32 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 text-base"
          />
          <button onClick={() => search()} disabled={searching || !query.trim()}
            className="absolute left-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </button>
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-1">
            {SOURCES.map(s => (
              <button key={s.id} onClick={() => setSource(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  source === s.id ? "bg-red-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                }`}>
                <s.icon className="w-3.5 h-3.5" />{s.label}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <div className="mr-auto flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              {history.slice(0, 3).map(h => (
                <button key={h} onClick={() => { setQuery(h); search(h); }}
                  className="hover:text-gray-300 truncate max-w-24">{h}</button>
              ))}
            </div>
          )}
        </div>

        {/* AI Answer */}
        <AnimatePresence>
          {answer && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-red-400" />
                <span className="font-semibold text-sm text-red-300">الإجابة الذكية</span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{results.length} نتيجة</span>
                <span className="text-xs text-gray-600">مرتبة حسب التشابه الدلالي</span>
              </div>
              {results.map((r, i) => {
                const SourceIcon = getSourceIcon(r.type || r.source);
                const isExpanded = expanded === r.id;
                return (
                  <motion.div key={r.id || i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors">
                    <button onClick={() => setExpanded(isExpanded ? null : (r.id || i.toString()))}
                      className="w-full flex items-start gap-3 p-4 text-right bg-white/3 hover:bg-white/5 transition-colors">
                      <SourceIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-white truncate">{r.title || r.id || "نتيجة"}</span>
                          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded capitalize">{r.type || r.source}</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{r.content}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-mono font-bold ${scoreColor(r.score)}`}>
                          {(r.score * 100).toFixed(0)}%
                        </span>
                        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-4 pt-2 bg-white/2 border-t border-white/5">
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                            {r.url && (
                              <a href={r.url} target="_blank" rel="noopener noreferrer"
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                <Globe className="w-3 h-3" />{r.url}
                              </a>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {!searching && results.length === 0 && !answer && query === "" && (
          <div className="text-center py-12 text-gray-600">
            <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <div className="text-lg font-medium mb-2">ابحث بالمعنى، لا فقط الكلمات</div>
            <div className="text-sm space-y-1">
              <div>جرّب: "كيف أختبر ثغرات SQL في تطبيق ويب؟"</div>
              <div>أو: "ما هي أفضل أدوات OSINT للعرب؟"</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
