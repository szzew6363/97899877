import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "@/hooks/useDraggable";
import { useStore } from "@/lib/store";
import {
  X, Server, Cpu, Activity, RefreshCw, Play, Download,
  CheckCircle, Database, Zap, BarChart2,
} from "lucide-react";

interface EngineStatus {
  id: string; label: string; port: number; online: boolean;
  latencyMs: number | null; models: string[]; version: string | null;
  canInstall: boolean; installAvailable: boolean;
}

const C  = "#00e5ff";
const G  = "#22c55e";
const R  = "#ef4444";
const V  = "#a78bfa";
const A  = "#fbbf24";
const OR = "#f97316";
const PK = "#ec4899";
const IN = "#6366f1";

const ENG_COLOR: Record<string, string> = {
  ollama: C, lmstudio: V, jan: G,
  textgenwebui: OR, gpt4all: A, llamafile: PK, kobold: IN,
};

type Tab = "engines" | "models" | "perf";

export function LocalAIWindow({
  open, onClose, onOpenNexus, onOpenHub, onOpenBench,
}: {
  open: boolean; onClose: () => void;
  onOpenNexus: () => void; onOpenHub: () => void; onOpenBench: () => void;
}) {
  const { state, dispatch } = useStore();
  const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable(
    "mr7-local-ai-win", { x: 80, y: 70 }
  );

  const [engines,    setEngines]    = useState<EngineStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<Tab>("engines");
  const [tpsTarget,  setTpsTarget]  = useState(0);
  const [tpsHistory, setTpsHistory] = useState<number[]>(Array(40).fill(0));
  const [launching,  setLaunching]  = useState<string | null>(null);
  const [pullModel,  setPullModel]  = useState("");
  const [pulling,    setPulling]    = useState(false);
  const [pullLog,    setPullLog]    = useState("");

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const gaugeCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainRafRef    = useRef(0);
  const gaugeRafRef   = useRef(0);
  const frameRef      = useRef(0);
  const displayTpsRef = useRef(0);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const tpsTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const onlineCount  = engines.filter(e => e.online).length;
  const ollamaEng    = engines.find(e => e.id === "ollama");
  const ollamaModels = ollamaEng?.models ?? [];
  const mainColor    = onlineCount > 0 ? G : C;

  // ── Poll engine status ──────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/local-engines/status");
      if (r.ok) {
        const d = await r.json() as { engines: EngineStatus[] };
        setEngines(d.engines ?? []);
      }
    } catch { /* ignore */ }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, fetchStatus]);

  // ── TPS simulation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    tpsTimerRef.current = setInterval(() => {
      const latency = ollamaEng?.latencyMs ?? null;
      const online  = ollamaEng?.online ?? false;
      const est = online && latency
        ? Math.round((1000 / latency) * 5 * (0.8 + Math.random() * 0.4))
        : 0;
      const next = Math.max(0, Math.min(120, est));
      setTpsTarget(next);
      setTpsHistory(h => [...h.slice(1), next]);
    }, 600);
    return () => { if (tpsTimerRef.current) clearInterval(tpsTimerRef.current); };
  }, [open, ollamaEng]);

  // ── Main HUD canvas ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const cv = mainCanvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;

    const resize = () => {
      cv.width  = cv.offsetWidth  * devicePixelRatio;
      cv.height = cv.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    const PCount = 55;
    const particles = Array.from({ length: PCount }, () => ({
      x: Math.random() * 400, y: Math.random() * 110,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.25,
      r:  Math.random() * 1.4 + 0.4,
      phase: Math.random() * Math.PI * 2,
      col: [C, G, V, A][Math.floor(Math.random() * 4)],
    }));

    const nodes = Array.from({ length: 14 }, (_, i) => ({
      x: 20 + (i % 7) * 54,
      y: 22 + Math.floor(i / 7) * 68,
      phase: Math.random() * Math.PI * 2,
      col: [C, G, V][i % 3],
    }));

    const rings = [
      { rx: 48, ry: 12, spd: 0.012, ph: 0,   col: C  },
      { rx: 35, ry:  9, spd: 0.018, ph: 2.0,  col: V  },
      { rx: 22, ry:  6, spd: 0.025, ph: 4.2,  col: G  },
    ];

    const streams = Array.from({ length: 5 }, (_, i) => ({
      y0: 15 + i * 18, y1: 10 + i * 22, y2: 20 + i * 14, y3: 12 + i * 20,
      t: Math.random(),
      col: [C, G, V, A, OR][i],
    }));

    let isLive = true;
    const draw = () => {
      if (!isLive) return;
      frameRef.current++;
      const f = frameRef.current;
      const W = cv.offsetWidth, H = cv.offsetHeight;
      if (W < 1 || H < 1) { mainRafRef.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, W, H);

      // Base fill
      ctx.fillStyle = "rgba(1,5,8,0.96)";
      ctx.fillRect(0, 0, W, H);

      // Hex grid
      const hR = 14;
      const hW = hR * 2;
      const hH = Math.sqrt(3) * hR;
      ctx.save();
      for (let row = -1; row < Math.ceil(H / hH) + 1; row++) {
        for (let col = -1; col < Math.ceil(W / hW) + 2; col++) {
          const hx = col * hW * 0.75 + (row % 2 === 0 ? 0 : hW * 0.375);
          const hy = row * hH;
          const pulse = Math.sin(f * 0.018 + hx * 0.04 + hy * 0.06);
          ctx.globalAlpha = 0.013 + pulse * 0.018;
          ctx.strokeStyle = onlineCount > 0 ? G : C;
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          for (let s = 0; s < 6; s++) {
            const ang = (Math.PI / 3) * s - Math.PI / 6;
            const px  = hx + hR * Math.cos(ang);
            const py  = hy + hR * Math.sin(ang);
            if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
      ctx.restore();

      // Data stream bezier paths + moving dots
      streams.forEach(s => {
        s.t = (s.t + 0.004) % 1;
        const t = s.t, mt = 1 - t;
        const bx = mt*mt*mt*0 + 3*mt*mt*t*140 + 3*mt*t*t*280 + t*t*t*390;
        const by = mt*mt*mt*s.y0 + 3*mt*mt*t*s.y1 + 3*mt*t*t*s.y2 + t*t*t*s.y3;
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = s.col;
        ctx.lineWidth   = 0.8;
        ctx.beginPath(); ctx.moveTo(0, s.y0);
        ctx.bezierCurveTo(140, s.y1, 280, s.y2, 390, s.y3);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        const dg = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
        dg.addColorStop(0, s.col + "ff");
        dg.addColorStop(1, s.col + "00");
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Neural network edges
      ctx.lineWidth = 0.7;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[j].x - nodes[i].x;
          const dy   = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 120) continue;
          ctx.globalAlpha = (1 - dist / 120) * 0.15 *
            (0.5 + Math.sin(f * 0.025 + i * 0.7 + j * 0.5) * 0.5);
          ctx.strokeStyle = C;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Neural nodes
      nodes.forEach((n, i) => {
        const pulse = Math.sin(f * 0.04 + n.phase);
        const nr    = 2 + pulse * 1.5;
        ctx.globalAlpha = 0.5 + pulse * 0.5;
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, nr * 3);
        ng.addColorStop(0, n.col + "ff");
        ng.addColorStop(1, n.col + "00");
        ctx.fillStyle = ng;
        ctx.beginPath(); ctx.arc(n.x, n.y, nr * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = n.col;
        ctx.beginPath(); ctx.arc(n.x, n.y, nr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        void i;
      });

      // 3D orbital rings (right side)
      const rcx = W - 62, rcy = H / 2;
      rings.forEach(ring => {
        const angle = f * ring.spd + ring.ph;
        ctx.save();
        ctx.translate(rcx, rcy);
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = ring.col;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, 0.4, 0, Math.PI * 2);
        ctx.stroke();
        const dotp = { x: ring.rx * Math.cos(angle), y: ring.ry * Math.sin(angle) };
        ctx.globalAlpha = 1;
        ctx.shadowColor = ring.col;
        ctx.shadowBlur  = 10;
        const dg2 = ctx.createRadialGradient(dotp.x, dotp.y, 0, dotp.x, dotp.y, 5);
        dg2.addColorStop(0, ring.col + "ff");
        dg2.addColorStop(1, ring.col + "00");
        ctx.fillStyle = dg2;
        ctx.beginPath(); ctx.arc(dotp.x, dotp.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        for (let tr = 1; tr <= 8; tr++) {
          const ta = angle - tr * 0.15;
          ctx.globalAlpha = (1 - tr / 8) * 0.32;
          ctx.fillStyle   = ring.col;
          ctx.beginPath();
          ctx.arc(ring.rx * Math.cos(ta), ring.ry * Math.sin(ta), 2.5 - tr * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      });

      // Particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.phase += 0.03;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.globalAlpha = 0.25 + Math.sin(p.phase) * 0.25;
        ctx.fillStyle   = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Scanline
      const slY = ((f * 1.1) % (H + 3)) - 1.5;
      const slG = ctx.createLinearGradient(0, slY, 0, slY + 2.5);
      slG.addColorStop(0,   "rgba(0,229,255,0)");
      slG.addColorStop(0.5, onlineCount > 0 ? "rgba(34,197,94,0.18)" : "rgba(0,229,255,0.13)");
      slG.addColorStop(1,   "rgba(0,229,255,0)");
      ctx.fillStyle = slG;
      ctx.fillRect(0, slY, W, 2.5);

      // Bottom fade
      const fadeG = ctx.createLinearGradient(0, H - 22, 0, H);
      fadeG.addColorStop(0, "rgba(0,0,0,0)");
      fadeG.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = fadeG;
      ctx.fillRect(0, H - 22, W, 22);

      mainRafRef.current = requestAnimationFrame(draw);
    };
    mainRafRef.current = requestAnimationFrame(draw);
    return () => {
      isLive = false;
      cancelAnimationFrame(mainRafRef.current);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onlineCount]);

  // ── TPS Gauge canvas ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const cv = gaugeCanvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = devicePixelRatio;
    cv.width  = 120 * DPR;
    cv.height = 120 * DPR;
    ctx.scale(DPR, DPR);

    let gaugeLive = true;
    const loop = () => {
      if (!gaugeLive) return;
      displayTpsRef.current += (tpsTarget - displayTpsRef.current) * 0.07;
      const W = 120, H = 120, cx = W / 2, cy = H / 2;
      const r = 46;
      const startA = Math.PI * 0.75;
      const endA   = Math.PI * 2.25;
      const ratio  = Math.min(displayTpsRef.current / 120, 1);
      const arcEnd = startA + (endA - startA) * ratio;
      ctx.clearRect(0, 0, W, H);

      // Outer halo
      ctx.lineWidth   = 1;
      ctx.strokeStyle = "rgba(0,229,255,0.06)";
      ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.stroke();

      // Track
      ctx.lineWidth   = 9;
      ctx.strokeStyle = "rgba(0,229,255,0.07)";
      ctx.lineCap     = "round";
      ctx.beginPath(); ctx.arc(cx, cy, r, startA, endA); ctx.stroke();

      // Tick marks
      for (let i = 0; i <= 12; i++) {
        const ta     = startA + (endA - startA) * (i / 12);
        const isMaj  = i % 3 === 0;
        const inner  = isMaj ? r - 16 : r - 10;
        ctx.lineWidth   = isMaj ? 1.2 : 0.7;
        ctx.lineCap     = "butt";
        ctx.strokeStyle = `rgba(0,229,255,${isMaj ? 0.44 : 0.17})`;
        ctx.beginPath();
        ctx.moveTo(cx + (r + 6) * Math.cos(ta), cy + (r + 6) * Math.sin(ta));
        ctx.lineTo(cx + inner      * Math.cos(ta), cy + inner      * Math.sin(ta));
        ctx.stroke();
      }

      // Fill arc + glow
      if (ratio > 0.005) {
        const col   = ratio < 0.35 ? C : ratio < 0.65 ? A : G;
        ctx.lineWidth   = 9;
        ctx.lineCap     = "round";
        ctx.strokeStyle = col + "cc";
        ctx.shadowColor = col;
        ctx.shadowBlur  = 18;
        ctx.beginPath(); ctx.arc(cx, cy, r, startA, arcEnd); ctx.stroke();
        ctx.shadowBlur  = 0;

        // Tip glow
        const tipX = cx + r * Math.cos(arcEnd);
        const tipY = cy + r * Math.sin(arcEnd);
        const tg   = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 9);
        tg.addColorStop(0, col + "ff");
        tg.addColorStop(0.5, col + "88");
        tg.addColorStop(1,   col + "00");
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(tipX, tipY, 9, 0, Math.PI * 2); ctx.fill();
      }

      // Center value
      const disp = Math.round(displayTpsRef.current);
      const vCol = disp > 0 ? (ratio < 0.35 ? C : ratio < 0.65 ? A : G) : "rgba(255,255,255,0.2)";
      ctx.fillStyle    = vCol;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.font         = `bold 22px 'JetBrains Mono', monospace`;
      ctx.fillText(disp > 0 ? String(disp) : "—", cx, cy - 6);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font      = "8.5px monospace";
      ctx.fillText("TOK/SEC", cx, cy + 12);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font      = "7px monospace";
      ctx.fillText("MAX 120", cx, cy + 24);

      gaugeRafRef.current = requestAnimationFrame(loop);
    };
    gaugeRafRef.current = requestAnimationFrame(loop);
    return () => {
      gaugeLive = false;
      cancelAnimationFrame(gaugeRafRef.current);
    };
  }, [open, tpsTarget]);

  // ── Escape closes ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  // ── Launch engine via SSE ───────────────────────────────────────────────────
  const launchEngine = async (id: string) => {
    setLaunching(id);
    try {
      const r = await fetch(`/api/local-engines/launch/${id}`, { method: "POST" });
      if (r.body) {
        const reader = r.body.getReader();
        const dec    = new TextDecoder();
        for (;;) {
          const { done } = await reader.read();
          if (done) break;
          void dec; // consumed
        }
      }
    } catch { /* ignore */ }
    setLaunching(null);
    setTimeout(fetchStatus, 2000);
  };

  // ── Pull Ollama model ───────────────────────────────────────────────────────
  const pullOllamaModel = async () => {
    if (!pullModel.trim()) return;
    setPulling(true); setPullLog("بدء التحميل...");
    try {
      const r = await fetch("/api/local-engines/pull-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: pullModel.trim() }),
      });
      if (r.body) {
        const reader = r.body.getReader();
        const dec    = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = dec.decode(value);
          for (const line of text.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try {
              const ev = JSON.parse(line.slice(5)) as {
                type: string; status?: string; pct?: number; message?: string;
              };
              if (ev.type === "progress") {
                setPullLog(`${ev.status ?? "..."} ${ev.pct != null ? ev.pct + "%" : ""}`);
              } else if (ev.type === "success") {
                setPullLog("تم التحميل بنجاح");
              } else if (ev.type === "error") {
                setPullLog(`خطأ: ${ev.message ?? ""}`);
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) { setPullLog(`خطأ: ${String(e)}`); }
    setPulling(false);
    setTimeout(fetchStatus, 1500);
  };

  // ── Activate model ──────────────────────────────────────────────────────────
  const activateModel = (model: string, engineId: string) => {
    const endpoints: Record<string, string> = {
      ollama: "http://localhost:11434/v1", lmstudio: "http://localhost:1234/v1",
      jan: "http://localhost:1337/v1", gpt4all: "http://localhost:4891/v1",
      llamafile: "http://localhost:8081/v1", kobold: "http://localhost:5001/v1",
    };
    dispatch({ type: "SET_SETTINGS", patch: {
      useLocalModel: true, localModel: model,
      localEndpoint: endpoints[engineId] ?? "http://localhost:11434/v1",
    }});
  };

  if (!open) return null;

  const placeholder7 = Array.from({ length: 7 }, (_, i) => ({
    id:    ["ollama","lmstudio","jan","textgenwebui","gpt4all","llamafile","kobold"][i],
    label: ["Ollama","LM Studio","Jan","text-gen-webui","GPT4All","Llamafile","KoboldCPP"][i],
    port:  [11434,1234,1337,5000,4891,8081,5001][i],
    online: false, latencyMs: null, models: [], version: null,
    canInstall: [true,false,false,false,false,true,true][i],
    installAvailable: false,
  }));

  const displayEngines = engines.length ? engines : placeholder7;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="local-ai-window"
        ref={rootRef}
        style={{
          position: "fixed",
          left: pos.x, top: pos.y,
          width: 390,
          zIndex: 9100,
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(170deg,rgba(2,8,10,0.99) 0%,rgba(1,4,6,1) 100%)",
          border: `1px solid ${mainColor}22`,
          boxShadow: `0 0 80px ${mainColor}0a,0 0 200px rgba(0,0,0,0.9),0 40px 120px rgba(0,0,0,0.97),inset 0 1px 0 ${C}12`,
        }}
        initial={{ opacity: 0, scale: 0.92, y: -18 }}
        animate={{ opacity: 1,  scale: 1,    y: 0   }}
        exit={{    opacity: 0,  scale: 0.92, y: -18 }}
        transition={{ duration: 0.22, ease: [0.16,1,0.3,1] }}
      >
        {/* ── 3D HUD Header (draggable handle) ── */}
        <div
          className="relative select-none cursor-move"
          style={{ height: 112 }}
          onMouseDown={onDragMouseDown}
          onTouchStart={onDragTouchStart}
        >
          <canvas ref={mainCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {/* Overlay content */}
          <div className="relative z-10 flex items-start justify-between p-3 h-full" style={{ pointerEvents: "none" }}>
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="text-[6px] font-black tracking-[0.42em] uppercase mb-1.5" style={{ color: C + "44" }}>
                  LOCAL AI ENGINE SUITE
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: onlineCount > 0 ? G : R,
                      boxShadow:  `0 0 8px ${onlineCount > 0 ? G : R}`,
                    }}
                    animate={{ opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.3, repeat: Infinity }}
                  />
                  <span className="text-[13px] font-black" style={{ color: onlineCount > 0 ? G : "rgba(255,255,255,0.6)" }}>
                    {onlineCount}/{engines.length || 7} محرك متصل
                  </span>
                </div>
                {ollamaEng?.online && ollamaEng.version && (
                  <div className="text-[8.5px] font-mono mt-1" style={{ color: C + "44" }}>
                    Ollama v{ollamaEng.version} • :{ollamaEng.port}
                  </div>
                )}
              </div>
              {/* Engine mini-bar */}
              <div className="flex gap-1 pb-2">
                {displayEngines.map((e, i) => {
                  const ec = ENG_COLOR[e.id] ?? C;
                  return (
                    <motion.div key={i}
                      className="flex-1 h-0.5 rounded-full"
                      style={{ background: e.online ? ec : "rgba(255,255,255,0.08)" }}
                      animate={e.online ? { opacity: [0.5,1,0.5] } : {}}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.1 }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Close button */}
            <div style={{ pointerEvents: "auto" }}>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: R }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.28)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchStatus}
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono z-10 transition-all"
            style={{ background: refreshing ? C + "22" : "rgba(0,229,255,0.07)", border: `1px solid ${C}1e`, color: C + "88" }}
          >
            <motion.div
              animate={{ rotate: refreshing ? 360 : 0 }}
              transition={{ duration: 0.6, ease: "linear", repeat: refreshing ? Infinity : 0 }}
            >
              <RefreshCw size={8} />
            </motion.div>
            {refreshing ? "جارٍ..." : "تحديث"}
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex" style={{ borderBottom: `1px solid ${C}10`, borderTop: `1px solid ${C}0c` }}>
          {([
            ["engines", "ENGINES", <Server size={9} key="s" />],
            ["models",  "MODELS",  <Database size={9} key="d" />],
            ["perf",    "PERF",    <Activity size={9} key="a" />],
          ] as [Tab, string, React.ReactNode][]).map(([t, label, icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 flex items-center justify-center gap-1.5 text-[8.5px] font-black tracking-widest uppercase transition-all"
              style={{
                color: tab === t ? C : "rgba(255,255,255,0.28)",
                borderBottom: tab === t ? `2px solid ${C}` : "2px solid transparent",
                background:   tab === t ? C + "06" : "transparent",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="overflow-y-auto scrollbar-none" style={{ maxHeight: 340 }}>

          {/* ENGINES TAB */}
          {tab === "engines" && (
            <div className="p-2.5 flex flex-col gap-1.5">
              {displayEngines.map(eng => {
                const ec      = ENG_COLOR[eng.id] ?? C;
                const isLaunch = launching === eng.id;
                return (
                  <div key={eng.id}
                    className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 transition-all"
                    style={{
                      background: eng.online ? ec + "0a" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${eng.online ? ec + "28" : "rgba(255,255,255,0.055)"}`,
                    }}
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: eng.online ? ec : "rgba(255,255,255,0.14)", boxShadow: eng.online ? `0 0 7px ${ec}` : "none" }}
                      animate={eng.online ? { scale: [0.88, 1.14, 0.88] } : {}}
                      transition={{ duration: 1.7, repeat: Infinity }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black" style={{ color: eng.online ? ec : "rgba(255,255,255,0.45)" }}>
                          {eng.label}
                        </span>
                        <span className="text-[7px] font-mono px-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.22)" }}>
                          :{eng.port}
                        </span>
                        {eng.online && eng.latencyMs != null && (
                          <span className="text-[7.5px] font-mono ml-auto" style={{ color: eng.latencyMs < 50 ? G : eng.latencyMs < 200 ? A : R }}>
                            {eng.latencyMs}ms
                          </span>
                        )}
                      </div>
                      {eng.online && eng.models.length > 0 && (
                        <div className="text-[7.5px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.32)" }}>
                          {eng.models.length} نموذج: {eng.models.slice(0, 2).join(", ")}{eng.models.length > 2 ? ` +${eng.models.length - 2}` : ""}
                        </div>
                      )}
                      {!eng.online && (
                        <div className="text-[7.5px] mt-0.5" style={{ color: "rgba(255,255,255,0.18)" }}>غير متصل</div>
                      )}
                    </div>
                    {!eng.online && (
                      <button
                        onClick={() => launchEngine(eng.id)}
                        disabled={!!launching}
                        className="px-2.5 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 flex-shrink-0 transition-all"
                        style={{
                          background: ec + "18", border: `1px solid ${ec}30`, color: ec,
                          opacity: !!launching && !isLaunch ? 0.45 : 1,
                        }}
                      >
                        <motion.div
                          animate={isLaunch ? { rotate: 360 } : {}}
                          transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                        >
                          {isLaunch ? <RefreshCw size={8} /> : <Play size={8} />}
                        </motion.div>
                        {isLaunch ? "..." : "تشغيل"}
                      </button>
                    )}
                    {eng.online && eng.models.length > 0 && (
                      <button
                        onClick={() => activateModel(eng.models[0], eng.id)}
                        className="px-2 py-1 rounded-lg text-[8px] font-black flex-shrink-0 transition-all"
                        style={{ background: ec + "15", border: `1px solid ${ec}28`, color: ec }}
                      >
                        <Zap size={8} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* MODELS TAB */}
          {tab === "models" && (
            <div className="p-2.5 flex flex-col gap-2.5">
              {/* Pull model */}
              <div className="rounded-xl p-2.5" style={{ background: C + "06", border: `1px solid ${C}18` }}>
                <div className="text-[7px] font-black tracking-widest uppercase mb-2" style={{ color: C + "55" }}>
                  تحميل نموذج Ollama جديد
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={pullModel}
                    onChange={e => setPullModel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !pulling && pullOllamaModel()}
                    placeholder="مثال: llama3.2:3b"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono outline-none"
                    style={{
                      background: "rgba(0,0,0,0.4)", border: `1px solid ${C}22`,
                      color: "rgba(255,255,255,0.8)", caretColor: C,
                    }}
                  />
                  <button
                    onClick={pullOllamaModel}
                    disabled={pulling || !pullModel.trim()}
                    className="px-2.5 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all"
                    style={{
                      background: pulling ? C + "15" : C + "22",
                      border: `1px solid ${C}33`, color: C,
                      opacity: !pullModel.trim() ? 0.4 : 1,
                    }}
                  >
                    <motion.div
                      animate={pulling ? { rotate: 360 } : {}}
                      transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                    >
                      {pulling ? <RefreshCw size={9} /> : <Download size={9} />}
                    </motion.div>
                    {pulling ? "..." : "تحميل"}
                  </button>
                </div>
                {pullLog && (
                  <div className="text-[8px] font-mono mt-1.5 px-0.5" style={{ color: pullLog.startsWith("خطأ") ? R : G }}>
                    {pullLog}
                  </div>
                )}
              </div>

              {/* Ollama models */}
              {!ollamaEng?.online ? (
                <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.2)" }}>
                  <Server size={28} className="mx-auto mb-2 opacity-25" />
                  <div className="text-[9px] font-mono">Ollama غير متصل</div>
                  <div className="text-[8px] mt-1 opacity-60">شغّل المحرك من تبويب ENGINES</div>
                </div>
              ) : ollamaModels.length === 0 ? (
                <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.2)" }}>
                  <Database size={28} className="mx-auto mb-2 opacity-25" />
                  <div className="text-[9px] font-mono">لا توجد نماذج محلية</div>
                  <div className="text-[8px] mt-1 opacity-60">حمّل نموذجاً أعلاه</div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[7px] font-black tracking-widest uppercase px-0.5 mb-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>
                    نماذج Ollama ({ollamaModels.length})
                  </div>
                  {ollamaModels.map(model => {
                    const isActive = state.settings.useLocalModel && state.settings.localModel === model;
                    return (
                      <div key={model}
                        className="rounded-xl flex items-center gap-2 px-3 py-2 transition-all"
                        style={{
                          background: isActive ? G + "12" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isActive ? G + "38" : "rgba(255,255,255,0.065)"}`,
                        }}
                      >
                        {isActive && (
                          <motion.div animate={{ scale: [0.8,1.2,0.8] }} transition={{ duration: 1.4, repeat: Infinity }}>
                            <CheckCircle size={10} style={{ color: G }} />
                          </motion.div>
                        )}
                        <span className="flex-1 text-[10px] font-mono truncate" style={{ color: isActive ? G : "rgba(255,255,255,0.65)" }}>
                          {model}
                        </span>
                        <button
                          onClick={() => activateModel(model, "ollama")}
                          className="px-2.5 py-0.5 rounded-lg text-[8px] font-black flex-shrink-0 transition-all"
                          style={{
                            background: isActive ? G + "20" : C + "10",
                            border: `1px solid ${isActive ? G + "40" : C + "25"}`,
                            color: isActive ? G : C,
                          }}
                        >
                          {isActive ? "مُفعَّل" : "تفعيل"}
                        </button>
                      </div>
                    );
                  })}

                  {/* Models from other online engines */}
                  {engines.filter(e => e.id !== "ollama" && e.online && e.models.length > 0).map(eng => {
                    const ec = ENG_COLOR[eng.id] ?? C;
                    return (
                      <div key={eng.id}>
                        <div className="text-[7px] font-black tracking-widest uppercase px-0.5 mt-2 mb-1" style={{ color: ec + "55" }}>
                          {eng.label} ({eng.models.length})
                        </div>
                        {eng.models.map(model => {
                          const isAct = state.settings.useLocalModel && state.settings.localModel === model;
                          return (
                            <div key={model}
                              className="rounded-xl flex items-center gap-2 px-3 py-2 mb-1 transition-all"
                              style={{
                                background: isAct ? ec + "10" : "rgba(255,255,255,0.02)",
                                border: `1px solid ${isAct ? ec + "30" : "rgba(255,255,255,0.055)"}`,
                              }}
                            >
                              <span className="flex-1 text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.58)" }}>
                                {model}
                              </span>
                              <button
                                onClick={() => activateModel(model, eng.id)}
                                className="px-2.5 py-0.5 rounded-lg text-[8px] font-black flex-shrink-0"
                                style={{ background: ec + "18", border: `1px solid ${ec}30`, color: ec }}
                              >
                                تفعيل
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PERF TAB */}
          {tab === "perf" && (
            <div className="p-2.5 flex flex-col gap-2.5">
              {/* TPS gauge + stat cards */}
              <div className="flex items-center gap-3">
                <canvas
                  ref={gaugeCanvasRef}
                  style={{ width: 120, height: 120, flexShrink: 0, borderRadius: 12 }}
                />
                <div className="flex-1 flex flex-col gap-1.5">
                  {[
                    {
                      label: "LATENCY",
                      value: ollamaEng?.latencyMs != null ? `${ollamaEng.latencyMs}ms` : "—",
                      col:   ollamaEng?.latencyMs != null
                        ? (ollamaEng.latencyMs < 50 ? G : ollamaEng.latencyMs < 200 ? A : R)
                        : "rgba(255,255,255,0.2)",
                    },
                    {
                      label: "MODELS",
                      value: String(engines.reduce((s, e) => s + e.models.length, 0)),
                      col:   C,
                    },
                    {
                      label: "ONLINE",
                      value: `${onlineCount}/${engines.length || 7}`,
                      col:   onlineCount > 0 ? G : "rgba(255,255,255,0.2)",
                    },
                  ].map(card => (
                    <div key={card.label}
                      className="rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.055)" }}
                    >
                      <div className="text-[6.5px] tracking-widest uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>
                        {card.label}
                      </div>
                      <div className="text-[15px] font-black font-mono leading-none" style={{ color: card.col }}>
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TPS Sparkline */}
              <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[6.5px] font-black tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>
                    TOKEN THROUGHPUT
                  </span>
                  <span className="text-[8px] font-mono" style={{ color: G + "88" }}>
                    {Math.round(tpsTarget)} tok/s
                  </span>
                </div>
                <svg width="100%" height="44" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="mr7-spark-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={G} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={G} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const max  = Math.max(...tpsHistory, 8);
                    const pts  = tpsHistory.map((v, i) => ({
                      x: (i / (tpsHistory.length - 1)) * 100,
                      y: 44 - (v / max) * 40,
                    }));
                    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x}%,${p.y}`).join(" ");
                    const fill = `${path} L100%,44 L0,44 Z`;
                    return (
                      <>
                        <path d={fill} fill="url(#mr7-spark-fill)" />
                        <path d={path} fill="none" stroke={G} strokeWidth="1.5" strokeLinejoin="round" />
                        {pts.length > 0 && (
                          <circle cx={`${pts[pts.length - 1].x}%`} cy={pts[pts.length - 1].y} r="3" fill={G}>
                            <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite" />
                          </circle>
                        )}
                      </>
                    );
                  })()}
                </svg>
                <div className="flex justify-between text-[6.5px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.18)" }}>
                  <span>−20s</span><span>LIVE</span>
                </div>
              </div>

              {/* Engine latency bars */}
              <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
                <div className="text-[6.5px] font-black tracking-widest uppercase mb-2" style={{ color: "rgba(255,255,255,0.22)" }}>
                  ENGINE PING
                </div>
                {displayEngines.filter(e => e.online).length > 0 ? (
                  displayEngines.filter(e => e.online).map(eng => {
                    const ec  = ENG_COLOR[eng.id] ?? C;
                    const lat = eng.latencyMs ?? 0;
                    const bw  = Math.min((lat / 300) * 100, 100);
                    return (
                      <div key={eng.id} className="flex items-center gap-2 mb-1.5">
                        <span className="text-[8px] w-20 truncate font-mono" style={{ color: "rgba(255,255,255,0.38)" }}>
                          {eng.label}
                        </span>
                        <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${bw}%`, background: ec, boxShadow: `0 0 4px ${ec}` }} />
                        </div>
                        <span className="text-[8px] font-mono w-10 text-right" style={{ color: ec }}>{lat}ms</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[9px] text-center py-2 font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
                    لا يوجد محركات متصلة
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer action buttons ── */}
        <div className="flex gap-1.5 p-2.5" style={{ borderTop: `1px solid ${C}0c` }}>
          {([
            { label: "NEXUS", col: C,  icon: <Server   size={9} />, fn: () => { onClose(); onOpenNexus(); } },
            { label: "HUB",   col: V,  icon: <Cpu      size={9} />, fn: () => { onClose(); onOpenHub();   } },
            { label: "BENCH", col: A,  icon: <BarChart2 size={9} />, fn: () => { onClose(); onOpenBench(); } },
          ]).map(btn => (
            <button key={btn.label}
              onClick={btn.fn}
              className="flex-1 py-2 rounded-xl text-[8.5px] font-black tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all"
              style={{ background: btn.col + "0f", border: `1px solid ${btn.col}25`, color: btn.col }}
              onMouseEnter={e => { e.currentTarget.style.background = btn.col + "22"; }}
              onMouseLeave={e => { e.currentTarget.style.background = btn.col + "0f"; }}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>

        {/* Corner brackets */}
        {(["top-[6px] left-[6px] border-t border-l","top-[6px] right-[6px] border-t border-r",
           "bottom-[6px] left-[6px] border-b border-l","bottom-[6px] right-[6px] border-b border-r",
        ] as const).map((cls, i) => (
          <span key={i} className={`absolute ${cls} w-3 h-3 pointer-events-none`}
            style={{ borderColor: C + (i < 2 ? "33" : "1a") }} />
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
