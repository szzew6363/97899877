import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hand, Camera, Cpu, Zap, Eye, Activity, Radio, Target, ChevronRight, AlertTriangle } from "lucide-react";

interface GestureControlModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Gesture = {
  id: string; name: string; icon: string;
  action: string; confidence: number; color: string;
  fingers: boolean[]; description: string;
};

const GESTURES: Gesture[] = [
  { id: "open", name: "OPEN HAND", icon: "✋", action: "Pause / Halt", confidence: 0, color: "#10b981", fingers: [true,true,true,true,true], description: "All 5 fingers extended — system pause command" },
  { id: "point", name: "INDEX POINT", icon: "👆", action: "Select / Confirm", confidence: 0, color: "#00e5ff", fingers: [false,true,false,false,false], description: "Single index finger — targeting and selection" },
  { id: "fist", name: "CLOSED FIST", icon: "✊", action: "Emergency Stop", confidence: 0, color: "#e21227", fingers: [false,false,false,false,false], description: "All fingers closed — immediate shutdown command" },
  { id: "peace", name: "PEACE SIGN", icon: "✌", action: "Toggle / Switch", confidence: 0, color: "#a78bfa", fingers: [false,true,true,false,false], description: "Index + middle — dual-toggle operation" },
  { id: "thumbsup", name: "THUMBS UP", icon: "👍", action: "Execute / Run", confidence: 0, color: "#fbbf24", fingers: [true,false,false,false,false], description: "Thumb extended — confirm execution" },
  { id: "pinch", name: "PINCH", icon: "🤌", action: "Zoom / Scale", confidence: 0, color: "#f97316", fingers: [true,true,false,false,false], description: "Thumb + index — zoom and scale control" },
];

const HAND_POINTS = 21;

type Landmark = { x: number; y: number; z: number };

function randomHandLandmarks(gestureId: string): Landmark[] {
  const base: Landmark[] = Array.from({ length: HAND_POINTS }, (_, i) => ({
    x: 0.3 + (i % 5) * 0.08 + Math.random() * 0.02,
    y: 0.2 + Math.floor(i / 5) * 0.12 + Math.random() * 0.02,
    z: Math.random() * 0.01,
  }));

  // Wrist
  base[0] = { x: 0.5 + Math.random() * 0.02, y: 0.82, z: 0 };
  // Palm
  [1,5,9,13,17].forEach((i,j) => {
    base[i] = { x: 0.38 + j * 0.06, y: 0.68, z: -0.01 };
  });

  const fingerExtend = (start: number, extended: boolean) => {
    for (let k = 1; k <= 3; k++) {
      base[start + k] = {
        x: base[start].x + (Math.random() - 0.5) * 0.02,
        y: base[start].y - (extended ? k * 0.1 : k * 0.04 + 0.05),
        z: extended ? -k * 0.02 : k * 0.01,
      };
    }
  };

  const g = GESTURES.find(g => g.id === gestureId);
  if (g) {
    [4, 8, 12, 16, 20].forEach((tip, fi) => {
      fingerExtend(tip - 3, g.fingers[fi]);
    });
  }

  return base;
}

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4], // thumb
  [0,5],[5,6],[6,7],[7,8], // index
  [5,9],[9,10],[10,11],[11,12], // middle
  [9,13],[13,14],[14,15],[15,16], // ring
  [13,17],[17,18],[18,19],[19,20], // pinky
  [0,17],[0,5], // palm
];

export function GestureControlModal({ open, onOpenChange }: GestureControlModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeGesture, setActiveGesture] = useState<Gesture | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [fps, setFps] = useState(30);
  const [confidence, setConfidence] = useState(0);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [log, setLog] = useState<{ gesture: string; action: string; time: string; color: string }[]>([]);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef(0);

  const drawHand = useCallback((lm: Landmark[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#080820";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(0,229,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (!lm.length) return;

    const toX = (lx: number) => lx * W;
    const toY = (ly: number) => ly * H;

    // Connections
    CONNECTIONS.forEach(([a, b]) => {
      const p1 = lm[a], p2 = lm[b];
      if (!p1 || !p2) return;
      ctx.beginPath();
      ctx.moveTo(toX(p1.x), toY(p1.y));
      ctx.lineTo(toX(p2.x), toY(p2.y));
      ctx.strokeStyle = activeGesture ? `${activeGesture.color}80` : "rgba(0,229,255,0.5)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    // Landmark dots
    lm.forEach((pt, i) => {
      const isTip = [4,8,12,16,20].includes(i);
      const isWrist = i === 0;
      ctx.beginPath();
      ctx.arc(toX(pt.x), toY(pt.y), isWrist ? 7 : isTip ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = activeGesture
        ? (isTip ? activeGesture.color : `${activeGesture.color}80`)
        : (isTip ? "#00e5ff" : "rgba(0,229,255,0.6)");
      ctx.fill();
      // Glow for tips
      if (isTip && activeGesture) {
        ctx.shadowColor = activeGesture.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(toX(pt.x), toY(pt.y), 3, 0, Math.PI * 2);
        ctx.fillStyle = activeGesture.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Label
    if (activeGesture) {
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = activeGesture.color;
      ctx.fillText(`${activeGesture.name} · ${Math.round(confidence * 100)}%`, 12, H - 30);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "10px monospace";
      ctx.fillText(activeGesture.action, 12, H - 14);
    }

    // Crosshair
    const wrist = lm[0];
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(toX(wrist.x), 0); ctx.lineTo(toX(wrist.x), H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, toY(wrist.y)); ctx.lineTo(W, toY(wrist.y)); ctx.stroke();
    ctx.setLineDash([]);
  }, [activeGesture, confidence]);

  const autoDetect = useCallback(() => {
    const g = GESTURES[Math.floor(Math.random() * GESTURES.length)];
    const lm = randomHandLandmarks(g.id);
    const conf = 0.75 + Math.random() * 0.24;
    setLandmarks(lm);
    setActiveGesture(g);
    setConfidence(conf);
    setFps(28 + Math.floor(Math.random() * 5));
    setLog(prev => [{
      gesture: g.name, action: g.action, color: g.color,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
    }, ...prev].slice(0, 8));
  }, []);

  useEffect(() => {
    if (!open || !isActive) return;
    timerRef.current = setInterval(autoDetect, 1800);
    autoDetect();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open, isActive, autoDetect]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(() => drawHand(landmarks));
    return () => cancelAnimationFrame(frameRef.current);
  }, [landmarks, activeGesture, confidence, drawHand]);

  useEffect(() => {
    if (!open) { setIsActive(false); setActiveGesture(null); setLandmarks([]); setLog([]); }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#1a1a1a]"
            style={{ background: "#050510" }}>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[#111] shrink-0"
              style={{ background: "rgba(0,229,255,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)" }}>
                  <Hand className="w-4 h-4" style={{ color: "#00e5ff" }} />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] font-mono" style={{ color: "#00e5ff" }}>GESTURE CONTROL</div>
                  <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>NEURAL HAND TRACKING · 21-LANDMARK MODEL · 30+ FPS</div>
                </div>
                {isActive && (
                  <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded" style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}>
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" animate={{ opacity: [1,0.3,1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                    <span className="text-[9px] font-mono" style={{ color: "#00e5ff" }}>TRACKING · {fps} FPS</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsActive(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:opacity-80"
                  style={{ background: isActive ? "rgba(226,18,39,0.12)" : "rgba(0,229,255,0.12)", border: `1px solid ${isActive ? "rgba(226,18,39,0.35)" : "rgba(0,229,255,0.35)"}`, color: isActive ? "#e21227" : "#00e5ff" }}>
                  {isActive ? <><Eye className="w-3 h-3" /> STOP</> : <><Camera className="w-3 h-3" /> START TRACKING</>}
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Camera view */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 relative p-4">
                  <canvas ref={canvasRef} width={600} height={420}
                    className="w-full h-full rounded-xl"
                    style={{ border: "1px solid rgba(0,229,255,0.15)" }} />
                  {!isActive && (
                    <div className="absolute inset-4 flex flex-col items-center justify-center rounded-xl"
                      style={{ background: "rgba(0,0,0,0.7)" }}>
                      <Camera className="w-12 h-12 mb-4" style={{ color: "rgba(0,229,255,0.2)" }} />
                      <div className="text-[12px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>Neural Hand Tracking</div>
                      <div className="text-[10px] font-mono mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Click START TRACKING to activate simulation</div>
                    </div>
                  )}
                  {isActive && activeGesture && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="absolute top-7 right-7 p-3 rounded-xl text-right"
                      style={{ background: `${activeGesture.color}12`, border: `1px solid ${activeGesture.color}35`, backdropFilter: "blur(8px)" }}>
                      <div className="text-2xl">{activeGesture.icon}</div>
                      <div className="text-[10px] font-black font-mono mt-1" style={{ color: activeGesture.color }}>{activeGesture.name}</div>
                      <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{Math.round(confidence * 100)}% conf.</div>
                    </motion.div>
                  )}
                </div>
                {/* Finger state */}
                <div className="px-4 pb-3 flex items-center gap-3 shrink-0">
                  <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>FINGER STATE:</span>
                  {["THUMB","INDEX","MIDDLE","RING","PINKY"].map((f, i) => (
                    <div key={f} className="flex flex-col items-center gap-1">
                      <div className="w-2 h-5 rounded-full transition-all duration-300"
                        style={{ background: activeGesture?.fingers[i] ? activeGesture.color : "#1a1a1a" }} />
                      <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{f.slice(0,3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gesture library + log */}
              <div className="w-[280px] border-l border-[#111] flex flex-col shrink-0">
                <div className="p-3 border-b border-[#0f0f0f]">
                  <div className="text-[9px] font-mono font-black tracking-widest" style={{ color: "#00e5ff" }}>GESTURE LIBRARY</div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {GESTURES.map(g => (
                    <div key={g.id} className="p-2 rounded-lg transition-all"
                      style={{
                        background: activeGesture?.id === g.id ? `${g.color}10` : "rgba(255,255,255,0.02)",
                        border: `1px solid ${activeGesture?.id === g.id ? g.color + "35" : "#111"}`,
                      }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-lg">{g.icon}</span>
                        <div className="flex-1">
                          <div className="text-[9px] font-black font-mono" style={{ color: g.color }}>{g.name}</div>
                          <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{g.action}</div>
                        </div>
                        {activeGesture?.id === g.id && (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
                        )}
                      </div>
                      <div className="text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{g.description}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#0f0f0f] flex flex-col shrink-0" style={{ maxHeight: "180px" }}>
                  <div className="px-3 py-2 border-b border-[#0a0a0a]">
                    <div className="text-[9px] font-mono font-black tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>ACTION LOG</div>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-0.5">
                    <AnimatePresence>
                      {log.map((entry, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between text-[8px] font-mono py-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: entry.color }} />
                            <span style={{ color: entry.color }}>{entry.gesture.slice(0, 12)}</span>
                            <ChevronRight className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>{entry.action}</span>
                          </div>
                          <span style={{ color: "rgba(255,255,255,0.2)" }}>{entry.time}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
