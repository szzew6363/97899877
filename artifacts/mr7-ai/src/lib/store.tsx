import { createContext, useContext, useEffect, useRef, useReducer, type ReactNode } from "react";
import { type Subscription, type SubscriptionTier, INITIAL_SUBSCRIPTION } from "./subscription";
import { fetchCloudChats, schedulePush } from "./cloud-sync";

export type CouncilSeatState = {
  id: string;
  label: string;
  category: string;
  blurb: string;
  status: "idle" | "thinking" | "done" | "error";
  content: string;
  round?: number;
  error?: string;
};

export type CouncilScoreEntry = {
  id: string; total: number;
  insight: number; specificity: number; accuracy: number; novelty: number; structure: number;
};

export type CouncilPayload = {
  brains: CouncilSeatState[];
  phase: "convening" | "thinking" | "fusing" | "scoring" | "synthesizing" | "done" | "error";
  synthesis: string;
  scores?: CouncilScoreEntry[];
  fusion?: boolean;
  error?: string;
};

export type GodmodeChampState = {
  id: string;
  styleLabel: string;
  personaLabel: string;
  blurb: string;
  status: "idle" | "thinking" | "done" | "error";
  content: string;
  error?: string;
};

export type GodmodeScoreEntry = {
  id: string; total: number;
  insight: number; specificity: number; accuracy: number; novelty: number; structure: number;
  verdict: string;
};

export type GodmodePayload = {
  mode: "classic" | "ultraplinian" | "reason" | "hunter" | "agent" | "extended" | "maxoverdrive" | "unbound" | "jioreason" | "mythos" | "ultimate" | "think" | "max" | "abliterated" | "omega" | "neural" | "quantum" | "swarm" | "matrix" | "genesis" | "shadow" | "titan" | "oracle" | "phantom";
  tier: string | null;
  champions: GodmodeChampState[];
  phase: "convening" | "racing" | "judging" | "done" | "error";
  scores?: GodmodeScoreEntry[];
  winner?: { id: string; styleLabel: string; personaLabel: string } | null;
  winnerContent?: string;
  error?: string;
};

export type AgentStep = {
  step: number;
  toolName: string;
  args: Record<string, unknown>;
  result: string;
  ok: boolean;
  status: "calling" | "done" | "error";
};

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  rating?: "up" | "down";
  bookmarked?: boolean;
  ts: number;
  model?: string;
  persona?: string | null;
  council?: CouncilPayload;
  godmode?: GodmodePayload;
  autoTune?: { contextType: string; rationale: string; params: Record<string, number> };
  // Autonomous Agent
  agentSteps?: AgentStep[];
  agentThinking?: string;
  // Deep Reasoning
  reasoning?: string;
  // Multi-modal OSINT attachment
  attachment?: { name: string; type: string; preview?: string };
  // Context compression marker
  isContextSummary?: boolean;
  // Message reactions: emoji → list of user IDs (we use "me" for local user)
  reactions?: Record<string, string[]>;
  // AI Master Controller — orchestrator commands executed in this message
  orchCmds?: import("./agent-orchestrator").OrchestratorCmd[];
};

export type Folder = { id: string; label: string; color: string };

export type Chat = {
  id: string;
  title: string;
  messages: ChatMsg[];
  pinned?: boolean;
  archived?: boolean;
  folderId?: string | null;
  tags?: string[];
  createdAt: number;
};

export type AutoTuneEma = Partial<
  Record<"factual" | "creative" | "code" | "reasoning" | "conversational", { good: number; bad: number }>
>;

export type Settings = {
  notifications: boolean;
  sounds: boolean;
  streaming: boolean;
  sendOnEnter: boolean;
  rtl: boolean;
  compact: boolean;
  language: "en" | "ar";
  density: "comfortable" | "compact" | "spacious";
  showTokenMeter: boolean;
  autoTitle: boolean;
  // STM modules
  stmHedge: boolean;
  stmDirect: boolean;
  stmCuriosity: boolean;
  // AutoTune
  autoTune: boolean;
  autoTuneEma: AutoTuneEma;
  // Council fusion / scoring
  councilFusion: boolean;
  councilScoring: boolean;
  // Power Mode — forces every send through FUSION (every engine in parallel)
  powerMode: boolean;
  // Custom System Prompt / Persona
  customSystemPrompt: string;
  activePersonaPreset: string;
  // Local Model (Ollama / LM Studio)
  useLocalModel: boolean;
  localEndpoint: string;
  localModel: string;
  // Parseltongue Combo — prompt obfuscation layered on top of active persona
  parseltongueCombo: boolean;
  parseltongueComboTechnique: string;
  parseltongueComboIntensity: string;
  parseltongueComboScope: "triggers" | "full";
  // Autonomous Agent
  agentMode: boolean;
  agentMaxSteps: number;
  // Infinite Context Window
  infiniteContext: boolean;
  contextThreshold: number;
  // Deep Reasoning / Chain-of-Thought
  deepReasoning: boolean;
  showReasoningTrace: boolean;
  // Multi-modal OSINT
  osintAutoAnalyze: boolean;
  // Configurable Thinking / Reasoning Mode
  thinkingMode: "off" | "low" | "medium" | "high";
  // Personal API credentials (sent with every request)
  personalApiKey: string;
  personalApiBaseURL: string;
  // Advanced model parameters
  aiTemperature: number;
  aiMaxTokens: number;
  aiTopP: number;
  aiFreqPenalty: number;
  aiPresPenalty: number;
  aiSystemTemplate: string;
  // Provider fallback chain: ordered list of provider+model to try on failure
  providerFallbackChain: Array<{ provider: string; model: string }>;
  // Multi-key pool: additional API keys to rotate through on failure
  apiKeyPool: Array<{ key: string; label: string; active: boolean }>;
};

export type ThemeAccent = "crimson" | "midnight" | "emerald" | "amber" | "violet" | "cyan" | "rose" | "lime" | "orange" | "slate";

export type Snippet = { id: string; label: string; content: string };

export type ProviderName = "openai" | "anthropic" | "groq" | "gemini" | "openrouter" | "custom" | "personal";

export type AppState = {
  chats: Chat[];
  activeChatId: string;
  activeModel: string;
  activePersona: string | null;
  settings: Settings;
  themeAccent: ThemeAccent;
  notifications: { id: string; title: string; body: string; ts: number; read: boolean }[];
  pinnedTools: string[];
  snippets: Snippet[];
  folders: Folder[];
  memory: string[];
  customInstructions: string;
  compareModels: string[];
  subscription: Subscription;
  activeProvider: ProviderName;
  activeProviderModel: string;
  tokenHistory: Record<string, number>;
};

export type { Subscription, SubscriptionTier };

type Action =
  | { type: "NEW_CHAT" }
  | { type: "NEW_CHAT_IN_FOLDER"; folderId: string | null }
  | { type: "SELECT_CHAT"; id: string }
  | { type: "RENAME_CHAT"; id: string; title: string }
  | { type: "DELETE_CHAT"; id: string }
  | { type: "PIN_CHAT"; id: string }
  | { type: "ARCHIVE_CHAT"; id: string }
  | { type: "MOVE_CHAT"; id: string; folderId: string | null }
  | { type: "TAG_CHAT"; id: string; tag: string }
  | { type: "UNTAG_CHAT"; id: string; tag: string }
  | { type: "CLEAR_CHAT"; id: string }
  | { type: "BRANCH_CHAT"; chatId: string; upToMsgId: string }
  | { type: "ADD_MSG"; chatId: string; msg: ChatMsg }
  | { type: "PATCH_MSG"; chatId: string; msgId: string; patch: Partial<ChatMsg> }
  | { type: "POP_MSG"; chatId: string }
  | { type: "EDIT_MSG"; chatId: string; msgId: string; content: string }
  | { type: "DELETE_MSG"; chatId: string; msgId: string }
  | { type: "BOOKMARK_MSG"; chatId: string; msgId: string }
  | { type: "TOGGLE_TOOL_PIN"; tool: string }
  | { type: "ADD_SNIPPET"; snippet: Snippet }
  | { type: "DELETE_SNIPPET"; id: string }
  | { type: "ADD_FOLDER"; folder: Folder }
  | { type: "DELETE_FOLDER"; id: string }
  | { type: "RENAME_FOLDER"; id: string; label: string }
  | { type: "ADD_MEMORY"; entry: string }
  | { type: "DELETE_MEMORY"; index: number }
  | { type: "SET_MEMORY"; entries: string[] }
  | { type: "SET_CUSTOM_INSTRUCTIONS"; text: string }
  | { type: "SET_MODEL"; model: string }
  | { type: "SET_PERSONA"; persona: string | null }
  | { type: "SET_COMPARE_MODELS"; models: string[] }
  | { type: "SET_SETTINGS"; patch: Partial<Settings> }
  | { type: "SET_ACCENT"; accent: ThemeAccent }
  | { type: "MARK_NOTIFS_READ" }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "PUSH_NOTIF"; notif: { id: string; title: string; body: string; ts: number; read: boolean } }
  | { type: "HYDRATE"; state: Partial<AppState> }
  | { type: "SET_SUBSCRIPTION"; patch: Partial<Subscription> }
  | { type: "USE_TOKENS"; amount: number }
  | { type: "SET_PROVIDER"; provider: ProviderName; providerModel?: string }
  | { type: "IMPORT_CHATS"; chats: Chat[] }
  | { type: "REACT_MSG"; chatId: string; msgId: string; emoji: string; userId: string };

const STORAGE_KEY = "mr7-ai-state-v2";
const LEGACY_KEY = "mr7-ai-state-v1";

const seedChat: Chat = {
  id: "c-seed-1",
  title: "Welcome",
  pinned: false,
  createdAt: Date.now() - 1000 * 60 * 60 * 24,
  messages: [
    {
      id: "m-seed-1",
      role: "assistant",
      ts: Date.now() - 1000 * 60 * 60 * 24,
      content:
        "Welcome to CHAT-GPT.ai. I can help you write code, draft emails, brainstorm ideas, translate, summarize, plan trips, learn new topics — anything you need. What are we working on today?",
    },
  ],
};

const seedHey: Chat = {
  id: "c-seed-2",
  title: "Hey",
  pinned: false,
  createdAt: Date.now() - 1000 * 60 * 60 * 2,
  messages: [
    { id: "m-h-1", role: "user", ts: Date.now() - 1000 * 60 * 60 * 2, content: "Hey" },
    {
      id: "m-h-2",
      role: "assistant",
      ts: Date.now() - 1000 * 60 * 60 * 2 + 5000,
      content: "Hey. What can I help you with today?",
    },
  ],
};

const initial: AppState = {
  chats: [seedChat, seedHey],
  activeChatId: seedChat.id,
  activeModel: "CHAT-GPT Fast",
  activePersona: null,
  settings: {
    notifications: true,
    sounds: false,
    streaming: true,
    sendOnEnter: true,
    rtl: false,
    compact: false,
    language: "en",
    density: "comfortable",
    showTokenMeter: true,
    autoTitle: true,
    // All AI engines on by default — every feature active.
    stmHedge: true,
    stmDirect: true,
    stmCuriosity: true,
    autoTune: true,
    autoTuneEma: {},
    councilFusion: true,
    councilScoring: true,
    powerMode: false,
    customSystemPrompt: "",
    activePersonaPreset: "default",
    useLocalModel: false,
    localEndpoint: "http://localhost:11434/v1",
    localModel: "tinyllama",
    parseltongueCombo: false,
    parseltongueComboTechnique: "unicode",
    parseltongueComboIntensity: "medium",
    parseltongueComboScope: "triggers",
    agentMode: false,
    agentMaxSteps: 8,
    infiniteContext: true,
    contextThreshold: 60000,
    deepReasoning: false,
    showReasoningTrace: true,
    osintAutoAnalyze: true,
    thinkingMode: "off",
    personalApiKey: "",
    personalApiBaseURL: "https://api.openai.com/v1",
    aiTemperature: 0.7,
    aiMaxTokens: 4096,
    aiTopP: 1.0,
    aiFreqPenalty: 0.0,
    aiPresPenalty: 0.0,
    aiSystemTemplate: "",
    providerFallbackChain: [],
    apiKeyPool: [],
  },
  themeAccent: "crimson",
  notifications: [
    { id: "n1", title: "Real AI brain online", body: "All models now stream live answers from a high-end LLM. Persona, memory and custom instructions are wired in.", ts: Date.now() - 1000 * 60 * 5, read: false },
    { id: "n2", title: "Memory & custom instructions", body: "Open the Memory panel to teach the assistant about you. It will remember across chats.", ts: Date.now() - 1000 * 60 * 12, read: false },
    { id: "n3", title: "Compare mode", body: "Send the same prompt to two models side-by-side from the toolbar split icon.", ts: Date.now() - 1000 * 60 * 60, read: false },
    { id: "n4", title: "10 theme accents", body: "Pick from crimson, midnight, emerald, amber, violet, cyan, rose, lime, orange, slate.", ts: Date.now() - 1000 * 60 * 60 * 3, read: true },
  ],
  pinnedTools: [],
  snippets: [
    { id: "sn1", label: "Explain simply", content: "Explain {topic} in simple language with one concrete real-world example." },
    { id: "sn2", label: "Code review", content: "Review this code for bugs, performance, and readability. Suggest improvements with examples:\n\n{code}" },
    { id: "sn3", label: "Email draft", content: "Draft a professional email to {recipient} about {subject}. Tone: friendly but concise." },
    { id: "sn4", label: "Summarize", content: "Summarize the following text in 5 bullet points and one TL;DR sentence:\n\n{text}" },
    { id: "sn5", label: "Brainstorm", content: "Brainstorm 10 creative ideas for {goal}, ranked by impact and feasibility." },
  ],
  folders: [
    { id: "f-default", label: "All chats", color: "text-muted-foreground" },
    { id: "f-work", label: "Work", color: "text-cyan-400" },
    { id: "f-code", label: "Code", color: "text-blue-400" },
    { id: "f-writing", label: "Writing", color: "text-amber-400" },
    { id: "f-personal", label: "Personal", color: "text-emerald-400" },
  ],
  memory: [],
  customInstructions: "",
  compareModels: ["CHAT-GPT Fast", "CHAT-GPT Thinking"],
  subscription: INITIAL_SUBSCRIPTION,
  activeProvider: "personal",
  activeProviderModel: "gpt-3.5-turbo",
  tokenHistory: {},
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        ...action.state,
        settings: { ...initial.settings, ...(action.state.settings ?? {}) },
        subscription: { ...initial.subscription, ...(action.state.subscription ?? {}) },
        tokenHistory: { ...(action.state.tokenHistory ?? {}) },
      };
    case "NEW_CHAT": {
      const id = `c-${Date.now()}`;
      const chat: Chat = { id, title: "New chat", messages: [], createdAt: Date.now() };
      return { ...state, chats: [chat, ...state.chats], activeChatId: id };
    }
    case "NEW_CHAT_IN_FOLDER": {
      const id = `c-${Date.now()}`;
      const chat: Chat = { id, title: "New chat", messages: [], createdAt: Date.now(), folderId: action.folderId };
      return { ...state, chats: [chat, ...state.chats], activeChatId: id };
    }
    case "SELECT_CHAT":
      return { ...state, activeChatId: action.id };
    case "RENAME_CHAT":
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === action.id ? { ...c, title: action.title } : c)),
      };
    case "DELETE_CHAT": {
      const remaining = state.chats.filter((c) => c.id !== action.id);
      return {
        ...state,
        chats: remaining,
        activeChatId: state.activeChatId === action.id ? remaining[0]?.id ?? "" : state.activeChatId,
      };
    }
    case "PIN_CHAT":
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === action.id ? { ...c, pinned: !c.pinned } : c)),
      };
    case "ARCHIVE_CHAT":
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === action.id ? { ...c, archived: !c.archived } : c)),
      };
    case "MOVE_CHAT":
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === action.id ? { ...c, folderId: action.folderId } : c)),
      };
    case "TAG_CHAT":
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === action.id ? { ...c, tags: Array.from(new Set([...(c.tags ?? []), action.tag])) } : c)),
      };
    case "UNTAG_CHAT":
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === action.id ? { ...c, tags: (c.tags ?? []).filter((t) => t !== action.tag) } : c)),
      };
    case "CLEAR_CHAT":
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === action.id ? { ...c, messages: [] } : c)),
      };
    case "BRANCH_CHAT": {
      const src = state.chats.find((c) => c.id === action.chatId);
      if (!src) return state;
      const idx = src.messages.findIndex((m) => m.id === action.upToMsgId);
      if (idx < 0) return state;
      const id = `c-${Date.now()}`;
      const branch: Chat = {
        id,
        title: `Branch · ${src.title.slice(0, 24)}`,
        messages: src.messages.slice(0, idx + 1).map((m) => ({ ...m, id: `${m.id}-b${Date.now()}` })),
        createdAt: Date.now(),
      };
      return { ...state, chats: [branch, ...state.chats], activeChatId: id };
    }
    case "ADD_MSG":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.chatId
            ? {
                ...c,
                messages: [...c.messages, action.msg],
                title: c.messages.length === 0 && action.msg.role === "user" ? action.msg.content.slice(0, 32) : c.title,
              }
            : c,
        ),
      };
    case "PATCH_MSG":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.chatId
            ? { ...c, messages: c.messages.map((m) => (m.id === action.msgId ? { ...m, ...action.patch } : m)) }
            : c,
        ),
      };
    case "EDIT_MSG":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.chatId
            ? { ...c, messages: c.messages.map((m) => (m.id === action.msgId ? { ...m, content: action.content } : m)) }
            : c,
        ),
      };
    case "DELETE_MSG":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.chatId ? { ...c, messages: c.messages.filter((m) => m.id !== action.msgId) } : c,
        ),
      };
    case "BOOKMARK_MSG":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.chatId
            ? { ...c, messages: c.messages.map((m) => (m.id === action.msgId ? { ...m, bookmarked: !m.bookmarked } : m)) }
            : c,
        ),
      };
    case "REACT_MSG":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.chatId
            ? {
                ...c,
                messages: c.messages.map((m) => {
                  if (m.id !== action.msgId) return m;
                  const prev = m.reactions ?? {};
                  const users = prev[action.emoji] ?? [];
                  const already = users.includes(action.userId);
                  const next = already
                    ? users.filter((u) => u !== action.userId)
                    : [...users, action.userId];
                  const updated = { ...prev };
                  if (next.length === 0) delete updated[action.emoji];
                  else updated[action.emoji] = next;
                  return { ...m, reactions: updated };
                }),
              }
            : c,
        ),
      };
    case "POP_MSG":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.chatId ? { ...c, messages: c.messages.slice(0, -1) } : c,
        ),
      };
    case "TOGGLE_TOOL_PIN":
      return {
        ...state,
        pinnedTools: state.pinnedTools.includes(action.tool)
          ? state.pinnedTools.filter((t) => t !== action.tool)
          : [...state.pinnedTools, action.tool],
      };
    case "ADD_SNIPPET":
      return { ...state, snippets: [action.snippet, ...state.snippets] };
    case "DELETE_SNIPPET":
      return { ...state, snippets: state.snippets.filter((s) => s.id !== action.id) };
    case "ADD_FOLDER":
      return { ...state, folders: [...state.folders, action.folder] };
    case "DELETE_FOLDER":
      return {
        ...state,
        folders: state.folders.filter((f) => f.id !== action.id),
        chats: state.chats.map((c) => (c.folderId === action.id ? { ...c, folderId: null } : c)),
      };
    case "RENAME_FOLDER":
      return { ...state, folders: state.folders.map((f) => (f.id === action.id ? { ...f, label: action.label } : f)) };
    case "ADD_MEMORY":
      return { ...state, memory: [...state.memory, action.entry] };
    case "DELETE_MEMORY":
      return { ...state, memory: state.memory.filter((_, i) => i !== action.index) };
    case "SET_MEMORY":
      return { ...state, memory: action.entries };
    case "SET_CUSTOM_INSTRUCTIONS":
      return { ...state, customInstructions: action.text };
    case "SET_MODEL":
      return { ...state, activeModel: action.model };
    case "SET_PERSONA":
      return { ...state, activePersona: action.persona };
    case "SET_COMPARE_MODELS":
      return { ...state, compareModels: action.models.slice(0, 2) };
    case "SET_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "SET_ACCENT":
      return { ...state, themeAccent: action.accent };
    case "MARK_NOTIFS_READ":
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case "CLEAR_NOTIFICATIONS":
      return { ...state, notifications: [] };
    case "PUSH_NOTIF":
      return { ...state, notifications: [action.notif, ...state.notifications].slice(0, 50) };
    case "SET_SUBSCRIPTION":
      return { ...state, subscription: { ...state.subscription, ...action.patch } };
    case "USE_TOKENS": {
      const todayKey = new Date().toISOString().slice(0, 10);
      return {
        ...state,
        subscription: { ...state.subscription, tokensUsed: state.subscription.tokensUsed + action.amount },
        tokenHistory: { ...state.tokenHistory, [todayKey]: (state.tokenHistory?.[todayKey] ?? 0) + action.amount },
      };
    }
    case "SET_PROVIDER":
      return { ...state, activeProvider: action.provider, activeProviderModel: action.providerModel ?? "" };
    case "IMPORT_CHATS": {
      const existingIds = new Set(state.chats.map((c) => c.id));
      const newChats = action.chats.filter((c) => !existingIds.has(c.id));
      return { ...state, chats: [...newChats, ...state.chats] };
    }
    default:
      return state;
  }
}

const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const hydratedRef = useRef(false);

  // Load from localStorage on mount, then try cloud sync
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          dispatch({ type: "HYDRATE", state: parsed });
        }
      } catch {
        // ignore
      }
      // Fetch cloud chats — server wins if it has data
      try {
        const cloudChats = await fetchCloudChats();
        if (cloudChats && cloudChats.length > 0) {
          dispatch({ type: "HYDRATE", state: { chats: cloudChats } });
        }
      } catch {
        // ignore — offline
      }
      hydratedRef.current = true;
    })();
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
    // Push to cloud (debounced) — only after initial hydration
    if (hydratedRef.current) {
      schedulePush(state.chats);
    }
  }, [state]);

  useEffect(() => {
    const accentMap: Record<ThemeAccent, string> = {
      crimson: "354 84% 48%",
      midnight: "220 84% 56%",
      emerald: "150 80% 40%",
      amber: "38 92% 50%",
      violet: "270 80% 60%",
      cyan: "190 90% 50%",
      rose: "340 85% 55%",
      lime: "85 75% 45%",
      orange: "20 90% 55%",
      slate: "215 25% 55%",
    };
    document.documentElement.style.setProperty("--primary", accentMap[state.themeAccent]);
    document.documentElement.style.setProperty("--ring", accentMap[state.themeAccent]);
    document.documentElement.style.setProperty("--sidebar-primary", accentMap[state.themeAccent]);
    document.documentElement.style.setProperty("--sidebar-ring", accentMap[state.themeAccent]);
  }, [state.themeAccent]);

  useEffect(() => {
    const isAr = state.settings.language === "ar";
    const rtl = state.settings.rtl || isAr;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = state.settings.language;
  }, [state.settings.rtl, state.settings.language]);

  useEffect(() => {
    const sizes = { compact: "13.5px", comfortable: "15px", spacious: "16.5px" };
    document.documentElement.style.setProperty("--chat-font-size", sizes[state.settings.density]);
  }, [state.settings.density]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}

export function useActiveChat() {
  const { state } = useStore();
  return state.chats.find((c) => c.id === state.activeChatId) ?? null;
}

export const ACCENT_OPTIONS: { id: ThemeAccent; label: string; swatch: string }[] = [
  { id: "crimson", label: "Crimson", swatch: "bg-[hsl(354,84%,48%)]" },
  { id: "midnight", label: "Midnight", swatch: "bg-[hsl(220,84%,56%)]" },
  { id: "emerald", label: "Emerald", swatch: "bg-[hsl(150,80%,40%)]" },
  { id: "amber", label: "Amber", swatch: "bg-[hsl(38,92%,50%)]" },
  { id: "violet", label: "Violet", swatch: "bg-[hsl(270,80%,60%)]" },
  { id: "cyan", label: "Cyan", swatch: "bg-[hsl(190,90%,50%)]" },
  { id: "rose", label: "Rose", swatch: "bg-[hsl(340,85%,55%)]" },
  { id: "lime", label: "Lime", swatch: "bg-[hsl(85,75%,45%)]" },
  { id: "orange", label: "Orange", swatch: "bg-[hsl(20,90%,55%)]" },
  { id: "slate", label: "Slate", swatch: "bg-[hsl(215,25%,55%)]" },
];
