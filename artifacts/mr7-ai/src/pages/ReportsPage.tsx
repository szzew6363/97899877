/**
 * ReportsPage — 3D Holographic Pentest Report Generator
 * PDF export · CVSS scoring · executive summary · timeline · risk matrix
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Plus, Download, Trash2, Edit3, RefreshCw, CheckCircle2, AlertTriangle, Shield, Clock, BarChart2, Target, Globe, Lock, ChevronRight, Eye } from "lucide-react";

interface Finding { id: string; title: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"; cvss: number; description: string; recommendation: string; status: "open" | "mitigated" | "accepted" }
interface Report { id: string; title: string; client: string; date: string; scope: string; tester: string; findings: Finding[]; status: "draft" | "review" | "final" }

const SEV_COLOR: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22d3ee", INFO: "#6b7280" };
const SEV_SCORE: Record<string, number> = { CRITICAL: 9.0, HIGH: 7.0, MEDIUM: 5.0, LOW: 3.0, INFO: 0.0 };

const MOCK_REPORT: Report = {
  id: "1", title: "تقرير اختبار الاختراق — تطبيق المصرف الإلكتروني", client: "البنك الأهلي التجاري", date: "2025-06-20", scope: "webapp.bank.sa, api.bank.sa", tester: "فريق KaliGPT", status: "draft",
  findings: [
    { id: "1", title: "SQL Injection في نقطة نهاية تسجيل الدخول", severity: "CRITICAL", cvss: 9.8, description: "يمكن للمهاجم تجاوز المصادقة وقراءة قاعدة البيانات كاملة.", recommendation: "استخدم Parameterized Queries، تحقق من المدخلات.", status: "open" },
    { id: "2", title: "كلمات مرور مخزنة بنص واضح", severity: "CRITICAL", cvss: 9.5, description: "تم العثور على كلمات مرور بنص واضح في ملفات اللوج.", recommendation: "استخدم bcrypt مع salt عشوائي لتخزين كلمات المرور.", status: "mitigated" },
    { id: "3", title: "XSS في صفحة الملف الشخصي", severity: "HIGH", cvss: 7.2, description: "إمكانية حقن سكريبت خبيث في حقل اسم المستخدم.", recommendation: "تطبيق CSP headers، escape جميع مخرجات HTML.", status: "open" },
    { id: "4", title: "CORS مفتوح بشكل مفرط", severity: "MEDIUM", cvss: 5.4, description: "الخادم يقبل طلبات من أي أصل (*).", recommendation: "تحديد النطاقات المسموحة في إعدادات CORS.", status: "open" },
    { id: "5", title: "رؤوس HTTP مفقودة", severity: "LOW", cvss: 3.1, description: "غياب Security Headers مثل X-Frame-Options.", recommendation: "إضافة X-Frame-Options، HSTS، X-Content-Type.", status: "accepted" },
    { id: "6", title: "إصدار الخادم مكشوف", severity: "INFO", cvss: 0.0, description: "رأس Server يكشف نسخة Nginx.", recommendation: "إزالة معلومات الإصدار من رأس Server.", status: "open" },
  ],
};

// ── Risk Matrix ───────────────────────────────────────────────────────────────
function RiskMatrix({ findings }: { findings: Finding[] }) {
  const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  findings.forEach(f => counts[f.severity]++);
  return (
    <div className="flex items-end gap-2 h-16">
      {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map(s => (
        <div key={s} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-md flex items-end justify-center" style={{ height: `${(counts[s] / findings.length) * 60 + 4}px`, backgroundColor: `${SEV_COLOR[s]}cc`, boxShadow: counts[s] > 0 ? `0 0 8px ${SEV_COLOR[s]}60` : "none" }}>
            {counts[s] > 0 && <span className="text-[10px] font-black text-white mb-0.5">{counts[s]}</span>}
          </div>
          <span className="text-[8px] text-zinc-600">{s.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}

interface Props { onClose?: () => void }

export function ReportsPage({ onClose }: Props) {
  const [report, setReport] = useState<Report>(MOCK_REPORT);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<"overview" | "findings" | "timeline">("overview");

  const open = report.findings.filter(f => f.status === "open").length;
  const mitigated = report.findings.filter(f => f.status === "mitigated").length;
  const avgCVSS = (report.findings.reduce((s, f) => s + f.cvss, 0) / report.findings.length).toFixed(1);

  const generatePDF = useCallback(async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    setGenerating(false);
    // Simulate download
    const content = `PENTEST REPORT\n${report.title}\nClient: ${report.client}\nDate: ${report.date}\n\nFindings: ${report.findings.length}\nOpen: ${open}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pentest-report-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, [report, open]);

  const toggleStatus = (id: string) => {
    setReport(r => ({ ...r, findings: r.findings.map(f => f.id === id ? { ...f, status: f.status === "open" ? "mitigated" : "open" } : f) }));
  };

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 20%,rgba(139,92,246,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><FileText className="w-5 h-5 text-purple-400" /></div>
          <div><h2 className="text-base font-bold text-white">تقارير Pentest — PDF Generator</h2><p className="text-xs text-zinc-600">{report.findings.length} نتيجة · {open} مفتوح · CVSS متوسط {avgCVSS}</p></div>
        </div>
        <div className="flex items-center gap-2">
          {(["overview", "findings", "timeline"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-purple-500/20 border border-purple-500/25 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "overview" ? "نظرة عامة" : t === "findings" ? "النتائج" : "الجدول الزمني"}
            </button>
          ))}
          <button onClick={generatePDF} disabled={generating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 border border-purple-500/25 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 transition-all">
            {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}PDF
          </button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">

        {tab === "overview" && (
          <>
            <div className="p-4 rounded-xl bg-purple-500/6 border border-purple-500/15 space-y-2">
              <h3 className="text-base font-bold text-white">{report.title}</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div><span className="text-zinc-600">العميل: </span><span className="text-zinc-300">{report.client}</span></div>
                <div><span className="text-zinc-600">التاريخ: </span><span className="text-zinc-300">{report.date}</span></div>
                <div><span className="text-zinc-600">النطاق: </span><span className="text-zinc-300 font-mono text-[11px]">{report.scope}</span></div>
                <div><span className="text-zinc-600">المختبر: </span><span className="text-zinc-300">{report.tester}</span></div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${report.status === "draft" ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : report.status === "final" ? "bg-green-500/15 border-green-500/25 text-green-400" : "bg-blue-500/15 border-blue-500/25 text-blue-400"}`}>
                  {report.status === "draft" ? "مسودة" : report.status === "final" ? "نهائي" : "مراجعة"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{ l: "إجمالي النتائج", v: report.findings.length, c: "#8b5cf6" }, { l: "مفتوح", v: open, c: "#ef4444" }, { l: "مخفَّف", v: mitigated, c: "#10b981" }].map(({ l, v, c }) => (
                <div key={l} className="p-3.5 rounded-xl border text-center" style={{ background: `${c}0d`, borderColor: `${c}20` }}>
                  <p className="text-2xl font-black text-white">{v}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-white/3 border border-white/6">
              <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5 text-purple-400" />مصفوفة المخاطر</p>
              <RiskMatrix findings={report.findings} />
            </div>
          </>
        )}

        {tab === "findings" && (
          <div className="space-y-2">
            {report.findings.sort((a, b) => b.cvss - a.cvss).map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-4 rounded-xl border" style={{ background: `${SEV_COLOR[f.severity]}08`, borderColor: `${SEV_COLOR[f.severity]}20` }}>
                <div className="flex items-start gap-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ backgroundColor: `${SEV_COLOR[f.severity]}25`, color: SEV_COLOR[f.severity] }}>{f.severity}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{f.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">CVSS: <span className="font-bold" style={{ color: SEV_COLOR[f.severity] }}>{f.cvss}</span></p>
                    <p className="text-xs text-zinc-400 mt-1.5">{f.description}</p>
                    <p className="text-xs text-zinc-500 mt-1"><span className="text-purple-400">التوصية: </span>{f.recommendation}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.status === "open" ? "bg-red-500/15 text-red-400" : f.status === "mitigated" ? "bg-green-500/15 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {f.status === "open" ? "مفتوح" : f.status === "mitigated" ? "مخفَّف" : "مقبول"}
                    </span>
                    <button onClick={() => toggleStatus(f.id)} className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-green-400 transition-colors"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "timeline" && (
          <div className="relative">
            <div className="absolute right-4 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/30 to-transparent" />
            {[
              { date: "2025-06-15", event: "بدء اختبار الاختراق", color: "#8b5cf6" },
              { date: "2025-06-16", event: "اكتشاف SQL Injection الحرج", color: "#ef4444" },
              { date: "2025-06-17", event: "اكتشاف 3 ثغرات إضافية", color: "#f97316" },
              { date: "2025-06-18", event: "بدء مرحلة التحليل والتوثيق", color: "#3b82f6" },
              { date: "2025-06-19", event: "عرض النتائج على العميل", color: "#10b981" },
              { date: "2025-06-20", event: "إصدار التقرير الأولي", color: "#8b5cf6" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className="flex items-start gap-4 mb-4 mr-8 relative">
                <div className="absolute -right-6 top-1 w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}80` }} />
                <div className="flex-1 p-3 rounded-xl bg-white/3 border border-white/6">
                  <p className="text-xs text-zinc-600 mb-0.5">{item.date}</p>
                  <p className="text-sm text-zinc-200">{item.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
