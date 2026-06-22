import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Zap, AlertCircle, Shield, Key, BarChart3, RefreshCw, Check, X, Search, ChevronDown, Activity, Database, Server } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const TABS = [
  { id: "overview", label: "النظرة العامة", icon: BarChart3 },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "errors", label: "الأخطاء", icon: AlertCircle },
  { id: "health", label: "صحة النظام", icon: Activity },
  { id: "activate", label: "تفعيل الاشتراكات", icon: Key },
] as const;

interface Props { onClose?: () => void }

export function AdminDashboard({ onClose }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<string>("overview");
  const [adminSecret, setAdminSecret] = useState(localStorage.getItem("mr7_admin") || "");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<unknown[]>([]);
  const [errors, setErrors] = useState<unknown[]>([]);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [activateEmail, setActivateEmail] = useState("");
  const [activateTier, setActivateTier] = useState("professional");
  const [activateDays, setActivateDays] = useState(30);
  const [genCode, setGenCode] = useState("");

  const headers = { "x-admin-secret": adminSecret, "Content-Type": "application/json" };

  const verifyAdmin = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/verify", { method: "POST", headers: new Headers(headers) });
      if (res.ok) {
        setAuthed(true);
        localStorage.setItem("mr7_admin", adminSecret);
        loadData();
      } else {
        toast({ title: "❌ كلمة مرور خاطئة", variant: "destructive" });
      }
    } catch { toast({ title: "فشل الاتصال", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, errorsRes, healthRes] = await Promise.all([
        authFetch("/api/admin/stats", { headers: new Headers(headers) }),
        authFetch("/api/admin/users?limit=100", { headers: new Headers(headers) }),
        authFetch("/api/monitoring/errors?limit=50", { headers: new Headers(headers) }),
        authFetch("/api/monitoring/health"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json() as Record<string, unknown>);
      if (usersRes.ok) { const d = await usersRes.json() as { users?: unknown[] }; setUsers(d.users || []); }
      if (errorsRes.ok) { const d = await errorsRes.json() as { errors?: unknown[] }; setErrors(d.errors || []); }
      if (healthRes.ok) setHealth(await healthRes.json() as Record<string, unknown>);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [adminSecret]);

  const generateCode = async () => {
    const res = await authFetch("/api/admin/gen-code", {
      method: "POST",
      headers: new Headers(headers),
      body: JSON.stringify({ tier: activateTier, days: activateDays }),
    });
    if (res.ok) {
      const d = await res.json() as { code?: string };
      setGenCode(d.code || "");
      toast({ title: "✅ تم إنشاء كود التفعيل" });
    }
  };

  const activateUser = async () => {
    const res = await authFetch("/api/admin/activate-user", {
      method: "POST",
      headers: new Headers(headers),
      body: JSON.stringify({ email: activateEmail, tier: activateTier, days: activateDays }),
    });
    if (res.ok) toast({ title: "✅ تم تفعيل المستخدم" });
    else toast({ title: "فشل التفعيل", variant: "destructive" });
  };

  useEffect(() => { if (authed) loadData(); }, [tab, authed]);

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold">لوحة الإدارة</h2>
            <p className="text-sm text-gray-400 mt-1">أدخل كلمة مرور المدير للوصول</p>
          </div>
          <input
            type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)}
            placeholder="ADMIN_SECRET"
            onKeyDown={e => e.key === "Enter" && verifyAdmin()}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            dir="ltr"
          />
          <button onClick={verifyAdmin} disabled={loading || !adminSecret}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-medium transition-colors">
            {loading ? "جاري التحقق..." : "دخول"}
          </button>
        </div>
      </div>
    );
  }

  const s = stats as Record<string, Record<string, number>> | null;

  return (
    <div className="flex h-full" dir="rtl">
      {/* Sidebar */}
      <aside className="w-44 shrink-0 border-l border-white/10 bg-black/30 p-3 space-y-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              tab === t.id ? "bg-red-600/20 text-red-400" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
        <button onClick={loadData} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-white transition-colors mt-4">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />تحديث
        </button>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Overview */}
            {tab === "overview" && s && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold">نظرة عامة على المنصة</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "إجمالي المستخدمين", value: s.users?.total || 0, icon: Users, color: "blue" },
                    { label: "مستخدمون جدد اليوم", value: s.users?.today || 0, icon: TrendingUp, color: "green" },
                    { label: "إجمالي التوكن", value: ((s.totalTokensUsed as unknown as number) || 0).toLocaleString(), icon: Zap, color: "yellow" },
                    { label: "إجمالي السكانات", value: s.totalScans || 0, icon: Shield, color: "red" },
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-white/3 border border-white/10 rounded-xl">
                      <div className="text-2xl font-bold text-white">{String(item.value)}</div>
                      <div className="text-sm text-gray-400 mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-white/3 border border-white/10 rounded-xl">
                  <h3 className="font-medium mb-3">توزيع الاشتراكات</h3>
                  <div className="space-y-2">
                    {s.subscriptions && Object.entries(s.subscriptions as Record<string, number>).map(([tier, cnt]) => (
                      <div key={tier} className="flex items-center gap-3">
                        <div className="w-20 text-sm text-gray-400 capitalize">{tier}</div>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-red-600 rounded-full"
                            style={{ width: `${Math.min(100, ((cnt as number) / (s.users?.total || 1)) * 100)}%` }} />
                        </div>
                        <div className="w-8 text-sm text-right">{cnt as number}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {tab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">المستخدمون</h2>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder="بحث..." className="w-full bg-white/5 border border-white/10 rounded-lg pr-9 pl-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" />
                  </div>
                </div>
                <div className="overflow-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        {["البريد", "الاشتراك", "التوكن", "آخر دخول", "الحالة"].map(h => (
                          <th key={h} className="px-4 py-3 text-right text-xs text-gray-400 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(users as Record<string, unknown>[])
                        .filter((u) => !userSearch || String(u.email).includes(userSearch))
                        .map((u, i) => (
                          <tr key={i} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3 text-white">{String(u.email)}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs bg-red-600/20 text-red-400 rounded-full">{String(u.subscription)}</span></td>
                            <td className="px-4 py-3 text-gray-300">{Number(u.tokens_used || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{u.last_login_at ? new Date(String(u.last_login_at)).toLocaleDateString("ar") : "—"}</td>
                            <td className="px-4 py-3"><span className={`w-2 h-2 rounded-full inline-block ${u.status === "active" ? "bg-green-400" : "bg-red-400"}`} /></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors */}
            {tab === "errors" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">سجل الأخطاء ({errors.length})</h2>
                <div className="space-y-2">
                  {(errors as Record<string, unknown>[]).map((e, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${e.severity === "critical" ? "border-red-500/30 bg-red-900/10" : "border-white/10 bg-white/3"}`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${e.severity === "critical" ? "text-red-400" : "text-amber-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{String(e.message)}</div>
                          {e.url && <div className="text-xs text-gray-500 mt-0.5">{String(e.url)}</div>}
                          <div className="text-xs text-gray-600 mt-1">{new Date(String(e.created_at)).toLocaleString("ar")}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-white/5 rounded">{String(e.severity || "error")}</span>
                      </div>
                    </div>
                  ))}
                  {errors.length === 0 && <div className="text-center py-8 text-gray-500">لا توجد أخطاء ✅</div>}
                </div>
              </div>
            )}

            {/* Health */}
            {tab === "health" && health && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">صحة النظام</h2>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${(health as Record<string, unknown>).status === "healthy" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {String((health as Record<string, unknown>).status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "وقت التشغيل", value: `${Math.floor(Number((health as Record<string, unknown>).uptime) / 3600)}h` },
                    { label: "وقت الاستجابة", value: `${(health as Record<string, unknown>).responseTime}ms` },
                    { label: "قاعدة البيانات", value: (health as Record<string, Record<string, unknown>>).database?.ok ? "✅ متصلة" : "❌ منقطعة" },
                    { label: "تأخير DB", value: `${(health as Record<string, Record<string, unknown>>).database?.latency}ms` },
                    { label: "RAM المستخدمة", value: `${(health as Record<string, Record<string, unknown>>).memory?.heapUsed}MB` },
                    { label: "Node.js", value: String((health as Record<string, Record<string, unknown>>).platform?.node) },
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-white/3 border border-white/10 rounded-xl">
                      <div className="text-lg font-bold text-white">{item.value}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
                {(health as Record<string, Record<string, unknown>>).stats && (
                  <div className="p-4 bg-white/3 border border-white/10 rounded-xl">
                    <h3 className="font-medium mb-3">إحصاءات المنصة</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries((health as Record<string, Record<string, unknown>>).stats as Record<string, unknown>).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-gray-400">{k}</span>
                          <span className="text-white font-mono">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activate */}
            {tab === "activate" && (
              <div className="space-y-6 max-w-md">
                <h2 className="text-lg font-bold">تفعيل اشتراك مستخدم</h2>
                <div className="space-y-3">
                  <input value={activateEmail} onChange={e => setActivateEmail(e.target.value)}
                    placeholder="البريد الإلكتروني للمستخدم" dir="ltr"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={activateTier} onChange={e => setActivateTier(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none">
                      {["free","starter","professional","elite","enterprise"].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input type="number" value={activateDays} onChange={e => setActivateDays(Number(e.target.value))}
                      min={1} max={3650}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none"
                      placeholder="أيام" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={activateUser} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium text-sm transition-colors">
                      تفعيل مستخدم
                    </button>
                    <button onClick={generateCode} className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-xl font-medium text-sm transition-colors">
                      إنشاء كود
                    </button>
                  </div>
                  {genCode && (
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">كود التفعيل:</div>
                      <div className="font-mono text-green-400 text-sm break-all">{genCode}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
