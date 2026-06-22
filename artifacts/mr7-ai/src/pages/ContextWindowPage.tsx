/**
 * ContextWindowPage — 3D Holographic Context Manager
 * Token usage visualization · context pruning · memory injection · 3D token map
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, X, Zap, Brain, Trash2, RefreshCw, Plus, ChevronRight, Clock, Hash, FileText, Code2, MessageSquare, Settings, Eye } from "lucide-react";
import { useStore } from "@/lib/store";

interface ContextBlock { id: string; type: "system" | "user" | "assistant" | "memory" | "file" | "code"; content: string; tokens: number; priority: number; pinned: boolean; color: string }

const TYPE_COLORS: Record<string, string> = { system: "#e21227", user: "#3b82f6", assistant: "#10b981", memory: "#8b5cf6", file: "#f59e0b", code: "#06b6d4" };
const TYPE_LABELS: Record<string, string> = { system: "نظام", user: "مستخدم", assistant: "مساعد", memory: "ذاكرة", file: "ملف", code: "كود" };
const TYPE_ICONS: Record<string, React.ElementType> = { system: Settings, user: MessageSquare, assistant: Brain, memory: Layers, file: FileText, code: Code2 };

const MOCK_BLOCKS: ContextBlock[] = [
  { id: "1", type: "system", content: "أنت KaliGPT، نموذج AI متخصص في الأمن السيبراني مع خبرة في اختبار الاختراق وتحليل الثغرات والهندسة العكسية...", tokens: 342, priority: 10, pinned: true, color: "#e21227" },
  { id: "2", type: "memory", content: "المستخدم يعمل على مشروع KaliGPT بتصميم 3D هولوغرافي. يفضل الإجابات التفصيلية باللغة العربية.", tokens: 89, priority: 8, pinned: true, color: "#8b5cf6" },
  { id: "3", type: "file", content: "artifacts/mr7-ai/src/App.tsx — 1254 سطر من TypeScript React...", tokens: 4200, priority: 6, pinned: false, color: "#f59e0b" },
  { id: "4", type: "user", content: "أريد بناء 38 نظام متكامل بتصميم 3D هولوغرافي فائق الجودة...", tokens: 156, priority: 7, pinned: false, color: "#3b82f6" },
  { id: "5", type: "assistant", content: "سأبدأ بناء كل الأنظمة الـ 38 بأقصى سرعة وجودة ممكنة...", tokens: 234, priority: 5, pinned: false, color: "#10b981" },
  { id: "6", type: "code", content: "const SystemsHub3D = lazy(() => import('./components/SystemsHub3D')...", tokens: 512, priority: 6, pinned: false, color: "#06b6d4" },
];

const MAX_TOKENS = 128000;

// ── Token Map Canvas ──────────────────────────────────────────────────────────
function TokenMap({ blocks, maxTokens }: { blocks: ContextBlock[]; maxTokens: number }) {
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
    const totalTokens = blocks.reduce((s, b) => s + b.tokens, 0);
    let t = 0;
    function draw() {
      t += 0.01; ctx.clearRect(0, 0, W, H);
      // Background grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      // Token blocks as pixel map
      const ROWS = 8, COLS = Math.ceil(totalTokens / ROWS);
      const CELL = Math.min(W / COLS, H / ROWS, 8);
      let x = 0; let y = 0; let tokenCount = 0;
      blocks.forEach(block => {
        for (let i = 0; i < block.tokens; i++) {
          const px = (tokenCount % Math.floor(W / CELL)) * CELL;
          const py = Math.floor(tokenCount / Math.floor(W / CELL)) * CELL;
          if (py < H) {
            const alpha = block.pinned ? 1 : 0.5 + 0.3 * Math.sin(t * 2 + i * 0.1);
            ctx.fillStyle = block.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
            ctx.fillRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
          }
          tokenCount++;
        }
      });
      // Used vs available indicator
      const usedPct = totalTokens / maxTokens;
      ctx.fillStyle = `rgba(255,255,255,0.05)`;
      ctx.fillRect(0, H - 6, W, 6);
      ctx.fillStyle = usedPct > 0.8 ? "#ef4444" : usedPct > 0.6 ? "#f59e0b" : "#10b981";
      ctx.fillRect(0, H - 6, W * usedPct, 6);
      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, [blocks, maxTokens]);
  return <canvas ref={cvRef} className="w-full rounded-lg" style={{ height: 120 }} />;
}

function fmtTokens(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }

interface Props { onClose?: () => void }

export function ContextWindowPage({ onClose }: Props) {
  const { state } = useStore();
  const [blocks, setBlocks] = useState<ContextBlock[]>(MOCK_BLOCKS);
  const [sortBy, setSortBy] = useState<"priority" | "tokens" | "type">("priority");
  const [filterType, setFilterType] = useState<string>("all");

  const totalUsed = blocks.reduce((s, b) => s + b.tokens, 0);
  const pct = totalUsed / MAX_TOKENS;

  const remove = (id: string) => setBlocks(b => b.filter(x => x.id !== id));
  const togglePin = (id: string) => setBlocks(b => b.map(x => x.id === id ? { ...x, pinned: !x.pinned } : x));
  const pruneSmall = () => setBlocks(b => b.filter(x => x.pinned || x.tokens > 50 || x.priority >= 7));

  const sorted = [...blocks]
    .filter(b => filterType === "all" || b.type === filterType)
    .sort((a, b) => sortBy === "priority" ? b.priority - a.priority : sortBy === "tokens" ? b.tokens - a.tokens : a.type.localeCompare(b.type));

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 20%,rgba(6,182,212,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center"><Layers className="w-5 h-5 text-cyan-400" /></div>
          <div><h2 className="text-base font-bold text-white">نافذة السياق — 3D</h2><p className="text-xs text-zinc-600">{fmtTokens(totalUsed)} / {fmtTokens(MAX_TOKENS)} توكن · {Math.round(pct * 100)}% مستخدم</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={pruneSmall} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-cyan-400 border border-white/6 hover:border-cyan-500/20 transition-all">
            <Trash2 className="w-3.5 h-3.5" />تنظيف
          </button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {/* Token Map */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-cyan-400" />خريطة التوكن — 3D Pixel Map</p>
          <TokenMap blocks={blocks} maxTokens={MAX_TOKENS} />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TYPE_COLORS).map(([t, c]) => (
                <span key={t} className="flex items-center gap-1 text-[9px] text-zinc-600">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c }} />{TYPE_LABELS[t]}
                </span>
              ))}
            </div>
            <span className="text-[10px] font-bold" style={{ color: pct > 0.8 ? "#ef4444" : pct > 0.6 ? "#f59e0b" : "#10b981" }}>{Math.round(pct * 100)}%</span>
          </div>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {(["all", ...Object.keys(TYPE_LABELS)] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${filterType === t ? "bg-cyan-500/20 border border-cyan-500/25 text-cyan-400" : "text-zinc-600 hover:text-zinc-400"}`}>
                {t === "all" ? "الكل" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mr-auto">
            {(["priority", "tokens", "type"] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${sortBy === s ? "bg-white/10 text-zinc-300" : "text-zinc-600"}`}>
                {s === "priority" ? "الأولوية" : s === "tokens" ? "التوكن" : "النوع"}
              </button>
            ))}
          </div>
        </div>
        {/* Blocks list */}
        <div className="space-y-2">
          {sorted.map((block, i) => {
            const Icon = TYPE_ICONS[block.type] || FileText;
            return (
              <motion.div key={block.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-3.5 rounded-xl border group" style={{ background: `${block.color}08`, borderColor: `${block.color}20` }}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${block.color}20` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: block.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${block.color}25`, color: block.color }}>{TYPE_LABELS[block.type]}</span>
                      <span className="text-[10px] text-zinc-600">{fmtTokens(block.tokens)} توكن</span>
                      {block.pinned && <span className="text-[10px] text-amber-400">📌 مثبت</span>}
                      <span className="text-[10px] text-zinc-700 mr-auto">أولوية: {block.priority}/10</span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{block.content}</p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => togglePin(block.id)} className="w-5 h-5 flex items-center justify-center text-zinc-700 hover:text-amber-400 transition-colors text-[10px]">{block.pinned ? "📌" : "📎"}</button>
                    {!block.pinned && <button onClick={() => remove(block.id)} className="w-5 h-5 flex items-center justify-center text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>}
                  </div>
                </div>
                {/* Token bar */}
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(block.tokens / totalUsed) * 100}%`, backgroundColor: block.color, opacity: 0.6 }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
