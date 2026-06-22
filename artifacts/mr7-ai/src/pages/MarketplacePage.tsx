/**
 * MarketplacePage — 3D Holographic Plugin Marketplace
 * Browse plugins · install · ratings · categories · featured cards
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, X, Search, Star, Download, Check, Zap, Shield, Brain, Code2, Globe, Lock, RefreshCw, Filter, Package, ChevronRight } from "lucide-react";

interface Plugin { id: string; name: string; description: string; author: string; category: string; rating: number; reviews: number; downloads: number; price: "free" | number; icon: string; color: string; tags: string[]; installed: boolean; featured?: boolean }

const CATEGORIES = ["الكل", "أمن", "OSINT", "تحليل", "أتمتة", "تكاملات", "تقارير", "تشفير"];
const MOCK_PLUGINS: Plugin[] = [
  { id: "1", name: "CVE Hunter Pro", description: "بحث تلقائي عن ثغرات CVE مع تحليل الأثر والتوصيات الفورية", author: "mr7security", category: "أمن", rating: 4.9, reviews: 234, downloads: 8920, price: "free", icon: "🔍", color: "#e21227", tags: ["CVE", "vulnerability", "scanner"], installed: true, featured: true },
  { id: "2", name: "Dark Web Crawler", description: "زحف آمن لمواقع .onion واستخلاص المعلومات الاستخباراتية", author: "mr7labs", category: "OSINT", rating: 4.7, reviews: 156, downloads: 5430, price: 29, icon: "🌐", color: "#8b5cf6", tags: ["darkweb", "OSINT", "tor"], installed: false, featured: true },
  { id: "3", name: "AI Report Generator", description: "توليد تقارير اختبار الاختراق PDF احترافية بالذكاء الاصطناعي", author: "pentestai", category: "تقارير", rating: 4.8, reviews: 312, downloads: 12100, price: "free", icon: "📄", color: "#3b82f6", tags: ["report", "PDF", "pentest"], installed: true, featured: true },
  { id: "4", name: "Network Topology 3D", description: "رسم بياني ثلاثي الأبعاد لطبولوجيا الشبكة مع اكتشاف الأجهزة", author: "netvis", category: "تحليل", rating: 4.6, reviews: 89, downloads: 3200, price: 15, icon: "🕸️", color: "#06b6d4", tags: ["network", "topology", "3D"], installed: false },
  { id: "5", name: "Crypto Vault", description: "إدارة المفاتيح التشفيرية وتشفير الملفات بخوارزميات متعددة", author: "cryptolab", category: "تشفير", rating: 4.5, reviews: 67, downloads: 2800, price: "free", icon: "🔐", color: "#10b981", tags: ["encryption", "keys", "AES"], installed: false },
  { id: "6", name: "OSINT Aggregator", description: "تجميع المعلومات من 50+ مصدر OSINT في تقرير موحد", author: "mr7osint", category: "OSINT", rating: 4.9, reviews: 445, downloads: 18900, price: 49, icon: "🎯", color: "#f59e0b", tags: ["OSINT", "recon", "aggregator"], installed: false, featured: true },
  { id: "7", name: "Payload Crafter", description: "توليد حمولات مخصصة لاختبار WAF والتحايل على الحماية", author: "redteamers", category: "أمن", rating: 4.4, reviews: 178, downloads: 7600, price: 39, icon: "💣", color: "#ef4444", tags: ["payload", "WAF", "bypass"], installed: false },
  { id: "8", name: "Slack Security Bot", description: "تكامل مع Slack لإرسال تنبيهات الأمان الفورية للفريق", author: "integrations_hub", category: "تكاملات", rating: 4.3, reviews: 92, downloads: 4100, price: "free", icon: "🤖", color: "#6b7280", tags: ["slack", "alerts", "integration"], installed: true },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <div key={s} className={`w-2.5 h-2.5 ${s <= Math.round(rating) ? "text-amber-400" : "text-zinc-700"}`}>★</div>
      ))}
      <span className="text-[10px] text-zinc-500 mr-1">{rating}</span>
    </div>
  );
}

function fmtNum(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }

interface Props { onClose?: () => void }

export function MarketplacePage({ onClose }: Props) {
  const [plugins, setPlugins] = useState<Plugin[]>(MOCK_PLUGINS);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("الكل");
  const [installing, setInstalling] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  const install = useCallback(async (id: string) => {
    setInstalling(id);
    await new Promise(r => setTimeout(r, 1200));
    setPlugins(p => p.map(x => x.id === id ? { ...x, installed: !x.installed } : x));
    setInstalling(null);
  }, []);

  const filtered = plugins.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.includes(search) || p.tags.some(t => t.includes(search));
    const matchCat = cat === "الكل" || p.category === cat;
    const matchPrice = priceFilter === "all" || (priceFilter === "free" ? p.price === "free" : p.price !== "free");
    return matchSearch && matchCat && matchPrice;
  });

  const featured = filtered.filter(p => p.featured);
  const rest = filtered.filter(p => !p.featured);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 15%,rgba(139,92,246,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><Store className="w-5 h-5 text-purple-400" /></div>
          <div><h2 className="text-base font-bold text-white">سوق الإضافات — Plugin Marketplace</h2><p className="text-xs text-zinc-600">{plugins.length} إضافة · {plugins.filter(p => p.installed).length} مثبتة</p></div>
        </div>
        {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
      </div>
      {/* Filters */}
      <div className="flex-shrink-0 border-b border-white/5 px-5 py-2.5 space-y-2.5">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الإضافات..."
            className="w-full bg-white/5 border border-white/8 rounded-xl pr-9 pl-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/30" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-all ${cat === c ? "bg-purple-500/20 border border-purple-500/25 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>{c}</button>
          ))}
          <div className="border-r border-white/8 mx-1" />
          {[["all", "الكل"], ["free", "مجاني"], ["paid", "مدفوع"]].map(([v, l]) => (
            <button key={v} onClick={() => setPriceFilter(v as "all" | "free" | "paid")} className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-all ${priceFilter === v ? "bg-amber-500/20 border border-amber-500/25 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-5">
        {/* Featured */}
        {featured.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400" />مميز</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featured.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                  className="p-4 rounded-2xl border" style={{ background: `${p.color}08`, borderColor: `${p.color}20` }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl leading-none">{p.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{p.name}</p>
                      <p className="text-[10px] text-zinc-500">{p.author}</p>
                      <Stars rating={p.rating} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: p.color }}>{p.price === "free" ? "مجاني" : `$${p.price}`}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600 flex items-center gap-0.5"><Download className="w-2.5 h-2.5" />{fmtNum(p.downloads)}</span>
                    <button onClick={() => install(p.id)} disabled={installing === p.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${p.installed ? "bg-green-500/15 border border-green-500/20 text-green-400" : "text-white"}`}
                      style={!p.installed ? { backgroundColor: `${p.color}25`, borderColor: `${p.color}40`, border: "1px solid", color: p.color } : {}}>
                      {installing === p.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : p.installed ? <><Check className="w-3 h-3" />مثبت</> : <><Download className="w-3 h-3" />تثبيت</>}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {/* All plugins */}
        {rest.length > 0 && (
          <div>
            {featured.length > 0 && <p className="text-xs font-semibold text-zinc-400 mb-3">جميع الإضافات</p>}
            <div className="space-y-2">
              {rest.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white/3 border border-white/6 hover:border-white/10 transition-colors">
                  <div className="text-xl leading-none flex-shrink-0">{p.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/6 text-zinc-500">{p.category}</span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{p.description}</p>
                    <div className="flex items-center gap-3 mt-0.5"><Stars rating={p.rating} /><span className="text-[10px] text-zinc-600">{fmtNum(p.downloads)} تنزيل</span></div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-zinc-400">{p.price === "free" ? "مجاني" : `$${p.price}`}</span>
                    <button onClick={() => install(p.id)} disabled={installing === p.id}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${p.installed ? "bg-green-500/15 border border-green-500/20 text-green-400" : "bg-purple-500/20 border border-purple-500/25 text-purple-400 hover:bg-purple-500/30"}`}>
                      {installing === p.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : p.installed ? <><Check className="w-3 h-3" />مثبت</> : <><Download className="w-3 h-3" />تثبيت</>}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-600">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">لا توجد إضافات مطابقة للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
}
