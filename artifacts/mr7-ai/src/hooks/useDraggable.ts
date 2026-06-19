import { useCallback, useEffect, useRef, useState } from "react";

const GRID = 1; // no grid snapping — pixel-perfect

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/**
 * RAF-based drag hook. Mutates DOM directly during drag for zero-jank movement.
 * Commits React state only on mouseup/touchend for persistence.
 */
export function useDraggable(
  storageKey: string,
  defaultPos: { x: number; y: number } = { x: 40, y: 80 }
) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v) {
        const p = JSON.parse(v);
        if (typeof p.x === "number" && typeof p.y === "number") return p;
      }
    } catch {}
    return defaultPos;
  });

  const rootRef  = useRef<HTMLDivElement>(null);
  const rafRef   = useRef(0);
  const activeRef = useRef(false);
  const targetRef = useRef({ x: pos.x, y: pos.y });
  const offsetRef = useRef({ x: 0, y: 0 });

  // Sync target when pos changes externally
  useEffect(() => {
    targetRef.current = { x: pos.x, y: pos.y };
  }, [pos]);

  const commit = useCallback((x: number, y: number) => {
    const el = rootRef.current;
    if (!el) return;
    const w  = el.offsetWidth;
    const cx = clamp(x, 0, window.innerWidth  - w - 2);
    const cy = clamp(y, 0, window.innerHeight - 48);
    el.style.left = `${cx}px`;
    el.style.top  = `${cy}px`;
    const p = { x: cx, y: cy };
    setPos(p);
    try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch {}
  }, [storageKey]);

  const onDragMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    activeRef.current = true;

    // Set cursor on body during drag
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const move = (ev: MouseEvent) => {
      if (!activeRef.current) return;
      const el2 = rootRef.current;
      if (!el2) return;
      const w  = el2.offsetWidth;
      const nx = clamp(ev.clientX - offsetRef.current.x, 0, window.innerWidth  - w - 2);
      const ny = clamp(ev.clientY - offsetRef.current.y, 0, window.innerHeight - 48);
      el2.style.left = `${nx}px`;
      el2.style.top  = `${ny}px`;
      targetRef.current = { x: nx, y: ny };
    };

    const up = (ev: MouseEvent) => {
      activeRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup",   up);
      const el2 = rootRef.current;
      if (!el2) return;
      const w  = el2.offsetWidth;
      const nx = clamp(ev.clientX - offsetRef.current.x, 0, window.innerWidth  - w - 2);
      const ny = clamp(ev.clientY - offsetRef.current.y, 0, window.innerHeight - 48);
      commit(nx, ny);
    };

    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseup",   up);
  }, [commit]);

  const onDragTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t0   = e.touches[0];
    offsetRef.current = { x: t0.clientX - rect.left, y: t0.clientY - rect.top };
    activeRef.current = true;

    const move = (ev: TouchEvent) => {
      if (!activeRef.current) return;
      const el2 = rootRef.current;
      if (!el2) return;
      const t  = ev.touches[0];
      const w  = el2.offsetWidth;
      const nx = clamp(t.clientX - offsetRef.current.x, 0, window.innerWidth  - w - 2);
      const ny = clamp(t.clientY - offsetRef.current.y, 0, window.innerHeight - 48);
      el2.style.left = `${nx}px`;
      el2.style.top  = `${ny}px`;
      targetRef.current = { x: nx, y: ny };
    };

    const up = (ev: TouchEvent) => {
      activeRef.current = false;
      document.removeEventListener("touchmove",  move);
      document.removeEventListener("touchend",   up);
      const el2 = rootRef.current;
      if (!el2) return;
      const t  = ev.changedTouches[0];
      const w  = el2.offsetWidth;
      const nx = clamp(t.clientX - offsetRef.current.x, 0, window.innerWidth  - w - 2);
      const ny = clamp(t.clientY - offsetRef.current.y, 0, window.innerHeight - 48);
      commit(nx, ny);
    };

    document.addEventListener("touchmove",  move, { passive: true });
    document.addEventListener("touchend",   up);
  }, [commit]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return { pos, rootRef, onDragMouseDown, onDragTouchStart };
}
