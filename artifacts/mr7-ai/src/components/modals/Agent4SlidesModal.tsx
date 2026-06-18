import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  X, Presentation, ChevronLeft, ChevronRight, Plus, Trash2,
  Play, Square, Download, Loader2, Sparkles, Layers,
  Type, Image, BarChart3, Quote, List, Code2, Zap,
  RefreshCw, Copy, CheckCheck, Monitor, Eye,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type SlideLayout = "title" | "content" | "two-col" | "quote" | "code" | "chart" | "blank";

type Slide = {
  id: string;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  body?: string;
  code?: string;
  quote?: string;
  author?: string;
  color: string;
  bg: string;
};

const LAYOUTS: { id: SlideLayout; label: string; icon: typeof Type }[] = [
  { id: "title",   label: "عنوان",       icon: Type       },
  { id: "content", label: "محتوى",       icon: List       },
  { id: "two-col", label: "عمودان",      icon: Layers     },
  { id: "quote",   label: "اقتباس",      icon: Quote      },
  { id: "code",    label: "كود",         icon: Code2      },
  { id: "chart",   label: "رسم بياني",   icon: BarChart3  },
  { id: "blank",   label: "فارغة",       icon: Square     },
];

const THEMES = [
  { name: "Cyber",    bg: "#080808", color: "#06b6d4", accent: "#8b5cf6" },
  { name: "Crimson",  bg: "#0a0505", color: "#e21227", accent: "#f97316" },
  { name: "Emerald",  bg: "#050a07", color: "#10b981", accent: "#06b6d4" },
  { name: "Gold",     bg: "#0a0800", color: "#f59e0b", accent: "#ec4899" },
  { name: "Violet",   bg: "#070510", color: "#a78bfa", accent: "#06b6d4" },
];

function uid() { return Math.random().toString(36).slice(2,9); }

function SlidePreview({ slide, active }: { slide: Slide; active: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-100, 100], [8, -8]));
  const rotateY = useSpring(useTransform(x, [-100, 100], [-8, 8]));

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        width: "100%", aspectRatio: "16/9",
        background: slide.bg,
        border: `2px solid ${active ? slide.color : "#1f1f1f"}`,
        boxShadow: active ? `0 0 30px ${slide.color}44, 0 0 60px ${slide.color}22` : "none",
        rotateX, rotateY, transformStyle: "preserve-3d",
        transformPerspective: 1000,
      }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.5);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      animate={{ scale: active ? 1 : 0.99, opacity: active ? 1 : 0.7 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${slide.color}22 1px, transparent 1px), linear-gradient(90deg, ${slide.color}22 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />

      {/* Corner marks */}
      {["top-3 left-3","top-3 right-3","bottom-3 left-3","bottom-3 right-3"].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-4 h-4 pointer-events-none opacity-40`}>
          <svg viewBox="0 0 16 16" fill="none">
            <path d={i===0?"M0,6 L0,0 L6,0":i===1?"M16,6 L16,0 L10,0":i===2?"M0,10 L0,16 L6,16":"M16,10 L16,16 L10,16"}
              stroke={slide.color} strokeWidth="1.5" />
          </svg>
        </div>
      ))}

      {/* Slide content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
        {slide.layout === "title" && (
          <>
            <motion.div className="text-4xl font-black text-white mb-3 leading-tight"
              style={{ textShadow: `0 0 30px ${slide.color}` }}>
              {slide.title || "عنوان الشريحة"}
            </motion.div>
            {slide.subtitle && <div className="text-lg opacity-70" style={{ color: slide.color }}>{slide.subtitle}</div>}
          </>
        )}
        {slide.layout === "content" && (
          <div className="w-full text-right">
            <div className="text-2xl font-black text-white mb-4">{slide.title}</div>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{slide.body}</div>
          </div>
        )}
        {slide.layout === "quote" && (
          <>
            <div className="text-5xl mb-4" style={{ color: slide.color }}>❝</div>
            <div className="text-xl text-white italic mb-3">{slide.quote || "النص هنا"}</div>
            <div className="text-sm" style={{ color: slide.color }}>— {slide.author || "المصدر"}</div>
          </>
        )}
        {slide.layout === "code" && (
          <div className="w-full text-left">
            <div className="text-lg font-black text-white mb-3">{slide.title}</div>
            <div className="bg-black/60 rounded-xl p-4 text-xs font-mono text-green-300 text-right">
              {slide.code || "// الكود هنا"}
            </div>
          </div>
        )}
        {slide.layout === "two-col" && (
          <div className="w-full grid grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border" style={{ borderColor: `${slide.color}33` }}>
              <div className="text-lg font-bold text-white mb-2">القسم الأول</div>
              <div className="text-xs text-slate-400">{slide.body?.split("\n").slice(0, 3).join("\n")}</div>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: `${slide.color}33` }}>
              <div className="text-lg font-bold text-white mb-2">القسم الثاني</div>
              <div className="text-xs text-slate-400">{slide.body?.split("\n").slice(3).join("\n")}</div>
            </div>
          </div>
        )}
        {slide.layout === "chart" && (
          <div className="w-full">
            <div className="text-xl font-black text-white mb-4">{slide.title}</div>
            <div className="flex items-end justify-center gap-3 h-24">
              {[65, 80, 45, 90, 70, 55, 85].map((h, i) => (
                <motion.div key={i} className="flex-1 rounded-t-lg"
                  style={{ background: `linear-gradient(to top, ${slide.color}, ${slide.color}66)` }}
                  initial={{ height: 0 }} animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.1, type: "spring" }} />
              ))}
            </div>
          </div>
        )}
        {slide.layout === "blank" && (
          <div className="text-slate-700 text-sm">شريحة فارغة</div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(to right, ${slide.color}, transparent)` }} />
    </motion.div>
  );
}

export default function Agent4SlidesModal({ open, onOpenChange }: Props) {
  const [slides, setSlides] = useState<Slide[]>([
    { id: uid(), layout: "title", title: "مشروعي الاستثماري", subtitle: "فرصة لا تُفوَّت — 2025", color: "#06b6d4", bg: "#080808" },
    { id: uid(), layout: "content", title: "نظرة عامة", body: "• الفكرة الرئيسية\n• السوق المستهدف\n• نموذج الإيرادات", color: "#06b6d4", bg: "#080808" },
  ]);
  const [current, setCurrent] = useState(0);
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [theme, setTheme] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const currentSlide = slides[current];
  const activeTheme = THEMES[theme];

  const generateSlides = useCallback(async () => {
    if (!topic.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/agent4/slides", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, mode: "max", language: "ar" }),
        signal: ctrl.signal,
      });
      let raw = "";
      const reader = res.body!.getReader();
      const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
          for (const line of block.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try { const p = JSON.parse(line.slice(5)); if (p.text) raw += p.text; } catch {}
          }
        }
      }
      // Parse slide blocks from AI response
      const sections = raw.split(/\n?={3,}\s*SLIDE\s*\d+\s*={3,}\n?/i).filter(s => s.trim().length > 20);
      if (sections.length > 1) {
        const parsed: Slide[] = sections.slice(0, 10).map((s, i) => {
          const titleM = s.match(/^#\s+(.+)|Title:\s*(.+)/im);
          const subM = s.match(/Subtitle:\s*(.+)/i);
          const bodyLines = s.replace(/^#.+/m, "").replace(/Subtitle:.+/i, "").trim();
          return {
            id: uid(), layout: i === 0 ? "title" : (i % 4 === 0 ? "quote" : i % 3 === 0 ? "two-col" : "content"),
            title: (titleM?.[1] || titleM?.[2] || `شريحة ${i+1}`).trim(),
            subtitle: subM?.[1]?.trim(), body: bodyLines,
            color: activeTheme.color, bg: activeTheme.bg,
          };
        });
        setSlides(parsed);
        setCurrent(0);
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        // Fallback: create demo slides
        setSlides([
          { id: uid(), layout: "title",   title: topic, subtitle: "مُنشأ بـ Agent 4", color: activeTheme.color, bg: activeTheme.bg },
          { id: uid(), layout: "content", title: "المقدمة", body: `• نظرة عامة على ${topic}\n• الأهداف الرئيسية\n• الخطة`, color: activeTheme.color, bg: activeTheme.bg },
          { id: uid(), layout: "two-col", title: "التحليل", body: "نقطة أولى\nنقطة ثانية\nنقطة ثالثة\nنقطة رابعة", color: activeTheme.color, bg: activeTheme.bg },
          { id: uid(), layout: "chart",   title: "الأرقام والإحصائيات", color: activeTheme.color, bg: activeTheme.bg },
          { id: uid(), layout: "quote",   title: "", quote: `${topic} هو مستقبل الصناعة`, author: "Agent 4", color: activeTheme.color, bg: activeTheme.bg },
          { id: uid(), layout: "content", title: "الخلاصة", body: "• النقطة الرئيسية\n• الخطوات التالية\n• الدعوة إلى العمل", color: activeTheme.color, bg: activeTheme.bg },
        ]);
        setCurrent(0);
      }
    }
    setIsGenerating(false);
  }, [topic, activeTheme]);

  const addSlide = (layout: SlideLayout) => {
    const s: Slide = { id: uid(), layout, title: "شريحة جديدة", color: activeTheme.color, bg: activeTheme.bg };
    setSlides(prev => { const n = [...prev]; n.splice(current + 1, 0, s); return n; });
    setCurrent(current + 1);
  };

  const deleteSlide = () => {
    if (slides.length === 1) return;
    setSlides(prev => prev.filter((_, i) => i !== current));
    setCurrent(Math.max(0, current - 1));
  };

  const applyTheme = (idx: number) => {
    setTheme(idx);
    const t = THEMES[idx];
    setSlides(prev => prev.map(s => ({ ...s, color: t.color, bg: t.bg })));
  };

  useEffect(() => { if (!open) { abortRef.current?.abort(); setPresenting(false); } }, [open]);
  useEffect(() => {
    if (!presenting) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setCurrent(p => Math.min(p+1, slides.length-1));
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   setCurrent(p => Math.max(p-1, 0));
      if (e.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [presenting, slides.length]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {/* Presentation Mode */}
      {presenting && (
        <motion.div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="w-full max-w-5xl px-8">
            <AnimatePresence mode="wait">
              <motion.div key={current}
                initial={{ opacity: 0, x: 60, rotateY: -15 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -60, rotateY: 15 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                style={{ perspective: 1200 }}>
                <SlidePreview slide={currentSlide} active={true} />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-6 mt-8">
            <button onClick={() => setCurrent(p => Math.max(0,p-1))} disabled={current===0}
              className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30">
              <ChevronLeft size={20} />
            </button>
            <span className="text-white text-sm">{current+1} / {slides.length}</span>
            <button onClick={() => setCurrent(p => Math.min(p+1,slides.length-1))} disabled={current===slides.length-1}
              className="p-3 rounded-full bg-white/10 text-white disabled:opacity-30">
              <ChevronRight size={20} />
            </button>
            <button onClick={() => setPresenting(false)} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm">
              إنهاء
            </button>
          </div>
        </motion.div>
      )}

      <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.95)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>
        <motion.div className="relative flex flex-col overflow-hidden"
          style={{
            width: "min(1500px, 98vw)", height: "min(920px, 96vh)",
            background: "linear-gradient(135deg,#080508 0%,#0d0a10 50%,#080508 100%)",
            border: "1px solid rgba(245,158,11,0.2)", borderRadius: 20,
            boxShadow: "0 0 80px rgba(245,158,11,0.06), inset 0 0 100px rgba(245,158,11,0.02)",
          }}
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}>

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4">
              <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
                animate={{ boxShadow: ["0 0 10px rgba(245,158,11,0.2)","0 0 30px rgba(245,158,11,0.5)","0 0 10px rgba(245,158,11,0.2)"] }}
                transition={{ duration: 2, repeat: Infinity }}>
                <Presentation size={22} color="#f59e0b" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white tracking-widest">SLIDES</span>
                  <motion.span className="text-xl font-black tracking-widest"
                    style={{ color: "#f59e0b", textShadow: "0 0 20px #f59e0b" }}
                    animate={{ textShadow: ["0 0 10px #f59e0b88","0 0 30px #f59e0b","0 0 10px #f59e0b88"] }}
                    transition={{ duration: 2, repeat: Infinity }}>CREATOR</motion.span>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/30 text-amber-400 bg-amber-500/10">3D · AI</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">إنشاء عروض تقديمية ثلاثية الأبعاد بالذكاء الاصطناعي</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button onClick={() => setPresenting(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b" }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Monitor size={14} />عرض تقديمي
              </motion.button>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-xl border border-[#2a2a2a] bg-[#111] text-slate-400 hover:text-white hover:border-red-500/50 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* AI Generate Bar */}
          <div className="relative px-6 py-3 border-b border-[#1a1a1a] flex items-center gap-3 flex-shrink-0">
            <Sparkles size={14} color="#f59e0b" />
            <input value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") generateSlides(); }}
              placeholder="موضوع العرض... مثال: خطة أعمال منصة SaaS للذكاء الاصطناعي"
              className="flex-1 bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-2 text-sm text-white outline-none placeholder-slate-600 focus:border-amber-500/30"
              dir="auto" />
            <motion.button onClick={generateSlides} disabled={!topic.trim() || isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b" }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {isGenerating ? <><Loader2 size={14} className="animate-spin" />يولّد...</> : <><Zap size={14} />توليد AI</>}
            </motion.button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left: Slides Filmstrip */}
            <div className="w-52 flex-shrink-0 border-r border-[#1a1a1a] flex flex-col overflow-hidden">
              {/* Theme Selector */}
              <div className="p-2 border-b border-[#1a1a1a] flex gap-1 flex-wrap">
                {THEMES.map((t, i) => (
                  <button key={t.name} onClick={() => applyTheme(i)}
                    className="flex-1 h-5 rounded-md border transition-all"
                    style={theme === i
                      ? { background: t.color, borderColor: t.color, boxShadow: `0 0 8px ${t.color}88` }
                      : { background: `${t.color}33`, borderColor: `${t.color}55` }}
                    title={t.name} />
                ))}
              </div>
              {/* Filmstrip */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {slides.map((s, i) => (
                  <motion.div key={s.id}
                    onClick={() => setCurrent(i)}
                    className="relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all"
                    style={{ borderColor: current === i ? activeTheme.color : "#1f1f1f", boxShadow: current === i ? `0 0 10px ${activeTheme.color}44` : "none" }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}>
                    <div className="aspect-video relative" style={{ background: s.bg }}>
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <div className="text-center">
                          <div className="text-[8px] font-bold truncate w-full" style={{ color: s.color }}>{s.title || "شريحة"}</div>
                          <div className="text-[7px] text-slate-600 mt-0.5">{LAYOUTS.find(l => l.id === s.layout)?.label}</div>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: s.color }} />
                    </div>
                    <div className="absolute top-1 right-1 text-[8px] text-slate-600">{i+1}</div>
                  </motion.div>
                ))}
              </div>
              {/* Add Slide */}
              <div className="p-2 border-t border-[#1a1a1a]">
                <div className="grid grid-cols-3 gap-1">
                  {LAYOUTS.slice(0, 6).map(l => (
                    <button key={l.id} onClick={() => addSlide(l.id)}
                      className="flex flex-col items-center p-1.5 rounded-lg border border-[#222] hover:border-amber-500/30 hover:bg-[#1a1a1a] transition-all"
                      title={l.label}>
                      <l.icon size={12} color="#666" />
                      <span className="text-[8px] text-slate-700 mt-0.5">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Center: Slide Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setCurrent(p => Math.max(0, p-1))} disabled={current===0}
                    className="p-1.5 rounded-lg border border-[#222] text-slate-500 disabled:opacity-30 hover:text-white transition-all">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-sm text-slate-500">{current+1} / {slides.length}</span>
                  <button onClick={() => setCurrent(p => Math.min(p+1, slides.length-1))} disabled={current===slides.length-1}
                    className="p-1.5 rounded-lg border border-[#222] text-slate-500 disabled:opacity-30 hover:text-white transition-all">
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditMode(!editMode)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all"
                    style={editMode ? { borderColor: "#f59e0b44", color: "#f59e0b", background: "#f59e0b11" } : { borderColor: "#222", color: "#666" }}>
                    <Eye size={11} />{editMode ? "معاينة" : "تحرير"}
                  </button>
                  <button onClick={deleteSlide} disabled={slides.length === 1}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#222] text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-30 transition-all">
                    <Trash2 size={11} />حذف
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
                <div className="w-full max-w-3xl">
                  <AnimatePresence mode="wait">
                    <motion.div key={currentSlide.id}
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.02, y: -10 }}
                      transition={{ type: "spring", stiffness: 200, damping: 22 }}>
                      <SlidePreview slide={currentSlide} active={true} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Right: Properties */}
            <div className="w-56 flex-shrink-0 border-l border-[#1a1a1a] flex flex-col gap-0 overflow-y-auto p-3">
              <p className="text-[10px] text-slate-600 font-bold tracking-widest mb-3">خصائص الشريحة</p>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-600 block mb-1">العنوان</label>
                  <input value={currentSlide.title} onChange={e => setSlides(prev => prev.map((s,i) => i === current ? { ...s, title: e.target.value } : s))}
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
                </div>
                {currentSlide.layout === "title" && (
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-1">العنوان الفرعي</label>
                    <input value={currentSlide.subtitle ?? ""} onChange={e => setSlides(prev => prev.map((s,i) => i === current ? { ...s, subtitle: e.target.value } : s))}
                      className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
                  </div>
                )}
                {(currentSlide.layout === "content" || currentSlide.layout === "two-col") && (
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-1">المحتوى</label>
                    <textarea rows={6} value={currentSlide.body ?? ""} onChange={e => setSlides(prev => prev.map((s,i) => i === current ? { ...s, body: e.target.value } : s))}
                      className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white outline-none resize-none" />
                  </div>
                )}
                {currentSlide.layout === "code" && (
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-1">الكود</label>
                    <textarea rows={6} value={currentSlide.code ?? ""} onChange={e => setSlides(prev => prev.map((s,i) => i === current ? { ...s, code: e.target.value } : s))}
                      className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-[10px] text-green-300 outline-none resize-none font-mono" />
                  </div>
                )}
                {currentSlide.layout === "quote" && (
                  <>
                    <div>
                      <label className="text-[10px] text-slate-600 block mb-1">الاقتباس</label>
                      <textarea rows={3} value={currentSlide.quote ?? ""} onChange={e => setSlides(prev => prev.map((s,i) => i === current ? { ...s, quote: e.target.value } : s))}
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 block mb-1">المصدر</label>
                      <input value={currentSlide.author ?? ""} onChange={e => setSlides(prev => prev.map((s,i) => i === current ? { ...s, author: e.target.value } : s))}
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white outline-none" />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-[10px] text-slate-600 block mb-1">اللون</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={currentSlide.color} onChange={e => setSlides(prev => prev.map((s,i) => i === current ? { ...s, color: e.target.value } : s))}
                      className="w-8 h-8 rounded-lg border border-[#333] cursor-pointer" />
                    <span className="text-[10px] text-slate-500 font-mono">{currentSlide.color}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-600 block mb-2">تخطيط</label>
                  <div className="grid grid-cols-3 gap-1">
                    {LAYOUTS.map(l => (
                      <button key={l.id} onClick={() => setSlides(prev => prev.map((s,i) => i === current ? { ...s, layout: l.id } : s))}
                        className="flex flex-col items-center p-1.5 rounded-lg border transition-all"
                        style={currentSlide.layout === l.id
                          ? { borderColor: `${currentSlide.color}55`, background: `${currentSlide.color}15`, color: currentSlide.color }
                          : { borderColor: "#1f1f1f", color: "#555" }}>
                        <l.icon size={11} />
                        <span className="text-[8px] mt-0.5">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between px-5 py-2 border-t border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4 text-[10px]">
              {[{c:"#f59e0b",l:`${slides.length} شريحة`},{c:"#10b981",l:"AI"},{c:"#8b5cf6",l:"3D"}].map((t,i) => (
                <motion.span key={i} style={{color:t.c}} animate={{opacity:[0.5,1,0.5]}} transition={{duration:2,repeat:Infinity,delay:i*0.4}}>● {t.l}</motion.span>
              ))}
            </div>
            <motion.div className="text-[10px] text-slate-700" animate={{opacity:[0.4,0.8,0.4]}} transition={{duration:3,repeat:Infinity}}>
              AGENT 4 · SLIDES CREATOR · 3D
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
