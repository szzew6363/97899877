import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BOOT_LOG = [
  { ms: 0,    text: "[ BIOS ] KaliGPT Neural Engine v3.0 — STARTING...",      col: "#00ff41" },
  { ms: 160,  text: "[ MEM  ] Allocating 3.2TB threat intelligence cache",      col: "#00ff41" },
  { ms: 290,  text: "[ NET  ] Establishing quantum-encrypted channels... OK",   col: "#00ff41" },
  { ms: 430,  text: "[ AI   ] Loading 105-brain council framework... OK",       col: "#00ff41" },
  { ms: 560,  text: "[ PERS ] Persona matrix: 16 identities mounted... OK",    col: "#00ff41" },
  { ms: 700,  text: "[ HUB  ] Arsenal Hub: 18 modules armed and ready",        col: "#fbbf24" },
  { ms: 840,  text: "[ PRV  ] Provider mesh: OpenAI · Anthropic · Groq · ON",  col: "#00e5ff" },
  { ms: 980,  text: "[ OSINT] Dark-web indexers synced. 0 new CVEs (today)",   col: "#a78bfa" },
  { ms: 1120, text: "[ SEC  ] Zero-trust layer active. Threat level: GREEN",    col: "#22c55e" },
  { ms: 1260, text: "[ PIPE ] Chain Builder: 0 active rules. Pipeline READY",  col: "#00e5ff" },
  { ms: 1400, text: "[ CORE ] All subsystems nominal. Booting UI shell...",     col: "#00ff41" },
  { ms: 1540, text: "[ DONE ] ██████████ 100% — WELCOME, OPERATOR.",            col: "#e21227" },
];

const MODULES_FLASH = [
  "KaliAgent","NEXUS","JARVIS","Parseltongue","RAGFlow","OpenGravity IDE",
  "TeamAgent","Skills Lib","AgentOS","GeminiCLI","Hermes","Graphify",
  "GetShitDone","CCSwitch","UI/UX Pro","CareerOps","ABTop","AwesomeLLM",
];

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);
  const [lines, setLines] = useState<{ text: string; col: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [modIdx, setModIdx] = useState(0);
  const [phase, setPhase] = useState<"boot"|"modules"|"done">("boot");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const dismiss = useCallback(() => {
    setShow(false);
    setTimeout(onDone, 600);
  }, [onDone]);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LOG.forEach(({ ms, text, col }) => {
      timers.push(setTimeout(() => {
        setLines(l => [...l, { text, col }]);
        setProgress(p => Math.min(100, p + Math.round(100 / BOOT_LOG.length)));
      }, ms));
    });

    timers.push(setTimeout(() => setPhase("modules"), 1600));
    MODULES_FLASH.forEach((_, i) => {
      timers.push(setTimeout(() => setModIdx(i + 1), 1650 + i * 70));
    });
    timers.push(setTimeout(() => setPhase("done"), 1650 + MODULES_FLASH.length * 70));
    timers.push(setTimeout(dismiss, 2600));

    return () => timers.forEach(clearTimeout);
  }, [dismiss]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    const W = canvas.width = 260;
    const H = canvas.height = 260;
    let angle = 0;
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      angle += 0.018;
      t += 0.04;

      const cx = W / 2, cy = H / 2, R = 100;

      const rings = [
        { r: R, color: "rgba(226,18,39,", tilt: 0 },
        { r: R * 0.75, color: "rgba(0,229,255,", tilt: Math.PI / 4 },
        { r: R * 0.5, color: "rgba(167,139,250,", tilt: Math.PI / 2.5 },
      ];

      rings.forEach(({ r, color, tilt }) => {
        for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += Math.PI / 5) {
          const yr = r * Math.sin(lat);
          const r2 = r * Math.cos(lat);
          ctx.beginPath();
          let first = true;
          for (let lon = 0; lon <= Math.PI * 2 + 0.1; lon += 0.12) {
            const x3 = r2 * Math.cos(lon + angle + tilt);
            const z3 = r2 * Math.sin(lon + angle + tilt);
            const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
            const xF = x3;
            const yF = yr * cosT - z3 * sinT;
            const zF = yr * sinT + z3 * cosT;
            const persp = 320 / (320 + zF);
            const px = cx + xF * persp;
            const py = cy + yF * persp;
            const alpha = Math.max(0, (zF / r + 1) / 2);
            ctx.strokeStyle = `${color}${(alpha * 0.7).toFixed(2)})`;
            ctx.lineWidth = 0.8;
            if (first) { ctx.moveTo(px, py); first = false; }
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      });

      const nPts = 120;
      for (let i = 0; i < nPts; i++) {
        const phi = Math.acos(1 - 2 * i / nPts);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + angle * 2;
        const x = R * Math.sin(phi) * Math.cos(theta);
        const y = R * Math.sin(phi) * Math.sin(theta);
        const z = R * Math.cos(phi);
        const persp = 320 / (320 + z);
        const px = cx + x * persp;
        const py = cy + y * persp;
        const brightness = (z / R + 1) / 2;
        const pulse = 0.5 + 0.5 * Math.sin(t + i * 0.3);
        const r = 1.5 * persp * (0.5 + 0.5 * pulse);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${(brightness * 0.8 * pulse).toFixed(2)})`;
        ctx.fill();
      }

      const numOrbit = 6;
      for (let i = 0; i < numOrbit; i++) {
        const orbitAngle = angle * (1.5 + i * 0.2) + (Math.PI * 2 / numOrbit) * i;
        const orR = R * (0.4 + i * 0.1);
        const ox = cx + orR * Math.cos(orbitAngle);
        const oy = cy + orR * Math.sin(orbitAngle) * 0.45;
        const oz = orR * Math.sin(orbitAngle);
        const persp2 = 320 / (320 + oz);
        const colors = ["#e21227","#00e5ff","#a78bfa","#22c55e","#fbbf24","#f97316"];
        ctx.beginPath();
        ctx.arc(ox * persp2 + cx * (1 - persp2), oy * persp2 + cy * (1 - persp2), 3 * persp2, 0, Math.PI * 2);
        ctx.fillStyle = colors[i % colors.length];
        ctx.shadowColor = colors[i % colors.length];
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[99999] flex overflow-hidden"
          style={{ background: "#000000" }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          onClick={dismiss}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(226,18,39,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(226,18,39,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

          {/* Scan line */}
          <motion.div className="absolute inset-x-0 h-px pointer-events-none z-10"
            style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.8),rgba(0,229,255,0.4),rgba(226,18,39,0.8),transparent)" }}
            animate={{ top: ["0%","100%","0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />

          {/* Left panel — 3D sphere + logo */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <motion.canvas
              ref={canvasRef}
              className="mb-4"
              initial={{ scale: 0.6, opacity: 0, rotateY: -30 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: "block" }}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center mb-4"
            >
              <div className="text-5xl font-black tracking-widest mb-1">
                <motion.span
                  style={{ color: "#e21227" }}
                  animate={{ textShadow: ["0 0 10px #e21227", "0 0 40px #e21227", "0 0 10px #e21227"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}>
                  KALI
                </motion.span>
                <span className="text-white">GPT</span>
              </div>
              <div className="text-[10px] font-mono tracking-[0.45em] uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>
                AUTONOMOUS CYBER AI · v3.0 · ARSENAL MODE
              </div>
            </motion.div>

            {/* Progress bar */}
            <div className="w-56 h-1 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #e21227, #ff6b6b, #00e5ff)" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15, ease: "easeOut" }} />
              <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)", animation: "pulse 2s infinite" }} />
            </div>
            <div className="mt-1.5 font-mono text-[8px]" style={{ color: "rgba(226,18,39,0.65)" }}>{progress}%</div>

            {/* Modules flash */}
            <AnimatePresence mode="wait">
              {phase === "modules" && modIdx < MODULES_FLASH.length && (
                <motion.div key={modIdx}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.06 }}
                  className="mt-3 text-[9px] font-black font-mono tracking-widest"
                  style={{ color: "#00e5ff" }}>
                  LOADING: {MODULES_FLASH[modIdx] ?? ""}
                </motion.div>
              )}
              {phase === "done" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 text-[10px] font-black font-mono tracking-widest"
                  style={{ color: "#22c55e" }}>
                  ALL SYSTEMS ONLINE
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
              انقر في أي مكان للتخطي
            </div>
          </div>

          {/* Right panel — boot log */}
          <div className="w-80 flex flex-col justify-center border-l p-5 font-mono overflow-hidden"
            style={{ borderColor: "rgba(226,18,39,0.15)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
            <div className="text-[7px] tracking-[0.35em] uppercase mb-3 font-bold" style={{ color: "rgba(226,18,39,0.55)" }}>
              ▶ BOOT SEQUENCE LOG
            </div>
            <div className="space-y-1.5 overflow-hidden">
              {lines.map((ln, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12 }}
                  className="text-[9px] leading-snug"
                  style={{ color: ln.col, textShadow: `0 0 6px ${ln.col}66` }}>
                  {ln.text}
                </motion.div>
              ))}
              <motion.div
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                className="text-[9px]" style={{ color: "#00ff41" }}>_</motion.div>
            </div>

            {/* Module grid flash */}
            {phase !== "boot" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                <div className="text-[7px] tracking-widest uppercase mb-2 font-bold" style={{ color: "rgba(0,229,255,0.45)" }}>
                  ARSENAL MODULES
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MODULES_FLASH.map((mod, i) => (
                    <motion.div key={mod}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: i < modIdx ? 1 : 0.15, scale: i < modIdx ? 1 : 0.9 }}
                      transition={{ duration: 0.12 }}
                      className="text-[7px] font-bold px-1 py-0.5 rounded text-center truncate"
                      style={{
                        background: i < modIdx ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${i < modIdx ? "rgba(0,229,255,0.25)" : "rgba(255,255,255,0.04)"}`,
                        color: i < modIdx ? "#00e5ff" : "rgba(255,255,255,0.15)",
                      }}>
                      {mod.split(" ")[0]}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
