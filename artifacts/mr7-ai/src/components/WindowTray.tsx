/**
 * WindowTray — Bottom taskbar for minimized windows + always-visible shortcuts.
 * Renders as a fixed strip at the bottom of the viewport.
 * Each minimized WindowChrome notifies this tray via a shared event bus.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Activity, Server, ChevronUp, Monitor } from "lucide-react";

// ── Tray event bus ─────────────────────────────────────────────────────────
export type TrayEvent =
  | { type: "MINIMIZE"; id: string; title: string; color: string; icon?: React.ReactNode }
  | { type: "RESTORE";  id: string }
  | { type: "CLOSE";    id: string };

type TrayListener = (e: TrayEvent) => void;
const listeners = new Set<TrayListener>();

export const trayBus = {
  emit(e: TrayEvent) { listeners.forEach(fn => fn(e)); },
  on(fn: TrayListener) { listeners.add(fn); return () => listeners.delete(fn); },
};

// ── TrayItem ───────────────────────────────────────────────────────────────
interface TrayItem {
  id: string;
  title: string;
  color: string;
  icon?: React.ReactNode;
  minimizedAt: number;
}

// ── Scanline animation ─────────────────────────────────────────────────────
function TrayCanvas({ items }: { items: TrayItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const fRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;

    const resize = () => { cv.width = cv.offsetWidth * devicePixelRatio; cv.height = cv.offsetHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    function draw() {
      fRef.current++;
      const f = fRef.current;
      const W = cv!.offsetWidth, H = cv!.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      // bg
      ctx.fillStyle = "rgba(4,6,9,0.95)";
      ctx.fillRect(0, 0, W, H);

      // top border glow
      const tg = ctx.createLinearGradient(0, 0, W, 0);
      tg.addColorStop(0, "transparent");
      items.forEach((item, i) => { tg.addColorStop((i + 0.5) / items.length, item.color + "88"); });
      tg.addColorStop(1, "transparent");
      ctx.fillStyle = tg;
      ctx.fillRect(0, 0, W, 1);

      // Scanline
      ctx.fillStyle = `rgba(0,229,255,${0.03 + Math.sin(f * 0.05) * 0.02})`;
      ctx.fillRect(0, ((f * 1.5) % H), W, 1);

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [items]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none rounded-xl" style={{ display: "block" }} />;
}

// ── Single tray chip ───────────────────────────────────────────────────────
function TrayChip({ item, onRestore, onClose }: { item: TrayItem; onRestore: () => void; onClose: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 8 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-1.5 rounded-lg overflow-hidden cursor-pointer select-none group"
      style={{
        padding: "4px 8px",
        background: hovered ? `${item.color}18` : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? item.color + "55" : item.color + "22"}`,
        boxShadow: hovered ? `0 0 12px ${item.color}18` : "none",
        transition: "all 0.2s ease",
        maxWidth: 160,
        minWidth: 80,
      }}
      onClick={onRestore}
    >
      {/* Pulse dot */}
      <motion.div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: item.color, boxShadow: `0 0 4px ${item.color}` }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* Title */}
      <span className="text-[9px] font-bold tracking-wide truncate" style={{ color: item.color }}>
        {item.title.length > 14 ? item.title.slice(0, 14) + "…" : item.title}
      </span>

      {/* Restore icon */}
      <motion.span
        className="text-[8px] text-white/25 group-hover:text-white/60 transition-colors shrink-0"
        animate={hovered ? { y: [-1, 1, -1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
      >▣</motion.span>

      {/* Close button */}
      <button
        className="opacity-0 group-hover:opacity-100 text-[8px] text-red-400/60 hover:text-red-400 transition-all shrink-0 ml-0.5"
        onClick={e => { e.stopPropagation(); onClose(); }}
        title="Close"
      >✕</button>

      {/* Bottom glow bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
        style={{ background: item.color, opacity: hovered ? 0.8 : 0.3 }}
      />
    </motion.div>
  );
}

// ── Main WindowTray ────────────────────────────────────────────────────────
interface WindowTrayProps {
  onOpenLocalEngineHub?: () => void;
  onOpenBenchmark?: () => void;
  onOpenLocalAINexus?: () => void;
}

export function WindowTray({ onOpenLocalEngineHub, onOpenBenchmark, onOpenLocalAINexus }: WindowTrayProps) {
  const [items, setItems]       = useState<TrayItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [engineCount, setEngineCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsub = trayBus.on(e => {
      if (e.type === "MINIMIZE") {
        setItems(prev => {
          if (prev.find(i => i.id === e.id)) return prev;
          return [...prev, { id: e.id, title: e.title, color: e.color, icon: e.icon, minimizedAt: Date.now() }];
        });
      } else if (e.type === "RESTORE" || e.type === "CLOSE") {
        setItems(prev => prev.filter(i => i.id !== e.id));
      }
    });
    return unsub;
  }, []);

  // Poll online engine count
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch("/api/local-engines/status");
        if (r.ok) {
          const d = await r.json() as { engines: { online: boolean }[] };
          setEngineCount((d.engines ?? []).filter(e => e.online).length);
        }
      } catch { /* ignore */ }
    };
    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const restore = useCallback((id: string) => {
    trayBus.emit({ type: "RESTORE", id });
  }, []);

  const closeItem = useCallback((id: string) => {
    trayBus.emit({ type: "CLOSE", id });
  }, []);

  if (items.length === 0 && !onOpenLocalEngineHub && !onOpenBenchmark && !onOpenLocalAINexus) return null;

  return createPortal(
    <motion.div
      initial={{ y: 60 }}
      animate={{ y: collapsed ? 48 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 8888,
        maxWidth: "calc(100vw - 32px)",
        width: "auto",
        minWidth: 200,
      }}
    >
      <div
        className="relative rounded-t-2xl overflow-hidden"
        style={{
          background: "rgba(4,6,9,0.96)",
          border: "1px solid rgba(0,229,255,0.12)",
          borderBottom: "none",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(0,229,255,0.06)",
          backdropFilter: "blur(20px)",
          padding: "6px 12px 8px",
        }}
      >
        <TrayCanvas items={items} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 rounded-full text-[8px] text-white/30 hover:text-white/60 transition-colors"
          style={{ background: "rgba(4,6,9,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <ChevronUp size={8} className={collapsed ? "rotate-180 transition-transform" : "transition-transform"} />
          TRAY
        </button>

        <div className="relative flex items-center gap-2 flex-wrap">

          {/* Status chip */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0"
            style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.12)" }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: engineCount > 0 ? "#22c55e" : "#ef4444" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono text-white/40">{engineCount}/7</span>
          </div>

          {/* Quick action buttons */}
          {onOpenLocalAINexus && (
            <button
              onClick={onOpenLocalAINexus}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:scale-105 shrink-0"
              style={{ background: "rgba(0,229,255,0.12)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.35)", boxShadow: "0 0 10px rgba(0,229,255,0.15)" }}
              title="LOCAL AI MODEL NEXUS"
            >
              <Server size={9} /> LOCAL AI
            </button>
          )}

          {onOpenLocalEngineHub && (
            <button
              onClick={onOpenLocalEngineHub}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:scale-105 shrink-0"
              style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.2)" }}
              title="Local Engine Hub"
            >
              <Server size={9} /> Hub
            </button>
          )}

          {onOpenBenchmark && (
            <button
              onClick={onOpenBenchmark}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all hover:scale-105 shrink-0"
              style={{ background: "rgba(167,139,250,0.08)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}
              title="Benchmark"
            >
              <Activity size={9} /> Bench
            </button>
          )}

          {/* Minimized window chips */}
          <AnimatePresence mode="popLayout">
            {items.map(item => (
              <TrayChip
                key={item.id}
                item={item}
                onRestore={() => restore(item.id)}
                onClose={() => closeItem(item.id)}
              />
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <span className="text-[9px] text-white/15 font-mono italic">
              Minimized windows appear here
            </span>
          )}

          {/* Window count badge */}
          {items.length > 0 && (
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <Monitor size={9} className="text-white/20" />
              <span className="text-[9px] text-white/25 font-mono">{items.length}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
