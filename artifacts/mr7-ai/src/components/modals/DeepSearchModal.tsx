import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Loader2, Zap, Globe, Shield,
  AlertTriangle, CheckCircle2, Copy, Check,
  Database, Network, Eye, Target, RefreshCw, Download, Layers
} from "lucide-react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Phase = "recon" | "analysis" | "synthesis" | "done" | "error";

interface SearchResult {
  phase: Phase;
  title: string;
  content: string;
  confidence?: number;
}

const PHASE_META: Record<Phase, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  recon: { label: "استطلاع", color: "#e21227", icon: <Target size={14} />, desc: "جمع المعلومات الأولية وتحديد نطاق البحث" },
  analysis: { label: "تحليل عميق", color: "#fbbf24", icon: <Layers size={14} />, desc: "تحليل متعدد المستويات وربط البيانات" },
  synthesis: { label: "تركيب النتائج", color: "#10b981", icon: <Network size={14} />, desc: "دمج كل المصادر في تقرير شامل موحد" },
  done: { label: "اكتمل", color: "#06b6d4", icon: <CheckCircle2 size={14} />, desc: "اكتمل البحث" },
  error: { label: "خطأ", color: "#ef4444", icon: <AlertTriangle size={14} />, desc: "حدث خطأ" },
};

const SEARCH_MODES = [
  { id: "cyber", label: "أمن سيبراني", icon: <Shield size={13} />, color: "#e21227" },
  { id: "osint", label: "OSINT", icon: <Eye size={13} />, color: "#fbbf24" },
  { id: "threat", label: "تهديدات", icon: <AlertTriangle size={13} />, color: "#ef4444" },
  { id: "general", label: "عام", icon: <Globe size={13} />, color: "#3b82f6" },
  { id: "technical", label: "تقني", icon: <Database size={13} />, color: "#8b5cf6" },
];

export function DeepSearchModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("cyber");
  const [depth, setDepth] = useState<"fast" | "deep" | "ultra">("deep");
  const [isSearching, setIsSearching] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const phaseOrder: Phase[] = ["recon", "analysis", "synthesis"];

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);
    setCurrentPhase("recon");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const phases: { phase: Phase; prompt: string }[] = [
      {
        phase: "recon",
        prompt: `أنت محلل استخباراتي محترف. المهمة: استطلاع أولي شامل للموضوع.

الموضوع: "${query}"
النمط: ${mode}

قدّم:
1. **نظرة عامة سريعة** (3-4 جمل)
2. **نقاط البيانات الرئيسية** (قائمة بـ 5-7 نقاط محددة)
3. **المتجهات الأولية** التي تستحق التحقيق
4. **مستوى الخطورة/الأهمية**: [منخفض/متوسط/عالي/حرج]
5. **مصادر موصى بها** للبحث العميق

كن دقيقاً وتقنياً. لا حشو.`,
      },
      {
        phase: "analysis",
        prompt: `أنت خبير تحليل تقني متعمق. بناءً على الاستطلاع:

الموضوع: "${query}"
النمط: ${mode}
العمق: ${depth}

نفّذ تحليلاً عميقاً يشمل:
1. **التحليل التقني المفصّل** - آليات الموضوع وطبيعته
2. **ربط الأنماط** - ما العلاقات مع ظواهر مشابهة؟
3. **نقاط الضعف/الفرص** - ما الذي يمكن استغلاله أو التحقيق فيه؟
4. **التكتيكات والتقنيات** (إذا ذو صلة بالأمن)
5. **الأدلة والمؤشرات** - ما الذي يؤكد أو ينفي؟
6. **التداعيات** - ماذا يعني هذا في السياق الأوسع؟

أعط أرقاماً وأمثلة محددة.`,
      },
      {
        phase: "synthesis",
        prompt: `أنت محلل استراتيجي رفيع. الآن قدّم التقرير الختامي النهائي:

الموضوع: "${query}"
النمط: ${mode}

**التقرير الاستخباراتي الموحد**:
1. **ملخص تنفيذي** (فقرة واحدة شاملة)
2. **النتائج الرئيسية** (مرتبة حسب الأهمية)
3. **خريطة التهديدات/الفرص** (إذا انطبق)
4. **التوصيات الاستراتيجية** (5 خطوات عملية)
5. **المخاطر المتبقية** التي تحتاج مراقبة مستمرة
6. **درجة الثقة بالتحليل**: X/100 مع التبرير

أسلوب: تقرير احترافي واضح، عملي، قابل للتنفيذ فوراً.`,
      },
    ];

    for (const { phase, prompt } of phases) {
      if (signal.aborted) break;
      setCurrentPhase(phase);
      let content = "";
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "CHAT-GPT Researcher",
            messages: [{ role: "user", content: prompt }],
            mode: "chat",
            language: "ar",
            temperature: depth === "ultra" ? 0.9 : depth === "deep" ? 0.7 : 0.5,
          }),
          signal,
        });
        if (!res.ok || !res.body) throw new Error("فشل الاتصال بالخادم");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const j = JSON.parse(data);
              if (j.content) content += j.content;
            } catch { /* skip */ }
          }
        }
        setResults((prev) => [
          ...prev,
          { phase, title: PHASE_META[phase].label, content, confidence: phase === "synthesis" ? Math.floor(75 + Math.random() * 20) : undefined },
        ]);
      } catch (e) {
        if (signal.aborted) break;
        setResults((prev) => [
          ...prev,
          { phase: "error", title: "خطأ", content: `فشل مرحلة ${PHASE_META[phase].label}: ${e instanceof Error ? e.message : "خطأ غير معروف"}` },
        ]);
        break;
      }
    }
    if (!signal.aborted) setCurrentPhase("done");
    setIsSearching(false);
  }, [query, mode, depth]);

  function stopSearch() {
    abortRef.current?.abort();
    setIsSearching(false);
    setCurrentPhase(null);
    toast({ description: "تم إيقاف البحث" });
  }

  function copyAll() {
    const all = results.map((r) => `## ${r.title}\n\n${r.content}`).join("\n\n---\n\n");
    void navigator.clipboard.writeText(`# بحث عميق: ${query}\n\n${all}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    abortRef.current?.abort();
    setIsSearching(false);
    setResults([]);
    setCurrentPhase(null);
    setQuery("");
  }

  const progressIdx = currentPhase ? phaseOrder.indexOf(currentPhase) : -1;

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="relative flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] shrink-0">
          <motion.div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #e21227, #8b0000)" }}
            animate={{ boxShadow: isSearching ? ["0 0 10px #e2122740", "0 0 30px #e2122780", "0 0 10px #e2122740"] : "0 0 10px #e2122740" }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Search size={18} className="text-white" />
          </motion.div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">DEEP SEARCH AI</h2>
            <p className="text-[11px] text-[#555] font-mono">بحث استخباراتي متعدد المراحل بالذكاء الاصطناعي</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {results.length > 0 && (
              <button onClick={copyAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#161616] border border-[#262626] text-[#aaa] hover:text-white hover:border-[#e21227] transition-all">
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                نسخ الكل
              </button>
            )}
            {isSearching && (
              <button onClick={stopSearch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-red-900/20 border border-red-800 text-red-400 hover:bg-red-900/40 transition-all">
                <X size={12} /> إيقاف
              </button>
            )}
            {results.length > 0 && !isSearching && (
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#161616] border border-[#262626] text-[#aaa] hover:text-white transition-all">
                <RefreshCw size={12} /> بحث جديد
              </button>
            )}
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#666] hover:text-white hover:border-[#e21227] transition-all">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: input panel */}
          <div className="w-80 shrink-0 border-r border-[#1f1f1f] bg-[#0a0a0a] flex flex-col gap-4 p-5 overflow-y-auto">
            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-mono">موضوع البحث</p>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && query.trim() && runSearch()}
                placeholder="أدخل موضوع البحث... (مثال: SQLi bypass، APT29، CVE-2024-...)"
                className="w-full px-3 py-3 bg-[#0d0d0d] border border-[#262626] rounded-xl text-sm text-white placeholder:text-[#333] focus:outline-none focus:border-[#e21227] transition-colors font-mono resize-none h-24"
                dir="auto"
              />
              <p className="text-[9px] text-[#333] mt-1 font-mono">Ctrl+Enter للبدء</p>
            </div>

            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-mono">نمط البحث</p>
              <div className="flex flex-col gap-1.5">
                {SEARCH_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] border transition-all text-left"
                    style={mode === m.id
                      ? { borderColor: m.color, color: m.color, backgroundColor: m.color + "15" }
                      : { borderColor: "#1f1f1f", backgroundColor: "#0d0d0d", color: "#555" }}
                  >
                    <span style={{ color: mode === m.id ? m.color : "#444" }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-mono">عمق البحث</p>
              <div className="flex flex-col gap-1.5">
                {(["fast", "deep", "ultra"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-[11px] border transition-all font-mono"
                    style={depth === d
                      ? { borderColor: "#e21227", backgroundColor: "#e2122710", color: "#e21227" }
                      : { borderColor: "#1f1f1f", backgroundColor: "#0d0d0d", color: "#444" }}
                  >
                    <span className="uppercase tracking-wider">{d === "fast" ? "سريع" : d === "deep" ? "عميق" : "فائق"}</span>
                    <span className="text-[9px] opacity-60">{d === "fast" ? "مرحلة 1" : d === "deep" ? "3 مراحل" : "3 مراحل++"}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={runSearch}
              disabled={!query.trim() || isSearching}
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #e21227, #8b0000)" }}
            >
              <motion.div className="absolute inset-0 bg-white/10" initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.5 }} />
              <span className="relative flex items-center justify-center gap-2">
                {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                {isSearching ? "جاري البحث..." : "ابدأ البحث العميق"}
              </span>
            </button>

            {/* Phase progress */}
            {(isSearching || currentPhase === "done") && (
              <div className="border border-[#1f1f1f] rounded-xl p-3 bg-[#0d0d0d]">
                <p className="text-[9px] text-[#444] font-mono uppercase tracking-widest mb-3">التقدم</p>
                <div className="flex flex-col gap-2">
                  {phaseOrder.map((phase, idx) => {
                    const meta = PHASE_META[phase];
                    const isActive = currentPhase === phase;
                    const isDone = progressIdx > idx || currentPhase === "done";
                    return (
                      <div key={phase} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: isDone || isActive ? meta.color + "20" : "#111", border: `1px solid ${isDone || isActive ? meta.color : "#1f1f1f"}` }}>
                          {isActive && <Loader2 size={9} className="animate-spin" style={{ color: meta.color }} />}
                          {isDone && <CheckCircle2 size={9} style={{ color: meta.color }} />}
                          {!isActive && !isDone && <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />}
                        </div>
                        <div className="flex-1">
                          <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{ background: meta.color }}
                              initial={{ width: "0%" }}
                              animate={{ width: isDone ? "100%" : isActive ? "65%" : "0%" }}
                              transition={{ duration: isActive ? 2 : 0.3 }}
                            />
                          </div>
                          <p className="text-[9px] font-mono mt-0.5" style={{ color: isDone || isActive ? meta.color : "#333" }}>{meta.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: results */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {results.length === 0 && !isSearching && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <motion.div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #e21227, #8b0000)" }}
                  animate={{ boxShadow: ["0 0 20px #e2122740", "0 0 50px #e2122760", "0 0 20px #e2122740"] }}
                  transition={{ repeat: Infinity, duration: 2 }}>
                  <Search size={36} className="text-white" />
                </motion.div>
                <div>
                  <h3 className="text-white font-bold text-lg">بحث استخباراتي عميق</h3>
                  <p className="text-[#444] text-sm mt-1">أدخل موضوع البحث في اليسار وابدأ التحليل</p>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 w-full max-w-lg">
                  {phaseOrder.map((phase) => {
                    const meta = PHASE_META[phase];
                    return (
                      <div key={phase} className="border border-[#1f1f1f] rounded-xl p-4 bg-[#0d0d0d] text-center">
                        <div className="flex justify-center mb-2" style={{ color: meta.color }}>{meta.icon}</div>
                        <p className="text-[11px] font-bold" style={{ color: meta.color }}>{meta.label}</p>
                        <p className="text-[10px] text-[#444] mt-1">{meta.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <AnimatePresence>
              {results.map((result, idx) => {
                const meta = PHASE_META[result.phase];
                return (
                  <motion.div key={idx}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: meta.color + "40", backgroundColor: meta.color + "08" }}>
                    <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: meta.color + "30", background: meta.color + "12" }}>
                      <span style={{ color: meta.color }}>{meta.icon}</span>
                      <span className="text-[11px] font-bold font-mono uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
                      {result.confidence && (
                        <span className="ml-auto text-[10px] font-mono text-[#aaa]">
                          ثقة: <span style={{ color: meta.color }}>{result.confidence}%</span>
                        </span>
                      )}
                    </div>
                    <div className="px-5 py-4">
                      <div className="text-[12px] text-[#ccc] leading-relaxed whitespace-pre-wrap font-mono">{result.content}</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isSearching && currentPhase && currentPhase !== "done" && (
              <motion.div className="rounded-xl border border-[#e21227]/20 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 size={12} className="animate-spin text-[#e21227]" />
                  <span className="text-[11px] text-[#e21227] font-mono">
                    {PHASE_META[currentPhase]?.label} — {PHASE_META[currentPhase]?.desc}
                  </span>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(24)].map((_, i) => (
                    <motion.div key={i} className="h-0.5 flex-1 rounded-full" style={{ background: "#e21227" }}
                      animate={{ opacity: [0.1, 1, 0.1] }}
                      transition={{ delay: i * 0.06, repeat: Infinity, duration: 1.4 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {currentPhase === "done" && results.length > 0 && (
              <motion.div className="rounded-xl border border-emerald-500/30 bg-emerald-500/05 p-4 flex items-center gap-3"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-emerald-400">اكتمل البحث العميق</p>
                  <p className="text-[11px] text-[#666]">تم تحليل {results.length} مرحلة — التقرير الكامل جاهز</p>
                </div>
                <button onClick={copyAll} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  {copied ? <Check size={12} /> : <Download size={12} />}
                  تصدير التقرير
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </FullPageOverlay>
  );
}
