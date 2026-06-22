/**
 * MemorySystemPage — 3D Holographic Long-Term Memory
 * Memory graph · semantic clusters · timeline · AI-powered recall
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Plus, Search, Trash2, RefreshCw, Clock, Tag, Zap, BookOpen, Hash } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface Memory { id: string; content: string; tags: string[]; createdAt: string; importance: number; embedding?: number[] }

const MOCK_MEMORIES: Memory[] = [
  { id: "1", content: "المستخدم يفضل الإجابات التفصيلية باللغة العربية", tags: ["تفضيلات", "لغة"], createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), importance: 9 },
  { id: "2", content: "مشروع KaliGPT — منصة أمن سيبراني مبنية على React و Node.js", tags: ["مشروع", "تقني"], createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), importance: 8 },
  { id: "3", content: "يعمل على تطوير 38 نظام متكامل بتصميم 3D هولوغرافي", tags: ["مشروع", "هدف"], createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), importance: 10 },
  { id: "4", content: "يستخدم pnpm monorepo مع Vite و Tailwind v4 و Framer Motion", tags: ["تقني", "stack"], createdAt: new Date(Date.now() - 86400000).toISOString(), importance: 7 },
  { id: "5", content: "اللون الأساسي للثيم: #e21227 أحمر — خلفية #080808", tags: ["تصميم", "ثيم"], createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), importance: 6 },
  { id: "6", content: "قاعدة البيانات PostgreSQL — DATABASE_URL متاح كـ env variable", tags: ["تقني", "قاعدة بيانات"], createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), importance: 7 },
];

// ── Memory Cluster Canvas ─────────────────────────────────────────────────────
function MemoryCluster({ memories }: { memories: Memory[] }) {
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
    const nodes = memories.map((m, i) => {
      const angle = (i / memories.length) * Math.PI * 2;
      const r = 70 + (m.importance / 10) * 30;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, m, vx: Math.random() * 0.5 - 0.25, vy: Math.random() * 0.5 - 0.25 };
    });
    let t = 0;
    function draw() {
      t += 0.012; ctx.clearRect(0, 0, W, H);
      nodes.forEach(n => {
        n.x += Math.sin(t + n.m.importance) * 0.3; n.y += Math.cos(t * 0.7 + n.m.importance) * 0.3;
        if (n.x < 20 || n.x > W - 20) n.vx *= -1;
        if (n.y < 20 || n.y > H - 20) n.vy *= -1;
      });
      nodes.forEach((a, i) => nodes.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) { const alpha = (1 - d / 120) * 0.18; ctx.strokeStyle = `rgba(139,92,246,${alpha})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }));
      nodes.forEach(n => {
        const r2 = 6 + n.m.importance * 0.8;
        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r2 * 3);
        gr.addColorStop(0, "rgba(139,92,246,0.6)"); gr.addColorStop(1, "rgba(139,92,246,0)");
        ctx.beginPath(); ctx.arc(n.x, n.y, r2 * 3, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${0.5 + 0.5 * Math.sin(t * 2 + n.m.importance)})`; ctx.shadowColor = "#8b5cf6"; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
        if (r2 > 10) { ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = `${Math.max(8, r2 * 0.8)}px Inter`; ctx.textAlign = "center"; ctx.fillText(n.m.content.slice(0, 12) + "…", n.x, n.y + r2 + 10); }
      });
      // Central brain
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20 + pulse * 5);
      cg.addColorStop(0, "rgba(139,92,246,0.9)"); cg.addColorStop(1, "rgba(139,92,246,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 20 + pulse * 5, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "9px Inter"; ctx.textAlign = "center"; ctx.fillText("BRAIN", cx, cy + 3);
      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, [memories]);
  return <canvas ref={cvRef} className="w-full" style={{ height: 200 }} />;
}

function fmtAge(s: string) { const d = Date.now() - new Date(s).getTime(); if (d < 3600000) return `${Math.round(d / 60000)}د`; if (d < 86400000) return `${Math.round(d / 3600000)}س`; return `${Math.round(d / 86400000)} يوم`; }

interface Props { onClose?: () => void }

export function MemorySystemPage({ onClose }: Props) {
  const [memories, setMemories] = useState<Memory[]>(MOCK_MEMORIES);
  const [search, setSearch] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "graph">("list");

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/memory");
      if (res.ok) { const d = await res.json() as { memories: Memory[] }; if (d.memories?.length) setMemories(d.memories); }
    } catch { /* use mock */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  const addMemory = useCallback(async () => {
    if (!newContent.trim()) return;
    const m: Memory = { id: crypto.randomUUID(), content: newContent, tags: newTag ? newTag.split(",").map(t => t.trim()) : [], createdAt: new Date().toISOString(), importance: 5 };
    setMemories(prev => [m, ...prev]);
    try { await authFetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) }); } catch { /**/ }
    setNewContent(""); setNewTag(""); setAdding(false);
  }, [newContent, newTag]);

  const del = useCallback(async (id: string) => {
    setMemories(m => m.filter(x => x.id !== id));
    try { await authFetch(`/api/memory/${id}`, { method: "DELETE" }); } catch { /**/ }
  }, []);

  const filtered = memories.filter(m => !search || m.content.toLowerCase().includes(search.toLowerCase()) || m.tags.some(t => t.includes(search)));

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 20%,rgba(139,92,246,.06) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><Brain className="w-5 h-5 text-purple-400" /></div>
          <div><h2 className="text-base font-bold text-white">الذاكرة طويلة الأمد — 3D</h2><p className="text-xs text-zinc-600">{memories.length} ذاكرة · Long-term Memory System</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(v => v === "list" ? "graph" : "list")} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "graph" ? "bg-purple-500/20 border border-purple-500/25 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            {view === "list" ? "رسم بياني" : "قائمة"}
          </button>
          <button onClick={() => setAdding(a => !a)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 border border-purple-500/25 text-purple-400 hover:bg-purple-500/30 transition-all">
            <Plus className="w-3.5 h-3.5" />إضافة
          </button>
          <button onClick={loadMemories} disabled={loading} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /></button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-xl bg-purple-500/6 border border-purple-500/20 space-y-3">
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="محتوى الذاكرة الجديدة..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/40 resize-none h-20" />
              <div className="flex gap-2">
                <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="وسوم (مفصولة بفاصلة)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/40" />
                <button onClick={addMemory} className="px-4 py-2 rounded-xl bg-purple-500/25 border border-purple-500/30 text-purple-400 text-xs font-medium hover:bg-purple-500/35 transition-all">حفظ</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الذاكرة..." className="w-full bg-white/5 border border-white/8 rounded-xl pr-9 pl-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/30" />
        </div>
        {view === "graph" && <MemoryCluster memories={filtered} />}
        {view === "list" && (
          <div className="space-y-2">
            {filtered.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15 hover:border-purple-500/25 transition-colors group">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"><BookOpen className="w-3.5 h-3.5 text-purple-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{m.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {m.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">{t}</span>)}
                      <span className="text-[10px] text-zinc-600 flex items-center gap-0.5 mr-auto"><Clock className="w-2.5 h-2.5" />{fmtAge(m.createdAt)}</span>
                      <span className="text-[10px] text-zinc-600">أهمية: {m.importance}/10</span>
                    </div>
                  </div>
                  <button onClick={() => del(m.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && <div className="text-center py-10 text-zinc-600 text-sm">لا توجد ذكريات مطابقة</div>}
          </div>
        )}
      </div>
    </div>
  );
}
