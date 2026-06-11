import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

type Health = "checking" | "healthy" | "slow" | "error" | "unknown";

const HEALTH_RGB: Record<Health, [number, number, number]> = {
  checking: [6,   182, 212],
  healthy:  [34,  197, 94 ],
  slow:     [245, 158, 11 ],
  error:    [226, 18,  39 ],
  unknown:  [107, 114, 128],
};

const PROVIDER_LABELS: Record<string, string> = {
  groq:       "GROQ",
  openai:     "OPENAI",
  anthropic:  "CLAUDE",
  gemini:     "GEMINI",
  openrouter: "OR",
  custom:     "CUSTOM",
  personal:   "KEY",
};

export function ProviderHealthBadge3D() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef(0);
  const lastFRef   = useRef(0);
  const tRef       = useRef(0);
  const healthRef  = useRef<Health>("checking");

  const { state } = useStore();
  const [health,  setHealth]  = useState<Health>("checking");
  const [latency, setLatency] = useState<number | null>(null);

  const runCheck = useCallback(async () => {
    setHealth("checking");
    healthRef.current = "checking";
    const t0 = Date.now();
    try {
      const res = await fetch("/api/providers");
      const ms = Date.now() - t0;
      if (res.ok) {
        const data = await res.json() as { providers?: { id: string; available: boolean }[] };
        const active = state.activeProvider;
        const found = data.providers?.find(p => p.id === active && p.available);
        if (found) {
          const h: Health = ms < 1200 ? "healthy" : "slow";
          setHealth(h); healthRef.current = h; setLatency(ms);
        } else {
          const hasKey =
            (state.settings.personalApiKey?.trim()?.length ?? 0) > 10 ||
            (localStorage.getItem(`mr7-ai-p-key-${active}`)?.trim()?.length ?? 0) > 10;
          const h: Health = hasKey ? "healthy" : "error";
          setHealth(h); healthRef.current = h; setLatency(ms);
        }
      } else {
        setHealth("error"); healthRef.current = "error";
      }
    } catch {
      setHealth("error"); healthRef.current = "error";
    }
  }, [state.activeProvider, state.settings.personalApiKey]);

  useEffect(() => {
    runCheck();
    const id = setInterval(runCheck, 90_000);
    return () => clearInterval(id);
  }, [runCheck]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = window.devicePixelRatio || 1;
    const SIZE = 32;
    cv.width  = SIZE * DPR;
    cv.height = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const cx = SIZE / 2, cy = SIZE / 2;
    const SR = 9;   // sphere radius
    const ORX = SR + 6;  // orbit ellipse X radius
    const ORY = ORX * 0.32;  // orbit ellipse Y radius (tilt)

    function draw(now: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFRef.current < 33) return;
      lastFRef.current = now;
      tRef.current += 0.045;
      const t = tRef.current;
      const h = healthRef.current;
      const [cr, cg, cb] = HEALTH_RGB[h];

      ctx.clearRect(0, 0, SIZE, SIZE);

      // ── Ambient glow halo ─────────────────────────────────────────────────
      const halo = ctx.createRadialGradient(cx, cy, SR * 0.6, cx, cy, SR + 12);
      halo.addColorStop(0,   `rgba(${cr},${cg},${cb},0.18)`);
      halo.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.08)`);
      halo.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, SR + 12, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // ── Pulsing outer ring ────────────────────────────────────────────────
      const pulse = (Math.sin(t * 2.1) + 1) * 0.5;
      const pr = SR + 4 + pulse * 5;
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.25 * (1 - pulse * 0.5)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Orbit ring ────────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.ellipse(cx, cy, ORX, ORY, 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.28)`;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // ── Back-half orbit particles (depth < 0) ─────────────────────────────
      for (let i = 0; i < 4; i++) {
        const ang = t * 0.9 + (i * Math.PI * 2) / 4;
        const depth = Math.sin(ang + 0.35);
        if (depth > 0) continue;
        const px = cx + Math.cos(ang) * ORX;
        const py = cy + Math.sin(ang) * ORY;
        const sz = 1 + (depth + 1) * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.25 + (depth + 1) * 0.2})`;
        ctx.fill();
      }

      // ── Sphere body ───────────────────────────────────────────────────────
      // Base: dark shell
      ctx.beginPath();
      ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(cr*0.08)},${Math.round(cg*0.08)},${Math.round(cb*0.08)},0.97)`;
      ctx.fill();

      // Diffuse colour layer
      const diff = ctx.createRadialGradient(cx - SR * 0.25, cy - SR * 0.25, 0, cx, cy, SR);
      diff.addColorStop(0,    `rgba(${cr},${cg},${cb},0.65)`);
      diff.addColorStop(0.55, `rgba(${cr},${cg},${cb},0.4)`);
      diff.addColorStop(1,    `rgba(${Math.round(cr*0.3)},${Math.round(cg*0.3)},${Math.round(cb*0.3)},0.5)`);
      ctx.beginPath();
      ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = diff;
      ctx.fill();

      // Specular highlight
      const spec = ctx.createRadialGradient(cx - SR * 0.38, cy - SR * 0.42, 0, cx - SR * 0.1, cy - SR * 0.1, SR * 0.9);
      spec.addColorStop(0,   "rgba(255,255,255,0.75)");
      spec.addColorStop(0.2, "rgba(255,255,255,0.22)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      // Rim light (opposite side)
      const rim = ctx.createRadialGradient(cx + SR * 0.6, cy + SR * 0.4, 0, cx + SR * 0.5, cy + SR * 0.5, SR * 0.7);
      rim.addColorStop(0,   `rgba(${cr},${cg},${cb},0.4)`);
      rim.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();

      // ── Checking spinner arc ───────────────────────────────────────────────
      if (h === "checking") {
        ctx.beginPath();
        ctx.arc(cx, cy, SR - 1.5, t, t + Math.PI * 1.2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.85)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // ── Front-half orbit particles (depth >= 0) ────────────────────────────
      for (let i = 0; i < 4; i++) {
        const ang = t * 0.9 + (i * Math.PI * 2) / 4;
        const depth = Math.sin(ang + 0.35);
        if (depth <= 0) continue;
        const px = cx + Math.cos(ang) * ORX;
        const py = cy + Math.sin(ang) * ORY;
        const sz = 1 + depth * 1.2;
        const glw = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.5);
        glw.addColorStop(0,   `rgba(${cr},${cg},${cb},0.9)`);
        glw.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath();
        ctx.arc(px, py, sz * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glw;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,0.9)`;
        ctx.fill();
      }

      // ── Status blip at top-right ───────────────────────────────────────────
      const blinkA = h === "healthy" ? 0.8 + Math.sin(t * 2.5) * 0.2 :
                     h === "error"   ? 0.5 + Math.sin(t * 8)   * 0.5 :
                     h === "slow"    ? 0.6 + Math.sin(t * 4)   * 0.4 : 0.5;
      ctx.beginPath();
      ctx.arc(cx + SR * 0.68, cy - SR * 0.68, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${blinkA})`;
      ctx.fill();
      // blip glow
      const bg = ctx.createRadialGradient(cx + SR * 0.68, cy - SR * 0.68, 0, cx + SR * 0.68, cy - SR * 0.68, 5);
      bg.addColorStop(0,   `rgba(${cr},${cg},${cb},${blinkA * 0.5})`);
      bg.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(cx + SR * 0.68, cy - SR * 0.68, 5, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();

      // ── Equator grid lines on sphere ───────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.clip();
      // Horizontal latitude line (equator)
      ctx.beginPath();
      ctx.ellipse(cx, cy, SR, SR * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.12)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      // Vertical meridian (rotating)
      ctx.beginPath();
      ctx.ellipse(cx, cy, SR * Math.abs(Math.cos(t * 0.4)) + 0.3, SR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.1)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const activeProvider = state.activeProvider;
  const label = PROVIDER_LABELS[activeProvider] ?? activeProvider.toUpperCase().slice(0, 6);
  const [cr, cg, cb] = HEALTH_RGB[health];
  const statusText =
    health === "checking" ? "···" :
    health === "healthy"  ? (latency != null ? `${latency}ms` : "OK") :
    health === "slow"     ? "SLOW" :
    health === "error"    ? "ERR" : "---";

  return (
    <motion.button
      onClick={runCheck}
      className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-xl cursor-pointer transition-all"
      style={{
        background: `rgba(${cr},${cg},${cb},0.05)`,
        border: `1px solid rgba(${cr},${cg},${cb},0.18)`,
        boxShadow: `0 0 12px rgba(${cr},${cg},${cb},0.08)`,
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      title={`مزوّد AI: ${activeProvider} — الحالة: ${statusText} — انقر لإعادة الفحص`}
      aria-label="فحص صحة المزود"
    >
      <canvas
        ref={canvasRef}
        style={{ width: 32, height: 32, imageRendering: "crisp-edges", flexShrink: 0 }}
      />
      <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
        <span style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", fontFamily: "monospace" }}>
          {label}
        </span>
        <span style={{ fontSize: "9px", fontWeight: 700, color: `rgba(${cr},${cg},${cb},0.9)`, fontFamily: "monospace", letterSpacing: "0.05em" }}>
          {statusText}
        </span>
      </div>
    </motion.button>
  );
}
