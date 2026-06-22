/**
 * NotificationsBell — real-time bell connected to /api/notifications
 * Polls every 30s when user is authenticated, supports Web Push registration
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Trash2, X, Shield, Zap, AlertTriangle, Info, Gift, CreditCard } from "lucide-react";
import { authFetch, getCachedUser } from "@/lib/auth";

interface ApiNotif {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  data: Record<string, unknown>;
  created_at: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  welcome:       <Gift className="w-4 h-4 text-emerald-400" />,
  subscription:  <CreditCard className="w-4 h-4 text-violet-400" />,
  token_warning: <Zap className="w-4 h-4 text-amber-400" />,
  security:      <Shield className="w-4 h-4 text-red-400" />,
  agent_done:    <Zap className="w-4 h-4 text-cyan-400" />,
  error:         <AlertTriangle className="w-4 h-4 text-red-500" />,
};
const DEFAULT_ICON = <Info className="w-4 h-4 text-zinc-400" />;

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

export function NotificationsBell() {
  const [notifs, setNotifs]       = useState<ApiNotif[]>([]);
  const [unread, setUnread]       = useState(0);
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const panelRef                  = useRef<HTMLDivElement>(null);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const user                      = getCachedUser();

  const fetchNotifs = useCallback(async () => {
    if (!getCachedUser()) return;
    try {
      const res = await authFetch("/api/notifications?limit=40");
      if (!res.ok) return;
      const data = await res.json() as { notifications: ApiNotif[]; unreadCount: number };
      setNotifs(data.notifications);
      setUnread(data.unreadCount);
    } catch { /* offline */ }
  }, []);

  // Poll every 30s
  useEffect(() => {
    fetchNotifs();
    pollRef.current = setInterval(fetchNotifs, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchNotifs]);

  // Listen for auth events → re-fetch
  useEffect(() => {
    const handler = () => setTimeout(fetchNotifs, 500);
    window.addEventListener("mr7:auth", handler);
    return () => window.removeEventListener("mr7:auth", handler);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Mark all read when opening
  const handleOpen = async () => {
    setOpen(v => !v);
    if (!open && unread > 0) {
      try {
        await authFetch("/api/notifications/read-all", { method: "POST" });
        setNotifs(n => n.map(x => ({ ...x, is_read: true })));
        setUnread(0);
      } catch { /* */ }
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await authFetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifs(n => n.filter(x => x.id !== id));
    } catch { /* */ }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-all"
        title="الإشعارات"
      >
        <Bell className="w-4 h-4" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(226,18,39,0.6)]"
            >
              {unread > 99 ? "99+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="absolute right-0 top-10 w-80 z-[200] rounded-xl border border-white/10 bg-[#0e0e0e] shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden"
            style={{ boxShadow: "0 0 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(226,18,39,0.1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-white">الإشعارات</span>
                {unread > 0 && (
                  <span className="text-xs bg-red-600/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                    {unread} جديد
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-white/4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {notifs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">لا توجد إشعارات</p>
                </div>
              ) : (
                notifs.map(n => (
                  <motion.div
                    key={n.id}
                    layout
                    className={`group flex items-start gap-3 px-4 py-3 transition-colors ${!n.is_read ? "bg-red-950/10" : "hover:bg-white/3"}`}
                  >
                    <div className="mt-0.5 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      {TYPE_ICON[n.type] ?? DEFAULT_ICON}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-white leading-tight line-clamp-1">{n.title}</p>
                        <span className="text-[10px] text-zinc-600 flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                    </div>
                    <button
                      onClick={() => deleteNotif(n.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 flex-shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div className="px-4 py-2.5 border-t border-white/6 flex items-center justify-between">
                <button
                  onClick={async () => {
                    await authFetch("/api/notifications/read-all", { method: "POST" });
                    setNotifs(n => n.map(x => ({ ...x, is_read: true })));
                    setUnread(0);
                  }}
                  className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  تحديد الكل كمقروء
                </button>
                <span className="text-[10px] text-zinc-600">{notifs.length} إشعار</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
