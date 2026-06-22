import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Clock, RefreshCw, X, TrendingUp, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

interface RateLimitInfo {
  tier: string;
  requestsPerMin: number;
  requestsPerDay: number;
  tokensPerMonth: number;
  usedToday: number;
  usedThisMinute: number;
  tokensUsed: number;
  tokensLimit: number;
  resetMinute: number;
  resetDay: number;
}

const TIER_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  free:         { label: "مجاني",       color: "#9ca3af", gradient: "from-gray-700 to-gray-800" },
  starter:      { label: "Starter",     color: "#3b82f6", gradient: "from-blue-700 to-blue-900" },
  pro:          { label: "Pro",         color: "#8b5cf6", gradient: "from-purple-700 to-purple-900" },
  professional: { label: "Professional",color: "#e21227", gradient: "from-red-700 to-red-900" },
  elite:        { label: "Elite",       color: "#f59e0b", gradient: "from-amber-600 to-amber-800" },
  enterprise:   { label: "Enterprise",  color: "#f59e0b", gradient: "from-amber-500 to-orange-700" },
};

const TIER_LIMITS: Record<string, { rpm: number; rpd: number; tokens: number }> = {
  free:         { rpm: 10,   rpd: 100,   tokens: 50_000 },
  starter:      { rpm: 100,  rpd: 1000,  tokens: 200_000 },
  pro:          { rpm: 500,  rpd: 10000, tokens: 500_000 },
  professional: { rpm: 500,  rpd: 10000, tokens: 1_000_000 },
  elite:        { rpm: 2000, rpd: -1,    tokens: 5_000_000 },
  enterprise:   { rpm: 2000, rpd: -1,    tokens: -1 },
};

function RadialGauge({ value, max, color, label, sublabel }: { value: number; max: number; color: string; label: string; sublabel: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 44; const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const warn = pct > 0.8;
  const crit = pct > 0.95;
  const displayColor = crit ? "#ef4444" : warn ? "#f59e0b" : color;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle cx="50" cy="50" r={r} fill="none" stroke={displayColor} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={circ - dash}
            initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${displayColor}80)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white leading-none">{max > 0 ? `${Math.round(pct * 100)}%` : "∞"}</span>
          {(crit || warn) && <AlertTriangle className="w-3 h-3 mt-0.5" style={{ color: displayColor }} />}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="text-[10px] text-zinc-500">{sublabel}</p>
      </div>
    </div>
  );
}

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
    function draw() {
      t += 1;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < 6; i++) {
        const x = (i / 5) * cv.width;
        ctx.beginPath(); ctx.moveTo(x + Math.sin(t * 0.01 + i) * 10, 0); ctx.lineTo(x + Math.cos(t * 0.008 + i) * 10, cv.height);
        ctx.strokeStyle = `rgba(226,18,39,${0.02 + i * 0.003})`; ctx.lineWidth = 1; ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

interface Props { onClose?: () => void }

export function RateLimitPage({ onClose }: Props) {
  const { user } = useAuth();
  const [info, setInfo] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const tier = user?.subscription || "free";
  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const tierLimits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/analytics/rate-status");
      if (res.ok) {
        const d = await res.json() as RateLimitInfo;
        setInfo(d);
      } else {
        setInfo({
          tier,
          requestsPerMin: tierLimits.rpm,
          requestsPerDay: tierLimits.rpd,
          tokensPerMonth: tierLimits.tokens,
          usedToday: user?.tokensUsed ? Math.floor(user.tokensUsed / 100) : 0,
          usedThisMinute: 0,
          tokensUsed: user?.tokensUsed || 0,
          tokensLimit: user?.tokensLimit || tierLimits.tokens,
          resetMinute: 60,
          resetDay: 86400,
        });
      }
      setLastUpdate(new Date());
    } catch {
      setInfo({
        tier, requestsPerMin: tierLimits.rpm, requestsPerDay: tierLimits.rpd,
        tokensPerMonth: tierLimits.tokens, usedToday: 0, usedThisMinute: 0,
        tokensUsed: user?.tokensUsed || 0, tokensLimit: user?.tokensLimit || tierLimits.tokens,
        resetMinute: 60, resetDay: 86400,
      });
    } finally { setLoading(false); }
  }, [tier, tierLimits, user]);

  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  const fmtNum = (n: number) => n < 0 ? "∞" : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <HoloBG />
      <div className="relative flex-shrink-0 px-6 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">استهلاك الـ API ومعدل الطلبات</h2>
            <p className="text-xs text-zinc-500">Rate Limits — {lastUpdate ? `آخر تحديث: ${lastUpdate.toLocaleTimeString("ar")}` : "جارٍ التحميل..."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/8 p-6 space-y-5">
        {/* Tier badge */}
        <div className={`p-4 rounded-xl bg-gradient-to-r ${tierCfg.gradient} bg-opacity-20 border border-white/10`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60 mb-0.5">خطتك الحالية</p>
              <p className="text-xl font-bold text-white">{tierCfg.label}</p>
            </div>
            <div className="text-left">
              <p className="text-xs text-white/60">التوكن المتاحة/شهر</p>
              <p className="text-xl font-bold text-white">{fmtNum(tierLimits.tokens)}</p>
            </div>
          </div>
        </div>

        {/* Radial gauges */}
        {info && (
          <div className="p-4 rounded-xl bg-white/3 border border-white/8">
            <h3 className="text-sm font-semibold text-white mb-5 text-center">الاستهلاك الحالي</h3>
            <div className="flex justify-around flex-wrap gap-4">
              <RadialGauge value={info.usedThisMinute} max={info.requestsPerMin} color="#e21227" label="هذه الدقيقة" sublabel={`${info.usedThisMinute} / ${fmtNum(info.requestsPerMin)}`} />
              <RadialGauge value={info.usedToday} max={info.requestsPerDay > 0 ? info.requestsPerDay : 0} color="#f97316" label="اليوم" sublabel={`${fmtNum(info.usedToday)} / ${fmtNum(info.requestsPerDay)}`} />
              <RadialGauge value={info.tokensUsed} max={info.tokensLimit > 0 ? info.tokensLimit : 0} color="#8b5cf6" label="التوكن" sublabel={`${fmtNum(info.tokensUsed)} / ${fmtNum(info.tokensLimit)}`} />
            </div>
          </div>
        )}

        {/* Detailed limits table */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/8">
          <h3 className="text-sm font-semibold text-white mb-3">حدود خطتك التفصيلية</h3>
          <div className="space-y-2">
            {[
              { label: "طلبات/دقيقة", val: fmtNum(tierLimits.rpm), icon: Zap, color: "#e21227" },
              { label: "طلبات/يوم", val: fmtNum(tierLimits.rpd), icon: Clock, color: "#f97316" },
              { label: "توكن/شهر", val: fmtNum(tierLimits.tokens), icon: TrendingUp, color: "#8b5cf6" },
              { label: "نقاط نهاية Chat", val: "مخصصة", icon: Shield, color: "#3b82f6" },
              { label: "نقاط نهاية OSINT", val: "مخصصة", icon: Activity, color: "#10b981" },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <span className="text-sm text-zinc-400">{label}</span>
                </div>
                <span className="text-sm font-semibold text-white">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Headers info */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/8">
          <h3 className="text-sm font-semibold text-white mb-3">Response Headers</h3>
          <div className="space-y-1.5 font-mono">
            {[
              { k: "X-RateLimit-Limit", v: fmtNum(tierLimits.rpm) },
              { k: "X-RateLimit-Remaining", v: info ? fmtNum(Math.max(0, tierLimits.rpm - info.usedThisMinute)) : "—" },
              { k: "X-RateLimit-Reset", v: "Unix timestamp" },
              { k: "X-Tokens-Used", v: info ? fmtNum(info.tokensUsed) : "—" },
              { k: "X-Tokens-Remaining", v: info && info.tokensLimit > 0 ? fmtNum(Math.max(0, info.tokensLimit - info.tokensUsed)) : "∞" },
            ].map(({ k, v }) => (
              <div key={k} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-black/30">
                <span className="text-[11px] text-green-400">{k}</span>
                <span className="text-[11px] text-zinc-300">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        {(tier === "free" || tier === "starter") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 to-red-900/20 border border-red-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">حدودك محدودة — ترقّ الآن</p>
                <p className="text-xs text-zinc-400 mt-0.5">خطة Professional تمنحك 500K طلب/دقيقة و10M توكن/شهر</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
