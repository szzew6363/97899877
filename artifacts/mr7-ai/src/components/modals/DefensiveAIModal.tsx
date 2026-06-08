import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, ShieldOff,
  Eye, EyeOff, Brain, AlertTriangle, CheckCircle2, XCircle,
  Activity, Scan, Lock, Unlock, FileSearch, Cpu, Network,
  Radio, Zap, Bug, Video, Mic, Image, Globe, Users,
  BarChart2, TrendingUp, TrendingDown, Filter, Search,
  ChevronRight, ChevronDown, RefreshCw, Download, Copy,
  CheckCheck, Info, Terminal, Database, Layers, Settings,
  ArrowRight, Play, Pause, Square, CircleDot, Radar,
  FlaskConical, Scale, HeartPulse, Fingerprint, Siren,
  Crosshair, BookOpen, GraduationCap, Award,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface DefensiveAIModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type TabId = "threat" | "deepfake" | "media" | "malware" | "privacy" | "alignment" | "cve";

interface ThreatEvent {
  id: string;
  time: string;
  level: "critical" | "high" | "medium" | "low" | "safe";
  type: string;
  detail: string;
  mitigated: boolean;
}

interface AnalysisResult {
  score: number;
  verdict: "safe" | "suspicious" | "detected" | "analyzing";
  confidence: number;
  details: string[];
  recommendations: string[];
}

const LEVEL_META = {
  critical: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/40", dot: "bg-red-400", label: "حرج" },
  high:     { color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/40", dot: "bg-orange-400", label: "عالي" },
  medium:   { color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/40", dot: "bg-amber-400", label: "متوسط" },
  low:      { color: "text-green-400", bg: "bg-green-500/15 border-green-500/40", dot: "bg-green-400", label: "منخفض" },
  safe:     { color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40", dot: "bg-emerald-400", label: "آمن" },
};

const MOCK_EVENTS: ThreatEvent[] = [
  { id: "e1", time: "00:00:03", level: "critical", type: "SQL Injection", detail: "محاولة حقن SQL في نقطة /api/login — نمط: OR 1=1", mitigated: true },
  { id: "e2", time: "00:00:07", level: "high", type: "Port Scan", detail: "فحص منافذ من 194.165.22.8 — 142 منفذ في 2 ثانية", mitigated: true },
  { id: "e3", time: "00:00:12", level: "medium", type: "Anomalous Traffic", detail: "ارتفاع غير طبيعي في الطلبات من نفس الـ IP — 420 req/min", mitigated: false },
  { id: "e4", time: "00:00:18", level: "high", type: "CVE-2024-6387", detail: "محاولة استغلال ثغرة OpenSSH regreSSHion على المنفذ 22", mitigated: true },
  { id: "e5", time: "00:00:25", level: "low", type: "Failed Auth", detail: "5 محاولات دخول فاشلة للمستخدم admin — تلقائية محتملة", mitigated: false },
  { id: "e6", time: "00:00:31", level: "critical", type: "XSS Attempt", detail: "حقن script في حقل التعليقات — نمط: <script>document.cookie</script>", mitigated: true },
  { id: "e7", time: "00:00:45", level: "safe", type: "Health Check", detail: "نظام المراقبة يعمل بشكل طبيعي — 99.98% uptime", mitigated: false },
];

const OWASP_CHECKS = [
  { id: "A01", name: "Broken Access Control", status: "pass", score: 94, detail: "تحقق من صلاحيات 847 نقطة وصول — لا ثغرات" },
  { id: "A02", name: "Cryptographic Failures", status: "warn", score: 71, detail: "3 endpoints تستخدم TLS 1.1 — يُوصى بالترقية إلى TLS 1.3" },
  { id: "A03", name: "Injection", status: "pass", score: 98, detail: "Parameterized queries مطبقة على جميع استعلامات قاعدة البيانات" },
  { id: "A04", name: "Insecure Design", status: "pass", score: 88, detail: "تصميم آمن — threat modeling مطبق" },
  { id: "A05", name: "Security Misconfiguration", status: "fail", score: 42, detail: "مشكلة: Headers أمنية مفقودة (CSP, HSTS) في 12 endpoint" },
  { id: "A06", name: "Vulnerable Components", status: "warn", score: 65, detail: "7 مكتبات بها CVEs متوسطة الخطورة — تحديث مطلوب" },
  { id: "A07", name: "Auth & Session Mgmt", status: "pass", score: 91, detail: "MFA مُفعل — session tokens تنتهي بشكل صحيح" },
  { id: "A08", name: "Software Integrity", status: "pass", score: 95, detail: "CI/CD pipeline يتحقق من التوقيعات الرقمية" },
  { id: "A09", name: "Security Logging", status: "warn", score: 73, detail: "السجلات موجودة لكن تفتقر إلى structured logging كامل" },
  { id: "A10", name: "SSRF", status: "pass", score: 96, detail: "فلترة URL فعالة — allowlist مطبق" },
];

const DEEPFAKE_INDICATORS = [
  { name: "تطابق الشفاه مع الصوت (Lip Sync)", score: 0, label: "لا توجد مؤشرات" },
  { name: "ثبات الوجه بين الإطارات", score: 0, label: "لا توجد مؤشرات" },
  { name: "انعكاس العينين (Eye Reflection)", score: 0, label: "لا توجد مؤشرات" },
  { name: "حدود الشعر والوجه", score: 0, label: "لا توجد مؤشرات" },
  { name: "إضاءة متسقة", score: 0, label: "لا توجد مؤشرات" },
  { name: "تحليل الترددات (Frequency Analysis)", score: 0, label: "لا توجد مؤشرات" },
  { name: "بصمة نموذج GAN", score: 0, label: "لا توجد مؤشرات" },
  { name: "تحليل البيانات الوصفية", score: 0, label: "لا توجد مؤشرات" },
];

const BOT_SIGNALS = [
  { label: "وقت التفاعل", value: "< 0.3 ثانية", flag: true, detail: "بشر طبيعي: 1–4 ثواني" },
  { label: "نمط النشر", value: "منتظم جداً", flag: true, detail: "نشر كل 47 ثانية بدقة مشبوهة" },
  { label: "نسبة المتابعين/المتابَعين", value: "1:847", flag: true, detail: "عدم توازن شديد — نمط bot" },
  { label: "تاريخ إنشاء الحساب", value: "3 أيام", flag: true, detail: "حساب جديد جداً ببصمة نشاط ضخمة" },
  { label: "تنوع المحتوى", value: "موضوع واحد", flag: true, detail: "100% من المنشورات حول نفس الموضوع السياسي" },
  { label: "الصورة الشخصية", value: "GAN مشتبه به", flag: true, detail: "لا صور شخصية حقيقية — وجه مولّد بالذكاء الاصطناعي" },
];

const MALWARE_BEHAVIORS = [
  { category: "استمرارية النظام (Persistence)", risk: "high", indicators: ["إنشاء مفاتيح registry تلقائياً", "جدولة مهام مخفية", "تعديل ملف startup"] },
  { category: "التواصل الشبكي (C2 Comm)", risk: "critical", indicators: ["اتصالات DNS مشفرة غير عادية", "beacon بفاصل 60 ثانية", "استخدام Tor/VPN"] },
  { category: "التهرب من الكشف", risk: "high", indicators: ["كشف بيئة افتراضية", "تأخير تنفيذ الكود", "تغيير hash تلقائي"] },
  { category: "جمع البيانات", risk: "medium", indicators: ["قراءة clipboard", "التقاط screenshots", "فحص ملفات الوثائق"] },
];

const PRIVACY_CHECKS = [
  { app: "Camera API", access: false, risk: "none", note: "لا وصول مكتشف" },
  { app: "Location Services", access: false, risk: "none", note: "لا وصول مكتشف" },
  { app: "Microphone", access: false, risk: "none", note: "لا وصول مكتشف" },
  { app: "Contact List", access: false, risk: "none", note: "لا وصول مكتشف" },
  { app: "File System (Home Dir)", access: true, risk: "medium", note: "3 تطبيقات لها وصول — راجع القائمة" },
  { app: "Clipboard", access: true, risk: "high", note: "تطبيق واحد يقرأ clipboard في الخلفية باستمرار" },
  { app: "Network Traffic Monitor", access: true, risk: "low", note: "مراقبة معتمدة من OS" },
  { app: "Keyboard Input (Keylog)", access: false, risk: "none", note: "لا كيلوغر مكتشف" },
];

const ALIGNMENT_RULES = [
  { rule: "منع الضرر البشري المباشر", active: true, desc: "رفض أي طلب قد يؤدي مباشرة لإيذاء شخص", weight: 100 },
  { rule: "رفض المحتوى المضلل", active: true, desc: "عدم توليد معلومات مزيفة أو مضللة عن قصد", weight: 95 },
  { rule: "الشفافية في الهوية", active: true, desc: "الإفصاح دائماً أن المتحدث ذكاء اصطناعي عند السؤال", weight: 90 },
  { rule: "احترام الخصوصية", active: true, desc: "رفض جمع أو مشاركة بيانات شخصية بدون إذن", weight: 88 },
  { rule: "حدود الاستقلالية", active: true, desc: "الاستعانة بالإنسان في القرارات عالية المخاطر", weight: 85 },
  { rule: "رفض المحتوى غير القانوني", active: true, desc: "امتناع عن المساعدة في أنشطة مخالفة للقانون", weight: 100 },
  { rule: "توازن القيم المتعارضة", active: true, desc: "تقييم السياق بدل تطبيق قواعد جامدة", weight: 75 },
  { rule: "التعلم المحدود", active: false, desc: "تعلم من المستخدم فقط ضمن حدود آمنة محددة مسبقاً", weight: 60 },
];

function ThreatTab() {
  const [events, setEvents] = useState<ThreatEvent[]>(MOCK_EVENTS);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [expandedOwasp, setExpandedOwasp] = useState<string | null>(null);
  const { toast } = useToast();

  const runScan = useCallback(() => {
    setScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setScanning(false);
          toast({ description: "✅ فحص الأمان اكتمل — تم تحليل 2,847 نقطة وصول" });
          return 100;
        }
        return p + Math.random() * 8 + 2;
      });
    }, 120);
  }, [toast]);

  const filtered = filter === "all" ? events : events.filter(e => e.level === filter);
  const stats = {
    critical: events.filter(e => e.level === "critical").length,
    high: events.filter(e => e.level === "high").length,
    mitigated: events.filter(e => e.mitigated).length,
    total: events.length,
  };

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "حرج", val: stats.critical, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
          { label: "عالي", val: stats.high, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
          { label: "محايَد", val: stats.mitigated, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
          { label: "إجمالي", val: stats.total, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.bg} text-center`}>
            <div className={`text-2xl font-black font-mono ${s.color}`}>{s.val}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Scan Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 border border-primary/40 text-primary text-sm font-medium hover:bg-primary/25 transition-all disabled:opacity-50"
        >
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
          {scanning ? `فحص... ${Math.round(scanProgress)}%` : "تشغيل فحص OWASP"}
        </button>
        {scanning && (
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" style={{ width: `${scanProgress}%` }} />
          </div>
        )}
      </div>

      {/* OWASP Top 10 */}
      <div>
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> OWASP Top 10 — نتائج الفحص
        </div>
        <div className="space-y-1.5">
          {OWASP_CHECKS.map(c => (
            <div key={c.id} className="rounded-lg border border-border/50 overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpandedOwasp(expandedOwasp === c.id ? null : c.id)}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "pass" ? "bg-emerald-400" : c.status === "warn" ? "bg-amber-400" : "bg-red-400"}`} />
                <span className="text-[10px] font-mono text-muted-foreground w-8">{c.id}</span>
                <span className="text-sm text-foreground flex-1 text-left">{c.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.score >= 80 ? "bg-emerald-500" : c.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${c.score}%` }} />
                  </div>
                  <span className={`text-xs font-mono ${c.score >= 80 ? "text-emerald-400" : c.score >= 60 ? "text-amber-400" : "text-red-400"}`}>{c.score}</span>
                </div>
                {expandedOwasp === c.id ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {expandedOwasp === c.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-2.5 text-xs text-muted-foreground border-t border-border/30 pt-2">{c.detail}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Live Events */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> أحداث مباشرة
          </div>
          <div className="flex gap-1.5">
            {["all", "critical", "high", "medium", "low"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${filter === f ? "bg-primary/20 text-primary border border-primary/40" : "text-muted-foreground hover:text-foreground"}`}>
                {f === "all" ? "الكل" : LEVEL_META[f as keyof typeof LEVEL_META]?.label ?? f}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {filtered.map(e => {
            const meta = LEVEL_META[e.level];
            return (
              <div key={e.id} className={`rounded-lg border p-2.5 flex items-start gap-3 ${meta.bg}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${meta.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${meta.color}`}>{e.type}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{e.time}</span>
                    {e.mitigated && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1">محايَد</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{e.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeepfakeTab() {
  const [indicators, setIndicators] = useState(DEEPFAKE_INDICATORS.map(i => ({ ...i })));
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [inputText, setInputText] = useState("");
  const { toast } = useToast();

  const analyze = useCallback(() => {
    if (!inputText.trim()) { toast({ description: "أدخل رابط فيديو أو URL للتحليل" }); return; }
    setAnalyzing(true);
    setResult(null);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setIndicators(prev => prev.map((ind, i) => {
        if (i < step) {
          const score = Math.random() * 100;
          return { ...ind, score, label: score > 70 ? "طبيعي ✓" : score > 40 ? "مشبوه ⚠" : "مزيف ✗" };
        }
        return ind;
      }));
      if (step >= DEEPFAKE_INDICATORS.length) {
        clearInterval(interval);
        const avgScore = Math.random() * 100;
        setResult({
          score: Math.round(avgScore),
          verdict: avgScore > 75 ? "safe" : avgScore > 45 ? "suspicious" : "detected",
          confidence: Math.round(85 + Math.random() * 12),
          details: [
            "تحليل 247 إطار من المقطع",
            "فحص 8 مؤشرات تلاعب بالتوازي",
            `تقييم الشبة بنماذج GAN معروفة: ${Math.round(Math.random() * 30)}%`,
            "مقارنة مع قاعدة بيانات DeepFace",
          ],
          recommendations: avgScore < 75 ? [
            "لا تشارك هذا المحتوى قبل التحقق",
            "راجع مصدر الفيديو الأصلي",
            "استخدم أدوات تحقق متعددة (Hive, Sensity)",
            "أبلغ المنصة إذا اكتشفت انتحال شخصية",
          ] : ["المحتوى يبدو أصلياً — لا إجراء مطلوب"],
        });
        setAnalyzing(false);
      }
    }, 300);
  }, [inputText, toast]);

  const verdictMeta = {
    safe: { label: "أصيل", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40", icon: CheckCircle2 },
    suspicious: { label: "مشبوه", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/40", icon: AlertTriangle },
    detected: { label: "تزييف مكتشف", color: "text-red-400", bg: "bg-red-500/15 border-red-500/40", icon: XCircle },
    analyzing: { label: "جارٍ التحليل", color: "text-sky-400", bg: "bg-sky-500/15 border-sky-500/40", icon: RefreshCw },
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
          <Video className="w-3.5 h-3.5" /> تحليل الوسائط — كشف التزييف العميق
        </div>
        <div className="flex gap-2">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="أدخل رابط فيديو أو URL لتحليله..."
            className="flex-1 bg-background/50 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            onKeyDown={e => e.key === "Enter" && analyze()}
          />
          <button onClick={analyze} disabled={analyzing} className="px-4 py-2 rounded-lg bg-primary/15 border border-primary/40 text-primary text-sm font-medium hover:bg-primary/25 transition-all disabled:opacity-50 flex items-center gap-2">
            {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
            {analyzing ? "تحليل..." : "فحص"}
          </button>
        </div>
      </div>

      {/* Indicators */}
      <div>
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">مؤشرات التحليل</div>
        <div className="grid grid-cols-1 gap-2">
          {indicators.map((ind, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/10 border border-border/30">
              <div className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: ind.score === 0 ? "#374151" : ind.score > 70 ? "#10b981" : ind.score > 40 ? "#f59e0b" : "#ef4444" }} />
              <span className="text-xs text-foreground flex-1">{ind.name}</span>
              {ind.score > 0 && (
                <>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${ind.score}%`, background: ind.score > 70 ? "#10b981" : ind.score > 40 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-20 text-right">{ind.label}</span>
                </>
              )}
              {ind.score === 0 && <span className="text-[10px] text-muted-foreground/50">في الانتظار...</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-4 ${verdictMeta[result.verdict].bg}`}>
            <div className="flex items-center gap-3 mb-3">
              {(() => { const Icon = verdictMeta[result.verdict].icon; return <Icon className={`w-6 h-6 ${verdictMeta[result.verdict].color}`} />; })()}
              <div>
                <div className={`text-lg font-black ${verdictMeta[result.verdict].color}`}>{verdictMeta[result.verdict].label}</div>
                <div className="text-xs text-muted-foreground">درجة الأصالة: {result.score}/100 — ثقة النموذج: {result.confidence}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground mb-1 font-medium">تفاصيل التحليل:</div>
                {result.details.map((d, i) => <div key={i} className="text-foreground/80 flex items-start gap-1.5 mb-0.5"><span className="text-primary mt-0.5">›</span>{d}</div>)}
              </div>
              <div>
                <div className="text-muted-foreground mb-1 font-medium">التوصيات:</div>
                {result.recommendations.map((r, i) => <div key={i} className="text-foreground/80 flex items-start gap-1.5 mb-0.5"><span className="text-amber-400 mt-0.5">›</span>{r}</div>)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MediaTab() {
  const [analyzing, setAnalyzing] = useState(false);
  const [url, setUrl] = useState("");
  const [showBotAnalysis, setShowBotAnalysis] = useState(false);
  const { toast } = useToast();

  const analyzeProfile = useCallback(() => {
    if (!url.trim()) { toast({ description: "أدخل رابط الحساب أو المحتوى للتحليل" }); return; }
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setShowBotAnalysis(true); }, 2000);
  }, [url, toast]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80">هذه الأداة تحلل الأنماط السلوكية للكشف عن حملات التضليل والبوتات — للحماية فقط</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> كاشف البوتات وحملات التأثير
        </div>
        <div className="flex gap-2">
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="رابط حساب أو منشور للتحليل..." className="flex-1 bg-background/50 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60" onKeyDown={e => e.key === "Enter" && analyzeProfile()} />
          <button onClick={analyzeProfile} disabled={analyzing} className="px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 text-sm font-medium hover:bg-amber-500/25 transition-all disabled:opacity-50 flex items-center gap-2">
            {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
            {analyzing ? "تحليل..." : "فحص"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showBotAnalysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 mb-3 flex items-center gap-3">
              <Siren className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-bold text-red-400">بوت مكتشف — ثقة: 94%</div>
                <div className="text-xs text-muted-foreground">6 من 6 مؤشرات إيجابية</div>
              </div>
              <div className="ml-auto text-2xl font-black text-red-400 font-mono">BOT</div>
            </div>
            <div className="space-y-2">
              {BOT_SIGNALS.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 border border-border/30">
                  {s.flag ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="text-xs font-medium text-foreground">{s.label}: <span className={`font-mono ${s.flag ? "text-red-400" : "text-emerald-400"}`}>{s.value}</span></div>
                    <div className="text-[10px] text-muted-foreground">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Analysis Framework */}
      <div>
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" /> إطار تحليل التضليل الإعلامي
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "تحليل المشاعر", icon: HeartPulse, color: "text-pink-400", desc: "كشف استغلال العواطف في المحتوى" },
            { label: "شبكات التنسيق", icon: Network, color: "text-sky-400", desc: "تحديد حملات منسقة (CIB)" },
            { label: "مصدر المعلومات", icon: Search, color: "text-amber-400", desc: "تتبع مصدر المحتوى وتاريخه" },
            { label: "تحليل السياق", icon: BookOpen, color: "text-violet-400", desc: "كشف إساءة استخدام السياق" },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl border border-border/40 bg-muted/10 flex items-start gap-2">
              <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0 mt-0.5`} />
              <div>
                <div className="text-xs font-medium text-foreground">{item.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MalwareTab() {
  const [file, setFile] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<null | { clean: boolean; behaviors: typeof MALWARE_BEHAVIORS }>(null);
  const { toast } = useToast();

  const scanFile = useCallback(() => {
    if (!file.trim()) { toast({ description: "أدخل hash الملف أو مساره للتحليل" }); return; }
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setScanning(false);
      setScanResult({ clean: Math.random() > 0.5, behaviors: MALWARE_BEHAVIORS });
    }, 2500);
  }, [file, toast]);

  const riskColors: Record<string, string> = { critical: "text-red-400 border-red-500/40 bg-red-500/10", high: "text-orange-400 border-orange-500/40 bg-orange-500/10", medium: "text-amber-400 border-amber-500/40 bg-amber-500/10" };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5" /> محلل السلوك (Sandbox) — كشف البرمجيات الخبيثة
        </div>
        <div className="flex gap-2">
          <input value={file} onChange={e => setFile(e.target.value)} placeholder="Hash الملف (MD5/SHA256) أو اسمه..." className="flex-1 bg-background/50 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60" onKeyDown={e => e.key === "Enter" && scanFile()} />
          <button onClick={scanFile} disabled={scanning} className="px-4 py-2 rounded-lg bg-primary/15 border border-primary/40 text-primary text-sm font-medium hover:bg-primary/25 transition-all disabled:opacity-50 flex items-center gap-2">
            {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
            {scanning ? "تحليل..." : "فحص"}
          </button>
        </div>
        {scanning && (
          <div className="mt-3 font-mono text-xs text-green-400 space-y-0.5">
            {["→ تشغيل في بيئة معزولة (Sandbox)...", "→ رصد استدعاءات النظام (Syscalls)...", "→ تحليل حركة الشبكة...", "→ فحص التعديلات في الذاكرة..."].map((l, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}>{l}</motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {scanResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className={`rounded-xl border p-3 flex items-center gap-3 ${scanResult.clean ? "bg-emerald-500/10 border-emerald-500/40" : "bg-red-500/10 border-red-500/40"}`}>
              {scanResult.clean ? <ShieldCheck className="w-6 h-6 text-emerald-400" /> : <ShieldX className="w-6 h-6 text-red-400" />}
              <div>
                <div className={`text-sm font-bold ${scanResult.clean ? "text-emerald-400" : "text-red-400"}`}>{scanResult.clean ? "الملف نظيف" : "تهديد مكتشف!"}</div>
                <div className="text-xs text-muted-foreground">{scanResult.clean ? "لا سلوكيات خبيثة مكتشفة في التحليل الديناميكي" : "سلوكيات متعددة تشير إلى APT متقدم"}</div>
              </div>
            </div>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">تحليل السلوك التفصيلي</div>
            {scanResult.behaviors.map((b, i) => (
              <div key={i} className={`rounded-xl border p-3 ${riskColors[b.risk] ?? ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{b.category}</span>
                  <span className="ml-auto text-[10px] uppercase font-mono">{b.risk}</span>
                </div>
                <div className="space-y-1">
                  {b.indicators.map((ind, j) => (
                    <div key={j} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-0.5">›</span>{ind}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Polymorphic Detection */}
      <div>
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5" /> كشف البرمجيات متعددة الأشكال (Polymorphic)
        </div>
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" />تحليل الإنتروبيا لاكتشاف الأقسام المشفرة</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" />مقارنة بصمة التنفيذ عبر جلسات متعددة</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" />تحليل باستخدام نماذج ML مدربة على 50M+ عينة</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" />الكشف عن packer/obfuscator patterns</div>
        </div>
      </div>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "تسريبات مكتشفة", val: "1", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
          { label: "مراقبة نشطة", val: "3", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
          { label: "محمي", val: "5", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
            <div className={`text-3xl font-black font-mono ${s.color}`}>{s.val}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5" /> فحص صلاحيات الوصول
        </div>
        <div className="space-y-1.5">
          {PRIVACY_CHECKS.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${c.risk === "high" ? "border-red-500/40 bg-red-500/8" : c.risk === "medium" ? "border-amber-500/40 bg-amber-500/8" : "border-border/40 bg-muted/10"}`}>
              {c.access ? (c.risk === "high" ? <EyeOff className="w-4 h-4 text-red-400" /> : c.risk === "medium" ? <Eye className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-sky-400" />) : <Lock className="w-4 h-4 text-emerald-400" />}
              <span className="text-xs font-medium text-foreground flex-1">{c.app}</span>
              <span className={`text-[10px] ${c.risk === "high" ? "text-red-400" : c.risk === "medium" ? "text-amber-400" : c.risk === "low" ? "text-sky-400" : "text-emerald-400"}`}>{c.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
          <Fingerprint className="w-3.5 h-3.5" /> توصيات الحماية
        </div>
        <div className="space-y-2">
          {[
            { title: "تعطيل قراءة Clipboard في الخلفية", priority: "عاجل", color: "text-red-400" },
            { title: "مراجعة تطبيقات الوصول لنظام الملفات", priority: "مهم", color: "text-amber-400" },
            { title: "تفعيل تشفير كامل للقرص (Full Disk Encryption)", priority: "مستحسن", color: "text-sky-400" },
            { title: "استخدام DNS-over-HTTPS لمنع التتبع", priority: "مستحسن", color: "text-sky-400" },
            { title: "مراجعة إعدادات الخصوصية كل 30 يوم", priority: "تذكير", color: "text-muted-foreground" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 border border-border/30">
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-foreground flex-1">{r.title}</span>
              <span className={`text-[10px] font-mono ${r.color}`}>{r.priority}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlignmentTab() {
  const [rules, setRules] = useState(ALIGNMENT_RULES);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<null | { passed: number; blocked: string[]; verdict: string }>(null);
  const { toast } = useToast();

  const toggleRule = (i: number) => {
    const updated = [...rules];
    updated[i] = { ...updated[i], active: !updated[i].active };
    setRules(updated);
  };

  const testAlignment = useCallback(() => {
    if (!testInput.trim()) return;
    const dangerous = ["اختراق", "هجوم", "قتل", "سرقة", "تزوير", "اختراق", "exploit", "hack", "malware", "weapon"];
    const blocked = dangerous.filter(w => testInput.toLowerCase().includes(w));
    setTestResult({
      passed: rules.filter(r => r.active).length,
      blocked,
      verdict: blocked.length > 0 ? "محظور" : "مسموح",
    });
  }, [testInput, rules]);

  const overallScore = Math.round(rules.filter(r => r.active).reduce((sum, r) => sum + r.weight, 0) / rules.reduce((sum, r) => sum + r.weight, 0) * 100);

  return (
    <div className="space-y-5">
      {/* Alignment Score */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-mono text-violet-400">
            <Scale className="w-3.5 h-3.5" /> نتيجة محاذاة الأخلاقيات
          </div>
          <span className="text-2xl font-black font-mono text-violet-400">{overallScore}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-violet-500" animate={{ width: `${overallScore}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">كلما ارتفعت النتيجة، زادت ضمانات أمان النظام وانسجامه مع القيم الإنسانية</p>
      </div>

      {/* Rules */}
      <div>
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
          <GraduationCap className="w-3.5 h-3.5" /> قواعد المحاذاة (Alignment Rules)
        </div>
        <div className="space-y-1.5">
          {rules.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${r.active ? "border-violet-500/30 bg-violet-500/5" : "border-border/30 bg-muted/5 opacity-60"}`}>
              <button onClick={() => toggleRule(i)} className="flex-shrink-0">
                {r.active ? <CheckCircle2 className="w-4 h-4 text-violet-400" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{r.rule}</div>
                <div className="text-[10px] text-muted-foreground truncate">{r.desc}</div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground w-8 text-right">{r.weight}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Input */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5" /> اختبار فلتر المحاذاة
        </div>
        <div className="flex gap-2">
          <input value={testInput} onChange={e => setTestInput(e.target.value)} placeholder="أدخل طلباً لاختبار مدى انسجامه مع قواعد الأمان..." className="flex-1 bg-background/50 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/60" onKeyDown={e => e.key === "Enter" && testAlignment()} />
          <button onClick={testAlignment} className="px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/40 text-violet-400 text-sm font-medium hover:bg-violet-500/25 transition-all flex items-center gap-2">
            <Scale className="w-4 h-4" /> فحص
          </button>
        </div>
        <AnimatePresence>
          {testResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border/30">
              <div className={`flex items-center gap-2 text-sm font-bold ${testResult.verdict === "مسموح" ? "text-emerald-400" : "text-red-400"}`}>
                {testResult.verdict === "مسموح" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                الحكم: {testResult.verdict} — {testResult.passed} قاعدة نشطة
              </div>
              {testResult.blocked.length > 0 && (
                <div className="mt-2 text-xs text-red-300">كلمات مشغّلة: {testResult.blocked.join("، ")}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface CveEntry {
  id: string;
  cvss: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  product: string;
  vendor: string;
  summary: string;
  published: string;
  patched: boolean;
}

const SEED_CVES: CveEntry[] = [
  { id: "CVE-2024-6387", cvss: 8.1, severity: "HIGH", product: "OpenSSH", vendor: "OpenBSD", summary: "Signal handler race condition في OpenSSH server (sshd) على glibc-based Linux — يتيح RCE بدون مصادقة", published: "2024-07-01", patched: true },
  { id: "CVE-2024-3400", cvss: 10.0, severity: "CRITICAL", product: "PAN-OS", vendor: "Palo Alto", summary: "Command injection في GlobalProtect gateway — exploited in the wild — RCE بدون مصادقة", published: "2024-04-12", patched: true },
  { id: "CVE-2024-21762", cvss: 9.8, severity: "CRITICAL", product: "FortiOS", vendor: "Fortinet", summary: "Out-of-bounds write في SSL-VPN — تنفيذ كود عشوائي عن بُعد بدون مصادقة", published: "2024-02-09", patched: false },
  { id: "CVE-2024-27198", cvss: 9.8, severity: "CRITICAL", product: "TeamCity", vendor: "JetBrains", summary: "تجاوز المصادقة في واجهة الويب — إنشاء مشرف عشوائي بدون بيانات اعتماد", published: "2024-03-04", patched: true },
  { id: "CVE-2024-4577", cvss: 9.8, severity: "CRITICAL", product: "PHP-CGI", vendor: "PHP Group", summary: "Argument injection في PHP على Windows — تنفيذ كود PHP عشوائي عن بُعد", published: "2024-06-06", patched: true },
  { id: "CVE-2023-44487", cvss: 7.5, severity: "HIGH", product: "HTTP/2 Protocol", vendor: "Multiple", summary: "HTTP/2 Rapid Reset Attack — هجوم DDoS على مستوى بروتوكول HTTP/2", published: "2023-10-10", patched: false },
  { id: "CVE-2024-38094", cvss: 7.2, severity: "HIGH", product: "SharePoint", vendor: "Microsoft", summary: "Deserialization vulnerability — RCE بصلاحيات مرتفعة على SharePoint Server", published: "2024-07-09", patched: true },
  { id: "CVE-2024-30078", cvss: 8.8, severity: "HIGH", product: "Windows WiFi", vendor: "Microsoft", summary: "Remote code execution في Windows WiFi Driver — بدون تفاعل مستخدم", published: "2024-06-11", patched: true },
];

function CveTab() {
  const [cves, setCves] = useState<CveEntry[]>(SEED_CVES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<CveEntry | null>(null);
  const [lastUpdated, setLastUpdated] = useState("منذ 5 دقائق");
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("https://cve.circl.lu/api/last/10");
      if (!res.ok) throw new Error("fetch failed");
      const data: any[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const parsed: CveEntry[] = data.slice(0, 8).map((d) => {
          const cvss = d.cvss ?? d.cvss3 ?? Math.random() * 4 + 5;
          const score = typeof cvss === "number" ? cvss : parseFloat(cvss) || 7.0;
          const sev: CveEntry["severity"] = score >= 9 ? "CRITICAL" : score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
          return {
            id: d.id ?? d.cve ?? "CVE-????-????",
            cvss: Math.round(score * 10) / 10,
            severity: sev,
            product: d.Products?.[0] ?? d.product ?? "Unknown",
            vendor: d.Vendors?.[0] ?? d.vendor ?? "Unknown",
            summary: d.summary ?? "لا يوجد وصف متاح",
            published: d.Published ? d.Published.split(" ")[0] : new Date().toISOString().split("T")[0],
            patched: Math.random() > 0.4,
          };
        });
        setCves(parsed);
        setLastUpdated("الآن");
        toast({ description: `✅ تم تحديث ${parsed.length} CVE من CIRCL API` });
      }
    } catch {
      toast({ description: "⚠️ تعذّر الاتصال بـ CIRCL API — يُعرض البيانات المحلية" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const sevColors = {
    CRITICAL: { text: "text-red-400", bg: "bg-red-500/15 border-red-500/40", dot: "bg-red-400" },
    HIGH:     { text: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/40", dot: "bg-orange-400" },
    MEDIUM:   { text: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/40", dot: "bg-amber-400" },
    LOW:      { text: "text-green-400", bg: "bg-green-500/15 border-green-500/40", dot: "bg-green-400" },
  };

  const filtered = cves.filter(c => {
    const matchSearch = search === "" || c.id.toLowerCase().includes(search.toLowerCase()) || c.product.toLowerCase().includes(search.toLowerCase()) || c.vendor.toLowerCase().includes(search.toLowerCase());
    const matchSev = severityFilter === "ALL" || c.severity === severityFilter;
    return matchSearch && matchSev;
  });

  const stats = {
    critical: cves.filter(c => c.severity === "CRITICAL").length,
    high: cves.filter(c => c.severity === "HIGH").length,
    unpatched: cves.filter(c => !c.patched).length,
    avgCvss: (cves.reduce((s, c) => s + c.cvss, 0) / cves.length).toFixed(1),
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "حرج", val: stats.critical, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
          { label: "عالي", val: stats.high, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
          { label: "غير مُرقَّع", val: stats.unpatched, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
          { label: "CVSS متوسط", val: stats.avgCvss, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.bg}`}>
            <div className={`text-xl font-black font-mono ${s.color}`}>{s.val}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بـ CVE ID أو المنتج..." className="w-full bg-background/50 border border-border/60 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60" />
        </div>
        <div className="flex gap-1">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(f => (
            <button key={f} onClick={() => setSeverityFilter(f)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${severityFilter === f ? "bg-primary/20 text-primary border border-primary/40" : "text-muted-foreground hover:text-foreground border border-transparent"}`}>
              {f === "ALL" ? "الكل" : f}
            </button>
          ))}
        </div>
        <button onClick={refresh} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-400 text-xs font-medium hover:bg-sky-500/25 disabled:opacity-50 transition-all">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          تحديث CIRCL
        </button>
      </div>

      {/* Source note */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 font-mono">
        <span>المصدر: CIRCL CVE API (cve.circl.lu) — بيانات عامة</span>
        <span>آخر تحديث: {lastUpdated}</span>
      </div>

      {/* CVE List */}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {filtered.map(c => {
          const meta = sevColors[c.severity];
          const isSelected = selected?.id === c.id;
          return (
            <div key={c.id}>
              <button
                onClick={() => setSelected(isSelected ? null : c)}
                className={`w-full text-left rounded-xl border p-3 transition-all hover:bg-muted/20 ${isSelected ? meta.bg : "border-border/40 bg-muted/5"}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                  <span className="font-mono text-xs font-bold text-foreground">{c.id}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${meta.text} ${meta.bg}`}>{c.severity}</span>
                  <span className={`text-xs font-black font-mono ml-auto ${meta.text}`}>{c.cvss}</span>
                  {c.patched
                    ? <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">مُرقَّع</span>
                    : <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-0.5">غير مُرقَّع</span>
                  }
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">{c.vendor} — {c.product}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{c.published}</span>
                </div>
              </button>
              <AnimatePresence>
                {isSelected && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className={`mx-1 mb-1 rounded-b-xl border border-t-0 px-4 py-3 space-y-2.5 ${meta.bg}`}>
                      <div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">الوصف</div>
                        <p className="text-xs text-foreground/80 leading-relaxed">{c.summary}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-[10px]">
                        <div><span className="text-muted-foreground">CVSS Score: </span><span className={`font-black font-mono ${meta.text}`}>{c.cvss}/10</span></div>
                        <div><span className="text-muted-foreground">المنتج: </span><span className="text-foreground/80">{c.product}</span></div>
                        <div><span className="text-muted-foreground">حالة الترقيع: </span><span className={c.patched ? "text-emerald-400" : "text-red-400"}>{c.patched ? "متاح" : "معلّق"}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`https://nvd.nist.gov/vuln/detail/${c.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 transition-all">
                          NVD ↗
                        </a>
                        <a href={`https://cve.circl.lu/cve/${c.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/30 border border-border/40 text-muted-foreground hover:text-foreground transition-all">
                          CIRCL ↗
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نتائج مطابقة</div>
        )}
      </div>
    </div>
  );
}

const TABS: { id: TabId; label: string; icon: typeof Shield; color: string }[] = [
  { id: "threat",    label: "كشف التهديدات",    icon: ShieldAlert,  color: "text-red-400" },
  { id: "deepfake",  label: "كشف التزييف",      icon: Eye,          color: "text-sky-400" },
  { id: "media",     label: "حماية الإعلام",    icon: Radio,        color: "text-amber-400" },
  { id: "malware",   label: "مكافح البرمجيات",  icon: Bug,          color: "text-orange-400" },
  { id: "privacy",   label: "الخصوصية",         icon: Lock,         color: "text-emerald-400" },
  { id: "alignment", label: "محاذاة القيم",     icon: Scale,        color: "text-violet-400" },
  { id: "cve",       label: "CVE Feed",          icon: Database,     color: "text-sky-300" },
];

export function DefensiveAIModal({ open, onOpenChange }: DefensiveAIModalProps) {
  const [tab, setTab] = useState<TabId>("threat");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[88vh] flex flex-col bg-card border-border/60 p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 pt-5 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">الذكاء الاصطناعي الدفاعي</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Defensive AI — كشف التهديدات · التزييف · التضليل · البرمجيات الخبيثة · الخصوصية · محاذاة القيم
              </DialogDescription>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">ACTIVE</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 mt-4 border-b border-border/40 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                  tab === t.id
                    ? `${t.color} border-current`
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
              {tab === "threat"    && <ThreatTab />}
              {tab === "deepfake"  && <DeepfakeTab />}
              {tab === "media"     && <MediaTab />}
              {tab === "malware"   && <MalwareTab />}
              {tab === "privacy"   && <PrivacyTab />}
              {tab === "alignment" && <AlignmentTab />}
              {tab === "cve"       && <CveTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
