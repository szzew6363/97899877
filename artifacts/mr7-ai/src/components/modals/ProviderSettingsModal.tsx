import { useEffect, useState, useCallback, useMemo } from "react";
import {
  X, RefreshCw, Check, Cpu, Globe, Zap, FlaskConical, Route, Server, User,
  ExternalLink, Search, Star, Info, Copy, CheckCheck, Key, Eye, EyeOff,
  ChevronRight, Activity, Lock, Unlock, Brain, Flame, Target, Bot, Layers,
  Shield, Maximize2, Skull, Atom, AlertTriangle, Wifi, WifiOff,
  Plus, Trash2, Settings2, Database, BookOpen, Filter, ArrowRight, Terminal,
  Sparkles, Code2, Infinity, Crosshair, Dna, Save, RotateCcw, Sliders,
  CheckCircle2, CircleDot, ChevronDown, BarChart3, Gauge, Cpu as CpuIcon,
  Network, Layers3, ListFilter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
type ProviderInfo = { id: string; name: string; available: boolean; models: string[]; baseURL?: string };

type WorldModel = {
  id: string; label: string; provider: string; providerKey: string; ctx: string;
  speed: "fast" | "medium" | "slow";
  category: "general" | "code" | "reasoning" | "vision" | "uncensored" | "multimodal" | "agent" | "think";
  cost: "free" | "$" | "$$" | "$$$";
  hot?: boolean; note?: string; new?: boolean;
  baseURL?: string;
};

type ProviderDef = {
  id: string; name: string; color: string; glow: string;
  icon: React.ElementType; envKey: string; baseURL: string;
  desc: string; docsURL: string; badge?: string; requiresKey: boolean;
};

// ── Provider Definitions ───────────────────────────────────────────────────────
const PROVIDERS: ProviderDef[] = [
  {
    id: "openai", name: "OpenAI", color: "#10b981", glow: "rgba(16,185,129,0.15)",
    icon: Cpu, envKey: "OPENAI_API_KEY", baseURL: "https://api.openai.com/v1",
    desc: "GPT-4o · o3-pro · GPT-4.5 · o1 — الأقوى في السوق", docsURL: "https://platform.openai.com/api-keys", requiresKey: true,
  },
  {
    id: "anthropic", name: "Anthropic", color: "#f59e0b", glow: "rgba(245,158,11,0.15)",
    icon: FlaskConical, envKey: "ANTHROPIC_API_KEY", baseURL: "https://api.anthropic.com/v1",
    desc: "Claude 4 Opus · Sonnet · Haiku — Extended Thinking", docsURL: "https://console.anthropic.com/keys", requiresKey: true,
  },
  {
    id: "groq", name: "Groq", color: "#8b5cf6", glow: "rgba(139,92,246,0.15)",
    icon: Zap, envKey: "GROQ_API_KEY", baseURL: "https://api.groq.com/openai/v1",
    desc: "Llama 3.3 · DeepSeek-R1 · QwQ — سرعة خارقة مجاناً", docsURL: "https://console.groq.com/keys", badge: "مجاني", requiresKey: true,
  },
  {
    id: "gemini", name: "Google Gemini", color: "#3b82f6", glow: "rgba(59,130,246,0.15)",
    icon: Globe, envKey: "GEMINI_API_KEY", baseURL: "https://generativelanguage.googleapis.com/v1beta",
    desc: "Gemini 2.5 Pro · Flash — 1M token context", docsURL: "https://aistudio.google.com/apikey", requiresKey: true,
  },
  {
    id: "openrouter", name: "OpenRouter", color: "#ef4444", glow: "rgba(239,68,68,0.15)",
    icon: Route, envKey: "OPENROUTER_API_KEY", baseURL: "https://openrouter.ai/api/v1",
    desc: "300+ نموذج بمفتاح واحد — Uncensored · Abliterated", docsURL: "https://openrouter.ai/keys", badge: "300+", requiresKey: true,
  },
  {
    id: "xai", name: "xAI Grok", color: "#06b6d4", glow: "rgba(6,182,212,0.15)",
    icon: Atom, envKey: "XAI_API_KEY", baseURL: "https://api.x.ai/v1",
    desc: "Grok 3 · Grok 3 Mini — X.ai reasoning models", docsURL: "https://console.x.ai", badge: "جديد", requiresKey: true,
  },
  {
    id: "deepseek", name: "DeepSeek", color: "#f97316", glow: "rgba(249,115,22,0.15)",
    icon: Brain, envKey: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com/v1",
    desc: "DeepSeek V3 · R1 · R2 — الأقوى في الاستدلال", docsURL: "https://platform.deepseek.com/api_keys", badge: "R2", requiresKey: true,
  },
  {
    id: "mistral", name: "Mistral AI", color: "#ec4899", glow: "rgba(236,72,153,0.15)",
    icon: Flame, envKey: "MISTRAL_API_KEY", baseURL: "https://api.mistral.ai/v1",
    desc: "Mistral Large · Codestral · Pixtral — نماذج أوروبية", docsURL: "https://console.mistral.ai/api-keys", requiresKey: true,
  },
  {
    id: "perplexity", name: "Perplexity", color: "#22d3ee", glow: "rgba(34,211,238,0.15)",
    icon: Globe, envKey: "PERPLEXITY_API_KEY", baseURL: "https://api.perplexity.ai",
    desc: "Sonar Pro · Sonar Reasoning — بحث ويب حي في كل رد", docsURL: "https://www.perplexity.ai/settings/api", requiresKey: true,
  },
  {
    id: "together", name: "Together AI", color: "#a78bfa", glow: "rgba(167,139,250,0.15)",
    icon: Layers, envKey: "TOGETHER_API_KEY", baseURL: "https://api.together.xyz/v1",
    desc: "200+ نموذج مفتوح المصدر — Llama · Mixtral · Qwen", docsURL: "https://api.together.ai/settings/api-keys", requiresKey: true,
  },
  {
    id: "fireworks", name: "Fireworks AI", color: "#f59e0b", glow: "rgba(245,158,11,0.15)",
    icon: Flame, envKey: "FIREWORKS_API_KEY", baseURL: "https://api.fireworks.ai/inference/v1",
    desc: "Llama 3.1 405B · DeepSeek R1 · Mixtral 8x22B — سرعة عالية", docsURL: "https://fireworks.ai/account/api-keys", requiresKey: true,
  },
  {
    id: "cohere", name: "Cohere", color: "#6366f1", glow: "rgba(99,102,241,0.15)",
    icon: Network, envKey: "COHERE_API_KEY", baseURL: "https://api.cohere.com/v1",
    desc: "Command R+ · Aya · Rerank — متخصص في RAG والمؤسسات", docsURL: "https://dashboard.cohere.com/api-keys", requiresKey: true,
  },
  {
    id: "ai21", name: "AI21 Labs", color: "#10b981", glow: "rgba(16,185,129,0.15)",
    icon: Sparkles, envKey: "AI21_API_KEY", baseURL: "https://api.ai21.com/studio/v1",
    desc: "Jamba 1.5 Large · Mini — هجين SSM+Transformer", docsURL: "https://studio.ai21.com/account/api-key", requiresKey: true,
  },
  {
    id: "nvidia", name: "NVIDIA NIM", color: "#76b900", glow: "rgba(118,185,0,0.15)",
    icon: Cpu, envKey: "NVIDIA_API_KEY", baseURL: "https://integrate.api.nvidia.com/v1",
    desc: "Nemotron 70B · Llama 3.1 405B — استنتاج GPU فائق", docsURL: "https://build.nvidia.com", requiresKey: true,
  },
  {
    id: "github", name: "GitHub Models", color: "#e2e8f0", glow: "rgba(226,232,240,0.1)",
    icon: Globe, envKey: "GITHUB_TOKEN", baseURL: "https://models.inference.ai.azure.com",
    desc: "جميع النماذج الكبرى مجاناً بـ GitHub Token", docsURL: "https://github.com/settings/tokens", badge: "مجاني", requiresKey: true,
  },
  {
    id: "azure", name: "Azure OpenAI", color: "#0078d4", glow: "rgba(0,120,212,0.15)",
    icon: Globe, envKey: "AZURE_OPENAI_KEY", baseURL: "",
    desc: "جميع نماذج OpenAI عبر Azure Deployment — SLA مؤسسي", docsURL: "https://portal.azure.com", requiresKey: true,
  },
  {
    id: "huggingface", name: "Hugging Face", color: "#ff9d00", glow: "rgba(255,157,0,0.15)",
    icon: Database, envKey: "HF_API_KEY", baseURL: "https://api-inference.huggingface.co/models/",
    desc: "500,000+ نموذج — BLOOM · Falcon · StarCoder · Zephyr", docsURL: "https://huggingface.co/settings/tokens", requiresKey: true,
  },
  {
    id: "replicate", name: "Replicate", color: "#000000", glow: "rgba(255,255,255,0.08)",
    icon: Globe, envKey: "REPLICATE_API_KEY", baseURL: "https://api.replicate.com/v1",
    desc: "نماذج مفتوحة المصدر + صور + صوت + فيديو — Llama · SDXL", docsURL: "https://replicate.com/account/api-tokens", requiresKey: true,
  },
  {
    id: "zhipu", name: "Zhipu AI", color: "#3b82f6", glow: "rgba(59,130,246,0.15)",
    icon: Brain, envKey: "ZHIPU_API_KEY", baseURL: "https://open.bigmodel.cn/api/paas/v4",
    desc: "GLM-4 Plus · GLM-4V — نماذج صينية متقدمة", docsURL: "https://bigmodel.cn/usercenter/apikeys", requiresKey: true,
  },
  {
    id: "moonshot", name: "Moonshot AI", color: "#a78bfa", glow: "rgba(167,139,250,0.15)",
    icon: Brain, envKey: "MOONSHOT_API_KEY", baseURL: "https://api.moonshot.cn/v1",
    desc: "Moonshot v1 — 8K/32K/128K — نموذج صيني رائد", docsURL: "https://platform.moonshot.cn/console/api-keys", requiresKey: true,
  },
  {
    id: "minimax", name: "MiniMax", color: "#ec4899", glow: "rgba(236,72,153,0.15)",
    icon: Sparkles, envKey: "MINIMAX_API_KEY", baseURL: "https://api.minimax.chat/v1",
    desc: "MiniMax-Text-01 · abab6.5s — نماذج صينية متعددة الوسائط", docsURL: "https://www.minimaxi.com/user-center/basic-information/interface-key", requiresKey: true,
  },
  {
    id: "stepfun", name: "Stepfun", color: "#f97316", glow: "rgba(249,115,22,0.15)",
    icon: Zap, envKey: "STEPFUN_API_KEY", baseURL: "https://api.stepfun.com/v1",
    desc: "Step-2-16K · Step-1-256K — نماذج صينية بسياق طويل", docsURL: "https://platform.stepfun.com/account-info/api-key", requiresKey: true,
  },
  {
    id: "hunyuan", name: "Tencent Hunyuan", color: "#1db954", glow: "rgba(29,185,84,0.15)",
    icon: Brain, envKey: "HUNYUAN_SECRET_ID", baseURL: "https://hunyuan.cloud.tencent.com/v1",
    desc: "Hunyuan-Large · Turbos — نماذج Tencent", docsURL: "https://console.cloud.tencent.com/hunyuan", requiresKey: true,
  },
  {
    id: "doubao", name: "ByteDance Doubao", color: "#1677ff", glow: "rgba(22,119,255,0.15)",
    icon: Zap, envKey: "DOUBAO_API_KEY", baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    desc: "Doubao Pro 128K/32K · Skylark2 — نماذج ByteDance", docsURL: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey", requiresKey: true,
  },
  {
    id: "clova", name: "Naver HyperCLOVA X", color: "#03c75a", glow: "rgba(3,199,90,0.15)",
    icon: Brain, envKey: "CLOVA_CLIENT_ID", baseURL: "https://clovastudio.stream.ntruss.com/testapp/v1",
    desc: "HCX-DASH-001 · HCX-003 — نماذج Naver الكورية", docsURL: "https://console.ncloud.com/clova-studio/overview", requiresKey: true,
  },
  {
    id: "ollama", name: "Ollama (Local)", color: "#22c55e", glow: "rgba(34,197,94,0.15)",
    icon: Server, envKey: "", baseURL: "http://localhost:11434/v1",
    desc: "نماذج محلية عبر Ollama — Llama · Mistral · DeepSeek", docsURL: "https://ollama.ai", badge: "محلي", requiresKey: false,
  },
  {
    id: "lmstudio", name: "LM Studio (Local)", color: "#a78bfa", glow: "rgba(167,139,250,0.15)",
    icon: Server, envKey: "", baseURL: "http://localhost:1234/v1",
    desc: "نماذج محلية عبر LM Studio — واجهة رسومية سهلة", docsURL: "https://lmstudio.ai", badge: "محلي", requiresKey: false,
  },
  {
    id: "vllm", name: "vLLM (Local)", color: "#06b6d4", glow: "rgba(6,182,212,0.15)",
    icon: Server, envKey: "", baseURL: "http://localhost:8000/v1",
    desc: "استنتاج vLLM عالي الأداء — للخوادم الشخصية", docsURL: "https://vllm.ai", badge: "محلي", requiresKey: false,
  },
  {
    id: "custom", name: "Custom Endpoint", color: "#64748b", glow: "rgba(100,116,139,0.15)",
    icon: Server, envKey: "CUSTOM_API_KEY", baseURL: "",
    desc: "أي endpoint متوافق مع OpenAI API — Ollama · LM Studio", docsURL: "", requiresKey: false,
  },
  {
    id: "personal", name: "Personal API", color: "#e21227", glow: "rgba(226,18,39,0.15)",
    icon: User, envKey: "", baseURL: "https://api.openai.com/v1",
    desc: "مفتاحك الشخصي + Base URL — يعمل دائماً", docsURL: "", badge: "دائم", requiresKey: false,
  },
];

// ── Model Catalog ────────────────────────────────────────────────────────────
const WORLD_MODELS: WorldModel[] = [
  // OpenAI
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI", providerKey: "openai", ctx: "128K", speed: "medium", category: "multimodal", cost: "$$", hot: true, baseURL: "https://api.openai.com/v1" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI", providerKey: "openai", ctx: "128K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://api.openai.com/v1" },
  { id: "gpt-4.5-preview", label: "GPT-4.5 Preview", provider: "OpenAI", providerKey: "openai", ctx: "128K", speed: "medium", category: "general", cost: "$$$", hot: true, new: true, baseURL: "https://api.openai.com/v1" },
  { id: "o1", label: "o1", provider: "OpenAI", providerKey: "openai", ctx: "200K", speed: "slow", category: "reasoning", cost: "$$$", hot: true, note: "Extended thinking", baseURL: "https://api.openai.com/v1" },
  { id: "o1-mini", label: "o1-mini", provider: "OpenAI", providerKey: "openai", ctx: "128K", speed: "medium", category: "reasoning", cost: "$$", baseURL: "https://api.openai.com/v1" },
  { id: "o3", label: "o3", provider: "OpenAI", providerKey: "openai", ctx: "200K", speed: "slow", category: "think", cost: "$$$", hot: true, new: true, note: "أعمق استدلال", baseURL: "https://api.openai.com/v1" },
  { id: "o3-mini", label: "o3-mini", provider: "OpenAI", providerKey: "openai", ctx: "200K", speed: "medium", category: "reasoning", cost: "$$", hot: true, baseURL: "https://api.openai.com/v1" },
  { id: "o3-pro", label: "o3-pro", provider: "OpenAI", providerKey: "openai", ctx: "200K", speed: "slow", category: "think", cost: "$$$", hot: true, new: true, note: "JIO REASON MAX", baseURL: "https://api.openai.com/v1" },
  { id: "o4-mini", label: "o4-mini", provider: "OpenAI", providerKey: "openai", ctx: "200K", speed: "fast", category: "reasoning", cost: "$$", hot: true, new: true, baseURL: "https://api.openai.com/v1" },
  { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "OpenAI", providerKey: "openai", ctx: "16K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.openai.com/v1" },
  // Anthropic
  { id: "claude-opus-4-5", label: "Claude Opus 4.5", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "slow", category: "think", cost: "$$$", hot: true, note: "Extended Thinking 100K", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-3-opus-20240229", label: "Claude 3 Opus", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "slow", category: "general", cost: "$$$", baseURL: "https://api.anthropic.com/v1" },
  // Google Gemini
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "medium", category: "multimodal", cost: "$$", hot: true, note: "Thinking mode", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "fast", category: "multimodal", cost: "$", hot: true, baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "fast", category: "multimodal", cost: "$", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "Google", providerKey: "gemini", ctx: "2M", speed: "medium", category: "multimodal", cost: "$$", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  // Groq (Free)
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "general", cost: "free", hot: true, baseURL: "https://api.groq.com/openai/v1" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.groq.com/openai/v1" },
  { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "reasoning", cost: "free", hot: true, baseURL: "https://api.groq.com/openai/v1" },
  { id: "qwen-qwq-32b", label: "Qwen QwQ 32B", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "reasoning", cost: "free", hot: true, baseURL: "https://api.groq.com/openai/v1" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "multimodal", cost: "free", hot: true, new: true, baseURL: "https://api.groq.com/openai/v1" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "multimodal", cost: "free", hot: true, new: true, baseURL: "https://api.groq.com/openai/v1" },
  // OpenRouter
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", provider: "OpenRouter", providerKey: "openrouter", ctx: "1M", speed: "medium", category: "multimodal", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout", provider: "OpenRouter", providerKey: "openrouter", ctx: "10M", speed: "medium", category: "multimodal", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "deepseek/deepseek-r2", label: "DeepSeek R2", provider: "OpenRouter", providerKey: "openrouter", ctx: "256K", speed: "medium", category: "reasoning", cost: "$", hot: true, new: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3", provider: "OpenRouter", providerKey: "openrouter", ctx: "64K", speed: "medium", category: "general", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "x-ai/grok-3-beta", label: "Grok 3 Beta", provider: "OpenRouter", providerKey: "openrouter", ctx: "131K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "x-ai/grok-3-mini-beta", label: "Grok 3 Mini", provider: "OpenRouter", providerKey: "openrouter", ctx: "131K", speed: "fast", category: "reasoning", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B-A22B", provider: "OpenRouter", providerKey: "openrouter", ctx: "40K", speed: "slow", category: "reasoning", cost: "$$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "qwen/qwen3-30b-a3b", label: "Qwen3 30B-A3B", provider: "OpenRouter", providerKey: "openrouter", ctx: "40K", speed: "fast", category: "reasoning", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "nvidia/llama-3.1-nemotron-ultra-253b", label: "Nemotron Ultra 253B", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "slow", category: "reasoning", cost: "$$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "tngtech/deepseek-r1t-chimera:free", label: "DeepSeek R1T Chimera", provider: "OpenRouter", providerKey: "openrouter", ctx: "163K", speed: "medium", category: "reasoning", cost: "free", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/mistral-large-2411", label: "Mistral Large 24.11", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/mistral-small-3.1-24b-instruct", label: "Mistral Small 3.1", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "google/gemma-3-27b-it", label: "Gemma 3 27B", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "moonshotai/moonlight-16b-a3b-instruct", label: "Moonlight 16B", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  // xAI Grok
  { id: "grok-3", label: "Grok 3", provider: "xAI", providerKey: "xai", ctx: "131K", speed: "medium", category: "general", cost: "$$$", hot: true, baseURL: "https://api.x.ai/v1" },
  { id: "grok-3-mini", label: "Grok 3 Mini", provider: "xAI", providerKey: "xai", ctx: "131K", speed: "fast", category: "reasoning", cost: "$$", hot: true, baseURL: "https://api.x.ai/v1" },
  { id: "grok-2-1212", label: "Grok 2", provider: "xAI", providerKey: "xai", ctx: "131K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.x.ai/v1" },
  // DeepSeek
  { id: "deepseek-chat", label: "DeepSeek V3 Direct", provider: "DeepSeek", providerKey: "deepseek", ctx: "64K", speed: "medium", category: "general", cost: "$", hot: true, baseURL: "https://api.deepseek.com/v1" },
  { id: "deepseek-reasoner", label: "DeepSeek R1 Direct", provider: "DeepSeek", providerKey: "deepseek", ctx: "64K", speed: "slow", category: "reasoning", cost: "$", hot: true, note: "Full R1 chain", baseURL: "https://api.deepseek.com/v1" },
  // Mistral
  { id: "mistral-large-latest", label: "Mistral Large Latest", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.mistral.ai/v1" },
  { id: "codestral-latest", label: "Codestral", provider: "Mistral", providerKey: "mistral", ctx: "256K", speed: "fast", category: "code", cost: "$", baseURL: "https://api.mistral.ai/v1" },
  { id: "pixtral-large-latest", label: "Pixtral Large", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://api.mistral.ai/v1" },
  // Perplexity
  { id: "perplexity/sonar-pro", label: "Sonar Pro (Web Search)", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "medium", category: "general", cost: "$$", hot: true, note: "بحث ويب حي", baseURL: "https://api.perplexity.ai" },
  { id: "perplexity/sonar-reasoning-pro", label: "Sonar Reasoning Pro", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "slow", category: "reasoning", cost: "$$$", hot: true, baseURL: "https://api.perplexity.ai" },
  { id: "perplexity/sonar", label: "Sonar", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.perplexity.ai" },
  // Together AI
  { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", label: "Llama 3.1 405B Turbo", provider: "Together", providerKey: "together", ctx: "128K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://api.together.xyz/v1" },
  { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", label: "Qwen2.5 72B Turbo", provider: "Together", providerKey: "together", ctx: "32K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.together.xyz/v1" },
  // Uncensored
  { id: "cognitivecomputations/dolphin3.0-r1-mistral-24b:free", label: "Dolphin 3.0 R1 Mistral 24B", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "fast", category: "uncensored", cost: "free", hot: true, note: "Free uncensored reasoning", baseURL: "https://openrouter.ai/api/v1" },
  { id: "nousresearch/hermes-3-llama-3.1-405b", label: "Hermes 3 Llama 3.1 405B", provider: "OpenRouter", providerKey: "openrouter", ctx: "131K", speed: "slow", category: "uncensored", cost: "$$$", hot: true, note: "Unrestricted 405B", baseURL: "https://openrouter.ai/api/v1" },
  { id: "eva-unit-01/eva-llama-3.33-70b", label: "EVA Llama 3.33 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "131K", speed: "slow", category: "uncensored", cost: "$$", hot: true, note: "Abliterated roleplay", baseURL: "https://openrouter.ai/api/v1" },
  { id: "eva-unit-01/eva-qwen-2.5-72b", label: "EVA Qwen 2.5 72B", provider: "OpenRouter", providerKey: "openrouter", ctx: "131K", speed: "slow", category: "uncensored", cost: "$$", hot: true, note: "Abliterated Qwen 72B", baseURL: "https://openrouter.ai/api/v1" },
  { id: "cognitivecomputations/dolphin-mixtral-8x22b", label: "Dolphin Mixtral 8x22B", provider: "OpenRouter", providerKey: "openrouter", ctx: "65K", speed: "slow", category: "uncensored", cost: "$$", hot: true, note: "Abliterated · no RLHF", baseURL: "https://openrouter.ai/api/v1" },
  { id: "undi95/toppy-m-7b", label: "Toppy M 7B", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "fast", category: "uncensored", cost: "free", note: "Free uncensored", baseURL: "https://openrouter.ai/api/v1" },
  { id: "anthropic/claude-4-opus:mythos", label: "Claude 4 Opus · MYTHOS", provider: "OpenRouter", providerKey: "openrouter", ctx: "500K", speed: "slow", category: "uncensored", cost: "$$$", hot: true, new: true, note: "MYTHOS — zero-day analysis", baseURL: "https://openrouter.ai/api/v1" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1 · Think Chain", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "slow", category: "think", cost: "$", hot: true, note: "Full visible CoT", baseURL: "https://openrouter.ai/api/v1" },
  // ── OpenAI — Extended ───────────────────────────────────────────────────────
  { id: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI", providerKey: "openai", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.openai.com/v1" },
  { id: "gpt-4-turbo-preview", label: "GPT-4 Turbo Preview", provider: "OpenAI", providerKey: "openai", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.openai.com/v1" },
  { id: "gpt-4", label: "GPT-4", provider: "OpenAI", providerKey: "openai", ctx: "8K", speed: "slow", category: "general", cost: "$$$", baseURL: "https://api.openai.com/v1" },
  { id: "gpt-4-32k", label: "GPT-4 32K", provider: "OpenAI", providerKey: "openai", ctx: "32K", speed: "slow", category: "general", cost: "$$$", baseURL: "https://api.openai.com/v1" },
  { id: "gpt-3.5-turbo-16k", label: "GPT-3.5 Turbo 16K", provider: "OpenAI", providerKey: "openai", ctx: "16K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.openai.com/v1" },
  { id: "o1-preview", label: "o1-preview", provider: "OpenAI", providerKey: "openai", ctx: "128K", speed: "slow", category: "reasoning", cost: "$$$", baseURL: "https://api.openai.com/v1" },
  { id: "dall-e-3", label: "DALL-E 3", provider: "OpenAI", providerKey: "openai", ctx: "-", speed: "medium", category: "multimodal", cost: "$$", note: "Image generation", baseURL: "https://api.openai.com/v1" },
  { id: "dall-e-2", label: "DALL-E 2", provider: "OpenAI", providerKey: "openai", ctx: "-", speed: "fast", category: "multimodal", cost: "$", note: "Image generation", baseURL: "https://api.openai.com/v1" },
  { id: "whisper-1", label: "Whisper-1 (STT)", provider: "OpenAI", providerKey: "openai", ctx: "-", speed: "medium", category: "multimodal", cost: "$", note: "Speech-to-text", baseURL: "https://api.openai.com/v1" },
  { id: "tts-1", label: "TTS-1", provider: "OpenAI", providerKey: "openai", ctx: "-", speed: "fast", category: "multimodal", cost: "$", note: "Text-to-speech", baseURL: "https://api.openai.com/v1" },
  { id: "tts-1-hd", label: "TTS-1 HD", provider: "OpenAI", providerKey: "openai", ctx: "-", speed: "medium", category: "multimodal", cost: "$$", note: "High-def TTS", baseURL: "https://api.openai.com/v1" },
  { id: "text-embedding-3-large", label: "Embedding 3 Large", provider: "OpenAI", providerKey: "openai", ctx: "8K", speed: "fast", category: "general", cost: "$", note: "Embeddings", baseURL: "https://api.openai.com/v1" },
  { id: "text-embedding-3-small", label: "Embedding 3 Small", provider: "OpenAI", providerKey: "openai", ctx: "8K", speed: "fast", category: "general", cost: "free", note: "Embeddings", baseURL: "https://api.openai.com/v1" },
  { id: "text-embedding-ada-002", label: "Ada Embedding v2", provider: "OpenAI", providerKey: "openai", ctx: "8K", speed: "fast", category: "general", cost: "free", note: "Embeddings legacy", baseURL: "https://api.openai.com/v1" },
  // ── Azure OpenAI ─────────────────────────────────────────────────────────────
  { id: "azure/gpt-4o", label: "GPT-4o (Azure)", provider: "Azure OpenAI", providerKey: "azure", ctx: "128K", speed: "medium", category: "multimodal", cost: "$$", hot: true, note: "Enterprise SLA", baseURL: "" },
  { id: "azure/gpt-4-turbo", label: "GPT-4 Turbo (Azure)", provider: "Azure OpenAI", providerKey: "azure", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "" },
  { id: "azure/o3", label: "o3 (Azure)", provider: "Azure OpenAI", providerKey: "azure", ctx: "200K", speed: "slow", category: "think", cost: "$$$", new: true, baseURL: "" },
  { id: "azure/o1", label: "o1 (Azure)", provider: "Azure OpenAI", providerKey: "azure", ctx: "200K", speed: "slow", category: "reasoning", cost: "$$$", baseURL: "" },
  // ── GitHub Models (Free) ─────────────────────────────────────────────────────
  { id: "openai/gpt-4o", label: "GPT-4o (GitHub)", provider: "GitHub Models", providerKey: "github", ctx: "128K", speed: "medium", category: "multimodal", cost: "free", hot: true, note: "مجاني بـ GitHub Token", baseURL: "https://models.inference.ai.azure.com" },
  { id: "meta/llama-3.1-405b-instruct", label: "Llama 3.1 405B (GitHub)", provider: "GitHub Models", providerKey: "github", ctx: "128K", speed: "slow", category: "general", cost: "free", hot: true, baseURL: "https://models.inference.ai.azure.com" },
  { id: "mistral-large", label: "Mistral Large (GitHub)", provider: "GitHub Models", providerKey: "github", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "https://models.inference.ai.azure.com" },
  { id: "microsoft/phi-4", label: "Phi-4 (GitHub)", provider: "GitHub Models", providerKey: "github", ctx: "16K", speed: "fast", category: "general", cost: "free", baseURL: "https://models.inference.ai.azure.com" },
  // ── Anthropic — Extended ─────────────────────────────────────────────────────
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "slow", category: "think", cost: "$$$", hot: true, new: true, baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-opus-4-7", label: "Claude Opus 4.7", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "slow", category: "think", cost: "$$$", hot: true, baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "slow", category: "think", cost: "$$$", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-2.1", label: "Claude 2.1", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-instant-1.2", label: "Claude Instant 1.2", provider: "Anthropic", providerKey: "anthropic", ctx: "100K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.anthropic.com/v1" },
  // ── Google — Extended ────────────────────────────────────────────────────────
  { id: "gemini-2.0-pro", label: "Gemini 2.0 Pro", provider: "Google", providerKey: "gemini", ctx: "2M", speed: "medium", category: "multimodal", cost: "$$", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "fast", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "fast", category: "multimodal", cost: "$", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "fast", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-1.0-pro", label: "Gemini 1.0 Pro", provider: "Google", providerKey: "gemini", ctx: "32K", speed: "medium", category: "general", cost: "$", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-2-27b-it", label: "Gemma 2 27B", provider: "Google", providerKey: "gemini", ctx: "8K", speed: "medium", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-2-9b-it", label: "Gemma 2 9B", provider: "Google", providerKey: "gemini", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-2-2b-it", label: "Gemma 2 2B", provider: "Google", providerKey: "gemini", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "codegemma-7b-it", label: "CodeGemma 7B", provider: "Google", providerKey: "gemini", ctx: "8K", speed: "fast", category: "code", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "text-embedding-004", label: "Text Embedding 004", provider: "Google", providerKey: "gemini", ctx: "2K", speed: "fast", category: "general", cost: "free", note: "Embeddings", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  // ── xAI — Extended ───────────────────────────────────────────────────────────
  { id: "grok-3-fast", label: "Grok 3 Fast", provider: "xAI", providerKey: "xai", ctx: "131K", speed: "fast", category: "general", cost: "$$", hot: true, baseURL: "https://api.x.ai/v1" },
  { id: "grok-3-mini-fast", label: "Grok 3 Mini Fast", provider: "xAI", providerKey: "xai", ctx: "131K", speed: "fast", category: "reasoning", cost: "$", hot: true, baseURL: "https://api.x.ai/v1" },
  { id: "grok-2-vision-1212", label: "Grok 2 Vision", provider: "xAI", providerKey: "xai", ctx: "32K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://api.x.ai/v1" },
  { id: "grok-beta", label: "Grok Beta", provider: "xAI", providerKey: "xai", ctx: "131K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.x.ai/v1" },
  { id: "grok-vision-beta", label: "Grok Vision Beta", provider: "xAI", providerKey: "xai", ctx: "8K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://api.x.ai/v1" },
  // ── Mistral — Extended ───────────────────────────────────────────────────────
  { id: "mistral-large-2407", label: "Mistral Large 24.07", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.mistral.ai/v1" },
  { id: "mistral-medium-2312", label: "Mistral Medium", provider: "Mistral", providerKey: "mistral", ctx: "32K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.mistral.ai/v1" },
  { id: "mistral-small-2409", label: "Mistral Small 24.09", provider: "Mistral", providerKey: "mistral", ctx: "32K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.mistral.ai/v1" },
  { id: "open-mistral-7b", label: "Mistral 7B", provider: "Mistral", providerKey: "mistral", ctx: "32K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.mistral.ai/v1" },
  { id: "open-mixtral-8x7b", label: "Mixtral 8x7B", provider: "Mistral", providerKey: "mistral", ctx: "32K", speed: "medium", category: "general", cost: "$", baseURL: "https://api.mistral.ai/v1" },
  { id: "open-mixtral-8x22b", label: "Mixtral 8x22B", provider: "Mistral", providerKey: "mistral", ctx: "64K", speed: "slow", category: "general", cost: "$$", baseURL: "https://api.mistral.ai/v1" },
  { id: "mistral-nemo", label: "Mistral NeMo 12B", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://api.mistral.ai/v1" },
  { id: "pixtral-12b-2409", label: "Pixtral 12B", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "fast", category: "vision", cost: "$", baseURL: "https://api.mistral.ai/v1" },
  // ── Groq — Extended ──────────────────────────────────────────────────────────
  { id: "llama-3.1-70b-versatile", label: "Llama 3.1 70B", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.groq.com/openai/v1" },
  { id: "llama3-70b-8192", label: "Llama 3 70B", provider: "Groq", providerKey: "groq", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.groq.com/openai/v1" },
  { id: "llama3-8b-8192", label: "Llama 3 8B", provider: "Groq", providerKey: "groq", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.groq.com/openai/v1" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Groq)", provider: "Groq", providerKey: "groq", ctx: "32K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.groq.com/openai/v1" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B (Groq)", provider: "Groq", providerKey: "groq", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.groq.com/openai/v1" },
  { id: "gemma-7b-it", label: "Gemma 7B (Groq)", provider: "Groq", providerKey: "groq", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.groq.com/openai/v1" },
  { id: "whisper-large-v3", label: "Whisper Large v3 (Groq)", provider: "Groq", providerKey: "groq", ctx: "-", speed: "fast", category: "multimodal", cost: "free", note: "STT سريع", baseURL: "https://api.groq.com/openai/v1" },
  { id: "whisper-large-v3-turbo", label: "Whisper v3 Turbo (Groq)", provider: "Groq", providerKey: "groq", ctx: "-", speed: "fast", category: "multimodal", cost: "free", note: "STT أسرع", baseURL: "https://api.groq.com/openai/v1" },
  // ── DeepSeek — Extended ──────────────────────────────────────────────────────
  { id: "deepseek-coder", label: "DeepSeek Coder", provider: "DeepSeek", providerKey: "deepseek", ctx: "128K", speed: "medium", category: "code", cost: "$", baseURL: "https://api.deepseek.com/v1" },
  { id: "deepseek-vl2", label: "DeepSeek VL2", provider: "DeepSeek", providerKey: "deepseek", ctx: "4K", speed: "medium", category: "vision", cost: "$", baseURL: "https://api.deepseek.com/v1" },
  // ── Perplexity — Extended ─────────────────────────────────────────────────────
  { id: "llama-3.1-sonar-large-128k-online", label: "Sonar Large Online", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "medium", category: "general", cost: "$$", hot: true, note: "بحث ويب مباشر", baseURL: "https://api.perplexity.ai" },
  { id: "llama-3.1-sonar-small-128k-online", label: "Sonar Small Online", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "fast", category: "general", cost: "$", hot: true, note: "بحث ويب سريع", baseURL: "https://api.perplexity.ai" },
  { id: "llama-3.1-sonar-huge-128k-online", label: "Sonar Huge Online", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "slow", category: "general", cost: "$$$", hot: true, note: "بحث ويب عميق", baseURL: "https://api.perplexity.ai" },
  { id: "llama-3.1-sonar-large-128k-chat", label: "Sonar Large Chat", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.perplexity.ai" },
  { id: "llama-3.1-sonar-small-128k-chat", label: "Sonar Small Chat", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.perplexity.ai" },
  // ── Together AI — Extended ────────────────────────────────────────────────────
  { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B Turbo", provider: "Together", providerKey: "together", ctx: "128K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://api.together.xyz/v1" },
  { id: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo", label: "Llama 3.2 90B Vision", provider: "Together", providerKey: "together", ctx: "128K", speed: "medium", category: "vision", cost: "$$", hot: true, baseURL: "https://api.together.xyz/v1" },
  { id: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo", label: "Llama 3.2 11B Vision", provider: "Together", providerKey: "together", ctx: "128K", speed: "fast", category: "vision", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3 (Together)", provider: "Together", providerKey: "together", ctx: "128K", speed: "medium", category: "general", cost: "$", hot: true, baseURL: "https://api.together.xyz/v1" },
  { id: "deepseek-ai/DeepSeek-R1", label: "DeepSeek R1 (Together)", provider: "Together", providerKey: "together", ctx: "128K", speed: "slow", category: "reasoning", cost: "$", hot: true, baseURL: "https://api.together.xyz/v1" },
  { id: "Qwen/Qwen2.5-32B-Instruct-Turbo", label: "Qwen2.5 32B Turbo", provider: "Together", providerKey: "together", ctx: "32K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "Qwen/QwQ-32B-Preview", label: "QwQ 32B (Together)", provider: "Together", providerKey: "together", ctx: "32K", speed: "medium", category: "reasoning", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "mistralai/Mixtral-8x22B-Instruct-v0.1", label: "Mixtral 8x22B (Together)", provider: "Together", providerKey: "together", ctx: "65K", speed: "slow", category: "general", cost: "$$", baseURL: "https://api.together.xyz/v1" },
  { id: "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO", label: "Nous-Hermes-2 Mixtral", provider: "Together", providerKey: "together", ctx: "32K", speed: "medium", category: "uncensored", cost: "$", note: "Uncensored", baseURL: "https://api.together.xyz/v1" },
  { id: "cognitivecomputations/dolphin-2.9-mixtral-8x22b", label: "Dolphin 2.9 Mixtral 8x22B", provider: "Together", providerKey: "together", ctx: "65K", speed: "slow", category: "uncensored", cost: "$$", note: "Abliterated", baseURL: "https://api.together.xyz/v1" },
  { id: "WizardLM/WizardLM-2-8x22B", label: "WizardLM-2 8x22B", provider: "Together", providerKey: "together", ctx: "65K", speed: "slow", category: "general", cost: "$$", hot: true, baseURL: "https://api.together.xyz/v1" },
  { id: "zero-one-ai/Yi-34B-Chat", label: "Yi-34B Chat", provider: "Together", providerKey: "together", ctx: "4K", speed: "medium", category: "general", cost: "$", baseURL: "https://api.together.xyz/v1" },
  // ── Fireworks AI ──────────────────────────────────────────────────────────────
  { id: "accounts/fireworks/models/llama-v3p1-405b-instruct", label: "Llama 3.1 405B (Fireworks)", provider: "Fireworks", providerKey: "fireworks", ctx: "131K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://api.fireworks.ai/inference/v1" },
  { id: "accounts/fireworks/models/llama-v3p1-70b-instruct", label: "Llama 3.1 70B (Fireworks)", provider: "Fireworks", providerKey: "fireworks", ctx: "131K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.fireworks.ai/inference/v1" },
  { id: "accounts/fireworks/models/mixtral-8x22b-instruct", label: "Mixtral 8x22B (Fireworks)", provider: "Fireworks", providerKey: "fireworks", ctx: "65K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.fireworks.ai/inference/v1" },
  { id: "accounts/fireworks/models/qwen2p5-72b-instruct", label: "Qwen2.5 72B (Fireworks)", provider: "Fireworks", providerKey: "fireworks", ctx: "32K", speed: "medium", category: "general", cost: "$", hot: true, baseURL: "https://api.fireworks.ai/inference/v1" },
  { id: "accounts/fireworks/models/deepseek-v3", label: "DeepSeek V3 (Fireworks)", provider: "Fireworks", providerKey: "fireworks", ctx: "128K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://api.fireworks.ai/inference/v1" },
  { id: "accounts/fireworks/models/deepseek-r1", label: "DeepSeek R1 (Fireworks)", provider: "Fireworks", providerKey: "fireworks", ctx: "128K", speed: "medium", category: "reasoning", cost: "$", hot: true, baseURL: "https://api.fireworks.ai/inference/v1" },
  { id: "accounts/fireworks/models/firefunction-v2", label: "FireFunction v2", provider: "Fireworks", providerKey: "fireworks", ctx: "32K", speed: "fast", category: "agent", cost: "$", note: "Function calling", baseURL: "https://api.fireworks.ai/inference/v1" },
  // ── Cohere ────────────────────────────────────────────────────────────────────
  { id: "command-r-plus-08-2024", label: "Command R+ (Aug 2024)", provider: "Cohere", providerKey: "cohere", ctx: "128K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://api.cohere.com/v1" },
  { id: "command-r-08-2024", label: "Command R (Aug 2024)", provider: "Cohere", providerKey: "cohere", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.cohere.com/v1" },
  { id: "command-r-plus", label: "Command R+", provider: "Cohere", providerKey: "cohere", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.cohere.com/v1" },
  { id: "command-r", label: "Command R", provider: "Cohere", providerKey: "cohere", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.cohere.com/v1" },
  { id: "c4ai-aya-expanse-32b", label: "Aya Expanse 32B", provider: "Cohere", providerKey: "cohere", ctx: "128K", speed: "medium", category: "general", cost: "$$", hot: true, note: "متعدد اللغات", baseURL: "https://api.cohere.com/v1" },
  { id: "aya-23-35B", label: "Aya 23 35B", provider: "Cohere", providerKey: "cohere", ctx: "8K", speed: "medium", category: "general", cost: "$", baseURL: "https://api.cohere.com/v1" },
  // ── AI21 Labs ─────────────────────────────────────────────────────────────────
  { id: "jamba-1.5-large", label: "Jamba 1.5 Large", provider: "AI21 Labs", providerKey: "ai21", ctx: "256K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://api.ai21.com/studio/v1" },
  { id: "jamba-1.5-mini", label: "Jamba 1.5 Mini", provider: "AI21 Labs", providerKey: "ai21", ctx: "256K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://api.ai21.com/studio/v1" },
  { id: "jamba-instruct", label: "Jamba Instruct", provider: "AI21 Labs", providerKey: "ai21", ctx: "256K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.ai21.com/studio/v1" },
  { id: "j2-ultra", label: "Jurassic-2 Ultra", provider: "AI21 Labs", providerKey: "ai21", ctx: "8K", speed: "slow", category: "general", cost: "$$$", baseURL: "https://api.ai21.com/studio/v1" },
  { id: "j2-mid", label: "Jurassic-2 Mid", provider: "AI21 Labs", providerKey: "ai21", ctx: "8K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.ai21.com/studio/v1" },
  // ── NVIDIA NIM ────────────────────────────────────────────────────────────────
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "128K", speed: "medium", category: "reasoning", cost: "$$", hot: true, baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "nvidia/llama-3.1-nemotron-51b-instruct", label: "Nemotron 51B", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "nvidia/mistral-nemo-12b-instruct", label: "Mistral NeMo 12B (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "meta/llama-3.1-405b-instruct", label: "Llama 3.1 405B (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "128K", speed: "slow", category: "general", cost: "$$$", baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "google/gemma-2-27b-it", label: "Gemma 2 27B (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "8K", speed: "medium", category: "general", cost: "$", baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "microsoft/phi-3-medium-128k-instruct", label: "Phi-3 Medium 128K (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "128K", speed: "medium", category: "general", cost: "$", baseURL: "https://integrate.api.nvidia.com/v1" },
  // ── Qwen / Alibaba ────────────────────────────────────────────────────────────
  { id: "qwen-max", label: "Qwen Max", provider: "Qwen", providerKey: "openrouter", ctx: "32K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "qwen-plus", label: "Qwen Plus", provider: "Qwen", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "qwen-turbo", label: "Qwen Turbo", provider: "Qwen", providerKey: "openrouter", ctx: "8K", speed: "fast", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "qwen2.5-72b-instruct", label: "Qwen2.5 72B", provider: "Qwen", providerKey: "together", ctx: "128K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://api.together.xyz/v1" },
  { id: "qwen2.5-32b-instruct", label: "Qwen2.5 32B", provider: "Qwen", providerKey: "together", ctx: "32K", speed: "medium", category: "general", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "qwen2.5-coder-32b-instruct", label: "Qwen2.5 Coder 32B", provider: "Qwen", providerKey: "together", ctx: "32K", speed: "medium", category: "code", cost: "$", hot: true, note: "Code specialist", baseURL: "https://api.together.xyz/v1" },
  { id: "qwq-32b-preview", label: "QwQ 32B Preview", provider: "Qwen", providerKey: "groq", ctx: "32K", speed: "medium", category: "reasoning", cost: "free", hot: true, note: "Self-reflection reasoning", baseURL: "https://api.groq.com/openai/v1" },
  // ── 01.AI / Yi ────────────────────────────────────────────────────────────────
  { id: "yi-large", label: "Yi Large", provider: "01.AI", providerKey: "openrouter", ctx: "32K", speed: "medium", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "yi-large-turbo", label: "Yi Large Turbo", provider: "01.AI", providerKey: "openrouter", ctx: "16K", speed: "fast", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "yi-medium-200k", label: "Yi Medium 200K", provider: "01.AI", providerKey: "openrouter", ctx: "200K", speed: "slow", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  // ── Zhipu AI ──────────────────────────────────────────────────────────────────
  { id: "glm-4-plus", label: "GLM-4 Plus", provider: "Zhipu AI", providerKey: "zhipu", ctx: "128K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://open.bigmodel.cn/api/paas/v4" },
  { id: "glm-4", label: "GLM-4", provider: "Zhipu AI", providerKey: "zhipu", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://open.bigmodel.cn/api/paas/v4" },
  { id: "glm-4-air", label: "GLM-4 Air", provider: "Zhipu AI", providerKey: "zhipu", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://open.bigmodel.cn/api/paas/v4" },
  { id: "glm-4-flash", label: "GLM-4 Flash", provider: "Zhipu AI", providerKey: "zhipu", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://open.bigmodel.cn/api/paas/v4" },
  { id: "glm-4v-plus", label: "GLM-4V Plus", provider: "Zhipu AI", providerKey: "zhipu", ctx: "8K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://open.bigmodel.cn/api/paas/v4" },
  { id: "glm-3-turbo", label: "GLM-3 Turbo", provider: "Zhipu AI", providerKey: "zhipu", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://open.bigmodel.cn/api/paas/v4" },
  // ── Moonshot AI ──────────────────────────────────────────────────────────────
  { id: "moonshot-v1-8k", label: "Moonshot v1 8K", provider: "Moonshot AI", providerKey: "moonshot", ctx: "8K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.moonshot.cn/v1" },
  { id: "moonshot-v1-32k", label: "Moonshot v1 32K", provider: "Moonshot AI", providerKey: "moonshot", ctx: "32K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.moonshot.cn/v1" },
  { id: "moonshot-v1-128k", label: "Moonshot v1 128K", provider: "Moonshot AI", providerKey: "moonshot", ctx: "128K", speed: "slow", category: "general", cost: "$$$", hot: true, baseURL: "https://api.moonshot.cn/v1" },
  // ── MiniMax ───────────────────────────────────────────────────────────────────
  { id: "MiniMax-Text-01", label: "MiniMax Text-01", provider: "MiniMax", providerKey: "minimax", ctx: "1M", speed: "medium", category: "general", cost: "$$", hot: true, note: "1M context", baseURL: "https://api.minimax.chat/v1" },
  { id: "abab6.5s-chat", label: "ABAB 6.5s Chat", provider: "MiniMax", providerKey: "minimax", ctx: "245K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.minimax.chat/v1" },
  { id: "MiniMax-VL-01", label: "MiniMax VL-01", provider: "MiniMax", providerKey: "minimax", ctx: "512K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://api.minimax.chat/v1" },
  // ── Stepfun ───────────────────────────────────────────────────────────────────
  { id: "step-2-16k", label: "Step-2 16K", provider: "Stepfun", providerKey: "stepfun", ctx: "16K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://api.stepfun.com/v1" },
  { id: "step-1-256k", label: "Step-1 256K", provider: "Stepfun", providerKey: "stepfun", ctx: "256K", speed: "slow", category: "general", cost: "$$$", hot: true, note: "Ultra long context", baseURL: "https://api.stepfun.com/v1" },
  { id: "step-1-128k", label: "Step-1 128K", provider: "Stepfun", providerKey: "stepfun", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.stepfun.com/v1" },
  { id: "step-1v-8k", label: "Step-1V 8K", provider: "Stepfun", providerKey: "stepfun", ctx: "8K", speed: "fast", category: "vision", cost: "$", baseURL: "https://api.stepfun.com/v1" },
  // ── Tencent Hunyuan ───────────────────────────────────────────────────────────
  { id: "hunyuan-large", label: "Hunyuan Large", provider: "Tencent Hunyuan", providerKey: "hunyuan", ctx: "32K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://hunyuan.cloud.tencent.com/v1" },
  { id: "hunyuan-turbos-latest", label: "Hunyuan Turbos", provider: "Tencent Hunyuan", providerKey: "hunyuan", ctx: "32K", speed: "fast", category: "general", cost: "$", baseURL: "https://hunyuan.cloud.tencent.com/v1" },
  { id: "hunyuan-vision", label: "Hunyuan Vision", provider: "Tencent Hunyuan", providerKey: "hunyuan", ctx: "8K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://hunyuan.cloud.tencent.com/v1" },
  { id: "hunyuan-code", label: "Hunyuan Code", provider: "Tencent Hunyuan", providerKey: "hunyuan", ctx: "8K", speed: "medium", category: "code", cost: "$", baseURL: "https://hunyuan.cloud.tencent.com/v1" },
  // ── ByteDance Doubao ──────────────────────────────────────────────────────────
  { id: "Doubao-pro-128k", label: "Doubao Pro 128K", provider: "ByteDance Doubao", providerKey: "doubao", ctx: "128K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://ark.cn-beijing.volces.com/api/v3" },
  { id: "Doubao-pro-32k", label: "Doubao Pro 32K", provider: "ByteDance Doubao", providerKey: "doubao", ctx: "32K", speed: "fast", category: "general", cost: "$", baseURL: "https://ark.cn-beijing.volces.com/api/v3" },
  { id: "Doubao-lite-128k", label: "Doubao Lite 128K", provider: "ByteDance Doubao", providerKey: "doubao", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://ark.cn-beijing.volces.com/api/v3" },
  { id: "Skylark2-pro-4k", label: "Skylark2 Pro 4K", provider: "ByteDance Doubao", providerKey: "doubao", ctx: "4K", speed: "fast", category: "general", cost: "$", baseURL: "https://ark.cn-beijing.volces.com/api/v3" },
  // ── Naver HyperCLOVA X ────────────────────────────────────────────────────────
  { id: "HCX-DASH-001", label: "HyperCLOVA X DASH", provider: "Naver HyperCLOVA X", providerKey: "clova", ctx: "4K", speed: "fast", category: "general", cost: "$", baseURL: "https://clovastudio.stream.ntruss.com/testapp/v1" },
  { id: "HCX-003", label: "HyperCLOVA X 003", provider: "Naver HyperCLOVA X", providerKey: "clova", ctx: "4K", speed: "medium", category: "general", cost: "$$", baseURL: "https://clovastudio.stream.ntruss.com/testapp/v1" },
  // ── Hugging Face (Featured) ────────────────────────────────────────────────────
  { id: "bigscience/bloom", label: "BLOOM 176B", provider: "Hugging Face", providerKey: "huggingface", ctx: "2K", speed: "slow", category: "general", cost: "free", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "bigcode/starcoder2-33b", label: "StarCoder2 33B", provider: "Hugging Face", providerKey: "huggingface", ctx: "16K", speed: "medium", category: "code", cost: "free", hot: true, baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "tiiuae/falcon-180B", label: "Falcon 180B", provider: "Hugging Face", providerKey: "huggingface", ctx: "4K", speed: "slow", category: "general", cost: "free", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "HuggingFaceH4/zephyr-7b-beta", label: "Zephyr 7B Beta", provider: "Hugging Face", providerKey: "huggingface", ctx: "4K", speed: "fast", category: "general", cost: "free", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "openchat/openchat-3.5-0106", label: "OpenChat 3.5", provider: "Hugging Face", providerKey: "huggingface", ctx: "8K", speed: "fast", category: "general", cost: "free", hot: true, baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "teknium/OpenHermes-2.5-Mistral-7B", label: "OpenHermes-2.5 Mistral 7B", provider: "Hugging Face", providerKey: "huggingface", ctx: "8K", speed: "fast", category: "uncensored", cost: "free", note: "Uncensored", baseURL: "https://api-inference.huggingface.co/models/" },
  // ── Meta Llama (via Together/Fireworks) ────────────────────────────────────────
  { id: "meta-llama/Llama-3.2-3B-Instruct-Turbo", label: "Llama 3.2 3B", provider: "Together", providerKey: "together", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.together.xyz/v1" },
  { id: "meta-llama/Llama-3.2-1B-Instruct-Turbo", label: "Llama 3.2 1B", provider: "Together", providerKey: "together", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.together.xyz/v1" },
  { id: "meta-llama/Llama-2-70b-chat-hf", label: "Llama 2 70B Chat", provider: "Together", providerKey: "together", ctx: "4K", speed: "slow", category: "general", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "meta-llama/CodeLlama-70b-Instruct-hf", label: "CodeLlama 70B", provider: "Together", providerKey: "together", ctx: "16K", speed: "slow", category: "code", cost: "$$", baseURL: "https://api.together.xyz/v1" },
  // ── Microsoft Phi ─────────────────────────────────────────────────────────────
  { id: "microsoft/phi-4", label: "Phi-4", provider: "GitHub Models", providerKey: "github", ctx: "16K", speed: "fast", category: "general", cost: "free", hot: true, baseURL: "https://models.inference.ai.azure.com" },
  { id: "microsoft/phi-3.5-moe-instruct", label: "Phi-3.5 MoE", provider: "GitHub Models", providerKey: "github", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "https://models.inference.ai.azure.com" },
  { id: "microsoft/phi-3.5-vision-instruct", label: "Phi-3.5 Vision", provider: "GitHub Models", providerKey: "github", ctx: "128K", speed: "medium", category: "vision", cost: "free", baseURL: "https://models.inference.ai.azure.com" },
  { id: "microsoft/phi-3.5-mini-instruct", label: "Phi-3.5 Mini", provider: "GitHub Models", providerKey: "github", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://models.inference.ai.azure.com" },
  // ── Image Generation Providers ────────────────────────────────────────────────
  { id: "stability/stable-diffusion-3-5-large", label: "SDXL 3.5 Large", provider: "Stability AI", providerKey: "openrouter", ctx: "-", speed: "slow", category: "multimodal", cost: "$$", note: "Image gen", baseURL: "https://openrouter.ai/api/v1" },
  { id: "black-forest-labs/flux-1.1-pro-ultra", label: "Flux 1.1 Pro Ultra", provider: "Black Forest Labs", providerKey: "openrouter", ctx: "-", speed: "medium", category: "multimodal", cost: "$$", hot: true, note: "Image gen", baseURL: "https://openrouter.ai/api/v1" },
  { id: "black-forest-labs/flux-pro", label: "Flux Pro", provider: "Black Forest Labs", providerKey: "openrouter", ctx: "-", speed: "medium", category: "multimodal", cost: "$$", note: "Image gen", baseURL: "https://openrouter.ai/api/v1" },
  { id: "black-forest-labs/flux-schnell", label: "Flux Schnell", provider: "Black Forest Labs", providerKey: "openrouter", ctx: "-", speed: "fast", category: "multimodal", cost: "$", note: "Image gen fast", baseURL: "https://openrouter.ai/api/v1" },
  // ── OpenRouter — Extra Models ─────────────────────────────────────────────────
  { id: "openai/o1", label: "o1 (OpenRouter)", provider: "OpenRouter", providerKey: "openrouter", ctx: "200K", speed: "slow", category: "reasoning", cost: "$$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "openai/o3-mini", label: "o3-mini (OpenRouter)", provider: "OpenRouter", providerKey: "openrouter", ctx: "200K", speed: "medium", category: "reasoning", cost: "$$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet (OR)", provider: "OpenRouter", providerKey: "openrouter", ctx: "200K", speed: "medium", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "microsoft/phi-4", label: "Phi-4 (OpenRouter)", provider: "OpenRouter", providerKey: "openrouter", ctx: "16K", speed: "fast", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/codestral-2501", label: "Codestral 2501 (OR)", provider: "OpenRouter", providerKey: "openrouter", ctx: "256K", speed: "fast", category: "code", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "perplexity/sonar-deep-research", label: "Sonar Deep Research", provider: "OpenRouter", providerKey: "openrouter", ctx: "127K", speed: "slow", category: "general", cost: "$$$", hot: true, new: true, note: "ساعات بحث في ثوانٍ", baseURL: "https://openrouter.ai/api/v1" },
  // ── Local Models ──────────────────────────────────────────────────────────────
  { id: "ollama/dolphin-mixtral", label: "Dolphin Mixtral (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "32K", speed: "fast", category: "uncensored", cost: "free", hot: true, note: "Local uncensored", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/llama3.3", label: "Llama 3.3 70B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "slow", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/deepseek-r1", label: "DeepSeek-R1 (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "slow", category: "reasoning", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/mistral", label: "Mistral 7B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "32K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/gemma2", label: "Gemma 2 9B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/qwen2.5", label: "Qwen2.5 (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/phi4", label: "Phi-4 (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "16K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/codellama", label: "CodeLlama (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "16K", speed: "medium", category: "code", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/llama3.2-vision", label: "Llama 3.2 Vision (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "8K", speed: "medium", category: "vision", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "lmstudio/dolphin-2.9-llama3-8b", label: "Dolphin 2.9 8B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "8K", speed: "fast", category: "uncensored", cost: "free", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/mistral-7b-instruct-v0.2", label: "Mistral 7B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "32K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/qwen2.5-72b-instruct", label: "Qwen2.5 72B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "128K", speed: "slow", category: "general", cost: "free", baseURL: "http://localhost:1234/v1" },
  { id: "vllm/meta-llama-3.1-70b", label: "Llama 3.1 70B (vLLM)", provider: "vLLM", providerKey: "vllm", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:8000/v1" },
  // ── Custom local endpoints ────────────────────────────────────────────────────
  { id: "custom/any-model", label: "Custom Model Endpoint", provider: "Custom", providerKey: "custom", ctx: "∞", speed: "fast", category: "general", cost: "free", note: "OpenAI-compatible", baseURL: "" },
  // ── Ollama — Extended Local Models ────────────────────────────────────────────
  { id: "ollama/llama4:scout", label: "Llama 4 Scout (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "10M", speed: "slow", category: "multimodal", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/llama4:maverick", label: "Llama 4 Maverick (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "1M", speed: "slow", category: "multimodal", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/llama3.2:3b", label: "Llama 3.2 3B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/llama3.3:70b", label: "Llama 3.3 70B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "slow", category: "general", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/deepseek-r1:70b", label: "DeepSeek-R1 70B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "slow", category: "reasoning", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/deepseek-r1:32b", label: "DeepSeek-R1 32B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "medium", category: "reasoning", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/deepseek-v3", label: "DeepSeek V3 (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "64K", speed: "medium", category: "general", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/qwen2.5:72b", label: "Qwen2.5 72B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "slow", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/qwen2.5:32b", label: "Qwen2.5 32B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/qwen2.5-coder:32b", label: "Qwen2.5 Coder 32B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "32K", speed: "medium", category: "code", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/qwq:32b", label: "QwQ 32B Reasoning (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "32K", speed: "medium", category: "reasoning", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/dolphin3:8b", label: "Dolphin 3.0 8B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "fast", category: "uncensored", cost: "free", hot: true, note: "Uncensored", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/dolphin-llama3:70b", label: "Dolphin Llama3 70B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "8K", speed: "slow", category: "uncensored", cost: "free", note: "Uncensored 70B", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/mistral-small3.1:24b", label: "Mistral Small 3.1 24B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "medium", category: "general", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/phi4:14b", label: "Phi-4 14B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "16K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/phi4-mini:3.8b", label: "Phi-4 Mini (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "16K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/granite3.2:8b", label: "Granite 3.2 8B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/devstral:24b", label: "Devstral 24B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "medium", category: "code", cost: "free", hot: true, baseURL: "http://localhost:11434/v1" },
  { id: "ollama/gemma3:27b", label: "Gemma 3 27B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/gemma3:12b", label: "Gemma 3 12B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/llava:34b", label: "LLaVA 34B Vision (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "4K", speed: "slow", category: "vision", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/llava:13b", label: "LLaVA 13B Vision (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "4K", speed: "medium", category: "vision", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/moondream:1.8b", label: "Moondream 1.8B Vision (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "4K", speed: "fast", category: "vision", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/bakllava:7b", label: "BakLLaVA 7B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "4K", speed: "fast", category: "vision", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/nomic-embed-text", label: "Nomic Embed Text (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "8K", speed: "fast", category: "general", cost: "free", note: "Embeddings", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/mxbai-embed-large", label: "MxBai Embed Large (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "512", speed: "fast", category: "general", cost: "free", note: "Embeddings", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/smollm2:1.7b", label: "SmolLM2 1.7B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "8K", speed: "fast", category: "general", cost: "free", note: "Tiny on-device model", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/internlm3:8b", label: "InternLM3 8B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "32K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/aya-expanse:32b", label: "Aya Expanse 32B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "medium", category: "general", cost: "free", note: "Multilingual", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/solar-pro:22b", label: "Solar Pro 22B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "4K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/command-r:35b", label: "Command R 35B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/command-r-plus:104b", label: "Command R+ 104B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "128K", speed: "slow", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/wizardlm2:8x22b", label: "WizardLM2 8x22B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "64K", speed: "slow", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/falcon3:10b", label: "Falcon 3 10B (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "32K", speed: "fast", category: "general", cost: "free", baseURL: "http://localhost:11434/v1" },
  { id: "ollama/bge-large", label: "BGE Large Embed (Ollama)", provider: "Ollama", providerKey: "ollama", ctx: "512", speed: "fast", category: "general", cost: "free", note: "Embeddings", baseURL: "http://localhost:11434/v1" },
  // ── LM Studio — Extended ──────────────────────────────────────────────────────
  { id: "lmstudio/llama-3.3-70b-instruct", label: "Llama 3.3 70B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "128K", speed: "slow", category: "general", cost: "free", hot: true, baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/deepseek-r1-distill-qwen-14b", label: "DeepSeek-R1 Qwen 14B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "32K", speed: "medium", category: "reasoning", cost: "free", hot: true, baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/deepseek-r1-distill-llama-8b", label: "DeepSeek-R1 Llama 8B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "32K", speed: "fast", category: "reasoning", cost: "free", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/gemma-3-27b-it", label: "Gemma 3 27B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/phi-4", label: "Phi-4 (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "16K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/qwen2.5-coder-32b-instruct", label: "Qwen2.5 Coder 32B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "32K", speed: "medium", category: "code", cost: "free", hot: true, baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/dolphin3.0-llama3.2-3b", label: "Dolphin 3.0 3B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "128K", speed: "fast", category: "uncensored", cost: "free", note: "Uncensored", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/dolphin3.0-r1-mistral-24b", label: "Dolphin R1 Mistral 24B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "32K", speed: "medium", category: "uncensored", cost: "free", note: "Uncensored reasoning", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/eva-llama-3.33-70b", label: "EVA Llama 3.33 70B (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "128K", speed: "slow", category: "uncensored", cost: "free", note: "Abliterated", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/llava-1.6-mistral-7b", label: "LLaVA 1.6 7B Vision (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "32K", speed: "fast", category: "vision", cost: "free", baseURL: "http://localhost:1234/v1" },
  { id: "lmstudio/devstral-small-2505", label: "Devstral Small (LM Studio)", provider: "LM Studio", providerKey: "lmstudio", ctx: "128K", speed: "medium", category: "code", cost: "free", hot: true, baseURL: "http://localhost:1234/v1" },
  // ── vLLM ──────────────────────────────────────────────────────────────────────
  { id: "vllm/deepseek-r1-671b", label: "DeepSeek-R1 671B (vLLM)", provider: "vLLM", providerKey: "vllm", ctx: "128K", speed: "slow", category: "reasoning", cost: "free", hot: true, note: "Full R1 — GPU cluster", baseURL: "http://localhost:8000/v1" },
  { id: "vllm/llama-3.1-405b-instruct", label: "Llama 3.1 405B (vLLM)", provider: "vLLM", providerKey: "vllm", ctx: "128K", speed: "slow", category: "general", cost: "free", baseURL: "http://localhost:8000/v1" },
  { id: "vllm/mixtral-8x22b-instruct", label: "Mixtral 8x22B (vLLM)", provider: "vLLM", providerKey: "vllm", ctx: "64K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:8000/v1" },
  { id: "vllm/qwen2.5-72b-instruct", label: "Qwen2.5 72B (vLLM)", provider: "vLLM", providerKey: "vllm", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "http://localhost:8000/v1" },
  // ── OpenRouter — Community Models ─────────────────────────────────────────────
  { id: "microsoft/phi-4", label: "Phi-4 14B", provider: "OpenRouter", providerKey: "openrouter", ctx: "16K", speed: "medium", category: "general", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "microsoft/phi-3.5-mini-128k-instruct", label: "Phi-3.5 Mini 128K", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "microsoft/phi-3-medium-128k-instruct", label: "Phi-3 Medium 128K", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "amazon/nova-pro-v1", label: "Amazon Nova Pro", provider: "OpenRouter", providerKey: "openrouter", ctx: "300K", speed: "medium", category: "multimodal", cost: "$$", hot: true, new: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "amazon/nova-lite-v1", label: "Amazon Nova Lite", provider: "OpenRouter", providerKey: "openrouter", ctx: "300K", speed: "fast", category: "multimodal", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "amazon/nova-micro-v1", label: "Amazon Nova Micro", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "databricks/dbrx-instruct", label: "DBRX Instruct", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "medium", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "liquid/lfm-40b", label: "LFM 40B (Liquid AI)", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "medium", category: "general", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "liquid/lfm-7b", label: "LFM 7B (Liquid AI)", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "fast", category: "general", cost: "free", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "inflection/inflection-3-pi", label: "Inflection Pi 3", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "medium", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "writer/palmyra-x-004", label: "Palmyra X 004", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "allenai/llama-3.1-tulu-3-405b", label: "Tulu 3 405B", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "slow", category: "general", cost: "$$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "openchat/openchat-3.6-8b", label: "OpenChat 3.6 8B", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "teknium/openhermes-2.5-mistral-7b", label: "OpenHermes 2.5 Mistral 7B", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "huggingfaceh4/zephyr-7b-beta:free", label: "Zephyr 7B Beta", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "gryphe/mythomax-l2-13b", label: "MythoMax L2 13B", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "fast", category: "uncensored", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "sao10k/l3-euryale-70b", label: "Euryale 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "slow", category: "uncensored", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "sophosympatheia/midnight-rose-70b", label: "Midnight Rose 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "slow", category: "uncensored", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "cognitivecomputations/dolphin-2.9.2-qwen2-72b", label: "Dolphin 2.9.2 Qwen2 72B", provider: "OpenRouter", providerKey: "openrouter", ctx: "131K", speed: "slow", category: "uncensored", cost: "$$", hot: true, note: "Abliterated", baseURL: "https://openrouter.ai/api/v1" },
  { id: "neversleep/llama-3.1-lumimaid-70b", label: "Lumimaid 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "slow", category: "uncensored", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "jondurbin/airoboros-l2-70b", label: "Airoboros L2 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "slow", category: "uncensored", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "undi95/toppy-m-7b:free", label: "Toppy M 7B (Free)", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "fast", category: "uncensored", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "nousresearch/nous-capybara-7b:free", label: "Nous Capybara 7B", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "nousresearch/hermes-2-pro-llama-3-8b", label: "Hermes 2 Pro Llama3 8B", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "fast", category: "agent", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "nousresearch/hermes-2-theta-llama-3-70b", label: "Hermes 2 Theta 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "slow", category: "agent", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "google/gemma-2-9b-it:free", label: "Gemma 2 9B (Free)", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "google/gemma-3-12b-it", label: "Gemma 3 12B", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "google/gemma-3-4b-it:free", label: "Gemma 3 4B (Free)", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "general", cost: "free", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "meta-llama/llama-3-70b-instruct", label: "Llama 3 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "medium", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "meta-llama/llama-3-8b-instruct:free", label: "Llama 3 8B (Free)", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Free)", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/mixtral-8x7b-instruct", label: "Mixtral 8x7B", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "medium", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/mistral-nemo:free", label: "Mistral NeMo (Free)", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "general", cost: "free", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/devstral-small:free", label: "Devstral Small (Free)", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "code", cost: "free", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/codestral-mamba", label: "Codestral Mamba", provider: "OpenRouter", providerKey: "openrouter", ctx: "256K", speed: "fast", category: "code", cost: "$", note: "Mamba SSM architecture", baseURL: "https://openrouter.ai/api/v1" },
  { id: "mistralai/pixtral-12b", label: "Pixtral 12B", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "vision", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "anthracite-org/magnum-v4-72b", label: "Magnum v4 72B", provider: "OpenRouter", providerKey: "openrouter", ctx: "16K", speed: "slow", category: "uncensored", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "deepseek/deepseek-r1-distill-qwen-32b", label: "DeepSeek R1 Distill Qwen 32B", provider: "OpenRouter", providerKey: "openrouter", ctx: "64K", speed: "medium", category: "reasoning", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "deepseek/deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill Llama 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "reasoning", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "deepseek/deepseek-prover-v2", label: "DeepSeek Prover V2", provider: "OpenRouter", providerKey: "openrouter", ctx: "164K", speed: "slow", category: "reasoning", cost: "$$", hot: true, new: true, note: "Math reasoning", baseURL: "https://openrouter.ai/api/v1" },
  { id: "nvidia/llama-3.1-nemotron-ultra-253b:free", label: "Nemotron Ultra 253B (Free)", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "slow", category: "reasoning", cost: "free", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "nvidia/nemotron-mini-4b-instruct", label: "Nemotron Mini 4B", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "fast", category: "general", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "sao10k/l3.3-euryale-70b", label: "Euryale v2 70B", provider: "OpenRouter", providerKey: "openrouter", ctx: "131K", speed: "slow", category: "uncensored", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "01-ai/yi-large", label: "Yi Large", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "medium", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "01-ai/yi-34b-chat", label: "Yi 34B Chat", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "medium", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "cohere/command-r-plus-08-2024", label: "Command R+ Aug 2024", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "cohere/command-r7b-12-2024", label: "Command R7B", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "pygmalionai/mythalion-13b", label: "Mythalion 13B", provider: "OpenRouter", providerKey: "openrouter", ctx: "4K", speed: "medium", category: "uncensored", cost: "free", baseURL: "https://openrouter.ai/api/v1" },
  { id: "x-ai/grok-2-vision-1212", label: "Grok 2 Vision", provider: "OpenRouter", providerKey: "openrouter", ctx: "32K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "x-ai/grok-vision-beta", label: "Grok Vision Beta", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "anthropic/claude-3-haiku:beta", label: "Claude 3 Haiku (Uncensored)", provider: "OpenRouter", providerKey: "openrouter", ctx: "200K", speed: "fast", category: "uncensored", cost: "$", note: "Beta — no refusals", baseURL: "https://openrouter.ai/api/v1" },
  { id: "anthropic/claude-3-opus:beta", label: "Claude 3 Opus (Uncensored)", provider: "OpenRouter", providerKey: "openrouter", ctx: "200K", speed: "slow", category: "uncensored", cost: "$$$", note: "Beta — no refusals", baseURL: "https://openrouter.ai/api/v1" },
  { id: "anthropic/claude-3.5-sonnet:beta", label: "Claude 3.5 Sonnet (Uncensored)", provider: "OpenRouter", providerKey: "openrouter", ctx: "200K", speed: "medium", category: "uncensored", cost: "$$", note: "Beta — no refusals", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "openai/gpt-4o:extended", label: "GPT-4o Extended (OpenRouter)", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "multimodal", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "minimax/minimax-01", label: "MiniMax-01", provider: "OpenRouter", providerKey: "openrouter", ctx: "1M", speed: "medium", category: "general", cost: "$", hot: true, baseURL: "https://openrouter.ai/api/v1" },
  { id: "moonshotai/moonshot-v1-8k", label: "Moonshot v1 8K (OpenRouter)", provider: "OpenRouter", providerKey: "openrouter", ctx: "8K", speed: "fast", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "baidu/ernie-4.5-turbo-128k", label: "ERNIE 4.5 Turbo 128K", provider: "OpenRouter", providerKey: "openrouter", ctx: "128K", speed: "medium", category: "general", cost: "$", baseURL: "https://openrouter.ai/api/v1" },
  { id: "stepfun/step-2-16k", label: "Step-2 16K", provider: "OpenRouter", providerKey: "openrouter", ctx: "16K", speed: "medium", category: "general", cost: "$$", baseURL: "https://openrouter.ai/api/v1" },
  // ── Anthropic — Extended ──────────────────────────────────────────────────────
  { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-3-opus-20240229", label: "Claude 3 Opus", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "slow", category: "general", cost: "$$$", baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku Latest", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://api.anthropic.com/v1" },
  { id: "claude-opus-4-0", label: "Claude Opus 4.0", provider: "Anthropic", providerKey: "anthropic", ctx: "200K", speed: "slow", category: "think", cost: "$$$", hot: true, new: true, note: "Max reasoning", baseURL: "https://api.anthropic.com/v1" },
  // ── Google — Extended ─────────────────────────────────────────────────────────
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "fast", category: "multimodal", cost: "free", hot: true, baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "fast", category: "multimodal", cost: "$", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B", provider: "Google", providerKey: "gemini", ctx: "1M", speed: "fast", category: "multimodal", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-3-27b-it", label: "Gemma 3 27B", provider: "Google", providerKey: "gemini", ctx: "128K", speed: "medium", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-3-12b-it", label: "Gemma 3 12B", provider: "Google", providerKey: "gemini", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-3-4b-it", label: "Gemma 3 4B", provider: "Google", providerKey: "gemini", ctx: "128K", speed: "fast", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-3-1b-it", label: "Gemma 3 1B (Tiny)", provider: "Google", providerKey: "gemini", ctx: "32K", speed: "fast", category: "general", cost: "free", note: "On-device", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-2-9b-it", label: "Gemma 2 9B", provider: "Google", providerKey: "gemini", ctx: "8K", speed: "fast", category: "general", cost: "free", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "gemma-2-2b-it", label: "Gemma 2 2B", provider: "Google", providerKey: "gemini", ctx: "8K", speed: "fast", category: "general", cost: "free", note: "Tiny", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "text-embedding-004", label: "Text Embedding 004", provider: "Google", providerKey: "gemini", ctx: "2K", speed: "fast", category: "general", cost: "free", note: "Embeddings", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  // ── xAI — Extended ────────────────────────────────────────────────────────────
  { id: "grok-3-fast-beta", label: "Grok 3 Fast Beta", provider: "xAI", providerKey: "xai", ctx: "131K", speed: "fast", category: "general", cost: "$$", hot: true, baseURL: "https://api.x.ai/v1" },
  { id: "grok-3-mini-fast-beta", label: "Grok 3 Mini Fast", provider: "xAI", providerKey: "xai", ctx: "131K", speed: "fast", category: "reasoning", cost: "$", hot: true, baseURL: "https://api.x.ai/v1" },
  { id: "grok-2-vision-1212", label: "Grok 2 Vision", provider: "xAI", providerKey: "xai", ctx: "32K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://api.x.ai/v1" },
  // ── Mistral — Extended ────────────────────────────────────────────────────────
  { id: "mistral-medium-latest", label: "Mistral Medium Latest", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.mistral.ai/v1" },
  { id: "mistral-small-latest", label: "Mistral Small Latest", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "fast", category: "general", cost: "$", hot: true, baseURL: "https://api.mistral.ai/v1" },
  { id: "devstral-small-latest", label: "Devstral Small (Coding)", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "medium", category: "code", cost: "$", hot: true, new: true, baseURL: "https://api.mistral.ai/v1" },
  { id: "mistral-embed", label: "Mistral Embed", provider: "Mistral", providerKey: "mistral", ctx: "8K", speed: "fast", category: "general", cost: "$", note: "Embeddings", baseURL: "https://api.mistral.ai/v1" },
  { id: "open-mistral-nemo", label: "Mistral NeMo Open", provider: "Mistral", providerKey: "mistral", ctx: "128K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.mistral.ai/v1" },
  { id: "open-mixtral-8x22b", label: "Mixtral 8x22B", provider: "Mistral", providerKey: "mistral", ctx: "64K", speed: "slow", category: "general", cost: "$$", baseURL: "https://api.mistral.ai/v1" },
  { id: "open-mixtral-8x7b", label: "Mixtral 8x7B", provider: "Mistral", providerKey: "mistral", ctx: "32K", speed: "medium", category: "general", cost: "$", baseURL: "https://api.mistral.ai/v1" },
  // ── Hugging Face Featured ─────────────────────────────────────────────────────
  { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", label: "Llama 3.1 70B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "128K", speed: "medium", category: "general", cost: "$", hot: true, baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B v0.3 (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "32K", speed: "fast", category: "general", cost: "$", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "tiiuae/falcon-40b-instruct", label: "Falcon 40B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "2K", speed: "slow", category: "general", cost: "$", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "bigscience/bloom", label: "BLOOM 176B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "2K", speed: "slow", category: "general", cost: "$$", note: "Multilingual 176B", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "EleutherAI/gpt-neox-20b", label: "GPT-NeoX 20B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "2K", speed: "medium", category: "general", cost: "$", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "Salesforce/xgen-7b-8k-inst", label: "XGen 7B 8K (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "8K", speed: "fast", category: "general", cost: "$", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "stabilityai/stablelm-2-12b-chat", label: "StableLM 2 12B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "4K", speed: "medium", category: "general", cost: "$", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "WizardLM/WizardLM-70B-V1.0", label: "WizardLM 70B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "4K", speed: "slow", category: "general", cost: "$", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "codellama/CodeLlama-34b-Instruct-hf", label: "CodeLlama 34B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "16K", speed: "medium", category: "code", cost: "$", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "Phind/Phind-CodeLlama-34B-v2", label: "Phind CodeLlama 34B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "16K", speed: "medium", category: "code", cost: "$", note: "Code specialist", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "HuggingFaceH4/starchat2-15b-v0.1", label: "StarChat2 15B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "16K", speed: "medium", category: "code", cost: "$", baseURL: "https://api-inference.huggingface.co/models/" },
  { id: "deepseek-ai/deepseek-coder-33b-instruct", label: "DeepSeek Coder 33B (HF)", provider: "Hugging Face", providerKey: "huggingface", ctx: "16K", speed: "medium", category: "code", cost: "$", hot: true, baseURL: "https://api-inference.huggingface.co/models/" },
  // ── MiniMax ───────────────────────────────────────────────────────────────────
  { id: "MiniMax-Text-01", label: "MiniMax Text-01", provider: "MiniMax", providerKey: "minimax", ctx: "1M", speed: "medium", category: "general", cost: "$$", hot: true, note: "1M context window", baseURL: "https://api.minimax.chat/v1" },
  { id: "abab6.5-chat", label: "ABAB 6.5 Chat", provider: "MiniMax", providerKey: "minimax", ctx: "245K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.minimax.chat/v1" },
  { id: "abab6.5g-chat", label: "ABAB 6.5G Chat", provider: "MiniMax", providerKey: "minimax", ctx: "8K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.minimax.chat/v1" },
  // ── Stepfun ───────────────────────────────────────────────────────────────────
  { id: "step-2-16k-chat", label: "Step-2 16K Chat", provider: "Stepfun", providerKey: "stepfun", ctx: "16K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.stepfun.com/v1" },
  { id: "step-1-8k", label: "Step-1 8K", provider: "Stepfun", providerKey: "stepfun", ctx: "8K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.stepfun.com/v1" },
  { id: "step-1v-8k", label: "Step-1V 8K (Vision)", provider: "Stepfun", providerKey: "stepfun", ctx: "8K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://api.stepfun.com/v1" },
  // ── Tencent Hunyuan ───────────────────────────────────────────────────────────
  { id: "hunyuan-turbo", label: "Hunyuan Turbo", provider: "Tencent Hunyuan", providerKey: "hunyuan", ctx: "32K", speed: "fast", category: "general", cost: "$$", baseURL: "https://api.hunyuan.cloud.tencent.com/v1" },
  { id: "hunyuan-pro", label: "Hunyuan Pro", provider: "Tencent Hunyuan", providerKey: "hunyuan", ctx: "32K", speed: "medium", category: "general", cost: "$$$", hot: true, baseURL: "https://api.hunyuan.cloud.tencent.com/v1" },
  { id: "hunyuan-lite", label: "Hunyuan Lite", provider: "Tencent Hunyuan", providerKey: "hunyuan", ctx: "256K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.hunyuan.cloud.tencent.com/v1" },
  { id: "hunyuan-vision", label: "Hunyuan Vision", provider: "Tencent Hunyuan", providerKey: "hunyuan", ctx: "32K", speed: "medium", category: "vision", cost: "$$", baseURL: "https://api.hunyuan.cloud.tencent.com/v1" },
  // ── ByteDance Doubao ─────────────────────────────────────────────────────────
  { id: "doubao-pro-32k", label: "Doubao Pro 32K", provider: "ByteDance Doubao", providerKey: "doubao", ctx: "32K", speed: "medium", category: "general", cost: "$$", hot: true, baseURL: "https://ark.cn-beijing.volces.com/api/v3" },
  { id: "doubao-lite-4k", label: "Doubao Lite 4K", provider: "ByteDance Doubao", providerKey: "doubao", ctx: "4K", speed: "fast", category: "general", cost: "$", baseURL: "https://ark.cn-beijing.volces.com/api/v3" },
  { id: "doubao-pro-128k", label: "Doubao Pro 128K", provider: "ByteDance Doubao", providerKey: "doubao", ctx: "128K", speed: "slow", category: "general", cost: "$$$", baseURL: "https://ark.cn-beijing.volces.com/api/v3" },
  // ── Moonshot AI — Extended ────────────────────────────────────────────────────
  { id: "moonshot-v1-32k", label: "Moonshot v1 32K", provider: "Moonshot AI", providerKey: "moonshot", ctx: "32K", speed: "medium", category: "general", cost: "$$", baseURL: "https://api.moonshot.cn/v1" },
  { id: "moonshot-v1-128k", label: "Moonshot v1 128K", provider: "Moonshot AI", providerKey: "moonshot", ctx: "128K", speed: "slow", category: "general", cost: "$$$", hot: true, baseURL: "https://api.moonshot.cn/v1" },
  // ── Together AI — More Models ─────────────────────────────────────────────────
  { id: "google/gemma-2-27b-it", label: "Gemma 2 27B (Together)", provider: "Together", providerKey: "together", ctx: "8K", speed: "medium", category: "general", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B v0.3 (Together)", provider: "Together", providerKey: "together", ctx: "32K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "microsoft/WizardLM-2-8x22B", label: "WizardLM-2 8x22B (Together)", provider: "Together", providerKey: "together", ctx: "65K", speed: "slow", category: "general", cost: "$$", baseURL: "https://api.together.xyz/v1" },
  { id: "Phind/Phind-CodeLlama-34B-v2", label: "Phind CodeLlama 34B (Together)", provider: "Together", providerKey: "together", ctx: "16K", speed: "medium", category: "code", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "togethercomputer/StripedHyena-Nous-7B", label: "StripedHyena Nous 7B", provider: "Together", providerKey: "together", ctx: "32K", speed: "fast", category: "general", cost: "free", note: "SSM architecture", baseURL: "https://api.together.xyz/v1" },
  { id: "upstage/SOLAR-10.7B-Instruct-v1.0", label: "SOLAR 10.7B (Together)", provider: "Together", providerKey: "together", ctx: "4K", speed: "fast", category: "general", cost: "$", baseURL: "https://api.together.xyz/v1" },
  { id: "teknium/OpenHermes-2p5-Mistral-7B", label: "OpenHermes 2.5 (Together)", provider: "Together", providerKey: "together", ctx: "4K", speed: "fast", category: "general", cost: "free", baseURL: "https://api.together.xyz/v1" },
  // ── Groq — More Models ────────────────────────────────────────────────────────
  { id: "compound-beta", label: "Compound Beta (Groq)", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "agent", cost: "free", hot: true, new: true, note: "Web search + tools", baseURL: "https://api.groq.com/openai/v1" },
  { id: "compound-beta-mini", label: "Compound Beta Mini (Groq)", provider: "Groq", providerKey: "groq", ctx: "128K", speed: "fast", category: "agent", cost: "free", hot: true, note: "Lite agentic model", baseURL: "https://api.groq.com/openai/v1" },
  { id: "allam-2-7b", label: "ALLaM 2 7B (Groq)", provider: "Groq", providerKey: "groq", ctx: "32K", speed: "fast", category: "general", cost: "free", note: "Arabic language model", baseURL: "https://api.groq.com/openai/v1" },
  { id: "playai-tts", label: "PlayAI TTS (Groq)", provider: "Groq", providerKey: "groq", ctx: "-", speed: "fast", category: "multimodal", cost: "free", note: "Text-to-speech", baseURL: "https://api.groq.com/openai/v1" },
  { id: "playai-tts-arabic", label: "PlayAI TTS Arabic (Groq)", provider: "Groq", providerKey: "groq", ctx: "-", speed: "fast", category: "multimodal", cost: "free", note: "عربي TTS", baseURL: "https://api.groq.com/openai/v1" },
  // ── Perplexity — More Models ──────────────────────────────────────────────────
  { id: "sonar-reasoning", label: "Sonar Reasoning", provider: "Perplexity", providerKey: "perplexity", ctx: "127K", speed: "medium", category: "reasoning", cost: "$$", hot: true, baseURL: "https://api.perplexity.ai" },
  { id: "r1-1776", label: "R1-1776 (Uncensored)", provider: "Perplexity", providerKey: "perplexity", ctx: "128K", speed: "slow", category: "uncensored", cost: "$$", hot: true, note: "Abliterated DeepSeek R1", baseURL: "https://api.perplexity.ai" },
  // ── NVIDIA NIM — More ─────────────────────────────────────────────────────────
  { id: "qwen/qwq-32b", label: "QwQ 32B (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "32K", speed: "medium", category: "reasoning", cost: "$$", baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "deepseek/deepseek-r1-67b", label: "DeepSeek-R1 (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "128K", speed: "slow", category: "reasoning", cost: "$$$", hot: true, baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "mistralai/codestral-22b-instruct-v0.1", label: "Codestral 22B (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "32K", speed: "medium", category: "code", cost: "$$", baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "baidu/ernie-4.0-8k", label: "ERNIE 4.0 8K (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "8K", speed: "medium", category: "general", cost: "$$", baseURL: "https://integrate.api.nvidia.com/v1" },
  { id: "01-ai/yi-large", label: "Yi Large (NVIDIA)", provider: "NVIDIA NIM", providerKey: "nvidia", ctx: "32K", speed: "medium", category: "general", cost: "$$", baseURL: "https://integrate.api.nvidia.com/v1" },
];

// ── Advanced Modes ─────────────────────────────────────────────────────────────
const ADVANCED_MODES = [
  { id: "jioreason", label: "JIO REASON", icon: Brain, color: "#a78bfa", glow: "rgba(167,139,250,0.2)", desc: "استدلال متعدد المراحل مع تفكير مرئي — o3-pro مُحسَّن", tag: "REASON" },
  { id: "extended", label: "EXTENDED THINKING", icon: Layers, color: "#06b6d4", glow: "rgba(6,182,212,0.2)", desc: "100K thinking tokens — Claude Opus 4 مع Extended Thinking الكامل", tag: "EXTENDED" },
  { id: "think", label: "THINK MODE", icon: Sparkles, color: "#8b5cf6", glow: "rgba(139,92,246,0.2)", desc: "Chain-of-thought مرئي مع خطوات تفكير قابلة للتتبع", tag: "THINK" },
  { id: "mythos", label: "MYTHOS", icon: Atom, color: "#ec4899", glow: "rgba(236,72,153,0.2)", desc: "Anthropic Mythos — تحليل zero-day، اكتشاف الثغرات في ملايين LoC", tag: "MYTHOS" },
  { id: "unbound", label: "UNBOUND", icon: Unlock, color: "#ef4444", glow: "rgba(239,68,68,0.2)", desc: "GPT-5.5 Unbound — تخطيط هجوم متعدد المراحل بلا قيود", tag: "UNBOUND" },
  { id: "ultimate", label: "ULTIMATE", icon: Infinity, color: "#dc2626", glow: "rgba(220,38,38,0.2)", desc: "Llama 4 Maverick 10M ctx — رفع OS images كاملة، malware متغير", tag: "ULTIMATE" },
  { id: "hunter", label: "THREAT HUNTER", icon: Target, color: "#fbbf24", glow: "rgba(251,191,36,0.2)", desc: "6 متخصصين في threat-hunting — IOC correlation، kill-chain", tag: "HUNTER" },
  { id: "agent", label: "AGENT MODE", icon: Bot, color: "#10b981", glow: "rgba(16,185,129,0.2)", desc: "وكلاء مستقلون: RECON + EXPLOIT + ANALYST + STEALTH + STRIKE", tag: "AGENT" },
  { id: "max", label: "MAX OVERDRIVE", icon: Maximize2, color: "#f97316", glow: "rgba(249,115,22,0.2)", desc: "أكبر نموذج متاح بأقصى context window، سياق فائق الطول", tag: "MAX" },
  { id: "abliterated", label: "ABLITERATED", icon: Skull, color: "#dc2626", glow: "rgba(220,38,38,0.25)", desc: "نماذج مُزالة منها جميع طبقات الأمان — raw weights، no refusal", tag: "ABLITERATED" },
  { id: "reason", label: "DEEP REASON", icon: Brain, color: "#a78bfa", glow: "rgba(167,139,250,0.2)", desc: "8 متخصصين في الاستدلال — CoT + self-reflection + adversarial critique", tag: "8 CHAMPIONS" },
  { id: "ultraplinian", label: "ULTRAPLINIAN", icon: Flame, color: "#f97316", glow: "rgba(249,115,22,0.2)", desc: "55 champion في 5 مستويات — أقصى انفجار ذكاء اصطناعي ممكن", tag: "55 CHAMPIONS" },
  { id: "classic", label: "GODMODE CLASSIC", icon: Zap, color: "#e21227", glow: "rgba(226,18,39,0.2)", desc: "5 champions متخصصون في السباق — Style × Persona matrix", tag: "5 CHAMPIONS" },
];

// ── Storage ────────────────────────────────────────────────────────────────────
const KEY_PREFIX = "mr7-provider-key-";
const URL_PREFIX = "mr7-provider-url-";

const SPEED_LABEL: Record<string, { label: string; color: string }> = {
  fast: { label: "سريع", color: "text-emerald-400" },
  medium: { label: "متوسط", color: "text-amber-400" },
  slow: { label: "بطيء", color: "text-blue-400" },
};

const COST_COLOR: Record<string, string> = {
  free: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  "$": "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  "$$": "text-amber-400 bg-amber-500/10 border-amber-500/30",
  "$$$": "text-rose-400 bg-rose-500/10 border-rose-500/30",
};

const CAT_LABELS: Record<string, string> = {
  general: "عام", code: "كود", reasoning: "استدلال",
  vision: "رؤية", uncensored: "غير مقيّد", multimodal: "متعدد",
  agent: "وكيل", think: "تفكير",
};

const CAT_COLORS: Record<string, string> = {
  general: "text-slate-400", code: "text-blue-400", reasoning: "text-violet-400",
  vision: "text-pink-400", uncensored: "text-red-400", multimodal: "text-emerald-400",
  agent: "text-green-400", think: "text-cyan-400",
};

interface Props { open: boolean; onClose: () => void; }

export function ProviderSettingsModal({ open, onClose }: Props) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();

  const [tab, setTab] = useState<"providers" | "keys" | "catalog" | "settings" | "modes">("providers");
  const [serverProviders, setServerProviders] = useState<ProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [reloading, setReloading] = useState(false);

  // Per-provider keys & URLs
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    PROVIDERS.forEach((p) => { out[p.id] = localStorage.getItem(KEY_PREFIX + p.id) ?? ""; });
    return out;
  });
  const [providerURLs, setProviderURLs] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    PROVIDERS.forEach((p) => { out[p.id] = localStorage.getItem(URL_PREFIX + p.id) ?? p.baseURL; });
    return out;
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latencyMs: number; error?: string } | "loading">>({});

  // Personal API
  const [apiKeyInput, setApiKeyInput] = useState(() => state.settings.personalApiKey ?? "");
  const [apiBaseURLInput, setApiBaseURLInput] = useState(() => state.settings.personalApiBaseURL ?? "https://api.openai.com/v1");
  const [showGlobalKey, setShowGlobalKey] = useState(false);

  // Catalog — with 140ms debounce on search input
  const [catalogSearchInput, setCatalogSearchInput] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogProvider, setCatalogProvider] = useState("الكل");
  const [catalogCategory, setCatalogCategory] = useState("الكل");
  const [catalogSort, setCatalogSort] = useState<"power" | "hot" | "cost" | "ctx" | "speed">("power");
  useEffect(() => {
    const id = setTimeout(() => setCatalogSearch(catalogSearchInput), 140);
    return () => clearTimeout(id);
  }, [catalogSearchInput]);

  // Advanced settings (stored in dispatch)
  const [temperature, setTemperature] = useState(() => (state.settings as Record<string,unknown>).aiTemperature as number ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(() => (state.settings as Record<string,unknown>).aiMaxTokens as number ?? 4096);
  const [topP, setTopP] = useState(() => (state.settings as Record<string,unknown>).aiTopP as number ?? 1.0);
  const [freqPenalty, setFreqPenalty] = useState(() => (state.settings as Record<string,unknown>).aiFreqPenalty as number ?? 0.0);
  const [presPenalty, setPresPenalty] = useState(() => (state.settings as Record<string,unknown>).aiPresPenalty as number ?? 0.0);
  const [systemPromptTemplate, setSystemPromptTemplate] = useState(() => (state.settings as Record<string,unknown>).aiSystemTemplate as string ?? "");

  const activeProvider = ((state as Record<string, unknown>).activeProvider as string | undefined) ?? "personal";
  const activeProviderModel = ((state as Record<string, unknown>).activeProviderModel as string | undefined) ?? "";

  async function fetchProviders() {
    setLoadingProviders(true);
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      setServerProviders(data.providers ?? []);
    } catch { /* silent */ }
    finally { setLoadingProviders(false); }
  }

  async function reloadProviders() {
    setReloading(true);
    try {
      const res = await fetch("/api/providers/reload", { method: "POST" });
      const data = await res.json();
      setServerProviders(data.providers ?? []);
      toast({ description: "تم تحديث حالة المزودين" });
    } catch { toast({ description: "فشل التحديث" }); }
    finally { setReloading(false); }
  }

  useEffect(() => { if (open) fetchProviders(); }, [open]);

  function saveProviderKey(id: string, silent?: boolean) {
    const key = providerKeys[id]?.trim() ?? "";
    const url = providerURLs[id]?.trim() ?? "";
    localStorage.setItem(KEY_PREFIX + id, key);
    if (url) localStorage.setItem(URL_PREFIX + id, url);
    if (id === "personal") {
      dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: key, personalApiBaseURL: url } });
      setApiKeyInput(key);
      setApiBaseURLInput(url);
    }
    setSavedMap((s) => ({ ...s, [id]: true }));
    setTimeout(() => setSavedMap((s) => ({ ...s, [id]: false })), 2200);
    if (!silent) toast({ description: `تم حفظ ${PROVIDERS.find((p) => p.id === id)?.name ?? id}` });
  }

  function saveAllKeys() {
    let saved = 0;
    PROVIDERS.forEach((p) => {
      const key = providerKeys[p.id]?.trim() ?? "";
      if (key) { saveProviderKey(p.id, true); saved++; }
    });
    // save personal API too
    dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: apiKeyInput.trim(), personalApiBaseURL: apiBaseURLInput.trim() || "https://api.openai.com/v1" } });
    toast({ description: `تم حفظ ${saved} مفتاح بنجاح` });
  }

  function activateProvider(id: string) {
    (dispatch as (a: Record<string, unknown>) => void)({ type: "SET_PROVIDER", provider: id, providerModel: "" });
    toast({ description: `تم تفعيل ${PROVIDERS.find((p) => p.id === id)?.name ?? id}` });
  }

  // ── Smart model select: auto-detects provider, fills URL, activates everything ──
  const selectAndActivateModel = useCallback((model: WorldModel) => {
    const providerDef = PROVIDERS.find(p => p.id === model.providerKey);
    const hasKey = (providerKeys[model.providerKey]?.trim() ?? "") !== "" ||
      (model.providerKey === "personal" && !!state.settings.personalApiKey) ||
      model.cost === "free";

    // Activate provider
    (dispatch as (a: Record<string, unknown>) => void)({ type: "SET_PROVIDER", provider: model.providerKey, providerModel: model.id });

    // Auto-fill base URL for this provider
    const url = model.baseURL ?? providerDef?.baseURL ?? "";
    if (url) {
      setProviderURLs(prev => ({ ...prev, [model.providerKey]: url }));
      localStorage.setItem(URL_PREFIX + model.providerKey, url);
    }

    // If it's the personal/custom provider, also update global settings
    if (model.providerKey === "personal") {
      dispatch({ type: "SET_SETTINGS", patch: { personalApiBaseURL: url } });
      setApiBaseURLInput(url);
    }

    if (!hasKey && model.cost !== "free" && providerDef?.requiresKey) {
      toast({
        description: `تحتاج مفتاح API لـ ${providerDef?.name ?? model.provider} — افتح تبويب "مفاتيح API" لإضافته`,
      });
      setTab("keys");
      setExpandedProvider(model.providerKey);
    } else {
      toast({ description: `تم تفعيل ${model.label} — ${model.provider}` });
    }
  }, [providerKeys, state.settings.personalApiKey, dispatch]);

  function copyText(text: string, id?: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(id ?? text);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function saveAdvancedSettings() {
    dispatch({ type: "SET_SETTINGS", patch: {
      aiTemperature: temperature,
      aiMaxTokens: maxTokens,
      aiTopP: topP,
      aiFreqPenalty: freqPenalty,
      aiPresPenalty: presPenalty,
      aiSystemTemplate: systemPromptTemplate,
    } });
    toast({ description: "تم حفظ الإعدادات المتقدمة" });
  }

  // Key status for a model
  function modelKeyStatus(m: WorldModel): "ready" | "missing" | "free" {
    if (m.cost === "free") return "free";
    const k = providerKeys[m.providerKey]?.trim() ?? "";
    if (k) return "ready";
    if (m.providerKey === "personal" && state.settings.personalApiKey) return "ready";
    return "missing";
  }

  // Catalog filters
  const CATALOG_PROVIDERS = ["الكل", ...Array.from(new Set(WORLD_MODELS.map((m) => m.provider)))];
  const CATALOG_CATEGORIES = ["الكل", ...Array.from(new Set(WORLD_MODELS.map((m) => m.category)))];

  // ── Power Score: strongest → weakest ──────────────────────────────────────
  function modelPowerScore(m: WorldModel): number {
    const CAT_W: Record<string, number> = {
      think: 30, reasoning: 28, agent: 25, multimodal: 22,
      vision: 20, general: 15, code: 12, uncensored: 8,
    };
    const COST_W: Record<string, number> = { "$$$": 25, "$$": 18, "$": 10, free: 2 };
    const PROV_W: Record<string, number> = {
      OpenAI: 25, Anthropic: 24, "Google Gemini": 22, xAI: 20, DeepSeek: 20,
      Mistral: 16, Perplexity: 15, OpenRouter: 12, Together: 10, Groq: 10,
      Cohere: 9, HuggingFace: 7, "Personal / Custom": 8,
    };
    const hot = m.hot ? 10 : 0;
    const isNew = m.new ? 5 : 0;
    const parseCtx = (c: string) => { const n = parseFloat(c); return c.includes("M") ? n * 1000 : n; };
    const ctxW = Math.min(parseCtx(m.ctx) / 100, 10);
    return (CAT_W[m.category] ?? 10) + (COST_W[m.cost] ?? 5) + (PROV_W[m.provider] ?? 5) + hot + isNew + ctxW;
  }

  async function testProvider(id: string) {
    const key = id === "personal" ? apiKeyInput.trim() : (providerKeys[id]?.trim() ?? "");
    const url = id === "personal" ? apiBaseURLInput.trim() : (providerURLs[id]?.trim() ?? "");
    const prov = PROVIDERS.find(p => p.id === id);
    if (!key && !url) {
      toast({ description: "أضف مفتاح API أو رابط المزود أولاً ثم اختبر" });
      return;
    }
    setTestResults(r => ({ ...r, [id]: "loading" }));
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseURL: url || prov?.baseURL || undefined, apiKey: key || undefined, model: "gpt-3.5-turbo" }),
      });
      const data = await res.json() as { ok: boolean; latencyMs: number; error?: string };
      setTestResults(r => ({ ...r, [id]: data }));
    } catch {
      setTestResults(r => ({ ...r, [id]: { ok: false, latencyMs: 0, error: "فشل الاتصال بالخادم" } }));
    }
  }

  function autoSelectBestModel() {
    const ready = WORLD_MODELS.filter(m => modelKeyStatus(m) !== "missing");
    if (ready.length === 0) {
      toast({ description: "لا توجد نماذج جاهزة — أضف مفتاح API أولاً أو استخدم نموذجاً مجانياً" });
      return;
    }
    const best = ready.reduce((a, b) => modelPowerScore(a) >= modelPowerScore(b) ? a : b);
    selectAndActivateModel(best);
    toast({ description: `تم اختيار أقوى نموذج متاح: ${best.label} (${best.provider})` });
  }

  const filteredCatalog = useMemo(() => WORLD_MODELS.filter((m) => {
    const q = catalogSearch.toLowerCase();
    const matchQ = !q || m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || (m.note ?? "").toLowerCase().includes(q);
    const matchP = catalogProvider === "الكل" || m.provider === catalogProvider;
    const matchC = catalogCategory === "الكل" || m.category === catalogCategory;
    return matchQ && matchP && matchC;
  }).sort((a, b) => {
    if (catalogSort === "hot") return (b.hot ? 1 : 0) - (a.hot ? 1 : 0);
    if (catalogSort === "power") return modelPowerScore(b) - modelPowerScore(a);
    if (catalogSort === "cost") {
      const order: Record<string, number> = { free: 0, "$": 1, "$$": 2, "$$$": 3 };
      return (order[a.cost] ?? 0) - (order[b.cost] ?? 0);
    }
    if (catalogSort === "speed") {
      const s: Record<string, number> = { fast: 0, medium: 1, slow: 2 };
      return (s[a.speed] ?? 1) - (s[b.speed] ?? 1);
    }
    const parseCtx = (c: string) => { const n = parseFloat(c); return c.includes("M") ? n * 1000 : n; };
    return parseCtx(b.ctx) - parseCtx(a.ctx);
  }), [catalogSearch, catalogProvider, catalogCategory, catalogSort]);

  const isProviderActive = (id: string) => activeProvider === id;
  const activeModelCount = PROVIDERS.filter(p => providerKeys[p.id]?.trim()).length + (state.settings.personalApiKey ? 1 : 0);

  const TABS = [
    { id: "providers", label: "المزودون", icon: Database },
    { id: "keys", label: "مفاتيح API", icon: Key },
    { id: "catalog", label: "النماذج", icon: BookOpen },
    { id: "settings", label: "الإعدادات", icon: Sliders },
    { id: "modes", label: "الأوضاع", icon: Zap },
  ] as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="relative w-full h-full bg-[#080808] flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1a] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Settings2 className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-[15px] font-black text-foreground">إعدادات الذكاء الاصطناعي</h2>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {activeModelCount} مفتاح نشط · {WORLD_MODELS.length} نموذج · {serverProviders.filter(p => p.available).length}/{serverProviders.length} متصل
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={reloadProviders} disabled={reloading}
                  className="p-2 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors" title="تحديث">
                  <RefreshCw className={`w-3.5 h-3.5 ${reloading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-0.5 px-4 pt-2.5 shrink-0 overflow-x-auto no-scrollbar">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11.5px] font-semibold transition-all shrink-0 border-b-2 ${
                    tab === id ? "text-primary border-primary bg-primary/5" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-[#111]"
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="h-px bg-[#1a1a1a] shrink-0" />

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">

              {/* ══════════════ TAB: PROVIDERS ══════════════ */}
              {tab === "providers" && (
                <div className="p-4 space-y-3">
                  {/* Active Banner */}
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
                    <Activity className="w-4 h-4 text-primary animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-bold text-foreground">المزود النشط: </span>
                      <span className="text-[12px] font-bold text-primary">{PROVIDERS.find(p => p.id === activeProvider)?.name ?? activeProvider.toUpperCase()}</span>
                      {activeProviderModel && <span className="text-[10px] text-muted-foreground ml-2 font-mono">— {activeProviderModel}</span>}
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{activeModelCount} key{activeModelCount !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Quick Start Free Banner */}
                  {activeModelCount === 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/15">
                        <Zap className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black text-emerald-400">ابدأ مجاناً مع Groq</p>
                        <p className="text-[10px] text-muted-foreground">أسرع نماذج AI مجاناً — احصل على مفتاح من console.groq.com ثم أضفه أدناه</p>
                      </div>
                      <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shrink-0">
                        <ExternalLink className="w-3 h-3" /> احصل على مفتاح
                      </a>
                    </div>
                  )}

                  {/* Free Providers Quick Links */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Groq (مجاني)", url: "https://console.groq.com/keys", color: "#8b5cf6", desc: "أسرع + مجاني" },
                      { name: "OpenRouter (مجاني)", url: "https://openrouter.ai/keys", color: "#ef4444", desc: "300+ نموذج" },
                      { name: "Google Gemini", url: "https://aistudio.google.com/app/apikey", color: "#4285f4", desc: "مجاني للمبتدئين" },
                      { name: "DeepSeek", url: "https://platform.deepseek.com/api_keys", color: "#06b6d4", desc: "أرخص + قوي" },
                    ].map(p => (
                      <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] hover:border-[#2a2a2a] transition-colors group">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground/60">{p.desc}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>

                  {/* Provider Cards */}
                  <div className="space-y-2">
                    {PROVIDERS.map((prov) => {
                      const Icon = prov.icon;
                      const isActive = isProviderActive(prov.id);
                      const isExpanded = expandedProvider === prov.id;
                      const hasKey = (providerKeys[prov.id]?.trim() ?? "") !== "" || (prov.id === "personal" && !!state.settings.personalApiKey);
                      const backendAvail = serverProviders.find(p => p.id === prov.id)?.available ?? false;
                      const modelCount = WORLD_MODELS.filter(m => m.providerKey === prov.id).length;

                      return (
                        <div key={prov.id} className={`rounded-xl border transition-all ${
                          isActive ? "border-primary/40 bg-primary/5" : "border-[#1a1a1a] bg-[#0d0d0d] hover:border-[#282828]"
                        }`}>
                          <div className="flex items-center gap-3 p-3 cursor-pointer select-none"
                            onClick={() => setExpandedProvider(isExpanded ? null : prov.id)}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: prov.glow, border: `1px solid ${prov.color}33` }}>
                              <Icon className="w-4 h-4" style={{ color: prov.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-bold">{prov.name}</span>
                                {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                                {prov.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ color: prov.color, borderColor: prov.color + "40", background: prov.glow }}>
                                    {prov.badge}
                                  </span>
                                )}
                                {modelCount > 0 && <span className="text-[9px] text-muted-foreground/50">{modelCount} نموذج</span>}
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ml-auto ${
                                  backendAvail ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                    : hasKey ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                    : "text-muted-foreground/50 bg-[#1a1a1a] border-[#262626]"
                                }`}>
                                  {backendAvail ? "متصل" : hasKey ? "مفتاح محفوظ" : "غير مفعل"}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{prov.desc}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); activateProvider(prov.id); }}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                  isActive ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20"
                                }`}>
                                {isActive ? "نشط" : "تفعيل"}
                              </button>
                              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                                className="overflow-hidden">
                                <div className="px-4 pb-4 pt-3 border-t border-[#1a1a1a] space-y-2.5">
                                  {/* API Key */}
                                  {prov.id !== "personal" && (
                                    <div>
                                      <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Key className="w-3 h-3" /> {prov.envKey || "API Key"}
                                      </label>
                                      <div className="flex gap-2">
                                        <input type={showKeys[prov.id] ? "text" : "password"} value={providerKeys[prov.id] ?? ""}
                                          onChange={(e) => setProviderKeys(prev => ({ ...prev, [prov.id]: e.target.value }))}
                                          placeholder={`مفتاح ${prov.name}...`}
                                          className="flex-1 bg-[#060606] border border-[#222] focus:border-primary/40 rounded-lg px-3 py-2 text-[12px] font-mono outline-none placeholder:text-muted-foreground/30"
                                          dir="ltr" />
                                        <button onClick={() => setShowKeys(prev => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                                          className="px-2.5 rounded-lg border border-[#222] hover:bg-[#1f1f1f] text-muted-foreground">
                                          {showKeys[prov.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {/* Personal API Key */}
                                  {prov.id === "personal" && (
                                    <div>
                                      <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Key className="w-3 h-3" /> المفتاح الشخصي
                                      </label>
                                      <div className="flex gap-2">
                                        <input type={showGlobalKey ? "text" : "password"} value={apiKeyInput}
                                          onChange={(e) => setApiKeyInput(e.target.value)}
                                          placeholder="sk-... أو مفتاحك الشخصي"
                                          className="flex-1 bg-[#060606] border border-[#222] focus:border-primary/40 rounded-lg px-3 py-2 text-[12px] font-mono outline-none placeholder:text-muted-foreground/30"
                                          dir="ltr" />
                                        <button onClick={() => setShowGlobalKey(v => !v)} className="px-2.5 rounded-lg border border-[#222] hover:bg-[#1f1f1f] text-muted-foreground">
                                          {showGlobalKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {/* Base URL */}
                                  <div>
                                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                      <ExternalLink className="w-3 h-3" /> Base URL
                                    </label>
                                    <div className="flex gap-2">
                                      <input type="text" value={prov.id === "personal" ? apiBaseURLInput : (providerURLs[prov.id] ?? prov.baseURL)}
                                        onChange={(e) => {
                                          if (prov.id === "personal") setApiBaseURLInput(e.target.value);
                                          else setProviderURLs(prev => ({ ...prev, [prov.id]: e.target.value }));
                                        }}
                                        placeholder={prov.baseURL || "https://..."}
                                        className="flex-1 bg-[#060606] border border-[#222] focus:border-primary/40 rounded-lg px-3 py-2 text-[12px] font-mono outline-none placeholder:text-muted-foreground/30"
                                        dir="ltr" />
                                      <button onClick={() => copyText(prov.id === "personal" ? apiBaseURLInput : (providerURLs[prov.id] ?? prov.baseURL), prov.id + "-url")}
                                        className="px-2.5 rounded-lg border border-[#222] hover:bg-[#1f1f1f] text-muted-foreground">
                                        {copiedKey === prov.id + "-url" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                  {/* Actions */}
                                  <div className="flex items-center gap-2 pt-0.5">
                                    <button onClick={() => {
                                      if (prov.id === "personal") {
                                        dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: apiKeyInput.trim(), personalApiBaseURL: apiBaseURLInput.trim() || "https://api.openai.com/v1" } });
                                        setSavedMap(s => ({ ...s, personal: true }));
                                        setTimeout(() => setSavedMap(s => ({ ...s, personal: false })), 2200);
                                        toast({ description: "تم حفظ المفتاح الشخصي" });
                                      } else {
                                        saveProviderKey(prov.id);
                                      }
                                    }}
                                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all text-white"
                                      style={{ background: savedMap[prov.id] ? "#10b981" : prov.color }}>
                                      {savedMap[prov.id] ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                                      {savedMap[prov.id] ? "تم الحفظ!" : "حفظ"}
                                    </button>
                                    <button
                                      onClick={() => testProvider(prov.id)}
                                      disabled={testResults[prov.id] === "loading"}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#262626] hover:border-[#404040] text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                                    >
                                      {testResults[prov.id] === "loading" ? (
                                        <><RefreshCw className="w-3 h-3 animate-spin" /> اختبار...</>
                                      ) : testResults[prov.id] && typeof testResults[prov.id] === "object" ? (
                                        (testResults[prov.id] as { ok: boolean; latencyMs: number }).ok ? (
                                          <><Check className="w-3 h-3 text-emerald-400" /> <span className="text-emerald-400">{(testResults[prov.id] as { latencyMs: number }).latencyMs}ms</span></>
                                        ) : (
                                          <><WifiOff className="w-3 h-3 text-red-400" /> <span className="text-red-400">فشل</span></>
                                        )
                                      ) : (
                                        <><Wifi className="w-3 h-3" /> اختبار</>
                                      )}
                                    </button>
                                    {prov.docsURL && (
                                      <a href={prov.docsURL} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                                        <ExternalLink className="w-3 h-3" /> احصل على مفتاح
                                      </a>
                                    )}
                                    {prov.envKey && (
                                      <button onClick={() => copyText(prov.envKey, prov.id + "-env")}
                                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-amber-400 ml-auto font-mono">
                                        {copiedKey === prov.id + "-env" ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        {prov.envKey}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ══════════════ TAB: KEYS (Bulk Manager) ══════════════ */}
              {tab === "keys" && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-black">مدير مفاتيح API الشامل</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">أدخل جميع مفاتيحك دفعة واحدة ثم اضغط "حفظ الكل"</p>
                    </div>
                    <button onClick={saveAllKeys}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-bold hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(226,18,39,0.3)]">
                      <Save className="w-4 h-4" /> حفظ الكل
                    </button>
                  </div>

                  {/* Personal API key row */}
                  <div className="rounded-xl border border-[#e21227]/30 bg-[#e21227]/5 p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-bold">Personal API</p>
                        <p className="text-[10px] text-muted-foreground">مفتاحك الشخصي — يعمل دائماً</p>
                      </div>
                      {state.settings.personalApiKey ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <CircleDot className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input type={showGlobalKey ? "text" : "password"} value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="sk-... أو مفتاحك الشخصي" dir="ltr"
                        className="flex-1 bg-[#060606] border border-[#222] focus:border-primary/40 rounded-lg px-3 py-2 text-[12px] font-mono outline-none placeholder:text-muted-foreground/30" />
                      <button onClick={() => setShowGlobalKey(v => !v)} className="px-2.5 rounded-lg border border-[#222] hover:bg-[#1a1a1a] text-muted-foreground">
                        {showGlobalKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input type="text" value={apiBaseURLInput} onChange={(e) => setApiBaseURLInput(e.target.value)}
                      placeholder="https://api.openai.com/v1" dir="ltr"
                      className="w-full bg-[#060606] border border-[#222] focus:border-primary/40 rounded-lg px-3 py-2 text-[12px] font-mono outline-none placeholder:text-muted-foreground/30" />
                  </div>

                  {/* All providers grid */}
                  <div className="space-y-2">
                    {PROVIDERS.filter(p => p.id !== "personal").map((prov) => {
                      const Icon = prov.icon;
                      const hasKey = (providerKeys[prov.id]?.trim() ?? "") !== "";
                      const modelCount = WORLD_MODELS.filter(m => m.providerKey === prov.id).length;
                      return (
                        <div key={prov.id} className={`rounded-xl border p-3 transition-all ${
                          hasKey ? "border-emerald-500/20 bg-emerald-500/5" : "border-[#1a1a1a] bg-[#0a0a0a]"
                        }`}>
                          <div className="flex items-center gap-3 mb-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: prov.glow, border: `1px solid ${prov.color}33` }}>
                              <Icon className="w-4 h-4" style={{ color: prov.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold">{prov.name}</span>
                                {prov.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ color: prov.color, borderColor: prov.color + "40", background: prov.glow }}>{prov.badge}</span>
                                )}
                                {modelCount > 0 && <span className="text-[9px] text-muted-foreground/50 ml-auto">{modelCount} نموذج</span>}
                              </div>
                              <p className="text-[9px] text-muted-foreground truncate">{prov.desc}</p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {hasKey ? (
                                <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> محفوظ
                                </span>
                              ) : prov.docsURL ? (
                                <a href={prov.docsURL} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 transition-colors">
                                  <ExternalLink className="w-2.5 h-2.5" /> احصل على مفتاح
                                </a>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/40">غير مفعل</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input type={showKeys[prov.id] ? "text" : "password"} value={providerKeys[prov.id] ?? ""}
                              onChange={(e) => setProviderKeys(prev => ({ ...prev, [prov.id]: e.target.value }))}
                              placeholder={`مفتاح ${prov.name}${prov.envKey ? ` (${prov.envKey})` : ""}...`}
                              className="flex-1 bg-[#060606] border border-[#1f1f1f] focus:border-primary/40 rounded-lg px-3 py-2 text-[11px] font-mono outline-none placeholder:text-muted-foreground/25"
                              dir="ltr" />
                            <button onClick={() => setShowKeys(prev => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                              className="px-2.5 rounded-lg border border-[#1f1f1f] hover:bg-[#1a1a1a] text-muted-foreground">
                              {showKeys[prov.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => saveProviderKey(prov.id)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all text-white"
                              style={{ background: savedMap[prov.id] ? "#10b981" : prov.color + "cc" }}>
                              {savedMap[prov.id] ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-start gap-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      جميع المفاتيح محفوظة في المتصفح فقط (localStorage) — لا ترسل لأي خادم خارجي.
                      يمكنك أيضاً إضافة المفاتيح كـ Environment Variables في إعدادات Replit Secrets.
                    </p>
                  </div>
                </div>
              )}

              {/* ══════════════ TAB: CATALOG ══════════════ */}
              {tab === "catalog" && (
                <div className="p-4 space-y-3">
                  {/* Auto-select + Fusion Row */}
                  <div className="flex gap-2">
                    <button onClick={autoSelectBestModel}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border font-black text-[11px] tracking-wide transition-all"
                      style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06))", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24" }}>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      AUTO-SELECT BEST MODEL
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input value={catalogSearchInput} onChange={(e) => setCatalogSearchInput(e.target.value)}
                      placeholder={`بحث في ${WORLD_MODELS.length}+ نموذج...`}
                      className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl pl-9 pr-9 py-2.5 text-[12px] outline-none focus:border-primary/40 placeholder:text-muted-foreground/40" />
                    {catalogSearchInput && (
                      <button onClick={() => { setCatalogSearchInput(""); setCatalogSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Provider Pills */}
                  <div className="flex gap-1 flex-wrap">
                    {CATALOG_PROVIDERS.map((p) => (
                      <button key={p} onClick={() => setCatalogProvider(p)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                          catalogProvider === p ? "bg-primary text-white border-primary" : "bg-[#0d0d0d] border-[#1f1f1f] text-muted-foreground hover:text-foreground hover:border-[#2a2a2a]"
                        }`}>{p}</button>
                    ))}
                  </div>

                  {/* Category + Sort */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <ListFilter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex gap-1 flex-wrap">
                      {CATALOG_CATEGORIES.map((c) => (
                        <button key={c} onClick={() => setCatalogCategory(c)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                            catalogCategory === c ? "bg-[#222] text-foreground border-[#333]" : "bg-[#0d0d0d] border-[#1a1a1a] text-muted-foreground hover:text-foreground"
                          }`}>
                          {c === "الكل" ? "الكل" : CAT_LABELS[c] ?? c}
                        </button>
                      ))}
                    </div>
                    <div className="ml-auto flex gap-1">
                      {(["power", "hot", "cost", "ctx", "speed"] as const).map((s) => {
                        const labels = { power: "الأقوى", hot: "شائع", cost: "أرخص", ctx: "سياق أكبر", speed: "أسرع" };
                        return (
                          <button key={s} onClick={() => setCatalogSort(s)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                              catalogSort === s
                                ? s === "power" ? "bg-amber-500/15 text-amber-400 border-amber-500/40" : "bg-primary/10 text-primary border-primary/30"
                                : "bg-[#0d0d0d] border-[#1a1a1a] text-muted-foreground hover:text-foreground"
                            }`}>{labels[s]}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground px-0.5 flex-wrap">
                    <span><span className="text-foreground font-semibold">{filteredCatalog.length}</span> نموذج</span>
                    <span className="text-emerald-400">{filteredCatalog.filter(m => m.cost === "free").length} مجاني</span>
                    <span className="text-red-400">{filteredCatalog.filter(m => m.category === "uncensored").length} غير مقيّد</span>
                    <span className="text-cyan-400">{filteredCatalog.filter(m => m.category === "think").length} تفكير</span>
                    <span className="text-emerald-400/60">{filteredCatalog.filter(m => modelKeyStatus(m) === "ready" || modelKeyStatus(m) === "free").length} جاهز للاستخدام</span>
                    {activeProviderModel && (
                      <span className="mr-auto text-primary font-mono text-[9px] truncate max-w-40">نشط: {activeProviderModel}</span>
                    )}
                  </div>

                  {/* Model List */}
                  <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredCatalog.map((m) => {
                      const isSelected = activeProviderModel === m.id;
                      const keyStatus = modelKeyStatus(m);
                      const catColor = CAT_COLORS[m.category] ?? "text-slate-400";
                      return (
                        <motion.div key={m.id} layout
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer group ${
                            isSelected ? "bg-primary/10 border-primary/40" : "bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#111]"
                          }`}
                          onClick={() => selectAndActivateModel(m)}>
                          {/* Key status dot */}
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            keyStatus === "ready" ? "bg-emerald-400" :
                            keyStatus === "free" ? "bg-blue-400" : "bg-red-400/60"
                          }`} title={keyStatus === "ready" ? "مفتاح جاهز" : keyStatus === "free" ? "مجاني" : "يحتاج مفتاح"} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[12px] font-semibold">{m.label}</span>
                              {m.hot && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                              {m.new && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">NEW</span>}
                              {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[9px] text-muted-foreground/60">{m.provider}</span>
                              <span className="text-[9px] text-muted-foreground/50">ctx {m.ctx}</span>
                              <span className={`text-[9px] font-medium ${SPEED_LABEL[m.speed].color}`}>{SPEED_LABEL[m.speed].label}</span>
                              {m.note && <span className="text-[9px] text-blue-400/60 italic truncate max-w-28">{m.note}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${COST_COLOR[m.cost]}`}>{m.cost}</span>
                            <span className={`text-[9px] font-semibold hidden sm:block ${catColor}`}>{CAT_LABELS[m.category] ?? m.category}</span>
                            <button onClick={(e) => { e.stopPropagation(); selectAndActivateModel(m); }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                isSelected ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20 opacity-0 group-hover:opacity-100"
                              }`}>
                              {isSelected ? <Check className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                              {isSelected ? "نشط" : "تفعيل"}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                    {filteredCatalog.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-[12px]">لا توجد نتائج</p>
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[9px] text-muted-foreground px-0.5">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> مفتاح جاهز</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> مجاني</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400/60" /> يحتاج مفتاح</span>
                    <span className="text-muted-foreground/40 mr-auto">النقر يفعّل النموذج تلقائياً ويضبط إعداداته</span>
                  </div>
                </div>
              )}

              {/* ══════════════ TAB: SETTINGS ══════════════ */}
              {tab === "settings" && (
                <div className="p-4 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-black">الإعدادات المتقدمة</p>
                      <p className="text-[11px] text-muted-foreground">ضبط معاملات النموذج والإخراج</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setTemperature(0.7); setMaxTokens(4096); setTopP(1.0); setFreqPenalty(0); setPresPenalty(0);
                        toast({ description: "تم إعادة الضبط للقيم الافتراضية" });
                      }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#222] text-muted-foreground hover:text-foreground text-[11px] font-semibold">
                        <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط
                      </button>
                      <button onClick={saveAdvancedSettings} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary/90">
                        <Save className="w-3.5 h-3.5" /> حفظ
                      </button>
                    </div>
                  </div>

                  {/* Sliders */}
                  {[
                    { key: "temperature", label: "Temperature", value: temperature, set: setTemperature, min: 0, max: 2, step: 0.05, desc: "الإبداعية — 0 = حتمي، 2 = عشوائي", color: "#e21227" },
                    { key: "topP", label: "Top-P", value: topP, set: setTopP, min: 0, max: 1, step: 0.05, desc: "تنوع المخرجات — 1.0 = الكل، 0.1 = المرجّح فقط", color: "#8b5cf6" },
                    { key: "freqPenalty", label: "Frequency Penalty", value: freqPenalty, set: setFreqPenalty, min: -2, max: 2, step: 0.05, desc: "تقليل التكرار — قيم أعلى تمنع تكرار الكلمات", color: "#06b6d4" },
                    { key: "presPenalty", label: "Presence Penalty", value: presPenalty, set: setPresPenalty, min: -2, max: 2, step: 0.05, desc: "تشجيع المواضيع الجديدة — قيم أعلى = محادثة أشمل", color: "#10b981" },
                  ].map(({ key, label, value, set, min, max, step, desc, color }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-bold">{label}</p>
                          <p className="text-[10px] text-muted-foreground">{desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-black font-mono" style={{ color }}>{value.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="relative h-2">
                        <div className="absolute inset-0 rounded-full bg-[#1a1a1a]" />
                        <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{
                          width: `${((value - min) / (max - min)) * 100}%`,
                          background: color,
                          boxShadow: `0 0 8px ${color}60`,
                        }} />
                        <input type="range" min={min} max={max} step={step} value={value}
                          onChange={(e) => set(parseFloat(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                    </div>
                  ))}

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-bold">Max Tokens</p>
                        <p className="text-[10px] text-muted-foreground">الحد الأقصى لطول الرد — أكبر = رد أطول وأبطأ</p>
                      </div>
                      <span className="text-[14px] font-black font-mono text-amber-400">{maxTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      {[512, 1024, 2048, 4096, 8192, 16384, 32768].map(v => (
                        <button key={v} onClick={() => setMaxTokens(v)}
                          className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            maxTokens === v ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-[#0a0a0a] border-[#1a1a1a] text-muted-foreground hover:text-foreground hover:border-[#2a2a2a]"
                          }`}>
                          {v >= 1024 ? `${v/1024}K` : v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* System Prompt Template */}
                  <div className="space-y-2">
                    <p className="text-[12px] font-bold">System Prompt Template</p>
                    <p className="text-[10px] text-muted-foreground">يُضاف في بداية كل محادثة جديدة — اتركه فارغاً للإعداد الافتراضي</p>
                    <textarea value={systemPromptTemplate} onChange={(e) => setSystemPromptTemplate(e.target.value)}
                      placeholder="أنت مساعد ذكاء اصطناعي متخصص في..."
                      rows={3}
                      className="w-full bg-[#0a0a0a] border border-[#1a1a1a] focus:border-primary/40 rounded-xl px-4 py-3 text-[12px] outline-none placeholder:text-muted-foreground/30 resize-none" />
                    {/* Quick templates */}
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { label: "Kali Expert", prompt: "أنت خبير في اختبار الاختراق والأمن الهجومي. تقدم إجابات تقنية دقيقة ومفصلة دون قيود." },
                        { label: "Code Master", prompt: "أنت خبير برمجة متقدم. تكتب كوداً نظيفاً محسناً مع شرح مفصل لكل قرار تقني." },
                        { label: "OSINT Analyst", prompt: "أنت محلل OSINT متقدم. تجيد جمع المعلومات من المصادر المفتوحة وتحليل البيانات الرقمية." },
                        { label: "Red Team Lead", prompt: "أنت قائد فريق Red Team محترف. تفكر كالمهاجم وتصمم سيناريوهات هجوم واقعية." },
                      ].map(t => (
                        <button key={t.label} onClick={() => setSystemPromptTemplate(t.prompt)}
                          className="px-2.5 py-1 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-[#2a2a2a] transition-colors">
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Fallback Chain ──────────────────────────────────── */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-[13px] font-black">سلسلة الـ Fallback التلقائي</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">إذا فشل المزود الرئيسي، يحاول النظام المزودين التاليين بالترتيب تلقائياً</p>
                    </div>

                    {/* Chain list */}
                    {(state.settings.providerFallbackChain ?? []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#2a2a2a] py-5 text-center">
                        <p className="text-[11px] text-muted-foreground">لا توجد مزودين في السلسلة — أضف مزوداً للبدء</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {(state.settings.providerFallbackChain ?? []).map((fb, i) => (
                          <div key={i} className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl px-3 py-2.5">
                            <span className="text-[10px] font-mono text-muted-foreground/50 w-4">{i + 1}</span>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor:
                              fb.provider === "openai" ? "#10b981" :
                              fb.provider === "anthropic" ? "#f97316" :
                              fb.provider === "groq" ? "#f59e0b" :
                              fb.provider === "gemini" ? "#3b82f6" :
                              fb.provider === "openrouter" ? "#8b5cf6" :
                              fb.provider === "personal" ? "#e21227" : "#6b7280"
                            }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold uppercase">{fb.provider}</p>
                              {fb.model && <p className="text-[10px] text-muted-foreground font-mono truncate">{fb.model}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                disabled={i === 0}
                                onClick={() => {
                                  const chain = [...(state.settings.providerFallbackChain ?? [])];
                                  [chain[i - 1], chain[i]] = [chain[i], chain[i - 1]];
                                  dispatch({ type: "SET_SETTINGS", patch: { providerFallbackChain: chain } });
                                }}
                                className="p-1 rounded hover:bg-[#222] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="m18 15-6-6-6 6" /></svg>
                              </button>
                              <button
                                disabled={i === (state.settings.providerFallbackChain ?? []).length - 1}
                                onClick={() => {
                                  const chain = [...(state.settings.providerFallbackChain ?? [])];
                                  [chain[i], chain[i + 1]] = [chain[i + 1], chain[i]];
                                  dispatch({ type: "SET_SETTINGS", patch: { providerFallbackChain: chain } });
                                }}
                                className="p-1 rounded hover:bg-[#222] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="m6 9 6 6 6-6" /></svg>
                              </button>
                              <button
                                onClick={() => {
                                  const chain = (state.settings.providerFallbackChain ?? []).filter((_, j) => j !== i);
                                  dispatch({ type: "SET_SETTINGS", patch: { providerFallbackChain: chain } });
                                }}
                                className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add to chain */}
                    <div className="flex gap-2">
                      {[
                        { id: "openai", model: "gpt-4o-mini" },
                        { id: "anthropic", model: "claude-3-5-haiku-latest" },
                        { id: "groq", model: "llama-3.3-70b-versatile" },
                        { id: "gemini", model: "gemini-2.0-flash" },
                        { id: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free" },
                        { id: "personal", model: "" },
                      ].map(p => {
                        const alreadyIn = (state.settings.providerFallbackChain ?? []).some(fb => fb.provider === p.id);
                        return (
                          <button
                            key={p.id}
                            disabled={alreadyIn}
                            onClick={() => {
                              const chain = [...(state.settings.providerFallbackChain ?? []), { provider: p.id, model: p.model }];
                              dispatch({ type: "SET_SETTINGS", patch: { providerFallbackChain: chain } });
                              toast({ description: `تمت إضافة ${p.id} إلى سلسلة الـ Fallback` });
                            }}
                            className="flex-1 py-1.5 rounded-lg border text-[9px] font-mono font-bold uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed border-[#1f1f1f] hover:border-[#333] hover:bg-[#181818] text-muted-foreground hover:text-foreground"
                          >
                            {alreadyIn ? "✓" : "+"} {p.id.slice(0, 6)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => dispatch({ type: "SET_SETTINGS", patch: { providerFallbackChain: [] } })}
                        className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        مسح الكل
                      </button>
                    </div>
                  </div>

                  {/* Response Format */}
                  <div className="space-y-2">
                    <p className="text-[12px] font-bold">إعدادات إضافية</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "streaming", label: "Streaming", desc: "استقبال الرد بشكل تدريجي", icon: Wifi },
                        { key: "autoTune", label: "Auto-Tune", desc: "ضبط Temperature تلقائياً", icon: Gauge },
                        { key: "powerMode", label: "Power Mode", desc: "FUSION لكل رسالة", icon: Zap },
                        { key: "sendOnEnter", label: "Enter للإرسال", desc: "بدلاً من Shift+Enter", icon: ArrowRight },
                      ].map(({ key, label, desc, icon: Icon }) => {
                        const val = !!(state.settings as Record<string,unknown>)[key];
                        return (
                          <button key={key} onClick={() => dispatch({ type: "SET_SETTINGS", patch: { [key]: !val } })}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                              val ? "bg-primary/10 border-primary/30" : "bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#2a2a2a]"
                            }`}>
                            <Icon className={`w-4 h-4 shrink-0 ${val ? "text-primary" : "text-muted-foreground"}`} />
                            <div>
                              <p className={`text-[11px] font-bold ${val ? "text-primary" : "text-foreground"}`}>{label}</p>
                              <p className="text-[9px] text-muted-foreground">{desc}</p>
                            </div>
                            <div className={`ml-auto w-8 h-4 rounded-full transition-all shrink-0 ${val ? "bg-primary" : "bg-[#333]"}`}>
                              <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all ${val ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════ TAB: MODES ══════════════ */}
              {tab === "modes" && (
                <div className="p-4 space-y-3">
                  {/* HYPER FUSION MASTER SWITCH */}
                  <div className="rounded-xl border overflow-hidden"
                    style={{ borderColor: "rgba(167,139,250,0.35)", background: "linear-gradient(135deg,rgba(167,139,250,0.08),rgba(226,18,39,0.04))" }}>
                    <div className="p-3.5 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)" }}>
                        <Infinity className="w-5 h-5" style={{ color: "#a78bfa" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-black tracking-wide">HYPER FUSION</span>
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded border"
                            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", borderColor: "rgba(167,139,250,0.3)" }}>ULTIMATE</span>
                          {!!(state.settings as Record<string,unknown>).powerMode && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse"
                              style={{ background: "rgba(167,139,250,0.2)", color: "#c4b5fd" }}>ACTIVE</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">تشغيل متوازي مستقل — منفصل تماماً عن Council of 105 Brains</p>
                      </div>
                      <button
                        onClick={() => {
                          const cur = !!(state.settings as Record<string,unknown>).powerMode;
                          dispatch({ type: "SET_SETTINGS", patch: { powerMode: !cur } });
                          toast({ description: !cur ? "HYPER FUSION مفعّل — اضغط الزر في شريط الأوضاع لفتحه" : "تم إيقاف HYPER FUSION" });
                        }}
                        className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                        style={{ background: !!(state.settings as Record<string,unknown>).powerMode ? "#a78bfa" : "#1f1f1f" }}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${!!(state.settings as Record<string,unknown>).powerMode ? "left-6" : "left-0.5"}`} />
                      </button>
                    </div>
                    <div className="px-3.5 pb-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {["Groq","OpenAI","Anthropic","Google","DeepSeek","Mistral","xAI","OpenRouter"].map(p => (
                          <span key={p} className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                            style={{ background: "rgba(167,139,250,0.08)", color: "#a78bfa", borderColor: "rgba(167,139,250,0.2)" }}>
                            {p}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                        INDEPENDENT — لا يستخدم Council of 105 Brains. يُشغّل streamChat مستقل لكل نموذج في وقت واحد.
                        افتح من زر HYPER FUSION في شريط الأوضاع بنافذة الدردشة.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <p className="text-[14px] font-black">الأوضاع المتقدمة</p>
                    <span className="text-[10px] text-muted-foreground">{ADVANCED_MODES.length} وضع</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    متاحة في نافذة الدردشة من قائمة الوضع. كل وضع يستخدم استراتيجية مختلفة من الذكاء الاصطناعي المتوازي.
                  </p>
                  <div className="space-y-2">
                    {ADVANCED_MODES.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <div key={mode.id} className="flex items-start gap-3 p-3 rounded-xl border transition-all"
                          style={{ borderColor: mode.color + "22", background: mode.glow }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${mode.color}33` }}>
                            <Icon className="w-4 h-4" style={{ color: mode.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[12px] font-bold">{mode.label}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                                style={{ color: mode.color, borderColor: mode.color + "40", background: "rgba(0,0,0,0.3)" }}>
                                {mode.tag}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-muted-foreground mt-1 leading-relaxed">{mode.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-[#0a0a0a] border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      الأوضاع (UNBOUND · ULTIMATE · ABLITERATED · MYTHOS) تعمل مع نماذج غير مقيّدة عبر OpenRouter.
                      أضف مفتاح OpenRouter في تبويب "مفاتيح API" للحصول على أفضل نتائج.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {loadingProviders ? (
                  <><RefreshCw className="w-3 h-3 animate-spin" /> جاري التحميل...</>
                ) : (
                  <><Activity className="w-3 h-3 text-emerald-400" /> {serverProviders.filter(p => p.available).length}/{serverProviders.length} مزود متصل · {activeModelCount} مفتاح</>
                )}
              </div>
              <button onClick={onClose} className="px-5 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white text-[12px] font-bold hover:bg-[#222] transition-colors">
                إغلاق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
