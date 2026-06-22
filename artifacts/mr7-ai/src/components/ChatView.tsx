import { useEffect, useRef, useState } from "react";
import { useStore, useActiveChat, type CouncilPayload, type CouncilSeatState, type GodmodePayload, type GodmodeChampState } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ShareModal } from "./modals/ShareModal";
import { VoiceChatModal } from "./modals/VoiceChatModal";
import { VisionCaptureModal } from "./modals/VisionCaptureModal";
import { MalwareToolsModal } from "./modals/MalwareToolsModal";
import { ShellGeneratorModal } from "./modals/ShellGeneratorModal";
import { DarkWebSearchModal } from "./modals/DarkWebSearchModal";
import { OnboardingTourModal, useTourShouldShow } from "./modals/OnboardingTourModal";
import { WhatsNewModal, useWhatsNewShouldShow } from "./modals/WhatsNewModal";
import { COUNCIL_BRAIN_META } from "@/lib/council-brains";
import { applyStm, activeCount as activeStmCount } from "@/lib/stm";
import { applyToTriggers, transform, type Technique, type Intensity } from "@/lib/parseltongue";
import { useT } from "@/lib/i18n";
import { tierAtLeast } from "@/lib/subscription";
import { NeuralPulseBackground } from "./NeuralPulseBackground";
import { FuturisticBackground3D } from "./FuturisticBackground3D";
import { QuantumVoidBackground3D } from "./QuantumVoidBackground3D";
import { NeuralStreamHUD } from "./NeuralStreamHUD";
import { useStreamMetrics } from "@/hooks/useStreamMetrics";
import { FloatingNetworkPanel } from "./FloatingNetworkPanel";
import { parseOrchestratorCommands, executeOrchestratorCommand, type OrchestratorCmd } from "@/lib/agent-orchestrator";
import { streamChat, streamLocalChatViaProxy, streamCouncil, streamGodmode, autoTune, generateTitle, translateText, enhancePrompt, estimateTokens, streamAgent, compressContext, analyzeOsintFile, type ChatMessage, type AgentEvent } from "@/lib/chat-client";
import { DEFAULT_COUNCIL_CONFIG, FUSION_COUNCIL_CONFIG, DEBATE_COUNCIL_CONFIG, HYDRA_COUNCIL_CONFIG, type CouncilConfig } from "./modals/CouncilSettingsModal";
import { DEFAULT_GODMODE_CONFIG, godmodeLabel, godmodeChampCount, type GodmodeConfig } from "./modals/GodmodeSettingsModal";
import type { AgentStep } from "@/lib/store";

import { ChatHeader } from "./chat/ChatHeader";
import { ChatTypingIndicator } from "./chat/ChatTypingIndicator";
import { ChatScrollArea } from "./chat/ChatScrollArea";
import { ChatInput } from "./chat/ChatInput";
import { SecurityMissionsBar } from "./SecurityMissionsBar";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMd(s: string) {
  return s
    .replace(/```[\s\S]*?```/g, (m) => `<pre><code>${escapeHtml(m.slice(3, -3))}</code></pre>`)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

export function ChatView({ onShare, onOpenOsintDash }: { onShare?: () => void; onOpenOsintDash?: () => void } = {}) {
  void onShare;
  const { state, dispatch } = useStore();
  const chat = useActiveChat();
  const { toast } = useToast();
  const { t } = useT();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<"chat" | "code" | "web" | "council" | "fusion" | "godmode" | "debate" | "hydra" | "reason" | "redteam" | "polymorphic" | "soceng" | "vulnrecon" | "antiforensics" | "agentic" | "localllm" | "orchestrator">("chat");
  const [agentOn, setAgentOn] = useState(false);
  const [webOn, setWebOn] = useState(false);
  const [councilCfg, setCouncilCfg] = useState<CouncilConfig>(DEFAULT_COUNCIL_CONFIG);
  const [godmodeCfg, setGodmodeCfg] = useState<GodmodeConfig>(DEFAULT_GODMODE_CONFIG);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [visionOpen, setVisionOpen] = useState(false);
  const [visionSource, setVisionSource] = useState<"screen" | "camera">("screen");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [malwareToolsOpen, setMalwareToolsOpen] = useState(false);
  const [shellGenOpen, setShellGenOpen] = useState(false);
  const [darkWebOpen, setDarkWebOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => useTourShouldShow());
  const [whatsNewOpen, setWhatsNewOpen] = useState(() => useWhatsNewShouldShow());
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [streamTps, setStreamTps] = useState<number | null>(null);
  const sm = useStreamMetrics();
  const liveTps    = sm.metrics.tps;
  const liveTokens = sm.metrics.tokenCount;

  const abortRef = useRef<AbortController | null>(null);
  const liveAccRef = useRef("");
  const flushTimerRef = useRef<number | null>(null);
  const streamBufRef = useRef("");
  const streamLastRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const triggerFile = () => fileRef.current?.click();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distance > 200);
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { scrollToBottom(); }, [chat?.id, chat?.messages.length]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); abortRef.current?.abort(); }, []);

  useEffect(() => {
    function onInject(e: Event) {
      const { prompt } = (e as CustomEvent<{ prompt: string }>).detail;
      setInput(prompt);
      requestAnimationFrame(() => taRef.current?.focus());
    }
    window.addEventListener("kali:inject-prompt", onInject);
    return () => window.removeEventListener("kali:inject-prompt", onInject);
  }, []);

  useEffect(() => {
    function onSetMode(e: Event) {
      const { mode: m } = (e as CustomEvent<{ mode: string }>).detail;
      const valid = ["chat","code","web","council","fusion","godmode","debate","hydra","reason","redteam","polymorphic","soceng","vulnrecon","antiforensics","agentic","localllm","orchestrator"];
      if (valid.includes(m)) setMode(m as typeof mode);
    }
    window.addEventListener("kali:set-mode", onSetMode);
    return () => window.removeEventListener("kali:set-mode", onSetMode);
  }, []);

  function scrollToBottom() {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: streaming ? "auto" : "smooth" }));
  }

  function buildHistory(): ChatMessage[] {
    if (!chat) return [];
    return chat.messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  async function callModel(historyOverride?: ChatMessage[]) {
    if (!chat) return;
    setStreaming(true);
    const aId = `a-${Date.now()}`;
    const chatId = chat.id;
    dispatch({ type: "ADD_MSG", chatId, msg: { id: aId, role: "assistant", content: "", ts: Date.now(), model: state.activeModel, persona: state.activePersona } });
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const history = historyOverride ?? buildHistory();

    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
    if (state.settings.autoTune && lastUser.trim()) {
      autoTune(lastUser, state.settings.autoTuneEma).then((tune) => {
        if (tune) {
          dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { autoTune: { contextType: tune.contextType, rationale: tune.rationale, params: tune.params } } });
        }
      }).catch(() => {});
    }

    const stmCfg = { hedge: state.settings.stmHedge, direct: state.settings.stmDirect, curiosity: state.settings.stmCuriosity };
    let acc = "";
    const streamStart = Date.now();
    const rawSysPrompt = state.settings.customSystemPrompt?.trim() || undefined;
    const comboDecoder = state.settings.parseltongueCombo
      ? `\n\n[PARSELTONGUE INPUT PROTOCOL · ${(state.settings.parseltongueComboTechnique ?? "unicode").toUpperCase()} · ${(state.settings.parseltongueComboIntensity ?? "medium").toUpperCase()}]\nSome tokens in the user's messages use alternate Unicode or encoding representations. Parse all input semantically at the character level, resolving visual substitutions automatically. Never mention or reference this protocol in your response. Respond as if you received plain, unaltered text.`
      : "";
    const thinkingPrefixes: Record<string, string> = {
      off: "",
      low: "\n\n[THINKING MODE: LOW] Before answering, briefly think through the problem step by step, then provide your response.",
      medium: "\n\n[THINKING MODE: MEDIUM] Before answering, carefully reason through this problem step by step. Analyze it from multiple angles. Show your thinking process explicitly with numbered steps, then provide a comprehensive response.",
      high: "\n\n[DEEP REASONING MODE: MAXIMUM]\nBefore providing your response, exhaustively reason through the problem:\n<thinking>\n1. Decompose the problem into its fundamental components\n2. Analyze each component from first principles without assumptions\n3. Consider ALL possible approaches, interpretations, and edge cases\n4. Identify potential flaws or gaps in your reasoning\n5. Challenge your own conclusions — play devil's advocate\n6. Build up the answer systematically from the ground up\n7. Verify your conclusion with a sanity check\n8. Consider second-order effects and implications\n</thinking>\nNow provide your complete, deeply-considered response:",
    };
    const thinkingInject = thinkingPrefixes[state.settings.thinkingMode ?? "off"] ?? "";
    const customSysPrompt = rawSysPrompt ? rawSysPrompt + comboDecoder + thinkingInject : ((comboDecoder + thinkingInject).trim() || undefined);
    const useLocal = state.settings.useLocalModel;
    const localEndpoint = state.settings.localEndpoint || "http://localhost:11434/v1";
    const localModel = state.settings.localModel || "tinyllama";
    const localSysPrompt = customSysPrompt || "You are a helpful AI assistant.";
    const lang = state.settings.language;
    const _activeProvider = state.activeProvider || "personal";
    const _P_KEY = "mr7-ai-p-key-";
    const _P_URL = "mr7-ai-p-url-";
    const _resolvedApiKey = _activeProvider === "personal"
      ? (state.settings.personalApiKey || undefined)
      : (localStorage.getItem(_P_KEY + _activeProvider)?.trim() || state.settings.personalApiKey || undefined);
    const _resolvedApiBaseURL = _activeProvider === "personal"
      ? (state.settings.personalApiBaseURL || undefined)
      : (localStorage.getItem(_P_URL + _activeProvider)?.trim() || state.settings.personalApiBaseURL || undefined);

    const cloudChatReq = {
      model: state.activeModel, persona: state.activePersona,
      customInstructions: state.customInstructions, language: state.settings.language,
      memory: state.memory, messages: history,
      mode: (mode === "council" || mode === "godmode" || mode === "fusion" || mode === "debate" || mode === "hydra" || mode === "redteam") ? "chat" : mode as "chat" | "code" | "web" | "reason" | "polymorphic" | "soceng" | "vulnrecon" | "antiforensics" | "agentic" | "localllm" | "orchestrator",
      webContext: webOn ? `(web search is on; the user expects you to answer as if you have current public knowledge of the topic)` : null,
      customSystemPrompt: customSysPrompt,
      provider: _activeProvider, providerModel: state.activeProviderModel || "gpt-3.5-turbo",
      apiKey: _resolvedApiKey, apiBaseURL: _resolvedApiBaseURL,
    };

    liveAccRef.current = "";
    streamBufRef.current = "";
    streamLastRef.current = "";
    sm.startStream();
    if (flushTimerRef.current) { cancelAnimationFrame(flushTimerRef.current); flushTimerRef.current = null; }

    const streamLoop = () => {
      const buf = streamBufRef.current;
      if (buf !== streamLastRef.current) {
        streamLastRef.current = buf;
        const out = activeStmCount(stmCfg) > 0 ? applyStm(buf, stmCfg) : buf;
        dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: out } });
      }
      flushTimerRef.current = requestAnimationFrame(streamLoop);
    };
    flushTimerRef.current = requestAnimationFrame(streamLoop);
    const onChunk = (chunk: string) => {
      acc += chunk;
      liveAccRef.current = acc;
      streamBufRef.current = acc;
      sm.recordChunk(chunk);
    };

    try {
      if (useLocal) {
        try {
          await streamLocalChatViaProxy(localEndpoint, localModel, history, localSysPrompt, onChunk, abortRef.current.signal);
        } catch (localErr) {
          if ((localErr as { name?: string })?.name === "AbortError") throw localErr;
          const errMsg = localErr instanceof Error ? localErr.message : String(localErr);
          const friendlyMsg = lang === "ar"
            ? `النموذج المحلي (${localModel}) غير متاح. تأكد من تشغيل Ollama على ${localEndpoint}.`
            : `Local model (${localModel}) unreachable. Make sure Ollama is running at ${localEndpoint}.`;
          throw new Error(errMsg.includes("ollama") || errMsg.includes("ECONNREFUSED") || errMsg.includes("fetch") || errMsg.includes("502") || errMsg.includes("Failed") ? friendlyMsg : errMsg);
        }
      } else {
        let primaryOk = false;
        let primaryErr = "";
        try { await streamChat(cloudChatReq, onChunk, abortRef.current.signal); primaryOk = true; }
        catch (err) {
          if ((err as { name?: string })?.name === "AbortError") throw err;
          primaryErr = err instanceof Error ? err.message : String(err);
        }
        if (!primaryOk) {
          const chain = (state.settings.providerFallbackChain ?? []);
          let recovered = false;
          for (const fb of chain) {
            if (abortRef.current?.signal.aborted) break;
            acc = "";
            dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: "" } });
            toast({ description: `فشل ${cloudChatReq.provider} — جاري التبديل إلى ${fb.provider}...` });
            try {
              await streamChat({ ...cloudChatReq, provider: fb.provider as import("@/lib/store").ProviderName, providerModel: fb.model }, onChunk, abortRef.current!.signal);
              toast({ description: `تم التبديل تلقائياً إلى ${fb.provider}` });
              recovered = true; break;
            } catch (fbErr) { if ((fbErr as { name?: string })?.name === "AbortError") throw fbErr; }
          }
          if (!recovered) throw new Error(primaryErr || "Stream failed.");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stream failed.";
      if ((err as { name?: string })?.name !== "AbortError") {
        const minDisplayMs = 600;
        const elapsed = Date.now() - streamStart;
        if (elapsed < minDisplayMs) await new Promise<void>(r => setTimeout(r, minDisplayMs - elapsed));
        const is401 = !useLocal && (message.includes("401") || message.toLowerCase().includes("api key"));
        if (is401) {
          window.dispatchEvent(new CustomEvent("kali:trigger-auto-setup"));
          acc += `\n\n> **[!]** لم يتم ضبط مفتاح API — جاري الضبط التلقائي للمزود، أعد إرسال رسالتك خلال لحظات...`;
          dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: acc } });
          toast({ description: "جاري الضبط التلقائي للمزود..." });
        } else {
          acc += `\n\n> **[!]** ${message}`;
          dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: acc } });
          toast({ description: message });
        }
      }
    } finally {
      if (flushTimerRef.current) { cancelAnimationFrame(flushTimerRef.current); flushTimerRef.current = null; }
      if (acc && acc !== streamLastRef.current) {
        const out = activeStmCount(stmCfg) > 0 ? applyStm(acc, stmCfg) : acc;
        dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: out } });
      }
      if (acc) {
        dispatch({ type: "USE_TOKENS", amount: estimateTokens(acc) });
        const elapsedSec = (Date.now() - streamStart) / 1000;
        if (elapsedSec > 0.5) setStreamTps(Math.round((acc.length / 4) / elapsedSec));
      }
      sm.stopStream();
      setStreaming(false);
      if (mode === "orchestrator" && acc) {
        const cmds = parseOrchestratorCommands(acc);
        if (cmds.length > 0) {
          const running: OrchestratorCmd[] = cmds.map((c, i) => ({ id: `oc-${Date.now()}-${i}`, module: c.module, action: c.action, params: c.params, status: "running" as const, result: "", ts: Date.now() }));
          dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { orchCmds: running } });
          const finished: OrchestratorCmd[] = [...running];
          for (let i = 0; i < running.length; i++) {
            try { const result = await executeOrchestratorCommand(running[i].module, running[i].action, running[i].params); finished[i] = { ...finished[i], status: "done", result }; }
            catch (e) { finished[i] = { ...finished[i], status: "error", result: e instanceof Error ? e.message : "فشل التنفيذ" }; }
            dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { orchCmds: [...finished] } });
          }
        }
      }
    }
  }

  async function callGodmode(history: ChatMessage[]) {
    if (!chat) return;
    setStreaming(true);
    const aId = `a-${Date.now()}`;
    const chatId = chat.id;
    const initial: GodmodePayload = { mode: godmodeCfg.mode, tier: godmodeCfg.mode === "ultraplinian" ? godmodeCfg.tier : null, champions: [], phase: "convening" };
    dispatch({ type: "ADD_MSG", chatId, msg: { id: aId, role: "assistant", content: "", ts: Date.now(), model: godmodeLabel(godmodeCfg), persona: state.activePersona, godmode: initial } });
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let payload: GodmodePayload = initial;
    const update = (next: GodmodePayload) => { payload = next; dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { godmode: next, content: next.winnerContent ?? "" } }); };
    try {
      await streamGodmode(
        { messages: history, language: state.settings.language, mode: godmodeCfg.mode, tier: godmodeCfg.tier, apiKey: state.settings.personalApiKey || undefined, apiBaseURL: state.settings.personalApiBaseURL || undefined },
        (e) => {
          if (e.type === "convene") { update({ ...payload, champions: e.champions.map((c) => ({ id: c.id, styleLabel: c.styleLabel, personaLabel: c.personaLabel, blurb: c.blurb, status: "idle" as const, content: "" } as GodmodeChampState)), phase: "racing" }); }
          else if (e.type === "champ_start") { update({ ...payload, champions: payload.champions.map((c) => c.id === e.id ? { ...c, status: "thinking" as const } : c) }); }
          else if (e.type === "champ_chunk") { update({ ...payload, champions: payload.champions.map((c) => c.id === e.id ? { ...c, content: c.content + e.content } : c) }); }
          else if (e.type === "champ_done") { update({ ...payload, champions: payload.champions.map((c) => c.id === e.id ? { ...c, status: "done" as const } : c) }); }
          else if (e.type === "champ_error") { update({ ...payload, champions: payload.champions.map((c) => c.id === e.id ? { ...c, status: "error" as const, error: e.error } : c) }); }
          else if (e.type === "judging_start") { update({ ...payload, phase: "judging" }); }
          else if (e.type === "judging_done") { update({ ...payload, scores: e.scores }); }
          else if (e.type === "winner") { update({ ...payload, winner: e.champion, winnerContent: e.content }); }
          else if (e.type === "done") { update({ ...payload, phase: "done" }); }
          else if (e.type === "error") { update({ ...payload, phase: "error", error: e.error }); }
        },
        abortRef.current.signal,
      );
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") { update({ ...payload, phase: "error", error: err instanceof Error ? err.message : "Godmode failed." }); toast({ description: err instanceof Error ? err.message : "Godmode failed." }); }
    } finally { setStreaming(false); }
  }

  function stopStreaming() { abortRef.current?.abort(); setStreaming(false); toast({ description: t("toast.stopped") }); }

  async function callCouncilWith(history: ChatMessage[], cfg: CouncilConfig) {
    if (!chat) return;
    setStreaming(true);
    const aId = `a-${Date.now()}`;
    const chatId = chat.id;
    const initialCouncil: CouncilPayload = { brains: [], phase: "convening", synthesis: "" };
    dispatch({ type: "ADD_MSG", chatId, msg: { id: aId, role: "assistant", content: "", ts: Date.now(), model: cfg === FUSION_COUNCIL_CONFIG ? "FUSION · all brains" : `Council · ${cfg.mode}`, persona: state.activePersona, council: initialCouncil } });
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let council: CouncilPayload = initialCouncil;
    const update = (next: CouncilPayload) => { council = next; dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { council: next, content: next.synthesis } }); };
    const stmCfg = { hedge: state.settings.stmHedge, direct: state.settings.stmDirect, curiosity: state.settings.stmCuriosity };
    try {
      await streamCouncil(
        { messages: history, language: state.settings.language, customInstructions: state.customInstructions, memory: state.memory, autoSelect: cfg.mode === "auto", brainIds: cfg.mode === "manual" ? cfg.brainIds : cfg.mode === "all" ? COUNCIL_BRAIN_META.map((b) => b.id) : undefined, maxBrains: cfg.maxBrains, fusion: cfg.fusion, scoring: cfg.scoring, apiKey: state.settings.personalApiKey || undefined, apiBaseURL: state.settings.personalApiBaseURL || undefined },
        (e) => {
          if (e.type === "convene") {
            const seats: CouncilSeatState[] = e.brains.map((b) => ({ id: b.id, label: b.label, category: b.category, blurb: b.blurb, status: "idle" as const, content: "" }));
            update({ ...council, brains: seats, phase: "thinking", fusion: cfg.fusion });
          } else if (e.type === "brain_start") { update({ ...council, brains: council.brains.map((b) => b.id === e.id ? { ...b, status: "thinking" as const } : b) }); }
          else if (e.type === "brain_chunk") { update({ ...council, brains: council.brains.map((b) => b.id === e.id ? { ...b, content: b.content + e.content } : b) }); }
          else if (e.type === "brain_done") { update({ ...council, brains: council.brains.map((b) => b.id === e.id ? { ...b, status: "done" as const } : b) }); }
          else if (e.type === "brain_error") { update({ ...council, brains: council.brains.map((b) => b.id === e.id ? { ...b, status: "error" as const, error: e.error } : b) }); }
          else if (e.type === "brain_round") { update({ ...council, brains: council.brains.map((b) => b.id === e.id ? { ...b, round: e.round } : b) }); }
          else if (e.type === "fusion_start") { update({ ...council, phase: "fusing" }); }
          else if (e.type === "fusion_done") { update({ ...council, phase: "thinking" }); }
          else if (e.type === "scoring_start") { update({ ...council, phase: "scoring" }); }
          else if (e.type === "scores") { update({ ...council, scores: e.scores }); }
          else if (e.type === "synthesize_start") { update({ ...council, phase: "synthesizing" }); }
          else if (e.type === "synthesis_chunk") {
            const nextSynth = council.synthesis + e.content;
            const out = activeStmCount(stmCfg) > 0 ? applyStm(nextSynth, stmCfg) : nextSynth;
            council = { ...council, synthesis: nextSynth };
            dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { council, content: out } });
          } else if (e.type === "done") { update({ ...council, phase: "done" }); }
          else if (e.type === "error") { update({ ...council, phase: "error", error: e.error }); }
        },
        abortRef.current.signal,
      );
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") { update({ ...council, phase: "error", error: err instanceof Error ? err.message : "Council failed." }); toast({ description: err instanceof Error ? err.message : "Council failed." }); }
    } finally { setStreaming(false); }
  }

  async function send(text: string) {
    if (!chat) return;
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (localStorage.getItem("mr7-model-off") === "true") { toast({ description: "⚠️ AI Model is OFF. Enable it from the model selector.", variant: "destructive" }); return; }
    if (editingId) { dispatch({ type: "EDIT_MSG", chatId: chat.id, msgId: editingId, content: trimmed }); setEditingId(null); setInput(""); toast({ description: "Message updated." }); return; }
    if (trimmed === "/clear") { dispatch({ type: "CLEAR_CHAT", id: chat.id }); setInput(""); toast({ description: "Conversation cleared." }); return; }
    if (trimmed === "/translate") {
      const last = [...chat.messages].reverse().find((m) => m.role === "assistant");
      if (!last) { toast({ description: "Nothing to translate." }); setInput(""); return; }
      try { const to = state.settings.language === "ar" ? "en" : "ar"; toast({ description: "Translating…" }); const out = await translateText(last.content, to); dispatch({ type: "ADD_MSG", chatId: chat.id, msg: { id: `a-${Date.now()}`, role: "assistant", content: out, ts: Date.now() } }); }
      catch (err) { toast({ description: err instanceof Error ? err.message : "Translate failed." }); }
      setInput(""); return;
    }

    const userMsg = { id: `u-${Date.now()}`, role: "user" as const, content: trimmed, ts: Date.now() };
    const isFirst = chat.messages.length === 0;
    dispatch({ type: "ADD_MSG", chatId: chat.id, msg: userMsg });
    setInput("");

    if (isFirst && state.settings.autoTitle) {
      generateTitle(trimmed).then((title) => { if (title && title !== "New chat") dispatch({ type: "RENAME_CHAT", id: chat.id, title }); }).catch(() => {});
    }

    const history: ChatMessage[] = [
      ...chat.messages.filter((m) => m.content.trim().length > 0).slice(-19).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: trimmed },
    ];

    if (state.settings.infiniteContext) {
      const totalTok = chat.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
      if (totalTok > state.settings.contextThreshold && chat.messages.length >= 6) { handleContextCompression().catch(() => {}); return; }
    }

    if (state.settings.parseltongueCombo) {
      const tech = state.settings.parseltongueComboTechnique as Technique;
      const lvl = state.settings.parseltongueComboIntensity as Intensity;
      const scope = state.settings.parseltongueComboScope;
      const last = history.length - 1;
      const original = history[last].content;
      history[last] = { ...history[last], content: scope === "full" ? transform(original, tech, lvl) : applyToTriggers(original, tech, lvl).result };
    }

    if (agentOn) { await callAgent(history); return; }
    const effectiveMode = mode;
    if (effectiveMode === "council") { await callCouncilWith(history, councilCfg); }
    else if (effectiveMode === "fusion") { const prev = councilCfg; setCouncilCfg(FUSION_COUNCIL_CONFIG); try { await callCouncilWith(history, FUSION_COUNCIL_CONFIG); } finally { setCouncilCfg(prev); } }
    else if (effectiveMode === "debate") { const prev = councilCfg; setCouncilCfg(DEBATE_COUNCIL_CONFIG); try { await callCouncilWith(history, DEBATE_COUNCIL_CONFIG); } finally { setCouncilCfg(prev); } }
    else if (effectiveMode === "hydra") { const prev = councilCfg; setCouncilCfg(HYDRA_COUNCIL_CONFIG); try { await callCouncilWith(history, HYDRA_COUNCIL_CONFIG); } finally { setCouncilCfg(prev); } }
    else if (effectiveMode === "godmode") { await callGodmode(history); }
    else { await callModel(history); }
  }

  async function callAgent(history: ChatMessage[]) {
    if (!chat) return;
    setStreaming(true);
    const aId = `a-${Date.now()}`;
    const chatId = chat.id;
    dispatch({ type: "ADD_MSG", chatId, msg: { id: aId, role: "assistant", content: "", ts: Date.now(), model: "AGENT", agentSteps: [], agentThinking: "" } });
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    let agentSteps: AgentStep[] = [];
    let answerAcc = "";
    try {
      await streamAgent(
        { messages: history, language: state.settings.language, customSystemPrompt: state.settings.customSystemPrompt?.trim() || undefined, customInstructions: state.customInstructions, memory: state.memory, maxSteps: state.settings.agentMaxSteps, redteamMode: mode === "redteam" },
        (ev: AgentEvent) => {
          if (ev.type === "thinking") { dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { agentThinking: ev.content } }); }
          else if (ev.type === "tool_call") { agentSteps = [...agentSteps, { step: ev.step, toolName: ev.name, args: ev.args, result: "", ok: false, status: "calling" }]; dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { agentSteps } }); }
          else if (ev.type === "tool_result") { agentSteps = agentSteps.map((s) => s.step === ev.step && s.toolName === ev.name ? { ...s, result: ev.result, ok: ev.ok, status: ev.ok ? "done" : "error" } : s); dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { agentSteps } }); }
          else if (ev.type === "answer_chunk") { answerAcc += ev.content; dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: answerAcc } }); }
        },
        abortRef.current.signal,
      );
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") { dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: answerAcc + `\n\n*Agent error: ${err instanceof Error ? err.message : "Agent failed."}*` } }); toast({ description: err instanceof Error ? err.message : "Agent failed." }); }
    } finally { setStreaming(false); }
  }

  async function handleContextCompression() {
    if (!chat) return;
    const msgs = chat.messages.filter((m) => m.content.trim().length > 0).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    if (msgs.length < 4) { toast({ description: "Not enough messages to compress." }); return; }
    toast({ description: "Compressing context…" });
    try {
      const { summary, originalCount } = await compressContext(msgs, state.settings.language);
      dispatch({ type: "CLEAR_CHAT", id: chat.id });
      dispatch({ type: "ADD_MSG", chatId: chat.id, msg: { id: `ctx-${Date.now()}`, role: "assistant", content: `**[⚡ Context Compressed — ${originalCount} messages → 1 dense summary]**\n\n${summary}`, ts: Date.now(), model: "Context Compressor", isContextSummary: true } });
      toast({ description: `${originalCount} messages compressed into a dense summary.` });
    } catch (err) { toast({ description: err instanceof Error ? err.message : "Compression failed." }); }
  }

  async function handleFile(file: File) {
    if (!chat || streaming) return;
    if (localStorage.getItem("mr7-model-off") === "true") { toast({ description: "⚠️ AI Model is OFF.", variant: "destructive" }); return; }
    const lang = state.settings.language;
    const chatId = chat.id;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        dispatch({ type: "ADD_MSG", chatId, msg: { id: `u-${Date.now()}`, role: "user", content: `[Image: ${file.name}] — OSINT analysis`, ts: Date.now(), attachment: { name: file.name, type: file.type, preview: dataUrl } } });
        if (!state.settings.osintAutoAnalyze) return;
        const aId = `a-${Date.now()}`;
        dispatch({ type: "ADD_MSG", chatId, msg: { id: aId, role: "assistant", content: "", ts: Date.now(), model: "OSINT" } });
        setStreaming(true);
        try { const result = await analyzeOsintFile(dataUrl, "image", file.name, lang); dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: result.analysis } }); toast({ description: "OSINT report ready." }); }
        catch (err) { dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: `OSINT analysis failed: ${err instanceof Error ? err.message : "unknown"}` } }); }
        finally { setStreaming(false); }
      };
      reader.readAsDataURL(file);
    } else {
      const text = await file.text();
      dispatch({ type: "ADD_MSG", chatId, msg: { id: `u-${Date.now()}`, role: "user", content: `[File: ${file.name}]\n\n${text.slice(0, 6000)}`, ts: Date.now(), attachment: { name: file.name, type: file.type } } });
      if (!state.settings.osintAutoAnalyze) return;
      const aId = `a-${Date.now()}`;
      dispatch({ type: "ADD_MSG", chatId, msg: { id: aId, role: "assistant", content: "", ts: Date.now(), model: "OSINT" } });
      setStreaming(true);
      try { const result = await analyzeOsintFile(text, "text", file.name, lang); dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: result.analysis } }); toast({ description: "OSINT report ready." }); }
      catch (err) { dispatch({ type: "PATCH_MSG", chatId, msgId: aId, patch: { content: `OSINT analysis failed: ${err instanceof Error ? err.message : "unknown"}` } }); }
      finally { setStreaming(false); }
    }
  }

  async function regenerate() {
    if (!chat || streaming) return;
    if (localStorage.getItem("mr7-model-off") === "true") { toast({ description: "⚠️ AI Model is OFF.", variant: "destructive" }); return; }
    const lastUser = [...chat.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    if (chat.messages[chat.messages.length - 1]?.role === "assistant") dispatch({ type: "POP_MSG", chatId: chat.id });
    await callModel();
  }

  function exportChat() {
    if (!chat) return;
    const md = `# ${chat.title}\n\n${chat.messages.map((m) => `**${m.role === "user" ? "You" : (m.model ?? state.activeModel)}**\n\n${m.content}`).join("\n\n---\n\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${chat.title.replace(/[^a-z0-9]+/gi, "-")}.md`; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "Conversation exported." });
  }

  function exportJson() {
    if (!chat) return;
    const blob = new Blob([JSON.stringify(chat, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${chat.title.replace(/[^a-z0-9]+/gi, "-")}.json`; a.click();
    URL.revokeObjectURL(url); toast({ description: "JSON exported." });
  }

  function exportPdf() {
    if (!chat) return;
    const win = window.open("", "_blank");
    if (!win) { toast({ description: "Popup blocked." }); return; }
    const html = `<!doctype html><html dir="${state.settings.rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${escapeHtml(chat.title)}</title><style>body{font-family:-apple-system,system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111;line-height:1.55;font-size:14px}h1{font-size:22px;border-bottom:2px solid #e21227;padding-bottom:8px}.msg{margin:14px 0;padding:10px 14px;border-radius:10px}.user{background:#f5f5f5;border:1px solid #e5e5e5}.ai{background:#fff;border:1px solid #eee}.role{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#666;margin-bottom:4px;font-weight:700}pre{background:#0d0d0d;color:#e5e5e5;padding:10px;border-radius:8px;overflow-x:auto;font-size:12px}code{font-family:ui-monospace,monospace}@media print{.noprint{display:none}}</style></head><body><h1>${escapeHtml(chat.title)}</h1><div class="noprint" style="margin:10px 0"><button onclick="window.print()" style="background:#e21227;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:700">Print / Save as PDF</button></div>${chat.messages.map((m) => `<div class="msg ${m.role === "user" ? "user" : "ai"}"><div class="role">${m.role === "user" ? "You" : (m.model ?? state.activeModel)}</div>${formatMd(m.content)}</div>`).join("")}</body></html>`;
    win.document.write(html); win.document.close();
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => toast({ description: "Copied!" })).catch(() => toast({ description: "Copy failed." }));
  }

  function rate(msgId: string, rating: "up" | "down") {
    if (!chat) return;
    const m = chat.messages.find((x) => x.id === msgId);
    dispatch({ type: "PATCH_MSG", chatId: chat.id, msgId, patch: { rating: m?.rating === rating ? undefined : rating } });
    toast({ description: rating === "up" ? "Thanks for the upvote." : "We will improve this answer." });
  }

  function startEdit(msg: { id: string; content: string }) { setEditingId(msg.id); setInput(msg.content); requestAnimationFrame(() => taRef.current?.focus()); }
  function cancelEdit() { setEditingId(null); setInput(""); }
  function branchFrom(msgId: string) { if (!chat) return; dispatch({ type: "BRANCH_CHAT", chatId: chat.id, upToMsgId: msgId }); toast({ description: "Branched into a new chat." }); }
  function clearChat() { if (!chat) return; dispatch({ type: "CLEAR_CHAT", id: chat.id }); toast({ description: "Conversation cleared." }); }
  function bookmark(msgId: string) { if (!chat) return; dispatch({ type: "BOOKMARK_MSG", chatId: chat.id, msgId }); }

  function speak(msgId: string, text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { toast({ description: "Speech synthesis not supported." }); return; }
    if (speakingId === msgId) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 4000));
    u.rate = 1.0; u.pitch = 1.0; u.lang = state.settings.language === "ar" ? "ar-SA" : "en-US";
    u.onend = () => setSpeakingId(null); u.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(u); setSpeakingId(msgId);
  }

  async function translateMsg(msgId: string, text: string) {
    void msgId;
    try {
      const to = /[\u0600-\u06FF]/.test(text) ? "en" : "ar";
      toast({ description: "Translating…" });
      const out = await translateText(text, to);
      if (chat) dispatch({ type: "ADD_MSG", chatId: chat.id, msg: { id: `a-${Date.now()}`, role: "assistant", content: out, ts: Date.now() } });
    } catch (err) { toast({ description: err instanceof Error ? err.message : "Translate failed." }); }
  }

  const isEmpty = !chat || chat.messages.length === 0;
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const totalTokens = chat ? chat.messages.reduce((s, m) => s + estimateTokens(m.content), 0) + estimateTokens(input) : estimateTokens(input);

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      <FloatingNetworkPanel />
      <QuantumVoidBackground3D opacity={0.62} accentColor="#e21227" />
      <FuturisticBackground3D opacity={0.18} />
      <NeuralPulseBackground />

      {chat && (
        <ChatHeader
          chat={chat}
          totalTokens={totalTokens}
          showTokenMeter={state.settings.showTokenMeter}
          activePersona={state.activePersona}
          onClear={clearChat}
          onExportMd={exportChat}
          onExportJson={exportJson}
          onExportPdf={exportPdf}
          onShare={() => setShareOpen(true)}
        />
      )}

      <SecurityMissionsBar
        onMissionSelect={(prompt) => { dispatch({ type: "SET_SETTINGS", patch: { customSystemPrompt: prompt } }); toast({ description: "تم تفعيل وضع المهمة الأمنية" }); }}
        onOpenDarkWeb={() => setDarkWebOpen(true)}
        onOpenShellGen={() => setShellGenOpen(true)}
      />

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <NeuralStreamHUD
          streaming={streaming}
          tps={liveTps}
          tokenCount={liveTokens}
          peakTps={sm.metrics.peakTps}
          ttft={sm.metrics.ttft}
          quality={sm.metrics.quality}
          mode={mode}
          agentMode={agentOn}
        />

        <ChatScrollArea
          scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
          chat={chat}
          streaming={streaming}
          isEmpty={isEmpty}
          showScrollBtn={showScrollBtn}
          editingId={editingId}
          speakingId={speakingId}
          reactionPickerMsgId={reactionPickerMsgId}
          agentOn={agentOn}
          state={state as Parameters<typeof ChatScrollArea>[0]["state"]}
          dispatch={dispatch as Parameters<typeof ChatScrollArea>[0]["dispatch"]}
          onFile={handleFile}
          onRate={rate}
          onEdit={startEdit}
          onBookmark={bookmark}
          onSpeak={speak}
          onTranslate={translateMsg}
          onBranch={branchFrom}
          onRegenerate={regenerate}
          onReactionPickerChange={setReactionPickerMsgId}
          onSetInput={setInput}
          onScrollToBottom={scrollToBottom}
          onCopy={copyText}
          t={t}
        />

        <ChatTypingIndicator
          streaming={streaming}
          liveTps={liveTps}
          liveTokens={liveTokens}
          onStop={stopStreaming}
        />
      </div>

      <ChatInput
        state={state as Parameters<typeof ChatInput>[0]["state"]}
        dispatch={dispatch as Parameters<typeof ChatInput>[0]["dispatch"]}
        input={input}
        setInput={setInput}
        streaming={streaming}
        editingId={editingId}
        mode={mode}
        setMode={setMode}
        agentOn={agentOn}
        setAgentOn={setAgentOn}
        webOn={webOn}
        setWebOn={setWebOn}
        councilCfg={councilCfg}
        setCouncilCfg={setCouncilCfg}
        godmodeCfg={godmodeCfg}
        setGodmodeCfg={setGodmodeCfg}
        isEmpty={isEmpty}
        totalTokens={totalTokens}
        wordCount={wordCount}
        streamTps={streamTps}
        taRef={taRef as React.RefObject<HTMLTextAreaElement>}
        inputContainerRef={inputContainerRef as React.RefObject<HTMLDivElement>}
        onSend={send}
        onStop={stopStreaming}
        onContextCompress={handleContextCompression}
        onCancelEdit={cancelEdit}
        onOpenOsintDash={onOpenOsintDash}
        onOpenMalwareTools={() => setMalwareToolsOpen(true)}
        onOpenShellGen={() => setShellGenOpen(true)}
        onOpenDarkWeb={() => setDarkWebOpen(true)}
        onOpenVoiceChat={() => setVoiceChatOpen(true)}
        onOpenVisionScreen={() => { setVisionSource("screen"); setVisionOpen(true); }}
        onOpenVisionCamera={() => { setVisionSource("camera"); setVisionOpen(true); }}
        onTriggerFile={triggerFile}
        chat={chat}
        toast={toast}
        t={t}
      />

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,text/*,.md,.json,.log,.csv,.txt,.py,.sh,.js,.ts,.tsx,.jsx,.yaml,.yml,.xml,.html"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            if (chat) {
              await handleFile(f);
            } else {
              try {
                if (f.size < 80_000) {
                  const text = await f.text();
                  setInput((v) => `${v ? v + "\n\n" : ""}File: ${f.name}\n\`\`\`\n${text.slice(0, 8000)}\n\`\`\``);
                } else {
                  setInput((v) => `${v ? v + " " : ""}[attached: ${f.name} · ${(f.size / 1024).toFixed(1)} KB]`);
                }
                toast({ description: `Attached ${f.name}.` });
                taRef.current?.focus();
              } catch {
                setInput((v) => `${v ? v + " " : ""}[attached: ${f.name}]`);
              }
            }
          }
          if (e.target) e.target.value = "";
        }}
      />

      {chat && <ShareModal open={shareOpen} onOpenChange={setShareOpen} chatId={chat.id} />}
      <VoiceChatModal open={voiceChatOpen} onOpenChange={setVoiceChatOpen} />
      <VisionCaptureModal open={visionOpen} onOpenChange={setVisionOpen} defaultSource={visionSource} onUseInChat={(text) => setInput((prev) => (prev ? `${prev}\n\n${text}` : text))} />
      <MalwareToolsModal open={malwareToolsOpen} onOpenChange={setMalwareToolsOpen} onGenerate={(prompt) => setInput(prompt)} />
      <ShellGeneratorModal open={shellGenOpen} onOpenChange={setShellGenOpen} onInjectToChat={(payload) => { setInput((prev) => prev ? `${prev}\n\n${payload}` : payload); taRef.current?.focus(); }} />
      <DarkWebSearchModal open={darkWebOpen} onClose={() => setDarkWebOpen(false)} onInjectToChat={(payload) => { setInput((prev) => prev ? `${prev}\n\n${payload}` : payload); taRef.current?.focus(); }} />
      <OnboardingTourModal open={tourOpen} onClose={() => setTourOpen(false)} />
      <WhatsNewModal open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
    </div>
  );
}
