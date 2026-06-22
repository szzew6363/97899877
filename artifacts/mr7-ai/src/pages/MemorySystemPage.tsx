import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, Trash2, Search, RefreshCw, Tag, Clock, Star, Filter } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Memory { id: string; content: string; tags: string[]; importance: number; category: string; created_at: string; last_accessed?: string }

const CATEGORIES = ["general", "security", "pentest", "code", "personal", "research"];

interface Props { onClose?: () => void }

export function MemorySystemPage({ onClose }: Props) {
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newImportance, setNewImportance] = useState(5);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (catFilter !== "all") params.set("category", catFilter);
      if (search) params.set("search", search);
      const res = await authFetch(`/api/memory?${params}`);
      if (res.ok) { const d = await res.json() as { memories?: Memory[] }; setMemories(d.memories || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, catFilter]);

  useEffect(() => { load(); }, [catFilter]);

  const saveMemory = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/memory", {
        method: "POST",
        body: JSON.stringify({
          content: newContent,
          tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
          category: newCategory,
          importance: newImportance,
        }),
      });
      if (res.ok) {
        toast({ title: "✅ تم حفظ الذاكرة" });
        setNewContent(""); setNewTags(""); setAdding(false);
        await load();
      }
    } catch { toast({ title: "فشل الحفظ", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deleteMemory = async (id: string) => {
    try {
      await authFetch(`/api/memory/${id}`, { method: "DELETE" });
      setMemories(m => m.filter(x => x.id !== id));
      toast({ title: "تم الحذف" });
    } catch { toast({ title: "فشل الحذف", variant: "destructive" }); }
  };

  const importanceColor = (n: number) => n >= 8 ? "text-red-400" : n >= 5 ? "text-amber-400" : "text-gray-400";

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-7 h-7 text-red-400" />
            <div>
              <h1 className="text-xl font-black">نظام الذاكرة الطويلة</h1>
              <p className="text-sm text-gray-400">يتذكر KaliGPT معلوماتك عبر المحادثات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 hover:bg-white/5 rounded-lg">
              <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> إضافة ذاكرة
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "إجمالي الذكريات", value: memories.length },
            { label: "الأكثر أهمية", value: memories.filter(m => m.importance >= 8).length },
            { label: "فئات", value: new Set(memories.map(m => m.category)).size },
            { label: "وسوم", value: new Set(memories.flatMap(m => m.tags)).size },
          ].map(s => (
            <div key={s.label} className="p-4 bg-white/3 border border-white/10 rounded-xl text-center">
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load()}
              placeholder="بحث في الذاكرة..." className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
          </div>
          <div className="flex gap-1">
            {["all", ...CATEGORIES].map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  catFilter === c ? "bg-red-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                }`}>
                {c === "all" ? "الكل" : c}
              </button>
            ))}
          </div>
        </div>

        {/* Add Memory Form */}
        <AnimatePresence>
          {adding && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-5 bg-white/3 border border-red-500/30 rounded-2xl space-y-4">
              <h3 className="font-semibold text-red-400">ذاكرة جديدة</h3>
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="ما تريد أن يتذكره KaliGPT عنك؟ مثل: 'أنا متخصص في pentest على شبكات الـ Active Directory'"
                rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none" />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">الفئة</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">الأهمية (1-10)</label>
                  <input type="number" min={1} max={10} value={newImportance} onChange={e => setNewImportance(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">وسوم (فصل بفاصلة)</label>
                  <input value={newTags} onChange={e => setNewTags(e.target.value)}
                    placeholder="pentest, network" dir="ltr"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAdding(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm">إلغاء</button>
                <button onClick={saveMemory} disabled={saving || !newContent}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-medium">
                  {saving ? "جاري الحفظ..." : "حفظ الذاكرة"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Memory List */}
        {loading && memories.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><RefreshCw className="w-8 h-8 animate-spin mx-auto" /></div>
        ) : memories.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Brain className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <div>لا توجد ذكريات بعد</div>
            <div className="text-sm mt-1">أضف ذاكرتك الأولى لتحسين إجابات KaliGPT</div>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map(m => (
              <motion.div key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 bg-white/3 border border-white/10 rounded-xl hover:border-white/20 transition-colors group">
                <div className="flex items-start gap-3">
                  <Star className={`w-4 h-4 mt-0.5 shrink-0 ${importanceColor(m.importance)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-relaxed">{m.content}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full capitalize">{m.category}</span>
                      {m.tags?.map(tag => (
                        <span key={tag} className="text-xs bg-red-600/15 text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />{tag}
                        </span>
                      ))}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{new Date(m.created_at).toLocaleDateString("ar")}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => deleteMemory(m.id)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
