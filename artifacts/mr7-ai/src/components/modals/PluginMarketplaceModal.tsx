import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Package, Download, Trash2, Star, Shield, Globe, Zap, Bell,
  Settings, ChevronRight, Loader2, CheckCircle2, Lock, Search,
  Filter, RefreshCw
} from "lucide-react";
import { authFetch } from "@/lib/auth";

interface Plugin {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  version: string;
  author: string;
  requiredTier: string;
  tags: string[];
  installed?: boolean;
  isActive?: boolean;
}

interface Props { open: boolean; onClose: () => void; }

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  osint: Globe, scanner: Shield, exploitation: Zap, notification: Bell, workflow: Settings, ai: Star, malware: Shield,
};
const TIER_COLORS = { free: "#22c55e", pro: "#6366f1", enterprise: "#f59e0b" };
const CATEGORY_COLORS: Record<string, string> = {
  osint: "#3b82f6", scanner: "#e21227", exploitation: "#ef4444", notification: "#22c55e", workflow: "#8b5cf6", ai: "#f59e0b", malware: "#f97316",
};

export function PluginMarketplaceModal({ open, onClose }: Props) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [installed, setInstalled] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"marketplace" | "installed">("marketplace");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [installing, setInstalling] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const [mktRes, instRes] = await Promise.all([
        fetch("/api/plugins"),
        authFetch("/api/plugins/installed"),
      ]);
      if (mktRes.ok) { const d = await mktRes.json() as { plugins: Plugin[] }; setPlugins(d.plugins); }
      if (instRes.ok) { const d = await instRes.json() as { plugins: Plugin[] }; setInstalled(d.plugins); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) fetchPlugins(); }, [open, fetchPlugins]);

  const install = async (pluginId: string) => {
    setInstalling(pluginId);
    setMsg(null);
    try {
      const res = await authFetch(`/api/plugins/${pluginId}/install`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setMsg(d.error ?? "Failed to install");
      } else {
        setMsg("✅ تم تثبيت الإضافة بنجاح!");
        await fetchPlugins();
      }
    } finally {
      setInstalling(null);
    }
  };

  const uninstall = async (pluginId: string) => {
    setInstalling(pluginId);
    try {
      await authFetch(`/api/plugins/${pluginId}`, { method: "DELETE" });
      await fetchPlugins();
    } finally {
      setInstalling(null);
    }
  };

  const isInstalled = (id: string) => installed.some(p => p.id === id);
  const categories = ["all", ...Array.from(new Set(plugins.map(p => p.category)))];

  const filtered = plugins.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.includes(search) || p.tags.some(t => t.includes(search.toLowerCase()));
    const matchCat = catFilter === "all" || p.category === catFilter;
    return matchSearch && matchCat;
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
        <motion.div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-red-900/40 bg-[#080808] shadow-[0_0_80px_rgba(226,18,39,0.1)] flex flex-col"
          initial={{ scale: 0.94, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="font-bold text-white text-base">Plugin Marketplace</div>
                <div className="text-xs text-zinc-500 font-mono">{plugins.length} إضافة متاحة • {installed.length} مثبتة</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchPlugins} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Tabs + Search */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {(["marketplace", "installed"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"}`}>
                  {t === "marketplace" ? "المتجر" : `المثبتة (${installed.length})`}
                </button>
              ))}
            </div>
            {tab === "marketplace" && (
              <>
                <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 h-9">
                  <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="ابحث في الإضافات..." dir="rtl"
                    className="bg-transparent text-sm text-white flex-1 outline-none" />
                </div>
                <div className="flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-zinc-500" />
                  <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none">
                    {categories.map(c => <option key={c} value={c}>{c === "all" ? "الكل" : c}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Message */}
          {msg && (
            <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs ${msg.startsWith("✅") ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {msg}
            </div>
          )}

          {/* Plugin grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
              </div>
            )}

            {!loading && tab === "marketplace" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map(p => {
                  const installed_ = isInstalled(p.id);
                  const Cat = CATEGORY_ICONS[p.category] ?? Package;
                  const catColor = CATEGORY_COLORS[p.category] ?? "#888";
                  const tierColor = TIER_COLORS[p.requiredTier as keyof typeof TIER_COLORS] ?? "#888";
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white/3 border border-white/8 hover:border-white/15 rounded-xl p-4 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${catColor}15`, border: `1px solid ${catColor}30` }}>
                          {p.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-white">{p.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono border" style={{ color: tierColor, background: `${tierColor}15`, borderColor: `${tierColor}30` }}>
                              {p.requiredTier}
                            </span>
                            {installed_ && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">✓ مثبت</span>}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{p.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] text-zinc-600 font-mono">v{p.version}</span>
                            <div className="flex gap-1 flex-wrap">
                              {p.tags.slice(0, 3).map(t => (
                                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-500">{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        {installed_ ? (
                          <button onClick={() => uninstall(p.id)} disabled={installing === p.id}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all">
                            {installing === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            إلغاء التثبيت
                          </button>
                        ) : (
                          <button onClick={() => install(p.id)} disabled={installing === p.id}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_10px_rgba(226,18,39,0.3)]">
                            {installing === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            تثبيت <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-16 text-zinc-600 gap-3">
                    <Package className="w-12 h-12 opacity-30" />
                    <span className="text-sm">لا توجد إضافات تطابق البحث</span>
                  </div>
                )}
              </div>
            )}

            {!loading && tab === "installed" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {installed.length === 0 && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-16 text-zinc-600 gap-3">
                    <Package className="w-12 h-12 opacity-30" />
                    <span className="text-sm">لا توجد إضافات مثبتة</span>
                    <button onClick={() => setTab("marketplace")} className="text-xs text-red-400 underline">تصفح المتجر</button>
                  </div>
                )}
                {installed.map(p => (
                  <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white/3 border border-green-500/15 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{p.icon}</span>
                      <span className="font-semibold text-sm text-white">{p.name}</span>
                      <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>
                    <div className="flex justify-end mt-3">
                      <button onClick={() => uninstall(p.id)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                        <Trash2 className="w-3 h-3" /> إلغاء التثبيت
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
