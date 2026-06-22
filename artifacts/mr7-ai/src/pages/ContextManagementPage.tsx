import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Plus, Trash2, RefreshCw, FileText, Tag, ChevronDown, Settings, BookOpen, Zap } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface ContextRule { id: string; name: string; content: string; type: "system" | "user" | "assistant"; priority: number; active: boolean; triggers: string[]; created_at: string }

const TEMPLATES = [
  { name: "خبير أمن المعلومات", type: "system" as const, content: "أنت خبير في أمن المعلومات والـ cybersecurity. تجيب دائماً بالعربية وتوفر تحليلات عميقة وعملية. تستخدم أمثلة حقيقية وأدوات محددة.", triggers: ["security", "hack", "exploit", "vulnerability"] },
  { name: "مختبر اختراق محترف", type: "system" as const, content: "أنت pentester محترف معتمد (OSCP, CEH). تقدم إرشادات اختبار اختراق أخلاقي ومشروع مع التوثيق الكامل.", triggers: ["pentest", "CTF", "نظام", "ثغرة"] },
  { name: "مساعد الكود الآمن", type: "system" as const, content: "أنت مطور أمني يراجع الكود ويحدد الثغرات. تقترح إصلاحات آمنة وتشرح مبادئ OWASP وأفضل الممارسات.", triggers: ["code", "python", "javascript", "كود"] },
  { name: "لغة إجابات عربية", type: "system" as const, content: "يجب أن تجيب دائماً باللغة العربية الفصحى مع استخدام المصطلحات التقنية الصحيحة. اجعل إجاباتك منظمة وواضحة.", triggers: [] },
];

interface Props { onClose?: () => void }

export function ContextManagementPage({ onClose }: Props) {
  const { toast } = useToast();
  const [rules, setRules] = useState<ContextRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"system" | "user" | "assistant">("system");
  const [priority, setPriority] = useState(5);
  const [triggers, setTriggers] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"rules" | "templates">("rules");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/context");
      if (res.ok) { const d = await res.json() as { rules?: ContextRule[] }; setRules(d.rules || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const saveRule = async () => {
    if (!name || !content) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/context", {
        method: "POST",
        body: JSON.stringify({
          name, content, type, priority,
          triggers: triggers.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        toast({ title: "✅ تم حفظ قاعدة السياق" });
        setCreating(false); setName(""); setContent(""); setTriggers("");
        await load();
      }
    } catch { toast({ title: "فشل الحفظ", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const toggleRule = async (id: string, active: boolean) => {
    await authFetch(`/api/context/${id}`, { method: "PUT", body: JSON.stringify({ active }) });
    setRules(r => r.map(x => x.id === id ? { ...x, active } : x));
  };

  const deleteRule = async (id: string) => {
    await authFetch(`/api/context/${id}`, { method: "DELETE" });
    setRules(r => r.filter(x => x.id !== id));
    toast({ title: "تم الحذف" });
  };

  const addTemplate = async (tpl: typeof TEMPLATES[0]) => {
    setSaving(true);
    try {
      const res = await authFetch("/api/context", {
        method: "POST",
        body: JSON.stringify({ name: tpl.name, content: tpl.content, type: tpl.type, priority: 8, triggers: tpl.triggers }),
      });
      if (res.ok) { toast({ title: `✅ تم إضافة "${tpl.name}"` }); await load(); setTab("rules"); }
    } catch { toast({ title: "فشل", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-7 h-7 text-red-400" />
            <div>
              <h1 className="text-xl font-black">إدارة السياق</h1>
              <p className="text-sm text-gray-400">تخصيص سلوك KaliGPT بقواعد سياق ذكية</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {[{ id: "rules", label: "قواعدي" }, { id: "templates", label: "قوالب جاهزة" }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id as "rules" | "templates")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "rules" && (
              <button onClick={() => setCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium">
                <Plus className="w-4 h-4" />جديد
              </button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">

          {tab === "templates" && (
            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-4">
              {TEMPLATES.map((tpl, i) => (
                <div key={i} className="p-5 bg-white/3 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-red-400" />
                    <span className="font-semibold text-sm">{tpl.name}</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded capitalize">{tpl.type}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">{tpl.content.slice(0, 100)}...</p>
                  {tpl.triggers.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {tpl.triggers.map(t => <span key={t} className="text-xs bg-red-600/15 text-red-300 px-2 py-0.5 rounded">{t}</span>)}
                    </div>
                  )}
                  <button onClick={() => addTemplate(tpl)} disabled={saving || rules.some(r => r.name === tpl.name)}
                    className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
                      rules.some(r => r.name === tpl.name) ? "bg-green-600/20 text-green-400 cursor-default" : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                    }`}>
                    {rules.some(r => r.name === tpl.name) ? "مُضاف" : "إضافة القالب"}
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {tab === "rules" && (
            <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Create Form */}
              <AnimatePresence>
                {creating && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-5 bg-white/3 border border-red-500/30 rounded-2xl space-y-4">
                    <h3 className="font-semibold">قاعدة سياق جديدة</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs text-gray-400 mb-1 block">الاسم</label>
                        <input value={name} onChange={e => setName(e.target.value)}
                          placeholder="اسم القاعدة" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">النوع</label>
                        <select value={type} onChange={e => setType(e.target.value as typeof type)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                          <option value="system">system</option>
                          <option value="user">user</option>
                          <option value="assistant">assistant</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">المحتوى</label>
                      <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
                        placeholder="محتوى السياق الذي سيُضاف تلقائياً للمحادثات..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">الأولوية: {priority}</label>
                        <input type="range" min={1} max={10} value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full accent-red-500" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">كلمات مفتاحية (فصل بفاصلة)</label>
                        <input value={triggers} onChange={e => setTriggers(e.target.value)}
                          placeholder="security, hack, exploit" dir="ltr"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setCreating(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm">إلغاء</button>
                      <button onClick={saveRule} disabled={saving || !name || !content}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-medium">
                        {saving ? "جاري الحفظ..." : "حفظ القاعدة"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rules List */}
              {loading && rules.length === 0 ? (
                <div className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
              ) : rules.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Layers className="w-14 h-14 mx-auto mb-4 opacity-20" />
                  <div>لا توجد قواعد سياق</div>
                  <div className="text-sm mt-1">أضف قاعدة أو استخدم القوالب الجاهزة</div>
                </div>
              ) : rules.map(rule => (
                <motion.div key={rule.id} layout className="p-4 bg-white/3 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleRule(rule.id, !rule.active)}
                      className={`w-10 h-6 rounded-full transition-all relative shrink-0 mt-0.5 ${rule.active ? "bg-red-600" : "bg-white/10"}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${rule.active ? "right-1" : "left-1"}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{rule.name}</span>
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded capitalize">{rule.type}</span>
                        <span className="text-xs text-gray-500">أولوية: {rule.priority}</span>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{rule.content}</p>
                      {rule.triggers?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {rule.triggers.map(t => <span key={t} className="text-xs bg-red-600/15 text-red-300 px-1.5 py-0.5 rounded">{t}</span>)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteRule(rule.id)} className="p-1.5 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
