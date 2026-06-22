/**
 * AdminDashboard — real-time stats panel for the owner
 * Shows: users, subscriptions, tokens, scans, errors
 * Accessed via AdminPanel's "Dashboard" tab
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, CreditCard, Zap, ShieldAlert, TrendingUp,
  RefreshCw, Loader2, AlertCircle, BarChart3,
} from "lucide-react";

interface Stats {
  users: { total: number; today: number };
  subscriptions: Record<string, number>;
  totalTokensUsed: number;
  totalScans: number;
}

interface User {
  id: string;
  email: string;
  subscription: string;
  tokens_used: number;
  tokens_limit: number;
  created_at: string;
  last_login_at: string | null;
}

interface AdminDashboardProps {
  adminPassword: string;
}

export function AdminDashboard({ adminPassword }: AdminDashboardProps) {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);

  const headers = { "Content-Type": "application/json", "x-admin-secret": adminPassword };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch(`/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`, { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json() as Stats);
      if (usersRes.ok) {
        const d = await usersRes.json() as { users: User[] };
        setUsers(d.users ?? []);
      }
    } catch { setError("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  }, [adminPassword, page, search]);

  useEffect(() => { void load(); }, [load]);

  const tierColor: Record<string, string> = {
    free: "#6b7280", starter: "#3b82f6", professional: "#8b5cf6", elite: "#f59e0b",
  };

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "إجمالي المستخدمين", val: stats.users.total, sub: `+${stats.users.today} اليوم`, icon: <Users className="w-4 h-4" />, color: "#3b82f6" },
            { label: "إجمالي التوكنز", val: (stats.totalTokensUsed / 1000).toFixed(1) + "K", sub: "مستهلكة", icon: <Zap className="w-4 h-4" />, color: "#f59e0b" },
            { label: "عمليات الفحص", val: stats.totalScans, sub: "code scans", icon: <ShieldAlert className="w-4 h-4" />, color: "#e21227" },
            { label: "Elite", val: stats.subscriptions["elite"] ?? 0, sub: "مشتركون متميزون", icon: <CreditCard className="w-4 h-4" />, color: "#8b5cf6" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl border" style={{ background: s.color + "08", borderColor: s.color + "20" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-500">{s.label}</span>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px] text-zinc-600">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Subscription breakdown */}
      {stats?.subscriptions && (
        <div className="rounded-xl border border-white/6 p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold text-zinc-400">توزيع الاشتراكات</span>
          </div>
          <div className="space-y-2">
            {["free", "starter", "professional", "elite"].map(tier => {
              const count = stats.subscriptions[tier] ?? 0;
              const total = stats.users.total || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tier} className="flex items-center gap-3">
                  <div className="w-20 text-[10px] text-right font-mono" style={{ color: tierColor[tier] }}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </div>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 }}
                      className="h-full rounded-full" style={{ background: tierColor[tier] }} />
                  </div>
                  <div className="w-8 text-[10px] font-mono" style={{ color: tierColor[tier] }}>{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-white/6 overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold text-zinc-400">المستخدمون</span>
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث بالإيميل…"
              className="bg-white/4 border border-white/8 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none w-36"
            />
            <button onClick={load} disabled={loading}
              className="w-7 h-7 rounded-lg bg-white/4 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 p-4 text-[11px] text-red-400">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-zinc-600">
            {loading ? "جاري التحميل…" : "لا توجد نتائج"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/4 text-zinc-600">
                  <th className="text-right px-3 py-2 font-medium">البريد</th>
                  <th className="text-right px-3 py-2 font-medium">الخطة</th>
                  <th className="text-right px-3 py-2 font-medium">التوكنز</th>
                  <th className="text-right px-3 py-2 font-medium">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="px-3 py-2 font-mono truncate max-w-[140px]" style={{ color: "#ccc" }}>{u.email}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: (tierColor[u.subscription] || "#6b7280") + "15", color: tierColor[u.subscription] || "#6b7280" }}>
                        {u.subscription || "free"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-500">
                      {(u.tokens_used ?? 0).toLocaleString()} / {(u.tokens_limit ?? 10000).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("ar") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
            className="text-[10px] text-zinc-500 hover:text-white disabled:opacity-30 transition-colors">
            ← السابق
          </button>
          <span className="text-[10px] text-zinc-600">صفحة {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20 || loading}
            className="text-[10px] text-zinc-500 hover:text-white disabled:opacity-30 transition-colors">
            التالي →
          </button>
        </div>
      </div>
    </div>
  );
}
