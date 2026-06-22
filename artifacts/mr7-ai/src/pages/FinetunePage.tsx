import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Plus, PlayCircle, PauseCircle, Trash2, RefreshCw, Upload, CheckCircle2, XCircle, Clock, BarChart3, Database, Brain } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface TrainingJob { id: string; name: string; model_base: string; status: string; progress: number; loss?: number; epochs: number; dataset_size?: number; started_at?: string; completed_at?: string; created_at: string; error_msg?: string }
interface TrainingSample { id: string; prompt: string; completion: string; category: string; quality_score: number; created_at: string }

const BASE_MODELS = ["gpt-3.5-turbo", "gpt-4o-mini", "llama-3-8b", "mistral-7b", "qwen2.5-7b", "gemma-2b"];
const STATUS_COLORS: Record<string, string> = { queued: "text-gray-400", running: "text-blue-400", completed: "text-green-400", failed: "text-red-400", cancelled: "text-gray-500" };
const STATUS_ICONS: Record<string, React.ElementType> = { queued: Clock, running: PlayCircle, completed: CheckCircle2, failed: XCircle, cancelled: XCircle };

interface Props { onClose?: () => void }

export function FinetunePage({ onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"jobs" | "samples" | "create">("jobs");
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [samples, setSamples] = useState<TrainingSample[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [modelBase, setModelBase] = useState(BASE_MODELS[0]);
  const [epochs, setEpochs] = useState(3);
  const [creating, setCreating] = useState(false);
  const [sPrompt, setSPrompt] = useState("");
  const [sCompletion, setSCompletion] = useState("");
  const [sCategory, setSCategory] = useState("general");
  const [sQuality, setSQuality] = useState(8);
  const [addingSample, setAddingSample] = useState(false);

  const canFinetune = user && ["professional", "elite", "enterprise"].includes(user.subscription);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/training/jobs");
      if (res.ok) { const d = await res.json() as { jobs?: TrainingJob[] }; setJobs(d.jobs || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const loadSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/training/samples?limit=100");
      if (res.ok) { const d = await res.json() as { samples?: TrainingSample[] }; setSamples(d.samples || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "jobs") loadJobs();
    else if (tab === "samples") loadSamples();
  }, [tab]);

  // Poll running jobs
  useEffect(() => {
    if (!jobs.some(j => j.status === "running" || j.status === "queued")) return;
    const t = setInterval(loadJobs, 5000);
    return () => clearInterval(t);
  }, [jobs]);

  const createJob = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/training/jobs", {
        method: "POST",
        body: JSON.stringify({ name, modelBase, epochs }),
      });
      if (res.ok) {
        toast({ title: "🚀 تم إطلاق مهمة التدريب" });
        setName(""); setTab("jobs"); await loadJobs();
      } else {
        const e = await res.json() as { error?: string };
        toast({ title: e.error || "فشل الإنشاء", variant: "destructive" });
      }
    } catch { toast({ title: "فشل", variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const addSample = async () => {
    if (!sPrompt || !sCompletion) return;
    setAddingSample(true);
    try {
      const res = await authFetch("/api/training/samples", {
        method: "POST",
        body: JSON.stringify({ prompt: sPrompt, completion: sCompletion, category: sCategory, quality: sQuality }),
      });
      if (res.ok) {
        toast({ title: "✅ تم إضافة العينة" });
        setSPrompt(""); setSCompletion(""); await loadSamples();
      }
    } catch { toast({ title: "فشل", variant: "destructive" }); }
    finally { setAddingSample(false); }
  };

  const cancelJob = async (id: string) => {
    await authFetch(`/api/training/jobs/${id}`, { method: "DELETE" });
    setJobs(j => j.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
  };

  if (!canFinetune) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
        <div className="text-center space-y-4">
          <Cpu className="w-16 h-16 text-gray-600 mx-auto" />
          <h2 className="text-xl font-black">خاص بالخطط المتقدمة</h2>
          <p className="text-gray-400 text-sm">Fine-Tuning متاح من خطة Professional فأعلى</p>
          <div className="text-sm text-red-400">خطتك الحالية: {user?.subscription || "غير مشترك"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-7 h-7 text-red-400" />
            <div>
              <h1 className="text-xl font-black">Fine-Tuning Pipeline</h1>
              <p className="text-sm text-gray-400">درّب نموذجاً مخصصاً على بياناتك</p>
            </div>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {[
              { id: "jobs", label: "مهام التدريب" },
              { id: "samples", label: "عينات التدريب" },
              { id: "create", label: "+ مهمة جديدة" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as "jobs" | "samples" | "create")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Jobs */}
            {tab === "jobs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">مهام التدريب ({jobs.length})</h2>
                  <button onClick={loadJobs} className="p-2 hover:bg-white/5 rounded-lg">
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                {jobs.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <Brain className="w-14 h-14 mx-auto mb-4 opacity-20" />
                    <div>لا توجد مهام تدريب</div>
                    <button onClick={() => setTab("create")} className="mt-3 text-sm text-red-400 hover:text-red-300">أنشئ أولى مهامك →</button>
                  </div>
                ) : jobs.map(j => {
                  const StatusIcon = STATUS_ICONS[j.status] || Clock;
                  return (
                    <div key={j.id} className="p-5 bg-white/3 border border-white/10 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`w-5 h-5 ${STATUS_COLORS[j.status]} ${j.status === "running" ? "animate-pulse" : ""}`} />
                          <div>
                            <div className="font-semibold">{j.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{j.model_base}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs capitalize ${STATUS_COLORS[j.status]}`}>{j.status}</span>
                          {(j.status === "queued" || j.status === "running") && (
                            <button onClick={() => cancelJob(j.id)} className="p-1.5 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {(j.status === "running" || j.status === "completed") && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>التقدم: {j.progress}%</span>
                            {j.loss && <span>Loss: {Number(j.loss).toFixed(4)}</span>}
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${j.progress}%` }}
                              className={`h-full rounded-full transition-all ${j.status === "completed" ? "bg-green-500" : "bg-blue-500"}`} />
                          </div>
                        </div>
                      )}
                      {j.error_msg && <div className="mt-2 text-xs text-red-400">{j.error_msg}</div>}
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>{j.epochs} epochs</span>
                        <span>بدأ: {new Date(j.created_at).toLocaleDateString("ar")}</span>
                        {j.completed_at && <span>انتهى: {new Date(j.completed_at).toLocaleDateString("ar")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Samples */}
            {tab === "samples" && (
              <div className="space-y-4">
                <div className="p-5 bg-white/3 border border-white/10 rounded-2xl space-y-3">
                  <h3 className="font-semibold">إضافة عينة تدريب جديدة</h3>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">السؤال / الـ Prompt</label>
                    <textarea value={sPrompt} onChange={e => setSPrompt(e.target.value)} rows={3}
                      placeholder="اكتب السؤال أو المدخل..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">الجواب المثالي / الـ Completion</label>
                    <textarea value={sCompletion} onChange={e => setSCompletion(e.target.value)} rows={3}
                      placeholder="الجواب المثالي الذي تريد أن يتعلمه النموذج..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">الفئة</label>
                      <select value={sCategory} onChange={e => setSCategory(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                        {["general", "security", "pentest", "code", "arabic"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">جودة العينة: {sQuality}/10</label>
                      <input type="range" min={1} max={10} value={sQuality} onChange={e => setSQuality(Number(e.target.value))} className="w-full accent-red-500 mt-2" />
                    </div>
                  </div>
                  <button onClick={addSample} disabled={addingSample || !sPrompt || !sCompletion}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-sm font-medium">
                    {addingSample ? "جاري الإضافة..." : "إضافة عينة تدريب"}
                  </button>
                </div>
                <div className="space-y-2">
                  {samples.map((s, i) => (
                    <div key={s.id || i} className="p-4 bg-white/3 border border-white/10 rounded-xl">
                      <div className="text-xs font-mono text-red-400 mb-1">Q: {s.prompt.slice(0, 100)}...</div>
                      <div className="text-xs text-gray-300">A: {s.completion.slice(0, 100)}...</div>
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        <span>{s.category}</span><span>⭐ {s.quality_score}/10</span>
                      </div>
                    </div>
                  ))}
                  {samples.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">لا توجد عينات بعد</div>
                  )}
                </div>
              </div>
            )}

            {/* Create */}
            {tab === "create" && (
              <div className="max-w-md space-y-5">
                <h2 className="font-semibold">مهمة تدريب جديدة</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">اسم المهمة</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="مثل: KaliGPT Arabic Security v1"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">النموذج الأساسي</label>
                    <select value={modelBase} onChange={e => setModelBase(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                      {BASE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">عدد الـ Epochs: {epochs}</label>
                    <input type="range" min={1} max={10} value={epochs} onChange={e => setEpochs(Number(e.target.value))} className="w-full accent-red-500" />
                  </div>
                  <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                    <div className="font-medium mb-1">💡 ملاحظة</div>
                    سيتم تدريب النموذج على عينات التدريب التي أضفتها ({samples.length} عينة). يُنصح بـ 100+ عينة للحصول على نتائج جيدة.
                  </div>
                  <button onClick={createJob} disabled={creating || !name || samples.length === 0}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                    {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                    {creating ? "جاري البدء..." : "بدء التدريب"}
                  </button>
                  {samples.length === 0 && (
                    <div className="text-center text-xs text-amber-400">أضف عينات تدريب أولاً</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
