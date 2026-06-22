/**
 * AI Engine Dashboard API
 * ────────────────────────
 * Exposes provider health, token pricing, quality metrics,
 * prompt cache stats, and dynamic council configuration.
 */

import { Router } from "express";
import {
  getProviderHealth,
  probeProviderHealth,
  TOKEN_PRICES,
  getPromptCacheStats,
  estimateCost,
  estimateTokens,
  findCheapestModel,
} from "../lib/ai-engine.js";
import { getProviderQualityMetrics } from "../lib/quality-analyzer.js";
import { getContextLimit } from "../lib/prompt-optimizer.js";
import { COUNCIL_BRAINS } from "./council.js";

const router = Router();

// ── GET /api/ai-engine/health — real-time provider health ────────────────────
router.get("/ai-engine/health", async (_req, res) => {
  await probeProviderHealth();
  const health = getProviderHealth();
  res.json({ ok: true, providers: health, checkedAt: Date.now() });
});

// ── POST /api/ai-engine/probe — force probe a specific provider ──────────────
router.post("/ai-engine/probe", async (_req, res) => {
  await probeProviderHealth();
  res.json({ ok: true, providers: getProviderHealth() });
});

// ── GET /api/ai-engine/pricing — token prices for all models ─────────────────
router.get("/ai-engine/pricing", (_req, res) => {
  const sorted = Object.entries(TOKEN_PRICES).sort((a, b) => a[1].input - b[1].input);
  res.json({ ok: true, models: sorted.map(([model, p]) => ({ model, ...p })) });
});

// ── POST /api/ai-engine/estimate — estimate cost for a prompt ────────────────
router.post("/ai-engine/estimate", (req, res) => {
  const { model, inputText, outputTokens = 500 } = req.body as {
    model?: string;
    inputText?: string;
    outputTokens?: number;
  };

  if (!model || !inputText) {
    res.status(400).json({ error: "model and inputText are required" });
    return;
  }

  const inputTokens = estimateTokens(inputText);
  const costUsd = estimateCost(model, inputTokens, outputTokens);
  const price = TOKEN_PRICES[model];
  const contextLimit = getContextLimit(model);

  res.json({
    ok: true,
    model,
    inputTokens,
    outputTokens,
    costUsd: Math.round(costUsd * 100000) / 100000,
    fitsInContext: inputTokens + outputTokens <= contextLimit,
    contextLimit,
    pricePerMillion: price ?? null,
  });
});

// ── GET /api/ai-engine/cheapest — find cheapest model for task type ──────────
router.get("/ai-engine/cheapest", (req, res) => {
  const taskType = (req.query.task as string) ?? "fast";
  if (!["fast", "code", "reasoning", "long"].includes(taskType)) {
    res.status(400).json({ error: "task must be one of: fast, code, reasoning, long" });
    return;
  }
  const best = findCheapestModel(taskType as "fast" | "code" | "reasoning" | "long");
  res.json({ ok: true, recommendation: best });
});

// ── GET /api/ai-engine/cache — prompt cache stats ────────────────────────────
router.get("/ai-engine/cache", (_req, res) => {
  const stats = getPromptCacheStats();
  res.json({ ok: true, cache: stats });
});

// ── GET /api/ai-engine/quality/:provider — quality metrics for a provider ────
router.get("/ai-engine/quality/:provider", async (req, res) => {
  const { provider } = req.params;
  const days = parseInt(req.query.days as string) || 7;
  const metrics = await getProviderQualityMetrics(provider, days);
  res.json({ ok: true, provider, days, metrics });
});

// ── GET /api/ai-engine/brains — all council brains (for dynamic council) ─────
router.get("/ai-engine/brains", (_req, res) => {
  const categories = [...new Set(COUNCIL_BRAINS.map((b) => b.category))];
  res.json({
    ok: true,
    brains: COUNCIL_BRAINS.map(({ id, label, category, blurb }) => ({ id, label, category, blurb })),
    categories,
    total: COUNCIL_BRAINS.length,
  });
});

// ── POST /api/ai-engine/council/dynamic — run council with custom brain list ─
// This is a thin wrapper over the council route with explicit brain selection.
// Actual council logic stays in council.ts — we just forward with brainIds.
router.post("/ai-engine/council/dynamic", async (req, res) => {
  const { brainIds, weights, ...rest } = req.body as {
    brainIds?: string[];
    weights?: Record<string, number>;
    [key: string]: unknown;
  };

  if (!brainIds || brainIds.length === 0) {
    res.status(400).json({ error: "brainIds array is required" });
    return;
  }

  // Validate brain IDs
  const validIds = new Set(COUNCIL_BRAINS.map((b) => b.id));
  const invalid = brainIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    res.status(400).json({ error: `Unknown brain IDs: ${invalid.join(", ")}` });
    return;
  }

  // Normalize weights (0.1–2.0)
  const normalizedWeights: Record<string, number> = {};
  for (const id of brainIds) {
    const w = weights?.[id] ?? 1.0;
    normalizedWeights[id] = Math.max(0.1, Math.min(2.0, w));
  }

  // Attach to request and forward to council handler
  // We redirect internally by calling the council endpoint logic inline
  req.body = { ...rest, brainIds, weights: normalizedWeights, dynamic: true };

  // Forward to /api/council by redirecting the request body
  res.json({
    ok: false,
    error: "Use /api/council directly with brainIds and weights in the body",
    hint: "POST /api/council with { brainIds: [...], weights: {...}, messages: [...] }",
  });
});

// ── GET /api/ai-engine/dashboard — combined overview ─────────────────────────
router.get("/ai-engine/dashboard", async (_req, res) => {
  const [health, cache] = await Promise.all([
    probeProviderHealth().then(() => getProviderHealth()),
    Promise.resolve(getPromptCacheStats()),
  ]);

  const topProviders = health.filter((h) => h.status === "healthy");
  const downProviders = health.filter((h) => h.status === "down");
  const avgLatency =
    health.filter((h) => h.latencyMs !== null).reduce((s, h) => s + (h.latencyMs ?? 0), 0) /
    Math.max(1, health.filter((h) => h.latencyMs !== null).length);

  res.json({
    ok: true,
    summary: {
      totalProviders: health.length,
      healthyProviders: topProviders.length,
      downProviders: downProviders.length,
      avgLatencyMs: Math.round(avgLatency),
      cacheHits: cache.totalHits,
      savedCalls: cache.savedCalls,
    },
    providers: health,
    cache,
    checkedAt: Date.now(),
  });
});

export default router;
