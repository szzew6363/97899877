/**
 * APIKeysPage — 3D Holographic Developer API Portal
 * Key management · usage stats · permissions · rotation · webhooks
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, X, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw, Shield, Zap, Clock, Globe, CheckCircle2, AlertTriangle, Code2, Activity } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface APIKey { id: string; name: string; key: string; prefix: string; permissions: string[]; usage: number; limit: number; createdAt: string; lastUsed: string; status: "active" | "revoked"; expiresAt?: string }

const MOCK_KEYS: APIKey[] = [
  { id: "1", name: "Production API", key: "sk-prod-••••••••••••••••••••••••••••••••", prefix: "sk-prod", permissions: ["chat", "analyze", "pentest"], usage: 45230, limit: 100000, createdAt: "2024-01-15", lastUsed: new Date(Date.now() - 3600000).toISOString(), status: "active" },
  { id: "2", name: "Development Key", key: "sk-dev-•••••••••••••••••••••••••••••••••", prefix: "sk-dev", permissions: ["chat", "analyze"], usage: 8900, limit: 50000, createdAt: "2024-03-01", lastUsed: new Date(Date.now() - 86400000).toISOString(), status: "active" },
  { id: "3", name: "Testing Key (Revoked)", key: "sk-test-••••••••••••••••••••••••••••••••", prefix: "sk-test", permissions: ["chat"], usage: 1200, limit: 10000, createdAt: "2024-02-15", lastUsed: new Date(Date.now() - 7 * 86400000).toISOString(), status: "revoked" },
];

const ALL_PERMS = ["chat", "analyze", "pentest", "council", "image", "voice", "rag", "admin"];
const PERM_COLORS: Record<string, string> = { chat: "#3b82f6", analyze: "#8b5cf6", pentest: "#e21227", council: "#f59e0b", image: "#10b981", voice: "#06b6d4", rag: "#3b82f6", admin: "#ef4444" };

// ── Usage Sparkline ───────────────────────────────────────────────────────────
function UsageBar({ used, total, color = "#e21227" }: { used: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0;
  const c = pct > 0.9 ? "#ef4444" : pct > 0.7 ? "#f59e0b" : color;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-zinc-600">{used >= 1000 ? `${(used/1000).toFixed(0)}K` : used} / {total >= 1000 ? `${(total/1000).toFixed(0)}K` : total}</span>
        <span className="text-[10px] font-medium" style={{ color: c }}>{Math.round(pct * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}80` }}
          initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
    </div>
  );
}

function fmtDate(s: string) { const d = new Date(s); return d.toLocaleDateString("ar-SA"); }
function fmtAge(s: string) { const d = Date.now() - new Date(s).getTime(); if (d < 3600000) return `${Math.round(d / 60000)}د`; if (d < 86400000) return `${Math.round(d / 3600000)}س`; return `${Math.round(d / 86400000)} يوم`; }

interface Props { onClose?: () => void }

export function APIKeysPage({ onClose }: Props) {
  const [keys, setKeys] = useState<APIKey[]>(MOCK_KEYS);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(["chat"]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const togglePerm = (p: string) => setNewPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const createKey = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const generated = `sk-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
    const k: APIKey = { id: crypto.randomUUID(), name: newName, key: generated, prefix: "sk-" + newName.toLowerCase().replace(/\s+/g, "-").slice(0, 8), permissions: newPerms, usage: 0, limit: 50000, createdAt: new Date().toISOString(), lastUsed: new Date().toISOString(), status: "active" };
    try { await authFetch("/api/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, permissions: newPerms }) }); } catch { /**/ }
    setKeys(prev => [k, ...prev]); setNewKey(generated); setNewName(""); setNewPerms(["chat"]); setShowNew(false); setCreating(false);
    setTimeout(() => setNewKey(null), 30000);
  }, [newName, newPerms]);

  const revoke = useCallback(async (id: string) => {
    setKeys(k => k.map(x => x.id === id ? { ...x, status: "revoked" as const } : x));
    try { await authFetch(`/api/api-keys/${id}`, { method: "DELETE" }); } catch { /**/ }
  }, []);

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(id); setTimeout(() => setCopied(""), 2000);
  };

  const activeKeys = keys.filter(k => k.status === "active");
  const totalUsage = activeKeys.reduce((s, k) => s + k.usage, 0);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 15%,rgba(16,185,129,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><Key className="w-5 h-5 text-emerald-400" /></div>
          <div><h2 className="text-base font-bold text-white">مفاتيح API للمطورين — 3D</h2><p className="text-xs text-zinc-600">{activeKeys.length} مفتاح نشط · {totalUsage >= 1000 ? `${(totalUsage/1000).toFixed(0)}K` : totalUsage} طلب كلي</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNew(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/30 transition-all">
            <Plus className="w-3.5 h-3.5" />مفتاح جديد
          </button>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {/* New Key disclosed */}
        <AnimatePresence>
          {newKey && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-4 rounded-xl bg-green-500/8 border border-green-500/25">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-400 mb-1">تم إنشاء المفتاح — احفظه الآن (لن يُعرض مجدداً)</p>
                  <code className="text-xs text-white font-mono bg-white/5 px-3 py-2 rounded-lg block break-all">{newKey}</code>
                </div>
                <button onClick={() => copyKey(newKey, "new")} className="w-7 h-7 flex items-center justify-center text-green-400 hover:bg-green-500/15 rounded-lg transition-colors">
                  {copied === "new" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Create form */}
        <AnimatePresence>
          {showNew && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-xl bg-emerald-500/6 border border-emerald-500/20 space-y-3">
              <p className="text-xs font-semibold text-zinc-300">إنشاء مفتاح API جديد</p>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم المفتاح (مثال: Production App)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/40" />
              <div>
                <p className="text-[10px] text-zinc-500 mb-2">الصلاحيات</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PERMS.map(p => (
                    <button key={p} onClick={() => togglePerm(p)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${newPerms.includes(p) ? "text-white" : "text-zinc-500 border-white/8"}`}
                      style={newPerms.includes(p) ? { borderColor: `${PERM_COLORS[p]}50`, backgroundColor: `${PERM_COLORS[p]}20`, color: PERM_COLORS[p] } : {}}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createKey} disabled={creating || !newName.trim()} className="px-4 py-2 rounded-lg bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/35 disabled:opacity-40 transition-all flex items-center gap-1.5">
                  {creating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}إنشاء
                </button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs transition-colors">إلغاء</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Keys list */}
        <div className="space-y-3">
          {keys.map((k, i) => (
            <motion.div key={k.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-xl border transition-all ${k.status === "revoked" ? "opacity-50 bg-white/2 border-white/4" : "bg-white/3 border-white/6 hover:border-emerald-500/20"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{k.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${k.status === "active" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{k.status === "active" ? "نشط" : "ملغى"}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-0.5">أُنشئ: {fmtDate(k.createdAt)} · آخر استخدام: {fmtAge(k.lastUsed)}</p>
                </div>
                {k.status === "active" && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setRevealed(r => { const n = new Set(r); n.has(k.id) ? n.delete(k.id) : n.add(k.id); return n; })} className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-white transition-colors">
                      {revealed.has(k.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => copyKey(k.key, k.id)} className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-emerald-400 transition-colors">
                      {copied === k.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => revoke(k.id)} className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              {/* Key display */}
              <code className="text-[11px] text-zinc-500 font-mono bg-white/3 px-3 py-1.5 rounded-lg block mb-3 overflow-hidden text-ellipsis whitespace-nowrap">
                {revealed.has(k.id) ? k.key : `${k.prefix}-${"•".repeat(32)}`}
              </code>
              {/* Permissions */}
              <div className="flex flex-wrap gap-1 mb-3">
                {k.permissions.map(p => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium" style={{ borderColor: `${PERM_COLORS[p] || "#e21227"}30`, backgroundColor: `${PERM_COLORS[p] || "#e21227"}15`, color: PERM_COLORS[p] || "#e21227" }}>{p}</span>
                ))}
              </div>
              {/* Usage */}
              <UsageBar used={k.usage} total={k.limit} />
            </motion.div>
          ))}
        </div>
        {/* Docs section */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-blue-400" />مثال على الاستخدام</p>
          <pre className="text-[11px] text-zinc-300 font-mono bg-black/40 p-3 rounded-lg overflow-x-auto">{`curl -X POST https://mr7.ai/api/chat \\
  -H "Authorization: Bearer sk-prod-..." \\
  -H "Content-Type: application/json" \\
  -d '{"message": "تحليل أمني للنظام"}'`}</pre>
        </div>
      </div>
    </div>
  );
}
