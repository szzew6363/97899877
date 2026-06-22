/**
 * FinetunePage — 3D Holographic Fine-tuning Pipeline
 * Dataset manager · training config · loss curve · model versioning
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Upload, Play, Square, BarChart2, RefreshCw, CheckCircle2, Clock, Layers, Zap, FileText, Database, TrendingDown } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface TrainJob { id: string; name: string; baseModel: string; dataset: string; status: "idle" | "running" | "done" | "failed"; progress: number; loss: number; epochs: number; currentEpoch: number; startedAt?: string; completedAt?: string }

const BASE_MODELS = ["CHAT-GPT Fast", "CHAT-GPT Smart", "GPT-4o", "Claude 3.5 Sonnet", "Gemini 1.5 Pro"];
const MOCK_JOBS: TrainJob[] = [
  { id: "1", name: "KaliGPT Security Expert v2", baseModel: "GPT-4o", dataset: "pentest_10k.jsonl", status: "done", progress: 100, loss: 0.12, epochs: 3, currentEpoch: 3, startedAt: new Date(Date.now() - 3 * 3600000).toISOString(), completedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", name: "Arabic Cybersec Specialist", baseModel: "CHAT-GPT Smart", dataset: "arabic_sec_5k.jsonl", status: "running", progress: 67, loss: 0.23, epochs: 5, currentEpoch: 4, startedAt: new Date(Date.now() - 2 * 3600000).toISOString() },
];

// ── Loss Curve Canvas ─────────────────────────────────────────────────────────
function LossCurve({ history }: { history: number[] }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv || history.length < 2) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.offsetWidth, H = cv.offsetHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);
    const pad = 16, gW = W - pad * 2, gH = H - pad * 2;
    const mn = Math.min(...history), mx = Math.max(...history);
    const toX = (i: number) => pad + (i / (history.length - 1)) * gW;
    const toY = (v: number) => pad + gH - ((v - mn) / (mx - mn || 1)) * gH;
    // Area fill
    ctx.beginPath(); ctx.moveTo(toX(0), H - pad);
    history.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
    ctx.lineTo(toX(history.length - 1), H - pad); ctx.closePath();
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(226,18,39,0.25)"); gr.addColorStop(1, "rgba(226,18,39,0)");
    ctx.fillStyle = gr; ctx.fill();
    // Line
    ctx.beginPath(); history.forEach((v, i) => i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)));
    ctx.strokeStyle = "#e21227"; ctx.lineWidth = 2; ctx.shadowColor = "#e21227"; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
    // Points
    history.forEach((v, i) => { ctx.beginPath(); ctx.arc(toX(i), toY(v), 3, 0, Math.PI * 2); ctx.fillStyle = "#e21227"; ctx.fill(); });
  }, [history]);
  return <canvas ref={cvRef} className="w-full" style={{ height: 100 }} />;
}

interface Props { onClose?: () => void }

export function FinetunePage({ onClose }: Props) {
  const [jobs, setJobs] = useState<TrainJob[]>(MOCK_JOBS);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [baseModel, setBaseModel] = useState(BASE_MODELS[0]);
  const [epochs, setEpochs] = useState(3);
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const LOSS_HISTORY = [1.8, 1.4, 1.1, 0.85, 0.65, 0.48, 0.35, 0.26, 0.19, 0.14, 0.12];

  const startJob = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const newJob: TrainJob = {
      id: crypto.randomUUID(), name: newName, baseModel, dataset: file?.name || "custom_dataset.jsonl",
      status: "running", progress: 0, loss: 1.8, epochs, currentEpoch: 1, startedAt: new Date().toISOString(),
    };
    setJobs(prev => [newJob, ...prev]);
    setShowNew(false); setNewName(""); setFile(null); setCreating(false);
    // Simulate progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 8 + 2;
      if (prog >= 100) { prog = 100; clearInterval(interval); setJobs(j => j.map(x => x.id === newJob.id ? { ...x, status: "done" as const, progress: 100, loss: 0.12, completedAt: new Date().toISOString() } : x)); return; }
      const lossVal = 1.8 * (1 - prog / 120);
      setJobs(j => j.map(x => x.id === newJob.id ? { ...x, progress: Math.round(prog), loss: Math.max(0.08, lossVal), currentEpoch: Math.ceil(prog / 100 * epochs) } : x));
    }, 2000);
  }, [newName, baseModel, epochs, file]);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 20%,rgba(226,18,39,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"><Settings className="w-5 h-5 text-red-400" /></div>
          <div><h2 className="text-base font-bold text-white">خط تدريب النماذج — Fine-tune</h2><p className="text-xs text-zinc-600">{jobs.filter(j => j.status === "done").length} مكتمل · {jobs.filter(j => j.status === "running").length} قيد التشغيل</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNew(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/25 text-red-400 hover:bg-red-500/30 transition-all">
            <Play className="w-3.5 h-3.5" />تدريب جديد
          </button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {/* Loss Curve */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-red-400" />منحنى الخسارة — Loss Curve</p>
          <LossCurve history={LOSS_HISTORY} />
          <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-600">
            <span>الحقبة 1 — Loss: 1.80</span><span>الحقبة 11 — Loss: 0.12</span>
          </div>
        </div>
        <AnimatePresence>
          {showNew && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-xl bg-red-500/6 border border-red-500/20 space-y-3">
              <p className="text-xs font-semibold text-zinc-300">إعداد مهمة تدريب جديدة</p>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم النموذج (مثال: KaliGPT Security v3)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-500/40" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">النموذج الأساسي</p>
                  <select value={baseModel} onChange={e => setBaseModel(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                    {BASE_MODELS.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1">عدد الحقبات</p>
                  <input type="number" value={epochs} onChange={e => setEpochs(Number(e.target.value))} min={1} max={20}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                </div>
              </div>
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-red-500/30 transition-colors">
                <Upload className="w-5 h-5 text-zinc-600 mx-auto mb-1" />
                <p className="text-xs text-zinc-500">{file ? file.name : "ارفع ملف التدريب (.jsonl)"}</p>
                <input ref={fileRef} type="file" accept=".jsonl,.json,.csv" className="hidden" onChange={e => e.target.files && setFile(e.target.files[0])} />
              </div>
              <div className="flex gap-2">
                <button onClick={startJob} disabled={creating || !newName.trim()} className="px-4 py-2 rounded-lg bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/35 disabled:opacity-40 transition-all flex items-center gap-1.5">
                  {creating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}بدء التدريب
                </button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs transition-colors">إلغاء</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`p-4 rounded-xl border ${job.status === "running" ? "bg-red-500/6 border-red-500/20" : job.status === "done" ? "bg-green-500/6 border-green-500/15" : "bg-white/3 border-white/6"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-white">{job.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-zinc-500">
                    <span>{job.baseModel}</span><span>{job.dataset}</span>
                    <span>حقبة {job.currentEpoch}/{job.epochs}</span>
                    <span>Loss: <span className="font-bold text-red-400">{job.loss.toFixed(2)}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {job.status === "running" && <RefreshCw className="w-4 h-4 text-red-400 animate-spin" />}
                  {job.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${job.status === "done" ? "bg-green-500/15 text-green-400" : job.status === "running" ? "bg-red-500/15 text-red-400" : "bg-zinc-800 text-zinc-500"}`}>
                    {job.status === "done" ? "مكتمل" : job.status === "running" ? "يعمل" : "فشل"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-white/6 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: job.status === "done" ? "linear-gradient(90deg,#10b981,#22d3ee)" : "linear-gradient(90deg,#e21227,#f59e0b)", boxShadow: job.status === "running" ? "0 0 10px #e2122760" : "none" }}
                    animate={{ width: `${job.progress}%` }} transition={{ duration: 0.5 }} />
                </div>
                <span className="text-xs font-bold text-white">{job.progress}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
