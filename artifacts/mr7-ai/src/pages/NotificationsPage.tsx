import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, RefreshCw, AlertCircle, Info, CheckCircle2, Zap, Settings } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Notification { id: string; type: string; title: string; body: string; read: boolean; created_at: string; data?: Record<string, unknown> }

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  alert: { icon: AlertCircle, color: "text-red-400" },
  info: { icon: Info, color: "text-blue-400" },
  success: { icon: CheckCircle2, color: "text-green-400" },
  billing: { icon: Zap, color: "text-amber-400" },
  security: { icon: AlertCircle, color: "text-red-500" },
};

interface Props { onClose?: () => void }

export function NotificationsPage({ onClose }: Props) {
  const { toast } = useToast();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"list" | "prefs">("list");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/notifications?limit=50");
      if (res.ok) {
        const d = await res.json() as { notifications?: Notification[] };
        setNotifs(d.notifications || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await authFetch("/api/notifications/preferences");
      if (res.ok) { const d = await res.json() as { preferences?: Record<string, boolean> }; setPrefs(d.preferences || {}); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "prefs") loadPrefs(); }, [tab]);

  const markRead = async (id: string) => {
    await authFetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  };

  const markAllRead = async () => {
    await authFetch("/api/notifications/read-all", { method: "POST" });
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    toast({ title: "✅ تم تعليم الكل كمقروء" });
  };

  const deleteNotif = async (id: string) => {
    await authFetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifs(n => n.filter(x => x.id !== id));
  };

  const updatePref = async (key: string, val: boolean) => {
    const newPrefs = { ...prefs, [key]: val };
    setPrefs(newPrefs);
    await authFetch("/api/notifications/preferences", {
      method: "PUT", body: JSON.stringify(newPrefs),
    });
  };

  const filtered = filter === "unread" ? notifs.filter(n => !n.read) : notifs;
  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-7 h-7 text-red-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 text-xs bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-black">الإشعارات</h1>
              <p className="text-sm text-gray-400">{unreadCount} غير مقروء</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTab(tab === "list" ? "prefs" : "list")}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
              <Settings className="w-5 h-5" />
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-300 transition-colors">
                <CheckCheck className="w-4 h-4" />قراءة الكل
              </button>
            )}
            <button onClick={load} className="p-2 hover:bg-white/5 rounded-lg">
              <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tab === "list" ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Filter */}
              <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
                {[{ id: "all", label: `الكل (${notifs.length})` }, { id: "unread", label: `غير مقروء (${unreadCount})` }].map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id as "all" | "unread")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.id ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Bell className="w-14 h-14 mx-auto mb-4 opacity-20" />
                  <div>{filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات"}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(n => {
                    const cfg = TYPE_ICONS[n.type] || TYPE_ICONS.info;
                    const Icon = cfg.icon;
                    return (
                      <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all group ${
                          !n.read ? "bg-white/5 border-white/15 hover:border-white/25" : "bg-white/2 border-white/5 hover:border-white/10"
                        }`}>
                        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${!n.read ? "text-white" : "text-gray-300"}`}>{n.title}</div>
                          <div className={`text-sm mt-0.5 leading-relaxed ${!n.read ? "text-gray-300" : "text-gray-500"}`}>{n.body}</div>
                          <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString("ar")}</div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.read && (
                            <button onClick={() => markRead(n.id)} className="p-1.5 hover:bg-green-600/20 rounded-lg text-gray-500 hover:text-green-400">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteNotif(n.id)} className="p-1.5 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="prefs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="font-semibold">إعدادات الإشعارات</h2>
              <div className="space-y-3">
                {[
                  { key: "email_alerts", label: "إشعارات البريد الإلكتروني", desc: "استلم إشعارات أمنية على بريدك" },
                  { key: "security_alerts", label: "تنبيهات الأمان", desc: "تنبيهات لمحاولات الوصول المشبوهة" },
                  { key: "billing_alerts", label: "تنبيهات الفوترة", desc: "تجديد الاشتراك والفواتير" },
                  { key: "usage_alerts", label: "تنبيهات الاستخدام", desc: "عند اقتراب حد التوكن" },
                  { key: "new_features", label: "الميزات الجديدة", desc: "إطلاق ميزات وتحديثات المنصة" },
                  { key: "weekly_report", label: "التقرير الأسبوعي", desc: "ملخص استخدامك الأسبوعي" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-white/3 border border-white/10 rounded-xl">
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
                    </div>
                    <button onClick={() => updatePref(item.key, !prefs[item.key])}
                      className={`w-12 h-6 rounded-full transition-all relative ${prefs[item.key] ? "bg-red-600" : "bg-white/10"}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs[item.key] ? "right-1" : "left-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
