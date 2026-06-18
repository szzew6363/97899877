import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Globe, Search, ExternalLink, Loader2, RefreshCw,
  Zap, Brain, TrendingUp, BookOpen, Code2, Shield,
  Radio, Star, ChevronRight, Copy, CheckCircle2, Eye,
  Cpu, Network, Sparkles, AlertCircle, Clock, Filter,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type SearchResult = {
  title: string; url: string; snippet: string;
  icon: string; category: string; relevance: number;
};

type SearchMode = "smart" | "technical" | "security" | "research";

const SEARCH_MODES: { id: SearchMode; label: string; color: string; icon: typeof Globe; prompt: string }[] = [
  { id: "smart",    label: "ذكي",     color: "#06b6d4", icon: Brain,   prompt: "Provide a comprehensive, balanced analysis of: " },
  { id: "technical",label: "تقني",    color: "#8b5cf6", icon: Code2,   prompt: "Provide detailed technical documentation and examples for: " },
  { id: "security", label: "أمني",    color: "#e21227", icon: Shield,  prompt: "Provide security analysis, vulnerabilities, and best practices for: " },
  { id: "research", label: "بحثي",    color: "#f59e0b", icon: BookOpen, prompt: "Provide an academic research-style analysis with sources for: " },
];

const QUICK: string[] = [
  "React 19 new features",
  "Best AI frameworks 2025",
  "WebSocket vs SSE performance",
  "PostgreSQL vs MongoDB 2025",
  "Tailwind v4 migration guide",
  "Zero-trust security model",
];

/* ─── Radar Pulse BG ───────────────────────────────────────────── */
function RadarBG() {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = cv.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, raf = 0, t = 0;
    const resize = () => { W = canvas.offsetWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H; };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      for (let r = 60; r < Math.max(W, H); r += 80) {
        const alpha = Math.max(0, 0.06 - r / Math.max(W, H) * 0.06);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6,182,212,${alpha})`; ctx.lineWidth = 1; ctx.stroke();
      }
      // Sweep line
      const sweepAngle = t * 1.5;
      for (let a = 0; a < Math.PI * 0.4; a += 0.02) {
        const angle = sweepAngle - a;
        const len = Math.max(W, H) * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.strokeStyle = `rgba(6,182,212,${(0.12 - a * 0.3)})`;
        ctx.lineWidth = 2; ctx.stroke();
      }
      // Blips
      const blips = [
        { angle: 0.5, r: 0.2 }, { angle: 1.8, r: 0.4 }, { angle: 3.1, r: 0.3 },
        { angle: 4.5, r: 0.55 }, { angle: 5.9, r: 0.25 },
      ];
      blips.forEach(b => {
        const bx = cx + Math.cos(b.angle) * Math.min(W, H) * b.r;
        const by = cy + Math.sin(b.angle) * Math.min(W, H) * b.r;
        const alpha = Math.max(0, Math.sin(t * 2 + b.angle) * 0.5 + 0.3);
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, 8);
        g.addColorStop(0, `rgba(6,182,212,${alpha})`);
        g.addColorStop(1, "rgba(6,182,212,0)");
        ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${alpha})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={cv} className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" />;
}

/* ─── Result Card ──────────────────────────────────────────────── */
function ResultCard({ result, index, color }: { result: SearchResult; index: number; color: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      className="rounded-xl border p-4 cursor-pointer transition-all"
      style={{ borderColor: expanded ? `${color}44` : "#1f1f1f", background: expanded ? `${color}06` : "#0d0d0d" }}
      initial={{ opacity: 0, y: 20, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 200, damping: 22 }}
      onClick={() => setExpanded(!expanded)}
      whileHover={{ scale: 1.01, borderColor: `${color}33` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
            style={{ background: `${color}20`, border: `1px solid ${color}33` }}>
            {result.icon}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{result.title}</div>
            <div className="text-[10px] font-mono truncate mt-0.5" style={{ color: `${color}99` }}>{result.url}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: `${color}15`, color, border: `1px solid ${color}33` }}>
            {(result.relevance * 100).toFixed(0)}%
          </div>
          <div className="px-2 py-0.5 rounded-full text-[9px] border border-[#222] text-slate-600">{result.category}</div>
          <ChevronRight size={12} color="#555" className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 pt-3 border-t border-[#1a1a1a]">
            <p className="text-xs text-slate-400 leading-relaxed">{result.snippet}</p>
            <div className="flex items-center gap-2 mt-3">
              <a href={result.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border hover:bg-[#1a1a1a] transition-all"
                style={{ borderColor: `${color}33`, color }}
                onClick={e => e.stopPropagation()}>
                <ExternalLink size={10} />زيارة
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Agent4WebSearchModal({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("smart");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [phase, setPhase] = useState("");
  const [searchTime, setSearchTime] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const activeMode = SEARCH_MODES.find(m => m.id === mode)!;

  const search = useCallback(async (q?: string) => {
    const searchQuery = (q || query).trim();
    if (!searchQuery) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsSearching(true); setResults([]); setAiAnalysis(""); setPhase("جاري البحث في الويب...");
    const t0 = Date.now();

    try {
      // Real DuckDuckGo search
      const ddgRes = await fetch(`/api/agent4/websearch?q=${encodeURIComponent(searchQuery)}`, { signal: ctrl.signal });
      const ddgData = await ddgRes.json() as { results: SearchResult[]; ok: boolean };
      if (ddgData.results) setResults(ddgData.results);
      setSearchTime(Date.now() - t0);
      setPhase("تحليل النتائج بالذكاء الاصطناعي...");

      // AI analysis stream
      const aiRes = await fetch("/api/agent4/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: activeMode.prompt + searchQuery, mode: "turbo", language: "ar" }),
        signal: ctrl.signal,
      });
      const reader = aiRes.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
          for (const line of block.split("\n")) {
            if (!line.trim().startsWith("data:")) continue;
            try {
              const p = JSON.parse(line.slice(5));
              if (p.text) setAiAnalysis(prev => prev + p.text);
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setPhase("فشل البحث");
    } finally {
      setIsSearching(false); setPhase("");
    }
  }, [query, mode, activeMode]);

  useEffect(() => { if (!open) { abortRef.current?.abort(); setIsSearching(false); } }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.95)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>
        <motion.div className="relative flex flex-col overflow-hidden"
          style={{
            width: "min(1400px, 98vw)", height: "min(900px, 96vh)",
            background: "linear-gradient(135deg,#050808 0%,#080d10 50%,#050808 100%)",
            border: "1px solid rgba(6,182,212,0.2)", borderRadius: 20,
            boxShadow: "0 0 80px rgba(6,182,212,0.08), inset 0 0 100px rgba(6,182,212,0.02)",
          }}
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}>
          <RadarBG />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4">
              <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center relative"
                style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", boxShadow: "0 0 30px rgba(6,182,212,0.2)" }}>
                <motion.div className="absolute inset-0 rounded-xl border border-cyan-500/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }} />
                <Globe size={22} color="#06b6d4" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white tracking-widest">WEB</span>
                  <motion.span className="text-xl font-black tracking-widest"
                    style={{ color: "#06b6d4", textShadow: "0 0 20px #06b6d4" }}
                    animate={{ textShadow: ["0 0 10px #06b6d488","0 0 30px #06b6d4","0 0 10px #06b6d488"] }}
                    transition={{ duration: 2, repeat: Infinity }}>SEARCH</motion.span>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">REAL · LIVE</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">بحث حقيقي · تحليل ذكاء اصطناعي · نتائج فورية</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {searchTime > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Clock size={10} />{searchTime}ms
                </div>
              )}
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-xl border border-[#2a2a2a] bg-[#111] text-slate-400 hover:text-white hover:border-red-500/50 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
            {/* Mode Selector */}
            <div className="flex items-center gap-2 mb-3">
              {SEARCH_MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                  style={mode === m.id
                    ? { borderColor: `${m.color}44`, background: `${m.color}15`, color: m.color }
                    : { borderColor: "#222", background: "transparent", color: "#555" }}>
                  <m.icon size={11} />{m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={16} color="#06b6d4" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") search(); }}
                  placeholder="ابحث عن أي شيء... (اضغط Enter)"
                  className="w-full bg-[#0d0d0d] border border-[#333] rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none placeholder-slate-600 focus:border-cyan-500/40 transition-colors"
                  dir="auto" />
              </div>
              <motion.button onClick={() => search()} disabled={!query.trim() || isSearching}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: `${activeMode.color}22`, border: `1px solid ${activeMode.color}44`, color: activeMode.color, boxShadow: `0 0 20px ${activeMode.color}22` }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                بحث
              </motion.button>
            </div>
            {/* Quick Searches */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto">
              <span className="text-[10px] text-slate-600 shrink-0">سريع:</span>
              {QUICK.map(q => (
                <button key={q} onClick={() => { setQuery(q); search(q); }}
                  className="shrink-0 px-2 py-1 rounded-lg text-[10px] text-slate-500 border border-[#222] hover:border-cyan-500/30 hover:text-cyan-400 transition-all bg-[#0d0d0d]">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Phase */}
          <AnimatePresence>
            {phase && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                className="px-6 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center gap-3 overflow-hidden">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Loader2 size={13} color="#06b6d4" />
                </motion.div>
                <span className="text-xs text-cyan-400">{phase}</span>
                <div className="flex gap-1">
                  {[0,1,2,3,4].map(i => (
                    <motion.div key={i} className="w-1 h-3 rounded-full bg-cyan-500"
                      animate={{ scaleY: [0.3,1,0.3] }} transition={{ duration: 0.6, repeat: Infinity, delay: i*0.1 }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Results */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-[#1a1a1a]">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a] flex-shrink-0">
                <Globe size={12} color={activeMode.color} />
                <span className="text-[11px] text-slate-500 font-bold tracking-widest">نتائج الويب</span>
                {results.length > 0 && <span className="text-[10px] text-slate-700">{results.length} نتيجة</span>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {results.length > 0 ? results.map((r, i) => (
                  <ResultCard key={i} result={r} index={i} color={activeMode.color} />
                )) : !isSearching ? (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <motion.div animate={{ rotate: [0,360] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}>
                      <Globe size={60} color="#06b6d433" />
                    </motion.div>
                    <div className="text-center">
                      <div className="text-slate-500 text-sm">ابحث عن أي موضوع</div>
                      <div className="text-slate-700 text-xs mt-1">نتائج حقيقية + تحليل ذكاء اصطناعي</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => (
                      <motion.div key={i} className="h-20 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]"
                        animate={{ opacity: [0.3,0.6,0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i*0.2 }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a] flex-shrink-0">
                <Brain size={12} color="#8b5cf6" />
                <span className="text-[11px] text-slate-500 font-bold tracking-widest">تحليل الذكاء الاصطناعي</span>
                {isSearching && aiAnalysis && (
                  <motion.div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500"
                    animate={{ opacity: [0.4,1,0.4] }} transition={{ duration: 0.8, repeat: Infinity }} />
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {aiAnalysis ? (
                  <div className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                    {aiAnalysis}
                    {isSearching && (
                      <motion.span animate={{ opacity: [1,0] }} transition={{ duration: 0.5, repeat: Infinity }}
                        className="inline-block w-2 h-4 bg-purple-400 ml-0.5 align-middle" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <motion.div animate={{ scale: [1,1.1,1], opacity: [0.4,0.8,0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Brain size={40} color="#8b5cf633" />
                    </motion.div>
                    <p className="text-[11px] text-slate-700 text-center">سيظهر التحليل الذكي هنا بعد البحث</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between px-5 py-2 border-t border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-3 text-[10px]">
              {[{ c: "#06b6d4", l: "بحث حقيقي" }, { c: "#8b5cf6", l: "تحليل AI" }, { c: "#10b981", l: "سريع" }].map((t,i) => (
                <motion.span key={i} style={{ color: t.c }} animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:2, repeat:Infinity, delay:i*0.4 }}>
                  ● {t.l}
                </motion.span>
              ))}
            </div>
            <motion.div className="text-[10px] text-slate-700" animate={{ opacity:[0.4,0.8,0.4] }} transition={{ duration:3, repeat:Infinity }}>
              AGENT 4 · WEB SEARCH · LIVE
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
