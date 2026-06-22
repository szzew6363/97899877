import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type ProviderName = "openai" | "anthropic" | "groq" | "gemini" | "openrouter" | "custom" | "personal";

export type ProviderInfo = {
  id: ProviderName;
  name: string;
  available: boolean;
  models: string[];
  baseURL?: string;
};

export const PERSONAL_DEFAULT_MODEL = process.env.PERSONAL_DEFAULT_MODEL ?? "gpt-3.5-turbo";

const WORLD_MODELS = [
  // OpenAI
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
  "o1", "o1-mini", "o3", "o3-mini", "o4-mini",
  // Anthropic Claude
  "claude-opus-4-5", "claude-sonnet-4-5", "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-7-sonnet-20250219",
  // Google Gemini
  "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro",
  // Meta Llama
  "llama-3.3-70b-instruct", "llama-3.1-8b-instant", "llama-3.1-405b-instruct",
  "llama-3.2-90b-vision-instruct", "llama-3.2-11b-vision-instruct",
  // Mistral
  "mistral-large-latest", "mistral-medium-latest", "mistral-small-latest",
  "codestral-latest", "mistral-nemo", "mistral-7b-instruct",
  // DeepSeek (China)
  "deepseek-r1", "deepseek-v3", "deepseek-chat", "deepseek-coder-v2",
  "deepseek-r1-distill-llama-70b",
  // Alibaba Qwen (China)
  "qwen-max", "qwen-plus", "qwen-turbo", "qwen2.5-72b-instruct",
  "qwen2.5-coder-32b-instruct", "qwq-32b",
  // Yi / 01.ai (China)
  "yi-lightning", "yi-large", "yi-large-fc", "yi-large-rag",
  // Cohere
  "command-r-plus", "command-r", "command-light",
  // Moonshot (China)
  "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k",
  // Zhipu AI GLM (China)
  "glm-4", "glm-4-flash", "glm-4-plus", "glm-zero-preview",
  // Baidu ERNIE (China)
  "ernie-4.5-8k", "ernie-4.0-8k", "ernie-3.5-8k",
  // Perplexity
  "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online",
  // Mixtral
  "mixtral-8x7b-instruct", "mixtral-8x22b-instruct",
];

type ProviderConfig = {
  name: string;
  envKey: string;
  baseURL: string;
  models: string[];
  requiresKey?: boolean;
};

const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    baseURL: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
    requiresKey: true,
  },
  anthropic: {
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    baseURL: "https://api.anthropic.com",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    requiresKey: true,
  },
  groq: {
    name: "Groq",
    envKey: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    models: ["llama-3.1-8b-instant", "llama-3.3-70b-instruct", "mixtral-8x7b-32768"],
    requiresKey: true,
  },
  gemini: {
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"],
    requiresKey: true,
  },
  openrouter: {
    name: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    models: WORLD_MODELS,
    requiresKey: true,
  },
  custom: {
    name: "Custom / Self-hosted",
    envKey: "CUSTOM_API_KEY",
    baseURL: "",
    models: [],
    requiresKey: false,
  },
  personal: {
    name: "Personal / Custom",
    envKey: "PERSONAL_API_KEY",
    baseURL: "",
    models: [],
    requiresKey: false,
  },
};

function getPersonalBase(): string {
  return process.env.PERSONAL_API_BASE_URL?.trim() || "";
}

function getPersonalKey(): string {
  return process.env.PERSONAL_API_KEY?.trim() || "";
}

export function hasAnyApiKey(): boolean {
  return !!(
    process.env.PERSONAL_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.GROQ_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.CUSTOM_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim()
  );
}

export function listProviders(): ProviderInfo[] {
  return (Object.entries(PROVIDER_CONFIGS) as [ProviderName, ProviderConfig][]).map(
    ([id, cfg]) => {
      let available: boolean;
      if (id === "personal") {
        available = !!getPersonalKey();
      } else if (id === "custom") {
        available = !!(process.env.CUSTOM_API_KEY || process.env.CUSTOM_API_BASE_URL);
      } else if (id === "openai") {
        available = !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
      } else if (id === "anthropic") {
        available = !!(process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);
      } else {
        available = !!process.env[cfg.envKey];
      }
      const baseURL = id === "personal" ? getPersonalBase() : cfg.baseURL;
      return { id, name: cfg.name, available, models: cfg.models, baseURL };
    }
  );
}

let _openaiClients: Partial<Record<string, OpenAI>> = {};
let _anthropic: Anthropic | null = null;

export function getOpenAICompatibleClient(provider: ProviderName): OpenAI | null {
  const cacheKey = provider;
  if (_openaiClients[cacheKey]) return _openaiClients[cacheKey]!;

  const cfg = PROVIDER_CONFIGS[provider];
  let apiKey: string | undefined;
  let baseURL: string | undefined = cfg.baseURL;

  if (provider === "custom") {
    apiKey = process.env.CUSTOM_API_KEY || undefined;
    baseURL = process.env.CUSTOM_API_BASE_URL || "https://api.openai.com/v1";
  } else if (provider === "personal") {
    apiKey = getPersonalKey() || undefined;
    baseURL = getPersonalBase() || undefined;
  } else if (provider === "openai") {
    apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || undefined;
    baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || cfg.baseURL;
  } else {
    apiKey = process.env[cfg.envKey];
  }

  if (!apiKey) return null;

  const clientOpts: ConstructorParameters<typeof OpenAI>[0] = { apiKey };
  if (baseURL) clientOpts.baseURL = baseURL;

  if (provider === "openrouter") {
    clientOpts.defaultHeaders = {
      "HTTP-Referer": "https://mr7.ai",
      "X-Title": "KaliGPT / mr7.ai",
    };
  }

  const client = new OpenAI(clientOpts);
  _openaiClients[cacheKey] = client;
  return client;
}

export function getPersonalOpenAI(): OpenAI | null {
  const key = getPersonalKey();
  const base = getPersonalBase();
  if (!key) return null;
  return new OpenAI({ apiKey: key, ...(base ? { baseURL: base } : {}) });
}

export function requirePersonalOpenAI(): OpenAI {
  const client = getPersonalOpenAI();
  if (!client) {
    throw new Error(
      "لم يتم ضبط مفتاح API. افتح إعدادات المزود من القائمة الجانبية واختر مزوداً وأدخل المفتاح."
    );
  }
  return client;
}

export function getAnthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set. Add it in Secrets.");
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

export function invalidateProviderCache() {
  _openaiClients = {};
  _anthropic = null;
}

export type StreamChunk = { content?: string; done?: boolean; error?: string };

export async function callOnce(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens = 1000,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const client = getPersonalOpenAI();
    if (!client) return "";
    const res = await client.chat.completions.create({
      model: PERSONAL_DEFAULT_MODEL,
      max_tokens: maxTokens,
      messages,
    }, { signal: controller.signal });
    return res.choices?.[0]?.message?.content ?? "";
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export function getClientWithCredentials(apiKey: string, apiBaseURL?: string): OpenAI {
  return new OpenAI({
    apiKey,
    ...(apiBaseURL ? { baseURL: apiBaseURL } : {}),
  });
}

export async function* streamCompletion(
  provider: ProviderName,
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature = 0.7,
  opts?: { apiKey?: string; apiBaseURL?: string }
): AsyncGenerator<StreamChunk> {
  const controller = new AbortController();
  const TIMEOUT_MS = 60_000;
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // ── Path 1: Frontend passed a key directly (from ProviderSettingsModal) ──
    if (opts?.apiKey && opts.apiKey.trim().length > 10) {
      const client = getClientWithCredentials(opts.apiKey.trim(), opts.apiBaseURL?.trim());
      const resolvedModel = model || PERSONAL_DEFAULT_MODEL;
      try {
        const streamRes = await client.chat.completions.create({
          model: resolvedModel,
          messages,
          stream: true,
          temperature,
        }, { signal: controller.signal });
        for await (const chunk of streamRes) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) yield { content };
        }
        yield { done: true };
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "API error";
        yield { error: msg };
        return;
      }
    }

    // ── Path 2: Anthropic (server-side key) ──
    if (provider === "anthropic") {
      try {
        const client = getAnthropicClient();
        const systemMsg = messages.find((m) => m.role === "system");
        const chatMsgs = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        const stream = client.messages.stream({
          model,
          max_tokens: 8192,
          system: systemMsg?.content,
          messages: chatMsgs,
          temperature,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            yield { content: event.delta.text };
          }
        }
        yield { done: true };
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Anthropic API error";
        yield { error: msg };
        return;
      }
    }

    // ── Path 3: OpenAI-compatible provider (server-side key) ──
    const resolvedProvider: ProviderName =
      (provider === "personal" || !PROVIDER_CONFIGS[provider])
        ? "personal"
        : provider;

    const client = getOpenAICompatibleClient(resolvedProvider);

    if (!client) {
      yield {
        error:
          "لم يتم ضبط مفتاح API. افتح إعدادات المزود من القائمة الجانبية واختر مزوداً وأدخل المفتاح.",
      };
      return;
    }

    const resolvedModel = model || PERSONAL_DEFAULT_MODEL;

    const streamRes = await client.chat.completions.create({
      model: resolvedModel,
      messages,
      stream: true,
      temperature,
    }, { signal: controller.signal });

    for await (const chunk of streamRes) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) yield { content };
    }
    yield { done: true };
  } catch (e) {
    const isAbort = e instanceof Error && (e.name === "AbortError" || e.message.includes("abort"));
    const msg = isAbort
      ? "انتهت مهلة الطلب — تحقق من مفتاح API وإعدادات المزود"
      : e instanceof Error ? e.message : "AI provider error";
    yield { error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Standalone streamOpenAI for code scanner (non-generator) ─────────────────
export const aiProviders = {
  async streamOpenAI(
    opts: {
      model: string;
      messages: { role: "system" | "user" | "assistant"; content: string }[];
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: string };
      apiKey: string;
    },
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const client = new OpenAI({ apiKey: opts.apiKey });
    const res = await client.chat.completions.create({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.1,
      max_tokens: opts.max_tokens ?? 4000,
      ...(opts.response_format ? { response_format: opts.response_format as { type: "json_object" } } : {}),
    });
    for await (const chunk of res) {
      const c = chunk.choices?.[0]?.delta?.content;
      if (c) onChunk(c);
    }
  },
};
