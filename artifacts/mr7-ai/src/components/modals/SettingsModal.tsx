import { FullPageOverlay } from "@/components/FullPageOverlay";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Palette, Languages, Type, Coins, Trash2, Download, Sparkles, Bot, Layers, Brain, Shield, X } from "lucide-react";
import { useStore, ACCENT_OPTIONS, type Settings } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useT, type TranslationKey } from "@/lib/i18n";

type ToggleKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

const TOGGLES: { key: ToggleKey; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { key: "notifications", labelKey: "toggle.notifications", descKey: "toggle.notifications.desc" },
  { key: "sounds", labelKey: "toggle.sounds", descKey: "toggle.sounds.desc" },
  { key: "streaming", labelKey: "toggle.streaming", descKey: "toggle.streaming.desc" },
  { key: "sendOnEnter", labelKey: "toggle.sendOnEnter", descKey: "toggle.sendOnEnter.desc" },
  { key: "rtl", labelKey: "toggle.rtl", descKey: "toggle.rtl.desc" },
  { key: "compact", labelKey: "toggle.compact", descKey: "toggle.compact.desc" },
  { key: "showTokenMeter", labelKey: "toggle.tokenMeter", descKey: "toggle.tokenMeter.desc" },
  { key: "autoTitle", labelKey: "toggle.autoTitle", descKey: "toggle.autoTitle.desc" },
];

const ENGINE_TOGGLES: { key: ToggleKey; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { key: "stmHedge", labelKey: "toggle.stmHedge", descKey: "toggle.stmHedge.desc" },
  { key: "stmDirect", labelKey: "toggle.stmDirect", descKey: "toggle.stmDirect.desc" },
  { key: "stmCuriosity", labelKey: "toggle.stmCuriosity", descKey: "toggle.stmCuriosity.desc" },
  { key: "autoTune", labelKey: "toggle.autoTune", descKey: "toggle.autoTune.desc" },
  { key: "councilFusion", labelKey: "toggle.councilFusion", descKey: "toggle.councilFusion.desc" },
  { key: "councilScoring", labelKey: "toggle.councilScoring", descKey: "toggle.councilScoring.desc" },
  { key: "powerMode", labelKey: "toggle.powerMode", descKey: "toggle.powerMode.desc" },
];

const ADVANCED_TOGGLES: { key: ToggleKey; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { key: "infiniteContext", labelKey: "toggle.infiniteContext", descKey: "toggle.infiniteContext.desc" },
  { key: "deepReasoning", labelKey: "toggle.deepReasoning", descKey: "toggle.deepReasoning.desc" },
  { key: "showReasoningTrace", labelKey: "toggle.showReasoningTrace", descKey: "toggle.showReasoningTrace.desc" },
  { key: "osintAutoAnalyze", labelKey: "toggle.osintAutoAnalyze", descKey: "toggle.osintAutoAnalyze.desc" },
];

export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const { t } = useT();

  function exportAll() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CHAT-GPT-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: t("settings.exported") });
  }

  function clearAll() {
    if (!confirm(t("settings.confirmReset"))) return;
    localStorage.removeItem("CHAT-GPT-ai-state-v2");
    localStorage.removeItem("CHAT-GPT-ai-state-v1");
    location.reload();
  }

  function activateAllEngines() {
    dispatch({
      type: "SET_SETTINGS",
      patch: {
        stmHedge: true, stmDirect: true, stmCuriosity: true,
        autoTune: true, councilFusion: true, councilScoring: true,
        notifications: true, streaming: true, autoTitle: true, showTokenMeter: true,
        powerMode: true,
      },
    });
    toast({ description: t("toast.allEnginesOn") });
  }

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] shrink-0">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-white">{t("settings.title")}</h2>
            <p className="text-[10px] text-[#555]">{t("settings.subtitle")}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white hover:border-[#e21227] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6 max-w-2xl mx-auto w-full">

        {/* Language */}
        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <Languages className="w-3 h-3" /> {t("settings.language")}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(["en", "ar"] as const).map((lng) => (
              <button
                key={lng}
                onClick={() => dispatch({ type: "SET_SETTINGS", patch: { language: lng } })}
                className={`px-3 py-2 rounded-lg border text-[13px] font-semibold transition-colors ${state.settings.language === lng ? "bg-primary/15 border-primary/40 text-primary" : "border-border bg-background/60 hover:bg-accent"}`}
              >
                {lng === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>
        </section>

        {/* Density */}
        <section className="space-y-2 mt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <Type className="w-3 h-3" /> {t("settings.fontSize")}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["compact", "comfortable", "spacious"] as const).map((d) => (
              <button
                key={d}
                onClick={() => dispatch({ type: "SET_SETTINGS", patch: { density: d } })}
                className={`px-3 py-2 rounded-lg border text-[13px] font-semibold transition-colors ${state.settings.density === d ? "bg-primary/15 border-primary/40 text-primary" : "border-border bg-background/60 hover:bg-accent"}`}
              >
                {t(`settings.density.${d}` as TranslationKey)}
              </button>
            ))}
          </div>
        </section>

        {/* Theme accent */}
        <section className="space-y-2 mt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <Palette className="w-3 h-3" /> {t("settings.accent")}
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {ACCENT_OPTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => dispatch({ type: "SET_ACCENT", accent: a.id })}
                className={`relative aspect-square rounded-lg border transition-all ${state.themeAccent === a.id ? "border-foreground scale-105" : "border-border hover:scale-105"}`}
                title={a.label}
                aria-label={a.label}
              >
                <span className={`absolute inset-1 rounded-md ${a.swatch}`} />
              </button>
            ))}
          </div>
        </section>

        {/* AI engines */}
        <section className="mt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-primary" /> {t("settings.engines")}
          </div>
          <button
            onClick={activateAllEngines}
            className="w-full mb-2 px-3 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-[12px] font-bold flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> {t("toast.allEnginesOn")}
          </button>
          <div className="divide-y divide-border">
            {ENGINE_TOGGLES.map((it) => (
              <div key={it.key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t(it.labelKey)}</div>
                  <div className="text-[12px] text-muted-foreground">{t(it.descKey)}</div>
                </div>
                <Switch
                  checked={state.settings[it.key]}
                  onCheckedChange={(v) => dispatch({ type: "SET_SETTINGS", patch: { [it.key]: v } as Partial<Settings> })}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Advanced AI Features */}
        <section className="mt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-1">
            <Brain className="w-3 h-3 text-violet-400" /> {t("agent.title")} / {t("reason.title")} / {t("context.title")} / OSINT
          </div>
          <div className="divide-y divide-border">
            {ADVANCED_TOGGLES.map((it) => (
              <div key={it.key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t(it.labelKey)}</div>
                  <div className="text-[12px] text-muted-foreground">{t(it.descKey)}</div>
                </div>
                <Switch
                  checked={state.settings[it.key]}
                  onCheckedChange={(v) => dispatch({ type: "SET_SETTINGS", patch: { [it.key]: v } as Partial<Settings> })}
                />
              </div>
            ))}
          </div>

          {/* Agent max steps */}
          <div className="py-3 space-y-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  {t("agent.title")} — {t("agent.steps")}
                </div>
                <div className="text-[12px] text-muted-foreground">{t("agent.desc").slice(0, 80)}…</div>
              </div>
              <span className="text-[13px] font-mono font-bold text-amber-400 min-w-[2.5rem] text-right">
                {state.settings.agentMaxSteps}
              </span>
            </div>
            <input
              type="range" min={3} max={20} step={1}
              value={state.settings.agentMaxSteps}
              onChange={(e) => dispatch({ type: "SET_SETTINGS", patch: { agentMaxSteps: Number(e.target.value) } })}
              className="w-full h-1.5 rounded-full appearance-none bg-border accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Context threshold */}
          <div className="py-3 space-y-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  {t("context.title")} — {t("context.threshold")}
                </div>
                <div className="text-[12px] text-muted-foreground">{t("toggle.infiniteContext.desc").slice(0, 80)}…</div>
              </div>
              <span className="text-[13px] font-mono font-bold text-sky-400 min-w-[4rem] text-right">
                {(state.settings.contextThreshold / 1000).toFixed(0)}k tok
              </span>
            </div>
            <input
              type="range" min={10000} max={120000} step={5000}
              value={state.settings.contextThreshold}
              onChange={(e) => dispatch({ type: "SET_SETTINGS", patch: { contextThreshold: Number(e.target.value) } })}
              className="w-full h-1.5 rounded-full appearance-none bg-border accent-sky-400 cursor-pointer"
            />
          </div>
        </section>

        {/* General Toggles */}
        <section className="mt-4">
          <div className="divide-y divide-border">
            {TOGGLES.map((it) => (
              <div key={it.key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t(it.labelKey)}</div>
                  <div className="text-[12px] text-muted-foreground">{t(it.descKey)}</div>
                </div>
                <Switch
                  checked={state.settings[it.key]}
                  onCheckedChange={(v) => dispatch({ type: "SET_SETTINGS", patch: { [it.key]: v } as Partial<Settings> })}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Data */}
        <section className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <Coins className="w-3 h-3" /> {t("settings.data")}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportAll} className="px-3 py-2 rounded-lg border border-border bg-background/60 hover:bg-accent text-[12px] font-semibold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> {t("settings.export")}
            </button>
            <button onClick={clearAll} className="px-3 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-[12px] font-semibold flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> {t("settings.reset")}
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {t("settings.dataSummary", { chats: state.chats.length, memory: state.memory.length, snippets: state.snippets.length })}
          </div>
        </section>
        </div>
      </div>
    </FullPageOverlay>
  );
}
