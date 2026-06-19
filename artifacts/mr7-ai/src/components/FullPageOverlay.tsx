import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

// ── Live HUD Canvas ────────────────────────────────────────────────────────────
function OverlayHUDCanvas({ color }: { color: string }) {
  const ref  = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true, desynchronized: true })!;
    const hex = color.replace("#", "").padEnd(6, "0");
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    const DPR = Math.min(window.devicePixelRatio||1, 2);
    let W = 0, H = 0;

    function resize() {
      W = cv!.width  = cv!.offsetWidth  * DPR;
      H = cv!.height = cv!.offsetHeight * DPR;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const nodes = Array.from({ length: 12 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random()-0.5)*0.0003, vy: (Math.random()-0.5)*0.0002,
      phase: Math.random()*Math.PI*2,
    }));

    let t = 0, last = 0;
    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (ts - last < 32) return; // ~30fps cap
      last = ts; t += 0.016;
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);

      // Perspective grid
      ctx.save();
      ctx.setLineDash([2*DPR, 14*DPR]);
      ctx.lineWidth = 0.5;
      const vpX = W*0.5, vpY = H*2;
      for (let i = -4; i <= 8; i++) {
        const x0 = W*(i/4);
        const fade = 1 - Math.abs(i-2)/8;
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(vpX, vpY);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.04*fade})`; ctx.stroke();
      }
      // Horizontal lines
      for (let j = 1; j <= 8; j++) {
        const yy = H * (j/8);
        const fade = 1 - Math.abs(j-4)/5;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.025*fade})`; ctx.stroke();
      }
      ctx.setLineDash([]); ctx.restore();

      // Scan shimmer
      const scanY = ((t*0.18)%1)*H;
      const sg = ctx.createLinearGradient(0, scanY-20, 0, scanY+20);
      sg.addColorStop(0, `rgba(${r},${g},${b},0)`);
      sg.addColorStop(0.5, `rgba(${r},${g},${b},0.07)`);
      sg.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = sg; ctx.fillRect(0, scanY-20, W, 40);

      // Nodes + connections
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x<0) n.x+=1; if (n.x>1) n.x-=1;
        if (n.y<0) n.y+=1; if (n.y>1) n.y-=1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const dx = (nodes[i].x-nodes[j].x)*W;
          const dy = (nodes[i].y-nodes[j].y)*H;
          const d  = Math.sqrt(dx*dx+dy*dy);
          if (d < W*0.22) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x*W, nodes[i].y*H);
            ctx.lineTo(nodes[j].x*W, nodes[j].y*H);
            ctx.strokeStyle = `rgba(${r},${g},${b},${(1-d/(W*0.22))*0.09})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      nodes.forEach(n => {
        const pulse = (Math.sin(t*2.4+n.phase)+1)*0.5;
        ctx.beginPath();
        ctx.arc(n.x*W, n.y*H, (1.2+pulse*0.8)*DPR, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.15+pulse*0.45})`;
        ctx.fill();
      });

      // Corner glow brackets
      const bs = 18*DPR, bw = 1.8*DPR;
      const bA = 0.65 + Math.sin(t*2.2)*0.15;
      ctx.strokeStyle = `rgba(${r},${g},${b},${bA})`; ctx.lineWidth = bw;
      ctx.beginPath(); ctx.moveTo(0,bs); ctx.lineTo(0,0); ctx.lineTo(bs,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-bs,0); ctx.lineTo(W,0); ctx.lineTo(W,bs); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,H-bs); ctx.lineTo(0,H); ctx.lineTo(bs,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-bs,H); ctx.lineTo(W,H); ctx.lineTo(W,H-bs); ctx.stroke();

      // Side edge glows
      const gA = 0.10 + Math.sin(t*1.6)*0.04;
      const lgL = ctx.createLinearGradient(0,0,24*DPR,0);
      lgL.addColorStop(0,`rgba(${r},${g},${b},${gA})`); lgL.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=lgL; ctx.fillRect(0,0,24*DPR,H);
      const lgR = ctx.createLinearGradient(W,0,W-24*DPR,0);
      lgR.addColorStop(0,`rgba(${r},${g},${b},${gA})`); lgR.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=lgR; ctx.fillRect(W-24*DPR,0,24*DPR,H);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [color]);

  return (
    <canvas ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.9 }} />
  );
}

// ── Grip Dots ─────────────────────────────────────────────────────────────────
function GripDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-[3px] cursor-grab select-none">
      {Array.from({length:8}).map((_,i) => (
        <div key={i} className="w-[3px] h-[3px] rounded-full transition-all duration-300"
          style={{ background: color, opacity: 0.4 + (i%2)*0.3, boxShadow: `0 0 4px ${color}` }} />
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface FullPageOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}

// ── Main Component ────────────────────────────────────────────────────────────
export function FullPageOverlay({
  open, onClose, children, className = "",
  title = "WINDOW", subtitle, color = "#e21227", icon,
}: FullPageOverlayProps) {
  const [minimized, setMinimized] = useState(false);
  const [dragPos, setDragPos] = useState(() => ({
    x: Math.max(20, window.innerWidth/2 - 160),
    y: 16,
  }));
  const barRef  = useRef<HTMLDivElement>(null);
  const offRef  = useRef({ x: 0, y: 0 });

  // Reset minimized on close
  useEffect(() => { if (!open) setMinimized(false); }, [open]);

  // Escape key
  useEffect(() => {
    if (!open || minimized) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, minimized, onClose]);

  // Drag handler for minimized bar
  const onBarMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    offRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const move = (ev: MouseEvent) => {
      if (!el) return;
      const nx = Math.max(0, Math.min(window.innerWidth - el.offsetWidth - 4, ev.clientX - offRef.current.x));
      const ny = Math.max(0, Math.min(window.innerHeight - 48, ev.clientY - offRef.current.y));
      el.style.left = `${nx}px`;
      el.style.top  = `${ny}px`;
    };
    const up = (ev: MouseEvent) => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup",   up);
      const el2 = barRef.current;
      if (!el2) return;
      const nx = Math.max(0, Math.min(window.innerWidth - el2.offsetWidth - 4, ev.clientX - offRef.current.x));
      const ny = Math.max(0, Math.min(window.innerHeight - 48, ev.clientY - offRef.current.y));
      setDragPos({ x: nx, y: ny });
    };
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseup",   up);
  }, []);

  const hexColor = color.startsWith("#") ? color : "#e21227";

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        minimized ? (
          // ── Minimized floating bar ──────────────────────────────────────────
          <motion.div
            key="min-bar"
            ref={barRef}
            style={{
              position:"fixed", left:dragPos.x, top:dragPos.y, zIndex:9999, cursor:"grab",
              background:"linear-gradient(135deg,rgba(4,2,12,0.98) 0%,rgba(2,1,8,0.98) 100%)",
              border:`1px solid ${hexColor}50`,
              boxShadow:`0 0 40px ${hexColor}25, 0 8px 32px rgba(0,0,0,0.9), inset 0 1px 0 ${hexColor}20`,
              backdropFilter:"blur(24px)",
            }}
            initial={{ opacity:0, scale:0.85, y:-10 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.85 }}
            transition={{ duration:0.22, ease:[0.16,1,0.3,1] }}
            onMouseDown={onBarMouseDown}
            className="rounded-2xl overflow-hidden select-none"
          >
            {/* Top glow line */}
            <div className="h-[2px] w-full" style={{ background:`linear-gradient(90deg,transparent,${hexColor},rgba(255,255,255,0.3),${hexColor},transparent)` }} />
            {/* Bar content */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ minWidth:240 }}>
              {/* Grip */}
              <GripDots color={hexColor} />
              {/* Icon */}
              {icon && (
                <motion.div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:`${hexColor}18`, border:`1px solid ${hexColor}40` }}
                  animate={{ boxShadow:[`0 0 8px ${hexColor}15`,`0 0 18px ${hexColor}40`,`0 0 8px ${hexColor}15`] }}
                  transition={{ duration:2, repeat:Infinity }}>
                  {icon}
                </motion.div>
              )}
              {/* Title */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-black tracking-wider truncate" style={{ color:"rgba(255,255,255,0.92)", textShadow:`0 0 12px ${hexColor}60` }}>{title}</div>
                {subtitle && <div className="text-[8px] font-mono truncate" style={{ color:"rgba(255,255,255,0.3)" }}>{subtitle}</div>}
              </div>
              {/* Live pulse */}
              <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background:hexColor, boxShadow:`0 0 8px ${hexColor}` }}
                animate={{ opacity:[0.4,1,0.4], scale:[0.8,1.2,0.8] }}
                transition={{ duration:1.6, repeat:Infinity }} />
              {/* Restore button */}
              <motion.button
                onClick={e => { e.stopPropagation(); setMinimized(false); }}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-[9px] font-black cursor-pointer"
                style={{ background:`${hexColor}14`, border:`1px solid ${hexColor}35`, color:hexColor }}
                whileHover={{ background:`${hexColor}28`, scale:1.1 }}
                whileTap={{ scale:0.9 }}
                title="استعادة"
              >▣</motion.button>
              {/* Close button */}
              <motion.button
                onClick={e => { e.stopPropagation(); onClose(); }}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-[13px] cursor-pointer"
                style={{ background:"rgba(255,50,50,0.08)", border:"1px solid rgba(255,50,50,0.25)", color:"rgba(255,80,80,0.7)" }}
                whileHover={{ background:"rgba(255,50,50,0.22)", color:"#ff4444", scale:1.1 }}
                whileTap={{ scale:0.9 }}
                title="إغلاق"
              >✕</motion.button>
            </div>
          </motion.div>
        ) : (
          // ── Full-screen overlay ─────────────────────────────────────────────
          <motion.div
            key="full-overlay"
            className={`fixed inset-0 flex flex-col overflow-hidden ${className}`}
            style={{ background:"#080808", zIndex:9990 }}
            initial={{ opacity:0, scale:0.97, y:16 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.97, y:16 }}
            transition={{ duration:0.26, ease:[0.16,1,0.3,1] }}
          >
            {/* Live HUD canvas */}
            <OverlayHUDCanvas color={hexColor} />

            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-[2px] pointer-events-none z-10"
              style={{ background:`linear-gradient(90deg,transparent,${hexColor},rgba(255,255,255,0.35),${hexColor},transparent)` }} />

            {/* Floating control cluster — top-right z-50 */}
            <div className="absolute top-3.5 right-4 z-50 flex items-center gap-1.5 pointer-events-auto">
              {/* Minimize */}
              <motion.button
                onClick={() => setMinimized(true)}
                className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl cursor-pointer relative overflow-hidden"
                style={{
                  background:`rgba(255,193,7,0.08)`,
                  border:`1px solid rgba(255,193,7,0.25)`,
                  color:`rgba(255,193,7,0.7)`,
                }}
                whileHover={{ background:"rgba(255,193,7,0.18)", scale:1.05 }}
                whileTap={{ scale:0.93 }}
                title="تصغير"
              >
                <span className="text-[9px] font-black leading-none">─</span>
                <span className="text-[8px] font-black tracking-widest hidden group-hover:inline" style={{ color:"rgba(255,193,7,0.9)" }}>MIN</span>
              </motion.button>
            </div>

            {/* Bottom scan line */}
            <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none z-10"
              style={{ background:`linear-gradient(90deg,transparent,${hexColor}60,transparent)` }} />

            {/* Modal content — relative z-10 so it renders above canvas */}
            <div className="relative flex flex-col flex-1 overflow-hidden z-10">
              {children}
            </div>
          </motion.div>
        )
      )}
    </AnimatePresence>,
    document.body
  );
}
