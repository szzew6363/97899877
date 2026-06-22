import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Plus, Trash2, Copy, Check, RefreshCw, Eye, EyeOff, Shield, AlertCircle, Clock, Activity } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface APIKey { id: string; name: string; key_prefix: string; scopes: string[]; daily_limit: number; requests_today: number; last_used_at?: string; last_used_ip?: string; created_at: string; is_active: boolean }

const SCOPES = ["chat", "rag", "agent", "vision", "code-scan", "admin"];

interface Props { onClose?: () => void }

export function APIKeysPage({ onClose }: Props) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["chat"]);
  const [dailyLimit, setDailyLimit] = useState(500);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/api-keys");
      if (res.ok) { const d = await res.json() as { keys?: APIKey[] }; setKeys(d.keys || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/api-keys", {
        method: "POST",
        body: JSON.stringify({ name, scopes, dailyLimit }),
      });
      if (res.ok) {
        const d = await res.json() as { key?: string; apiKey?: APIKey };
        setNewKey(d.key || null);
        setCreating(false); setName(""); setScopes(["chat"]);
        await load();
        toast({ title: "✅ تم إنشاء مفتاح API" });
      } else {
        const e = await res.json() as { error?: string };
        toast({ title: e.error || "فشل الإنشاء", variant: "destructive" });
      }
    } catch { toast({ title: "فشل", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deleteKey = async (id: string) => {
    try {
      await authFetch(`/api/api-keys/${id}`, { method: "DELETE" });
      setKeys(k => k.filter(x => x.id !== id));
      toast({ title: "🗑 تم حذف المفتاح" });
    } catch { toast({ title: "فشل الحذف", variant: "destructive" }); }
  };

  const copyKey = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "📋 تم النسخ" });
  };

  const toggleScope = (s: string) => setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-7 h-7 text-red-400" />
            <div>
              <h1 className="text-xl font-black">مفاتيح API للمطورين</h1>
              <p className="text-sm text-gray-400">ادمج KaliGPT في تطبيقاتك</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDocs(!docs)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-300 transition-colors">
              📖 الوثائق
            </button>
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> مفتاح جديد
            </button>
          </div>
        </div>

        {/* New key display */}
        <AnimatePresence>
          {newKey && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-5 bg-green-900/20 border border-green-500/40 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-green-300">مفتاحك الجديد — احفظه الآن!</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 rounded-xl px-4 py-3 font-mono text-sm text-green-300 border border-green-500/20">
                <span className="flex-1 break-all">{newKey}</span>
                <button onClick={() => copyKey(newKey, "new")} className="shrink-0">
                  {copiedId === "new" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-green-400" />}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                لن يُعرض هذا المفتاح مرة أخرى. احفظه في مكان آمن.
              </div>
              <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-gray-400 hover:text-white">إغلاق</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create form */}
        <AnimatePresence>
          {creating && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-5 bg-white/3 border border-red-500/30 rounded-2xl space-y-4">
              <h3 className="font-semibold">إنشاء مفتاح API جديد</h3>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="اسم المفتاح (مثل: تطبيقي الأمني)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
              <div>
                <label className="text-xs text-gray-400 mb-2 block">الصلاحيات</label>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map(s => (
                    <button key={s} onClick={() => toggleScope(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        scopes.includes(s) ? "bg-red-600/20 text-red-400 border-red-600/40" : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">الحد اليومي للطلبات: {dailyLimit}</label>
                <input type="range" min={10} max={10000} step={10} value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))}
                  className="w-full accent-red-500" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCreating(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm">إلغاء</button>
                <button onClick={createKey} disabled={saving || !name}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-medium">
                  {saving ? "جاري الإنشاء..." : "إنشاء المفتاح"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Docs */}
        {docs && (
          <div className="p-5 bg-blue-900/10 border border-blue-500/20 rounded-2xl space-y-3 font-mono text-xs">
            <div className="font-sans font-semibold text-blue-300 text-sm">مثال على الاستخدام</div>
            <pre className="text-blue-200 whitespace-pre-wrap overflow-auto">{`curl -X POST https://mr7.ai/api/chat \\
  -H "X-Api-Key: mr7_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"مرحباً"}],"model":"gpt-4o"}'`}</pre>
            <pre className="text-blue-200 whitespace-pre-wrap">{`// JavaScript
const res = await fetch('https://mr7.ai/api/chat', {
  method: 'POST',
  headers: {
    'X-Api-Key': 'mr7_YOUR_KEY_HERE',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ messages: [{role:'user',content:'مرحباً'}] })
})`}</pre>
          </div>
        )}

        {/* Keys List */}
        {loading && keys.length === 0 ? (
          <div className="text-center py-12"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : keys.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Key className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <div>لا توجد مفاتيح API بعد</div>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <div key={k.id} className="p-4 bg-white/3 border border-white/10 rounded-xl hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${k.is_active ? "bg-green-400" : "bg-gray-600"}`} />
                    <div>
                      <div className="font-medium text-sm">{k.name}</div>
                      <div className="font-mono text-xs text-gray-400 mt-0.5">{k.key_prefix}••••••••</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyKey(k.key_prefix + "...", k.id)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white">
                      {copiedId === k.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteKey(k.id)} className="p-1.5 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{k.requests_today}/{k.daily_limit} اليوم</span>
                  {k.last_used_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />آخر استخدام: {new Date(k.last_used_at).toLocaleDateString("ar")}</span>}
                  <div className="flex gap-1">
                    {k.scopes?.map(s => <span key={s} className="bg-white/10 px-2 py-0.5 rounded text-gray-300">{s}</span>)}
                  </div>
                </div>
                {/* Usage bar */}
                <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (k.requests_today / k.daily_limit) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
