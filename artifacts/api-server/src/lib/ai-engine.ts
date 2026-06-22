/**
 * Advanced AI Engine
 * ──────────────────
 * Smart provider fallback, token pricing, real-time health tracking,
 * system prompt caching, and backpressure-aware streaming.
 */

import { logger } from "./logger.js";
import {
  streamCompletion,
  callOnce,
  getOpenAICompatibleClient,
  PERSONAL_DEFAULT_MODEL,
  type ProviderName,
} from "./ai-providers.js";

// ── Token Pricing (USD per 1M tokens, input/output) ──────────────────────────
export const TOKEN_PRICES: Record<string, { input: number; output: number; provider: string }> = {
  // OpenAI
  "gpt-4o":                { input: 2.50,   output: 10.00,  provider: "openai" },
  "gpt-4o-mini":           { input: 0.15,   output: 0.60,   provider: "openai" },
  "gpt-4-turbo":           { input: 10.00,  output: 30.00,  provider: "openai" },
  "gpt-3.5-turbo":         { input: 0.50,   output: 1.50,   provider: "openai" },
  "o1":                    { input: 15.00,  output: 60.00,  provider: "openai" },
  "o1-mini":               { input: 3.00,   output: 12.00,  provider: "openai" },
  "o3-mini":               { input: 1.10,   output: 4.40,   provider: "openai" },
  // Anthropic
  "claude-opus-4-5":             { input: 15.00,  output: 75.00,  provider: "anthropic" },
  "claude-3-5-sonnet-20241022":  { input: 3.00,   output: 15.00,  provider: "anthropic" },
  "claude-3-5-haiku-20241022":   { input: 0.80,   output: 4.00,   provider: "anthropic" },
  "claude-3-opus-20240229":      { input: 15.00,  output: 75.00,  provider: "anthropic" },
  // Google Gemini
  "gemini-2.5-pro":        { input: 1.25,   output: 10.00,  provider: "gemini" },
  "gemini-2.5-flash":      { input: 0.075,  output: 0.30,   provider: "gemini" },
  "gemini-2.0-flash":      { input: 0.10,   output: 0.40,   provider: "gemini" },
  "gemini-1.5-pro":        { input: 1.25,   output: 5.00,   provider: "gemini" },
  // Groq (ultra-fast)
  "llama-3.3-70b-instruct":      { input: 0.59,   output: 0.79,   provider: "groq" },
  "llama-3.1-8b-instant":        { input: 0.05,   output: 0.08,   provider: "groq" },
  "mixtral-8x7b-instruct":       { input: 0.24,   output: 0.24,   provider: "groq" },
  // DeepSeek
  "deepseek-r1":           { input: 0.55,   output: 2.19,   provider: "openrouter" },
  "deepseek-v3":           { input: 0.27,   output: 1.10,   provider: "openrouter" },
  // Mistral
  "mistral-large-latest":  { input: 2.00,   output: 6.00,   provider: "openrouter" },
  "mistral-small-latest":  { input: 0.20,   output: 0.60,   provider: "openrouter" },
  "codestral-latest":      { input: 0.20,   output: 0.60,   provider: "openrouter" },
};

// ── Provider Fallback Order (cheapest/fastest first) ─────────────────────────
const FALLBACK_ORDER: ProviderName[] = [
  "personal", "groq", "openai", "gemini", "anthropic", "openrouter", "custom",
];

export type ProviderHealth = {
  provider: ProviderName;
  available: boolean;
  latencyMs: number | null;
  successRate: number;        // 0–1
  lastCheckAt: number;
  errorCount: number;
  totalCalls: number;
  status: "healthy" | "degraded" | "down" | "unknown";
};

// ── In-memory health tracker ──────────────────────────────────────────────────
const _health: Map<ProviderName, ProviderHealth> = new Map();
const _latencyWindows: Map<ProviderName, number[]> = new Map(); // last 20 latencies

function getOrInit(provider: ProviderName): ProviderHealth {
  if (!_health.has(provider)) {
    _health.set(provider, {
      provider,
      available: false,
      latencyMs: null,
      successRate: 1,
      lastCheckAt: 0,
      errorCount: 0,
      totalCalls: 0,
      status: "unknown",
    });
  }
  return _health.get(provider)!;
}

export function recordProviderCall(provider: ProviderName, latencyMs: number, success: boolean): void {
  const h = getOrInit(provider);
  h.totalCalls++;
  h.lastCheckAt = Date.now();
  h.available = true;

  if (!success) {
    h.errorCount++;
  } else {
    const wins = _latencyWindows.get(provider) ?? [];
    wins.push(latencyMs);
    if (wins.length > 20) wins.shift();
    _latencyWindows.set(provider, wins);
    h.latencyMs = Math.round(wins.reduce((a, b) => a + b, 0) / wins.length);
  }

  const recent = Math.min(h.totalCalls, 20);
  h.successRate = Math.max(0, (recent - h.errorCount) / recent);

  if (h.successRate >= 0.9) h.status = "healthy";
  else if (h.successRate >= 0.6) h.status = "degraded";
  else h.status = "down";
}

export function getProviderHealth(): ProviderHealth[] {
  return FALLBACK_ORDER.map((p) => getOrInit(p));
}

// ── Active health probe: ping each provider with a trivial request ────────────
export async function probeProviderHealth(): Promise<void> {
  const testMsg = [{ role: "user" as const, content: "hi" }];
  const providers: ProviderName[] = ["personal", "openai", "groq", "gemini", "anthropic"];

  await Promise.allSettled(
    providers.map(async (provider) => {
      const h = getOrInit(provider);
      // Skip if checked recently (< 60s)
      if (Date.now() - h.lastCheckAt < 60_000) return;

      const t0 = Date.now();
      try {
        const client = getOpenAICompatibleClient(provider);
        if (!client) { h.available = false; h.status = "down"; h.lastCheckAt = Date.now(); return; }
        await client.chat.completions.create({
          model: PERSONAL_DEFAULT_MODEL,
          messages: testMsg,
          max_tokens: 1,
        });
        recordProviderCall(provider, Date.now() - t0, true);
      } catch {
        recordProviderCall(provider, Date.now() - t0, false);
      }
    }),
  );
}

// ── Smart streaming with fallback ─────────────────────────────────────────────
export type SmartStreamOpts = {
  provider: ProviderName;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  apiKey?: string;
  apiBaseURL?: string;
  onFallback?: (from: ProviderName, to: ProviderName, reason: string) => void;
};

export async function* smartStream(opts: SmartStreamOpts) {
  const { messages, temperature = 0.7 } = opts;
  let provider = opts.provider;
  let model = opts.model;

  // Try primary provider first
  const t0 = Date.now();
  let hadError = false;

  try {
    let chunkCount = 0;
    for await (const chunk of streamCompletion(provider, model, messages, temperature, {
      apiKey: opts.apiKey,
      apiBaseURL: opts.apiBaseURL,
    })) {
      if (chunk.error) {
        hadError = true;
        // Try fallback
        const fallback = findFallback(provider);
        if (!fallback) {
          yield chunk;
          return;
        }
        opts.onFallback?.(provider, fallback.provider, chunk.error);
        yield { fallback: { from: provider, to: fallback.provider, reason: chunk.error } };

        provider = fallback.provider;
        model = fallback.model;

        // Stream from fallback
        for await (const c2 of streamCompletion(provider, model, messages, temperature)) {
          if (c2.done || c2.error) { yield c2; return; }
          if (c2.content) yield c2;
        }
        return;
      }
      if (chunk.done) {
        recordProviderCall(provider, Date.now() - t0, true);
        yield chunk;
        return;
      }
      if (chunk.content) { chunkCount++; yield chunk; }
    }
    if (!hadError) recordProviderCall(provider, Date.now() - t0, true);
  } catch (e) {
    recordProviderCall(provider, Date.now() - t0, false);
    const fallback = findFallback(provider);
    if (!fallback) {
      yield { error: e instanceof Error ? e.message : "AI error" };
      return;
    }
    yield { fallback: { from: provider, to: fallback.provider, reason: "exception" } };
    for await (const c of streamCompletion(fallback.provider, fallback.model, messages, temperature)) {
      yield c;
    }
  }
}

function findFallback(failed: ProviderName): { provider: ProviderName; model: string } | null {
  const order = FALLBACK_ORDER.filter((p) => p !== failed);
  for (const p of order) {
    const h = getOrInit(p);
    if (h.available && h.status !== "down") {
      return { provider: p, model: PERSONAL_DEFAULT_MODEL };
    }
    // Also try providers not yet checked (unknown)
    if (h.status === "unknown") {
      const client = getOpenAICompatibleClient(p);
      if (client) return { provider: p, model: PERSONAL_DEFAULT_MODEL };
    }
  }
  return null;
}

// ── System Prompt Cache ────────────────────────────────────────────────────────
// Caches system prompts by hash to avoid rebuilding identical strings
import crypto from "crypto";

const _promptCache = new Map<string, { prompt: string; hits: number; createdAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

export function cacheSystemPrompt(prompt: string): string {
  const hash = crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
  const existing = _promptCache.get(hash);
  if (existing && Date.now() - existing.createdAt < CACHE_TTL_MS) {
    existing.hits++;
    return hash;
  }
  _promptCache.set(hash, { prompt, hits: 1, createdAt: Date.now() });
  // Evict old entries
  if (_promptCache.size > 200) {
    const oldest = [..._promptCache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldest) _promptCache.delete(oldest[0]);
  }
  return hash;
}

export function getCachedPrompt(hash: string): string | null {
  const entry = _promptCache.get(hash);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) { _promptCache.delete(hash); return null; }
  return entry.prompt;
}

export function getPromptCacheStats() {
  const entries = [..._promptCache.values()];
  return {
    entries: entries.length,
    totalHits: entries.reduce((s, e) => s + e.hits, 0),
    savedCalls: entries.reduce((s, e) => s + (e.hits - 1), 0),
  };
}

// ── Token cost estimator ──────────────────────────────────────────────────────
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = TOKEN_PRICES[model];
  if (!price) return 0;
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

// Rough token count: ~4 chars per token
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function findCheapestModel(taskType: "fast" | "code" | "reasoning" | "long"): {
  model: string;
  provider: ProviderName;
  priceInput: number;
} {
  const candidates = Object.entries(TOKEN_PRICES).filter(([, p]) => {
    if (taskType === "code") return ["gpt-4o", "claude-3-5-sonnet-20241022", "codestral-latest", "deepseek-v3"].includes(Object.keys(TOKEN_PRICES).find(k => TOKEN_PRICES[k] === p)!);
    return true;
  });
  const sorted = candidates.sort((a, b) => a[1].input - b[1].input);
  const best = sorted[0];
  if (!best) return { model: PERSONAL_DEFAULT_MODEL, provider: "personal", priceInput: 0 };
  return { model: best[0], provider: best[1].provider as ProviderName, priceInput: best[1].input };
}

void logger;
void callOnce;
