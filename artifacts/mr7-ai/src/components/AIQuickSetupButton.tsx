import { useState, useCallback, useEffect } from "react";
import { Wand2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ProviderName } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const KEY_PREFIX = "mr7-ai-p-key-";
const URL_PREFIX = "mr7-ai-p-url-";

interface ProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  bestModel: string;
  bestModelLabel: string;
  providerName: ProviderName;
}

const PROVIDER_PRIORITY: ProviderConfig[] = [
  { id: "groq",       name: "Groq",       baseURL: "https://api.groq.com/openai/v1",                          bestModel: "llama-3.3-70b-versatile",        bestModelLabel: "Llama 3.3 70B",     providerName: "groq"       },
  { id: "openai",     name: "OpenAI",     baseURL: "https://api.openai.com/v1",                               bestModel: "gpt-4o",                         bestModelLabel: "GPT-4o",            providerName: "openai"     },
  { id: "anthropic",  name: "Anthropic",  baseURL: "https://api.anthropic.com/v1",                            bestModel: "claude-sonnet-4-5",              bestModelLabel: "Claude Sonnet 4.5", providerName: "anthropic"  },
  { id: "gemini",     name: "Gemini",     baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", bestModel: "gemini-2.5-flash",               bestModelLabel: "Gemini 2.5 Flash",  providerName: "gemini"     },
  { id: "openrouter", name: "OpenRouter", baseURL: "https://openrouter.ai/api/v1",                            bestModel: "deepseek/deepseek-chat-v3-0324", bestModelLabel: "DeepSeek V3",       providerName: "openrouter" },
  { id: "deepseek",   name: "DeepSeek",   baseURL: "https://api.deepseek.com/v1",                             bestModel: "deepseek-chat",                  bestModelLabel: "DeepSeek V3",       providerName: "personal"   },
  { id: "xai",        name: "xAI Grok",   baseURL: "https://api.x.ai/v1",                                    bestModel: "grok-3-mini",                    bestModelLabel: "Grok 3 Mini",       providerName: "personal"   },
  { id: "mistral",    name: "Mistral",    baseURL: "https://api.mistral.ai/v1",                               bestModel: "mistral-large-latest",           bestModelLabel: "Mistral Large",     providerName: "personal"   },
];

type Phase = "idle" | "scanning" | "done" | "fail";

export function AIQuickSetupButton() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");

  const run = useCallback(async () => {
    if (phase === "scanning") return;
    setPhase("scanning");

    try {
      // 1. Check server-side configured providers
      let matched: ProviderConfig | null = null;
      try {
        const res = await fetch("/api/providers");
        if (res.ok) {
          const data = (await res.json()) as { providers?: { id: string; available: boolean }[] };
          for (const p of PROVIDER_PRIORITY) {
            if (data.providers?.find((sp) => sp.id === p.id && sp.available)) {
              matched = p;
              break;
            }
          }
        }
      } catch { /* continue */ }

      if (matched) {
        applyProvider(matched);
        toast({ description: `تم الإعداد التلقائي — ${matched.name} · ${matched.bestModelLabel}` });
        return;
      }

      // 2. Check personalApiKey already in settings
      const existingKey = state.settings.personalApiKey?.trim();
      if (existingKey && existingKey.length > 10) {
        dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true, showTokenMeter: true } });
        dispatch({ type: "SET_PROVIDER", provider: "personal", providerModel: "gpt-4o" });
        setPhase("done");
        toast({ description: "تم الإعداد التلقائي — مفتاحك الشخصي المحفوظ" });
        setTimeout(() => setPhase("idle"), 2500);
        return;
      }

      // 3. Scan localStorage for stored provider keys
      let localMatch: (ProviderConfig & { key: string; url: string }) | null = null;
      for (const p of PROVIDER_PRIORITY) {
        const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
        if (key && key.length > 10) {
          const url = localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL;
          localMatch = { ...p, key, url };
          break;
        }
      }

      if (localMatch) {
        dispatch({
          type: "SET_SETTINGS",
          patch: {
            personalApiKey: localMatch.key,
            personalApiBaseURL: localMatch.url,
            streaming: true,
            autoTitle: true,
            showTokenMeter: true,
          },
        });
        dispatch({ type: "SET_PROVIDER", provider: "personal", providerModel: localMatch.bestModel });
        setPhase("done");
        toast({ description: `تم الإعداد التلقائي — ${localMatch.name} · ${localMatch.bestModelLabel}` });
        setTimeout(() => setPhase("idle"), 2500);
        return;
      }

      // 4. Nothing found — inform user without opening any modal
      setPhase("fail");
      setTimeout(() => setPhase("idle"), 2000);
      toast({
        description: "لم يُعثر على مزوّد — أدخل مفتاح API من إعدادات المزود في الشريط الجانبي",
        variant: "destructive",
      });

    } catch {
      setPhase("fail");
      setTimeout(() => setPhase("idle"), 2000);
    }

    function applyProvider(p: ProviderConfig, overrideKey?: string, overrideURL?: string) {
      const patch: Record<string, unknown> = { streaming: true, autoTitle: true, showTokenMeter: true };
      if (overrideKey)  patch.personalApiKey     = overrideKey;
      if (overrideURL)  patch.personalApiBaseURL  = overrideURL;
      dispatch({ type: "SET_SETTINGS", patch: patch as Parameters<typeof dispatch>[0] extends { type: "SET_SETTINGS"; patch: infer T } ? T : never });
      dispatch({ type: "SET_PROVIDER", provider: p.providerName, providerModel: p.bestModel });
      setPhase("done");
      setTimeout(() => setPhase("idle"), 2500);
    }
  }, [phase, state.settings.personalApiKey, dispatch, toast]);

  // Listen for keyboard shortcut event: Ctrl+Shift+A
  useEffect(() => {
    function onTrigger() { run(); }
    window.addEventListener("kali:trigger-auto-setup", onTrigger);
    return () => window.removeEventListener("kali:trigger-auto-setup", onTrigger);
  }, [run]);

  const isScanning = phase === "scanning";
  const isDone     = phase === "done";
  const isFail     = phase === "fail";

  return (
    <button
      onClick={run}
      disabled={isScanning}
      className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all hover:scale-105 active:scale-95"
      style={{
        background:  isDone ? "rgba(34,197,94,0.12)"  : isFail ? "rgba(239,68,68,0.12)"  : "rgba(226,18,39,0.08)",
        border:      isDone ? "1px solid rgba(34,197,94,0.45)" : isFail ? "1px solid rgba(239,68,68,0.45)" : "1px solid rgba(226,18,39,0.3)",
        color:       isDone ? "#22c55e" : isFail ? "#ef4444" : "#e21227",
        boxShadow:   isDone ? "0 0 14px rgba(34,197,94,0.2)" : isFail ? "0 0 14px rgba(239,68,68,0.2)" : "0 0 10px rgba(226,18,39,0.1)",
        cursor:      isScanning ? "wait" : "pointer",
      }}
      aria-label="إعداد الذكاء الاصطناعي تلقائياً"
      title="AUTO — Ctrl+Shift+A — يكتشف أفضل مزوّد ونموذج ويفعّل الإعدادات المثلى"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isScanning ? (
          <motion.span key="spin" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </motion.span>
        ) : isDone ? (
          <motion.span key="done" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </motion.span>
        ) : isFail ? (
          <motion.span key="fail" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}>
            <AlertCircle className="w-3.5 h-3.5" />
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}>
            <Wand2 className="w-3.5 h-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
      <span className="hidden sm:inline">
        {isScanning ? "جاري..." : isDone ? "جاهز" : isFail ? "فشل" : "AUTO"}
      </span>
    </button>
  );
}
