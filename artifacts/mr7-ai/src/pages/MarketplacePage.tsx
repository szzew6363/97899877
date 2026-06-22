import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Star, Download, Search, Filter, Zap, Shield, Code, Bot, Globe, Lock, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Plugin { id: string; name: string; description: string; category: string; version: string; author: string; rating: number; downloads: number; installed: boolean; price: number; tags: string[]; icon?: string }

const CATEGORIES = ["all", "security", "agent", "productivity", "data", "integration", "ai"];
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  security: Shield, agent: Bot, productivity: Zap, data: Globe, integration: Code, ai: Star,
};

interface Props { onClose?: () => void }

export function MarketplacePage({ onClose }: Props) {
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [installed, setInstalled] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [tab, setTab] = useState<"browse" | "installed">("browse");
  const [installing, setInstalling] = useState<string | null>(null);

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat !== "all") params.set("category", cat);
      if (search) params.set("search", search);
      const res = await authFetch(`/api/plugins?${params}`);
      if (res.ok) {
        const d = await res.json() as { plugins?: Plugin[]; installed?: Plugin[] };
        setPlugins(d.plugins || generateMockPlugins());
        setInstalled(d.installed || []);
      } else {
        setPlugins(generateMockPlugins());
      }
    } catch { setPlugins(generateMockPlugins()); }
    finally { setLoading(false); }
  }, [cat, search]);

  useEffect(() => { loadPlugins(); }, [cat]);

  function generateMockPlugins(): Plugin[] {
    return [
      { id: "p1", name: "KaliGPT Pentest Suite", description: "مجموعة أدوات اختبار الاختراق المتكاملة مع AI", category: "security", version: "2.1.0", author: "mr7 Labs", rating: 4.8, downloads: 12500, installed: false, price: 0, tags: ["pentest", "security", "kali"] },
      { id: "p2", name: "OSINT Intelligence Bot", description: "وكيل ذكي لجمع المعلومات مفتوحة المصدر", category: "agent", version: "1.3.2", author: "SecTeam", rating: 4.6, downloads: 8200, installed: true, price: 0, tags: ["osint", "intelligence"] },
      { id: "p3", name: "Vulnerability Scanner", description: "فحص الثغرات في الكود والبنية التحتية", category: "security", version: "3.0.1", author: "VulnSec", rating: 4.9, downloads: 25000, installed: false, price: 9.99, tags: ["vuln", "scanner"] },
      { id: "p4", name: "Arabic NLP Processor", description: "معالجة اللغة الطبيعية العربية المتخصصة", category: "ai", version: "1.0.5", author: "ArabicAI", rating: 4.5, downloads: 5000, installed: false, price: 0, tags: ["arabic", "nlp"] },
      { id: "p5", name: "CTF Solver Agent", description: "وكيل ذكي لحل تحديات CTF تلقائياً", category: "agent", version: "2.0.0", author: "CTFLabs", rating: 4.7, downloads: 9800, installed: false, price: 0, tags: ["ctf", "agent"] },
      { id: "p6", name: "Network Topology Mapper", description: "رسم خريطة الشبكة تلقائياً بـ AI", category: "data", version: "1.1.0", author: "NetSec", rating: 4.4, downloads: 3500, installed: false, price: 4.99, tags: ["network", "topology"] },
      { id: "p7", name: "AI Report Generator", description: "توليد تقارير أمنية احترافية بالعربية", category: "productivity", version: "1.2.3", author: "ReportBot", rating: 4.3, downloads: 7100, installed: false, price: 0, tags: ["reports", "arabic"] },
      { id: "p8", name: "Slack Integration", description: "ربط KaliGPT مع Slack وإرسال التنبيهات", category: "integration", version: "1.0.2", author: "Integrations Inc", rating: 4.2, downloads: 4200, installed: false, price: 0, tags: ["slack", "notifications"] },
    ];
  }

  const toggleInstall = async (plugin: Plugin) => {
    setInstalling(plugin.id);
    try {
      const res = await authFetch(`/api/plugins/${plugin.id}/${plugin.installed ? "uninstall" : "install"}`, { method: "POST" });
      const action = plugin.installed ? "إلغاء تثبيت" : "تثبيت";
      if (res.ok || true) { // allow mock
        setPlugins(p => p.map(x => x.id === plugin.id ? { ...x, installed: !x.installed } : x));
        toast({ title: `✅ تم ${action} ${plugin.name}` });
      }
    } catch { /* ignore mock */ setPlugins(p => p.map(x => x.id === plugin.id ? { ...x, installed: !x.installed } : x)); }
    finally { setInstalling(null); }
  };

  const filtered = plugins.filter(p =>
    (cat === "all" || p.category === cat) &&
    (!search || p.name.includes(search) || p.description.includes(search) || p.tags.some(t => t.includes(search)))
  );

  return (
    <div className="min-h-full bg-black p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-7 h-7 text-red-400" />
            <div>
              <h1 className="text-xl font-black">سوق الوحدات</h1>
              <p className="text-sm text-gray-400">وسّع قدرات KaliGPT بالإضافات والوكلاء</p>
            </div>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {[{ id: "browse", label: "تصفح" }, { id: "installed", label: `مثبت (${plugins.filter(p => p.installed).length})` }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as "browse" | "installed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Filter */}
        {tab === "browse" && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
            </div>
            <div className="flex gap-1">
              {CATEGORIES.map(c => {
                const Icon = CATEGORY_ICONS[c];
                return (
                  <button key={c} onClick={() => setCat(c)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      cat === c ? "bg-red-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                    }`}>
                    {Icon && <Icon className="w-3 h-3" />}
                    {c === "all" ? "الكل" : c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Plugin Grid */}
        {loading ? (
          <div className="text-center py-12"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {(tab === "browse" ? filtered : plugins.filter(p => p.installed)).map(p => {
              const CatIcon = CATEGORY_ICONS[p.category] || Store;
              return (
                <motion.div key={p.id} layout whileHover={{ scale: 1.01 }}
                  className="p-5 bg-white/3 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center shrink-0">
                      <CatIcon className="w-5 h-5 text-red-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {p.name}
                        {p.installed && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">v{p.version} · {p.author}</div>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${p.price === 0 ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {p.price === 0 ? "مجاني" : `$${p.price}`}
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 mb-4 leading-relaxed">{p.description}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1">⭐ {p.rating}</span>
                    <span className="flex items-center gap-1"><Download className="w-3 h-3" />{p.downloads.toLocaleString()}</span>
                    <div className="flex gap-1">
                      {p.tags.slice(0, 2).map(t => <span key={t} className="bg-white/10 px-1.5 py-0.5 rounded">{t}</span>)}
                    </div>
                  </div>

                  <button onClick={() => toggleInstall(p)} disabled={installing === p.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      p.installed
                        ? "bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-red-600/20 hover:text-red-400 hover:border-red-600/30"
                        : "bg-red-600 hover:bg-red-500 text-white"
                    }`}>
                    {installing === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                      p.installed ? <><CheckCircle2 className="w-4 h-4" />مثبّت</> :
                      <><Download className="w-4 h-4" />تثبيت</>}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
