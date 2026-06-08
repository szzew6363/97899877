import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Brain, Zap, AlertTriangle, CheckCircle, Search, Activity, Layers, Cpu, FileVideo, Mic, User, Camera } from "lucide-react";
import { useStore } from "@/lib/store";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const DETECTIONS = [
  { file: "press_conference_2026.mp4", type: "VIDEO", verdict: "DEEPFAKE", confidence: 98.7, face: 99.1, audio: 97.2, meta: 98.3, color: "#ff0040" },
  { file: "ceo_statement_q4.mp4", type: "VIDEO", verdict: "DEEPFAKE", confidence: 94.2, face: 96.8, audio: 91.5, meta: 94.1, color: "#ff0040" },
  { file: "voice_note_leaked.ogg", type: "AUDIO", verdict: "SYNTHETIC", confidence: 87.4, face: 0, audio: 94.2, meta: 80.6, color: "#f97316" },
  { file: "protest_footage.mp4", type: "VIDEO", verdict: "AUTHENTIC", confidence: 97.3, face: 96.5, audio: 98.1, meta: 97.3, color: "#10b981" },
  { file: "interview_clip.mp4", type: "VIDEO", verdict: "MANIPULATED", confidence: 91.8, face: 89.3, audio: 94.7, meta: 91.4, color: "#f97316" },
];

const INDICATORS = [
  { name: "Facial Landmark Drift", score: 94, active: true },
  { name: "Eye Blink Pattern Anomaly", score: 88, active: true },
  { name: "GAN Fingerprint Detected", score: 97, active: true },
  { name: "Audio-Visual Sync Break", score: 82, active: true },
  { name: "Temporal Inconsistency", score: 91, active: true },
  { name: "Frequency Spectrum Artifact", score: 76, active: true },
  { name: "Skin Texture Manipulation", score: 85, active: false },
  { name: "Background Loop Detection", score: 69, active: false },
];

export function DeepfakeDetectorModal({ open, onOpenChange }: Props) {
  const { state } = useStore();
  const [tab, setTab] = useState<"scan" | "indicators" | "forensics" | "live">("scan");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(0);
  const [waveData, setWaveData] = useState<number[]>([]);

  useEffect(() => {
    setWaveData(Array.from({ length: 80 }, () => Math.random() * 80 + 20));
    const id = setInterval(() => setWaveData(prev => [...prev.slice(1), Math.random() * 80 + 20]), 80);
    return () => clearInterval(id);
  }, []);

  const runAnalysis = () => {
    setAnalyzing(true);
    setProgress(0);
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(id); setAnalyzing(false); return 100; }
        return p + 2;
      });
    }, 60);
  };

  if (!open) return null;

  const sel = DETECTIONS[selected];
  const verdictColor = (v: string) => ({ DEEPFAKE: "#ff0040", SYNTHETIC: "#f97316", MANIPULATED: "#fbbf24", AUTHENTIC: "#10b981" }[v] ?? "#888");

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(18px)" }}>
        <motion.div initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} className="relative w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #020308 0%, #040212 50%, #020308 100%)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 16, boxShadow: "0 0 120px rgba(139,92,246,0.1), 0 0 400px rgba(99,102,241,0.06)" }}>
          {/* Scan overlay effect */}
          <motion.div className="absolute inset-0 pointer-events-none z-0 rounded-2xl overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div key={i} className="absolute inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)", top: `${i * 14}%` }} animate={{ opacity: [0, 0.8, 0] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }} />
            ))}
          </motion.div>

          {/* Header */}
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.04)" }}>
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
              <Eye className="w-5 h-5" style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <div className="text-[15px] font-black tracking-widest" style={{ color: "#a78bfa", textShadow: "0 0 20px rgba(139,92,246,0.8)" }}>DEEPFAKE DETECTION ENGINE</div>
              <div className="text-[10px] font-mono" style={{ color: "#a78bfa44" }}>NEURAL FORENSICS · MULTI-MODAL ANALYSIS · YEAR 3090</div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-center">
                <div className="text-[20px] font-black" style={{ color: "#ff0040" }}>4</div>
                <div className="text-[8px] font-mono" style={{ color: "#ff004066" }}>FAKES FOUND</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#444" }} /></button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {[{ id: "scan", label: "SCAN QUEUE", icon: Search }, { id: "indicators", label: "FORENSIC INDICATORS", icon: Brain }, { id: "forensics", label: "WAVEFORM ANALYSIS", icon: Activity }, { id: "live", label: "LIVE CAM DETECT", icon: Camera }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all" style={{ color: tab === t.id ? "#a78bfa" : "#444", background: tab === t.id ? "rgba(139,92,246,0.12)" : "transparent", border: `1px solid ${tab === t.id ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.05)"}` }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6 pt-4">
            {tab === "scan" && (
              <div className="flex gap-4 h-full">
                <div className="w-72 shrink-0 flex flex-col gap-2">
                  {DETECTIONS.map((d, i) => (
                    <motion.button key={i} onClick={() => setSelected(i)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="text-left p-3 rounded-xl transition-all" style={{ background: selected === i ? `${verdictColor(d.verdict)}10` : "rgba(255,255,255,0.02)", border: `1px solid ${selected === i ? verdictColor(d.verdict) + "35" : "rgba(255,255,255,0.06)"}` }}>
                      <div className="flex items-center gap-2 mb-1">
                        {d.type === "VIDEO" ? <FileVideo className="w-3.5 h-3.5" style={{ color: verdictColor(d.verdict) }} /> : <Mic className="w-3.5 h-3.5" style={{ color: verdictColor(d.verdict) }} />}
                        <span className="text-[10px] font-mono text-white/80 truncate">{d.file}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${verdictColor(d.verdict)}20`, color: verdictColor(d.verdict) }}>{d.verdict}</span>
                        <span className="text-[9px] font-mono font-bold" style={{ color: verdictColor(d.verdict) }}>{d.confidence}%</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <div className="p-5 rounded-xl" style={{ background: `${verdictColor(sel.verdict)}08`, border: `1px solid ${verdictColor(sel.verdict)}25` }}>
                    <div className="flex items-center gap-3 mb-4">
                      {sel.verdict === "AUTHENTIC" ? <CheckCircle className="w-8 h-8" style={{ color: "#10b981" }} /> : <AlertTriangle className="w-8 h-8" style={{ color: verdictColor(sel.verdict) }} />}
                      <div>
                        <div className="text-[20px] font-black" style={{ color: verdictColor(sel.verdict) }}>{sel.verdict}</div>
                        <div className="text-[10px] font-mono" style={{ color: "#555" }}>Overall Confidence: {sel.confidence}%</div>
                      </div>
                      <div className="ml-auto text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg" style={{ background: `${verdictColor(sel.verdict)}15`, color: verdictColor(sel.verdict), border: `1px solid ${verdictColor(sel.verdict)}30` }}>{sel.type}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ label: "Face Analysis", val: sel.face }, { label: "Audio Analysis", val: sel.audio }, { label: "Metadata", val: sel.meta }].filter(m => m.val > 0).map((m, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="text-[14px] font-black mb-1" style={{ color: verdictColor(sel.verdict) }}>{m.val}%</div>
                          <div className="text-[8px] font-mono" style={{ color: "#444" }}>{m.label}</div>
                          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <div className="h-full rounded-full" style={{ width: `${m.val}%`, background: verdictColor(sel.verdict) }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[10px] font-mono font-bold mb-3" style={{ color: "#a78bfa88" }}>GAN FINGERPRINT ANALYSIS</div>
                    <div className="grid grid-cols-16 gap-0.5">{Array.from({ length: 256 }).map((_, i) => (<div key={i} className="aspect-square rounded-[1px]" style={{ background: `rgba(139,92,246,${(Math.random() * 0.8 + 0.05).toFixed(2)})` }} />))}</div>
                  </div>
                </div>
              </div>
            )}
            {tab === "indicators" && (
              <div className="grid grid-cols-2 gap-3">
                {INDICATORS.map((ind, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="p-4 rounded-xl flex items-center gap-4" style={{ background: ind.active ? "rgba(255,0,64,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${ind.active ? "rgba(255,0,64,0.25)" : "rgba(255,255,255,0.06)"}` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: ind.active ? "#ff0040" : "#333" }} />
                    <div className="flex-1">
                      <div className="text-[11px] font-semibold text-white/80">{ind.name}</div>
                      <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: ind.active ? "#ff0040" : "#333" }} initial={{ width: 0 }} animate={{ width: `${ind.score}%` }} transition={{ duration: 1, delay: i * 0.06 }} />
                      </div>
                    </div>
                    <div className="text-[12px] font-black" style={{ color: ind.active ? "#ff0040" : "#333" }}>{ind.score}%</div>
                  </motion.div>
                ))}
              </div>
            )}
            {tab === "forensics" && (
              <div className="h-full flex flex-col gap-4">
                <div className="text-[10px] font-mono font-bold" style={{ color: "#a78bfa66" }}>AUDIO WAVEFORM SPECTRAL ANALYSIS — LIVE</div>
                <div className="flex-1 p-4 rounded-xl flex items-end gap-0.5 overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(139,92,246,0.15)" }}>
                  {waveData.map((v, i) => (
                    <motion.div key={i} className="flex-1 rounded-t-sm" style={{ height: `${v}%`, background: `linear-gradient(to top, #a78bfa, #6366f1)`, opacity: 0.7 + (i % 5) * 0.06 }} animate={{ height: `${v}%` }} transition={{ duration: 0.08 }} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[{ label: "Spectral Anomalies", val: "14 detected", color: "#ff0040" }, { label: "Phase Inconsistency", val: "High", color: "#f97316" }, { label: "Noise Floor", val: "Synthetic", color: "#fbbf24" }, { label: "Voice Cloning", val: "98.2% match", color: "#a78bfa" }].map((m, i) => (
                    <div key={i} className="p-3 rounded-xl text-center" style={{ background: `${m.color}08`, border: `1px solid ${m.color}20` }}>
                      <div className="text-[13px] font-black" style={{ color: m.color }}>{m.val}</div>
                      <div className="text-[8px] font-mono mt-1" style={{ color: "#444" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "live" && (
              <div className="h-full flex flex-col items-center justify-center gap-6">
                <div className="relative w-80 h-60 rounded-2xl overflow-hidden" style={{ background: "rgba(0,0,0,0.6)", border: "2px solid rgba(139,92,246,0.3)", boxShadow: "0 0 40px rgba(139,92,246,0.15)" }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full" style={{ background: "rgba(139,92,246,0.1)", border: "2px solid rgba(139,92,246,0.3)" }}>
                      <User className="w-full h-full p-6" style={{ color: "#a78bfa44" }} />
                    </div>
                  </div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div key={i} className="absolute border rounded-sm" style={{ width: 60 + i * 20, height: 80 + i * 10, borderColor: "rgba(139,92,246,0.3)", top: `${20 + i * 3}%`, left: `${25 + i * 2}%` }} animate={{ borderColor: ["rgba(139,92,246,0.3)", "rgba(255,0,64,0.6)", "rgba(139,92,246,0.3)"] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }} />
                  ))}
                  <div className="absolute bottom-3 left-3 right-3 text-center">
                    <span className="text-[9px] font-mono font-bold px-2 py-1 rounded" style={{ background: "rgba(255,0,64,0.2)", color: "#ff0040", border: "1px solid rgba(255,0,64,0.4)" }}>ANALYZING FACIAL LANDMARKS...</span>
                  </div>
                </div>
                <button onClick={runAnalysis} className="px-8 py-3 rounded-xl font-bold text-[12px] transition-all hover:scale-105" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.35)", boxShadow: "0 0 20px rgba(139,92,246,0.15)" }}>
                  {analyzing ? `ANALYZING... ${progress}%` : "ACTIVATE LIVE DETECTION"}
                </button>
                {analyzing && <div className="w-64 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}><motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #a78bfa, #6366f1)", width: `${progress}%` }} /></div>}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
