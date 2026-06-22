/**
 * RateLimitPage — 3D Holographic Rate Limits & Quota Manager
 * Live usage meters · tier limits · throttle config · quota reset
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X, Zap, Clock, TrendingUp, RefreshCw, Shield, AlertTriangle, CheckCircle2, Settings, BarChart2, Globe } from "lucide-react";

interface QuotaItem { id: string; name: string; used: number; limit: number; unit: string; color: string; resetsIn: string; warn?: boolean }
interface ThrottleRule { id: string; endpoint: string; limit: number; window: string; current: number; status: "ok" | "warn" | "blocked" }

const MOCK_QUOTAS: QuotaItem[] = [
  { id: "1", name: "التوكن الشهرية", used: 1847320, limit: 3000000, unit: "توكن", color: "#e21227", resetsIn: "8 أيام" },
  { id: "2", name: "طلبات الدردشة/دقيقة", used: 47, limit: 100, unit: "طلب", color: "#3b82f6", resetsIn: "43 ثانية" },
  { id: "3", name: "توليد الصور/يوم", used: 23, limit: 50, unit: "صورة", color: "#10b981", resetsIn: "6 ساعات" },
  { id: "4", name: "رفع الملفات/ساعة", used: 8, limit: 20, unit: "ملف", color: "#8b5cf6", resetsIn: "34 دقيقة" },
  { id: "5", name: "جلسات Council/يوم", used: 4, limit: 10, unit: "جلسة", color: "#f59e0b", resetsIn: "14 ساعة" },
  { id: "6", name: "طلبات API/ثانية", used: 3, limit: 10, unit: "طلب", color: "#06b6d4", resetsIn: "ثانية", warn: false },
];

const MOCK_THROTTLE: ThrottleRule[] = [
  { id: "1", endpoint: "/api/chat", limit: 100, window: "دقيقة", current: 47, status: "ok" },
  { id: "2", endpoint: "/api/council", limit: 10, window: "ساعة", current: 8, status: "warn" },
  { id: "3", endpoint: "/api/image", limit: 50, window: "يوم", current: 23, status: "ok" },
  { id: "4", endpoint: "/api/rag/upload", limit: 20, window: "ساعة", current: 8, status: "ok" },
  { id: "5", endpoint: "/api/vision", limit: 30, window: "يوم", current: 29, status: "warn" },
  { id: "6", endpoint: "/api/voice", limit: 5, window: "ساعة", current: 5, status: "blocked" },
];

// ── Animated Gauge ────────────────────────────────────────────────────────────
function Gauge({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * DPR; cv.height = size * DPR;
    cv.style.width = size + "px"; cv.style.height = size + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(DPR, DPR);
    const cx = size / 2, cy = size / 2, r = size / 2 - 8;
    const start = Math.PI * 0.75, end = Math.PI * 2.25;
    // BG arc
    ctx.beginPath(); ctx.arc(cx, cy, r, start, end); ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.stroke();
    // Value arc
    const valEnd = start + (end - start) * pct;
    if (pct > 0) {
      ctx.beginPath(); ctx.arc(cx, cy, r, start, valEnd);
      ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
    }
    // Text
    ctx.textAlign = "center"; ctx.fillStyle = color; ctx.font = `bold ${size * 0.22}px Inter`;
    ctx.fillText(`${Math.round(pct * 100)}%`, cx, cy + 4);
  }, [pct, color, size]);
  return <canvas ref={cvRef} />;
}

function fmtNum(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n); }

interface Props { onClose?: () => void }

export function RateLimitPage({ onClose }: Props) {
  const [quotas, setQuotas] = useState<QuotaItem[]>(MOCK_QUOTAS);
  const [throttle] = useState<ThrottleRule[]>(MOCK_THROTTLE);
  const [tab, setTab] = useState<"quotas" | "throttle" | "config">("quotas");
  const [refreshing, setRefreshing] = useState(false);
  const [windowMin, setWindowMin] = useState(100);
  const [windowHour, setWindowHour] = useState(1000);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setQuotas(q => q.map(x => ({ ...x, used: Math.min(x.limit, x.used + Math.floor(Math.random() * 3)) })));
    setRefreshing(false);
  }, []);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 15%,rgba(249,115,22,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center"><Activity className="w-5 h-5 text-orange-400" /></div>
          <div><h2 className="text-base font-bold text-white">معدل الطلبات والحصص — 3D</h2><p className="text-xs text-zinc-600">Rate Limits · Quota Manager · Live Throttle</p></div>
        </div>
        <div className="flex items-center gap-2">
          {(["quotas", "throttle", "config"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-orange-500/20 border border-orange-500/25 text-orange-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "quotas" ? "الحصص" : t === "throttle" ? "التقييد" : "الإعدادات"}
            </button>
          ))}
          <button onClick={refresh} disabled={refreshing} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /></button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">

        {tab === "quotas" && (
          <>
            {/* Gauge overview */}
            <div className="grid grid-cols-3 gap-3">
              {quotas.slice(0, 3).map(q => {
                const pct = q.limit > 0 ? q.used / q.limit : 0;
                const c = pct > 0.85 ? "#ef4444" : pct > 0.65 ? "#f59e0b" : q.color;
                return (
                  <div key={q.id} className="p-3.5 rounded-xl bg-white/3 border border-white/6 flex flex-col items-center gap-2">
                    <Gauge pct={pct} color={c} />
                    <p className="text-[10px] text-zinc-500 text-center">{q.name}</p>
                    <p className="text-[9px] text-zinc-700">تجديد: {q.resetsIn}</p>
                  </div>
                );
              })}
            </div>
            {/* All quotas */}
            <div className="space-y-3">
              {quotas.map(q => {
                const pct = q.limit > 0 ? q.used / q.limit : 0;
                const c = pct > 0.85 ? "#ef4444" : pct > 0.65 ? "#f59e0b" : q.color;
                return (
                  <div key={q.id} className={`p-3.5 rounded-xl border ${pct > 0.85 ? "bg-red-500/6 border-red-500/20" : "bg-white/3 border-white/6"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-white">{q.name}</p>
                      <div className="flex items-center gap-2">
                        {pct > 0.85 && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-xs font-medium" style={{ color: c }}>{Math.round(pct * 100)}%</span>
                        <span className="text-[10px] text-zinc-600">يُجدد خلال {q.resetsIn}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/6 overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: c, boxShadow: pct > 0.85 ? `0 0 8px ${c}80` : "none" }}
                          animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                      </div>
                      <span className="text-[10px] text-zinc-500 flex-shrink-0">{fmtNum(q.used)} / {fmtNum(q.limit)} {q.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "throttle" && (
          <div className="space-y-2">
            {throttle.map((rule, i) => {
              const pct = rule.limit > 0 ? rule.current / rule.limit : 0;
              const statusColor = rule.status === "ok" ? "#10b981" : rule.status === "warn" ? "#f59e0b" : "#ef4444";
              return (
                <motion.div key={rule.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="p-3.5 rounded-xl border" style={{ background: `${statusColor}08`, borderColor: `${statusColor}20` }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <code className="text-xs font-mono text-zinc-300">{rule.endpoint}</code>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: statusColor }}>{rule.status === "ok" ? "طبيعي" : rule.status === "warn" ? "تحذير" : "محجوب"}</span>
                      <span className="text-[10px] text-zinc-600">{rule.current}/{rule.limit} / {rule.window}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: statusColor, boxShadow: rule.status !== "ok" ? `0 0 6px ${statusColor}80` : "none" }}
                      animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === "config" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
              <p className="text-xs font-semibold text-zinc-400">إعدادات التقييد العالمية</p>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-zinc-500">الحد الأقصى / دقيقة</p>
                  <span className="text-xs font-bold text-orange-400">{windowMin}</span>
                </div>
                <input type="range" min={10} max={500} value={windowMin} onChange={e => setWindowMin(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-zinc-500">الحد الأقصى / ساعة</p>
                  <span className="text-xs font-bold text-orange-400">{windowHour}</span>
                </div>
                <input type="range" min={100} max={10000} step={100} value={windowHour} onChange={e => setWindowHour(Number(e.target.value))} className="w-full accent-orange-500" />
              </div>
              <button className="px-4 py-2 rounded-lg bg-orange-500/20 border border-orange-500/25 text-orange-400 text-xs font-medium hover:bg-orange-500/30 transition-all">حفظ الإعدادات</button>
            </div>
            <div className="p-4 rounded-xl bg-white/3 border border-white/6">
              <p className="text-xs font-semibold text-zinc-400 mb-3">تجديد الحصص يدوياً</p>
              <div className="space-y-2">
                {quotas.map(q => (
                  <div key={q.id} className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">{q.name}</p>
                    <button onClick={() => setQuotas(qs => qs.map(x => x.id === q.id ? { ...x, used: 0 } : x))}
                      className="text-[10px] px-2 py-1 rounded-full border border-orange-500/20 text-orange-400 hover:bg-orange-500/15 transition-all">تجديد</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
