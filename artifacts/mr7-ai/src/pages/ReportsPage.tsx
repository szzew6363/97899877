import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Plus, Loader2, X, Shield, AlertTriangle, CheckCircle2, ChevronRight, Globe, Code2, Search, Trash2, RefreshCw, Sparkles, Clock } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface ReportTemplate { id: string; name: string; nameEn: string; desc: string; icon: React.ElementType; color: string; sections: string[] }
interface Report { id: string; title: string; template: string; language: string; status: string; created_at: string; pdf_url?: string }

const TEMPLATES: ReportTemplate[] = [
  { id: "pentest", name: "تقرير اختبار الاختراق", nameEn: "Penetration Test Report", desc: "تقرير شامل لعملية اختبار الاختراق مع جميع التفاصيل", icon: Shield, color: "#e21227", sections: ["ملخص تنفيذي", "نطاق الاختبار", "المنهجية", "النتائج", "التوصيات", "خطة المعالجة"] },
  { id: "vulnerability", name: "تقرير تقييم الثغرات", nameEn: "Vulnerability Assessment Report", desc: "تحليل شامل للثغرات المكتشفة مرتبة حسب الخطورة", icon: AlertTriangle, color: "#f97316", sections: ["ملخص تنفيذي", "إحصاءات الثغرات", "الثغرات الحرجة", "الثغرات العالية", "التوصيات"] },
  { id: "audit", name: "تقرير تدقيق أمني", nameEn: "Security Audit Report", desc: "تدقيق شامل للوضع الأمني وفق معايير ISO 27001", icon: CheckCircle2, color: "#10b981", sections: ["نطاق التدقيق", "المنهجية", "نتائج الامتثال", "الفجوات الأمنية", "خطة التحسين"] },
];

const SEV_COLORS: Record<string, string> = { critical: "#ff2244", high: "#ff6622", medium: "#ffaa22", low: "#22aaff", info: "#888" };
const SEV_LABELS: Record<string, string> = { critical: "حرج", high: "عالٍ", medium: "متوسط", low: "منخفض", info: "معلومة" };

function HoloBG() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let raf = 0; let t = 0;
    function resize() { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; }
    resize();
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);
    const lines = Array.from({ length: 8 }, (_, i) => ({ y: (i / 7), speed: .0002 + i * .00005 }));
    function draw() {
      t += 1;
      ctx.clearRect(0, 0, cv.width, cv.height);
      lines.forEach((l, i) => {
        const y = l.y * cv.height + Math.sin(t * l.speed * 80 + i) * 8;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y);
        ctx.strokeStyle = `rgba(226,18,39,${0.03 + i * 0.003})`; ctx.lineWidth = 1; ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

interface Props { onClose?: () => void }

export function ReportsPage({ onClose }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"generate" | "history">("generate");
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [findings, setFindings] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/reports/history");
      if (res.ok) { const d = await res.json() as { reports?: Report[] }; setReports(d.reports || []); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  const generate = async () => {
    if (!selectedTemplate || !title) return;
    setGenerating(true);
    try {
      const res = await authFetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: selectedTemplate.id, title, target, language, additionalContext: findings }),
      });
      const d = await res.json() as { report?: Report; pdfUrl?: string; error?: string };
      if (!res.ok) throw new Error(d.error || "فشل توليد التقرير");
      toast({ title: "✅ تم توليد التقرير!", description: "جاهز للتحميل" });
      if (d.pdfUrl) window.open(d.pdfUrl, "_blank");
      setTab("history"); loadHistory();
    } catch (e) {
      toast({ title: "خطأ", description: (e as Error).message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <HoloBG />
      {/* Header */}
      <div className="relative flex-shrink-0 px-6 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">تقارير PDF الاحترافية</h2>
            <p className="text-xs text-zinc-500">توليد تقارير اختبار الاختراق بالذكاء الاصطناعي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["generate", "history"].map(t => (
            <button key={t} onClick={() => setTab(t as "generate" | "history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "generate" ? "توليد تقرير" : "السجل"}
            </button>
          ))}
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/8 p-6">
        <AnimatePresence mode="wait">
          {tab === "generate" ? (
            <motion.div key="gen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Templates */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">اختر قالب التقرير</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TEMPLATES.map(tpl => {
                    const Icon = tpl.icon;
                    const active = selectedTemplate?.id === tpl.id;
                    return (
                      <motion.button key={tpl.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }}
                        onClick={() => setSelectedTemplate(active ? null : tpl)}
                        className={`text-right p-4 rounded-xl border transition-all ${active ? "border-opacity-60" : "border-white/8 bg-white/3 hover:bg-white/5"}`}
                        style={active ? { borderColor: `${tpl.color}50`, backgroundColor: `${tpl.color}12` } : {}}>
                        <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ backgroundColor: `${tpl.color}20` }}>
                          <Icon className="w-4 h-4" style={{ color: tpl.color }} />
                        </div>
                        <p className="text-sm font-semibold text-white mb-1">{tpl.name}</p>
                        <p className="text-xs text-zinc-500 mb-3">{tpl.desc}</p>
                        <div className="flex flex-wrap gap-1">
                          {tpl.sections.slice(0, 3).map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500">{s}</span>)}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Form */}
              <AnimatePresence>
                {selectedTemplate && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/3 border border-white/8">
                      <h3 className="text-sm font-semibold text-white mb-4">تفاصيل التقرير</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-zinc-400 mb-1 block">عنوان التقرير *</label>
                          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: تقرير اختبار اختراق شركة X"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/40 transition-all" />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 mb-1 block">الهدف / النطاق</label>
                          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="مثال: example.com أو 192.168.1.0/24"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/40 transition-all" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="text-xs text-zinc-400 mb-1 block">لغة التقرير</label>
                        <div className="flex gap-2">
                          {[{ v: "ar", l: "العربية" }, { v: "en", l: "English" }].map(({ v, l }) => (
                            <button key={v} onClick={() => setLanguage(v as "ar" | "en")}
                              className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${language === v ? "bg-red-600/20 border-red-500/40 text-red-400" : "border-white/10 text-zinc-500 hover:border-white/20"}`}>{l}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="text-xs text-zinc-400 mb-1 block">النتائج والملاحظات (اختياري)</label>
                        <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={4} placeholder="أضف نتائج يدوية، ثغرات مكتشفة، ملاحظات إضافية..."
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/40 transition-all resize-none" />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20">
                      <p className="text-xs text-blue-400 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> سيجمع الذكاء الاصطناعي تلقائياً المعلومات من محادثاتك الأخيرة ونتائج أدوات المسح.</p>
                    </div>

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={generate} disabled={generating || !title}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-900/30">
                      {generating ? <><Loader2 className="w-4 h-4 animate-spin" />جارٍ التوليد...</> : <><FileText className="w-4 h-4" />توليد التقرير بالذكاء الاصطناعي</>}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="hist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">التقارير المحفوظة</h3>
                <button onClick={loadHistory} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
              </div>
              {loading ? (
                <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-600 mx-auto" /></div>
              ) : reports.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                  <p className="text-sm text-zinc-500">لا توجد تقارير بعد</p>
                  <button onClick={() => setTab("generate")} className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto">
                    <Plus className="w-3.5 h-3.5" /> أنشئ أول تقرير
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{r.title}</p>
                        <p className="text-xs text-zinc-500">{r.template} • {new Date(r.created_at).toLocaleDateString("ar")}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${r.status === "completed" ? "text-green-400 bg-green-500/10 border-green-500/20" : r.status === "generating" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"}`}>
                          {r.status === "completed" ? "مكتمل" : r.status === "generating" ? "يُولَّد..." : "خطأ"}
                        </span>
                        {r.pdf_url && (
                          <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
