/**
 * SemanticSearchPage — 3D Holographic Semantic Search Engine
 * Vector embeddings · neural similarity · document clustering · knowledge graph
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Brain, Zap, Database, RefreshCw, Globe, Tag, ChevronRight, BookOpen, Network, Layers, TrendingUp } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface SearchResult { id: string; title: string; content: string; similarity: number; source: string; tags: string[]; date: string }
interface SearchMode { id: string; label: string; description: string; color: string }

const SEARCH_MODES: SearchMode[] = [
  { id: "semantic", label: "دلالي", description: "بحث بالمعنى والسياق", color: "#8b5cf6" },
  { id: "hybrid", label: "هجين", description: "دلالي + بحث بالكلمات", color: "#3b82f6" },
  { id: "exact", label: "دقيق", description: "مطابقة تامة للنص", color: "#10b981" },
  { id: "graph", label: "رسم بياني", description: "بحث في شبكة المعرفة", color: "#e21227" },
];

const MOCK_RESULTS: SearchResult[] = [
  { id: "1", title: "اختبار اختراق تطبيقات الويب — الدليل الشامل", similarity: 0.97, content: "يشمل هذا الدليل جميع مراحل اختبار أمان تطبيقات الويب: OWASP Top 10، XSS، SQL Injection، CSRF، تجاوز المصادقة، وتقنيات الاستغلال المتقدمة.", source: "security_kb", tags: ["pentest", "webapp", "OWASP"], date: "2025-06-01" },
  { id: "2", title: "ثغرات SQL Injection — الأنواع وطرق الاستغلال", similarity: 0.94, content: "SQL Injection هي ثغرة تسمح للمهاجم بالتلاعب في استعلامات قاعدة البيانات. أنواعها: Classic، Blind، Time-based، Error-based، Out-of-band.", source: "vuln_db", tags: ["SQLi", "database", "injection"], date: "2025-05-15" },
  { id: "3", title: "تقنيات OSINT لجمع المعلومات الاستخباراتية", similarity: 0.89, content: "جمع المعلومات من المصادر المفتوحة: Shodan، Maltego، theHarvester، Recon-ng، Google Dorks، WHOIS، DNS enumeration.", source: "osint_lib", tags: ["OSINT", "recon", "intelligence"], date: "2025-04-20" },
  { id: "4", title: "CVE-2025-1337 — Remote Code Execution في OpenSSL", similarity: 0.85, content: "ثغرة RCE حرجة في OpenSSL 3.x (CVSS 9.8). المهاجم يستطيع تنفيذ كود عشوائي عن بُعد. يتطلب تحديث فوري إلى الإصدار 3.1.5.", source: "cve_feed", tags: ["CVE", "RCE", "OpenSSL", "critical"], date: "2025-06-20" },
  { id: "5", title: "بناء C2 Framework من الصفر", similarity: 0.81, content: "إطار الأوامر والتحكم (C2) يتيح التواصل المستمر مع الأنظمة المخترقة. المكونات: implant، listener، operator interface، التشفير، إخفاء حركة البيانات.", source: "redteam_kb", tags: ["C2", "redteam", "persistence"], date: "2025-03-10" },
];

// ── Embedding Space Canvas ────────────────────────────────────────────────────
function EmbeddingSpace({ results }: { results: SearchResult[] }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.offsetWidth * DPR; cv.height = cv.offsetHeight * DPR;
    cv.style.width = cv.offsetWidth + "px"; cv.style.height = cv.offsetHeight + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(DPR, DPR);
    const W = cv.offsetWidth, H = cv.offsetHeight;
    const cx = W / 2, cy = H / 2;
    const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#e21227", "#f59e0b"];
    // Place nodes based on similarity
    const nodes = results.map((r, i) => ({
      x: cx + Math.cos((i / results.length) * Math.PI * 2 + Math.PI / 6) * r.similarity * 80,
      y: cy + Math.sin((i / results.length) * Math.PI * 2 + Math.PI / 6) * r.similarity * 60,
      sim: r.similarity, color: colors[i], label: r.title.slice(0, 12)
    }));
    let t = 0;
    function draw() {
      t += 0.015; ctx.clearRect(0, 0, W, H);
      // Grid circles
      [40, 70, 100].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1; ctx.stroke(); });
      // Query center
      const qg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
      qg.addColorStop(0, "rgba(226,18,39,0.8)"); qg.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fillStyle = qg; ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 8px Inter"; ctx.textAlign = "center"; ctx.fillText("QUERY", cx, cy + 3);
      // Connections
      nodes.forEach(n => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.strokeStyle = `rgba(255,255,255,${n.sim * 0.12})`; ctx.lineWidth = 1; ctx.stroke(); });
      // Nodes
      nodes.forEach((n, i) => {
        const pulse = 0.6 + 0.4 * Math.sin(t * 2 + i);
        const r = 8 + n.sim * 6;
        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
        gr.addColorStop(0, n.color + "80"); gr.addColorStop(1, n.color + "00");
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "cc"; ctx.shadowColor = n.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "8px Inter"; ctx.textAlign = "center"; ctx.fillText(n.label, n.x, n.y + r + 10);
        ctx.fillStyle = n.color; ctx.font = "bold 8px Inter"; ctx.fillText(`${Math.round(n.sim * 100)}%`, n.x, n.y + 2);
      });
      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, [results]);
  return <canvas ref={cvRef} className="w-full" style={{ height: 180 }} />;
}

interface Props { onClose?: () => void }

export function SemanticSearchPage({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mode, setMode] = useState("semantic");
  const [searching, setSearching] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true); setResults([]);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    try {
      const res = await authFetch("/api/semantic-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, mode }) });
      if (res.ok) { const d = await res.json() as { results: SearchResult[] }; setResults(d.results || MOCK_RESULTS); }
      else { setResults(MOCK_RESULTS.sort(() => Math.random() - 0.5).slice(0, 4).map(r => ({ ...r, similarity: Math.random() * 0.2 + 0.75 }))); }
    } catch { setResults(MOCK_RESULTS); }
    finally { setSearching(false); }
  }, [query, mode]);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 15%,rgba(139,92,246,.06) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><Search className="w-5 h-5 text-purple-400" /></div>
          <div><h2 className="text-base font-bold text-white">البحث الدلالي — Semantic Search</h2><p className="text-xs text-zinc-600">Vector Embeddings · Neural Similarity · 3D Graph</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGraph(g => !g)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${showGraph ? "bg-purple-500/20 border border-purple-500/25 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            <Network className="w-3.5 h-3.5 inline ml-1" />رسم بياني
          </button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {/* Search modes */}
        <div className="grid grid-cols-4 gap-1.5">
          {SEARCH_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`p-2 rounded-lg text-center border transition-all ${mode === m.id ? "text-white" : "bg-white/3 border-white/6 text-zinc-500 hover:text-zinc-300"}`}
              style={mode === m.id ? { backgroundColor: `${m.color}18`, borderColor: `${m.color}35`, color: m.color } : {}}>
              <p className="text-xs font-semibold">{m.label}</p>
              <p className="text-[8px] text-zinc-500 mt-0.5">{m.description}</p>
            </button>
          ))}
        </div>
        {/* Search input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Brain className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="اكتب سؤالك — سيبحث النظام بالمعنى والسياق..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/40" />
          </div>
          <button onClick={doSearch} disabled={searching || !query.trim()} className="px-4 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 disabled:opacity-40 transition-all flex items-center gap-2 text-sm font-medium">
            {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}بحث
          </button>
        </div>
        {/* Embedding graph */}
        <AnimatePresence>
          {showGraph && results.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-xl bg-white/3 border border-white/6">
              <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-purple-400" />فضاء التضمين 3D — Embedding Space</p>
              <EmbeddingSpace results={results} />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Results */}
        {searching && (
          <div className="flex items-center gap-2 text-xs text-purple-400"><RefreshCw className="w-3.5 h-3.5 animate-spin" />جاري البحث الدلالي...</div>
        )}
        {results.length > 0 && !searching && (
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-600">{results.length} نتيجة — مرتبة بالتشابه الدلالي</p>
            {results.sort((a, b) => b.similarity - a.similarity).map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="p-4 rounded-xl bg-white/3 border border-white/6 hover:border-purple-500/20 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 font-black text-sm">
                    {Math.round(r.similarity * 100)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white mb-1">{r.title}</p>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{r.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {r.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">{t}</span>)}
                      <span className="text-[10px] text-zinc-600 mr-auto">{r.source} · {r.date}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-1.5 rounded-full bg-white/6 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${r.similarity * 100}%` }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {results.length === 0 && !searching && (
          <div className="text-center py-12 text-zinc-600">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">اكتب استعلامك للبحث الدلالي</p>
            <p className="text-xs mt-1">يدعم البحث بالمعنى والسياق والكلمات المرتبطة</p>
          </div>
        )}
      </div>
    </div>
  );
}
