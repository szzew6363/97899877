/**
 * SecurityAuditPage — 3D Holographic Security Audit Dashboard
 * Vulnerability scanner · OWASP compliance · CVE tracking · fix recommendations
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, AlertTriangle, CheckCircle2, RefreshCw, Search, Eye, Zap, Globe, Lock, Code2, Server, Target, TrendingUp, Clock, Download } from "lucide-react";

interface Vuln { id: string; cve: string; title: string; severity: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"; cvss: number; affected: string; status: "open"|"patched"|"accepted"; discovered: string; fix: string }
interface AuditResult { score: number; grade: string; pass: number; fail: number; warn: number; lastScan: string }

const SEV_COLORS: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22d3ee" };

const MOCK_VULNS: Vuln[] = [
  { id: "1", cve: "CVE-2025-1337", title: "OpenSSL RCE — Buffer Overflow", severity: "CRITICAL", cvss: 9.8, affected: "OpenSSL < 3.1.5", status: "open", discovered: "2025-06-20", fix: "تحديث إلى OpenSSL 3.1.5 فوراً" },
  { id: "2", cve: "CVE-2024-4567", title: "Node.js HTTP Header Injection", severity: "HIGH", cvss: 7.5, affected: "Node.js < 20.12", status: "patched", discovered: "2025-05-15", fix: "تم التحديث إلى Node.js 20.15" },
  { id: "3", cve: "CVE-2024-8901", title: "npm Package Prototype Pollution", severity: "HIGH", cvss: 7.1, affected: "lodash < 4.17.21", status: "open", discovered: "2025-06-01", fix: "npm update lodash" },
  { id: "4", cve: "CVE-2024-3456", title: "JWT Algorithm Confusion Attack", severity: "MEDIUM", cvss: 6.2, affected: "jsonwebtoken < 9.0", status: "open", discovered: "2025-04-20", fix: "تحديث jsonwebtoken وتحقق من alg header" },
  { id: "5", cve: "CVE-2024-2234", title: "React XSS via dangerouslySetInnerHTML", severity: "MEDIUM", cvss: 5.4, affected: "React < 18.3", status: "accepted", discovered: "2025-03-10", fix: "مراجعة جميع استخدامات dangerouslySetInnerHTML" },
  { id: "6", cve: "CVE-2024-1111", title: "Nginx Information Disclosure", severity: "LOW", cvss: 3.1, affected: "Nginx < 1.25", status: "open", discovered: "2025-02-05", fix: "إزالة Server header أو التحديث" },
];

const MOCK_AUDIT: AuditResult = { score: 67, grade: "C+", pass: 34, fail: 8, warn: 12, lastScan: new Date(Date.now() - 3600000).toISOString() };

const OWASP_CHECKS = [
  { id: 1, name: "A01 — كسر التحكم في الوصول", status: "fail", detail: "3 مخالفات" },
  { id: 2, name: "A02 — إخفاق التشفير", status: "warn", detail: "TLS 1.1 قيد الاستخدام" },
  { id: 3, name: "A03 — الحقن (Injection)", status: "fail", detail: "SQL Injection في API" },
  { id: 4, name: "A04 — التصميم غير الآمن", status: "pass", detail: "اجتياز" },
  { id: 5, name: "A05 — التكوين الأمني الخاطئ", status: "warn", detail: "رؤوس HTTP مفقودة" },
  { id: 6, name: "A06 — مكونات قديمة ضعيفة", status: "fail", detail: "3 حزم ضعيفة" },
  { id: 7, name: "A07 — فشل المصادقة", status: "pass", detail: "اجتياز" },
  { id: 8, name: "A08 — فشل السلامة", status: "pass", detail: "اجتياز" },
  { id: 9, name: "A09 — إخفاق في التسجيل", status: "warn", detail: "تسجيل غير كافٍ" },
  { id: 10, name: "A10 — SSRF", status: "pass", detail: "اجتياز" },
];

function GradeRing({ score, grade, color }: { score: number; grade: string; color: string }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const canvas = cv;
    const ctx = canvas.getContext("2d")!;
    const size = 100; const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * DPR; canvas.height = size * DPR;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.scale(DPR, DPR);
    const cx = size / 2, cy = size / 2, r = 38;
    const sa = -Math.PI / 2, ea = sa + (score / 100) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 7; ctx.stroke();
    const gr = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    gr.addColorStop(0, color + "88"); gr.addColorStop(1, color);
    ctx.beginPath(); ctx.arc(cx, cy, r, sa, ea);
    ctx.strokeStyle = gr; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.fillStyle = color; ctx.font = "bold 22px Inter"; ctx.fillText(grade, cx, cy + 4);
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px Inter"; ctx.fillText(`${score}/100`, cx, cy + 17);
  }, [score, grade, color]);
  return <canvas ref={cvRef} />;
}

function fmtAge(s: string) { const d = Date.now() - new Date(s).getTime(); if (d < 3600000) return `${Math.round(d / 60000)}د`; return `${Math.round(d / 3600000)}س`; }

interface Props { onClose?: () => void }

export function SecurityAuditPage({ onClose }: Props) {
  const [vulns, setVulns] = useState<Vuln[]>(MOCK_VULNS);
  const [audit] = useState<AuditResult>(MOCK_AUDIT);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<"vulns" | "owasp" | "config">("vulns");
  const [filterSev, setFilterSev] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("all");

  const scan = useCallback(async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 3000));
    setScanning(false);
  }, []);

  const patch = (id: string) => setVulns(v => v.map(x => x.id === id ? { ...x, status: "patched" as const } : x));
  const accept = (id: string) => setVulns(v => v.map(x => x.id === id ? { ...x, status: "accepted" as const } : x));

  const filtered = vulns.filter(v => {
    const matchSev = filterSev === "ALL" || v.severity === filterSev;
    const matchSt = filterStatus === "all" || v.status === filterStatus;
    return matchSev && matchSt;
  });

  const gradeColor = audit.score >= 80 ? "#10b981" : audit.score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 15%,rgba(226,18,39,.06) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"><Shield className="w-5 h-5 text-red-400" /></div>
          <div><h2 className="text-base font-bold text-white">مراجعة الأمان — 3D Audit</h2><p className="text-xs text-zinc-600">{vulns.filter(v => v.status === "open").length} مفتوح · OWASP Top 10 · CVSS</p></div>
        </div>
        <div className="flex items-center gap-2">
          {(["vulns", "owasp", "config"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-red-500/20 border border-red-500/25 text-red-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "vulns" ? "الثغرات" : t === "owasp" ? "OWASP" : "الإعدادات"}
            </button>
          ))}
          <button onClick={scan} disabled={scanning} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/25 text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-all">
            {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}فحص
          </button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {/* Score overview */}
        <div className="flex gap-4 p-4 rounded-xl bg-gradient-to-r from-red-950/30 to-zinc-900/30 border border-red-500/15">
          <GradeRing score={audit.score} grade={audit.grade} color={gradeColor} />
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[{ l: "اجتاز", v: audit.pass, c: "#10b981" }, { l: "فشل", v: audit.fail, c: "#ef4444" }, { l: "تحذير", v: audit.warn, c: "#f59e0b" }].map(({ l, v, c }) => (
              <div key={l} className="text-center">
                <p className="text-2xl font-black text-white">{v}</p>
                <p className="text-[10px] mt-0.5" style={{ color: c }}>{l}</p>
              </div>
            ))}
            <div className="col-span-3 flex items-center gap-1.5 text-[10px] text-zinc-600"><Clock className="w-3 h-3" />آخر فحص: {fmtAge(audit.lastScan)}</div>
          </div>
        </div>

        {tab === "vulns" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(s => (
                <button key={s} onClick={() => setFilterSev(s)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${filterSev === s ? "text-white" : "bg-white/3 border-white/8 text-zinc-500"}`}
                  style={filterSev === s ? { backgroundColor: `${SEV_COLORS[s] || "#e21227"}20`, borderColor: `${SEV_COLORS[s] || "#e21227"}40`, color: SEV_COLORS[s] || "#e21227" } : {}}>{s}</button>
              ))}
              <div className="border-r border-white/8 mx-1" />
              {["all", "open", "patched", "accepted"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${filterStatus === s ? "bg-zinc-700 text-white" : "text-zinc-600 hover:text-zinc-400"}`}>
                  {s === "all" ? "الكل" : s === "open" ? "مفتوح" : s === "patched" ? "مُرقَّع" : "مقبول"}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filtered.map((v, i) => (
                <motion.div key={v.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl border" style={{ background: `${SEV_COLORS[v.severity]}08`, borderColor: `${SEV_COLORS[v.severity]}20` }}>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{ backgroundColor: `${SEV_COLORS[v.severity]}25`, color: SEV_COLORS[v.severity] }}>{v.severity}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white">{v.title}</p>
                        <code className="text-[10px] text-zinc-500 font-mono">{v.cve}</code>
                        <span className="text-[10px] font-bold text-zinc-400">CVSS {v.cvss}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">المتأثر: {v.affected}</p>
                      <p className="text-xs text-zinc-400 mt-1"><span className="text-green-400">الحل: </span>{v.fix}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.status === "open" ? "bg-red-500/15 text-red-400" : v.status === "patched" ? "bg-green-500/15 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                        {v.status === "open" ? "مفتوح" : v.status === "patched" ? "مُرقَّع" : "مقبول"}
                      </span>
                      {v.status === "open" && (
                        <div className="flex gap-1">
                          <button onClick={() => patch(v.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all">رقِّع</button>
                          <button onClick={() => accept(v.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-all">قبول</button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {tab === "owasp" && (
          <div className="space-y-2">
            {OWASP_CHECKS.map((c, i) => {
              const col = c.status === "pass" ? "#10b981" : c.status === "fail" ? "#ef4444" : "#f59e0b";
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border" style={{ background: `${col}08`, borderColor: `${col}15` }}>
                  <span className="text-[10px] font-bold w-5 text-center" style={{ color: col }}>{c.id}</span>
                  <p className="flex-1 text-sm text-zinc-300">{c.name}</p>
                  <span className="text-xs text-zinc-500">{c.detail}</span>
                  <div className="w-5 h-5 flex items-center justify-center">
                    {c.status === "pass" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : c.status === "fail" ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === "config" && (
          <div className="space-y-4">
            {[{ l: "فحص تلقائي كل", opt: ["6 ساعات", "12 ساعة", "يومياً", "أسبوعياً"] }, { l: "مستوى إبلاغ الحد الأدنى", opt: ["CRITICAL فقط", "HIGH+", "MEDIUM+", "ALL"] }].map(({ l, opt }) => (
              <div key={l} className="p-4 rounded-xl bg-white/3 border border-white/6">
                <p className="text-xs font-semibold text-zinc-400 mb-2">{l}</p>
                <div className="flex gap-2 flex-wrap">
                  {opt.map((o, i) => <button key={o} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${i === 1 ? "bg-red-500/20 border-red-500/25 text-red-400" : "bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300"}`}>{o}</button>)}
                </div>
              </div>
            ))}
            <button onClick={scan} disabled={scanning} className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/25 text-red-400 text-sm font-bold hover:bg-red-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              بدء فحص أمني شامل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
