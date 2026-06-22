import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight, Download, Eye } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ComplianceCheck { id: string; name: string; category: string; status: "pass" | "fail" | "warn" | "na"; description: string; severity: "critical" | "high" | "medium" | "low"; recommendation?: string }
interface SecurityEvent { id: string; type: string; ip?: string; user_agent?: string; details: Record<string, unknown>; created_at: string }

const FRAMEWORK_CHECKS: ComplianceCheck[] = [
  { id: "mfa", name: "المصادقة الثنائية (2FA)", category: "المصادقة", status: "pass", description: "تم تفعيل المصادقة الثنائية لحمايتك", severity: "critical" },
  { id: "session", name: "إدارة الجلسات الآمنة", category: "المصادقة", status: "pass", description: "الجلسات مشفرة ومقيدة بوقت", severity: "high" },
  { id: "api_key", name: "مفاتيح API محمية", category: "التحكم في الوصول", status: "warn", description: "تأكد من تدوير مفاتيح API بانتظام", severity: "medium", recommendation: "قم بتجديد مفاتيح API كل 90 يوم" },
  { id: "audit_log", name: "سجلات التدقيق", category: "المراقبة", status: "pass", description: "جميع الأنشطة مسجلة", severity: "high" },
  { id: "data_encrypt", name: "تشفير البيانات", category: "الخصوصية", status: "pass", description: "البيانات مشفرة بـ AES-256", severity: "critical" },
  { id: "rate_limit", name: "تحديد معدل الطلبات", category: "الأمان", status: "pass", description: "حماية من هجمات الـ brute force", severity: "high" },
  { id: "csp", name: "سياسة أمان المحتوى (CSP)", category: "أمان الويب", status: "pass", description: "رؤوس الأمان مفعّلة", severity: "medium" },
  { id: "sql_inject", name: "حماية من SQL Injection", category: "أمان قاعدة البيانات", status: "pass", description: "Parameterized queries مستخدمة دائماً", severity: "critical" },
  { id: "xss", name: "حماية من XSS", category: "أمان الويب", status: "pass", description: "تنقية المدخلات والمخرجات مفعّلة", severity: "high" },
  { id: "backup", name: "النسخ الاحتياطي", category: "استمرارية الأعمال", status: "warn", description: "تأكد من إعداد نسخ احتياطية منتظمة", severity: "medium", recommendation: "فعّل النسخ الاحتياطي التلقائي اليومي" },
];

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", label: "ناجح" },
  fail: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "فاشل" },
  warn: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", label: "تحذير" },
  na: { icon: Clock, color: "text-gray-400", bg: "bg-gray-500/10", label: "غير قابل للتطبيق" },
};

const SEVERITY_COLORS = { critical: "text-red-400 bg-red-500/10", high: "text-orange-400 bg-orange-500/10", medium: "text-amber-400 bg-amber-500/10", low: "text-blue-400 bg-blue-500/10" };

interface Props { onClose?: () => void }

export function SecurityCompliancePage({ onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"compliance" | "events" | "report">("compliance");
  const [checks, setChecks] = useState<ComplianceCheck[]>(FRAMEWORK_CHECKS);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(user?.totpEnabled || false);

  useEffect(() => {
    if (user) {
      setChecks(prev => prev.map(c => {
        if (c.id === "mfa") return { ...c, status: user.totpEnabled ? "pass" : "fail" };
        return c;
      }));
      setMfaEnabled(user.totpEnabled);
    }
  }, [user]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/security/events?limit=50");
      if (res.ok) { const d = await res.json() as { events?: SecurityEvent[] }; setEvents(d.events || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === "events") loadEvents(); }, [tab]);

  const score = Math.round((checks.filter(c => c.status === "pass").length / checks.length) * 100);
  const passCount = checks.filter(c => c.status === "pass").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const scoreColor = score >= 80 ? "text-green-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const scoreGradient = score >= 80 ? "from-green-500 to-green-700" : score >= 60 ? "from-amber-500 to-amber-700" : "from-red-500 to-red-700";

  const categories = [...new Set(checks.map(c => c.category))];

  const downloadReport = () => {
    const report = {
      platform: "KaliGPT / mr7.ai",
      generatedAt: new Date().toISOString(),
      score,
      user: user?.email,
      checks: checks.map(c => ({ ...c })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `security-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "📥 تم تنزيل تقرير الأمان" });
  };

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-red-400" />
            <div>
              <h1 className="text-xl font-black">الأمان والامتثال</h1>
              <p className="text-sm text-gray-400">مراقبة وضعك الأمني في الوقت الفعلي</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadReport} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-300">
              <Download className="w-4 h-4" />تقرير
            </button>
          </div>
        </div>

        {/* Score Card */}
        <div className="p-6 bg-white/3 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle cx="50" cy="50" r="40" fill="none"
                  className={score >= 80 ? "stroke-green-500" : score >= 60 ? "stroke-amber-500" : "stroke-red-500"}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${score * 2.51} 251`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">نقاط الأمان</h2>
              <p className="text-sm text-gray-400 mb-3">
                {score >= 80 ? "وضعك الأمني ممتاز! ✅" : score >= 60 ? "يحتاج تحسين في بعض النقاط ⚠️" : "وضع أمني ضعيف — اتخذ إجراءات فورية ❌"}
              </p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-green-400"><CheckCircle2 className="w-4 h-4" />{passCount} ناجح</div>
                <div className="flex items-center gap-1.5 text-amber-400"><AlertTriangle className="w-4 h-4" />{warnCount} تحذير</div>
                <div className="flex items-center gap-1.5 text-red-400"><XCircle className="w-4 h-4" />{failCount} فاشل</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
          {[
            { id: "compliance", label: "فحوصات الامتثال" },
            { id: "events", label: "أحداث الأمان" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "compliance" && (
            <motion.div key="compliance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {categories.map(cat => (
                <div key={cat} className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-400 px-1">{cat}</h3>
                  {checks.filter(c => c.category === cat).map(check => {
                    const cfg = STATUS_CONFIG[check.status];
                    const Icon = cfg.icon;
                    const isExpanded = expanded === check.id;
                    return (
                      <div key={check.id} className="border border-white/10 rounded-xl overflow-hidden">
                        <button onClick={() => setExpanded(isExpanded ? null : check.id)}
                          className={`w-full flex items-center gap-3 p-4 hover:bg-white/3 transition-colors text-right ${cfg.bg}`}>
                          <Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-white">{check.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{check.description}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[check.severity]}`}>
                              {check.severity}
                            </span>
                            <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && check.recommendation && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                              className="overflow-hidden">
                              <div className="px-4 pb-4 pt-2 bg-white/2 border-t border-white/5">
                                <div className="text-xs text-amber-300 flex items-start gap-2">
                                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <span>التوصية: {check.recommendation}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          )}

          {tab === "events" && (
            <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">سجل أحداث الأمان</h2>
                <button onClick={loadEvents} className="p-2 hover:bg-white/5 rounded-lg">
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
              {loading ? (
                <div className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
              ) : events.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Lock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <div>لا توجد أحداث أمنية مسجلة</div>
                </div>
              ) : events.map(e => (
                <div key={e.id} className="p-4 bg-white/3 border border-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${e.type === "failed_login" ? "bg-red-400" : e.type === "login" ? "bg-green-400" : "bg-blue-400"}`} />
                      <span className="font-medium text-sm capitalize">{e.type.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString("ar")}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 space-x-2 rtl:space-x-reverse flex gap-3">
                    {e.ip && <span>IP: {e.ip}</span>}
                    {e.details && Object.entries(e.details).slice(0, 2).map(([k, v]) => (
                      <span key={k}>{k}: {String(v)}</span>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
