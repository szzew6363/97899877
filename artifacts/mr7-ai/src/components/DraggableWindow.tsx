import { useRef, useState, useCallback, useEffect, useContext, createContext, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Window Manager Context ────────────────────────────────────────────────────
interface WindowManagerCtx {
  bringToFront: (id: string) => number;
  BASE_Z: number;
}
const WindowManagerContext = createContext<WindowManagerCtx>({
  bringToFront: () => 9990,
  BASE_Z: 9990,
});

let _wm: { counters: Map<string, number>; top: number } = { counters: new Map(), top: 9990 };

export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  const bringToFront = useCallback((id: string) => {
    _wm.top += 1;
    _wm.counters.set(id, _wm.top);
    return _wm.top;
  }, []);
  const ctx = useMemo(() => ({ bringToFront, BASE_Z: 9990 }), [bringToFront]);
  return <WindowManagerContext.Provider value={ctx}>{children}</WindowManagerContext.Provider>;
}

// ── Resize cursors ─────────────────────────────────────────────────────────────
type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null;
const EDGE_CURSORS: Record<string, string> = {
  n: "n-resize", s: "s-resize", e: "e-resize", w: "w-resize",
  ne: "ne-resize", nw: "nw-resize", se: "se-resize", sw: "sw-resize",
};

// ── 3D HUD Canvas ─────────────────────────────────────────────────────────────
function WindowHUDCanvas({ color, active }: { color: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true, desynchronized: true })!;
    if (!ctx) return;
    const hex = color.replace("#", "").padEnd(6,"0");
    const r = parseInt(hex.slice(0,2), 16);
    const g = parseInt(hex.slice(2,4), 16);
    const b = parseInt(hex.slice(4,6), 16);
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    function resize() {
      W = cv!.width  = cv!.offsetWidth  * DPR;
      H = cv!.height = cv!.offsetHeight * DPR;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const nodes = Array.from({ length: 10 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0003,
      phase: Math.random() * Math.PI * 2,
    }));

    let lastTime = 0;
    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (ts - lastTime < 33) return;
      lastTime = ts;
      if (!W || !H) return;
      tRef.current += 0.018;
      const t = tRef.current;
      const a = activeRef.current;

      ctx.clearRect(0, 0, W, H);

      // Perspective grid
      const gridA = a ? 0.055 : 0.025;
      ctx.save();
      ctx.setLineDash([2 * DPR, 10 * DPR]);
      ctx.lineWidth = 0.4;
      const vpX = W * 0.5, vpY = H * 1.8;
      for (let i = -3; i <= 7; i++) {
        const x0 = W * (i / 4);
        const fade = 1 - Math.abs(i - 2) / 6;
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(vpX, vpY);
        ctx.strokeStyle = `rgba(${r},${g},${b},${gridA * fade})`; ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Horizontal scan shimmer
      const scanY = ((t * 0.28) % 1) * H;
      const sg = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12);
      sg.addColorStop(0, `rgba(${r},${g},${b},0)`);
      sg.addColorStop(0.5, `rgba(${r},${g},${b},${a ? 0.09 : 0.04})`);
      sg.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 12, W, 24);

      // Nodes + connections
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x += 1; if (n.x > 1) n.x -= 1;
        if (n.y < 0) n.y += 1; if (n.y > 1) n.y -= 1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W;
          const dy = (nodes[i].y - nodes[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < W * 0.2) {
            const fade = (1 - dist / (W * 0.2)) * (a ? 0.11 : 0.05);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * W, nodes[i].y * H);
            ctx.lineTo(nodes[j].x * W, nodes[j].y * H);
            ctx.strokeStyle = `rgba(${r},${g},${b},${fade})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      nodes.forEach(n => {
        const pulse = (Math.sin(t * 2.2 + n.phase) + 1) * 0.5;
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, (1.2 + pulse * 0.8) * DPR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${(0.18 + pulse * 0.55) * (a ? 1 : 0.45)})`;
        ctx.fill();
      });

      // Corner brackets
      const bs = 14 * DPR, bw = 1.5 * DPR;
      const bA = a ? 0.8 + (Math.sin(t * 2) + 1) * 0.1 : 0.4;
      ctx.strokeStyle = `rgba(${r},${g},${b},${bA})`; ctx.lineWidth = bw;
      ctx.beginPath(); ctx.moveTo(0, bs); ctx.lineTo(0, 0); ctx.lineTo(bs, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - bs, 0); ctx.lineTo(W, 0); ctx.lineTo(W, bs); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H - bs); ctx.lineTo(0, H); ctx.lineTo(bs, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - bs, H); ctx.lineTo(W, H); ctx.lineTo(W, H - bs); ctx.stroke();

      // Side glow
      if (a) {
        const gA = 0.12 + (Math.sin(t * 1.8) + 1) * 0.04;
        const lgL = ctx.createLinearGradient(0, 0, 32 * DPR, 0);
        lgL.addColorStop(0, `rgba(${r},${g},${b},${gA})`); lgL.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = lgL; ctx.fillRect(0, 0, 32 * DPR, H);
        const lgR = ctx.createLinearGradient(W, 0, W - 32 * DPR, 0);
        lgR.addColorStop(0, `rgba(${r},${g},${b},${gA})`); lgR.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = lgR; ctx.fillRect(W - 32 * DPR, 0, 32 * DPR, H);
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [color]);

  return (
    <canvas ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9, transform: "translateZ(0)", zIndex: 0 }} />
  );
}

// ── Grip dots ─────────────────────────────────────────────────────────────────
function GripDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-[3px] select-none flex-shrink-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-[3px] h-[3px] rounded-full"
          style={{ background: color, opacity: 0.35 + (i % 2) * 0.3, boxShadow: `0 0 4px ${color}80` }} />
      ))}
    </div>
  );
}

// ── Main DraggableWindow ──────────────────────────────────────────────────────
export interface DraggableWindowProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  color?: string;
  width?: number;
  defaultPos?: { x: number; y: number };
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
  minWidth?: number;
  statusDot?: string;
  maxWidth?: number;
  id?: string;
  /** Start maximized (full-screen). Default: true */
  defaultMaximized?: boolean;
}

export function DraggableWindow({
  open, onClose, title, subtitle, color = "#00e5ff",
  width = 640, defaultPos, children, icon, badge, statusDot,
  minWidth = 360, maxWidth, id,
  defaultMaximized = true,
}: DraggableWindowProps) {
  const wid = useRef(id ?? `win-${Math.random().toString(36).slice(2)}`).current;
  const { bringToFront, BASE_Z } = useContext(WindowManagerContext);

  const [pos, setPos] = useState(() => ({
    x: defaultPos?.x ?? Math.max(40, (window.innerWidth - width) / 2),
    y: defaultPos?.y ?? 80,
  }));
  const [size, setSize] = useState({ w: width, h: -1 });
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(defaultMaximized);
  const [active, setActive] = useState(true);
  const [zIndex, setZIndex] = useState(BASE_Z);

  const dragging   = useRef(false);
  const resizing   = useRef<ResizeEdge>(null);
  const dragStart  = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart= useRef({ mx: 0, my: 0, px: 0, py: 0, w: 0, h: 0 });
  const windowRef  = useRef<HTMLDivElement>(null);
  const savedRect  = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (open) setZIndex(bringToFront(wid));
  }, [open, bringToFront, wid]);

  // Re-apply defaultMaximized when modal opens fresh
  useEffect(() => {
    if (open) setMaximized(defaultMaximized);
  }, [open]); // eslint-disable-line

  const handleWindowClick = useCallback(() => {
    setActive(true);
    setZIndex(bringToFront(wid));
  }, [bringToFront, wid]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (maximized) return;
    e.preventDefault();
    dragging.current = true;
    const el = windowRef.current;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    setZIndex(bringToFront(wid));
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !el) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      const nx = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, dragStart.current.px + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 48, dragStart.current.py + dy));
      el.style.left = nx + "px";
      el.style.top  = ny + "px";
    };
    const onUp = (ev: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - (windowRef.current?.offsetWidth ?? width), dragStart.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 48, dragStart.current.py + dy)),
      });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseup", onUp);
  }, [pos, width, maximized, bringToFront, wid]);

  // ── Resize ────────────────────────────────────────────────────────────────
  const onResizeMouseDown = useCallback((edge: ResizeEdge) => (e: React.MouseEvent) => {
    if (maximized || minimized) return;
    e.preventDefault(); e.stopPropagation();
    resizing.current = edge;
    const el = windowRef.current;
    resizeStart.current = {
      mx: e.clientX, my: e.clientY,
      px: pos.x, py: pos.y,
      w: el?.offsetWidth ?? size.w,
      h: el?.offsetHeight ?? 400,
    };

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current || !el) return;
      const dx = ev.clientX - resizeStart.current.mx;
      const dy = ev.clientY - resizeStart.current.my;
      const edge2 = resizing.current;
      let nx = resizeStart.current.px, ny = resizeStart.current.py;
      let nw = resizeStart.current.w,  nh = resizeStart.current.h;
      if (edge2.includes("e")) nw = Math.max(minWidth, nw + dx);
      if (edge2.includes("s")) nh = Math.max(200, nh + dy);
      if (edge2.includes("w")) { nw = Math.max(minWidth, nw - dx); nx = resizeStart.current.px + (resizeStart.current.w - nw); }
      if (edge2.includes("n")) { nh = Math.max(200, nh - dy);     ny = resizeStart.current.py + (resizeStart.current.h - nh); }
      if (maxWidth) nw = Math.min(maxWidth, nw);
      el.style.left = nx+"px"; el.style.top = ny+"px";
      el.style.width = nw+"px"; el.style.height = nh+"px";
    };
    const onUp = () => {
      if (!resizing.current) return;
      resizing.current = null;
      const el2 = windowRef.current;
      if (el2) {
        setPos({ x: el2.offsetLeft, y: el2.offsetTop });
        setSize({ w: el2.offsetWidth, h: el2.offsetHeight });
      }
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseup", onUp);
  }, [pos, size, minWidth, maxWidth, maximized, minimized]);

  // ── Maximize toggle ────────────────────────────────────────────────────────
  const toggleMaximize = useCallback(() => {
    if (!maximized) {
      const el = windowRef.current;
      savedRect.current = { x: pos.x, y: pos.y, w: el?.offsetWidth ?? size.w, h: el?.offsetHeight ?? 600 };
      setMaximized(true);
    } else {
      setMaximized(false);
      if (savedRect.current) {
        setPos({ x: savedRect.current.x, y: savedRect.current.y });
        setSize({ w: savedRect.current.w, h: savedRect.current.h });
      } else {
        setPos({ x: 40, y: 80 });
        setSize({ w: width, h: -1 });
      }
    }
  }, [maximized, pos, size, width]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const hexColor = color.startsWith("#") ? color : "#00e5ff";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={windowRef}
          onClick={handleWindowClick}
          initial={{ opacity: 0, scale: maximized ? 1 : 0.88, y: -20, rotateX: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -16, rotateX: 6 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            left:   maximized ? 0   : pos.x,
            top:    maximized ? 0   : pos.y,
            width:  maximized ? "100vw" : size.w,
            height: minimized ? "auto" : maximized ? "100vh" : (size.h > 0 ? size.h : undefined),
            maxHeight: minimized ? "auto" : maximized ? "100vh" : "94vh",
            zIndex,
            background: `linear-gradient(160deg,rgba(4,2,12,0.97) 0%,rgba(2,1,8,0.97) 50%,rgba(6,2,16,0.97) 100%)`,
            border: `1px solid ${hexColor}${active ? "55" : "28"}`,
            borderRadius: maximized ? 0 : 20,
            boxShadow: active
              ? `0 0 160px ${hexColor}22,0 0 60px ${hexColor}0c,0 40px 100px rgba(0,0,0,0.97),inset 0 1px 0 ${hexColor}22`
              : `0 0 60px ${hexColor}0a,0 24px 60px rgba(0,0,0,0.92),inset 0 1px 0 ${hexColor}10`,
            backdropFilter: "blur(60px) saturate(200%)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            transition: maximized ? "left 0.22s ease,top 0.22s ease,width 0.22s ease,height 0.22s ease" : undefined,
          }}
        >
          {/* 3D HUD canvas */}
          <WindowHUDCanvas color={hexColor} active={active} />

          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-[2px] z-10 pointer-events-none"
            style={{ background: `linear-gradient(90deg,transparent,${hexColor},rgba(255,255,255,0.3),${hexColor},transparent)` }} />

          {/* ── Title Bar ── */}
          <div
            className="relative flex items-center justify-between px-4 py-3.5 cursor-move select-none z-20 flex-shrink-0"
            style={{
              borderBottom: `1px solid ${hexColor}18`,
              background: `linear-gradient(90deg,${hexColor}08 0%,transparent 40%,transparent 60%,${hexColor}08 100%)`,
              minHeight: 52,
            }}
            onMouseDown={onTitleMouseDown}
            onDoubleClick={toggleMaximize}
          >
            {/* Left: grip + icon + title */}
            <div className="flex items-center gap-3 min-w-0">
              <GripDots color={hexColor} />
              {icon && (
                <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:`${hexColor}18`, border:`1px solid ${hexColor}35`, boxShadow:`0 0 12px ${hexColor}20` }}
                  animate={{ boxShadow:[`0 0 8px ${hexColor}15`,`0 0 20px ${hexColor}38`,`0 0 8px ${hexColor}15`] }}
                  transition={{ duration: 2.5, repeat: Infinity }}>
                  {icon}
                </motion.div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-black tracking-wide text-white truncate"
                    style={{ textShadow:`0 0 14px ${hexColor}60` }}>
                    {title}
                  </span>
                  {badge && (
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                      style={{ background:`${hexColor}18`, border:`1px solid ${hexColor}40`, color:hexColor, boxShadow:`0 0 8px ${hexColor}25` }}>
                      {badge}
                    </span>
                  )}
                  {statusDot && (
                    <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background:statusDot, boxShadow:`0 0 8px ${statusDot}` }}
                      animate={{ opacity:[0.5,1,0.5], scale:[0.9,1.1,0.9] }}
                      transition={{ duration:1.4, repeat:Infinity }} />
                  )}
                </div>
                {subtitle && (
                  <div className="text-[8px] font-mono mt-0.5 truncate" style={{ color:"rgba(255,255,255,0.28)" }}>
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Right: window controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              {/* Minimize */}
              <motion.button
                onClick={e => { e.stopPropagation(); setMinimized(m => !m); }}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black cursor-pointer relative overflow-hidden"
                style={{ background:"rgba(255,193,7,0.08)", border:"1px solid rgba(255,193,7,0.28)", color:"rgba(255,193,7,0.75)" }}
                whileHover={{ background:"rgba(255,193,7,0.22)", color:"#ffc107", scale:1.12 }}
                whileTap={{ scale:0.9 }}
                title="تصغير">
                <span style={{ lineHeight:1 }}>{minimized ? "▣" : "─"}</span>
              </motion.button>
              {/* Maximize */}
              <motion.button
                onClick={e => { e.stopPropagation(); toggleMaximize(); }}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-[9px] cursor-pointer"
                style={{ background:`${hexColor}08`, border:`1px solid ${hexColor}32`, color:`${hexColor}bb` }}
                whileHover={{ background:`${hexColor}22`, color:hexColor, scale:1.12 }}
                whileTap={{ scale:0.9 }}
                title={maximized ? "استعادة" : "تكبير"}>
                <span style={{ lineHeight:1 }}>{maximized ? "❐" : "⛶"}</span>
              </motion.button>
              {/* Close */}
              <motion.button
                onClick={e => { e.stopPropagation(); onClose(); }}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-[12px] cursor-pointer"
                style={{ background:"rgba(255,50,50,0.08)", border:"1px solid rgba(255,50,50,0.28)", color:"rgba(255,80,80,0.75)" }}
                whileHover={{ background:"rgba(255,50,50,0.24)", color:"#ff4444", borderColor:"rgba(255,50,50,0.6)", scale:1.12 }}
                whileTap={{ scale:0.9 }}
                title="إغلاق">
                ✕
              </motion.button>
            </div>
          </div>

          {/* ── Content ── */}
          <AnimatePresence>
            {!minimized && (
              <motion.div
                initial={{ height:0, opacity:0 }}
                animate={{ height:"auto", opacity:1 }}
                exit={{ height:0, opacity:0 }}
                transition={{ duration:0.22, ease:"easeOut" }}
                className="flex-1 overflow-hidden relative z-10"
                style={{ overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:`${hexColor}30 transparent` }}>
                <div className="p-4 h-full">
                  {children}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom stripe */}
          {!minimized && (
            <div className="h-px flex-shrink-0 z-10"
              style={{ background:`linear-gradient(90deg,transparent,${hexColor}60,transparent)` }} />
          )}

          {/* ── Resize handles (8 directions) ── */}
          {!maximized && !minimized && (
            <>
              {(["n","s","e","w"] as ResizeEdge[]).map(edge => (
                <div key={edge!} onMouseDown={onResizeMouseDown(edge)} style={{
                  position:"absolute", zIndex:30, cursor:EDGE_CURSORS[edge!],
                  ...(edge==="n"?{top:0,left:6,right:6,height:5}:
                      edge==="s"?{bottom:0,left:6,right:6,height:5}:
                      edge==="e"?{right:0,top:6,bottom:6,width:5}:
                                 {left:0,top:6,bottom:6,width:5}),
                }} />
              ))}
              {(["ne","nw","se","sw"] as ResizeEdge[]).map(corner => (
                <div key={corner!} onMouseDown={onResizeMouseDown(corner)} style={{
                  position:"absolute", zIndex:31, cursor:EDGE_CURSORS[corner!], width:14, height:14,
                  ...(corner==="ne"?{top:0,right:0}:
                      corner==="nw"?{top:0,left:0}:
                      corner==="se"?{bottom:0,right:0}:
                                    {bottom:0,left:0}),
                }} />
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
