import { useState } from "react";
import { Plus, Search, Brain, Bookmark, ArrowLeftRight, LayoutGrid, Settings, HelpCircle, Zap, ChevronRight, ChevronLeft, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

export type DockHandlers = {
  onNewChat: () => void;
  onSearch: () => void;
  onMemory: () => void;
  onBookmarks: () => void;
  onCompare: () => void;
  onTools: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onAgent: () => void;
};

const ITEM_COLORS: Record<string, string> = {
  new:       "#e21227",
  agent:     "#ff4d4d",
  search:    "#3b82f6",
  memory:    "#a78bfa",
  bookmarks: "#f59e0b",
  compare:   "#22c55e",
  tools:     "#10b981",
  settings:  "#64748b",
  help:      "#06b6d4",
};

export function FloatingActionDock(props: DockHandlers) {
  const { state, dispatch } = useStore();
  const { t, rtl } = useT();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const powerOn = state.settings.powerMode;

  function togglePower() {
    const next = !powerOn;
    dispatch({ type: "SET_SETTINGS", patch: { powerMode: next } });
    toast({ description: t(next ? "power.activated" : "power.deactivated") });
  }

  const items: { key: string; icon: typeof Plus; labelKey: Parameters<typeof t>[0]; onClick: () => void }[] = [
    { key: "new",        icon: Plus,           labelKey: "dock.newChat",   onClick: props.onNewChat   },
    { key: "agent",      icon: Bot,            labelKey: "dock.tools",     onClick: props.onAgent     },
    { key: "search",     icon: Search,         labelKey: "dock.search",    onClick: props.onSearch    },
    { key: "memory",     icon: Brain,          labelKey: "dock.memory",    onClick: props.onMemory    },
    { key: "bookmarks",  icon: Bookmark,       labelKey: "dock.bookmarks", onClick: props.onBookmarks },
    { key: "compare",    icon: ArrowLeftRight, labelKey: "dock.compare",   onClick: props.onCompare   },
    { key: "tools",      icon: LayoutGrid,     labelKey: "dock.tools",     onClick: props.onTools     },
    { key: "settings",   icon: Settings,       labelKey: "dock.settings",  onClick: props.onSettings  },
    { key: "help",       icon: HelpCircle,     labelKey: "dock.help",      onClick: props.onHelp      },
  ];

  const sideClass = rtl ? "left-2" : "right-2";

  return (
    <div className={`fixed ${sideClass} top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-stretch gap-1.5 select-none`}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        aria-label={collapsed ? t("dock.expand") : t("dock.collapse")}
        title={collapsed ? t("dock.expand") : t("dock.collapse")}
        style={{
          width: "36px", height: "28px", borderRadius: "8px",
          background: "rgba(10,10,18,0.9)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          color: "rgba(255,255,255,0.3)",
          transition: "all 0.2s ease",
        }}
      >
        {collapsed
          ? (rtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />)
          : (rtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: rtl ? -20 : 20, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: rtl ? -20 : 20, scale: 0.92 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "stretch",
              gap: "5px",
              background: "linear-gradient(180deg, rgba(8,8,16,0.97) 0%, rgba(10,10,20,0.97) 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "8px 6px",
              backdropFilter: "blur(24px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(226,18,39,0.06), 0 0 32px rgba(226,18,39,0.03)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top scan line accent */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.5) 50%, transparent)",
              pointerEvents: "none",
            }} />

            {/* Power button */}
            <div style={{ position: "relative" }}>
              {powerOn && (
                <>
                  {[1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, ease: "easeOut", delay: i * 0.4 }}
                      style={{
                        position: "absolute", inset: 0, borderRadius: "12px",
                        border: "1px solid rgba(226,18,39,0.5)",
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                </>
              )}
              <button
                onClick={togglePower}
                title={t(powerOn ? "power.tooltipOn" : "power.tooltipOff")}
                aria-label={t("power.title")}
                style={{
                  position: "relative",
                  width: "36px", height: "36px", borderRadius: "12px",
                  border: powerOn ? "1px solid rgba(226,18,39,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: powerOn
                    ? "linear-gradient(135deg, rgba(226,18,39,0.2), rgba(160,10,26,0.12))"
                    : "rgba(255,255,255,0.03)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: powerOn ? "0 0 20px rgba(226,18,39,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
                  transition: "all 0.3s ease",
                  color: powerOn ? "#e21227" : "rgba(255,255,255,0.3)",
                }}
              >
                <Zap className={`w-4 h-4 ${powerOn ? "fill-current" : ""}`} />
                {powerOn && (
                  <span style={{
                    position: "absolute", top: "-2px", right: "-2px",
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: "#e21227", border: "1.5px solid rgba(8,8,16,0.9)",
                    boxShadow: "0 0 6px #e21227",
                    animation: "neonFlicker 2s ease-in-out infinite",
                  }} />
                )}
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />

            {/* Action items */}
            {items.map((it) => {
              const Icon = it.icon;
              const color = ITEM_COLORS[it.key] ?? "rgba(255,255,255,0.3)";
              const isHovered = hovered === it.key;

              return (
                <motion.button
                  key={it.key}
                  onClick={it.onClick}
                  onMouseEnter={() => setHovered(it.key)}
                  onMouseLeave={() => setHovered(null)}
                  title={it.key === "agent" ? "KaliAgent — Autonomous AI" : t(it.labelKey)}
                  aria-label={it.key === "agent" ? "KaliAgent" : t(it.labelKey)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  style={{
                    width: "36px", height: "36px", borderRadius: "11px",
                    border: isHovered ? `1px solid ${color}35` : "1px solid transparent",
                    background: isHovered
                      ? `linear-gradient(135deg, ${color}14, ${color}08)`
                      : "rgba(255,255,255,0.02)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    color: isHovered ? color : "rgba(255,255,255,0.3)",
                    boxShadow: isHovered ? `0 0 16px ${color}25, inset 0 1px 0 rgba(255,255,255,0.06)` : "none",
                    transition: "color 0.2s ease, background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Shimmer on hover */}
                  {isHovered && (
                    <motion.div
                      initial={{ x: "-100%", opacity: 0 }}
                      animate={{ x: "200%", opacity: [0, 0.3, 0] }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{
                        position: "absolute", top: 0, left: 0,
                        width: "50%", height: "100%",
                        background: `linear-gradient(90deg, transparent, ${color}20, transparent)`,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  <Icon style={{ width: "16px", height: "16px" }} />
                </motion.button>
              );
            })}

            {/* Bottom scan line accent */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2) 50%, transparent)",
              pointerEvents: "none",
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
