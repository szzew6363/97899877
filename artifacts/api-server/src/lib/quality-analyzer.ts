/**
 * Response Quality Analyzer
 * ──────────────────────────
 * Automatically scores every AI response on:
 *   - Completeness (did it answer fully?)
 *   - Coherence (is it well-structured?)
 *   - Relevance (does it match the question?)
 *   - Language match (did it respond in the right language?)
 *   - Drift detection (did it go off-topic?)
 *
 * Tracks per-provider quality trends and fires alerts on degradation.
 */

import { pool } from "../db.js";
import { logger } from "./logger.js";

export type QualityScore = {
  overall: number;          // 0–100
  completeness: number;     // 0–100
  coherence: number;        // 0–100
  relevance: number;        // 0–100
  languageMatch: number;    // 0–100
  drift: boolean;           // true if off-topic
  driftScore: number;       // 0–1 (0=on-topic, 1=fully drifted)
  flags: string[];          // human-readable issues
};

export type QualityRecord = QualityScore & {
  provider: string;
  model: string;
  promptHash: string;
  responseLength: number;
  latencyMs: number;
  scoredAt: number;
};

// ── Per-provider quality windows (last 50 records) ───────────────────────────
const _qualityWindows = new Map<string, number[]>(); // provider → last 50 overall scores

// ── Drift keywords: topic seeds for the cybersecurity domain ─────────────────
const DOMAIN_SEEDS = [
  "security", "hack", "exploit", "vulnerability", "pentest", "malware",
  "OSINT", "encryption", "firewall", "CVE", "payload", "injection",
  "code", "script", "python", "bash", "network", "scan", "web", "AI",
];

function detectLanguage(text: string): "ar" | "en" | "other" {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (arabicChars > latinChars * 0.5) return "ar";
  if (latinChars > 5) return "en";
  return "other";
}

function scoreCompleteness(question: string, response: string): number {
  // Heuristic: long questions need longer responses
  const qLen = question.length;
  const rLen = response.length;
  const ratio = rLen / Math.max(qLen, 1);
  // Too short = incomplete; very long = good
  if (ratio < 0.5) return 30;
  if (ratio < 1) return 60;
  if (ratio < 2) return 80;
  if (ratio < 10) return 95;
  return 85; // too verbose
}

function scoreCoherence(response: string): number {
  let score = 100;
  // Penalize: repetitive sentences
  const sentences = response.split(/[.!?]\n?/).filter(s => s.trim().length > 10);
  if (sentences.length > 3) {
    const unique = new Set(sentences.map(s => s.trim().toLowerCase()));
    const dupRate = 1 - unique.size / sentences.length;
    score -= dupRate * 40;
  }
  // Reward: has structure (headers, bullets, code blocks)
  if (response.includes("```")) score = Math.min(100, score + 5);
  if (response.includes("- ") || response.includes("* ")) score = Math.min(100, score + 5);
  // Penalize: very short with question mark (possible misunderstanding)
  if (response.length < 50 && response.includes("?")) score -= 20;
  return Math.max(0, Math.min(100, score));
}

function scoreRelevance(question: string, response: string): number {
  const qWords = new Set(
    question.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  );
  const rWords = response.toLowerCase().split(/\W+/);
  let hits = 0;
  for (const w of rWords) {
    if (qWords.has(w)) hits++;
  }
  const hitRate = hits / Math.max(qWords.size, 1);
  return Math.min(100, Math.round(hitRate * 150)); // 0–100
}

function scoreDrift(question: string, response: string): { drift: boolean; driftScore: number } {
  const qLower = question.toLowerCase();
  const rLower = response.toLowerCase();

  // Check if domain keywords appear in question or response
  const qDomainHits = DOMAIN_SEEDS.filter(k => qLower.includes(k.toLowerCase())).length;
  const rDomainHits = DOMAIN_SEEDS.filter(k => rLower.includes(k.toLowerCase())).length;

  // If question is clearly on-domain but response has none, it's drifted
  if (qDomainHits >= 2 && rDomainHits === 0 && response.length > 200) {
    return { drift: true, driftScore: 0.8 };
  }

  // Topic similarity via shared bigrams
  function bigrams(text: string): Set<string> {
    const words = text.split(/\W+/).filter(w => w.length > 2);
    const bg = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) bg.add(`${words[i]}_${words[i+1]}`);
    return bg;
  }

  const qBg = bigrams(qLower);
  const rBg = bigrams(rLower);
  const intersection = [...qBg].filter(b => rBg.has(b)).length;
  const union = new Set([...qBg, ...rBg]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  const driftScore = Math.max(0, 1 - jaccard * 3);
  return { drift: driftScore > 0.7, driftScore: Math.min(1, driftScore) };
}

function scoreLanguageMatch(question: string, response: string): number {
  const qLang = detectLanguage(question);
  const rLang = detectLanguage(response);
  if (qLang === rLang) return 100;
  if (qLang === "other") return 85; // ambiguous question — any response fine
  return 40; // language mismatch
}

/**
 * Score a response against its prompt.
 * Called after each AI response completes.
 */
export function analyzeQuality(
  question: string,
  response: string,
  provider: string,
  model: string,
  latencyMs: number,
  promptHash: string = "",
): QualityRecord {
  const completeness = scoreCompleteness(question, response);
  const coherence = scoreCoherence(response);
  const relevance = scoreRelevance(question, response);
  const languageMatch = scoreLanguageMatch(question, response);
  const { drift, driftScore } = scoreDrift(question, response);

  const overall = Math.round(
    completeness * 0.30 +
    coherence    * 0.20 +
    relevance    * 0.30 +
    languageMatch * 0.20,
  );

  const flags: string[] = [];
  if (completeness < 50) flags.push("incomplete_response");
  if (coherence < 60) flags.push("low_coherence");
  if (relevance < 40) flags.push("low_relevance");
  if (languageMatch < 50) flags.push("language_mismatch");
  if (drift) flags.push("topic_drift");
  if (latencyMs > 10_000) flags.push("high_latency");
  if (response.length < 20) flags.push("very_short_response");

  const record: QualityRecord = {
    overall,
    completeness,
    coherence,
    relevance,
    languageMatch,
    drift,
    driftScore,
    flags,
    provider,
    model,
    promptHash,
    responseLength: response.length,
    latencyMs,
    scoredAt: Date.now(),
  };

  // Track in window
  const key = `${provider}:${model}`;
  const win = _qualityWindows.get(key) ?? [];
  win.push(overall);
  if (win.length > 50) win.shift();
  _qualityWindows.set(key, win);

  // Check for degradation
  checkDegradation(provider, model, win).catch((e) => logger.error({ e }, "[quality] degradation check error"));

  // Persist to DB (fire and forget)
  persistQualityRecord(record).catch(() => {});

  return record;
}

async function persistQualityRecord(record: QualityRecord): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_quality_scores (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        provider VARCHAR NOT NULL,
        model VARCHAR NOT NULL,
        overall_score INTEGER NOT NULL,
        completeness INTEGER,
        coherence INTEGER,
        relevance INTEGER,
        language_match INTEGER,
        drift BOOLEAN DEFAULT false,
        drift_score NUMERIC,
        flags JSONB DEFAULT '[]',
        response_length INTEGER,
        latency_ms INTEGER,
        prompt_hash VARCHAR,
        scored_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_quality_provider ON ai_quality_scores(provider, scored_at DESC);
    `);
    await pool.query(
      `INSERT INTO ai_quality_scores
       (provider, model, overall_score, completeness, coherence, relevance, language_match,
        drift, drift_score, flags, response_length, latency_ms, prompt_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        record.provider, record.model, record.overall, record.completeness,
        record.coherence, record.relevance, record.languageMatch,
        record.drift, record.driftScore, JSON.stringify(record.flags),
        record.responseLength, record.latencyMs, record.promptHash,
      ],
    );
  } catch { /* non-fatal */ }
}

const _degradationAlerted = new Map<string, number>(); // throttle

async function checkDegradation(provider: string, model: string, scores: number[]): Promise<void> {
  if (scores.length < 10) return; // not enough data

  const recent = scores.slice(-10);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

  if (avg < 60) {
    const key = `${provider}:${model}`;
    const lastAlert = _degradationAlerted.get(key) ?? 0;
    if (Date.now() - lastAlert < 30 * 60_000) return; // alert once per 30 min
    _degradationAlerted.set(key, Date.now());

    logger.warn({ provider, model, avgScore: avg }, "[quality] Provider quality degradation detected");

    // Alert admins via notification
    try {
      const { rows: admins } = await pool.query(
        "SELECT id FROM users WHERE role='admin' AND status='active' LIMIT 10",
      );
      if (admins.length === 0) return;

      const values = admins.map((_: unknown, i: number) => {
        const o = i * 6;
        return `($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6})`;
      }).join(",");

      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, is_read, data) VALUES ${values}`,
        admins.flatMap((a: { id: string }) => [
          a.id, "ai_quality",
          `Quality Degradation: ${provider}/${model}`,
          `Average quality score dropped to ${Math.round(avg)}/100 over last 10 responses.`,
          false,
          JSON.stringify({ provider, model, avgScore: avg }),
        ]),
      );
    } catch { /* non-fatal */ }
  }
}

/**
 * Get quality metrics for a provider over time.
 */
export async function getProviderQualityMetrics(provider: string, days = 7): Promise<{
  avgScore: number;
  totalResponses: number;
  driftRate: number;
  flagCounts: Record<string, number>;
  trend: Array<{ date: string; avgScore: number }>;
}> {
  try {
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const [statsRes, flagsRes, trendRes] = await Promise.all([
      pool.query(
        `SELECT AVG(overall_score)::numeric(5,1) AS avg,
                COUNT(*)::int AS total,
                AVG(drift_score::float)::numeric(4,3) AS drift_rate
         FROM ai_quality_scores WHERE provider=$1 AND scored_at > $2`,
        [provider, since],
      ),
      pool.query(
        `SELECT jsonb_array_elements_text(flags) AS flag, COUNT(*)::int AS cnt
         FROM ai_quality_scores WHERE provider=$1 AND scored_at > $2
         GROUP BY flag ORDER BY cnt DESC`,
        [provider, since],
      ),
      pool.query(
        `SELECT DATE(scored_at) AS date, AVG(overall_score)::numeric(5,1) AS avg_score
         FROM ai_quality_scores WHERE provider=$1 AND scored_at > $2
         GROUP BY DATE(scored_at) ORDER BY date`,
        [provider, since],
      ),
    ]);

    const flagCounts: Record<string, number> = {};
    for (const row of flagsRes.rows) flagCounts[row.flag] = row.cnt;

    return {
      avgScore: parseFloat(statsRes.rows[0]?.avg ?? "0"),
      totalResponses: statsRes.rows[0]?.total ?? 0,
      driftRate: parseFloat(statsRes.rows[0]?.drift_rate ?? "0"),
      flagCounts,
      trend: trendRes.rows.map((r: { date: string; avg_score: string }) => ({
        date: r.date,
        avgScore: parseFloat(r.avg_score),
      })),
    };
  } catch {
    return { avgScore: 0, totalResponses: 0, driftRate: 0, flagCounts: {}, trend: [] };
  }
}
