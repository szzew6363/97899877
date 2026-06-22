/**
 * SecurityCompliancePage — 3D Holographic Security & Compliance Dashboard
 * Threat radar · compliance checklist · CVE feed · 3D security posture
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle2, XCircle, RefreshCw, X, Lock, Globe, Eye, Zap, Activity, FileText, Clock, TrendingUp, Database, Server } from "lucide-react";

interface CVE { id: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; title: string; cvss: number; published: string; affected: string }
interface ComplianceItem { id: string; category: string; name: string; status: "pass" | "fail" | "warn"; description: string }

const MOCK_CVES: CVE[] = [
  { id: "CVE-2025-1337", severity: "CRITICAL", title: "Remote Code Execution in OpenSSL 3.x", cvss: 9.8, published: "2025-06-20", affected: "openssl >= 3.0.0" },
  { id: "CVE-2025-0892", severity: "HIGH", title: "SQL Injection in PostgreSQL Extension", cvss: 8.1, published: "2025-06-18", affected: "postgresql 14-16" },
  { id: "CVE-2025-2041", severity: "HIGH", title: "Authentication Bypass in Node.js JWT lib", cvss: 7.8, published: "2025-06-15", affected: "jsonwebtoken < 9.0.2" },
  { id: "CVE-2025-0234", severity: "MEDIUM", title: "XSS in React DOM 18.x", cvss: 6.1, published: "2025-06-12", affected: "react-dom < 18.3.1" },
  { id: "CVE-2025-1129", severity: "MEDIUM", title: "Path Traversal in Express.js", cvss: 5.9, published: "2025-06-10", affected: "express < 4.21.0" },
  { id: "CVE-2025-0891", severity: "LOW", title: "Information Disclosure in cookie library", cvss: 3.1, published: "2025-06-08", affected: "cookie < 0.7.0" },
];

const COMPLIANCE: ComplianceItem[] = [
  { id: "1", category: "المصادقة", name: "نظام JWT مع انتهاء صلاحية", status: "pass", description: "Access tokens تنتهي بعد ساعة واحدة" },
  { id: "2", category: "المصادقة", name: "التحقق الثنائي TOTP", status: "pass", description: "دعم كامل لـ TOTP/OTP" },
  { id: "3", category: "المصادقة", name: "حماية القوة الغاشمة", status: "pass", description: "قفل تلقائي بعد 5 محاولات فاشلة" },
  { id: "4", category: "التشفير", name: "HTTPS/TLS 1.3", status: "pass", description: "تشفير كل الاتصالات" },
  { id: "5", category: "التشفير", name: "تشفير كلمات المرور bcrypt", status: "pass", description: "bcrypt مع salt عشوائي" },
  { id: "6", category: "API", name: "Rate Limiting", status: "pass", description: "حد 100 طلب/دقيقة لكل مستخدم" },
  { id: "7", category: "API", name: "CORS محدود", status: "warn", description: "يسمح بطلبات من أصل واحد فقط — تحقق من الإعدادات" },
  { id: "8", category: "البيانات", name: "نسخ احتياطي يومي", status: "pass", description: "PostgreSQL pg_dump يومياً" },
  { id: "9", category: "البيانات", name: "تشفير البيانات في حالة السكون", status: "warn", description: "يوصى بتفعيل encryption at rest" },
  { id: "10", category: "المراقبة", name: "سجل أحداث الأمان", status: "pass", description: "تسجيل كل محاولات الوصول" },
  { id: "11", category: "المراقبة", name: "تنبيهات الحوادث الفورية", status: "fail", description: "يحتاج إعداد SMTP للتنبيهات" },
  { id: "12", category: "الامتثال", name: "GDPR — حق الحذف", status: "pass", description: "حذف بيانات المستخدم عند الطلب" },
];

// ── Threat Radar Canvas ───────────────────────────────────────────────────────
function ThreatRadar({ score }: { score: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const S = 180; cv.width = S * DPR; cv.height = S * DPR;
    cv.style.width = S + "px"; cv.style.height = S + "px"; ctx.scale(DPR, DPR);
    const cx = S / 2, cy = S / 2; let t = 0;
    const color = score > 70 ? "#ef4444" : score > 40 ? "#f59e0b" : "#10b981";
    function draw() {
      t += 0.02; ctx.clearRect(0, 0, S, S);
      // Concentric rings
      for (let r = 20; r <= 80; r += 20) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1; ctx.stroke();
      }
      // Radar sweep
      const sweep = t % (Math.PI * 2);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 80, sweep - 0.8, sweep);
      ctx.closePath();
      ctx.fillStyle = `rgba(${score > 70 ? "239,68,68" : score > 40 ? "245,158,11" : "16,185,129"},0.12)`;
      ctx.fill(); ctx.restore();
      // Sweep line
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * 80, cy + Math.sin(sweep) * 80);
      ctx.strokeStyle = color + "cc"; ctx.lineWidth = 2;
      ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      // Score
      ctx.textAlign = "center"; ctx.fillStyle = color;
      ctx.font = "bold 22px Inter"; ctx.fillText(String(score), cx, cy + 6);
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "9px Inter"; ctx.fillText("THREAT SCORE", cx, cy + 18);
      // Blip dots (random threats)
      [[45, 30], [72, 60], [110, 25], [150, 70], [200, 45]].forEach(([a, r]) => {
        const ang = (a * Math.PI / 180) + t * 0.1;
        const rx = cx + Math.cos(ang) * r * 0.9, ry = cy + Math.sin(ang) * r * 0.9;
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + a));
        ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,68,68,${blink})`; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      });
      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, [score]);
  return <canvas ref={cvRef} />;
}

const SEV_COLOR: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22d3ee" };
const SEV_BG: Record<string, string> = { CRITICAL: "rgba(239,68,68,0.1)", HIGH: "rgba(249,115,22,0.1)", MEDIUM: "rgba(245,158,11,0.1)", LOW: "rgba(34,211,238,0.1)" };

interface Props { onClose?: () => void }

export function SecurityCompliancePage({ onClose }: Props) {
  const [tab, setTab] = useState<"posture" | "cve" | "compliance">("posture");
  const [loading, setLoading] = useState(false);
  const [cves, setCves] = useState<CVE[]>(MOCK_CVES);
  const [compliance, setCompliance] = useState<ComplianceItem[]>(COMPLIANCE);
  const [sevFilter, setSevFilter] = useState<string>("ALL");

  const threatScore = Math.round((cves.filter(c => c.severity === "CRITICAL").length * 25 + cves.filter(c => c.severity === "HIGH").length * 12 + cves.filter(c => c.severity === "MEDIUM").length * 5) / cves.length * 10);
  const passCount = compliance.filter(c => c.status === "pass").length;
  const failCount = compliance.filter(c => c.status === "fail").length;
  const warnCount = compliance.filter(c => c.status === "warn").length;
  const filtered = sevFilter === "ALL" ? cves : cves.filter(c => c.severity === sevFilter);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 20%,rgba(239,68,68,.05) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(245,158,11,.03) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"><Shield className="w-5 h-5 text-red-400" /></div>
          <div><h2 className="text-base font-bold text-white">الأمان والامتثال — 3D</h2><p className="text-xs text-zinc-600">Security & Compliance Dashboard</p></div>
        </div>
        <div className="flex items-center gap-2">
          {([["posture", "وضع الأمان", Shield], ["cve", `CVE (${cves.length})`, AlertTriangle], ["compliance", `امتثال (${passCount}/${compliance.length})`, CheckCircle2]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === id ? "bg-red-500/20 border border-red-500/25 text-red-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">

        {tab === "posture" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/3 border border-white/6 flex flex-col items-center justify-center">
                <ThreatRadar score={threatScore} />
                <p className="text-[10px] text-zinc-500 mt-2">رادار التهديدات الحية</p>
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                {[
                  { label: "ثغرات حرجة", val: cves.filter(c => c.severity === "CRITICAL").length, color: "#ef4444", icon: XCircle },
                  { label: "ثغرات عالية", val: cves.filter(c => c.severity === "HIGH").length, color: "#f97316", icon: AlertTriangle },
                  { label: "بنود ممتثلة", val: passCount, color: "#10b981", icon: CheckCircle2 },
                  { label: "تحذيرات", val: warnCount, color: "#f59e0b", icon: Eye },
                ].map(({ label, val, color, icon: Icon }) => (
                  <div key={label} className="p-4 rounded-xl" style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
                    <Icon className="w-5 h-5 mb-2" style={{ color }} />
                    <p className="text-2xl font-black text-white">{val}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/3 border border-white/6">
              <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-400" />نقاط الأمان الكلية</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-white/6 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, #10b981, #22d3ee)`, boxShadow: "0 0 12px #10b98160" }}
                    initial={{ width: 0 }} animate={{ width: `${(passCount / compliance.length) * 100}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
                </div>
                <span className="text-sm font-bold text-white">{Math.round((passCount / compliance.length) * 100)}%</span>
              </div>
              <div className="flex gap-4 mt-3 text-[10px]">
                <span className="text-green-400">✓ {passCount} ممتثل</span>
                <span className="text-amber-400">⚠ {warnCount} تحذير</span>
                <span className="text-red-400">✗ {failCount} فشل</span>
              </div>
            </div>
          </>
        )}

        {tab === "cve" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(s => (
                <button key={s} onClick={() => setSevFilter(s)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${sevFilter === s ? "text-white" : "text-zinc-500 border-white/8"}`}
                  style={sevFilter === s ? { borderColor: `${SEV_COLOR[s] || "#e21227"}50`, backgroundColor: `${SEV_COLOR[s] || "#e21227"}18`, color: SEV_COLOR[s] || "#e21227" } : {}}>{s}</button>
              ))}
            </div>
            <div className="space-y-2">
              {filtered.map((cve, i) => (
                <motion.div key={cve.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-3.5 rounded-xl border" style={{ background: SEV_BG[cve.severity], borderColor: `${SEV_COLOR[cve.severity]}25` }}>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ backgroundColor: `${SEV_COLOR[cve.severity]}30`, color: SEV_COLOR[cve.severity] }}>{cve.severity}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{cve.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                        <span className="font-mono text-zinc-400">{cve.id}</span>
                        <span>CVSS: <span className="font-bold" style={{ color: SEV_COLOR[cve.severity] }}>{cve.cvss}</span></span>
                        <span>{cve.affected}</span>
                        <span>{cve.published}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {tab === "compliance" && (
          <div className="space-y-2">
            {["المصادقة", "التشفير", "API", "البيانات", "المراقبة", "الامتثال"].map(cat => {
              const items = compliance.filter(c => c.category === cat);
              return (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">{cat}</p>
                  {items.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 mb-1.5">
                      {item.status === "pass" ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : item.status === "warn" ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="text-sm text-white">{item.name}</p>
                        <p className="text-[10px] text-zinc-500">{item.description}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.status === "pass" ? "bg-green-500/15 text-green-400" : item.status === "warn" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                        {item.status === "pass" ? "ممتثل" : item.status === "warn" ? "تحذير" : "فشل"}
                      </span>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
