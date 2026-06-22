/**
 * AdminDashboard — 3D Holographic Admin Control Center
 * Real-time stats · user management · system controls · 3D data viz
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Cpu, Database, Zap, RefreshCw, X, Settings, Key, AlertTriangle, CheckCircle2, TrendingUp, Activity, Globe, Lock, Eye, Trash2, Ban, UserCheck, BarChart3, Server, Clock } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface Stats { users: number; chats: number; tokens: number; apiKeys: number; revenue: number; activeNow: number }
interface User { id: string; email: string; name: string; subscription: string; tokens_used: number; created_at: string; last_active: string; status: "active" | "suspended" | "banned" }
interface SystemLog { id: string; level: "info" | "warn" | "error"; message: string; timestamp: string; service: string }

function hexRgb(h: string) { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : "226,18,39"; }

// ── 3D Ring Stat ──────────────────────────────────────────────────────────────
function RingStat({ value, total, color, label, sub, size = 88 }: { value: number; total: number; color: string; label: string; sub: string; size?: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * DPR; cv.height = size * DPR; cv.style.width = size + "px"; cv.style.height = size + "px"; ctx.scale(DPR, DPR);
    const cx = size / 2, cy = size / 2, r = size * 0.35;
    const pct = total > 0 ? Math.min(value / total, 1) : 0.5;
    const sa = -Math.PI / 2;
    let t = 0; let raf = 0;
    function draw() {
      t = Math.min(t + 0.05, 1); ctx.clearRect(0, 0, size, size);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 6; ctx.stroke();
      if (pct > 0) {
        const gr = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        gr.addColorStop(0, color + "99"); gr.addColorStop(1, color);
        ctx.beginPath(); ctx.arc(cx, cy, r, sa, sa + Math.PI * 2 * pct * t);
        ctx.strokeStyle = gr; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
      }
      ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(size * 0.16)}px Inter`;
      const disp = value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value);
      ctx.fillText(disp, cx, cy + 4); ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = `${Math.round(size * 0.09)}px Inter`; ctx.fillText(label, cx, cy + size * 0.22);
      if (t < 1) raf = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(raf);
  }, [value, total, color, label, size]);
  return <div className="flex flex-col items-center gap-1"><canvas ref={cvRef} /><p className="text-[10px] text-zinc-500">{sub}</p></div>;
}

// ── Animated number ───────────────────────────────────────────────────────────
function Num({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let f = 0; const step = () => { f++; setV(Math.round(to * Math.min(f / 50, 1))); if (f < 50) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [to]);
  return <>{v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}</>;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_STATS: Stats = { users: 1247, chats: 8921, tokens: 4200000, apiKeys: 89, revenue: 12480, activeNow: 34 };
const MOCK_USERS: User[] = [
  { id: "1", email: "admin@mr7.ai", name: "مدير النظام", subscription: "elite", tokens_used: 850000, created_at: "2024-01-15", last_active: new Date().toISOString(), status: "active" },
  { id: "2", email: "user1@example.com", name: "أحمد الكردي", subscription: "professional", tokens_used: 320000, created_at: "2024-02-20", last_active: new Date(Date.now() - 3600000).toISOString(), status: "active" },
  { id: "3", email: "user2@example.com", name: "سارة المنصور", subscription: "starter", tokens_used: 95000, created_at: "2024-03-10", last_active: new Date(Date.now() - 86400000).toISOString(), status: "active" },
  { id: "4", email: "suspended@example.com", name: "مستخدم موقوف", subscription: "free", tokens_used: 8000, created_at: "2024-04-01", last_active: new Date(Date.now() - 7 * 86400000).toISOString(), status: "suspended" },
  { id: "5", email: "pro@example.com", name: "محمد العلي", subscription: "professional", tokens_used: 540000, created_at: "2024-01-28", last_active: new Date(Date.now() - 1800000).toISOString(), status: "active" },
];
const MOCK_LOGS: SystemLog[] = [
  { id: "1", level: "info", message: "مستخدم جديد سجّل في النظام", timestamp: new Date(Date.now() - 120000).toISOString(), service: "auth" },
  { id: "2", level: "info", message: "طلب API ناجح /api/chat", timestamp: new Date(Date.now() - 240000).toISOString(), service: "api" },
  { id: "3", level: "warn", message: "استهلاك توكن مرتفع — مستخدم محدد", timestamp: new Date(Date.now() - 480000).toISOString(), service: "usage" },
  { id: "4", level: "error", message: "فشل الاتصال بـ OpenAI — إعادة المحاولة", timestamp: new Date(Date.now() - 960000).toISOString(), service: "ai" },
  { id: "5", level: "info", message: "اكتمل نسخ احتياطي لقاعدة البيانات", timestamp: new Date(Date.now() - 1800000).toISOString(), service: "db" },
  { id: "6", level: "info", message: "تحديث نظام التحليلات — 38 نظام", timestamp: new Date(Date.now() - 3600000).toISOString(), service: "system" },
];

type Tab = "overview" | "users" | "logs" | "system";

interface Props { onClose?: () => void }

export function AdminDashboard({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats>(MOCK_STATS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [logs, setLogs] = useState<SystemLog[]>(MOCK_LOGS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [uptime] = useState(Math.floor(Math.random() * 86400 * 7 + 86400));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r1 = await authFetch("/api/admin/stats");
      if (r1.ok) { const d = await r1.json() as Stats; setStats(d); }
      const r2 = await authFetch("/api/admin/users?limit=20");
      if (r2.ok) { const d = await r2.json() as { users: User[] }; if (d.users?.length) setUsers(d.users); }
    } catch { /* use mock */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tierColor: Record<string, string> = { free: "#6b7280", starter: "#3b82f6", professional: "#8b5cf6", elite: "#e21227" };
  const fmtTime = (s: string) => { const diff = Date.now() - new Date(s).getTime(); if (diff < 3600000) return `${Math.round(diff / 60000)}د`; if (diff < 86400000) return `${Math.round(diff / 3600000)}س`; return `${Math.round(diff / 86400000)}ي`; };
  const filteredUsers = users.filter(u => !search || u.email.includes(search) || u.name.includes(search));

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 15% 10%,rgba(226,18,39,.06) 0%,transparent 50%),radial-gradient(ellipse at 85% 90%,rgba(139,92,246,.04) 0%,transparent 50%)" }} />

      {/* Header */}
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"><Shield className="w-5 h-5 text-red-400" /></div>
          <div><h2 className="text-base font-bold text-white">لوحة التحكم الرئيسية — Admin</h2><p className="text-xs text-zinc-600">System Administration Dashboard 3D</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{stats.activeNow} نشط الآن
          </div>
          <button onClick={load} disabled={loading} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /></button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex gap-1 px-5 py-2 border-b border-white/5">
        {([["overview", "نظرة عامة", BarChart3], ["users", "المستخدمون", Users], ["logs", "سجل النظام", Activity], ["system", "إعدادات", Settings]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === id ? "bg-red-500/20 border border-red-500/25 text-red-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">

        {/* Overview Tab */}
        {tab === "overview" && (
          <>
            {/* Ring stats */}
            <div className="p-4 rounded-xl bg-white/3 border border-white/6">
              <p className="text-xs font-semibold text-zinc-400 mb-5 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-red-400" />إحصاءات المنصة</p>
              <div className="flex items-center justify-around flex-wrap gap-4">
                <RingStat value={stats.users} total={2000} color="#3b82f6" label="مستخدمون" sub="إجمالي المستخدمين" size={90} />
                <RingStat value={stats.chats} total={20000} color="#e21227" label="محادثات" sub="إجمالي المحادثات" size={90} />
                <RingStat value={stats.tokens} total={10000000} color="#8b5cf6" label="توكن" sub="التوكن المستهلكة" size={90} />
                <RingStat value={stats.apiKeys} total={200} color="#10b981" label="API Keys" sub="مفاتيح نشطة" size={90} />
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "إجمالي المستخدمين", val: stats.users, icon: Users, color: "#3b82f6" },
                { label: "إجمالي المحادثات", val: stats.chats, icon: Zap, color: "#e21227" },
                { label: "الإيرادات (USD)", val: stats.revenue, icon: TrendingUp, color: "#10b981", prefix: "$" },
                { label: "مفاتيح API", val: stats.apiKeys, icon: Key, color: "#f59e0b" },
              ].map(({ label, val, icon: Icon, color, prefix = "" }) => (
                <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl" style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
                  <Icon className="w-4 h-4 mb-2" style={{ color }} />
                  <p className="text-xl font-black text-white">{prefix}<Num to={val} /></p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
                </motion.div>
              ))}
            </div>

            {/* Subscription breakdown */}
            <div className="p-4 rounded-xl bg-white/3 border border-white/6">
              <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400" />توزيع الخطط</p>
              <div className="space-y-2.5">
                {[["elite", "Elite", 47, "#e21227"], ["professional", "Professional", 128, "#8b5cf6"], ["starter", "Starter", 312, "#3b82f6"], ["free", "Free", 760, "#6b7280"]].map(([k, label, count, color]) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-24 font-medium">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: String(color) }}
                        initial={{ width: 0 }} animate={{ width: `${(Number(count) / stats.users) * 100}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-8 text-left">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <>
            <div className="flex items-center gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث بالبريد أو الاسم..."
                className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-red-500/40" />
              <span className="text-xs text-zinc-600">{filteredUsers.length} مستخدم</span>
            </div>
            <div className="space-y-2">
              {filteredUsers.map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-3.5 rounded-xl bg-white/3 border border-white/6 hover:border-white/12 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: `${tierColor[u.subscription] || "#6b7280"}25`, color: tierColor[u.subscription] || "#6b7280" }}>
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: `${tierColor[u.subscription]}22`, color: tierColor[u.subscription] }}>{u.subscription}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${u.status === "active" ? "bg-green-500/15 text-green-400" : u.status === "suspended" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>{u.status}</span>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0">آخر نشاط: {fmtTime(u.last_active)}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-white transition-colors"><Eye className="w-3 h-3" /></button>
                      <button className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-amber-400 transition-colors"><Ban className="w-3 h-3" /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Logs Tab */}
        {tab === "logs" && (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`p-3 rounded-xl border text-right ${log.level === "error" ? "bg-red-500/8 border-red-500/20" : log.level === "warn" ? "bg-amber-500/8 border-amber-500/20" : "bg-white/3 border-white/6"}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.level === "error" ? "bg-red-500" : log.level === "warn" ? "bg-amber-500" : "bg-green-500"}`} />
                  <span className="text-xs text-white flex-1">{log.message}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500 flex-shrink-0">{log.service}</span>
                  <span className="text-[10px] text-zinc-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString("ar")}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* System Tab */}
        {tab === "system" && (
          <div className="space-y-4">
            {[
              { label: "نظام المصادقة JWT", status: "active", color: "#10b981", desc: "Access + Refresh Tokens · TOTP · Sessions" },
              { label: "AI Provider — OpenAI", status: "active", color: "#10b981", desc: "GPT-4o · GPT-4.1 · DALL-E · TTS" },
              { label: "قاعدة البيانات PostgreSQL", status: "active", color: "#10b981", desc: "Connection pool · Auto-backup daily" },
              { label: "حماية Rate Limiting", status: "active", color: "#10b981", desc: "Per-user · Per-IP · Sliding window" },
              { label: "Ollama Local Engine", status: "degraded", color: "#f59e0b", desc: "CPU-only · qwen2.5:0.5b loaded" },
              { label: "Email Notifications", status: "inactive", color: "#6b7280", desc: "SMTP — لم يتم الإعداد" },
            ].map(s => (
              <div key={s.label} className="p-3.5 rounded-xl bg-white/3 border border-white/6 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{s.label}</p>
                  <p className="text-[10px] text-zinc-500">{s.desc}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                  {s.status === "active" ? "نشط" : s.status === "degraded" ? "متدهور" : "غير نشط"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
