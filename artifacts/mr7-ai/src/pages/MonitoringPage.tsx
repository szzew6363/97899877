import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, AlertCircle, CheckCircle2, Database, Server, Cpu, RefreshCw, Clock, Wifi, WifiOff, TrendingUp } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface Health { status: string; uptime: number; responseTime: number; database: { ok: boolean; latency: number }; memory: { heapUsed: number; heapTotal: number; rss: number }; cpu: { load1: number; load5: number }; stats: Record<string, number> }

interface Props { onClose?: () => void }

export function MonitoringPage({ onClose }: Props) {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [history, setHistory] = useState<{ time: Date; latency: number }[]>([]);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/monitoring/health");
      if (res.ok) {
        const d = await res.json() as Health;
        setHealth(d);
        setLastUpdated(new Date());
        setHistory(h => [...h.slice(-19), { time: new Date(), latency: d.responseTime }]);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadHealth();
    const t = setInterval(loadHealth, 30000);
    return () => clearInterval(t);
  }, []);

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
  };

  const maxLatency = Math.max(...history.map(h => h.latency), 1);

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-7 h-7 text-red-400" />
            <div>
              <h1 className="text-xl font-black">مراقبة النظام</h1>
              <p className="text-sm text-gray-400">صحة الخوادم والأداء اللحظي</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs text-gray-500">آخر تحديث: {lastUpdated.toLocaleTimeString("ar")}</span>}
            <button onClick={loadHealth} className="p-2 hover:bg-white/5 rounded-lg">
              <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {health && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
            health.status === "healthy"
              ? "bg-green-900/20 border-green-500/30 text-green-300"
              : "bg-amber-900/20 border-amber-500/30 text-amber-300"
          }`}>
            {health.status === "healthy"
              ? <Wifi className="w-5 h-5 shrink-0" />
              : <WifiOff className="w-5 h-5 shrink-0" />}
            <div>
              <div className="font-semibold">{health.status === "healthy" ? "جميع الأنظمة تعمل بشكل طبيعي ✅" : "تحذير: قد يكون هناك مشكلة ⚠️"}</div>
              <div className="text-xs opacity-70 mt-0.5">وقت الاستجابة: {health.responseTime}ms</div>
            </div>
          </div>
        )}

        {health ? (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "وقت التشغيل", value: formatUptime(health.uptime), icon: Clock, color: "text-green-400" },
                { label: "زمن الاستجابة", value: `${health.responseTime}ms`, icon: Activity, color: health.responseTime < 100 ? "text-green-400" : "text-amber-400" },
                { label: "قاعدة البيانات", value: health.database.ok ? "متصلة" : "منقطعة", icon: Database, color: health.database.ok ? "text-green-400" : "text-red-400" },
                { label: "تأخير DB", value: `${health.database.latency}ms`, icon: TrendingUp, color: health.database.latency < 50 ? "text-green-400" : "text-amber-400" },
              ].map(item => (
                <motion.div key={item.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 bg-white/3 border border-white/10 rounded-2xl">
                  <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                  <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Memory */}
            <div className="p-5 bg-white/3 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold">استخدام الذاكرة</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Heap Used", value: health.memory.heapUsed, total: health.memory.heapTotal },
                  { label: "RSS", value: health.memory.rss, total: health.memory.rss },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.label}</span>
                      <span className="text-gray-400">{item.value}MB</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (item.value / item.total) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Time Chart */}
            {history.length > 0 && (
              <div className="p-5 bg-white/3 border border-white/10 rounded-2xl">
                <h3 className="font-semibold mb-4">تاريخ زمن الاستجابة</h3>
                <div className="flex items-end gap-1 h-24">
                  {history.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                        style={{ height: `${(h.latency / maxLatency) * 100}%`, minHeight: "4px" }}
                        title={`${h.latency}ms`} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>أبطأ: {Math.max(...history.map(h => h.latency))}ms</span>
                  <span>أسرع: {Math.min(...history.map(h => h.latency))}ms</span>
                </div>
              </div>
            )}

            {/* Platform Stats */}
            {health.stats && (
              <div className="p-5 bg-white/3 border border-white/10 rounded-2xl">
                <h3 className="font-semibold mb-4">إحصاءات المنصة</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(health.stats).map(([k, v]) => (
                    <div key={k} className="text-center p-3 bg-white/3 rounded-xl">
                      <div className="text-2xl font-black text-white">{String(v)}</div>
                      <div className="text-xs text-gray-400 mt-1">{k.replace(/_/g, " ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            جاري تحميل بيانات النظام...
          </div>
        )}
      </div>
    </div>
  );
}
