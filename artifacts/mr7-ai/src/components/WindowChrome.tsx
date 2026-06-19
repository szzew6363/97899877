/**
 * WindowChrome — zero-modification modal enhancer.
 *
 * Wraps any modal component and injects:
 *   • A floating 3D minimize button (fixed top-right, portal-rendered)
 *   • A draggable minimized title-bar (portal-rendered when collapsed)
 *   • display:none on children when minimized (hides fixed-position descendants too)
 *
 * Usage in App.tsx:
 *   <WindowChrome open={modals.agent} color="#ff4d4d" title="KALI AGENT" icon={…} onClose={…}>
 *     <AgentModal … />
 *   </WindowChrome>
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

// ── Grip strip ─────────────────────────────────────────────────────────────
function GripRow({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-[3px] select-none cursor-grab">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="w-[3px] h-[3px] rounded-full"
          style={{ background: color, opacity: 0.35 + (i % 2) * 0.3, boxShadow: `0 0 4px ${color}80` }} />
      ))}
    </div>
  );
}

// ── Scan shimmer line ──────────────────────────────────────────────────────
function ScanLine({ color }: { color: string }) {
  return (
    <motion.div className="absolute inset-x-0 h-[1px] pointer-events-none"
      style={{ background: `linear-gradient(90deg,transparent,${color}aa,rgba(255,255,255,0.3),${color}aa,transparent)` }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />
  );
}

// ── Minimized floating bar ─────────────────────────────────────────────────
interface MinBarProps {
  color: string;
  title: string;
  icon?: React.ReactNode;
  onRestore: () => void;
  onClose: () => void;
}

function MinBar({ color, title, icon, onRestore, onClose }: MinBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const offRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState(() => ({
    x: Math.max(20, window.innerWidth / 2 - 160),
    y: 16,
  }));

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const el = barRef.current; if (!el) return;
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
      const el2 = barRef.current; if (!el2) return;
      const nx = Math.max(0, Math.min(window.innerWidth - el2.offsetWidth - 4, ev.clientX - offRef.current.x));
      const ny = Math.max(0, Math.min(window.innerHeight - 48, ev.clientY - offRef.current.y));
      setPos({ x: nx, y: ny });
    };
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseup",   up);
  }, []);

  return (
    <motion.div
      ref={barRef}
      style={{
        position: "fixed", left: pos.x, top: pos.y, zIndex: 9999,
        background: "linear-gradient(135deg,rgba(4,2,12,0.99) 0%,rgba(2,1,8,0.99) 100%)",
        border: `1px solid ${color}50`,
        boxShadow: `0 0 40px ${color}25,0 8px 32px rgba(0,0,0,0.92),inset 0 1px 0 ${color}20`,
        backdropFilter: "blur(30px)",
      }}
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onMouseDown={onMouseDown}
      className="rounded-2xl overflow-hidden select-none"
    >
      {/* Top glow line */}
      <div className="h-[2px]"
        style={{ background: `linear-gradient(90deg,transparent,${color},rgba(255,255,255,0.3),${color},transparent)` }} />

      <ScanLine color={color} />

      <div className="flex items-center gap-3 px-4 py-3.5" style={{ minWidth: 240 }}>
        <GripRow color={color} />

        {icon && (
          <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}40`, boxShadow: `0 0 12px ${color}20` }}
            animate={{ boxShadow: [`0 0 8px ${color}15`, `0 0 20px ${color}40`, `0 0 8px ${color}15`] }}
            transition={{ duration: 2.2, repeat: Infinity }}>
            {icon}
          </motion.div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-black tracking-wider truncate"
            style={{ color: "rgba(255,255,255,0.92)", textShadow: `0 0 12px ${color}60` }}>
            {title}
          </div>
          <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>MINIMIZED</div>
        </div>

        {/* Live pulse */}
        <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.6, repeat: Infinity }} />

        {/* Restore */}
        <motion.button
          onClick={e => { e.stopPropagation(); onRestore(); }}
          className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] cursor-pointer"
          style={{ background: `rgba(255,193,7,0.10)`, border: `1px solid rgba(255,193,7,0.32)`, color: `rgba(255,193,7,0.85)` }}
          whileHover={{ background: "rgba(255,193,7,0.22)", scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          title="استعادة"
        >▣</motion.button>

        {/* Close */}
        <motion.button
          onClick={e => { e.stopPropagation(); onClose(); }}
          className="w-7 h-7 rounded-xl flex items-center justify-center text-[13px] cursor-pointer"
          style={{ background: "rgba(255,50,50,0.08)", border: "1px solid rgba(255,50,50,0.28)", color: "rgba(255,80,80,0.75)" }}
          whileHover={{ background: "rgba(255,50,50,0.24)", color: "#ff4444", scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          title="إغلاق"
        >✕</motion.button>
      </div>
    </motion.div>
  );
}

// ── Minimize FAB (shown over open full-screen modal) ───────────────────────
interface MinFABProps {
  color: string;
  onMinimize: () => void;
}
function MinFAB({ color, onMinimize }: MinFABProps) {
  return (
    <motion.div
      style={{ position: "fixed", top: 14, right: 60, zIndex: 9998 }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.18 }}
    >
      <motion.button
        onClick={onMinimize}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer relative overflow-hidden"
        style={{
          background: `rgba(255,193,7,0.08)`,
          border: `1px solid rgba(255,193,7,0.30)`,
          color: `rgba(255,193,7,0.8)`,
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
        }}
        whileHover={{ background: "rgba(255,193,7,0.20)", scale: 1.06, boxShadow: "0 4px 24px rgba(255,193,7,0.2)" }}
        whileTap={{ scale: 0.93 }}
        title="تصغير النافذة"
      >
        <span className="text-[10px] font-black leading-none">─</span>
        <span className="text-[8px] font-black tracking-widest" style={{ color: "rgba(255,193,7,0.9)" }}>MIN</span>
        {/* Shimmer */}
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,193,7,0.15),transparent)" }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />
      </motion.button>
    </motion.div>
  );
}

// ── Main WindowChrome ──────────────────────────────────────────────────────
interface WindowChromeProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  color?: string;
  title?: string;
  icon?: React.ReactNode;
}

export function WindowChrome({
  open, onClose, children,
  color = "#e21227",
  title = "WINDOW",
  icon,
}: WindowChromeProps) {
  const [minimized, setMinimized] = useState(false);

  // Reset minimized when modal closes
  useEffect(() => { if (!open) setMinimized(false); }, [open]);

  return (
    <>
      {/* Modal content — hidden (not destroyed) when minimized */}
      <div style={{ display: minimized ? "none" : undefined }}>
        {children}
      </div>

      {/* Portal overlays */}
      {createPortal(
        <AnimatePresence>
          {open && !minimized && (
            <MinFAB key="fab" color={color} onMinimize={() => setMinimized(true)} />
          )}
          {open && minimized && (
            <MinBar
              key="minbar"
              color={color}
              title={title}
              icon={icon}
              onRestore={() => setMinimized(false)}
              onClose={onClose}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
