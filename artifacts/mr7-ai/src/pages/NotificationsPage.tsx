/**
 * NotificationsPage — 3D Holographic Notification Center
 * Real-time alerts · priority queue · animated bell · filter system
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle2, AlertTriangle, Info, Zap, Trash2, Check, RefreshCw, Filter, Shield, Brain, Activity } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface Notification { id: string; type: "info" | "success" | "warning" | "error" | "ai" | "security"; title: string; message: string; read: boolean; createdAt: string; link?: string }

const MOCK_NOTIFS: Notification[] = [
  { id: "1", type: "security", title: "تحذير أمني", message: "تم رصد محاولة دخول من IP جديد — قم بمراجعة جلساتك", read: false, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: "2", type: "ai", title: "مجلس الذكاء مكتمل", message: "تقرير التحليل الأمني من 105 نموذج جاهز للمراجعة", read: false, createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: "3", type: "success", title: "نظام KaliGPT محدّث", message: "تم تثبيت 38 نظام بنجاح — جميع الخدمات تعمل بكفاءة 100%", read: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "4", type: "info", title: "استهلاك التوكن", message: "لقد استهلكت 65% من حصتك الشهرية — تجديد تلقائي خلال 12 يوم", read: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "5", type: "warning", title: "حد معدل الطلبات", message: "تم الاقتراب من حد 100 طلب/دقيقة في آخر ساعة", read: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "6", type: "ai", title: "Godmode مكتمل", message: "تحليل أمني شامل بـ 14 وضع — النتائج في لوحة التقارير", read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "7", type: "security", title: "CVE جديد — حرج", message: "CVE-2025-1337: RCE في OpenSSL 3.x — CVSS 9.8 — يتطلب تحديث فوري", read: false, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const TYPE_COLORS: Record<string, string> = { info: "#3b82f6", success: "#10b981", warning: "#f59e0b", error: "#ef4444", ai: "#8b5cf6", security: "#e21227" };
const TYPE_ICONS: Record<string, React.ElementType> = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: X, ai: Brain, security: Shield };

function fmtAge(s: string) { const d = Date.now() - new Date(s).getTime(); if (d < 3600000) return `${Math.round(d / 60000)}د`; if (d < 86400000) return `${Math.round(d / 3600000)}س`; return `${Math.round(d / 86400000)} يوم`; }

interface Props { onClose?: () => void }

export function NotificationsPage({ onClose }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFS);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/notifications");
      if (res.ok) { const d = await res.json() as { notifications: Notification[] }; if (d.notifications?.length) setNotifs(d.notifications); }
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = (id: string) => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const del = (id: string) => setNotifs(n => n.filter(x => x.id !== id));
  const clearRead = () => setNotifs(n => n.filter(x => !x.read));

  const unread = notifs.filter(n => !n.read).length;
  const filtered = filter === "all" ? notifs : filter === "unread" ? notifs.filter(n => !n.read) : notifs.filter(n => n.type === filter);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 20%,rgba(6,182,212,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-cyan-400" />
            {unread > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">{unread}</div>}
          </div>
          <div><h2 className="text-base font-bold text-white">مركز الإشعارات — 3D</h2><p className="text-xs text-zinc-600">{unread} غير مقروء · {notifs.length} إشعار</p></div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && <button onClick={markAllRead} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">قراءة الكل</button>}
          <button onClick={clearRead} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">حذف المقروءة</button>
          <button onClick={load} disabled={loading} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /></button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="flex-shrink-0 flex gap-2 px-5 py-2 overflow-x-auto scrollbar-none border-b border-white/5">
        {[["all", "الكل"], ["unread", "غير مقروء"], ["security", "أمان"], ["ai", "ذكاء اصطناعي"], ["warning", "تحذيرات"], ["success", "نجاحات"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-all ${filter === id ? "bg-cyan-500/20 border border-cyan-500/25 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            {label} {id === "unread" && unread > 0 ? `(${unread})` : ""}
          </button>
        ))}
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-zinc-600">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">لا توجد إشعارات في هذا القسم</p>
            </motion.div>
          )}
          {filtered.map((n, i) => {
            const Icon = TYPE_ICONS[n.type] || Info;
            const color = TYPE_COLORS[n.type] || "#e21227";
            return (
              <motion.div key={n.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ delay: i * 0.03 }}
                onClick={() => markRead(n.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl mb-2 border cursor-pointer transition-all hover:border-white/12 ${!n.read ? "border-white/8 bg-white/3" : "border-white/4 bg-transparent opacity-60"}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${!n.read ? "text-white" : "text-zinc-400"}`}>{n.title}</p>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-zinc-700 mt-1">{fmtAge(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.read && <button onClick={e => { e.stopPropagation(); markRead(n.id); }} className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-green-400 transition-colors"><Check className="w-3 h-3" /></button>}
                  <button onClick={e => { e.stopPropagation(); del(n.id); }} className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
