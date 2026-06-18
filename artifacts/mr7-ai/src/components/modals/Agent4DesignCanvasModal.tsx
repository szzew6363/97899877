import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Square, Type, Image, Layout, AlignLeft, Grid3X3,
  Minus, Plus, Trash2, Copy, Download, Code2, Play,
  RotateCcw, Layers, MousePointer2, ChevronRight,
  Loader2, CheckCircle2, Eye, Sliders, Cpu, Zap,
  Monitor, Smartphone, Tablet, RefreshCw, Sparkles,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type ComponentType = "button" | "card" | "input" | "text" | "image" | "nav" | "flex" | "badge" | "table" | "divider";

type CanvasComponent = {
  id: string;
  type: ComponentType;
  x: number; y: number;
  w: number; h: number;
  label: string;
  props: Record<string, string>;
  color: string;
  selected: boolean;
};

const PALETTE: { type: ComponentType; label: string; icon: typeof Square; color: string; w: number; h: number }[] = [
  { type: "button",  label: "Button",  icon: Square,     color: "#e21227", w: 120, h: 44 },
  { type: "card",    label: "Card",    icon: Layout,     color: "#8b5cf6", w: 200, h: 150 },
  { type: "input",   label: "Input",   icon: AlignLeft,  color: "#06b6d4", w: 200, h: 44 },
  { type: "text",    label: "Text",    icon: Type,       color: "#f59e0b", w: 160, h: 40 },
  { type: "image",   label: "Image",   icon: Image,      color: "#10b981", w: 180, h: 120 },
  { type: "nav",     label: "Navbar",  icon: Minus,      color: "#f97316", w: 400, h: 60 },
  { type: "flex",    label: "Flex",    icon: Grid3X3,    color: "#a78bfa", w: 240, h: 100 },
  { type: "badge",   label: "Badge",   icon: Square,     color: "#ec4899", w: 80,  h: 32 },
  { type: "table",   label: "Table",   icon: Grid3X3,    color: "#0ea5e9", w: 300, h: 180 },
  { type: "divider", label: "Divider", icon: Minus,      color: "#64748b", w: 300, h: 4  },
];

function renderComponent(c: CanvasComponent) {
  const base = "absolute pointer-events-none select-none overflow-hidden";
  switch (c.type) {
    case "button": return (
      <div className={`${base} flex items-center justify-center rounded-lg font-bold text-sm text-white`}
        style={{ background: c.color, width: c.w, height: c.h }}>
        {c.label || "Button"}
      </div>
    );
    case "card": return (
      <div className={`${base} rounded-xl border p-3`}
        style={{ width: c.w, height: c.h, background: "#161616", borderColor: `${c.color}44` }}>
        <div className="text-xs font-bold mb-1" style={{ color: c.color }}>{c.label || "Card Title"}</div>
        <div className="text-[10px] text-slate-500">Card content area</div>
      </div>
    );
    case "input": return (
      <div className={`${base} rounded-lg border px-3 flex items-center`}
        style={{ width: c.w, height: c.h, background: "#0d0d0d", borderColor: "#333" }}>
        <span className="text-xs text-slate-600">{c.label || "Input placeholder..."}</span>
      </div>
    );
    case "text": return (
      <div className={`${base} flex items-center`} style={{ width: c.w, height: c.h }}>
        <span className="text-sm font-semibold text-white">{c.label || "Text Block"}</span>
      </div>
    );
    case "image": return (
      <div className={`${base} rounded-lg flex items-center justify-center`}
        style={{ width: c.w, height: c.h, background: `${c.color}18`, border: `1px dashed ${c.color}55` }}>
        <Image size={24} color={c.color} />
      </div>
    );
    case "nav": return (
      <div className={`${base} rounded-lg flex items-center gap-4 px-4`}
        style={{ width: c.w, height: c.h, background: "#111", border: `1px solid ${c.color}33` }}>
        <div className="text-xs font-black" style={{ color: c.color }}>{c.label || "LOGO"}</div>
        {["Home", "About", "Docs"].map(l => (
          <span key={l} className="text-[11px] text-slate-500">{l}</span>
        ))}
        <div className="ml-auto px-2 py-1 rounded text-[10px] font-bold text-white" style={{ background: c.color }}>
          Login
        </div>
      </div>
    );
    case "flex": return (
      <div className={`${base} rounded-lg flex items-center gap-2 p-2`}
        style={{ width: c.w, height: c.h, background: "#111", border: `1px solid ${c.color}33` }}>
        {[1,2,3].map(i => (
          <div key={i} className="flex-1 h-full rounded" style={{ background: `${c.color}22`, border: `1px solid ${c.color}33` }} />
        ))}
      </div>
    );
    case "badge": return (
      <div className={`${base} rounded-full flex items-center justify-center text-[11px] font-bold text-white px-2`}
        style={{ width: c.w, height: c.h, background: `${c.color}33`, border: `1px solid ${c.color}66` }}>
        <span style={{ color: c.color }}>{c.label || "Badge"}</span>
      </div>
    );
    case "table": return (
      <div className={`${base} rounded-lg overflow-hidden`}
        style={{ width: c.w, height: c.h, border: `1px solid ${c.color}33` }}>
        <div className="flex" style={{ background: `${c.color}22`, height: 32, borderBottom: `1px solid ${c.color}22` }}>
          {["Name","Value","Status"].map(h => (
            <div key={h} className="flex-1 flex items-center px-2 text-[10px] font-bold" style={{ color: c.color }}>{h}</div>
          ))}
        </div>
        {[1,2,3].map(r => (
          <div key={r} className="flex" style={{ height: (c.h - 32) / 3, borderBottom: "1px solid #1a1a1a" }}>
            {["Item","Value","Active"].map(d => (
              <div key={d} className="flex-1 flex items-center px-2 text-[10px] text-slate-600">{d}</div>
            ))}
          </div>
        ))}
      </div>
    );
    case "divider": return (
      <div className={`${base}`} style={{ width: c.w, height: 2, background: `${c.color}55` }} />
    );
    default: return null;
  }
}

function uid() { return Math.random().toString(36).slice(2,9); }

/* ─── Starfield BG ─────────────────────────────────────────────── */
function StarBG() {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = cv.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5, speed: 0.0002 + Math.random() * 0.0005,
      hue: 180 + Math.random() * 100,
    }));
    const resize = () => { W = canvas.offsetWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H; };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(s => {
        s.x = (s.x + s.speed) % 1;
        const x = s.x * W, y = s.y * H;
        const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4);
        g.addColorStop(0, `hsla(${s.hue},80%,70%,0.8)`);
        g.addColorStop(1, `hsla(${s.hue},80%,70%,0)`);
        ctx.beginPath(); ctx.arc(x, y, s.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={cv} className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" />;
}

export default function Agent4DesignCanvasModal({ open, onOpenChange }: Props) {
  const [components, setComponents] = useState<CanvasComponent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewport, setViewport] = useState<"desktop"|"tablet"|"mobile">("desktop");
  const [draggingNew, setDraggingNew] = useState<ComponentType | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedComp = components.find(c => c.id === selected);

  const viewportW = viewport === "desktop" ? 900 : viewport === "tablet" ? 600 : 375;

  const dropOnCanvas = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current || !draggingNew) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tmpl = PALETTE.find(p => p.type === draggingNew)!;
    const snapped = { x: Math.round((x - tmpl.w/2) / 20) * 20, y: Math.round((y - tmpl.h/2) / 20) * 20 };
    const comp: CanvasComponent = {
      id: uid(), type: draggingNew,
      x: Math.max(0, snapped.x), y: Math.max(0, snapped.y),
      w: tmpl.w, h: tmpl.h,
      label: tmpl.label, props: {},
      color: tmpl.color, selected: false,
    };
    setComponents(prev => prev.map(c => ({ ...c, selected: false })).concat({ ...comp, selected: true }));
    setSelected(comp.id);
    setDraggingNew(null);
  }, [draggingNew]);

  const startDragExisting = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const comp = components.find(c => c.id === id);
    if (!comp || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left - comp.x, y: e.clientY - rect.top - comp.y });
    setDraggingId(id);
    setSelected(id);
    setComponents(prev => prev.map(c => ({ ...c, selected: c.id === id })));
  }, [components]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const nx = Math.round((e.clientX - rect.left - dragOffset.x) / 20) * 20;
    const ny = Math.round((e.clientY - rect.top - dragOffset.y) / 20) * 20;
    setComponents(prev => prev.map(c => c.id === draggingId ? { ...c, x: Math.max(0, nx), y: Math.max(0, ny) } : c));
  }, [draggingId, dragOffset]);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    setComponents(prev => prev.filter(c => c.id !== selected));
    setSelected(null);
  }, [selected]);

  const generateCode = useCallback(async () => {
    if (components.length === 0) return;
    setIsGenerating(true);
    setShowCode(true);
    setGeneratedCode("");
    const layout = components.map(c => `${c.type}@(${c.x},${c.y}) size=${c.w}×${c.h} label="${c.label}" color="${c.color}"`).join("\n");
    const prompt = `Generate clean React + Tailwind CSS code for this UI layout:\n${layout}\n\nOutput only the JSX component code with proper styling. No imports needed. Make it look professional and modern.`;
    try {
      const res = await fetch("/api/agent4/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: prompt, mode: "turbo", language: "en" }),
      });
      const reader = res.body!.getReader();
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
              if (p.text) setGeneratedCode(prev => prev + p.text);
            } catch { /* skip */ }
          }
        }
      }
    } catch { setGeneratedCode("// Error generating code"); }
    setIsGenerating(false);
  }, [components]);

  const clearCanvas = () => { setComponents([]); setSelected(null); setGeneratedCode(""); setShowCode(false); };

  useEffect(() => { if (!open) { setDraggingId(null); setDraggingNew(null); } }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.95)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>
        <motion.div className="relative flex flex-col overflow-hidden"
          style={{
            width: "min(1500px, 98vw)", height: "min(920px, 96vh)",
            background: "linear-gradient(135deg,#060608 0%,#0a0a10 50%,#060608 100%)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 20,
            boxShadow: "0 0 80px rgba(139,92,246,0.1), inset 0 0 100px rgba(139,92,246,0.02)",
          }}
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}>
          <StarBG />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4">
              <motion.div className="relative w-12 h-12 flex items-center justify-center"
                animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                <div className="absolute inset-0 rounded-xl border border-purple-500/30" />
                <div className="absolute inset-1 rounded-lg border border-purple-400/20" />
                <MousePointer2 size={20} color="#a78bfa" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white tracking-widest">DESIGN</span>
                  <motion.span className="text-xl font-black tracking-widest"
                    style={{ color: "#a78bfa", textShadow: "0 0 20px #a78bfa" }}
                    animate={{ textShadow: ["0 0 10px #a78bfa88","0 0 30px #a78bfa","0 0 10px #a78bfa88"] }}
                    transition={{ duration: 2, repeat: Infinity }}>CANVAS</motion.span>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold border border-purple-500/30 text-purple-400 bg-purple-500/10">AGENT 4</div>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">سحب وإفلات · توليد كود React · واجهة بصرية</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Viewport Selector */}
              {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([vp, Icon]) => (
                <button key={vp} onClick={() => setViewport(vp)}
                  className="p-2 rounded-lg border transition-all"
                  style={viewport === vp
                    ? { borderColor: "#a78bfa55", background: "#a78bfa15", color: "#a78bfa" }
                    : { borderColor: "#222", background: "transparent", color: "#555" }}>
                  <Icon size={15} />
                </button>
              ))}
              <div className="w-px h-6 bg-[#2a2a2a] mx-1" />
              <button onClick={clearCanvas} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#222] text-slate-500 hover:text-white hover:border-[#333] text-xs transition-all">
                <RotateCcw size={12} />مسح
              </button>
              <motion.button onClick={generateCode} disabled={components.length === 0 || isGenerating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 transition-all"
                style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#a78bfa", boxShadow: "0 0 20px rgba(139,92,246,0.2)" }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {isGenerating ? <><Loader2 size={13} className="animate-spin" />توليد...</> : <><Code2 size={13} />توليد الكود</>}
              </motion.button>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-xl border border-[#2a2a2a] bg-[#111] text-slate-400 hover:text-white hover:border-red-500/50 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">

            {/* Left: Component Palette */}
            <div className="w-48 flex-shrink-0 border-r border-[#1a1a1a] flex flex-col p-3 gap-1 overflow-y-auto">
              <p className="text-[10px] text-slate-600 font-bold tracking-widest px-1 mb-2">المكونات</p>
              {PALETTE.map(p => (
                <motion.div key={p.type}
                  draggable
                  onDragStart={() => setDraggingNew(p.type)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-transparent cursor-grab active:cursor-grabbing hover:border-[#2a2a2a] hover:bg-[#111] transition-all"
                  whileHover={{ x: 3, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}>
                  <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: `${p.color}20` }}>
                    <p.icon size={12} color={p.color} />
                  </div>
                  <span className="text-xs text-slate-400">{p.label}</span>
                </motion.div>
              ))}
              <div className="mt-3 p-3 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
                <p className="text-[10px] text-slate-600 mb-2">تلميح</p>
                <p className="text-[10px] text-slate-700 leading-relaxed">اسحب المكوّن على اللوحة. اضغط عليه لتحريكه. اختره للتعديل.</p>
              </div>
            </div>

            {/* Center: Canvas */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1a1a1a] flex-shrink-0">
                <Layers size={12} color="#a78bfa" />
                <span className="text-[11px] text-slate-500">{components.length} مكوّن</span>
                <div className="text-[11px] text-slate-700">· {viewport} · {viewportW}px</div>
                {selected && (
                  <button onClick={deleteSelected} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all">
                    <Trash2 size={11} />حذف
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto relative bg-[#050505]"
                style={{ backgroundImage: "radial-gradient(circle, #1a1a2a 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
                <div className="relative mx-auto mt-6"
                  ref={canvasRef}
                  style={{ width: viewportW, minHeight: 600, background: "#0a0a0a", border: "1px solid #222", borderRadius: 12, transition: "width 0.3s ease" }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={dropOnCanvas}
                  onMouseMove={onMouseMove}
                  onMouseUp={() => setDraggingId(null)}
                  onMouseLeave={() => setDraggingId(null)}
                  onClick={() => { setSelected(null); setComponents(prev => prev.map(c => ({ ...c, selected: false }))); }}>

                  {/* Grid Lines */}
                  <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
                    <div style={{ width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  </div>

                  {components.map(c => (
                    <motion.div key={c.id}
                      className="absolute cursor-move"
                      style={{ left: c.x, top: c.y, width: c.w, height: Math.max(c.h, 2) }}
                      onMouseDown={e => startDragExisting(e, c.id)}
                      onClick={e => { e.stopPropagation(); setSelected(c.id); setComponents(prev => prev.map(x => ({ ...x, selected: x.id === c.id }))); }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                      {renderComponent(c)}
                      {c.selected && (
                        <div className="absolute inset-0 rounded-lg pointer-events-none"
                          style={{ border: `2px solid ${c.color}`, boxShadow: `0 0 12px ${c.color}55` }}>
                          {/* Resize handles */}
                          {["nw","ne","sw","se"].map(h => (
                            <div key={h} className="absolute w-3 h-3 rounded-full border-2 bg-white"
                              style={{
                                borderColor: c.color, boxShadow: `0 0 6px ${c.color}`,
                                top: h.startsWith("n") ? -5 : undefined, bottom: h.startsWith("s") ? -5 : undefined,
                                left: h.endsWith("w") ? -5 : undefined, right: h.endsWith("e") ? -5 : undefined,
                              }} />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {components.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                        <MousePointer2 size={40} color="#a78bfa44" />
                      </motion.div>
                      <p className="text-slate-700 text-sm">اسحب المكوّنات من اليسار هنا</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Properties + Code */}
            <div className="w-64 flex-shrink-0 border-l border-[#1a1a1a] flex flex-col overflow-hidden">
              {/* Properties */}
              <div className="flex-none border-b border-[#1a1a1a] p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Sliders size={12} color="#a78bfa" />
                  <span className="text-[11px] text-slate-500 font-bold tracking-widest">خصائص</span>
                </div>
                {selectedComp ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-600 block mb-1">النص / العنوان</label>
                      <input value={selectedComp.label} onChange={e => setComponents(prev => prev.map(c => c.id === selected ? { ...c, label: e.target.value } : c))}
                        className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 block mb-1">اللون</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={selectedComp.color}
                          onChange={e => setComponents(prev => prev.map(c => c.id === selected ? { ...c, color: e.target.value } : c))}
                          className="w-8 h-8 rounded-lg border border-[#333] bg-[#111] cursor-pointer" />
                        <span className="text-[11px] text-slate-500 font-mono">{selectedComp.color}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[["العرض", "w", selectedComp.w], ["الارتفاع", "h", selectedComp.h]].map(([lbl, key, val]) => (
                        <div key={key as string}>
                          <label className="text-[10px] text-slate-600 block mb-1">{lbl as string}</label>
                          <input type="number" value={val as number}
                            onChange={e => setComponents(prev => prev.map(c => c.id === selected ? { ...c, [key as string]: +e.target.value } : c))}
                            className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none" />
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-700 font-mono mt-1">
                      X:{selectedComp.x} Y:{selectedComp.y}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-700">اختر مكوّناً لتعديل خصائصه</p>
                )}
              </div>

              {/* Generated Code */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1a1a] flex-shrink-0">
                  <Code2 size={12} color="#10b981" />
                  <span className="text-[11px] text-slate-500 font-bold tracking-widest">الكود المُولَّد</span>
                  {generatedCode && (
                    <button onClick={() => { navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1">
                      <Copy size={10} />{copied ? "تم" : "نسخ"}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {isGenerating && (
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 size={11} className="animate-spin" color="#a78bfa" />
                      <span className="text-[10px] text-purple-400">يولّد الكود...</span>
                    </div>
                  )}
                  {generatedCode ? (
                    <pre className="text-[10px] text-green-300 font-mono leading-relaxed whitespace-pre-wrap break-all">{generatedCode}</pre>
                  ) : (
                    <p className="text-[10px] text-slate-700 leading-relaxed">اضغط "توليد الكود" بعد تصميم الواجهة لتحصل على كود React نظيف.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between px-5 py-2 border-t border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4 text-[10px] text-slate-700">
              <span>مكوّنات: {components.length}</span>
              <span>·</span>
              <span>سحب + إفلات</span>
              <span>·</span>
              <span>توليد React</span>
            </div>
            <motion.div className="text-[10px] text-slate-700"
              animate={{ opacity: [0.4,0.8,0.4] }} transition={{ duration: 3, repeat: Infinity }}>
              AGENT 4 · DESIGN CANVAS · 3D
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
