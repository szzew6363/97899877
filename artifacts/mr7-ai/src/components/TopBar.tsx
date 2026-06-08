import { useEffect, useRef, useState } from "react";
import { Menu, Sparkles, Coins, LayoutGrid, HelpCircle, Search, Zap, Brain, Server, Bot, Hexagon, Shield, Columns3, Crosshair, BarChart2, ChevronLeft, ChevronRight, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ProviderName } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { NotificationsPanel } from "./NotificationsPanel";
import { ThemePopover } from "./ThemePopover";
import { TokensPopover } from "./TokensPopover";
import { AI_MODELS, getModel } from "@/lib/ai-config";
import { tierAtLeast } from "@/lib/subscription";
import { Lock } from "lucide-react";

const PROVIDER_COLORS: Record<string, string> = {
  personal: "#e21227",
  openai: "#10b981",
  anthropic: "#f97316",
  groq: "#f59e0b",
  gemini: "#3b82f6",
  openrouter: "#8b5cf6",
  xai: "#6b7280",
  deepseek: "#06b6d4",
  mistral: "#ec4899",
  custom: "#14b8a6",
};

const QUICK_PROVIDERS: { id: ProviderName; label: string; model: string }[] = [
  { id: "personal", label: "Personal", model: "" },
  { id: "openai", label: "OpenAI", model: "gpt-4o-mini" },
  { id: "anthropic", label: "Anthropic", model: "claude-3-5-haiku-latest" },
  { id: "groq", label: "Groq", model: "llama-3.3-70b-versatile" },
  { id: "gemini", label: "Gemini", model: "gemini-2.0-flash" },
  { id: "openrouter", label: "OpenRouter", model: "meta-llama/llama-3.3-70b-instruct:free" },
];

interface TopBarProps {
  onMenuClick: () => void;
  onOpenPricing: () => void;
  onOpenToolsHub: () => void;
  onOpenHelp: () => void;
  onOpenPersonaEditor: () => void;
  onOpenLocalModel: () => void;
  onOpenAgent: () => void;
  onOpenNexus: () => void;
  onOpenArsenal: () => void;
  onOpenProviderSettings?: () => void;
  onOpenModelCompare?: () => void;
  onOpenNeuralMatrix?: () => void;
  onOpenAnalytics?: () => void;
}

export function TopBar({ onMenuClick, onOpenPricing, onOpenToolsHub, onOpenHelp, onOpenPersonaEditor, onOpenLocalModel, onOpenAgent, onOpenNexus, onOpenArsenal, onOpenProviderSettings, onOpenModelCompare, onOpenNeuralMatrix, onOpenAnalytics }: TopBarProps) {
  const { state, dispatch } = useStore();
  const { t } = useT();
  const { toast } = useToast();
  const powerOn = state.settings.powerMode;

  function togglePower() {
    const next = !powerOn;
    dispatch({ type: "SET_SETTINGS", patch: { powerMode: next } });
    toast({ description: t(next ? "power.activated" : "power.deactivated") });
  }

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);


  // Scrollable right toolbar
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, []);

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const active = getModel(state.activeModel);
  const ActiveIcon = active.icon;

  const filtered = AI_MODELS.filter((m) =>
    m.id.toLowerCase().includes(q.toLowerCase()) || m.desc.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <header className="CHAT-GPT-topbar h-14 flex items-center justify-between px-2 sm:px-3 border-b border-border bg-background/85 backdrop-blur-md sticky top-0 z-30">
      {/* LEFT: menu + model selector */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onMenuClick}
          className="p-2 md:hidden text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          aria-label={t("top.openMenu")}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-card border border-border hover:bg-accent transition-colors"
            aria-label={`${t("top.switchModel")} — ${active.id}`}
          >
            <span className={`w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 ${active.color}`}>
              <ActiveIcon className="w-3.5 h-3.5" />
            </span>
            <span className="hidden sm:block text-[12px] font-semibold max-w-[140px] truncate">{active.id}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-muted-foreground"><path d="m6 9 6 6 6-6" /></svg>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className="absolute top-full left-0 mt-2 w-[320px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={t("top.searchModels")}
                      className="w-full bg-background border border-border rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-primary text-[12px]"
                    />
                  </div>
                </div>
                <div className="p-1.5 space-y-0.5 max-h-[min(75vh,640px)] overflow-y-auto">
                  {filtered.map((m) => {
                    const Icon = m.icon;
                    const isFreeModel = m.id === "CHAT-GPT Fast";
                    const locked = !isFreeModel && !tierAtLeast(state.subscription.tier, "starter");
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          if (locked) {
                            toast({ description: `${m.id} requires Starter plan. Upgrade to unlock all models.` });
                            setOpen(false);
                            onOpenPricing();
                            return;
                          }
                          dispatch({ type: "SET_MODEL", model: m.id });
                          setOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${locked ? "opacity-60 hover:bg-accent/50" : "hover:bg-accent"}`}
                      >
                        <span className={`w-7 h-7 rounded-md border border-border flex items-center justify-center flex-shrink-0 mt-0.5 ${m.color}`}>
                          {locked ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Icon className="w-4 h-4" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-foreground truncate">{m.id}</span>
                            {m.badge && !locked && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">{m.badge}</span>}
                            {locked && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">STARTER+</span>}
                          </span>
                          <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">{m.desc}</span>
                        </span>
                        {state.activeModel === m.id && <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="text-center text-muted-foreground text-[12px] py-6">{t("toolsHub.noResults", { q })}</div>
                  )}
                </div>
                <div className="border-t border-border">
                  <button
                    onClick={() => { onOpenPricing(); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-primary hover:bg-primary/5 transition-colors text-sm font-semibold"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t("top.getMoreTokens")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT: scrollable toolbar with left/right arrows */}
      <div className="flex items-center gap-0.5 flex-1 min-w-0 justify-end">
        {/* Left scroll arrow */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              onClick={() => scrollBy(-160)}
              className="flex-shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="تمرير لليسار"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scrollable buttons area */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Tools Hub */}
          <button
            onClick={onOpenToolsHub}
            className="flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-foreground/90 text-xs font-bold hover:bg-accent transition-colors"
            aria-label={t("top.toolsHub")}
            title={t("top.toolsHub")}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t("top.tools")}</span>
          </button>
          <button
            onClick={onOpenToolsHub}
            className="flex-shrink-0 sm:hidden p-2 text-emerald-400 hover:text-emerald-300 hover:bg-accent rounded-lg transition-colors"
            aria-label={t("top.toolsHub")}
            title={t("top.toolsHub")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* KaliAgent */}
          <button
            onClick={onOpenAgent}
            className="flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all hover:opacity-95"
            style={{ background: "rgba(255,77,77,0.1)", borderColor: "rgba(255,77,77,0.35)", color: "#ff4d4d", boxShadow: "0 0 10px rgba(255,77,77,0.15)" }}
            aria-label="KaliAgent"
            title="KaliAgent — Autonomous AI Agent"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>KaliAgent</span>
          </button>
          <button
            onClick={onOpenAgent}
            className="flex-shrink-0 sm:hidden p-2 rounded-lg transition-colors"
            style={{ color: "#ff4d4d" }}
            aria-label="KaliAgent"
          >
            <Bot className="w-4 h-4" />
          </button>

          {/* NEXUS */}
          <button
            onClick={onOpenNexus}
            className="flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black whitespace-nowrap tracking-wider transition-all hover:opacity-95"
            style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,146,60,0.08) 100%)", borderColor: "rgba(251,191,36,0.45)", color: "#fbbf24", boxShadow: "0 0 14px rgba(251,191,36,0.2)" }}
            aria-label="NEXUS Agent"
            title="NEXUS Agent — 5-Tier Autonomous Super Agent"
          >
            <Hexagon className="w-3.5 h-3.5" />
            <span>NEXUS</span>
          </button>
          <button
            onClick={onOpenNexus}
            className="flex-shrink-0 sm:hidden p-2 rounded-lg transition-colors"
            style={{ color: "#fbbf24" }}
            aria-label="NEXUS Agent"
          >
            <Hexagon className="w-4 h-4" />
          </button>

          {/* Arsenal Hub */}
          <button
            onClick={onOpenArsenal}
            className="flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black whitespace-nowrap tracking-wider transition-all hover:opacity-95"
            style={{ background: "linear-gradient(135deg, rgba(226,18,39,0.12) 0%, rgba(180,0,20,0.06) 100%)", borderColor: "rgba(226,18,39,0.4)", color: "#e21227", boxShadow: "0 0 14px rgba(226,18,39,0.15)" }}
            aria-label="Arsenal Hub"
            title="Arsenal Hub — Launch AI Modules"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Arsenal</span>
          </button>
          <button
            onClick={onOpenArsenal}
            className="flex-shrink-0 sm:hidden p-2 rounded-lg transition-colors"
            style={{ color: "#e21227" }}
            aria-label="Arsenal Hub"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Neural Matrix */}
          {onOpenNeuralMatrix && (
            <>
              <button
                onClick={onOpenNeuralMatrix}
                className="flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all hover:opacity-95"
                style={{ background: "rgba(226,18,39,0.1)", borderColor: "rgba(226,18,39,0.4)", color: "#e21227", boxShadow: "0 0 12px rgba(226,18,39,0.2)" }}
                aria-label="Neural Matrix"
                title="Neural Matrix"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Neural Matrix</span>
              </button>
              <button
                onClick={onOpenNeuralMatrix}
                className="flex-shrink-0 sm:hidden p-2 rounded-lg transition-colors"
                style={{ color: "#e21227" }}
                aria-label="Neural Matrix"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Model Compare */}
          {onOpenModelCompare && (
            <>
              <button
                onClick={onOpenModelCompare}
                className="flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all hover:opacity-95"
                style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.4)", color: "#818cf8", boxShadow: "0 0 10px rgba(99,102,241,0.15)" }}
                aria-label="مقارنة النماذج"
                title="مقارنة 3 نماذج جنباً إلى جنب"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Compare</span>
              </button>
              <button
                onClick={onOpenModelCompare}
                className="flex-shrink-0 sm:hidden p-2 rounded-lg transition-colors"
                style={{ color: "#818cf8" }}
                aria-label="مقارنة النماذج"
              >
                <Columns3 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Persona Editor */}
          <button
            onClick={onOpenPersonaEditor}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              state.settings.activePersonaPreset !== "default" || state.settings.customSystemPrompt
                ? "text-primary hover:text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            aria-label="AI Persona Editor"
            title="AI Persona / System Prompt Editor"
          >
            <Brain className="w-4 h-4" />
          </button>

          {/* Quick Provider Chip — clicks directly into full settings */}
          {onOpenProviderSettings && (
            <button
              onClick={onOpenProviderSettings}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-all ${
                state.activeProvider && state.activeProvider !== "personal"
                  ? "bg-violet-500/10 border-violet-500/30 text-violet-300 hover:border-violet-400/60 hover:bg-violet-500/15"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border/80"
              }`}
              title="إعدادات مزود الذكاء الاصطناعي"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: PROVIDER_COLORS[state.activeProvider ?? "personal"] ?? "#6b7280" }}
              />
              <span className="hidden sm:block uppercase font-bold tracking-wide">
                {(state.activeProvider ?? "personal").slice(0, 8)}
              </span>
              {state.activeProviderModel && (
                <span className="hidden md:block text-muted-foreground/60 truncate max-w-[64px]">
                  /{state.activeProviderModel.split("/").pop()?.slice(0, 12)}
                </span>
              )}
            </button>
          )}

          {/* Local Model */}
          <button
            onClick={onOpenLocalModel}
            className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
              state.settings.useLocalModel
                ? "text-green-400 hover:text-green-300 hover:bg-green-400/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            aria-label="Local Model Settings"
            title={state.settings.useLocalModel ? `Local: ${state.settings.localModel}` : "Connect Local Model (Ollama / LM Studio)"}
          >
            <Server className="w-4 h-4" />
          </button>

          {/* Power Mode */}
          <button
            onClick={togglePower}
            className={`flex-shrink-0 flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all ${
              powerOn
                ? "bg-primary/15 border-primary/60 text-primary shadow-[0_0_18px_rgba(226,18,39,0.45)] animate-pulse"
                : "bg-card border-border text-muted-foreground hover:text-primary hover:border-primary/40"
            }`}
            aria-label={t("power.title")}
            title={t(powerOn ? "power.tooltipOn" : "power.tooltipOff")}
          >
            <Zap className={`w-3.5 h-3.5 ${powerOn ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">{t("power.title")}</span>
            {powerOn && <span className="text-[9px] font-mono px-1 rounded bg-primary/20">ON</span>}
          </button>

          {/* Buy Tokens */}
          <button
            onClick={onOpenPricing}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-xs font-bold whitespace-nowrap hover:opacity-95 transition-opacity shadow-[0_0_18px_rgba(217,70,239,0.35)]"
            aria-label={t("top.buyTokens")}
            title={t("top.buyTokens")}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("top.buyTokens")}</span>
          </button>

          {/* Analytics */}
          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors"
              aria-label="Analytics Dashboard"
              title="Analytics"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          )}

          {/* Help */}
          <button
            onClick={onOpenHelp}
            className="flex-shrink-0 hidden sm:flex p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            aria-label={t("top.shortcuts")}
            title={t("top.shortcuts")}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <NotificationsPanel />
          <ThemePopover />
          <TokensPopover onUpgrade={onOpenPricing} />
        </div>

        {/* Right scroll arrow */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              onClick={() => scrollBy(160)}
              className="flex-shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="تمرير لليمين"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
