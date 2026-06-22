import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Zap, Clock, RefreshCw, Calendar } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

interface DailyUsage { day: string; tokens: number; requests: number }
interface ModelUsage { model: string; tokens: number; requests: number }
interface Totals { tokens_used: number; tokens_limit: number; subscription: string; total_requests: number; total_spent: number }

interface Props { onClose?: () => void }

export function AnalyticsDashboardPage({ onClose }: Props) {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [models, setModels] = useState<ModelUsage[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/analytics/me?days=${days}`);
      if (res.ok) {
        const d = await res.json() as { daily?: DailyUsage[]; topModels?: ModelUsage[]; totals?: Totals };
        setDaily(d.daily || []);
        setModels(d.topModels || []);
        setTotals(d.totals || null);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const maxTokens = Math.max(...daily.map(d => Number(d.tokens) || 0), 1);
  const totalTokensThisPeriod = daily.reduce((s, d) => s + (Number(d.tokens) || 0), 0);
  const totalRequestsThisPeriod = daily.reduce((s, d) => s + (Number(d.requests) || 0), 0);
  const avgDaily = daily.length ? Math.round(totalTokensThisPeriod / daily.length) : 0;

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">لوحة التحليلات</h1>
            <p className="text-gray-400 text-sm mt-1">تحليل استخدامك وأدائك</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>آخر {d} يوم</option>)}
            </select>
            <button onClick={loadData} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "توكن الفترة", value: totalTokensThisPeriod.toLocaleString(), icon: Zap, color: "red" },
            { label: "طلبات الفترة", value: totalRequestsThisPeriod.toLocaleString(), icon: BarChart3, color: "blue" },
            { label: "متوسط يومي", value: avgDaily.toLocaleString(), icon: TrendingUp, color: "green" },
            { label: "إجمالي الطلبات", value: Number(totals?.total_requests || 0).toLocaleString(), icon: Clock, color: "purple" },
          ].map(item => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-white/3 border border-white/10 rounded-2xl hover:border-white/20 transition-colors">
              <item.icon className="w-5 h-5 text-gray-400 mb-3" />
              <div className="text-2xl font-black text-white">{item.value}</div>
              <div className="text-xs text-gray-400 mt-1">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Token Usage Bar */}
        {totals && (
          <div className="p-5 bg-white/3 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">استهلاك التوكن الشهري</h3>
              <span className="text-sm text-gray-400">{totals.tokens_used.toLocaleString()} / {totals.tokens_limit.toLocaleString()}</span>
            </div>
            <div className="h-4 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (totals.tokens_used / totals.tokens_limit) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  totals.tokens_used / totals.tokens_limit > 0.9 ? "bg-red-500" :
                  totals.tokens_used / totals.tokens_limit > 0.7 ? "bg-amber-500" : "bg-green-500"
                }`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{Math.round((totals.tokens_used / totals.tokens_limit) * 100)}% مستخدم</span>
              <span>الخطة: {totals.subscription}</span>
            </div>
          </div>
        )}

        {/* Daily Usage Chart */}
        {daily.length > 0 && (
          <div className="p-5 bg-white/3 border border-white/10 rounded-2xl">
            <h3 className="font-semibold mb-4">الاستخدام اليومي (التوكن)</h3>
            <div className="flex items-end gap-1 h-40">
              {daily.map((d, i) => {
                const h = Math.max(4, ((Number(d.tokens) || 0) / maxTokens) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        style={{ height: `${h}%` }}
                        className="w-full bg-red-600/60 hover:bg-red-500/80 rounded-t transition-colors"
                      />
                    </div>
                    {i % Math.max(1, Math.floor(daily.length / 7)) === 0 && (
                      <div className="text-[9px] text-gray-500 rotate-45 origin-bottom-right whitespace-nowrap">
                        {new Date(d.day).toLocaleDateString("ar", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Models */}
        {models.length > 0 && (
          <div className="p-5 bg-white/3 border border-white/10 rounded-2xl">
            <h3 className="font-semibold mb-4">النماذج الأكثر استخداماً</h3>
            <div className="space-y-3">
              {models.map((m, i) => {
                const pct = Math.round((Number(m.tokens) / (Number(models[0]?.tokens) || 1)) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 font-mono text-xs truncate">{m.model}</span>
                      <span className="text-gray-400 text-xs">{Number(m.tokens).toLocaleString()} token</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && daily.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            جاري تحميل البيانات...
          </div>
        )}
      </div>
    </div>
  );
}
