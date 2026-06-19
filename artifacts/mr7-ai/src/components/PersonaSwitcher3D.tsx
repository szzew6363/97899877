import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { PERSONA_PRESETS, type PersonaPreset } from "./modals/PersonaEditorModal";

const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  general:    [34,  197, 94 ],
  uncensored: [245, 158, 11 ],
  security:   [226, 18,  39 ],
  specialist: [99,  102, 241],
};

function PersonaOrb({ color, pulse, size = 24 }: { color: [number, number, number]; pulse: boolean; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR  = Math.min(window.devicePixelRatio || 1, 2);
    const SIZE = size;
    cv.width  = SIZE * DPR;
    cv.height = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const cx = SIZE / 2, cy = SIZE / 2;
    const [cr, cg, cb] = color;
    const sc = SIZE / 44; // unified scale factor

    // ── Fibonacci sphere nodes ──
    const NODE_COUNT = Math.max(8, Math.round(size * 0.55));
    interface SphereNode { nx: number; ny: number; nz: number }
    const nodes: SphereNode[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < NODE_COUNT; i++) {
      const y2 = 1 - (i / (NODE_COUNT - 1)) * 2;
      const r2 = Math.sqrt(Math.max(0, 1 - y2 * y2));
      const phi = golden * i;
      nodes.push({ nx: Math.cos(phi) * r2, ny: y2, nz: Math.sin(phi) * r2 });
    }

    // ── Orbital particles ──
    const ORBIT_COUNT = 3;
    const orbitals = Array.from({ length: ORBIT_COUNT }, (_, i) => ({
      speed:  0.9 + i * 0.55,
      phase:  (i / ORBIT_COUNT) * Math.PI * 2,
      tiltX:  (i * 1.3),
      tiltZ:  (i * 0.8),
      radius: (0.72 + i * 0.14) * sc * 18,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.028;
      const t = tRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const SR = 9 * sc; // sphere radius
      const rotY = t * 0.45;
      const rotX = Math.sin(t * 0.18) * 0.28;
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      // ── outer ambient halo ──
      const glowAlpha = pulse ? 0.40 + Math.sin(t * 2.8) * 0.22 : 0.20;
      const halo = ctx.createRadialGradient(cx, cy, SR * 0.4, cx, cy, SIZE * 0.54);
      halo.addColorStop(0,   `rgba(${cr},${cg},${cb},${glowAlpha})`);
      halo.addColorStop(0.45,`rgba(${cr},${cg},${cb},${glowAlpha * 0.28})`);
      halo.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, SIZE * 0.54, 0, Math.PI * 2);
      ctx.fillStyle = halo; ctx.fill();

      // ── corona ring ──
      if (pulse) {
        const coronaR = SR + 5 * sc + Math.sin(t * 2.1) * 1.5 * sc;
        ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.15 + Math.sin(t * 2.1) * 0.10})`;
        ctx.lineWidth = 1 * sc; ctx.stroke();
      }

      // ── project + sort sphere nodes ──
      interface Projected { sx: number; sy: number; sz: number; alpha: number }
      const projected: Projected[] = nodes.map(n => {
        // rotate Y
        const x1 = n.nx * cosY - n.nz * sinY;
        const z1 = n.nx * sinY + n.nz * cosY;
        // rotate X
        const y2 = n.ny * cosX - z1 * sinX;
        const z2 = n.ny * sinX + z1 * cosX;
        const alpha = (z2 + 1) / 2; // 0..1 depth
        return { sx: cx + x1 * SR, sy: cy + y2 * SR, sz: z2, alpha };
      });
      projected.sort((a, b) => a.sz - b.sz); // back-to-front

      // ── sphere body (dark glass) ──
      const body = ctx.createRadialGradient(cx - SR * 0.32, cy - SR * 0.38, 0, cx, cy, SR);
      body.addColorStop(0,    `rgba(${Math.min(cr+60,255)},${Math.min(cg+60,255)},${Math.min(cb+60,255)},0.18)`);
      body.addColorStop(0.5,  `rgba(${cr},${cg},${cb},0.09)`);
      body.addColorStop(1,    `rgba(${Math.round(cr*0.15)},${Math.round(cg*0.15)},${Math.round(cb*0.15)},0.85)`);
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(2,2,6,0.88)`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = body; ctx.fill();

      // ── sphere border ──
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.38)`;
      ctx.lineWidth = 0.7 * sc; ctx.stroke();

      // ── neural connections between nearby nodes ──
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < Math.min(projected.length, i + 4); j++) {
          const a = projected[i], b = projected[j];
          const dx = a.sx - b.sx, dy = a.sy - b.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SR * 1.1) {
            const depthAlpha = ((a.alpha + b.alpha) / 2) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${depthAlpha * (1 - dist / (SR * 1.1))})`;
            ctx.lineWidth = 0.4 * sc; ctx.stroke();
          }
        }
      }

      // ── neural nodes ──
      for (const p of projected) {
        const nr = (0.9 + p.alpha * 1.0) * sc;
        const nodeAlpha = 0.25 + p.alpha * 0.75;
        const ng = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, nr * 3);
        ng.addColorStop(0, `rgba(${Math.min(cr+120,255)},${Math.min(cg+120,255)},${Math.min(cb+120,255)},${nodeAlpha})`);
        ng.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, nr * 3, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();
        ctx.beginPath(); ctx.arc(p.sx, p.sy, nr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${nodeAlpha * 0.9})`; ctx.fill();
      }

      // ── specular highlight ──
      const spec = ctx.createRadialGradient(cx - SR * 0.38, cy - SR * 0.42, 0, cx - SR * 0.2, cy - SR * 0.2, SR * 0.75);
      spec.addColorStop(0,   "rgba(255,255,255,0.65)");
      spec.addColorStop(0.35,"rgba(255,255,255,0.12)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // ── orbital rings (ellipse, tilted) ──
      const RING_CONFIGS = [
        { rx: 15 * sc, ry: 4.5 * sc, angle: t * 0.65,  alpha: 0.38, tilt: Math.PI * 0.12 },
        { rx: 12 * sc, ry: 3.5 * sc, angle: -t * 0.42, alpha: 0.24, tilt: Math.PI * 0.55 },
        { rx: 18 * sc, ry: 2.8 * sc, angle: t * 0.30,  alpha: 0.16, tilt: Math.PI * 0.30 },
      ];
      for (const ring of RING_CONFIGS) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, ring.tilt, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ring.alpha})`;
        ctx.lineWidth = 0.65 * sc; ctx.stroke();
        ctx.restore();
      }

      // ── orbiting particles with trails ──
      for (const orb of orbitals) {
        const angle = t * orb.speed + orb.phase;
        const cosT = Math.cos(orb.tiltX), sinT = Math.sin(orb.tiltX);
        const cosZ = Math.cos(orb.tiltZ), sinZ = Math.sin(orb.tiltZ);
        const ox = Math.cos(angle) * orb.radius;
        const oy = Math.sin(angle) * orb.radius * 0.35;
        const px2 = cx + ox * cosZ - oy * sinZ;
        const py2 = cy + ox * sinT + oy * cosT;

        // trail
        for (let tr = 1; tr <= 5; tr++) {
          const ta = angle - tr * 0.15;
          const tax = Math.cos(ta) * orb.radius;
          const tay = Math.sin(ta) * orb.radius * 0.35;
          const tpx = cx + tax * cosZ - tay * sinZ;
          const tpy = cy + tax * sinT + tay * cosT;
          ctx.beginPath(); ctx.arc(tpx, tpy, (1.5 - tr * 0.2) * sc, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.35 - tr * 0.06)})`;
          ctx.fill();
        }

        // particle core
        const pg = ctx.createRadialGradient(px2, py2, 0, px2, py2, 3 * sc);
        pg.addColorStop(0, "rgba(255,255,255,0.95)");
        pg.addColorStop(0.4, `rgba(${Math.min(cr+100,255)},${Math.min(cg+100,255)},${Math.min(cb+100,255)},0.7)`);
        pg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath(); ctx.arc(px2, py2, 3 * sc, 0, Math.PI * 2);
        ctx.fillStyle = pg; ctx.fill();
      }

      // ── inner pulsing core ──
      const coreR = 2.8 * sc * (1 + Math.sin(t * 3.5) * 0.2);
      const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreG.addColorStop(0,   "rgba(255,255,255,0.9)");
      coreG.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.6)`);
      coreG.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreG; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, pulse, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, imageRendering: "crisp-edges", flexShrink: 0 }}
    />
  );
}

interface PersonaSwitcher3DProps {
  onOpenPersonaEditor: () => void;
  onOpenPersonaManager?: () => void;
}

export function PersonaSwitcher3D({ onOpenPersonaEditor, onOpenPersonaManager }: PersonaSwitcher3DProps) {
  const { state, dispatch } = useStore();
  const [showPanel, setShowPanel] = useState(false);
  const [hoverPreset, setHoverPreset] = useState<string | null>(null);
  const [psTab, setPsTab] = useState<"swift"|"library"|"stats"|"build">("swift");
  const [psSearch, setPsSearch] = useState("");
  const [psCategory, setPsCategory] = useState<"all"|"general"|"security"|"uncensored"|"specialist">("all");
  const ref = useRef<HTMLDivElement>(null);
  const { pos: dragPos, rootRef: panelRef, onDragMouseDown } = useDraggable("mr7-ps3d-win", { x: Math.max(8, window.innerWidth - 580), y: 60 });

  const activePresetId = state.settings.activePersonaPreset ?? "default";
  const activePreset = PERSONA_PRESETS.find(p => p.id === activePresetId) ?? PERSONA_PRESETS[0];
  const color = CATEGORY_COLORS[activePreset.category] ?? [34, 197, 94];
  const [cr, cg, cb] = color;
  const isCustomActive = activePresetId !== "default";

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPanel(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const topPresets = PERSONA_PRESETS.slice(0, 8);
  const btnRef2 = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  function openPanel() {
    if (btnRef2.current) {
      const r = btnRef2.current.getBoundingClientRect();
      setPanelPos({
        top: Math.min(r.bottom + 8, window.innerHeight - 460),
        left: Math.min(r.left - 120, window.innerWidth - 300),
      });
    }
    setShowPanel(v => !v);
  }

  // Escape key to close
  useEffect(() => {
    if (!showPanel) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setShowPanel(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [showPanel]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Main trigger button — circular 36px */}
      <motion.button
        ref={btnRef2}
        onClick={openPanel}
        className="relative flex items-center justify-center rounded-full transition-all"
        style={{
          width: 44, height: 44,
          background: showPanel || isCustomActive
            ? `radial-gradient(circle at 38% 38%, rgba(${cr},${cg},${cb},0.32), rgba(0,0,0,0.95))`
            : `radial-gradient(circle at 38% 38%, rgba(${cr},${cg},${cb},0.14), rgba(0,0,0,0.88))`,
          border: `2px solid rgba(${cr},${cg},${cb},${showPanel || isCustomActive ? 0.75 : 0.30})`,
          boxShadow: showPanel || isCustomActive
            ? `0 0 28px rgba(${cr},${cg},${cb},0.50), 0 0 60px rgba(${cr},${cg},${cb},0.18), inset 0 0 14px rgba(${cr},${cg},${cb},0.10)`
            : `0 0 16px rgba(${cr},${cg},${cb},0.22), 0 0 32px rgba(${cr},${cg},${cb},0.08)`,
        }}
        whileHover={{ scale: 1.10, y: -1 }}
        whileTap={{ scale: 0.90 }}
        aria-label="محوّل الشخصيات"
        title={`الشخصية النشطة: ${activePreset.nameAr}`}
      >
        <PersonaOrb color={color} pulse={isCustomActive} size={22} />
        {(showPanel || isCustomActive) && (
          <span
            className="absolute inset-0 rounded-full pointer-events-none ring-pulse"
            style={{ border: `1px solid rgba(${cr},${cg},${cb},0.55)` }}
          />
        )}
      </motion.button>

      {/* 3D External Draggable Window — UPGRADED v4 */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            ref={panelRef as React.Ref<HTMLDivElement>}
            initial={{ opacity: 0, scale: 0.90, y: -18, rotateX: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.90, y: -14, rotateX: 6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              top: dragPos.y,
              left: dragPos.x,
              zIndex: 1995,
              width: "clamp(340px, 40vw, 560px)",
              background: "linear-gradient(160deg, rgba(4,2,12,0.99) 0%, rgba(2,1,8,0.99) 55%, rgba(5,2,14,0.99) 100%)",
              border: `1px solid rgba(${cr},${cg},${cb},0.35)`,
              borderRadius: 20,
              boxShadow: `0 0 120px rgba(${cr},${cg},${cb},0.22), 0 0 50px rgba(${cr},${cg},${cb},0.10), 0 32px 80px rgba(0,0,0,0.96), inset 0 1px 0 rgba(${cr},${cg},${cb},0.18), inset 0 0 60px rgba(${cr},${cg},${cb},0.03)`,
              backdropFilter: "blur(40px)",
              perspective: 1200,
              pointerEvents: "auto",
              overflow: "hidden",
            }}
          >
            {/* Animated scan line — CSS */}
            <span className="absolute inset-x-0 h-px pointer-events-none z-20 window-scan-line"
              style={{ background: `linear-gradient(90deg,transparent,rgba(${cr},${cg},${cb},0.6),transparent)` }} />

            {/* Corner brackets */}
            <span className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 pointer-events-none rounded-tl" style={{ borderColor: `rgba(${cr},${cg},${cb},0.65)` }} />
            <span className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 pointer-events-none rounded-tr" style={{ borderColor: `rgba(${cr},${cg},${cb},0.65)` }} />
            <span className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 pointer-events-none rounded-bl" style={{ borderColor: `rgba(${cr},${cg},${cb},0.35)` }} />
            <span className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 pointer-events-none rounded-br" style={{ borderColor: `rgba(${cr},${cg},${cb},0.35)` }} />

            {/* Header stripe */}
            <div className="h-[2px] w-full"
              style={{ background: `linear-gradient(90deg, transparent, rgba(${cr},${cg},${cb},0.9), rgba(255,255,255,0.3), rgba(${cr},${cg},${cb},0.9), transparent)` }} />

            {/* Header — drag handle */}
            <div className="px-4 pt-3 pb-2.5 flex items-center justify-between cursor-move select-none"
              style={{ borderBottom: `1px solid rgba(${cr},${cg},${cb},0.10)` }}
              onMouseDown={onDragMouseDown}>
              <div className="flex items-center gap-3">
                <PersonaOrb color={color} pulse={true} size={36} />
                <div>
                  <div className="text-[8px] font-black tracking-[0.3em] uppercase font-mono"
                    style={{ color: `rgba(${cr},${cg},${cb},0.75)` }}>PERSONA MATRIX · v4.0</div>
                  <div className="text-white text-sm font-black mt-0.5">{activePreset.nameAr}</div>
                  <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {activePreset.category.toUpperCase()} · نشط
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-2 h-2 rounded-full pulse-dot"
                    style={{ background: `rgba(${cr},${cg},${cb},1)`, boxShadow: `0 0 10px rgba(${cr},${cg},${cb},0.9)`, animationDuration: "1.1s" }} />
                  <span className="text-[7px] font-black font-mono" style={{ color: `rgba(${cr},${cg},${cb},0.6)` }}>LIVE</span>
                </div>
                <motion.button onClick={() => setShowPanel(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                  whileHover={{ background: "rgba(255,100,100,0.15)", color: "#ff4444", borderColor: "rgba(255,80,80,0.3)" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex px-3 gap-0.5 pt-2" style={{ borderBottom: `1px solid rgba(${cr},${cg},${cb},0.10)` }}>
              {(["swift","library","stats","build"] as const).map(tab => {
                const tabLabels: Record<string,string> = { swift:"⚡ SWIFT", library:"📚 LIBRARY", stats:"🧠 NEURAL", build:"🔧 CRAFT" };
                const isActive = psTab === tab;
                return (
                  <button key={tab} onClick={() => setPsTab(tab)}
                    className="px-3 py-1.5 text-[8px] font-black tracking-wider uppercase rounded-t-lg transition-all font-mono"
                    style={{
                      color: isActive ? `rgba(${cr},${cg},${cb},0.95)` : "rgba(255,255,255,0.28)",
                      background: isActive ? `rgba(${cr},${cg},${cb},0.12)` : "transparent",
                      borderBottom: isActive ? `2px solid rgba(${cr},${cg},${cb},0.85)` : "2px solid transparent",
                    }}>
                    {tabLabels[tab]}
                  </button>
                );
              })}
            </div>

            {/* SWIFT TAB */}
            {psTab === "swift" && (
              <div className="p-3 space-y-2">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "إجمالي", value: String(PERSONA_PRESETS.length), color: `rgba(${cr},${cg},${cb},0.9)` },
                    { label: "فئة", value: activePreset.category, color: "#a78bfa" },
                    { label: "حالة", value: "نشط", color: "#22c55e" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-2 text-center"
                      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(${cr},${cg},${cb},0.08)` }}>
                      <div className="text-[7px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                      <div className="text-[10px] font-black font-mono truncate" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Quick grid */}
                <div className="text-[7px] font-bold tracking-[0.25em] uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.28)" }}>تبديل سريع</div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[52vh] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `rgba(${cr},${cg},${cb},0.2) transparent` }}>
                  {topPresets.map(preset => {
                    const pc = CATEGORY_COLORS[preset.category] ?? [34, 197, 94];
                    const isActive = preset.id === activePresetId;
                    const isHov = hoverPreset === preset.id;
                    const Icon = preset.icon;
                    return (
                      <motion.button
                        key={preset.id}
                        onMouseEnter={() => setHoverPreset(preset.id)}
                        onMouseLeave={() => setHoverPreset(null)}
                        onClick={() => {
                          dispatch({ type: "SET_SETTINGS", patch: { activePersonaPreset: preset.id } } as Parameters<typeof dispatch>[0]);
                          setShowPanel(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all relative overflow-hidden"
                        style={{
                          background: isActive ? `rgba(${pc[0]},${pc[1]},${pc[2]},0.16)` : isHov ? `rgba(${pc[0]},${pc[1]},${pc[2]},0.08)` : "rgba(255,255,255,0.025)",
                          border: `1px solid rgba(${pc[0]},${pc[1]},${pc[2]},${isActive ? 0.45 : isHov ? 0.22 : 0.08})`,
                          boxShadow: isActive ? `0 0 16px rgba(${pc[0]},${pc[1]},${pc[2]},0.22), inset 0 1px 0 rgba(${pc[0]},${pc[1]},${pc[2]},0.10)` : "none",
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {isActive && (
                          <div className="absolute inset-y-0 left-0 w-0.5 rounded-full pulse-dot"
                            style={{ background: `rgba(${pc[0]},${pc[1]},${pc[2]},1)`, animationDuration: "1.5s" }} />
                        )}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `rgba(${pc[0]},${pc[1]},${pc[2]},0.18)`, border: `1px solid rgba(${pc[0]},${pc[1]},${pc[2]},0.28)` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: `rgba(${pc[0]},${pc[1]},${pc[2]},0.95)` }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold truncate" style={{ color: isActive ? `rgba(${pc[0]},${pc[1]},${pc[2]},1)` : "rgba(255,255,255,0.7)" }}>
                            {preset.nameAr.slice(0, 14)}
                          </div>
                          <div className="text-[8px] truncate mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>
                            {preset.category}
                          </div>
                        </div>
                        {isActive && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: `rgba(${pc[0]},${pc[1]},${pc[2]},0.95)`, boxShadow: `0 0 8px rgba(${pc[0]},${pc[1]},${pc[2]},0.8)` }} />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LIBRARY TAB */}
            {psTab === "library" && (
              <div className="p-3 space-y-2">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: `rgba(${cr},${cg},${cb},0.5)` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input type="text" value={psSearch} onChange={e => setPsSearch(e.target.value)}
                    placeholder="بحث في المكتبة..."
                    className="w-full pl-7 pr-3 py-1.5 text-[9px] font-mono rounded-xl outline-none"
                    style={{ background: "rgba(0,0,0,0.4)", border: `1px solid rgba(${cr},${cg},${cb},${psSearch ? 0.45 : 0.18})`, color: "rgba(255,255,255,0.85)" }}
                    dir="rtl" />
                  {psSearch && <button onClick={() => setPsSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>✕</button>}
                </div>
                {/* Category filter */}
                <div className="flex gap-1 flex-wrap">
                  {(["all", "general", "security", "uncensored", "specialist"] as const).map(cat => {
                    const catColors: Record<string, string> = { all: "#a78bfa", general: "#22c55e", security: "#e21227", uncensored: "#f59e0b", specialist: "#6366f1" };
                    const catLabels: Record<string, string> = { all: "الكل", general: "عام", security: "أمن", uncensored: "بلا قيود", specialist: "متخصص" };
                    const isSel = psCategory === cat;
                    return (
                      <button key={cat} onClick={() => setPsCategory(cat)}
                        className="px-2 py-0.5 rounded-lg text-[7px] font-black font-mono transition-all"
                        style={{
                          background: isSel ? `${catColors[cat]}20` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isSel ? catColors[cat] + "50" : "rgba(255,255,255,0.06)"}`,
                          color: isSel ? catColors[cat] : "rgba(255,255,255,0.35)",
                        }}>
                        {catLabels[cat]}
                      </button>
                    );
                  })}
                </div>
                {/* All presets list */}
                <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: `rgba(${cr},${cg},${cb},0.2) transparent` }}>
                  {PERSONA_PRESETS
                    .filter(p => {
                      const matchCat = psCategory === "all" || p.category === psCategory;
                      const matchSearch = !psSearch || p.nameAr.includes(psSearch) || p.category.includes(psSearch);
                      return matchCat && matchSearch;
                    })
                    .map(preset => {
                      const pc = CATEGORY_COLORS[preset.category] ?? [34, 197, 94];
                      const isActive = preset.id === activePresetId;
                      const Icon = preset.icon;
                      return (
                        <motion.button key={preset.id}
                          onClick={() => { dispatch({ type: "SET_SETTINGS", patch: { activePersonaPreset: preset.id } } as Parameters<typeof dispatch>[0]); setShowPanel(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left relative overflow-hidden"
                          style={{
                            background: isActive ? `rgba(${pc[0]},${pc[1]},${pc[2]},0.14)` : "rgba(255,255,255,0.02)",
                            border: `1px solid rgba(${pc[0]},${pc[1]},${pc[2]},${isActive ? 0.40 : 0.06})`,
                          }}
                          whileHover={{ background: `rgba(${pc[0]},${pc[1]},${pc[2]},0.09)`, borderColor: `rgba(${pc[0]},${pc[1]},${pc[2]},0.25)` }}
                          whileTap={{ scale: 0.98 }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `rgba(${pc[0]},${pc[1]},${pc[2]},0.18)`, border: `1px solid rgba(${pc[0]},${pc[1]},${pc[2]},0.30)` }}>
                            <Icon className="w-4 h-4" style={{ color: `rgba(${pc[0]},${pc[1]},${pc[2]},0.95)` }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold" style={{ color: isActive ? `rgba(${pc[0]},${pc[1]},${pc[2]},1)` : "rgba(255,255,255,0.75)" }}>{preset.nameAr}</div>
                            <div className="text-[8px] mt-0.5 line-clamp-1" style={{ color: "rgba(255,255,255,0.30)" }}>{preset.descAr?.slice(0, 50) ?? "شخصية متخصصة"}…</div>
                          </div>
                          {isActive && <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: `rgba(${pc[0]},${pc[1]},${pc[2]},1)`, boxShadow: `0 0 8px rgba(${pc[0]},${pc[1]},${pc[2]},0.9)` }} />}
                        </motion.button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* NEURAL STATS TAB */}
            {psTab === "stats" && (
              <div className="p-3 space-y-3">
                <div className="rounded-2xl p-3 flex items-center gap-4"
                  style={{ background: `rgba(${cr},${cg},${cb},0.08)`, border: `1px solid rgba(${cr},${cg},${cb},0.20)` }}>
                  <PersonaOrb color={color} pulse={true} size={52} />
                  <div className="flex-1">
                    <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: `rgba(${cr},${cg},${cb},0.6)` }}>النيورون النشط</div>
                    <div className="text-base font-black text-white">{activePreset.nameAr}</div>
                    <div className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{activePreset.descAr?.slice(0, 60) ?? "الشخصية الافتراضية"}…</div>
                  </div>
                </div>
                <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>مؤشرات الأداء العصبي</div>
                {[
                  { label: "الذكاء الأمني", pct: 94, color: "#e21227" },
                  { label: "دقة الكود", pct: 88, color: "#22c55e" },
                  { label: "الإبداع", pct: 76, color: "#a78bfa" },
                  { label: "السرعة", pct: 92, color: `rgba(${cr},${cg},${cb},0.9)` },
                  { label: "الأمان", pct: 85, color: "#00e5ff" },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.50)" }}>{stat.label}</span>
                      <span className="text-[8px] font-black font-mono" style={{ color: stat.color }}>{stat.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${stat.pct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        style={{ background: `linear-gradient(90deg,${stat.color}66,${stat.color})`, boxShadow: `0 0 6px ${stat.color}44` }} />
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { label: "الفئة", value: activePreset.category, color: `rgba(${cr},${cg},${cb},0.9)` },
                    { label: "المعرّف", value: activePreset.id.slice(0, 10), color: "#a78bfa" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-[7px] uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{s.label}</div>
                      <div className="text-[10px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CRAFT / BUILD TAB */}
            {psTab === "build" && (
              <div className="p-3 space-y-2">
                <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>أدوات الشخصية</div>
                  <div className="space-y-1.5">
                    {[
                      { label: "فتح محرر الشخصيات", desc: "إنشاء شخصية مخصصة بالكامل", icon: "✏️", action: () => { setShowPanel(false); onOpenPersonaEditor(); } },
                      { label: "مدير الشخصيات الكامل", desc: "إدارة وتنظيم جميع الشخصيات", icon: "📋", action: onOpenPersonaManager ? () => { setShowPanel(false); onOpenPersonaManager!(); } : undefined },
                    ].filter(Boolean).map(item => (
                      <motion.button key={item.label}
                        onClick={item.action}
                        disabled={!item.action}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid rgba(${cr},${cg},${cb},0.14)`,
                          opacity: item.action ? 1 : 0.4,
                        }}
                        whileHover={item.action ? { background: `rgba(${cr},${cg},${cb},0.10)`, borderColor: `rgba(${cr},${cg},${cb},0.30)` } : {}}
                        whileTap={item.action ? { scale: 0.97 } : {}}>
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <div className="text-[10px] font-bold" style={{ color: `rgba(${cr},${cg},${cb},0.9)` }}>{item.label}</div>
                          <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{item.desc}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>إحصاءات المكتبة</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "إجمالي الشخصيات", value: PERSONA_PRESETS.length, color: `rgba(${cr},${cg},${cb},0.9)` },
                      { label: "فئة أمنية", value: PERSONA_PRESETS.filter(p=>p.category==="security").length, color: "#e21227" },
                      { label: "فئة عامة", value: PERSONA_PRESETS.filter(p=>p.category==="general").length, color: "#22c55e" },
                      { label: "بلا قيود", value: PERSONA_PRESETS.filter(p=>p.category==="uncensored").length, color: "#f59e0b" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="text-[14px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom stripe */}
            <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, rgba(${cr},${cg},${cb},0.55), transparent)` }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
