import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, Check, CheckCheck, Trash2, X, Zap, AlertTriangle, CreditCard, Shield, Info, Gift, Clock } from "lucide-react";
import { authFetch, getAccessToken } from "@/lib/auth";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  data: Record<string, unknown>;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: Gift,
  quota_80: AlertTriangle,
  quota_95: AlertTriangle,
  subscription_activated: CreditCard,
  payment_failed: AlertTriangle,
  task_done: Zap,
  security: Shield,
  info: Info,
};

const TYPE_COLORS: Record<string, string> = {
  welcome: "#22c55e",
  quota_80: "#f59e0b",
  quota_95: "#ef4444",
  subscription_activated: "#6366f1",
  payment_failed: "#ef4444",
  task_done: "#e21227",
  security: "#e21227",
  info: "#3b82f6",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} س`;
  return `${Math.floor(hrs / 24)} ي`;
}

interface Props {
  compact?: boolean;
}

export function NotificationCenter({ compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pulseRing, setPulseRing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const res = await authFetch("/api/notifications?limit=30");
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notification[]; unreadCount: number };
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
      if (data.unreadCount > 0) setPulseRing(true);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: string) => {
    await authFetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    setLoading(true);
    await authFetch("/api/notifications/read-all", { method: "POST" });
    setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    setUnread(0);
    setPulseRing(false);
    setLoading(false);
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await authFetch(`/api/notifications/${id}`, { method: "DELETE" });
    const removed = notifications.find(n => n.id === id);
    setNotifications(n => n.filter(x => x.id !== id));
    if (removed && !removed.is_read) setUnread(u => Math.max(0, u - 1));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(p => !p); if (!open) fetchNotifications(); setPulseRing(false); }}
        className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
          open ? "bg-red-500/20 text-red-400" : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
        }`}
      >
        {unread > 0 ? <BellRing className="w-4.5 h-4.5" /> : <Bell className="w-4.5 h-4.5" />}
        {unread > 0 && (
          <>
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
            {pulseRing && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/40 rounded-full animate-ping" />
            )}
          </>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-11 right-0 w-80 bg-[#0c0c0c] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-50"
            style={{ maxHeight: compact ? "320px" : "480px" }}
          >
            {/* Top glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-white">الإشعارات</span>
                {unread > 0 && (
                  <span className="text-xs bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/20">
                    {unread} جديد
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAllRead} disabled={loading}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 rounded-lg px-2 py-1 transition-all">
                    <CheckCheck className="w-3.5 h-3.5" /> الكل
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: compact ? "240px" : "380px" }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-600">
                  <Bell className="w-10 h-10 opacity-30" />
                  <span className="text-sm">لا توجد إشعارات</span>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {notifications.map(n => {
                    const Icon = TYPE_ICONS[n.type] ?? Info;
                    const color = TYPE_COLORS[n.type] ?? "#888";
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          n.is_read ? "bg-transparent hover:bg-white/3" : "bg-white/5 hover:bg-white/8"
                        }`}
                        onClick={() => !n.is_read && markRead(n.id)}
                      >
                        {!n.is_read && (
                          <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                          <span style={{ color }}><Icon className="w-4 h-4" /></span>
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-xs font-semibold text-white mb-0.5">{n.title}</div>
                          <div className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{n.body}</div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
                            <Clock className="w-2.5 h-2.5" /> {timeAgo(n.created_at)}
                          </div>
                        </div>
                        <button onClick={e => deleteNotif(n.id, e)}
                          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-zinc-500 hover:text-red-400 shrink-0 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
