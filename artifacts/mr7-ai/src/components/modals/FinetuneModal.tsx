/**
 * Fine-Tuning Data Manager — collect & export training data for OpenAI/HuggingFace
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, Brain, CheckCircle2, Loader2, Star, Trash2,
  Plus, Filter, BarChart3, Zap, FileJson, AlertCircle,
} from "lucide-react";
import { authFetch, getCachedUser } from "@/lib/auth";
import { useStore } from "@/lib/store";

interface Sample {
  id: string;
  messages: { role: string; content: string }[];
  system_prompt?: string;
  quality_score: number;
  tags: string[];
  approved: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  approved: number;
  avgQuality: number;
  byTag: Record<string, number>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FinetuneModal({ open, onClose }: Props) {
  const { state } = useStore();
  const user = getCachedUser();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab]         = useState<"samples" | "export" | "collect">("samples");
  const [filterTag, setFilterTag] = useState("");
  const [newSystem, setNewSystem] = useState("You are KaliGPT, an expert cybersecurity AI assistant.");
  const [quality, setQuality]   = useState(8);
  const [tags, setTags]         = useState("cybersecurity,pentest");
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    loadData();
  }, [open]);

  async function loadData() {
    setLoading(true);
    try {
      const [sampRes, statRes] = await Promise.all([
        authFetch("/api/finetune/samples?limit=50"),
        authFetch("/api/finetune/stats"),
      ]);
      if (sampRes.ok) { const d = await sampRes.json() as { samples: Sample[] }; setSamples(d.samples || []); }
      if (statRes.ok) { const d = await statRes.json() as Stats; setStats(d); }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }

  async function approveCurrentChat() {
    const currentChat = state.chats.find(c => c.id === state.currentChatId);
    if (!currentChat || currentChat.messages.length < 2) {
      setError("المحادثة الحالية فارغة أو قصيرة جداً");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const messages = currentChat.messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
      const res = await authFetch("/api/finetune/approve", {
        method: "POST",
        body: JSON.stringify({
          messages,
          systemPrompt: newSystem,
          qualityScore: quality,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        await loadData();
        setTab("samples");
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error || "فشل الحفظ");
      }
    } catch { setError("خطأ في الاتصال"); }
    finally { setLoading(false); }
  }

  async function deleteSample(id: string) {
    try {
      await authFetch(`/api/finetune/samples/${id}`, { method: "DELETE" });
      setSamples(p => p.filter(s => s.id !== id));
    } catch { /* */ }
  }

  async function exportJSONL() {
    setExporting(true);
    try {
      const res = await authFetch("/api/finetune/export");
      if (!res.ok) { setError("فشل التصدير"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kaligpt-finetune-${Date.now()}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError("فشل التصدير"); }
    finally { setExporting(false); }
  }

  if (!open) return null;

  const filtered = filterTag ? samples.filter(s => s.tags.includes(filterTag)) : samples;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
          <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
            className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#0a0a0a", border: "1px solid rgba(226,18,39,0.2)", boxShadow: "0 0 60px rgba(226,18,39,0.08)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-violet-400" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">Fine-Tuning Pipeline</div>
                  <div className="text-[10px] text-zinc-500 font-mono">بيانات التدريب · JSONL Export</div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-3 border-b border-white/4">
              {(["samples", "collect", "export"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${tab === t ? "bg-violet-600/20 text-violet-400 border border-violet-500/25" : "text-zinc-500 hover:text-white"}`}>
                  {t === "samples" ? `العينات (${stats?.approved ?? 0})` : t === "collect" ? "جمع بيانات" : "تصدير JSONL"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Stats Bar */}
              {stats && (
                <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/4">
                  {[
                    { label: "إجمالي العينات", val: stats.total, color: "#3b82f6" },
                    { label: "معتمدة", val: stats.approved, color: "#22c55e" },
                    { label: "متوسط الجودة", val: `${stats.avgQuality?.toFixed(1)}/10`, color: "#f59e0b" },
                  ].map((s, i) => (
                    <div key={i} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
                      <div className="text-[9px] text-zinc-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* SAMPLES TAB */}
              {tab === "samples" && (
                <div className="p-4 space-y-3">
                  {/* Filter */}
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/6">
                      <Filter className="w-3.5 h-3.5 text-zinc-500" />
                      <input value={filterTag} onChange={e => setFilterTag(e.target.value)} placeholder="فلتر بالوسم…" className="flex-1 bg-transparent text-xs text-white outline-none" />
                    </div>
                    <button onClick={loadData} className="px-3 rounded-lg bg-white/3 border border-white/6 text-zinc-400 hover:text-white transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" style={{}} />
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600">
                      <Brain className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">لا توجد عينات تدريب بعد</p>
                      <p className="text-xs mt-1">استخدم تبويب "جمع بيانات" لإضافة محادثة</p>
                    </div>
                  ) : (
                    filtered.map(s => (
                      <div key={s.id} className="rounded-xl p-3 border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex gap-1 flex-wrap">
                            {s.tags.map(t => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">{t}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] text-amber-400">{s.quality_score}/10</span>
                            </div>
                            <button onClick={() => deleteSample(s.id)} className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {s.messages.slice(0, 2).map((m, i) => (
                            <div key={i} className="text-[10px] truncate" style={{ color: m.role === "user" ? "#93c5fd" : "#86efac" }}>
                              <span className="font-mono opacity-50 mr-1">{m.role}:</span>
                              {m.content.slice(0, 100)}{m.content.length > 100 ? "…" : ""}
                            </div>
                          ))}
                          {s.messages.length > 2 && (
                            <div className="text-[9px] text-zinc-600">+ {s.messages.length - 2} رسالة أخرى</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* COLLECT TAB */}
              {tab === "collect" && (
                <div className="p-4 space-y-4">
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-[11px] text-blue-400">
                    يجمع هذه المحادثة الحالية بالكامل كعينة تدريب معتمدة جاهزة للتصدير بتنسيق JSONL.
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 mb-1.5 block">System Prompt</label>
                    <textarea value={newSystem} onChange={e => setNewSystem(e.target.value)} rows={3}
                      className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-[11px] text-zinc-300 outline-none resize-none font-mono" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 mb-1.5 block">جودة العينة (1-10)</label>
                      <input type="number" min={1} max={10} value={quality} onChange={e => setQuality(parseInt(e.target.value))}
                        className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 mb-1.5 block">الوسوم (فاصلة)</label>
                      <input value={tags} onChange={e => setTags(e.target.value)}
                        className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" /> {error}
                    </div>
                  )}

                  <button onClick={approveCurrentChat} disabled={loading}
                    className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    إضافة المحادثة الحالية كعينة تدريب
                  </button>
                </div>
              )}

              {/* EXPORT TAB */}
              {tab === "export" && (
                <div className="p-4 space-y-4">
                  <div className="p-4 rounded-xl border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <FileJson className="w-6 h-6 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-white text-sm">OpenAI Fine-Tuning Format</div>
                        <div className="text-[10px] text-zinc-500">JSONL جاهز لـ openai fine_tuning.jobs.create</div>
                      </div>
                    </div>
                    <pre className="text-[9px] font-mono text-zinc-500 bg-black/40 rounded-lg p-3 overflow-auto">{`{"messages": [
  {"role": "system", "content": "You are KaliGPT…"},
  {"role": "user", "content": "كيف أفحص الثغرات؟"},
  {"role": "assistant", "content": "يمكنك استخدام…"}
]}`}</pre>
                  </div>

                  <div className="p-4 rounded-xl border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <BarChart3 className="w-6 h-6 text-blue-400" />
                      <div>
                        <div className="font-semibold text-white text-sm">HuggingFace Format</div>
                        <div className="text-[10px] text-zinc-500">تنسيق Alpaca / Instruction-Tuning</div>
                      </div>
                    </div>
                    <pre className="text-[9px] font-mono text-zinc-500 bg-black/40 rounded-lg p-3 overflow-auto">{`{"instruction": "كيف أفحص الثغرات؟",
 "input": "",
 "output": "يمكنك استخدام nmap…"}`}</pre>
                  </div>

                  {stats && stats.approved < 10 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      يوصى بـ 50+ عينة على الأقل لنتائج fine-tuning جيدة. لديك {stats.approved} حالياً.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={exportJSONL} disabled={exporting || !stats?.approved}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#86efac" }}>
                      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      تصدير OpenAI JSONL ({stats?.approved ?? 0})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
